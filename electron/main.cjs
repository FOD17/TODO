const { app, BrowserWindow, ipcMain, Menu } = require("electron")
const path = require("path")
const isDev = require("electron-is-dev")
const Database = require("./database.cjs")

let mainWindow
let database

// Initialize database with PostgreSQL connection string
const initDatabase = async () => {
  const connectionString =
    process.env.DATABASE_URL || "postgresql://localhost:5432/todo_tracker"
  database = new Database(connectionString)
  await database.connect()
}

initDatabase().catch(console.error)

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
    ? "http://localhost:5173" // Vite dev server
    : `file://${path.join(__dirname, "../dist/index.html")}`

  mainWindow.loadURL(startUrl)

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// Create menu
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

// App event handlers
app.on("ready", () => {
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

// IPC Handlers for TODOs
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

// IPC Handlers for Tags
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

// IPC Handlers for Contacts
ipcMain.handle("db:getContacts", async () => {
  return database.getContacts()
})

ipcMain.handle("db:saveContacts", async (event, contactsData) => {
  return database.saveContacts(contactsData)
})

ipcMain.handle("db:addContact", async (event, company, contact) => {
  return database.addContact(company, contact)
})

ipcMain.handle(
  "db:updateContact",
  async (event, company, contactId, updates) => {
    return database.updateContact(company, contactId, updates)
  },
)

ipcMain.handle("db:deleteContact", async (event, company, contactId) => {
  return database.deleteContact(company, contactId)
})

// IPC Handlers for Config
ipcMain.handle("db:getConfig", async () => {
  return database.getConfig()
})

ipcMain.handle("db:updateConfig", async (event, config) => {
  return database.updateConfig(config)
})

// IPC Handlers for Backup/Restore
ipcMain.handle("db:exportBackup", async () => {
  return database.exportBackup()
})

ipcMain.handle("db:importBackup", async (event, backupData) => {
  return database.importBackup(backupData)
})

// IPC Handlers for Database Status
ipcMain.handle("db:getStatus", async () => {
  return {
    ready: true,
    isDev,
    appPath: app.getAppPath(),
    userDataPath: app.getPath("userData"),
  }
})

// IPC Handler for Health Check (used by SyncManager polling)
ipcMain.handle("db:ping", async () => {
  return database.ping()
})
