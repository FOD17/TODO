/**
 * Multi-layer Persistence System
 * Uses localStorage + IndexedDB + periodic snapshots for maximum data safety
 */

const DB_NAME = "TodoTrackerDB"
const DB_VERSION = 1
const STORE_NAME = "data"

class PersistenceManager {
  constructor() {
    this.db = null
    this.localStorageAvailable = this.checkLocalStorage()
    this.indexedDBAvailable = false
    this.initIndexedDB()
  }

  checkLocalStorage() {
    try {
      const test = "__localStorage_test__"
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      console.warn(
        "⚠️ localStorage is not available (private mode or disabled)",
      )
      return false
    }
  }

  initIndexedDB() {
    if (!window.indexedDB) {
      console.warn("⚠️ IndexedDB is not available")
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.warn("⚠️ IndexedDB open failed")
    }

    request.onsuccess = (event) => {
      this.db = event.target.result
      this.indexedDBAvailable = true
      console.log("✓ IndexedDB initialized")
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  }

  // Save to localStorage
  saveToLocalStorage(key, value) {
    if (!this.localStorageAvailable) return false
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (e) {
      console.error(`Failed to save ${key} to localStorage:`, e)
      return false
    }
  }

  // Load from localStorage
  loadFromLocalStorage(key) {
    if (!this.localStorageAvailable) return null
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (e) {
      console.error(`Failed to load ${key} from localStorage:`, e)
      return null
    }
  }

  // Save to IndexedDB (fallback)
  saveToIndexedDB(key, value) {
    if (!this.db) return Promise.reject("IndexedDB not ready")

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(value, key)

      request.onsuccess = () => {
        resolve(true)
      }
      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  // Load from IndexedDB (fallback)
  loadFromIndexedDB(key) {
    if (!this.db) return Promise.reject("IndexedDB not ready")

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], "readonly")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(key)

      request.onsuccess = () => {
        resolve(request.result || null)
      }
      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  // Unified save with fallback
  async save(key, value) {
    const savedToLocalStorage = this.saveToLocalStorage(key, value)

    if (this.db) {
      try {
        await this.saveToIndexedDB(key, value)
      } catch (e) {
        console.warn(`Failed to save ${key} to IndexedDB:`, e)
      }
    }

    if (!savedToLocalStorage && !this.db) {
      console.warn(`⚠️ Data for ${key} could not be persisted!`)
    }

    return savedToLocalStorage || !!this.db
  }

  // Unified load with fallback
  async load(key) {
    let value = this.loadFromLocalStorage(key)

    if (!value && this.db) {
      try {
        value = await this.loadFromIndexedDB(key)
      } catch (e) {
        console.warn(`Failed to load ${key} from IndexedDB:`, e)
      }
    }

    return value
  }

  // Create a backup snapshot with timestamp
  createSnapshot(data) {
    const timestamp = new Date().toISOString()
    const snapshot = {
      timestamp,
      todos: data.todos,
      tags: data.tags,
      contacts: data.contacts,
      config: data.config,
    }

    const key = `snapshot_${timestamp.split("T")[0]}_${Date.now()}`
    this.saveToLocalStorage(key, snapshot)
    if (this.db) {
      this.saveToIndexedDB(key, snapshot)
    }

    return key
  }

  // Get all snapshots
  getSnapshots() {
    const snapshots = []

    if (this.localStorageAvailable) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key.startsWith("snapshot_")) {
          const data = this.loadFromLocalStorage(key)
          if (data) {
            snapshots.push({
              key,
              timestamp: data.timestamp,
              todosCount: data.todos?.active?.length || 0,
              tagsCount: Object.keys(data.tags || {}).length,
            })
          }
        }
      }
    }

    return snapshots.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    )
  }

  // Export all data as JSON
  exportAllData(todos, tags, contacts, config) {
    const allData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      todos,
      tags,
      contacts,
      config,
    }

    const element = document.createElement("a")
    element.setAttribute(
      "href",
      "data:application/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(allData, null, 2)),
    )
    element.setAttribute(
      "download",
      `todo-tracker-backup-${new Date().toISOString().split("T")[0]}.json`,
    )
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  // Import data from JSON backup
  async importData(jsonString) {
    try {
      const data = JSON.parse(jsonString)

      if (!data.todos || !data.tags || !data.contacts || !data.config) {
        throw new Error("Invalid backup format")
      }

      await this.save("todos.md", data.todos)
      await this.save("tags.md", data.tags)
      await this.save("contacts.json", data.contacts)
      await this.save("config.json", data.config)

      return { success: true, message: "Data imported successfully" }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }

  // Clear all app data
  clearAllData() {
    const keysToKeep = []
    const keysToClear = ["todos.md", "tags.md", "contacts.json", "config.json"]

    if (this.localStorageAvailable) {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (keysToClear.includes(key) || key.startsWith("snapshot_")) {
          localStorage.removeItem(key)
        }
      }
    }

    if (this.db) {
      const transaction = this.db.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      store.clear()
    }
  }

  // Get storage status
  getStatus() {
    return {
      localStorageAvailable: this.localStorageAvailable,
      indexedDBAvailable: this.indexedDBAvailable,
      storageType: this.localStorageAvailable
        ? this.indexedDBAvailable
          ? "localStorage + IndexedDB"
          : "localStorage only"
        : this.indexedDBAvailable
          ? "IndexedDB only"
          : "Memory only (NO PERSISTENCE)",
    }
  }
}

export const persistence = new PersistenceManager()
