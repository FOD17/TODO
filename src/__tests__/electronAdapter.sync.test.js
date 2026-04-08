/**
 * electronAdapter.sync.test.js
 *
 * Tests for the SQLite ↔ localStorage sync layer in ElectronAdapter.
 * Covers:
 *  - Write-through: every SQLite write also updates localStorage
 *  - Fallback: when SQLite throws, the adapter uses localStorage
 *  - Dirty marking: failed/skipped writes mark the collection dirty
 *  - Sync-on-reconnect: on 'online' event, dirty collections are pushed to SQLite
 *  - Edge cases and failure scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Flush the microtask queue so that async listeners triggered by
 * syncManager.setAvailable() have a chance to run their awaited operations.
 * Multiple rounds cover chained awaits inside _syncDirtyCollections.
 */
async function flushAsync() {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve()
  }
}

const EMPTY_TODOS = { active: [], completed: [] }
const EMPTY_TAGS = { companies: [], accountExecutives: [], companyAssignments: {}, labels: [] }

/**
 * Build a mock window.electron object. Each method can be overridden.
 * Default: all calls succeed and return plausible data.
 */
function makeElectron(overrides = {}) {
  const defaults = {
    ping: vi.fn().mockResolvedValue({ ok: true }),
    getTodos: vi.fn().mockResolvedValue(EMPTY_TODOS),
    saveTodos: vi.fn().mockImplementation(async (d) => d),
    addTodo: vi.fn().mockImplementation(async (d) => ({ id: "sqlite-id", ...d, completed: 0 })),
    updateTodo: vi.fn().mockImplementation(async (id, u) => ({ id, ...u })),
    deleteTodo: vi.fn().mockResolvedValue(undefined),
    completeTodo: vi.fn().mockResolvedValue(undefined),
    uncompleteTodo: vi.fn().mockResolvedValue(undefined),

    getTags: vi.fn().mockResolvedValue(EMPTY_TAGS),
    saveTags: vi.fn().mockImplementation(async (d) => d),
    addTag: vi.fn().mockImplementation(async (co, tag) => ({ company: co, tagName: tag })),
    removeTag: vi.fn().mockResolvedValue(undefined),

    getContacts: vi.fn().mockResolvedValue({}),
    saveContacts: vi.fn().mockImplementation(async (d) => d),
    addContact: vi.fn().mockImplementation(async (co, c) => ({ id: "c-id", ...c })),
    updateContact: vi.fn().mockImplementation(async (co, id, u) => ({ id, ...u })),
    deleteContact: vi.fn().mockResolvedValue(undefined),

    getConfig: vi.fn().mockResolvedValue({ theme: "github-dark" }),
    updateConfig: vi.fn().mockImplementation(async (c) => c),

    exportBackup: vi.fn().mockResolvedValue({
      todos: EMPTY_TODOS,
      tags: {},
      contacts: {},
      config: {},
      exportedAt: new Date().toISOString(),
    }),
    importBackup: vi.fn().mockResolvedValue({ status: "success" }),
    getStatus: vi.fn().mockResolvedValue({ ready: true, database: "SQLite" }),
  }
  return { ...defaults, ...overrides }
}

/**
 * Reset the module registry, wire up window.electron, and import fresh
 * singleton instances of both syncManager and electronAdapter.
 * Returns { sm, adapter } — both share the SAME syncManager instance.
 */
async function makeAll(electronMock = null) {
  vi.resetModules()

  if (electronMock) {
    window.electron = electronMock
  } else {
    delete window.electron
  }

  // Import syncManager first so it is cached before electronAdapter imports it.
  const { syncManager: sm } = await import("../utils/syncManager.js")
  const { electronAdapter: adapter } = await import("../utils/electronAdapter.js")

  // Stop polling. The adapter constructor calls start() → _doCheck() runs as a
  // microtask during `await import()` above. That check may have already
  // completed and set sm._available = true before we can stop it. We bypass
  // setAvailable() here (which fires events) and directly reset the internal
  // flag so the adapter state is undisturbed. Tests drive availability
  // manually via sm.setAvailable().
  sm.stop()
  sm._available = false // reset without firing events so adapter._ready stays intact

  return { sm, adapter }
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  delete window.electron
  vi.resetModules()
})

