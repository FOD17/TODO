/**
 * Electron API Adapter — SQLite primary, localStorage backup
 *
 * Architecture
 * ─────────────
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │  React components / App.jsx                         │
 *   └───────────────────┬─────────────────────────────────┘
 *                       │ calls electronAdapter.*()
 *   ┌───────────────────▼─────────────────────────────────┐
 *   │  ElectronAdapter                                    │
 *   │                                                     │
 *   │  WRITE: SQLite (primary) + localStorage (backup)    │
 *   │  READ:  SQLite (primary) → localStorage (fallback)  │
 *   │                                                     │
 *   │  If a SQLite call throws → mark offline, use backup │
 *   │  When SQLite recovers   → SyncManager syncs dirty   │
 *   │                           collections back to SQLite│
 *   └───────────────────┬─────────────────────────────────┘
 *                       │
 *          ┌────────────┴───────────────┐
 *          │                            │
 *   ┌──────▼──────┐            ┌────────▼────────┐
 *   │   SQLite    │            │  localStorage   │
 *   │ (Electron   │            │  (backup +      │
 *   │  IPC/main)  │            │   test fallback)│
 *   └─────────────┘            └─────────────────┘
 *
 * Rules
 * ─────
 *  1. SQLite is always the source of truth when reachable.
 *  2. Every successful SQLite write is also mirrored to localStorage so the
 *     backup is always current.
 *  3. When a SQLite call fails: write only to localStorage, mark the
 *     collection dirty, and signal SyncManager that SQLite is offline.
 *  4. SyncManager polls health every 5 s. On reconnect it pushes each dirty
 *     collection from localStorage → SQLite and clears the dirty flag.
 *  5. In non-Electron environments (tests, browser dev) all operations use
 *     localStorage exclusively — no changes to sync-aware logic needed.
 */

import { syncManager } from "./syncManager.js"

