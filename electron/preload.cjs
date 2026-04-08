const { contextBridge, ipcRenderer } = require("electron")

console.log("[preload] running")

contextBridge.exposeInMainWorld("electron", {
  // Todos
  getTodos: () => ipcRenderer.invoke("db:getTodos"),
  saveTodos: (todos) => ipcRenderer.invoke("db:saveTodos", todos),
  addTodo: (todoData) => ipcRenderer.invoke("db:addTodo", todoData),
  updateTodo: (id, updates) => ipcRenderer.invoke("db:updateTodo", id, updates),
  deleteTodo: (id) => ipcRenderer.invoke("db:deleteTodo", id),
  completeTodo: (id) => ipcRenderer.invoke("db:completeTodo", id),
  uncompleteTodo: (id) => ipcRenderer.invoke("db:uncompleteTodo", id),

  // Tags
  getTags: () => ipcRenderer.invoke("db:getTags"),
  saveTags: (tags) => ipcRenderer.invoke("db:saveTags", tags),
  addTag: (company, tagName) => ipcRenderer.invoke("db:addTag", company, tagName),
  removeTag: (company, tagName) => ipcRenderer.invoke("db:removeTag", company, tagName),

  // Contacts
  getContacts: () => ipcRenderer.invoke("db:getContacts"),
  saveContacts: (contacts) => ipcRenderer.invoke("db:saveContacts", contacts),
  addContact: (company, contact) => ipcRenderer.invoke("db:addContact", company, contact),
  updateContact: (company, contactId, updates) =>
    ipcRenderer.invoke("db:updateContact", company, contactId, updates),
  deleteContact: (company, contactId) =>
    ipcRenderer.invoke("db:deleteContact", company, contactId),

  // Config
  getConfig: () => ipcRenderer.invoke("db:getConfig"),
  updateConfig: (config) => ipcRenderer.invoke("db:updateConfig", config),

  // Backup / Restore
  exportBackup: () => ipcRenderer.invoke("db:exportBackup"),
  importBackup: (backupData) => ipcRenderer.invoke("db:importBackup", backupData),

  // Status
  getStatus: () => ipcRenderer.invoke("db:getStatus"),

  // Health check (used by SyncManager polling)
  ping: () => ipcRenderer.invoke("db:ping"),

  // Connection management
  getConnectionInfo: () => ipcRenderer.invoke("db:getConnectionInfo"),
  testConnection: (params) => ipcRenderer.invoke("db:testConnection", params),
  setConnection: (params) => ipcRenderer.invoke("db:setConnection", params),
})
