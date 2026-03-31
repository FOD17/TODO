/**
 * Enhanced Markdown File Handler Utilities
 * Handles reading, parsing, and writing TODO data and contacts
 */

import { persistence } from "./persistence"

export const TODOS_FILENAME = "todos.md"
export const TAGS_FILENAME = "tags.md"
export const CONTACTS_FILENAME = "contacts.json"
export const CONFIG_FILENAME = "config.json"

// CONFIG MANAGEMENT
export function getDefaultConfig() {
  return {
    theme: "modern-light",
    sidebarPosition: "left",
    compactMode: false,
    showCompletedByDefault: false,
    defaultView: "company",
  }
}

// Synchronous version for initial state (uses localStorage only)
export function loadConfigLocalStorageSync() {
  try {
    const config = localStorage.getItem(CONFIG_FILENAME)
    return config ? JSON.parse(config) : getDefaultConfig()
  } catch {
    return getDefaultConfig()
  }
}

// Async version for ensuring fallback from IndexedDB
export async function loadConfigLocalStorage() {
  try {
    const config = await persistence.load(CONFIG_FILENAME)
    return config ? config : getDefaultConfig()
  } catch {
    return getDefaultConfig()
  }
}

export async function saveConfigLocalStorage(config) {
  await persistence.save(CONFIG_FILENAME, config)
  return true
}

/**
 * Parse markdown format: # ACTIVE TODOS\n## COMPLETED TODOS
 * Each todo line format: - [x] Message | Date: YYYY-MM-DD | Company: X | Names: Y | Account Rep: Z
 */
export function parseMarkdownFile(content) {
  const todos = { active: [], completed: [] }

  if (!content) return todos

  const lines = content.split("\n")
  let currentSection = null

  for (const line of lines) {
    if (line.trim() === "# ACTIVE TODOS") {
      currentSection = "active"
      continue
    }
    if (line.trim() === "# COMPLETED TODOS") {
      currentSection = "completed"
      continue
    }

    if (line.startsWith("- ") && currentSection) {
      const todo = parseTodoLine(line, currentSection === "completed")
      if (todo) {
        if (currentSection === "active") {
          todos.active.push(todo)
        } else {
          todos.completed.push(todo)
        }
      }
    }
  }

  return todos
}

/**
 * Parse individual todo line
 * Format: - [x] Message | Date: YYYY-MM-DD | Company: X | Names: Y | Account Rep: Z
 */
function parseTodoLine(line, isCompleted) {
  try {
    const content = line.substring(line.indexOf("]") + 1).trim()
    const parts = content.split("|").map((p) => p.trim())

    const todo = {
      id: Date.now().toString(),
      message: parts[0],
      completed: isCompleted,
      date: new Date(),
      company: "",
      names: [],
      accountRep: "",
    }

    for (const part of parts.slice(1)) {
      if (part.startsWith("Date:")) {
        const dateStr = part.replace("Date:", "").trim()
        todo.date = new Date(dateStr)
      } else if (part.startsWith("Company:")) {
        todo.company = part.replace("Company:", "").trim()
      } else if (part.startsWith("Names:")) {
        const namesStr = part.replace("Names:", "").trim()
        todo.names = namesStr
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean)
      } else if (part.startsWith("Account Rep:")) {
        todo.accountRep = part.replace("Account Rep:", "").trim()
      }
    }

    return todo
  } catch (e) {
    console.error("Error parsing todo line:", line, e)
    return null
  }
}

/**
 * Convert todos to markdown format
 */
export function generateMarkdownContent(todos) {
  let content = "# ACTIVE TODOS\n\n"

  // Sort active todos by date (most recent first)
  const activeSorted = [...todos.active].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  )

  for (const todo of activeSorted) {
    content += formatTodoLine(todo, false) + "\n"
  }

  content += "\n# COMPLETED TODOS\n\n"

  // Sort completed todos by date (most recent first)
  const completedSorted = [...todos.completed].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  )

  for (const todo of completedSorted) {
    content += formatTodoLine(todo, true) + "\n"
  }

  return content
}

/**
 * Format single todo line
 */
function formatTodoLine(todo, completed) {
  const checkbox = completed ? "[x]" : "[ ]"
  const dateStr =
    todo.date instanceof Date
      ? todo.date.toISOString().split("T")[0]
      : todo.date

  let line = `- ${checkbox} ${todo.message}`
  line += ` | Date: ${dateStr}`

  if (todo.company) {
    line += ` | Company: ${todo.company}`
  }

  if (todo.names.length > 0) {
    line += ` | Names: ${todo.names.join(", ")}`
  }

  if (todo.accountRep) {
    line += ` | Account Rep: ${todo.accountRep}`
  }

  return line
}