// ─── localStorage-only mode ───────────────────────────────────────────────────

describe("ElectronAdapter — localStorage-only mode (no Electron)", () => {
  it("getTodos returns empty default when nothing stored", async () => {
    const { adapter } = await makeAll(null)
    const result = await adapter.getTodos()
    expect(result).toEqual(EMPTY_TODOS)
  })

  it("saveTodos persists to localStorage", async () => {
    const { adapter } = await makeAll(null)
    const data = { active: [{ id: "1", message: "test" }], completed: [] }
    await adapter.saveTodos(data)
    expect(JSON.parse(localStorage.getItem("todos"))).toEqual(data)
  })

  it("saveTodos marks 'todos' dirty (no SQLite to clear it)", async () => {
    const { sm, adapter } = await makeAll(null)
    await adapter.saveTodos({ active: [], completed: [] })
    expect(sm.isDirty("todos")).toBe(true)
  })

  it("getTags returns safe defaults when nothing stored", async () => {
    const { adapter } = await makeAll(null)
    const tags = await adapter.getTags()
    expect(tags.companies).toEqual([])
    expect(tags.accountExecutives).toEqual([])
    expect(tags.labels).toEqual([])
    expect(tags.companyAssignments).toEqual({})
  })

  it("saveTags writes to both 'tags.md' and 'tags' keys", async () => {
    const { adapter } = await makeAll(null)
    const data = { companies: ["Acme"], accountExecutives: [], companyAssignments: {}, labels: [] }
    await adapter.saveTags(data)
    expect(localStorage.getItem("tags.md")).not.toBeNull()
    expect(localStorage.getItem("tags")).not.toBeNull()
  })

  it("getConfig returns defaults when empty", async () => {
    const { adapter } = await makeAll(null)
    const cfg = await adapter.getConfig()
    expect(cfg.theme).toBe("github-dark")
    expect(cfg.sidebarPosition).toBe("left")
  })

  it("updateConfig persists to localStorage", async () => {
    const { adapter } = await makeAll(null)
    await adapter.updateConfig({ theme: "dracula" })
    const stored = JSON.parse(localStorage.getItem("config"))
    expect(stored.theme).toBe("dracula")
  })

  it("addTodo inserts into localStorage active list", async () => {
    const { adapter } = await makeAll(null)
    const todo = await adapter.addTodo({ message: "hello", company: "Acme", date: "2026-01-01" })
    expect(todo.id).toBeDefined()
    const stored = JSON.parse(localStorage.getItem("todos"))
    expect(stored.active[0].message).toBe("hello")
  })

  it("deleteTodo removes from localStorage", async () => {
    const { adapter } = await makeAll(null)
    await adapter.saveTodos({ active: [{ id: "x", message: "bye" }], completed: [] })
    await adapter.deleteTodo("x")
    const stored = JSON.parse(localStorage.getItem("todos"))
    expect(stored.active).toHaveLength(0)
  })

  it("completeTodo moves todo from active to completed", async () => {
    const { adapter } = await makeAll(null)
    await adapter.saveTodos({ active: [{ id: "a", message: "do it" }], completed: [] })
    await adapter.completeTodo("a")
    const stored = JSON.parse(localStorage.getItem("todos"))
    expect(stored.active).toHaveLength(0)
    expect(stored.completed).toHaveLength(1)
  })

  it("uncompleteTodo moves todo from completed to active", async () => {
    const { adapter } = await makeAll(null)
    await adapter.saveTodos({ active: [], completed: [{ id: "b", message: "done" }] })
    await adapter.uncompleteTodo("b")
    const stored = JSON.parse(localStorage.getItem("todos"))
    expect(stored.active).toHaveLength(1)
    expect(stored.completed).toHaveLength(0)
  })

  it("exportBackup builds from localStorage when SQLite unavailable", async () => {
    const { adapter } = await makeAll(null)
    await adapter.saveTodos({ active: [{ id: "1", message: "thing" }], completed: [] })
    const backup = await adapter.exportBackup()
    expect(backup.todos.active[0].message).toBe("thing")
    expect(backup.exportedAt).toBeDefined()
  })

  it("importBackup restores data to localStorage", async () => {
    const { adapter } = await makeAll(null)
    const result = await adapter.importBackup({
      todos: { active: [{ id: "r1", message: "restored" }], completed: [] },
      tags: { companies: ["RestoredCo"] },
      config: { theme: "nord" },
    })
    expect(result.status).toBe("success")
    const todos = JSON.parse(localStorage.getItem("todos"))
    expect(todos.active[0].message).toBe("restored")
  })
})

