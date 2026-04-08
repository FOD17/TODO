const { app, BrowserWindow, ipcMain, Menu, safeStorage } = require("electron")
const path = require("path")
const fs = require("fs")
const isDev = require("electron-is-dev")
const Database = require("./database.cjs")
const { Client: PgClient } = require("pg")

let mainWindow
let database

// ── Connection string storage ──────────────────────────────────────────────
// Passwords are encrypted with Electron safeStorage (macOS Keychain-backed).
// Only the encrypted blob is written to disk — the plaintext never touches
// localStorage or the renderer process.

function getDbConfigPath() {
  return path.join(app.getPath("userData"), "db-config.json")
}

function loadStoredConnectionString() {
  try {
    const filePath = getDbConfigPath()
    if (!fs.existsSync(filePath)) return null
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"))
    if (data.encrypted && safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(data.encrypted, "base64"))
    }
    if (data.plain) return data.plain
  } catch {
    // Corrupt or missing file — fall back to default
  }
  return null
}

function saveConnectionString(connectionString) {
  try {
    const filePath = getDbConfigPath()
    const data = {}
    if (safeStorage.isEncryptionAvailable()) {
      data.encrypted = safeStorage.encryptString(connectionString).toString("base64")
    } else {
      // safeStorage unavailable (rare); store plaintext as last resort
      data.plain = connectionString
    }
    fs.writeFileSync(filePath, JSON.stringify(data), "utf8")
  } catch (e) {
    console.error("[main] Failed to save connection string:", e)
  }
}

function buildConnectionString({ host, port, database: db, user, password }) {
  const h = host || "localhost"
  const p = port || 5432
  const d = db || "postgres"
  if (user) {
    const creds = password
      ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
      : encodeURIComponent(user)
    return `postgresql://${creds}@${h}:${p}/${d}`
  }
  return `postgresql://${h}:${p}/${d}`
}

function parseConnectionString(connStr) {
  try {
    const url = new URL(connStr)
    return {
      host: url.hostname || "localhost",
      port: parseInt(url.port) || 5432,
      database: url.pathname.replace(/^\//, "") || "postgres",
      user: url.username ? decodeURIComponent(url.username) : "",
      hasPassword: !!url.password,
    }
  } catch {
    return { host: "localhost", port: 5432, database: "postgres", user: "", hasPassword: false }
  }
}

// ── Database initialisation ────────────────────────────────────────────────

const initDatabase = async () => {
  const stored = loadStoredConnectionString()
  const connectionString =
    stored || process.env.DATABASE_URL || "postgresql://localhost:5432/postgres"
  database = new Database(connectionString)
  try {
    await database.connect()
  } catch (e) {
    console.error("[main] Initial DB connection failed:", e.message)
    // database.client remains null; ping returns { ok: false } until reconnected
  }
}

// ── Window & menu ──────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      enableRemoteModule: false,
    },
    icon: path.join(__dirname, "../public/icon.png"),
  })

  const startUrl = isDev
    ? "http://localhost:5173"
    : `file://${path.join(__dirname, "../dist/index.html")}`

  mainWindow.loadURL(startUrl)

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Exit",
          accelerator: "CmdOrCtrl+Q",
          click: () => {
            app.quit()
          },
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// ── App lifecycle ──────────────────────────────────────────────────────────

