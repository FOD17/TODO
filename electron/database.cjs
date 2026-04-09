const { Client } = require("pg")

const TAG = "[DBManager]"

class DBManager {
  constructor(connectionString) {
    this.connectionString = connectionString || process.env.DATABASE_URL || "postgresql://localhost:5432/postgres"
    this.client = null
  }

  async connect() {
    if (this.client) return

    console.log(`${TAG} Connecting to database...`)
    this.client = new Client({
      connectionString: this.connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })

    await this.client.connect()
    console.log(`${TAG} Connected successfully`)
    await this.initializeTables()
  }

  async initializeTables() {
    console.log(`${TAG} Initializing tables...`)

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

    // Migration: add description column to existing databases
    try {
      await this.client.query("ALTER TABLE todos ADD COLUMN IF NOT EXISTS description TEXT")
    } catch (e) {
      console.warn(`${TAG} description column migration skipped:`, e.message)
    }

    console.log(`${TAG} Tables ready`)
  }

  // ============ TODOS ============

  // PostgreSQL lowercases all unquoted column names, so SELECT * returns
  // accountrep, createdat, updatedat. We alias them back to camelCase here
  // so the rest of the app never needs to know about the DB casing.
  _todoSelect() {
    return `
      SELECT
        id, message, date, company,
        names,
        accountrep   AS "accountRep",
        completed,
        description,
        createdat    AS "createdAt",
        updatedat    AS "updatedAt"
      FROM todos
    `
  }

  // names is stored as TEXT. Normalise it to an array on the way out.
  _normaliseTodo(row) {
    if (!row) return row
    let names = row.names
    if (!names || names === '' || names === '{}') {
      names = []
    } else if (typeof names === 'string') {
      // PostgreSQL may store as "{a,b}" or "a,b"
      names = names.replace(/^\{|\}$/g, '').split(',').map(s => s.trim()).filter(Boolean)
    } else if (!Array.isArray(names)) {
      names = []
    }
    return { ...row, names, subtasks: row.subtasks || [], notes: row.notes || [], labels: row.labels || [] }
  }

  async getTodos() {
    const base = this._todoSelect()
    const activeResult   = await this.client.query(`${base} WHERE completed = false ORDER BY date DESC`)
    const completedResult = await this.client.query(`${base} WHERE completed = true  ORDER BY date DESC`)
    console.log(`${TAG} getTodos: ${activeResult.rows.length} active, ${completedResult.rows.length} completed`)
    return {
      active:    activeResult.rows.map(r => this._normaliseTodo(r)),
      completed: completedResult.rows.map(r => this._normaliseTodo(r)),
    }
  }

  // Serialise names array → comma string for TEXT storage
  _serialiseNames(names) {
    if (!names) return ''
    if (Array.isArray(names)) return names.join(',')
    return String(names)
  }

  async saveTodos(todosData) {
    const active = todosData.active || []
    const completed = todosData.completed || []
    console.log(`${TAG} saveTodos: ${active.length} active, ${completed.length} completed`)

    // Use the actual lowercase column names that exist in the DB
    const insertQuery = `
      INSERT INTO todos (id, message, date, company, names, accountrep, completed, description, createdat, updatedat)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `
    const now = new Date().toISOString()

    await this.client.query("BEGIN")
    try {
      await this.client.query("DELETE FROM todos")
      for (const todo of active) {
        await this.client.query(insertQuery, [
          todo.id, todo.message, todo.date, todo.company,
          this._serialiseNames(todo.names),
          todo.accountRep || todo.accountrep || '',
          false, todo.description || '',
          todo.createdAt || todo.createdat || now,
          todo.updatedAt || todo.updatedat || now,
        ])
      }
      for (const todo of completed) {
        await this.client.query(insertQuery, [
          todo.id, todo.message, todo.date, todo.company,
          this._serialiseNames(todo.names),
          todo.accountRep || todo.accountrep || '',
          true, todo.description || '',
          todo.createdAt || todo.createdat || now,
          todo.updatedAt || todo.updatedat || now,
        ])
      }
      await this.client.query("COMMIT")
    } catch (e) {
      await this.client.query("ROLLBACK")
      console.error(`${TAG} saveTodos transaction rolled back:`, e.message)
      throw e
    }

    return todosData
  }