// ─── SQLite mode — write-through ──────────────────────────────────────────────

describe("ElectronAdapter — SQLite mode (write-through to localStorage)", () => {
  it("saveTodos calls window.electron.saveTodos", async () => {
    const el = makeElectron()
    const { adapter } = await makeAll(el)
    const data = { active: [{ id: "1", message: "x" }], completed: [] }
    await adapter.saveTodos(data)
    expect(el.saveTodos).toHaveBeenCalledWith(data)
  })

  it("saveTodos also writes to localStorage as backup", async () => {
    const el = makeElectron()
    const { adapter } = await makeAll(el)
    const data = { active: [{ id: "2", message: "backed up" }], completed: [] }
    await adapter.saveTodos(data)
    expect(JSON.parse(localStorage.getItem("todos"))).toEqual(data)
  })

  it("saveTodos clears the 'todos' dirty flag after successful SQLite write", async () => {
    const el = makeElectron()
    const { sm, adapter } = await makeAll(el)
    sm.markDirty("todos")
    await adapter.saveTodos({ active: [], completed: [] })
    expect(sm.isDirty("todos")).toBe(false)
  })

  it("saveTags calls window.electron.saveTags and writes to both localStorage keys", async () => {
    const el = makeElectron()
    const { adapter } = await makeAll(el)
    const data = { companies: ["TestCo"], accountExecutives: [], companyAssignments: {}, labels: [] }
    await adapter.saveTags(data)
    expect(el.saveTags).toHaveBeenCalledWith(data)
    expect(localStorage.getItem("tags.md")).not.toBeNull()
    expect(localStorage.getItem("tags")).not.toBeNull()
  })

  it("updateConfig calls window.electron.updateConfig and writes to localStorage", async () => {
    const el = makeElectron()
    const { adapter } = await makeAll(el)
    await adapter.updateConfig({ theme: "ocean" })
    expect(el.updateConfig).toHaveBeenCalledWith({ theme: "ocean" })
    expect(JSON.parse(localStorage.getItem("config")).theme).toBe("ocean")
  })

  it("getTodos reads from SQLite when available", async () => {
    const sqliteTodos = { active: [{ id: "s1", message: "from sqlite" }], completed: [] }
    const el = makeElectron({ getTodos: vi.fn().mockResolvedValue(sqliteTodos) })
    const { adapter } = await makeAll(el)
    const result = await adapter.getTodos()
    expect(result.active[0].message).toBe("from sqlite")
    expect(el.getTodos).toHaveBeenCalled()
  })

  it("addTodo calls SQLite and mirrors result to localStorage", async () => {
    const el = makeElectron()
    const { adapter } = await makeAll(el)
    localStorage.setItem("todos", JSON.stringify(EMPTY_TODOS))
    const todoData = { message: "new task", company: "Acme", date: "2026-01-01" }
    const result = await adapter.addTodo(todoData)
    expect(el.addTodo).toHaveBeenCalledWith(todoData)
    const stored = JSON.parse(localStorage.getItem("todos"))
    expect(stored.active.find((t) => t.id === result.id)).toBeDefined()
  })

  it("deleteTodo calls SQLite and mirrors deletion to localStorage", async () => {
    const el = makeElectron()
    const { adapter } = await makeAll(el)
    localStorage.setItem("todos", JSON.stringify({
      active: [{ id: "del-1", message: "delete me" }],
      completed: [],
    }))
    await adapter.deleteTodo("del-1")
    expect(el.deleteTodo).toHaveBeenCalledWith("del-1")
    const stored = JSON.parse(localStorage.getItem("todos"))
    expect(stored.active.find((t) => t.id === "del-1")).toBeUndefined()
  })

  it("completeTodo calls SQLite and mirrors status change to localStorage", async () => {
    const el = makeElectron()
    const { adapter } = await makeAll(el)
    localStorage.setItem("todos", JSON.stringify({
      active: [{ id: "c1", message: "finish" }],
      completed: [],
    }))
    await adapter.completeTodo("c1")
    expect(el.completeTodo).toHaveBeenCalledWith("c1")
    const stored = JSON.parse(localStorage.getItem("todos"))
    expect(stored.active.find((t) => t.id === "c1")).toBeUndefined()
    expect(stored.completed.find((t) => t.id === "c1")).toBeDefined()
  })

  it("uncompleteTodo calls SQLite and mirrors to localStorage", async () => {
    const el = makeElectron()
    const { adapter } = await makeAll(el)
    localStorage.setItem("todos", JSON.stringify({
      active: [],
      completed: [{ id: "u1", message: "undo me" }],
    }))
    await adapter.uncompleteTodo("u1")
    expect(el.uncompleteTodo).toHaveBeenCalledWith("u1")
    const stored = JSON.parse(localStorage.getItem("todos"))
    expect(stored.completed.find((t) => t.id === "u1")).toBeUndefined()
    expect(stored.active.find((t) => t.id === "u1")).toBeDefined()
  })
})

