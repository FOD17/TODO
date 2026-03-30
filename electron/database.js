const Database = require("better-sqlite3")
const path = require("path")
const fs = require("fs")

class DBManager {
  constructor(dataDir) {
    this.dataDir = dataDir
    this.dbPath = path.join(dataDir, "todos.db")

    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true })
    }

    this.db = new Database(this.dbPath)

    // Enable foreign keys and WAL mode for better concurrency
    this.db.pragma("journal_mode = WAL")
    this.db.pragma("foreign_keys = ON")

    // Initialize tables if they don't exist
    this.initializeTables()
  }

  initializeTables() {
    const createTodosTable = `
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        date TEXT NOT NULL,
        company TEXT,
        names TEXT,
        accountRep TEXT,
        completed INTEGER DEFAULT 0,
        description TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `

    const createTagsTable = `
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        company TEXT NOT NULL,
        tagName TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company, tagName)
      )
    `

    const createContactsTable = `
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        company TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT,
        email TEXT,
        phone TEXT,
        notes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `

    const createConfigTable = `
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `

    this.db.exec(createTodosTable)
    this.db.exec(createTagsTable)
    this.db.exec(createContactsTable)
    this.db.exec(createConfigTable)

    // Add description column if it doesn't exist (migration for existing databases)
    try {
      this.db.exec("ALTER TABLE todos ADD COLUMN description TEXT")
    } catch (e) {
      // Column already exists, no problem
    }
  }

  // ============ TODOS ============

  getTodos() {
    const todos = this.db
      .prepare("SELECT * FROM todos WHERE completed = 0 ORDER BY date DESC")
      .all()
    const completed = this.db
      .prepare("SELECT * FROM todos WHERE completed = 1 ORDER BY date DESC")
      .all()

    return {
      active: todos,
      completed: completed,
    }
  }

  saveTodos(todosData) {
    // Bulk save todos - delete all and reinsert
    this.db.exec("DELETE FROM todos")

    const insertTodo = this.db.prepare(`
      INSERT INTO todos (id, message, date, company, names, accountRep, completed, description, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const now = new Date().toISOString()

    if (todosData.active && Array.isArray(todosData.active)) {
      todosData.active.forEach((todo) => {
        insertTodo.run(
          todo.id,
          todo.message,
          todo.date,
          todo.company,
          todo.names,
          todo.accountRep,
          0,
          todo.description || "",
          todo.createdAt || now,
          todo.updatedAt || now,
        )
      })
    }

    if (todosData.completed && Array.isArray(todosData.completed)) {
      todosData.completed.forEach((todo) => {
        insertTodo.run(
          todo.id,
          todo.message,
          todo.date,
          todo.company,
          todo.names,
          todo.accountRep,
          1,
          todo.description || "",
          todo.createdAt || now,
          todo.updatedAt || now,
        )
      })
    }

    return todosData
  }

  addTodo(todoData) {
    const id = todoData.id || Date.now().toString()
    const stmt = this.db.prepare(`
      INSERT INTO todos (id, message, date, company, names, accountRep, completed)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `)

    stmt.run(
      id,
      todoData.message,
      todoData.date,
      todoData.company,
      todoData.names,
      todoData.accountRep,
    )

    return { id, ...todoData, completed: 0 }
  }

  updateTodo(id, updates) {
    const allowedFields = ["message", "date", "company", "names", "accountRep"]
    const fields = Object.keys(updates).filter((k) => allowedFields.includes(k))

    if (fields.length === 0) {
      return this.db.prepare("SELECT * FROM todos WHERE id = ?").get(id)
    }

    const setClause = fields.map((f) => `${f} = ?`).join(", ")
    const values = fields.map((f) => updates[f])
    values.push(id)

    this.db
      .prepare(
        `UPDATE todos SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .run(...values)

    return this.db.prepare("SELECT * FROM todos WHERE id = ?").get(id)
  }

  deleteTodo(id) {
    this.db.prepare("DELETE FROM todos WHERE id = ?").run(id)
  }

  completeTodo(id) {
    this.db
      .prepare(
        "UPDATE todos SET completed = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .run(id)
  }

  uncompleteTodo(id) {
    this.db
      .prepare(
        "UPDATE todos SET completed = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .run(id)
  }

  // ============ TAGS ============

  getTags() {
    const rows = this.db
      .prepare("SELECT company, tagName FROM tags ORDER BY company, tagName")
      .all()

    const tags = {}
    rows.forEach((row) => {
      if (!tags[row.company]) {
        tags[row.company] = []
      }
      tags[row.company].push(row.tagName)
    })

    return tags
  }

  saveTags(tagsData) {
    // Bulk save tags - delete all and reinsert
    this.db.exec("DELETE FROM tags")

    const insertTag = this.db.prepare(`
      INSERT INTO tags (id, company, tagName, createdAt)
      VALUES (?, ?, ?, ?)
    `)

    const now = new Date().toISOString()

    Object.entries(tagsData).forEach(([company, tagNames]) => {
      if (Array.isArray(tagNames)) {
        tagNames.forEach((tagName) => {
          const id = `tag-${Date.now()}-${Math.random()}`
          insertTag.run(id, company, tagName, now)
        })
      }
    })

    return tagsData
  }

  addTag(company, tagName) {
    const id = `tag-${Date.now()}-${Math.random()}`
    try {
      this.db
        .prepare("INSERT INTO tags (id, company, tagName) VALUES (?, ?, ?)")
        .run(id, company, tagName)
    } catch (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return { error: "Tag already exists for this company" }
      }
      throw err
    }

    return { id, company, tagName }
  }

  removeTag(company, tagName) {
    this.db
      .prepare("DELETE FROM tags WHERE company = ? AND tagName = ?")
      .run(company, tagName)
  }

  // ============ CONTACTS ============

  getContacts() {
    const rows = this.db
      .prepare("SELECT * FROM contacts ORDER BY company, name")
      .all()

    const contacts = {}
    rows.forEach((row) => {
      if (!contacts[row.company]) {
        contacts[row.company] = {}
      }
      if (!contacts[row.company][row.name]) {
        contacts[row.company][row.name] = []
      }

      const { company, name, ...contact } = row
      contacts[row.company][row.name].push(contact)
    })

    return contacts
  }

  saveContacts(contactsData) {
    // Bulk save contacts - delete all and reinsert
    this.db.exec("DELETE FROM contacts")

    const insertContact = this.db.prepare(`
      INSERT INTO contacts (id, company, name, type, email, phone, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const now = new Date().toISOString()

    // Handle both old and new contact structure
    if (contactsData.companies) {
      // New structure: { companies: { company: { contacts: [...] } } }
      Object.entries(contactsData.companies).forEach(
        ([company, companyData]) => {
          if (companyData.contacts && Array.isArray(companyData.contacts)) {
            companyData.contacts.forEach((contact) => {
              insertContact.run(
                contact.id || `contact-${Date.now()}`,
                company,
                contact.name,
                contact.type || "person",
                contact.email || "",
                contact.phone || "",
                contact.notes || "",
                contact.createdAt || now,
                contact.updatedAt || now,
              )
            })
          }
        },
      )
    } else {
      // Old structure: { company: { name: [...] } }
      Object.entries(contactsData).forEach(([company, names]) => {
        if (typeof names === "object" && !Array.isArray(names)) {
          Object.entries(names).forEach(([name, contacts]) => {
            if (Array.isArray(contacts)) {
              contacts.forEach((contact) => {
                insertContact.run(
                  contact.id || `contact-${Date.now()}`,
                  company,
                  name,
                  contact.type || "person",
                  contact.email || "",
                  contact.phone || "",
                  contact.notes || "",
                  contact.createdAt || now,
                  contact.updatedAt || now,
                )
              })
            }
          })
        }
      })
    }

    return contactsData
  }

  addContact(company, contact) {
    const id = contact.id || `contact-${Date.now()}`
    this.db
      .prepare(
        `
        INSERT INTO contacts (id, company, name, type, email, phone, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        id,
        company,
        contact.name,
        contact.type || "person",
        contact.email || "",
        contact.phone || "",
        contact.notes || "",
      )

    return { id, ...contact }
  }

  updateContact(company, contactId, updates) {
    const allowedFields = ["name", "type", "email", "phone", "notes"]
    const fields = Object.keys(updates).filter((k) => allowedFields.includes(k))

    if (fields.length === 0) {
      return this.db
        .prepare("SELECT * FROM contacts WHERE id = ?")
        .get(contactId)
    }

    const setClause = fields.map((f) => `${f} = ?`).join(", ")
    const values = fields.map((f) => updates[f])
    values.push(contactId)

    this.db
      .prepare(
        `UPDATE contacts SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .run(...values)

    return this.db.prepare("SELECT * FROM contacts WHERE id = ?").get(contactId)
  }

  deleteContact(company, contactId) {
    this.db
      .prepare("DELETE FROM contacts WHERE id = ? AND company = ?")
      .run(contactId, company)
  }

  // ============ CONFIG ============

  getConfig() {
    const rows = this.db.prepare("SELECT key, value FROM config").all()
    const config = {}

    rows.forEach((row) => {
      try {
        config[row.key] = JSON.parse(row.value)
      } catch {
        config[row.key] = row.value
      }
    })

    return config
  }

  updateConfig(config) {
    Object.entries(config).forEach(([key, value]) => {
      const jsonValue =
        typeof value === "string" ? value : JSON.stringify(value)
      const existing = this.db
        .prepare("SELECT key FROM config WHERE key = ?")
        .get(key)

      if (existing) {
        this.db
          .prepare(
            "UPDATE config SET value = ?, updatedAt = CURRENT_TIMESTAMP WHERE key = ?",
          )
          .run(jsonValue, key)
      } else {
        this.db
          .prepare("INSERT INTO config (key, value) VALUES (?, ?)")
          .run(key, jsonValue)
      }
    })

    return this.getConfig()
  }

  // ============ BACKUP/RESTORE ============

  exportBackup() {
    const todos = this.db.prepare("SELECT * FROM todos").all()
    const tags = this.db.prepare("SELECT * FROM tags").all()
    const contacts = this.db.prepare("SELECT * FROM contacts").all()
    const config = this.getConfig()

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      todos,
      tags,
      contacts,
      config,
    }
  }

  importBackup(backupData) {
    // Clear existing data
    this.db.exec("DELETE FROM todos")
    this.db.exec("DELETE FROM tags")
    this.db.exec("DELETE FROM contacts")
    this.db.exec("DELETE FROM config")

    // Import todos
    if (backupData.todos && Array.isArray(backupData.todos)) {
      const insertTodo = this.db.prepare(`
        INSERT INTO todos (id, message, date, company, names, accountRep, completed, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      backupData.todos.forEach((todo) => {
        insertTodo.run(
          todo.id,
          todo.message,
          todo.date,
          todo.company,
          todo.names,
          todo.accountRep,
          todo.completed || 0,
          todo.createdAt || new Date().toISOString(),
          todo.updatedAt || new Date().toISOString(),
        )
      })
    }

    // Import tags
    if (backupData.tags && Array.isArray(backupData.tags)) {
      const insertTag = this.db.prepare(`
        INSERT INTO tags (id, company, tagName, createdAt)
        VALUES (?, ?, ?, ?)
      `)

      backupData.tags.forEach((tag) => {
        insertTag.run(
          tag.id,
          tag.company,
          tag.tagName,
          tag.createdAt || new Date().toISOString(),
        )
      })
    }

    // Import contacts
    if (backupData.contacts && Array.isArray(backupData.contacts)) {
      const insertContact = this.db.prepare(`
        INSERT INTO contacts (id, company, name, type, email, phone, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      backupData.contacts.forEach((contact) => {
        insertContact.run(
          contact.id,
          contact.company,
          contact.name,
          contact.type || "person",
          contact.email || "",
          contact.phone || "",
          contact.notes || "",
          contact.createdAt || new Date().toISOString(),
          contact.updatedAt || new Date().toISOString(),
        )
      })
    }

    // Import config
    if (backupData.config && typeof backupData.config === "object") {
      this.updateConfig(backupData.config)
    }

    return { status: "success", message: "Backup imported successfully" }
  }

  // ============ STATUS ============

  getStatus() {
    const todoCount = this.db
      .prepare("SELECT COUNT(*) as count FROM todos")
      .get()
    const tagCount = this.db.prepare("SELECT COUNT(*) as count FROM tags").get()
    const contactCount = this.db
      .prepare("SELECT COUNT(*) as count FROM contacts")
      .get()

    const stats = fs.statSync(this.dbPath)

    return {
      database: "SQLite",
      path: this.dbPath,
      size: stats.size,
      sizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
      todos: todoCount.count,
      tags: tagCount.count,
      contacts: contactCount.count,
      lastModified: stats.mtime.toISOString(),
    }
  }

  // ============ MAINTENANCE ============

  close() {
    this.db.close()
  }

  vacuum() {
    this.db.exec("VACUUM")
  }
}

module.exports = DBManager