  async addTodo(todoData) {
    const id = todoData.id || Date.now().toString()
    const query = `
      INSERT INTO todos (id, message, date, company, names, accountrep, completed)
      VALUES ($1, $2, $3, $4, $5, $6, false)
    `
    await this.client.query(query, [
      id, todoData.message, todoData.date, todoData.company,
      this._serialiseNames(todoData.names),
      todoData.accountRep || '',
    ])
    return this._normaliseTodo({ id, ...todoData, completed: false })
  }

  async updateTodo(id, updates) {
    // Map camelCase keys to actual DB column names
    const fieldMap = { message: 'message', date: 'date', company: 'company', names: 'names', accountRep: 'accountrep' }
    const fields = Object.keys(updates).filter((k) => fieldMap[k])

    if (fields.length > 0) {
      const setClause = fields.map((f, i) => `${fieldMap[f]} = $${i + 1}`).join(', ')
      const values = fields.map((f) => f === 'names' ? this._serialiseNames(updates[f]) : updates[f])
      values.push(id)
      await this.client.query(
        `UPDATE todos SET ${setClause}, updatedat = CURRENT_TIMESTAMP WHERE id = $${values.length}`,
        values
      )
    }

    const result = await this.client.query(`${this._todoSelect()} WHERE id = $1`, [id])
    return this._normaliseTodo(result.rows[0])
  }

  async deleteTodo(id) {
    await this.client.query("DELETE FROM todos WHERE id = $1", [id])
  }