app.on("ready", async () => {
  await initDatabase()
  createWindow()
  createMenu()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// ── IPC: Todos ─────────────────────────────────────────────────────────────

ipcMain.handle("db:getTodos", async () => {
  return database.getTodos()
})

ipcMain.handle("db:saveTodos", async (event, todosData) => {
  return database.saveTodos(todosData)
})

ipcMain.handle("db:addTodo", async (event, todoData) => {
  return database.addTodo(todoData)
})

ipcMain.handle("db:updateTodo", async (event, id, updates) => {
  return database.updateTodo(id, updates)
})

ipcMain.handle("db:deleteTodo", async (event, id) => {
  return database.deleteTodo(id)
})

ipcMain.handle("db:completeTodo", async (event, id) => {
  return database.completeTodo(id)
})

ipcMain.handle("db:uncompleteTodo", async (event, id) => {
  return database.uncompleteTodo(id)
})

// ── IPC: Tags ──────────────────────────────────────────────────────────────

ipcMain.handle("db:getTags", async () => {
  return database.getTags()
})

ipcMain.handle("db:saveTags", async (event, tagsData) => {
  return database.saveTags(tagsData)
})

ipcMain.handle("db:addTag", async (event, company, tagName) => {
  return database.addTag(company, tagName)
})

ipcMain.handle("db:removeTag", async (event, company, tagName) => {
  return database.removeTag(company, tagName)
})

// ── IPC: Contacts ──────────────────────────────────────────────────────────

ipcMain.handle("db:getContacts", async () => {
  return database.getContacts()
})

ipcMain.handle("db:saveContacts", async (event, contactsData) => {
  return database.saveContacts(contactsData)
})

ipcMain.handle("db:addContact", async (event, company, contact) => {
  return database.addContact(company, contact)
})

ipcMain.handle("db:updateContact", async (event, company, contactId, updates) => {
  return database.updateContact(company, contactId, updates)
})

ipcMain.handle("db:deleteContact", async (event, company, contactId) => {
  return database.deleteContact(company, contactId)
})

// ── IPC: Config ────────────────────────────────────────────────────────────

ipcMain.handle("db:getConfig", async () => {
  return database.getConfig()
})

ipcMain.handle("db:updateConfig", async (event, config) => {
  return database.updateConfig(config)
})

// ── IPC: Backup / Restore ──────────────────────────────────────────────────

ipcMain.handle("db:exportBackup", async () => {
  return database.exportBackup()
})

ipcMain.handle("db:importBackup", async (event, backupData) => {
  return database.importBackup(backupData)
})

// ── IPC: Status ────────────────────────────────────────────────────────────

ipcMain.handle("db:getStatus", async () => {
  return {
    ready: true,
    isDev,
    appPath: app.getAppPath(),
    userDataPath: app.getPath("userData"),
  }
})

// ── IPC: Health check ──────────────────────────────────────────────────────
// Safe even when database.client is null (e.g. initial connection failed).

ipcMain.handle("db:ping", async () => {
  try {
    return await database.ping()
  } catch {
    return { ok: false }
  }
})

// ── IPC: Connection management ─────────────────────────────────────────────

// Returns the current connection info without exposing the password.
ipcMain.handle("db:getConnectionInfo", () => {
  const stored = loadStoredConnectionString()
  const connStr =
    stored || process.env.DATABASE_URL || "postgresql://localhost:5432/postgres"
  return parseConnectionString(connStr)
})

// Tests a connection without saving it or touching the active database.
// Also checks which required tables exist and returns any that are missing.
ipcMain.handle("db:testConnection", async (event, params) => {
  const connStr = buildConnectionString(params)
  const client = new PgClient({
    connectionString: connStr,
    connectionTimeoutMillis: 5000,
    ssl: false,
  })
  try {
    await client.connect()
    await client.query("SELECT 1")

    const requiredTables = ["todos", "tags", "contacts", "config"]
    const result = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [requiredTables]
    )
    const existingTables = result.rows.map((r) => r.table_name)
    const missingTables = requiredTables.filter((t) => !existingTables.includes(t))

    await client.end()
    return { ok: true, missingTables }
  } catch (e) {
    try { await client.end() } catch {}
    return { ok: false, error: e.message }
  }
})

// Saves the new connection string (encrypted) and hot-swaps the database.
// Only replaces the active database if the new connection succeeds.
ipcMain.handle("db:setConnection", async (event, params) => {
  const connStr = buildConnectionString(params)
  const newDb = new Database(connStr)
  try {
    await newDb.connect()
  } catch (e) {
    return { ok: false, error: e.message }
  }
  // New connection succeeded — replace atomically
  if (database && database.client) {
    try { await database.close() } catch {}
  }
  database = newDb
  saveConnectionString(connStr)
  return { ok: true }
})
