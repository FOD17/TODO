# Sync Architecture: SQLite ↔ localStorage

This document is a deep-dive into how TODO Tracker keeps SQLite and localStorage in sync, handles SQLite outages transparently, and automatically reconciles data when connectivity is restored.

---

## Table of Contents

1. [Goals](#goals)
2. [Component Map](#component-map)
3. [Normal Operation (Write-Through)](#normal-operation-write-through)
4. [SQLite Outage (Offline Mode)](#sqlite-outage-offline-mode)
5. [Reconnect & Sync](#reconnect--sync)
6. [SyncManager Reference](#syncmanager-reference)
7. [ElectronAdapter Reference](#electronadapter-reference)
8. [Data Flow Diagrams](#data-flow-diagrams)
9. [Edge Cases & Guarantees](#edge-cases--guarantees)
10. [Testing the Sync Layer](#testing-the-sync-layer)

---

## Goals

| Goal | How it is met |
|------|---------------|
| SQLite is always the source of truth | All reads prefer SQLite when reachable |
| localStorage is always a current backup | Every SQLite write is mirrored to localStorage |
| App never shows an error or blank screen if SQLite is unavailable | Automatic fallback to localStorage |
| Changes made during an outage reach SQLite when it recovers | Dirty collection tracking + sync-on-reconnect |
| Tests run without Electron | localStorage-only mode when `window.electron` is absent |

---

## Component Map

```
src/utils/
├── syncManager.js        SyncManager class + singleton export
└── electronAdapter.js    ElectronAdapter class + singleton export

electron/
├── database.cjs          DBManager (better-sqlite3 wrapper)
│     └── ping()          lightweight health-check method
├── main.cjs              IPC handlers including db:ping
└── preload.cjs           window.electron bridge including ping()
```

### Dependency Graph

```
App.jsx
  └─ electronAdapter (singleton)
       ├─ syncManager (singleton)  ←  polls window.electron.ping()
       │    └─ onStatusChange listeners
       │         └─ [adapter's listener]
       │               └─ _syncDirtyCollections()
       └─ window.electron (IPC bridge)
            └─ preload.cjs → main.cjs → DBManager → SQLite
```

---

## Normal Operation (Write-Through)

When SQLite is available, **every write goes to both SQLite and localStorage**:

```
App calls adapter.saveTodos(data)
  │
  ├─► localStorage.setItem("todos", JSON.stringify(data))   ← backup always first
  │
  └─► window.electron.saveTodos(data)    ← primary write
        │
        ├─ success: syncManager.clearDirty("todos")   ← no pending sync needed
        │
        └─ failure: _handleFailure("todos")
               ├─ adapter._ready = false
               ├─ syncManager.setAvailable(false)    ← fires 'offline' event
               └─ syncManager.markDirty("todos")     ← queue for sync
```

**Reads** go to SQLite only (localStorage is not consulted):

```
App calls adapter.getTodos()
  │
  └─► window.electron.getTodos()
        │
        ├─ success: return SQLite data
        │
        └─ failure: _handleFailure(null)   ← no dirty marking for reads
               └─► localStorage.getItem("todos")   ← serve backup
```

---

## SQLite Outage (Offline Mode)

When `_ready = false` (SQLite unreachable), **all operations use localStorage**:

```
App calls adapter.saveTodos(data)
  │
  ├─► localStorage.setItem("todos", ...)   ← backup write
  └─► syncManager.markDirty("todos")       ← flag for later sync
```

The app continues working normally. The user sees no error. The status indicator in Settings shows "SQLite unavailable".

---

## Reconnect & Sync

### Detection

SyncManager polls every 5 seconds:

```
setInterval(() => {
  const ok = await window.electron.ping()   ← lightweight db:ping IPC call
  if (wasOffline && ok) emit('online')
  if (wasOnline && !ok) emit('offline')
}, 5000)
```

The initial check fires immediately on `start()`.

### Sync on Reconnect

When `'online'` fires:

```
adapter._ready = true

for (collection in syncManager.getDirty()):
  data = localStorage.getItem(collection)   ← read the backup
  window.electron.save(collection, data)    ← push to SQLite
  syncManager.clearDirty(collection)        ← mark synced

if push fails:
  keep dirty flag                           ← retry on next reconnect
```

### Conflict Resolution

The resolution policy is **"last-write-in-localStorage wins"**:

- localStorage is always updated on every write (whether SQLite was available or not)
- On reconnect, localStorage contents are pushed to SQLite unconditionally
- This means changes made during an outage take precedence over stale SQLite data

This is the correct policy because:
1. SQLite was unreachable, so no one wrote to it during the outage
2. All user actions during the outage went to localStorage
3. localStorage therefore has the newer data

---

## SyncManager Reference

**File:** `src/utils/syncManager.js`

**Exported singleton:** `syncManager`

### Constructor Options

```javascript
new SyncManager({ pollIntervalMs: 5_000 })
```

### Public API

```typescript
class SyncManager {
  // Current SQLite reachability
  get available(): boolean

  // Start background health-check polling (idempotent)
  start(): void

  // Stop background polling
  stop(): void

  // Directly set availability (bypasses polling cycle)
  // Fires 'online' or 'offline' event if value changes
  setAvailable(val: boolean): void

  // Perform a single health check and update state
  // Called automatically by the interval; also useful in tests
  async _doCheck(): Promise<void>

  // Test the IPC bridge directly
  // Returns true only when window.electron.ping() resolves { ok: true }
  async checkHealth(): Promise<boolean>

  // Dirty tracking
  markDirty(collection: string): void
  clearDirty(collection: string): void
  clearAllDirty(): void
  isDirty(collection: string): boolean
  getDirty(): Set<string>    // returns a snapshot
  hasDirty(): boolean

  // Event subscription
  // Returns an unsubscribe function
  onStatusChange(fn: (event: { type: 'online' | 'offline' }) => void): () => void

  // Diagnostic snapshot
  getStatus(): { available: boolean, dirty: string[], polling: boolean }
}
```

### Notes

- `_doCheck()` guards against in-flight results after `stop()` is called. If `stop()` is called while a health check is in-flight, the result is discarded (no events fired, no state change).
- `setAvailable(val)` is synchronous. Listeners are called immediately inline. Async listeners (like the adapter's) start but are not awaited by `_emit`.
- `getDirty()` returns a **snapshot** of the set — safe to iterate while new items are marked.

---

## ElectronAdapter Reference

**File:** `src/utils/electronAdapter.js`

**Exported singleton:** `electronAdapter`

### Internal State

```typescript
class ElectronAdapter {
  hasElectron: boolean     // true when window.electron exists (set in constructor)
  _ready: boolean          // true when SQLite IPC calls should be attempted
}
```

### Routing Logic

```javascript
_ok() {
  return this.hasElectron && this._ready
}
```

- `hasElectron = false` → all operations use localStorage (test / browser mode)
- `hasElectron = true, _ready = true` → SQLite preferred, localStorage as write-through backup
- `hasElectron = true, _ready = false` → localStorage only, collections marked dirty

### Write-Through Pattern

Every bulk-save method (saveTodos, saveTags, saveContacts, updateConfig) writes to localStorage **before** attempting SQLite:

```javascript
async saveTodos(data) {
  localStorage.setItem("todos", JSON.stringify(data))   // always

  if (this._ok()) {
    try {
      const result = await window.electron.saveTodos(data)
      syncManager.clearDirty("todos")
      return result
    } catch {
      this._handleFailure("todos")
    }
  }

  syncManager.markDirty("todos")
  return data
}
```

### Sync Push

`_pushCollectionToSQLite(collection)` reads the current localStorage value and writes it to SQLite. This is called by `_syncDirtyCollections()` which is triggered by the `'online'` event:

```javascript
async _pushCollectionToSQLite(collection) {
  switch (collection) {
    case "todos":
      return window.electron.saveTodos(
        JSON.parse(localStorage.getItem("todos") || '{"active":[],"completed":[]}')
      )
    case "tags":
      // reads from tags.md first, then falls back to tags
      ...
    case "contacts":
      ...
    case "config":
      // only pushes if config has at least one key
      ...
  }
}
```

> **Note:** `_pushCollectionToSQLite` does NOT call `_ok()`. It calls `window.electron.*` directly because it is only ever invoked when the `'online'` event has already confirmed SQLite is reachable.

---

## Data Flow Diagrams

### Happy Path

```
User action
   │
   ▼
App.jsx (React state update)
   │  debounced 500ms
   ▼
electronAdapter.saveTodos(data)
   │
   ├──► localStorage.setItem("todos", data)         [backup always updated]
   │
   └──► window.electron.saveTodos(data)             [IPC → main.cjs]
              │
              ▼
         DBManager.saveTodos(data)                   [SQLite write]
              │
              ▼
         todos.db                                    [persisted]
```

### SQLite Outage

```
User action
   │
   ▼
electronAdapter.saveTodos(data)
   │
   ├──► localStorage.setItem("todos", data)         [backup]
   │
   └──► window.electron.saveTodos(data)  ─── THROWS ──┐
              │                                        │
              └────────────────────────────────────────┤
                                                       │
                                         _handleFailure("todos")
                                            adapter._ready = false
                                            syncManager.setAvailable(false)
                                            syncManager.markDirty("todos")
```

### Reconnect & Sync

```
SyncManager._doCheck()
   │
   └──► window.electron.ping()  ── { ok: true } ──┐
              │                                    │
              └────────────────────────────────────┤
                                                   │
                                    sm.setAvailable(true)
                                    fires 'online'
                                         │
                                         ▼
                              adapter.onStatusChange('online')
                                    adapter._ready = true
                                    _syncDirtyCollections()
                                         │
                                    for "todos":
                                         │
                                    read localStorage("todos")
                                         │
                                    window.electron.saveTodos(data)
                                         │
                                    syncManager.clearDirty("todos")
```

---

## Edge Cases & Guarantees

| Scenario | Behavior |
|----------|----------|
| App starts with SQLite up | `_ready = true` from constructor; normal operation |
| App starts with SQLite down | First IPC call throws; `_ready = false`; localStorage used; sync queued |
| SQLite comes back during the session | SyncManager detects within 5 s; dirty collections synced |
| SQLite comes back mid-sync | Sync push fails (throws); dirty flag kept; retried next poll |
| Multiple collections dirty | Synced one by one in insertion order of the Set |
| Empty config (0 keys) | `_pushCollectionToSQLite("config")` is a no-op (skips empty writes) |
| Corrupt localStorage | SQLite data takes precedence on next successful read |
| Test environment (no window.electron) | `hasElectron = false`; all operations use localStorage; syncManager never starts |
| Concurrent writes to same collection | SQLite serialises writes (better-sqlite3 is synchronous); localStorage is serialised by the event loop |
| Very large localStorage | `saveAudioMessages` and `saveEmails` catch `QuotaExceededError` and log a warning |

---

## Testing the Sync Layer

### Running Sync Tests

```bash
# All tests including sync
npm test

# Only sync-related tests
npx vitest run src/__tests__/syncManager.test.js src/__tests__/electronAdapter.sync.test.js
```

### Test Design Principles

1. **Module isolation:** Each test calls `vi.resetModules()` and re-imports `syncManager` and `electronAdapter` so each test gets a fresh singleton. Since vitest caches modules per registry, both imports share the same syncManager instance within a single `makeAll()` call.

2. **No background polling in tests:** After `makeAll()`, `sm.stop()` is called immediately to prevent the background `_doCheck()` from completing and changing `sm._available` before the test can control it. Tests drive availability manually via `sm.setAvailable()`.

3. **Async flushing:** After `sm.setAvailable(true)` fires an `'online'` event, the adapter's async listener starts `_syncDirtyCollections()`. Since this is async, the test calls `await flushAsync()` (10 rounds of `await Promise.resolve()`) to let all chained Promises settle before asserting.

4. **`window.electron` mocks:** `makeElectron()` returns a complete mock of the `window.electron` bridge. Individual methods can be overridden to simulate failures (`vi.fn().mockRejectedValue(new Error(...))`).

### Writing a New Sync Test

```javascript
it("my sync scenario", async () => {
  // 1. Set up localStorage state
  localStorage.setItem("todos", JSON.stringify({ active: [...], completed: [] }))

  // 2. Create a mock electron bridge and get fresh singletons
  const saveTodos = vi.fn().mockImplementation(async (d) => d)
  const el = makeElectron({ saveTodos })
  const { sm, adapter } = await makeAll(el)

  // 3. Drive the scenario
  sm.markDirty("todos")       // simulate: SQLite was offline and this collection changed
  sm.setAvailable(true)       // simulate: SQLite comes back
  await flushAsync()          // let async listeners complete

  // 4. Assert
  expect(saveTodos).toHaveBeenCalled()
  expect(sm.isDirty("todos")).toBe(false)
})
```