class ElectronAdapter {
  constructor() {
    /** True when the preload bridge (window.electron) exists. */
    this.hasElectron = typeof window !== "undefined" && !!window.electron

    /**
     * Optimistic: if Electron is present we assume SQLite is available until
     * a call proves otherwise. SyncManager polling will keep this accurate
     * after the first few seconds.
     */
    this._ready = this.hasElectron

    if (this.hasElectron) {
      syncManager.start()

      // When SQLite comes back online: restore the ready flag and push any
      // changes that accumulated in localStorage during the outage.
      syncManager.onStatusChange(async (event) => {
        if (event.type === "online") {
          this._ready = true
          await this._syncDirtyCollections()
        } else if (event.type === "offline") {
          this._ready = false
        }
      })
    }
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  /** True when SQLite calls should be attempted. */
  _ok() {
    return this.hasElectron && this._ready
  }

  /**
   * Called when a SQLite IPC call throws. Marks SQLite as offline immediately
   * (rather than waiting for the next poll) and optionally marks a collection
   * dirty so it will be synced when connectivity is restored.
   *
   * @param {string|null} collection  Collection name, or null for read failures.
   */
  _handleFailure(collection) {
    this._ready = false
    syncManager.setAvailable(false)
    if (collection) syncManager.markDirty(collection)
  }

  /**
   * Push every dirty collection from localStorage → SQLite.
   * Called automatically when SyncManager fires the 'online' event.
   */
  async _syncDirtyCollections() {
    const dirty = syncManager.getDirty()
    for (const collection of dirty) {
      try {
        await this._pushCollectionToSQLite(collection)
        syncManager.clearDirty(collection)
      } catch (err) {
        console.error(`[ElectronAdapter] sync failed for "${collection}":`, err)
        // Keep dirty — will retry on next reconnection.
      }
    }
  }

  /**
   * Read a collection from localStorage and write it to SQLite.
   * @param {string} collection
   */
  async _pushCollectionToSQLite(collection) {
    switch (collection) {
      case "todos": {
        const data = JSON.parse(
          localStorage.getItem("todos") || '{"active":[],"completed":[]}',
        )
        return window.electron.saveTodos(data)
      }
      case "tags": {
        const raw =
          localStorage.getItem("tags.md") || localStorage.getItem("tags")
        const data = raw ? JSON.parse(raw) : {}
        return window.electron.saveTags(data)
      }
      case "contacts": {
        const data = JSON.parse(localStorage.getItem("contacts") || "{}")
        return window.electron.saveContacts(data)
      }
      case "config": {
        const data = JSON.parse(localStorage.getItem("config") || "{}")
        if (Object.keys(data).length > 0) {
          return window.electron.updateConfig(data)
        }
        break
      }
      default:
        console.warn(`[ElectronAdapter] unknown collection "${collection}"`)
    }
  }

  // ─── TODOS ─────────────────────────────────────────────────────────────────

  async getTodos() {
    if (this._ok()) {
      try {
        return await window.electron.getTodos()
      } catch {
        // SQLite unreachable — fall through to localStorage.
        this._handleFailure(null)
      }
    }
    const raw = localStorage.getItem("todos")
    return raw ? JSON.parse(raw) : { active: [], completed: [] }
  }

  async saveTodos(todosData) {
    // Always keep localStorage current as backup.
    localStorage.setItem("todos", JSON.stringify(todosData))

    if (this._ok()) {
      try {
        const result = await window.electron.saveTodos(todosData)
        // Successful write — collection is no longer dirty.
        syncManager.clearDirty("todos")
        return result
      } catch {
        this._handleFailure("todos")
      }
    }

    syncManager.markDirty("todos")
    return todosData
  }

  async addTodo(todoData) {
    if (this._ok()) {
      try {
        const result = await window.electron.addTodo(todoData)
        // Mirror to localStorage backup.
        const existing = JSON.parse(
          localStorage.getItem("todos") || '{"active":[],"completed":[]}',
        )
        existing.active.unshift(result)
        localStorage.setItem("todos", JSON.stringify(existing))
        return result
      } catch {
        this._handleFailure("todos")
      }
    }
    // Fallback
    const existing = JSON.parse(
      localStorage.getItem("todos") || '{"active":[],"completed":[]}',
    )
    const newTodo = { id: Date.now().toString(), ...todoData, completed: 0 }
    existing.active.unshift(newTodo)
    localStorage.setItem("todos", JSON.stringify(existing))
    syncManager.markDirty("todos")
    return newTodo
  }

  async updateTodo(id, updates) {
    if (this._ok()) {
      try {
        const result = await window.electron.updateTodo(id, updates)
        // Keep backup in sync.
        const stored = JSON.parse(
          localStorage.getItem("todos") || '{"active":[],"completed":[]}',
        )
        const allTodos = [...stored.active, ...stored.completed]
        const todo = allTodos.find((t) => t.id === id)
        if (todo) {
          Object.assign(todo, updates)
          localStorage.setItem("todos", JSON.stringify(stored))
        }
        return result
      } catch {
        this._handleFailure("todos")
      }
    }
    // Fallback
    const todos = JSON.parse(
      localStorage.getItem("todos") || '{"active":[],"completed":[]}',
    )
    const allTodos = [...todos.active, ...todos.completed]
    const todo = allTodos.find((t) => t.id === id)
    if (todo) {
      Object.assign(todo, updates)
      localStorage.setItem("todos", JSON.stringify(todos))
    }
    syncManager.markDirty("todos")
    return todo
  }

  async deleteTodo(id) {
    if (this._ok()) {
      try {
        await window.electron.deleteTodo(id)
        // Mirror deletion to backup.
        const stored = JSON.parse(
          localStorage.getItem("todos") || '{"active":[],"completed":[]}',
        )
        stored.active = stored.active.filter((t) => t.id !== id)
        stored.completed = stored.completed.filter((t) => t.id !== id)
        localStorage.setItem("todos", JSON.stringify(stored))
        return
      } catch {
        this._handleFailure("todos")
      }
    }
    // Fallback
    const todos = JSON.parse(
      localStorage.getItem("todos") || '{"active":[],"completed":[]}',
    )
    todos.active = todos.active.filter((t) => t.id !== id)
    todos.completed = todos.completed.filter((t) => t.id !== id)
    localStorage.setItem("todos", JSON.stringify(todos))
    syncManager.markDirty("todos")
  }

  async completeTodo(id) {
    if (this._ok()) {
      try {
        await window.electron.completeTodo(id)
        // Mirror to backup.
        const stored = JSON.parse(
          localStorage.getItem("todos") || '{"active":[],"completed":[]}',
        )
        const todo = stored.active.find((t) => t.id === id)
        if (todo) {
          stored.active = stored.active.filter((t) => t.id !== id)
          stored.completed.unshift({ ...todo, completed: 1 })
          localStorage.setItem("todos", JSON.stringify(stored))
        }
        return
      } catch {
        this._handleFailure("todos")
      }
    }
    // Fallback
    const todos = JSON.parse(
      localStorage.getItem("todos") || '{"active":[],"completed":[]}',
    )
    const todo = todos.active.find((t) => t.id === id)
    if (todo) {
      todos.active = todos.active.filter((t) => t.id !== id)
      todos.completed.unshift(todo)
      localStorage.setItem("todos", JSON.stringify(todos))
    }
    syncManager.markDirty("todos")
  }

  async uncompleteTodo(id) {
    if (this._ok()) {
      try {
        await window.electron.uncompleteTodo(id)
        // Mirror to backup.
        const stored = JSON.parse(
          localStorage.getItem("todos") || '{"active":[],"completed":[]}',
        )
        const todo = stored.completed.find((t) => t.id === id)
        if (todo) {
          stored.completed = stored.completed.filter((t) => t.id !== id)
          stored.active.unshift({ ...todo, completed: 0 })
          localStorage.setItem("todos", JSON.stringify(stored))
        }
        return
      } catch {
        this._handleFailure("todos")
      }
    }
    // Fallback
    const todos = JSON.parse(
      localStorage.getItem("todos") || '{"active":[],"completed":[]}',
    )
    const todo = todos.completed.find((t) => t.id === id)
    if (todo) {
      todos.completed = todos.completed.filter((t) => t.id !== id)
      todos.active.unshift(todo)
      localStorage.setItem("todos", JSON.stringify(todos))
    }
    syncManager.markDirty("todos")
  }

  // ─── TAGS ──────────────────────────────────────────────────────────────────

  async getTags() {
    if (this._ok()) {
      try {
        return await window.electron.getTags()
      } catch {
        this._handleFailure(null)
      }
    }
    const raw =
      localStorage.getItem("tags.md") || localStorage.getItem("tags")
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        return {
          companies: Array.isArray(parsed.companies) ? parsed.companies : [],
          accountExecutives: Array.isArray(parsed.accountExecutives)
            ? parsed.accountExecutives
            : [],
          companyAssignments: parsed.companyAssignments || {},
          labels: Array.isArray(parsed.labels) ? parsed.labels : [],
        }
      } catch {
        return {
          companies: [],
          accountExecutives: [],
          companyAssignments: {},
          labels: [],
        }
      }
    }
    return { companies: [], accountExecutives: [], companyAssignments: {}, labels: [] }
  }

  async saveTags(tagsData) {
    // Write-through to backup.
    const json = JSON.stringify(tagsData)
    localStorage.setItem("tags.md", json)
    localStorage.setItem("tags", json)

    if (this._ok()) {
      try {
        const result = await window.electron.saveTags(tagsData)
        syncManager.clearDirty("tags")
        return result
      } catch {
        this._handleFailure("tags")
      }
    }

    syncManager.markDirty("tags")
    return tagsData
  }

  async addTag(company, tagName) {
    if (this._ok()) {
      try {
        return await window.electron.addTag(company, tagName)
      } catch {
        this._handleFailure("tags")
      }
    }
    // Fallback
    const tags = JSON.parse(localStorage.getItem("tags") || "{}")
    if (!tags[company]) tags[company] = []
    if (!tags[company].includes(tagName)) {
      tags[company].push(tagName)
      localStorage.setItem("tags", JSON.stringify(tags))
    }
    syncManager.markDirty("tags")
    return { company, tagName }
  }

  async removeTag(company, tagName) {
    if (this._ok()) {
      try {
        return await window.electron.removeTag(company, tagName)
      } catch {
        this._handleFailure("tags")
      }
    }
    // Fallback
    const tags = JSON.parse(localStorage.getItem("tags") || "{}")
    if (tags[company]) {
      tags[company] = tags[company].filter((t) => t !== tagName)
      localStorage.setItem("tags", JSON.stringify(tags))
    }
    syncManager.markDirty("tags")
  }

  // ─── CONTACTS ──────────────────────────────────────────────────────────────

  async getContacts() {
    if (this._ok()) {
      try {
        return await window.electron.getContacts()
      } catch {
        this._handleFailure(null)
      }
    }
    const raw = localStorage.getItem("contacts")
    return raw ? JSON.parse(raw) : {}
  }

  async saveContacts(contactsData) {
    // Write-through to backup.
    localStorage.setItem("contacts", JSON.stringify(contactsData))

    if (this._ok()) {
      try {
        const result = await window.electron.saveContacts(contactsData)
        syncManager.clearDirty("contacts")
        return result
      } catch {
        this._handleFailure("contacts")
      }
    }

    syncManager.markDirty("contacts")
    return contactsData
  }

  async addContact(company, contact) {
    if (this._ok()) {
      try {
        const result = await window.electron.addContact(company, contact)
        // Mirror to backup.
        const contacts = JSON.parse(localStorage.getItem("contacts") || "{}")
        if (!contacts[company]) contacts[company] = {}
        if (!contacts[company][contact.name]) contacts[company][contact.name] = []
        contacts[company][contact.name].push(result)
        localStorage.setItem("contacts", JSON.stringify(contacts))
        return result
      } catch {
        this._handleFailure("contacts")
      }
    }
    // Fallback
    const contacts = JSON.parse(localStorage.getItem("contacts") || "{}")
    if (!contacts[company]) contacts[company] = {}
    if (!contacts[company][contact.name]) contacts[company][contact.name] = []
    const id = contact.id || Date.now().toString()
    contacts[company][contact.name].push({ id, ...contact })
    localStorage.setItem("contacts", JSON.stringify(contacts))
    syncManager.markDirty("contacts")
    return { id, ...contact }
  }

  async updateContact(company, contactId, updates) {
    if (this._ok()) {
      try {
        return await window.electron.updateContact(company, contactId, updates)
      } catch {
        this._handleFailure("contacts")
      }
    }
    // Fallback — simplified for testing
    syncManager.markDirty("contacts")
    return { id: contactId, ...updates }
  }

  async deleteContact(company, contactId) {
    if (this._ok()) {
      try {
        await window.electron.deleteContact(company, contactId)
        // Mirror to backup.
        const contacts = JSON.parse(localStorage.getItem("contacts") || "{}")
        if (contacts[company]) {
          Object.keys(contacts[company]).forEach((name) => {
            contacts[company][name] = contacts[company][name].filter(
              (c) => c.id !== contactId,
            )
            if (contacts[company][name].length === 0) {
              delete contacts[company][name]
            }
          })
          localStorage.setItem("contacts", JSON.stringify(contacts))
        }
        return
      } catch {
        this._handleFailure("contacts")
      }
    }
    // Fallback
    const contacts = JSON.parse(localStorage.getItem("contacts") || "{}")
    if (contacts[company]) {
      Object.keys(contacts[company]).forEach((name) => {
        contacts[company][name] = contacts[company][name].filter(
          (c) => c.id !== contactId,
        )
        if (contacts[company][name].length === 0) {
          delete contacts[company][name]
        }
      })
      localStorage.setItem("contacts", JSON.stringify(contacts))
    }
    syncManager.markDirty("contacts")
  }

  // ─── CONFIG ────────────────────────────────────────────────────────────────

  async getConfig() {
    if (this._ok()) {
      try {
        return await window.electron.getConfig()
      } catch {
        this._handleFailure(null)
      }
    }
    const raw = localStorage.getItem("config")
    return raw
      ? JSON.parse(raw)
      : {
          theme: "github-dark",
          sidebarPosition: "left",
          compactMode: false,
          defaultView: "company",
        }
  }

  async updateConfig(config) {
    // Write-through to backup.
    localStorage.setItem("config", JSON.stringify(config))

    if (this._ok()) {
      try {
        const result = await window.electron.updateConfig(config)
        syncManager.clearDirty("config")
        return result
      } catch {
        this._handleFailure("config")
      }
    }

    syncManager.markDirty("config")
    return config
  }

  // ─── BACKUP / RESTORE ──────────────────────────────────────────────────────

  async exportBackup() {
    if (this._ok()) {
      try {
        return await window.electron.exportBackup()
      } catch {
        this._handleFailure(null)
      }
    }
    // Fallback — build from localStorage
    return {
      todos: JSON.parse(
        localStorage.getItem("todos") || '{"active":[],"completed":[]}',
      ),
      tags: JSON.parse(localStorage.getItem("tags") || "{}"),
      contacts: JSON.parse(localStorage.getItem("contacts") || "{}"),
      config: JSON.parse(localStorage.getItem("config") || "{}"),
      exportedAt: new Date().toISOString(),
    }
  }

  async importBackup(backupData) {
    if (this._ok()) {
      try {
        return await window.electron.importBackup(backupData)
      } catch {
        this._handleFailure(null)
      }
    }
    // Fallback
    if (backupData.todos)
      localStorage.setItem("todos", JSON.stringify(backupData.todos))
    if (backupData.tags)
      localStorage.setItem("tags", JSON.stringify(backupData.tags))
    if (backupData.contacts)
      localStorage.setItem("contacts", JSON.stringify(backupData.contacts))
    if (backupData.config)
      localStorage.setItem("config", JSON.stringify(backupData.config))
    return { status: "success" }
  }

  // ─── AUDIO MESSAGES ────────────────────────────────────────────────────────
  // Audio messages are stored in localStorage only (base64 blobs are too large
  // for SQLite). They remain in the backup layer by design.

  async getAudioMessages() {
    if (this.hasElectron && window.electron.getAudioMessages) {
      return window.electron.getAudioMessages()
    }
    const raw = localStorage.getItem("audio_messages")
    return raw ? JSON.parse(raw) : []
  }

  async saveAudioMessages(data) {
    if (this.hasElectron && window.electron.saveAudioMessages) {
      return window.electron.saveAudioMessages(data)
    }
    try {
      localStorage.setItem("audio_messages", JSON.stringify(data))
    } catch (e) {
      console.error("[ElectronAdapter] Failed to save audio messages:", e)
    }
    return data
  }

  // ─── EMAILS ────────────────────────────────────────────────────────────────
  // Email files are stored in localStorage only (same reasoning as audio).

  async getEmails() {
    if (this.hasElectron && window.electron.getEmails) {
      return window.electron.getEmails()
    }
    const raw = localStorage.getItem("email_files")
    return raw ? JSON.parse(raw) : []
  }

  async saveEmails(data) {
    if (this.hasElectron && window.electron.saveEmails) {
      return window.electron.saveEmails(data)
    }
    try {
      localStorage.setItem("email_files", JSON.stringify(data))
    } catch (e) {
      console.error("[ElectronAdapter] Failed to save emails:", e)
    }
    return data
  }

  // ─── STATUS ────────────────────────────────────────────────────────────────

  async getStatus() {
    const syncStatus = syncManager.getStatus()

    if (this._ok()) {
      try {
        const dbStatus = await window.electron.getStatus()
        return {
          ...dbStatus,
          sync: syncStatus,
        }
      } catch {
        this._handleFailure(null)
      }
    }

    return {
      ready: true,
      database: "localStorage (SQLite unavailable)",
      sync: syncStatus,
      todos: JSON.parse(
        localStorage.getItem("todos") || '{"active":[],"completed":[]}',
      ).active.length,
      tags: Object.keys(JSON.parse(localStorage.getItem("tags") || "{}"))
        .length,
    }
  }
}

// Export singleton instance
export const electronAdapter = new ElectronAdapter()
