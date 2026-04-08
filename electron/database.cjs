const { Client } = require("pg")

class DBManager {
  constructor(connectionString) {
    this.connectionString = connectionString || process.env.DATABASE_URL || "postgresql://localhost:5432/postgres"
    this.client = null
  }

  async connect() {
    if (this.client) return

    this.client = new Client({
      connectionString: this.connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })

    await this.client.connect()
    await this.initializeTables()
  }

  async initializeTables() {
    const createTodosTable = `
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        date TEXT NOT NULL,
        company TEXT,
        names TEXT,
        accountRep TEXT,
        completed BOOLEAN DEFAULT FALSE,
        description TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    const createTagsTable = `
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        company TEXT NOT NULL,
        tagName TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    const createConfigTable = `
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await this.client.query(createTodosTable)
    await this.client.query(createTagsTable)
    await this.client.query(createContactsTable)
    await this.client.query(createConfigTable)

    // Add description column if it doesn't exist (migration for existing databases)
    try {
      await this.client.query("ALTER TABLE todos ADD COLUMN IF NOT EXISTS description TEXT")
    } catch (e) {
      // Column already exists, no problem
    }
  }

  // ============ TODOS ============

  async getTodos() {
    const activeQuery = "SELECT * FROM todos WHERE completed = false ORDER BY date DESC"
    const completedQuery = "SELECT * FROM todos WHERE completed = true ORDER BY date DESC"

    const activeResult = await this.client.query(activeQuery)
    const completedResult = await this.client.query(completedQuery)

    return {
      active: activeResult.rows,
      completed: completedResult.rows,
    }
  }

  async saveTodos(todosData) {
    await this.client.query("DELETE FROM todos")

    const insertQuery = `
      INSERT INTO todos (id, message, date, company, names, accountRep, completed, description, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `

    const now = new Date().toISOString()

    if (todosData.active && Array.isArray(todosData.active)) {
      for (const todo of todosData.active) {
        await this.client.query(insertQuery, [
          todo.id,
          todo.message,
          todo.date,
          todo.company,
          todo.names,
          todo.accountRep,
          false,
          todo.description || "",
          todo.createdAt || now,
          todo.updatedAt || now,
        ])
      }
    }

    if (todosData.completed && Array.isArray(todosData.completed)) {
      for (const todo of todosData.completed) {
        await this.client.query(insertQuery, [
          todo.id,
          todo.message,
          todo.date,
          todo.company,
          todo.names,
          todo.accountRep,
          true,
          todo.description || "",
          todo.createdAt || now,
          todo.updatedAt || now,
        ])
      }
    }

    return todosData
  }

  async addTodo(todoData) {
    const id = todoData.id || Date.now().toString()
    const query = `
      INSERT INTO todos (id, message, date, company, names, accountRep, completed)
      VALUES ($1, $2, $3, $4, $5, $6, false)
    `

    await this.client.query(query, [
      id,
      todoData.message,
      todoData.date,
      todoData.company,
      todoData.names,
      todoData.accountRep,
    ])

    return { id, ...todoData, completed: false }
  }

  async updateTodo(id, updates) {
    const allowedFields = ["message", "date", "company", "names", "accountRep"]
    const fields = Object.keys(updates).filter((k) => allowedFields.includes(k))

    if (fields.length === 0) {
      const result = await this.client.query("SELECT * FROM todos WHERE id = $1", [id])
      return result.rows[0]
    }

    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(", ")
    const values = fields.map((f) => updates[f])
    values.push(id)

    await this.client.query(
      `UPDATE todos SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = $${values.length}`,
      values
    )

    const result = await this.client.query("SELECT * FROM todos WHERE id = $1", [id])
    return result.rows[0]
  }

  async deleteTodo(id) {
    await this.client.query("DELETE FROM todos WHERE id = $1", [id])
  }

  async completeTodo(id) {
    await this.client.query(
      "UPDATE todos SET completed = true, updatedAt = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    )
  }

  async uncompleteTodo(id) {
    await this.client.query(
      "UPDATE todos SET completed = false, updatedAt = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    )
  }

  // ============ TAGS ============

  async getTags() {
    const result = await this.client.query("SELECT company, tagName FROM tags ORDER BY company, tagName")
    const rows = result.rows

    const tags = {}
    rows.forEach((row) => {
      if (!tags[row.company]) {
        tags[row.company] = []
      }
      tags[row.company].push(row.tagName)
    })

    return tags
  }

  async saveTags(tagsData) {
    await this.client.query("DELETE FROM tags")

    const insertQuery = `
      INSERT INTO tags (id, company, tagName, createdAt)
      VALUES ($1, $2, $3, $4)
    `

    const now = new Date().toISOString()

    for (const [company, tagNames] of Object.entries(tagsData)) {
      if (Array.isArray(tagNames)) {
        for (const tagName of tagNames) {
          const id = `tag-${Date.now()}-${Math.random()}`
          await this.client.query(insertQuery, [id, company, tagName, now])
        }
      }
    }

    return tagsData
  }

  async addTag(company, tagName) {
    const id = `tag-${Date.now()}-${Math.random()}`
    try {
      await this.client.query("INSERT INTO tags (id, company, tagName) VALUES ($1, $2, $3)", [id, company, tagName])
    } catch (err) {
      if (err.message.includes("duplicate key value")) {
        return { error: "Tag already exists for this company" }
      }
      throw err
    }

    return { id, company, tagName }
  }

  async removeTag(company, tagName) {
    await this.client.query("DELETE FROM tags WHERE company = $1 AND tagName = $2", [company, tagName])
  }

  // ============ CONTACTS ============

  async getContacts() {
    const result = await this.client.query("SELECT * FROM contacts ORDER BY company, name")
    const rows = result.rows

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

  async saveContacts(contactsData) {
    await this.client.query("DELETE FROM contacts")

    const insertQuery = `
      INSERT INTO contacts (id, company, name, type, email, phone, notes, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `

    const now = new Date().toISOString()

    if (contactsData.companies) {
      // New structure: { companies: { company: { contacts: [...] } } }
      for (const [company, companyData] of Object.entries(contactsData.companies)) {
        if (companyData.contacts && Array.isArray(companyData.contacts)) {
          for (const contact of companyData.contacts) {
            await this.client.query(insertQuery, [
              contact.id || `contact-${Date.now()}`,
              company,
              contact.name,
              contact.type || "person",
              contact.email || "",
              contact.phone || "",
              contact.notes || "",
              contact.createdAt || now,
              contact.updatedAt || now,
            ])
          }
        }
      }
    } else {
      // Old structure: { company: { name: [...] } }
      for (const [company, names] of Object.entries(contactsData)) {
        if (typeof names === "object" && !Array.isArray(names)) {
          for (const [name, contacts] of Object.entries(names)) {
            if (Array.isArray(contacts)) {
              for (const contact of contacts) {
                await this.client.query(insertQuery, [
                  contact.id || `contact-${Date.now()}`,
                  company,
                  name,
                  contact.type || "person",
                  contact.email || "",
                  contact.phone || "",
                  contact.notes || "",
                  contact.createdAt || now,
                  contact.updatedAt || now,
                ])
              }
            }
          }
        }
      }
    }

    return contactsData
  }

  async addContact(company, contact) {
    const id = contact.id || `contact-${Date.now()}`
    const query = `
      INSERT INTO contacts (id, company, name, type, email, phone, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `

    await this.client.query(query, [
      id,
      company,
      contact.name,
      contact.type || "person",
      contact.email || "",
      contact.phone || "",
      contact.notes || "",
    ])

    return { id, ...contact }
  }

  async updateContact(company, contactId, updates) {
    const allowedFields = ["name", "type", "email", "phone", "notes"]
    const fields = Object.keys(updates).filter((k) => allowedFields.includes(k))

    if (fields.length === 0) {
      const result = await this.client.query("SELECT * FROM contacts WHERE id = $1", [contactId])
      return result.rows[0]
    }

    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(", ")
    const values = fields.map((f) => updates[f])
    values.push(contactId)

    await this.client.query(
      `UPDATE contacts SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = $${values.length}`,
      values
    )

    const result = await this.client.query("SELECT * FROM contacts WHERE id = $1", [contactId])
    return result.rows[0]
  }

  async deleteContact(company, contactId) {
    await this.client.query("DELETE FROM contacts WHERE id = $1 AND company = $2", [contactId, company])
  }

  // ============ CONFIG ============

  async getConfig() {
    const result = await this.client.query("SELECT key, value FROM config")
    const rows = result.rows
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

  async updateConfig(config) {
    for (const [key, value] of Object.entries(config)) {
      const jsonValue = typeof value === "string" ? value : JSON.stringify(value)
      const existingResult = await this.client.query("SELECT key FROM config WHERE key = $1", [key])

      if (existingResult.rows.length > 0) {
        await this.client.query(
          "UPDATE config SET value = $1, updatedAt = CURRENT_TIMESTAMP WHERE key = $2",
          [jsonValue, key]
        )
      } else {
        await this.client.query("INSERT INTO config (key, value) VALUES ($1, $2)", [key, jsonValue])
      }
    }

    return this.getConfig()
  }

  // ============ BACKUP/RESTORE ============

  async exportBackup() {
    const todosResult = await this.client.query("SELECT * FROM todos")
    const tagsResult = await this.client.query("SELECT * FROM tags")
    const contactsResult = await this.client.query("SELECT * FROM contacts")
    const config = await this.getConfig()

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      todos: todosResult.rows,
      tags: tagsResult.rows,
      contacts: contactsResult.rows,
      config,
    }
  }

  async importBackup(backupData) {
    await this.client.query("DELETE FROM todos")
    await this.client.query("DELETE FROM tags")
    await this.client.query("DELETE FROM contacts")
    await this.client.query("DELETE FROM config")

    if (backupData.todos && Array.isArray(backupData.todos)) {
      const insertQuery = `
        INSERT INTO todos (id, message, date, company, names, accountRep, completed, createdAt, updatedAt)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `

      for (const todo of backupData.todos) {
        await this.client.query(insertQuery, [
          todo.id,
          todo.message,
          todo.date,
          todo.company,
          todo.names,
          todo.accountRep,
          todo.completed || false,
          todo.createdAt || new Date().toISOString(),
          todo.updatedAt || new Date().toISOString(),
        ])
      }
    }

    if (backupData.tags && Array.isArray(backupData.tags)) {
      const insertQuery = `
        INSERT INTO tags (id, company, tagName, createdAt)
        VALUES ($1, $2, $3, $4)
      `

      for (const tag of backupData.tags) {
        await this.client.query(insertQuery, [
          tag.id,
          tag.company,
          tag.tagName,
          tag.createdAt || new Date().toISOString(),
        ])
      }
    }

    if (backupData.contacts && Array.isArray(backupData.contacts)) {
      const insertQuery = `
        INSERT INTO contacts (id, company, name, type, email, phone, notes, createdAt, updatedAt)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `

      for (const contact of backupData.contacts) {
        await this.client.query(insertQuery, [
          contact.id,
          contact.company,
          contact.name,
          contact.type || "person",
          contact.email || "",
          contact.phone || "",
          contact.notes || "",
          contact.createdAt || new Date().toISOString(),
          contact.updatedAt || new Date().toISOString(),
        ])
      }
    }

    if (backupData.config && typeof backupData.config === "object") {
      await this.updateConfig(backupData.config)
    }

    return { status: "success", message: "Backup imported successfully" }
  }

  // ============ STATUS ============

  async getStatus() {
    const todoResult = await this.client.query("SELECT COUNT(*) as count FROM todos")
    const tagResult = await this.client.query("SELECT COUNT(*) as count FROM tags")
    const contactResult = await this.client.query("SELECT COUNT(*) as count FROM contacts")

    return {
      database: "PostgreSQL",
      connectionString: this.connectionString.replace(/:[^:]*@/, ':***@'),
      todos: parseInt(todoResult.rows[0].count),
      tags: parseInt(tagResult.rows[0].count),
      contacts: parseInt(contactResult.rows[0].count),
      lastChecked: new Date().toISOString(),
    }
  }

  // ============ HEALTH CHECK ============

  async ping() {
    await this.client.query("SELECT 1")
    return { ok: true, timestamp: Date.now() }
  }

  // ============ MAINTENANCE ============

  async close() {
    if (this.client) {
      await this.client.end()
      this.client = null
    }
  }

  async vacuum() {
    await this.client.query("VACUUM")
  }
}

module.exports = DBManager
