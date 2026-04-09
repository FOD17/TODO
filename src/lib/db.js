import { Pool } from 'pg'

let pool

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5431/postgres',
      // Only use SSL when explicitly requested via DATABASE_SSL=require
      ssl: process.env.DATABASE_SSL === 'require' ? { rejectUnauthorized: false } : false,
    })
    pool.on('error', (err) => {
      console.error('[DB] Unexpected pool error:', err.message)
    })
  }
  return pool
}

function normalizeTodo(row) {
  if (!row) return row
  let names = row.names
  if (!names || names === '' || names === '{}') {
    names = []
  } else if (typeof names === 'string') {
    names = names.replace(/^\{|\}$/g, '').split(',').map(s => s.trim()).filter(Boolean)
  } else if (!Array.isArray(names)) {
    names = []
  }
  return { ...row, names, subtasks: row.subtasks || [], notes: row.notes || [], labels: row.labels || [] }
}

function serializeNames(names) {
  if (!names) return ''
  if (Array.isArray(names)) return names.join(',')
  return String(names)
}

const TODO_SELECT = `
  SELECT id, message, date, company, names,
    accountrep AS "accountRep", completed, description,
    createdat AS "createdAt", updatedat AS "updatedAt"
  FROM todos
`

export const db = {
  async getTodos() {
    const p = getPool()
    const [active, completed] = await Promise.all([
      p.query(`${TODO_SELECT} WHERE completed = false ORDER BY date DESC`),
      p.query(`${TODO_SELECT} WHERE completed = true ORDER BY date DESC`),
    ])
    return {
      active: active.rows.map(normalizeTodo),
      completed: completed.rows.map(normalizeTodo),
    }
  },

  async addTodo(todoData) {
    const p = getPool()
    const id = todoData.id || Date.now().toString()
    await p.query(
      `INSERT INTO todos (id, message, date, company, names, accountrep, completed, description)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7)`,
      [
        id, todoData.message, todoData.date, todoData.company || '',
        serializeNames(todoData.names), todoData.accountRep || '', todoData.description || '',
      ]
    )
    const result = await p.query(`${TODO_SELECT} WHERE id = $1`, [id])
    return normalizeTodo(result.rows[0])
  },

  async updateTodo(id, updates) {
    const p = getPool()
    const fieldMap = {
      message: 'message', date: 'date', company: 'company',
      names: 'names', accountRep: 'accountrep', description: 'description',
    }
    const fields = Object.keys(updates).filter(k => fieldMap[k])
    if (fields.length > 0) {
      const setClause = fields.map((f, i) => `${fieldMap[f]} = $${i + 1}`).join(', ')
      const values = fields.map(f => f === 'names' ? serializeNames(updates[f]) : updates[f])
      values.push(id)
      await p.query(
        `UPDATE todos SET ${setClause}, updatedat = CURRENT_TIMESTAMP WHERE id = $${values.length}`,
        values
      )
    }
    const result = await p.query(`${TODO_SELECT} WHERE id = $1`, [id])
    return normalizeTodo(result.rows[0])
  },

  async deleteTodo(id) {
    const p = getPool()
    await p.query('DELETE FROM todos WHERE id = $1', [id])
  },

  async completeTodo(id) {
    const p = getPool()
    await p.query('UPDATE todos SET completed = true, updatedat = CURRENT_TIMESTAMP WHERE id = $1', [id])
  },

  async uncompleteTodo(id) {
    const p = getPool()
    await p.query('UPDATE todos SET completed = false, updatedat = CURRENT_TIMESTAMP WHERE id = $1', [id])
  },

  async saveTodos(todosData) {
    const p = getPool()
    const active = todosData.active || []
    const completed = todosData.completed || []
    const now = new Date().toISOString()
    const insertQuery = `
      INSERT INTO todos (id, message, date, company, names, accountrep, completed, description, createdat, updatedat)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `
    const client = await p.connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM todos')
      for (const todo of [...active, ...completed]) {
        await client.query(insertQuery, [
          todo.id, todo.message, todo.date, todo.company || '',
          serializeNames(todo.names),
          todo.accountRep || todo.accountrep || '',
          todo.completed || false,
          todo.description || '',
          todo.createdAt || todo.createdat || now,
          todo.updatedAt || todo.updatedat || now,
        ])
      }
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
    return todosData
  },

  // ── TAGS ─────────────────────────────────────────────────────────────────────
  async getTags() {
    const p = getPool()
    const result = await p.query("SELECT value FROM config WHERE key = 'tags_blob'")
    if (result.rows.length > 0) {
      try { return JSON.parse(result.rows[0].value) } catch {}
    }
    const rows = (await p.query('SELECT company, tagname FROM tags ORDER BY company, tagname')).rows
    const companies = [...new Set(rows.map(r => r.company).filter(Boolean))]
    return { companies, accountExecutives: [], companyAssignments: {}, companyTypes: {}, labels: [] }
  },

  async saveTags(tagsData) {
    const p = getPool()
    const json = JSON.stringify(tagsData)
    const existing = await p.query("SELECT key FROM config WHERE key = 'tags_blob'")
    if (existing.rows.length > 0) {
      await p.query(
        "UPDATE config SET value = $1, updatedat = CURRENT_TIMESTAMP WHERE key = 'tags_blob'",
        [json]
      )
    } else {
      await p.query("INSERT INTO config (key, value) VALUES ('tags_blob', $1)", [json])
    }
    return tagsData
  },

  // ── CONTACTS ──────────────────────────────────────────────────────────────────
  async getContacts() {
    const p = getPool()
    const result = await p.query(`
      SELECT id, company, name, type, email, phone, notes,
        createdat AS "createdAt", updatedat AS "updatedAt"
      FROM contacts ORDER BY company, name
    `)
    const contacts = {}
    result.rows.forEach(row => {
      if (!contacts[row.company]) contacts[row.company] = {}
      if (!contacts[row.company][row.name]) contacts[row.company][row.name] = []
      const { company, name, ...contact } = row
      contacts[company][name].push(contact)
    })
    return contacts
  },

  async saveContacts(contactsData) {
    const p = getPool()
    const now = new Date().toISOString()
    const insertQuery = `
      INSERT INTO contacts (id, company, name, type, email, phone, notes, createdat, updatedat)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `
    await p.query('DELETE FROM contacts')
    if (contactsData && contactsData.companies) {
      for (const [company, companyData] of Object.entries(contactsData.companies)) {
        for (const contact of (companyData.contacts || [])) {
          await p.query(insertQuery, [
            contact.id || `contact-${Date.now()}`, company, contact.name,
            contact.type || 'person', contact.email || '', contact.phone || '', contact.notes || '',
            contact.createdAt || now, contact.updatedAt || now,
          ])
        }
      }
    } else if (contactsData) {
      for (const [company, names] of Object.entries(contactsData)) {
        if (typeof names !== 'object' || Array.isArray(names)) continue
        for (const [name, contacts] of Object.entries(names)) {
          if (!Array.isArray(contacts)) continue
          for (const contact of contacts) {
            await p.query(insertQuery, [
              contact.id || `contact-${Date.now()}`, company, name,
              contact.type || 'person', contact.email || '', contact.phone || '', contact.notes || '',
              contact.createdAt || now, contact.updatedAt || now,
            ])
          }
        }
      }
    }
    return contactsData
  },

  async addContact(company, contact) {
    const p = getPool()
    const id = contact.id || `contact-${Date.now()}`
    await p.query(
      `INSERT INTO contacts (id, company, name, type, email, phone, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, company, contact.name, contact.type || 'person', contact.email || '', contact.phone || '', contact.notes || '']
    )
    return { id, ...contact }
  },

  async updateContact(company, contactId, updates) {
    const p = getPool()
    const allowedFields = ['name', 'type', 'email', 'phone', 'notes']
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k))
    if (fields.length > 0) {
      const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ')
      const values = [...fields.map(f => updates[f]), contactId]
      await p.query(
        `UPDATE contacts SET ${setClause}, updatedat = CURRENT_TIMESTAMP WHERE id = $${values.length}`,
        values
      )
    }
    const result = await p.query('SELECT * FROM contacts WHERE id = $1', [contactId])
    return result.rows[0]
  },

  async deleteContact(company, contactId) {
    const p = getPool()
    await p.query('DELETE FROM contacts WHERE id = $1 AND company = $2', [contactId, company])
  },

  // ── CONFIG ────────────────────────────────────────────────────────────────────
  async getConfig() {
    const p = getPool()
    const result = await p.query('SELECT key, value FROM config')
    const config = {}
    result.rows.forEach(row => {
      try { config[row.key] = JSON.parse(row.value) }
      catch { config[row.key] = row.value }
    })
    return config
  },

  async updateConfig(config) {
    const p = getPool()
    for (const [key, value] of Object.entries(config)) {
      const jsonValue = typeof value === 'string' ? value : JSON.stringify(value)
      const existing = await p.query('SELECT key FROM config WHERE key = $1', [key])
      if (existing.rows.length > 0) {
        await p.query(
          'UPDATE config SET value = $1, updatedat = CURRENT_TIMESTAMP WHERE key = $2',
          [jsonValue, key]
        )
      } else {
        await p.query('INSERT INTO config (key, value) VALUES ($1, $2)', [key, jsonValue])
      }
    }
    return this.getConfig()
  },

  // ── BACKUP ────────────────────────────────────────────────────────────────────
  async exportBackup() {
    const p = getPool()
    const [todosRes, tagsRes, contactsRes, config] = await Promise.all([
      p.query('SELECT * FROM todos'),
      p.query('SELECT * FROM tags'),
      p.query('SELECT * FROM contacts'),
      this.getConfig(),
    ])
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      todos: todosRes.rows,
      tags: tagsRes.rows,
      contacts: contactsRes.rows,
      config,
    }
  },

  async importBackup(backupData) {
    const p = getPool()
    const client = await p.connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM todos')
      await client.query('DELETE FROM tags')
      await client.query('DELETE FROM contacts')
      await client.query('DELETE FROM config')
      const now = new Date().toISOString()
      if (Array.isArray(backupData.todos)) {
        for (const todo of backupData.todos) {
          await client.query(
            `INSERT INTO todos (id, message, date, company, names, accountrep, completed, description, createdat, updatedat)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
              todo.id, todo.message, todo.date, todo.company || '',
              todo.names || '', todo.accountRep || todo.accountrep || '',
              todo.completed || false, todo.description || '',
              todo.createdAt || now, todo.updatedAt || now,
            ]
          )
        }
      }
      if (Array.isArray(backupData.contacts)) {
        for (const c of backupData.contacts) {
          await client.query(
            `INSERT INTO contacts (id, company, name, type, email, phone, notes, createdat, updatedat)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [c.id, c.company, c.name, c.type || 'person', c.email || '', c.phone || '', c.notes || '', c.createdAt || now, c.updatedAt || now]
          )
        }
      }
      if (backupData.config && typeof backupData.config === 'object') {
        for (const [key, value] of Object.entries(backupData.config)) {
          const jsonValue = typeof value === 'string' ? value : JSON.stringify(value)
          await client.query('INSERT INTO config (key, value) VALUES ($1, $2)', [key, jsonValue])
        }
      }
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
    return { status: 'success', message: 'Backup imported successfully' }
  },

  // ── HEALTH ────────────────────────────────────────────────────────────────────
  async ping() {
    const p = getPool()
    await p.query('SELECT 1 FROM todos LIMIT 1')
    return { ok: true, timestamp: Date.now() }
  },

  async initializeTables() {
    const p = getPool()
    await p.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        date TEXT NOT NULL,
        company TEXT,
        names TEXT,
        accountrep TEXT,
        completed BOOLEAN DEFAULT FALSE,
        description TEXT,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await p.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        company TEXT NOT NULL,
        tagname TEXT NOT NULL,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company, tagname)
      )
    `)
    await p.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        company TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT,
        email TEXT,
        phone TEXT,
        notes TEXT,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await p.query(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    try {
      await p.query('ALTER TABLE todos ADD COLUMN IF NOT EXISTS description TEXT')
    } catch {}
    console.log('[DB] Tables ready')
  },
}