// ─── SQLite failure → fallback + dirty marking ────────────────────────────────

describe("ElectronAdapter — SQLite failure → localStorage fallback", () => {
  it("saveTodos falls back to localStorage when SQLite throws", async () => {
    const el = makeElectron({ saveTodos: vi.fn().mockRejectedValue(new Error("IPC error")) })
    const { adapter } = await makeAll(el)
    const data = { active: [{ id: "fb-1", message: "fallback" }], completed: [] }
    const result = await adapter.saveTodos(data)
    expect(result).toEqual(data)
    expect(JSON.parse(localStorage.getItem("todos"))).toEqual(data)
  })

  it("saveTodos marks 'todos' dirty when SQLite throws", async () => {
    const el = makeElectron({ saveTodos: vi.fn().mockRejectedValue(new Error("down")) })
    const { sm, adapter } = await makeAll(el)
    await adapter.saveTodos({ active: [], completed: [] })
    expect(sm.isDirty("todos")).toBe(true)
  })

  it("saveTags falls back and marks 'tags' dirty when SQLite throws", async () => {
    const el = makeElectron({ saveTags: vi.fn().mockRejectedValue(new Error("err")) })
    const { sm, adapter } = await makeAll(el)
    await adapter.saveTags({ companies: ["FailCo"], accountExecutives: [], companyAssignments: {}, labels: [] })
    expect(sm.isDirty("tags")).toBe(true)
  })

  it("updateConfig falls back and marks 'config' dirty when SQLite throws", async () => {
    const el = makeElectron({ updateConfig: vi.fn().mockRejectedValue(new Error("err")) })
    const { sm, adapter } = await makeAll(el)
    await adapter.updateConfig({ theme: "nord" })
    expect(sm.isDirty("config")).toBe(true)
    expect(JSON.parse(localStorage.getItem("config")).theme).toBe("nord")
  })

  it("getTodos falls back to localStorage when SQLite throws", async () => {
    const localData = { active: [{ id: "local-1", message: "local todo" }], completed: [] }
    localStorage.setItem("todos", JSON.stringify(localData))
    const el = makeElectron({ getTodos: vi.fn().mockRejectedValue(new Error("IPC dead")) })
    const { adapter } = await makeAll(el)
    const result = await adapter.getTodos()
    expect(result.active[0].message).toBe("local todo")
  })

  it("getTags falls back to localStorage when SQLite throws", async () => {
    localStorage.setItem("tags.md", JSON.stringify({
      companies: ["LocalCo"],
      accountExecutives: [],
      companyAssignments: {},
      labels: [],
    }))
    const el = makeElectron({ getTags: vi.fn().mockRejectedValue(new Error("down")) })
    const { adapter } = await makeAll(el)
    const result = await adapter.getTags()
    expect(result.companies).toEqual(["LocalCo"])
  })

  it("getConfig falls back to defaults when SQLite throws and localStorage is empty", async () => {
    const el = makeElectron({ getConfig: vi.fn().mockRejectedValue(new Error("err")) })
    const { adapter } = await makeAll(el)
    const cfg = await adapter.getConfig()
    expect(cfg.theme).toBe("github-dark")
  })

  it("addTodo falls back to localStorage and marks dirty", async () => {
    localStorage.setItem("todos", JSON.stringify(EMPTY_TODOS))
    const el = makeElectron({ addTodo: vi.fn().mockRejectedValue(new Error("err")) })
    const { sm, adapter } = await makeAll(el)
    const result = await adapter.addTodo({ message: "fallback-add", company: "X", date: "2026-01-01" })
    expect(result.id).toBeDefined()
    const stored = JSON.parse(localStorage.getItem("todos"))
    expect(stored.active[0].message).toBe("fallback-add")
    expect(sm.isDirty("todos")).toBe(true)
  })

  it("deleteTodo falls back and marks dirty when SQLite throws", async () => {
    localStorage.setItem("todos", JSON.stringify({
      active: [{ id: "d1", message: "gone" }],
      completed: [],
    }))
    const el = makeElectron({ deleteTodo: vi.fn().mockRejectedValue(new Error("err")) })
    const { sm, adapter } = await makeAll(el)
    await adapter.deleteTodo("d1")
    const stored = JSON.parse(localStorage.getItem("todos"))
    expect(stored.active.find((t) => t.id === "d1")).toBeUndefined()
    expect(sm.isDirty("todos")).toBe(true)
  })
})