/**
 * Parse tags markdown file
 * Format: ## Company Name\n- tag1\n- Company:Person\n
 */
export function parseTagsFile(content) {
  const tags = {}

  if (!content) return tags

  const lines = content.split("\n")
  let currentCompany = null

  for (const line of lines) {
    if (line.startsWith("## ")) {
      currentCompany = line.substring(3).trim()
      tags[currentCompany] = []
    } else if (line.startsWith("- ") && currentCompany) {
      tags[currentCompany].push(line.substring(2).trim())
    }
  }

  return tags
}

/**
 * Generate tags markdown content
 */
export function generateTagsContent(tags) {
  let content = ""

  const companies = Object.keys(tags).sort()

  for (const company of companies) {
    content += `## ${company}\n`
    const sortedTags = [...tags[company]].sort()
    for (const tag of sortedTags) {
      content += `- ${tag}\n`
    }
    content += "\n"
  }

  return content
}

/**
 * Save todos to localStorage
 */
export async function saveTodosLocalStorage(todos) {
  await persistence.save(TODOS_FILENAME, todos)
  return true
}

// Synchronous version for initial state
export function loadTodosLocalStorageSync() {
  const content = localStorage.getItem(TODOS_FILENAME) || ""
  return parseMarkdownFile(content)
}

/**
 * Load todos from localStorage
 */
export async function loadTodosLocalStorage() {
  const content = await persistence.load(TODOS_FILENAME)
  if (!content) return { active: [], completed: [] }

  // Handle both markdown string and object formats
  if (typeof content === "string") {
    return parseMarkdownFile(content)
  }
  return content
}

/**
 * Save tags to localStorage
 */
export async function saveTagsLocalStorage(tags) {
  await persistence.save(TAGS_FILENAME, tags)
  return true
}

// Synchronous version for initial state
export function loadTagsLocalStorageSync() {
  const content = localStorage.getItem(TAGS_FILENAME) || ""
  if (!content) return {}
  try {
    return JSON.parse(content)
  } catch {
    return parseTagsFile(content)
  }
}

/**
 * Load tags from localStorage
 */
export async function loadTagsLocalStorage() {
  const content = await persistence.load(TAGS_FILENAME)
  if (!content) return {}

  // Handle both markdown string and object formats
  if (typeof content === "string") {
    return parseTagsFile(content)
  }
  return content
}

/**
 * Export markdown as file
 */
export function downloadMarkdownFile(filename, content) {
  const element = document.createElement("a")
  element.setAttribute(
    "href",
    "data:text/markdown;charset=utf-8," + encodeURIComponent(content),
  )
  element.setAttribute("download", filename)
  element.style.display = "none"
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}

/**
 * CONTACTS MANAGEMENT (NEW)
 */
export function parseContactsFile(content) {
  try {
    return content ? JSON.parse(content) : getDefaultContacts()
  } catch {
    return getDefaultContacts()
  }
}

export function getDefaultContacts() {
  return {
    companies: {},
    tags: {},
  }
}

export function generateContactsContent(contacts) {
  return JSON.stringify(contacts, null, 2)
}

export async function saveContactsLocalStorage(contacts) {
  await persistence.save(CONTACTS_FILENAME, contacts)
  return true
}

// Synchronous version for initial state
export function loadContactsLocalStorageSync() {
  const content = localStorage.getItem(CONTACTS_FILENAME) || ""
  return parseContactsFile(content)
}

export async function loadContactsLocalStorage() {
  const content = await persistence.load(CONTACTS_FILENAME)
  return parseContactsFile(
    typeof content === "string" ? content : JSON.stringify(content || {}),
  )
}

export function downloadJsonFile(filename, content) {
  const element = document.createElement("a")
  element.setAttribute(
    "href",
    "data:application/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(content, null, 2)),
  )
  element.setAttribute("download", filename)
  element.style.display = "none"
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}

/**
 * Backup & Restore Functions
 */
export function createBackup(todos, tags, contacts, config) {
  persistence.exportAllData(todos, tags, contacts, config)
}

export async function restoreFromBackup(jsonString) {
  return persistence.importData(jsonString)
}

export function getStorageStatus() {
  return persistence.getStatus()
}

export function getAvailableSnapshots() {
  return persistence.getSnapshots()
}

export function createSnapshot(todos, tags, contacts, config) {
  return persistence.createSnapshot({ todos, tags, contacts, config })
}

export async function restoreFromSnapshot(snapshotKey) {
  const snapshot = await persistence.load(snapshotKey)
  if (!snapshot) {
    throw new Error("Snapshot not found")
  }
  return snapshot
}

export function clearAllData() {
  persistence.clearAllData()
}
