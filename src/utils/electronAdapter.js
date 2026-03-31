/**
 * Electron API Adapter
 * Provides a promise-based interface to Electron IPC for the React app
 * Falls back to localStorage if window.electron is not available (for testing)
 */

class ElectronAdapter {
  constructor() {
    this.hasElectron = typeof window !== "undefined" && window.electron
  }

  // ============ TODOS ============

  async getTodos() {
    if (this.hasElectron) {
      return window.electron.getTodos()
    }
    // Fallback for testing/browser mode
    const todos = localStorage.getItem("todos")
    return todos ? JSON.parse(todos) : { active: [], completed: [] }
  }

  async saveTodos(todosData) {
    // Bulk save todos (for debounced persistence)
    // In Electron, this would need to be implemented in the database
    // For now, we'll leverage the individual operations
    if (this.hasElectron) {
      // Call ipcRenderer directly for bulk save
      return window.electron.saveTodos(todosData)
    }
    // Fallback
    localStorage.setItem("todos", JSON.stringify(todosData))
    return todosData
  }

  async addTodo(todoData) {
    if (this.hasElectron) {
      return window.electron.addTodo(todoData)
    }
    // Fallback
    const existing = JSON.parse(
      localStorage.getItem("todos") || '{"active":[],"completed":[]}',
    )
    const newTodo = { id: Date.now().toString(), ...todoData, completed: 0 }
    existing.active.unshift(newTodo)
    localStorage.setItem("todos", JSON.stringify(existing))
    return newTodo
  }

  async updateTodo(id, updates) {
    if (this.hasElectron) {
      return window.electron.updateTodo(id, updates)
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
    return todo
  }

  async deleteTodo(id) {
    if (this.hasElectron) {
      return window.electron.deleteTodo(id)
    }
    // Fallback
    const todos = JSON.parse(
      localStorage.getItem("todos") || '{"active":[],"completed":[]}',
    )
    todos.active = todos.active.filter((t) => t.id !== id)
    todos.completed = todos.completed.filter((t) => t.id !== id)
    localStorage.setItem("todos", JSON.stringify(todos))
  }

  async completeTodo(id) {
    if (this.hasElectron) {
      return window.electron.completeTodo(id)
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
  }

  async uncompleteTodo(id) {
    if (this.hasElectron) {
      return window.electron.uncompleteTodo(id)
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
  }

  // ============ TAGS ============

  async getTags() {
    if (this.hasElectron) {
      return window.electron.getTags()
    }
    // Check both keys for backwards compatibility
    const tags =
      localStorage.getItem("tags.md") || localStorage.getItem("tags")
    if (tags) {
      try {
        const parsed = JSON.parse(tags)
        return {
          companies: Array.isArray(parsed.companies) ? parsed.companies : [],
          accountExecutives: Array.isArray(parsed.accountExecutives)
            ? parsed.accountExecutives
            : [],
          companyAssignments: parsed.companyAssignments || {},
          labels: Array.isArray(parsed.labels) ? parsed.labels : [],
        }
      } catch {
        return { companies: [], accountExecutives: [], companyAssignments: {}, labels: [] }
      }
    }
    return { companies: [], accountExecutives: [], companyAssignments: {}, labels: [] }
  }

  async saveTags(tagsData) {
    // Bulk save tags (for debounced persistence)
    if (this.hasElectron) {
      return window.electron.saveTags(tagsData)
    }
    // Fallback - save to both keys for consistency
    const json = JSON.stringify(tagsData)
    localStorage.setItem("tags.md", json)
    localStorage.setItem("tags", json)
    return tagsData
  }

  async addTag(company, tagName) {
    if (this.hasElectron) {
      return window.electron.addTag(company, tagName)
    }
    // Fallback
    const tags = JSON.parse(localStorage.getItem("tags") || "{}")
    if (!tags[company]) {
      tags[company] = []
    }
    if (!tags[company].includes(tagName)) {
      tags[company].push(tagName)
      localStorage.setItem("tags", JSON.stringify(tags))
    }
    return { company, tagName }
  }

  async removeTag(company, tagName) {
    if (this.hasElectron) {
      return window.electron.removeTag(company, tagName)
    }
    // Fallback
    const tags = JSON.parse(localStorage.getItem("tags") || "{}")
    if (tags[company]) {
      tags[company] = tags[company].filter((t) => t !== tagName)
      localStorage.setItem("tags", JSON.stringify(tags))
    }
  }

  // ============ CONTACTS ============

  async getContacts() {
    if (this.hasElectron) {
      return window.electron.getContacts()
    }
    const contacts = localStorage.getItem("contacts")
    return contacts ? JSON.parse(contacts) : {}
  }

  async saveContacts(contactsData) {
    // Bulk save contacts (for debounced persistence)
    if (this.hasElectron) {
      return window.electron.saveContacts(contactsData)
    }
    // Fallback
    localStorage.setItem("contacts", JSON.stringify(contactsData))
    return contactsData
  }

  async addContact(company, contact) {
    if (this.hasElectron) {
      return window.electron.addContact(company, contact)
    }
    // Fallback
    const contacts = JSON.parse(localStorage.getItem("contacts") || "{}")
    if (!contacts[company]) {
      contacts[company] = {}
    }
    if (!contacts[company][contact.name]) {
      contacts[company][contact.name] = []
    }
    const id = contact.id || Date.now().toString()
    contacts[company][contact.name].push({ id, ...contact })
    localStorage.setItem("contacts", JSON.stringify(contacts))
    return { id, ...contact }
  }

  async updateContact(company, contactId, updates) {
    if (this.hasElectron) {
      return window.electron.updateContact(company, contactId, updates)
    }
    // Fallback - simplified for testing
    return { id: contactId, ...updates }
  }

  async deleteContact(company, contactId) {
    if (this.hasElectron) {
      return window.electron.deleteContact(company, contactId)
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
  }

  // ============ CONFIG ============

  async getConfig() {
    if (this.hasElectron) {
      return window.electron.getConfig()
    }
    const config = localStorage.getItem("config")
    return config
      ? JSON.parse(config)
      : {
          theme: "default",
          sidebarPosition: "left",
          compactMode: false,
          defaultView: "company",
        }
  }

  async updateConfig(config) {
    if (this.hasElectron) {
      return window.electron.updateConfig(config)
    }
    localStorage.setItem("config", JSON.stringify(config))
    return config
  }

  // ============ BACKUP/RESTORE ============

  async exportBackup() {
    if (this.hasElectron) {
      return window.electron.exportBackup()
    }
    // Fallback
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
    if (this.hasElectron) {
      return window.electron.importBackup(backupData)
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

  // ============ STATUS ============

  async getStatus() {
    if (this.hasElectron) {
      return window.electron.getStatus()
    }
    // Fallback for testing
    return {
      ready: true,
      database: "localStorage",
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