// ─── Sync-on-reconnect ────────────────────────────────────────────────────────

describe("ElectronAdapter — sync-on-reconnect", () => {
  it("pushes dirty 'todos' to SQLite when syncManager fires 'online'", async () => {
    const data = { active: [{ id: "sync-1", message: "sync me" }], completed: [] }
    localStorage.setItem("todos", JSON.stringify(data))

    const saveTodos = vi.fn().mockImplementation(async (d) => d)
    const el = makeElectron({ saveTodos })
    const { sm, adapter: _adapter } = await makeAll(el)

    sm.markDirty("todos")
    sm.setAvailable(true) // fires 'online'
    await flushAsync()

    expect(saveTodos).toHaveBeenCalledWith(data)
    expect(sm.isDirty("todos")).toBe(false)
  })

  it("pushes dirty 'tags' to SQLite on reconnect", async () => {
    const tagsData = { companies: ["SyncCo"], accountExecutives: [], companyAssignments: {}, labels: [] }
    localStorage.setItem("tags.md", JSON.stringify(tagsData))

    const saveTags = vi.fn().mockImplementation(async (d) => d)
    const el = makeElectron({ saveTags })
    const { sm, adapter: _adapter } = await makeAll(el)

    sm.markDirty("tags")
    sm.setAvailable(true)
    await flushAsync()

    expect(saveTags).toHaveBeenCalledWith(tagsData)
    expect(sm.isDirty("tags")).toBe(false)
  })

  it("pushes dirty 'contacts' to SQLite on reconnect", async () => {
    const contacts = { Acme: { Alice: [{ id: "c1", name: "Alice" }] } }
    localStorage.setItem("contacts", JSON.stringify(contacts))

    const saveContacts = vi.fn().mockImplementation(async (d) => d)
    const el = makeElectron({ saveContacts })
    const { sm, adapter: _adapter } = await makeAll(el)

    sm.markDirty("contacts")
    sm.setAvailable(true)
    await flushAsync()

    expect(saveContacts).toHaveBeenCalledWith(contacts)
    expect(sm.isDirty("contacts")).toBe(false)
  })

  it("pushes dirty 'config' to SQLite on reconnect", async () => {
    const cfg = { theme: "dracula", sidebarPosition: "right" }
    localStorage.setItem("config", JSON.stringify(cfg))

    const updateConfig = vi.fn().mockImplementation(async (d) => d)
    const el = makeElectron({ updateConfig })
    const { sm, adapter: _adapter } = await makeAll(el)

    sm.markDirty("config")
    sm.setAvailable(true)
    await flushAsync()

    expect(updateConfig).toHaveBeenCalledWith(cfg)
    expect(sm.isDirty("config")).toBe(false)
  })

  it("syncs multiple dirty collections on reconnect", async () => {
    localStorage.setItem("todos", JSON.stringify(EMPTY_TODOS))
    localStorage.setItem("tags.md", JSON.stringify({}))

    const saveTodos = vi.fn().mockImplementation(async (d) => d)
    const saveTags = vi.fn().mockImplementation(async (d) => d)
    const el = makeElectron({ saveTodos, saveTags })
    const { sm, adapter: _adapter } = await makeAll(el)

    sm.markDirty("todos")
    sm.markDirty("tags")
    sm.setAvailable(true)
    await flushAsync()

    expect(saveTodos).toHaveBeenCalled()
    expect(saveTags).toHaveBeenCalled()
    expect(sm.hasDirty()).toBe(false)
  })

  it("keeps dirty flag when sync push fails (will retry next reconnect)", async () => {
    localStorage.setItem("todos", JSON.stringify(EMPTY_TODOS))

    const saveTodos = vi.fn().mockRejectedValue(new Error("still broken"))
    const el = makeElectron({ saveTodos })
    const { sm, adapter: _adapter } = await makeAll(el)

    sm.markDirty("todos")
    sm.setAvailable(true)
    await flushAsync()

    // Sync failed — dirty flag must persist for next reconnect.
    expect(sm.isDirty("todos")).toBe(true)
  })

  it("does not sync non-dirty collections on reconnect", async () => {
    localStorage.setItem("todos", JSON.stringify(EMPTY_TODOS))

    const saveTodos = vi.fn().mockImplementation(async (d) => d)
    const saveTags = vi.fn().mockImplementation(async (d) => d)
    const saveContacts = vi.fn().mockImplementation(async (d) => d)
    const el = makeElectron({ saveTodos, saveTags, saveContacts })
    const { sm, adapter: _adapter } = await makeAll(el)

    // Only todos is dirty.
    sm.markDirty("todos")
    sm.setAvailable(true)
    await flushAsync()

    expect(saveTodos).toHaveBeenCalled()
    expect(saveTags).not.toHaveBeenCalled()
    expect(saveContacts).not.toHaveBeenCalled()
  })

  it("does nothing when SQLite reconnects with no dirty collections", async () => {
    const saveTodos = vi.fn()
    const el = makeElectron({ saveTodos })
    const { sm, adapter: _adapter } = await makeAll(el)

    // No dirty collections.
    sm.setAvailable(true)
    await flushAsync()

    expect(saveTodos).not.toHaveBeenCalled()
  })
})