  async completeTodo(id) {
    await this.client.query(
      "UPDATE todos SET completed = true, updatedat = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    )
  }

  async uncompleteTodo(id) {
    await this.client.query(
      "UPDATE todos SET completed = false, updatedat = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    )
  }

  // ============ TAGS ============
  // The full tags structure (companies, accountExecutives, labels, companyAssignments,
  // companyTypes) is stored as a single JSON blob in the config table under key "tags_blob".
  // The legacy tags table is kept for backwards compatibility but is no longer the primary store.

  async getTags() {
    const result = await this.client.query(
      "SELECT value FROM config WHERE key = 'tags_blob'"
    )
    if (result.rows.length > 0) {
      try {
        return JSON.parse(result.rows[0].value)
      } catch (err) {
        console.warn(`${TAG} tags_blob JSON is corrupt, rebuilding from legacy table:`, err.message)
      }
    }
    // Fallback: build from legacy tags table (columns are lowercase: tagname, company)
    const rows = (await this.client.query("SELECT company, tagname FROM tags ORDER BY company, tagname")).rows
    const companies = [...new Set(rows.map((r) => r.company).filter(Boolean))]
    console.log(`${TAG} getTags: no tags_blob found, built ${companies.length} companies from legacy tags table`)
    return { companies, accountExecutives: [], companyAssignments: {}, companyTypes: {}, labels: [] }
  }

  async saveTags(tagsData) {
    const json = JSON.stringify(tagsData)
    const existing = await this.client.query("SELECT key FROM config WHERE key = 'tags_blob'")
    if (existing.rows.length > 0) {
      await this.client.query(
        "UPDATE config SET value = $1, updatedat = CURRENT_TIMESTAMP WHERE key = 'tags_blob'",
        [json]
      )
    } else {
      await this.client.query(
        "INSERT INTO config (key, value) VALUES ('tags_blob', $1)",
        [json]
      )
    }
    return tagsData
  }

  async addTag(company, tagName) {
    const tags = await this.getTags()
    if (!tags.companies.includes(company)) tags.companies.push(company)
    await this.saveTags(tags)
    return { company, tagName }
  }

  async removeTag(company, tagName) {
    const tags = await this.getTags()
    await this.saveTags(tags)
  }

  // ============ CONTACTS ============

  async getContacts() {
    // Alias timestamp columns back to camelCase
    const result = await this.client.query(`
      SELECT id, company, name, type, email, phone, notes,
             createdat AS "createdAt", updatedat AS "updatedAt"
      FROM contacts ORDER BY company, name
    `)

    const contacts = {}
    result.rows.forEach((row) => {
      if (!contacts[row.company]) contacts[row.company] = {}
      if (!contacts[row.company][row.name]) contacts[row.company][row.name] = []
      const { company, name, ...contact } = row
      contacts[row.company][row.name].push(contact)
    })

    return contacts
  }

  async saveContacts(contactsData) {
    await this.client.query("DELETE FROM contacts")

    // Use actual lowercase column names from the DB
    const insertQuery = `
      INSERT INTO contacts (id, company, name, type, email, phone, notes, createdat, updatedat)
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
      `UPDATE contacts SET ${setClause}, updatedat = CURRENT_TIMESTAMP WHERE id = $${values.length}`,
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
        // Value is a plain string, not JSON — use as-is
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
          "UPDATE config SET value = $1, updatedat = CURRENT_TIMESTAMP WHERE key = $2",
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
    console.log(`${TAG} importBackup: starting full restore`)
    await this.client.query("BEGIN")
    try {
      await this.client.query("DELETE FROM todos")
      await this.client.query("DELETE FROM tags")
      await this.client.query("DELETE FROM contacts")
      await this.client.query("DELETE FROM config")

      if (backupData.todos && Array.isArray(backupData.todos)) {
        console.log(`${TAG} importBackup: inserting ${backupData.todos.length} todos`)
        const insertQuery = `
          INSERT INTO todos (id, message, date, company, names, accountRep, completed, createdAt, updatedAt)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `
        for (const todo of backupData.todos) {
          await this.client.query(insertQuery, [
            todo.id, todo.message, todo.date, todo.company, todo.names,
            todo.accountRep, todo.completed || false,
            todo.createdAt || new Date().toISOString(),
            todo.updatedAt || new Date().toISOString(),
          ])
        }
      }

      if (backupData.tags && Array.isArray(backupData.tags)) {
        console.log(`${TAG} importBackup: inserting ${backupData.tags.length} tags`)
        const insertQuery = `
          INSERT INTO tags (id, company, tagName, createdAt)
          VALUES ($1, $2, $3, $4)
        `
        for (const tag of backupData.tags) {
          await this.client.query(insertQuery, [
            tag.id, tag.company, tag.tagName,
            tag.createdAt || new Date().toISOString(),
          ])
        }
      }

      if (backupData.contacts && Array.isArray(backupData.contacts)) {
        console.log(`${TAG} importBackup: inserting ${backupData.contacts.length} contacts`)
        const insertQuery = `
          INSERT INTO contacts (id, company, name, type, email, phone, notes, createdAt, updatedAt)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `
        for (const contact of backupData.contacts) {
          await this.client.query(insertQuery, [
            contact.id, contact.company, contact.name, contact.type || "person",
            contact.email || "", contact.phone || "", contact.notes || "",
            contact.createdAt || new Date().toISOString(),
            contact.updatedAt || new Date().toISOString(),
          ])
        }
      }

      if (backupData.config && typeof backupData.config === "object") {
        await this.updateConfig(backupData.config)
      }

      await this.client.query("COMMIT")
      console.log(`${TAG} importBackup: restore complete`)
    } catch (e) {
      await this.client.query("ROLLBACK")
      console.error(`${TAG} importBackup transaction rolled back:`, e.message)
      throw e
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
    // Verify actual table access, not just connectivity
    await this.client.query("SELECT 1 FROM todos LIMIT 1")
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