// ─── getStatus ────────────────────────────────────────────────────────────────

describe("ElectronAdapter — getStatus()", () => {
  it("includes sync status in the result", async () => {
    const el = makeElectron()
    const { sm, adapter } = await makeAll(el)
    sm.markDirty("todos")
    const status = await adapter.getStatus()
    expect(status.sync).toBeDefined()
    expect(status.sync.dirty).toContain("todos")
  })

  it("returns localStorage-based status when SQLite is unavailable", async () => {
    const el = makeElectron({ getStatus: vi.fn().mockRejectedValue(new Error("down")) })
    const { adapter } = await makeAll(el)
    const status = await adapter.getStatus()
    expect(status.database).toMatch(/localStorage/)
  })
})

// ─── Audio and Email (localStorage-only) ──────────────────────────────────────

describe("ElectronAdapter — audio and email (localStorage only)", () => {
  it("saveAudioMessages stores in localStorage", async () => {
    const { adapter } = await makeAll(null)
    await adapter.saveAudioMessages([{ id: "a1", title: "Test" }])
    expect(JSON.parse(localStorage.getItem("audio_messages"))[0].id).toBe("a1")
  })

  it("getAudioMessages returns empty array by default", async () => {
    const { adapter } = await makeAll(null)
    expect(await adapter.getAudioMessages()).toEqual([])
  })

  it("saveEmails stores in localStorage", async () => {
    const { adapter } = await makeAll(null)
    await adapter.saveEmails([{ id: "e1", subject: "Hello" }])
    expect(JSON.parse(localStorage.getItem("email_files"))[0].id).toBe("e1")
  })

  it("getEmails returns empty array by default", async () => {
    const { adapter } = await makeAll(null)
    expect(await adapter.getEmails()).toEqual([])
  })

  it("audio and email operations do NOT mark any collection dirty", async () => {
    const { sm, adapter } = await makeAll(null)
    await adapter.saveAudioMessages([{ id: "a" }])
    await adapter.saveEmails([{ id: "e" }])
    expect(sm.hasDirty()).toBe(false)
  })
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("ElectronAdapter — edge cases", () => {
  it("handles invalid JSON in localStorage todos during fallback (throws)", async () => {
    localStorage.setItem("todos", "{broken")
    const el = makeElectron({ getTodos: vi.fn().mockRejectedValue(new Error("err")) })
    const { adapter } = await makeAll(el)
    await expect(adapter.getTodos()).rejects.toThrow()
  })

  it("saveTodos with empty arrays succeeds", async () => {
    const { adapter } = await makeAll(null)
    const result = await adapter.saveTodos({ active: [], completed: [] })
    expect(result).toEqual({ active: [], completed: [] })
  })

  it("addTodo with minimal data creates a todo with an id", async () => {
    const { adapter } = await makeAll(null)
    localStorage.setItem("todos", JSON.stringify(EMPTY_TODOS))
    const result = await adapter.addTodo({ message: "minimal" })
    expect(typeof result.id).toBe("string")
    expect(result.message).toBe("minimal")
  })

  it("deleteTodo of non-existent id is a no-op", async () => {
    const { adapter } = await makeAll(null)
    localStorage.setItem("todos", JSON.stringify(EMPTY_TODOS))
    await expect(adapter.deleteTodo("does-not-exist")).resolves.not.toThrow()
  })

  it("completeTodo of non-existent id is a no-op", async () => {
    const { adapter } = await makeAll(null)
    localStorage.setItem("todos", JSON.stringify(EMPTY_TODOS))
    await expect(adapter.completeTodo("ghost")).resolves.not.toThrow()
  })

  it("uncompleteTodo of non-existent id is a no-op", async () => {
    const { adapter } = await makeAll(null)
    localStorage.setItem("todos", JSON.stringify(EMPTY_TODOS))
    await expect(adapter.uncompleteTodo("ghost")).resolves.not.toThrow()
  })

  it("importBackup with todos only succeeds", async () => {
    const { adapter } = await makeAll(null)
    const result = await adapter.importBackup({
      todos: { active: [{ id: "p1", message: "partial" }], completed: [] },
    })
    expect(result.status).toBe("success")
    expect(JSON.parse(localStorage.getItem("todos")).active[0].message).toBe("partial")
  })

  it("importBackup with empty object does not throw", async () => {
    const { adapter } = await makeAll(null)
    await expect(adapter.importBackup({})).resolves.not.toThrow()
  })

  it("saveTodos called twice — second call overwrites backup", async () => {
    const { adapter } = await makeAll(null)
    await adapter.saveTodos({ active: [{ id: "first" }], completed: [] })
    await adapter.saveTodos({ active: [{ id: "second" }], completed: [] })
    expect(JSON.parse(localStorage.getItem("todos")).active[0].id).toBe("second")
  })

  it("saveContacts stores nested structure correctly", async () => {
    const { adapter } = await makeAll(null)
    const contacts = { Acme: { Alice: [{ id: "c1", name: "Alice", type: "person" }] } }
    await adapter.saveContacts(contacts)
    expect(JSON.parse(localStorage.getItem("contacts")).Acme.Alice[0].name).toBe("Alice")
  })

  it("addContact to new company creates the nested structure", async () => {
    const { adapter } = await makeAll(null)
    localStorage.setItem("contacts", JSON.stringify({}))
    await adapter.addContact("NewCo", { name: "Bob", type: "person" })
    const stored = JSON.parse(localStorage.getItem("contacts"))
    expect(stored.NewCo).toBeDefined()
    expect(stored.NewCo.Bob[0].name).toBe("Bob")
  })

  it("deleteContact removes contact and cleans up empty name arrays", async () => {
    const { adapter } = await makeAll(null)
    localStorage.setItem("contacts", JSON.stringify({
      Acme: { Alice: [{ id: "del-c", name: "Alice" }] },
    }))
    await adapter.deleteContact("Acme", "del-c")
    const stored = JSON.parse(localStorage.getItem("contacts"))
    expect(stored.Acme?.Alice).toBeUndefined()
  })
})
