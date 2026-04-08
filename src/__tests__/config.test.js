import { describe, it, expect, beforeEach } from "vitest"
import {
  loadConfigLocalStorage,
  getDefaultConfig,
  saveConfigLocalStorage,
  loadContactsLocalStorage,
  saveContactsLocalStorage,
  parseContactsFile,
} from "../utils/markdownHandler"

describe("Config Management Tests", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  it("should return default config when no config exists", async () => {
    const config = await loadConfigLocalStorage()
    expect(config.theme).toBe("github-dark")
    expect(config.defaultView).toBe("company")
  })

  it("should save and load config", async () => {
    const config = {
      theme: "modern-dark",
      sidebarPosition: "right",
      compactMode: true,
      showCompletedByDefault: true,
      defaultView: "master",
    }

    await saveConfigLocalStorage(config)
    const loaded = await loadConfigLocalStorage()

    expect(loaded.theme).toBe("modern-dark")
    expect(loaded.sidebarPosition).toBe("right")
    expect(loaded.compactMode).toBe(true)
  })

  it("should get default config", () => {
    const defaults = getDefaultConfig()
    expect(defaults).toHaveProperty("theme")
    expect(defaults).toHaveProperty("sidebarPosition")
    expect(defaults).toHaveProperty("compactMode")
    expect(defaults).toHaveProperty("defaultView")
  })

  it("should support all themes", async () => {
    const themes = ["modern-light", "modern-dark", "forest", "ocean", "sunset"]

    for (const theme of themes) {
      const config = { ...getDefaultConfig(), theme }
      await saveConfigLocalStorage(config)
      const loaded = await loadConfigLocalStorage()
      expect(loaded.theme).toBe(theme)
    }
  })
})

describe("Contacts Management Tests", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("should save and load contacts", async () => {
    const contacts = {
      companies: {
        "Wal-Mart": {
          contacts: [
            {
              id: "1",
              name: "Chris Smith",
              type: "person",
              email: "chris@walmart.com",
              phone: "123-456-7890",
              notes: "Main contact for IT",
            },
          ],
        },
      },
      tags: {},
    }

    await saveContactsLocalStorage(contacts)
    const loaded = await loadContactsLocalStorage()

    expect(loaded.companies["Wal-Mart"]).toBeDefined()
    expect(loaded.companies["Wal-Mart"].contacts[0].name).toBe("Chris Smith")
    expect(loaded.companies["Wal-Mart"].contacts[0].email).toBe(
      "chris@walmart.com",
    )
  })

  it("should parse contacts from JSON string", () => {
    const jsonString = JSON.stringify({
      companies: {
        Apple: {
          contacts: [
            {
              id: "1",
              name: "Tim Cook",
              type: "person",
              email: "tim@apple.com",
              phone: "",
              notes: "",
            },
          ],
        },
      },
      tags: {},
    })

    const parsed = parseContactsFile(jsonString)
    expect(parsed.companies.Apple).toBeDefined()
    expect(parsed.companies.Apple.contacts[0].name).toBe("Tim Cook")
  })

  it("should support vendor contacts", async () => {
    const contacts = {
      companies: {
        Microsoft: {
          contacts: [
            {
              id: "1",
              name: "Azure Support",
              type: "vendor",
              email: "support@azure.com",
              phone: "",
              notes: "Cloud support team",
            },
          ],
        },
      },
      tags: {},
    }

    await saveContactsLocalStorage(contacts)
    const loaded = await loadContactsLocalStorage()

    expect(loaded.companies.Microsoft.contacts[0].type).toBe("vendor")
  })

  it("should return empty contacts structure on error", async () => {
    localStorage.setItem("contacts.json", "invalid json")
    const loaded = await loadContactsLocalStorage()

    expect(loaded.companies).toBeDefined()
    expect(loaded.tags).toBeDefined()
  })
})

describe("Master View Filter Tests", () => {
  const testTodos = {
    active: [
      {
        id: "1",
        message: "Task 1",
        date: new Date("2026-03-28"),
        company: "Wal-Mart",
        names: ["Chris"],
        accountRep: "John Doe",
        completed: false,
      },
      {
        id: "2",
        message: "Task 2",
        date: new Date("2026-03-29"),
        company: "Microsoft",
        names: [],
        accountRep: "Jane Smith",
        completed: false,
      },
      {
        id: "3",
        message: "Task 3",
        date: new Date("2026-03-30"),
        company: "Apple",
        names: [],
        accountRep: "John Doe",
        completed: false,
      },
    ],
    completed: [],
  }

  it("should filter todos by company", () => {
    const filtered = testTodos.active.filter((t) => t.company === "Wal-Mart")
    expect(filtered.length).toBe(1)
    expect(filtered[0].message).toBe("Task 1")
  })

  it("should filter todos by account rep", () => {
    const filtered = testTodos.active.filter((t) => t.accountRep === "John Doe")
    expect(filtered.length).toBe(2)
  })

  it("should filter todos by multiple companies", () => {
    const companies = ["Wal-Mart", "Apple"]
    const filtered = testTodos.active.filter((t) =>
      companies.includes(t.company),
    )
    expect(filtered.length).toBe(2)
  })

  it("should filter todos by multiple account reps", () => {
    const reps = ["John Doe", "Jane Smith"]
    const filtered = testTodos.active.filter((t) => reps.includes(t.accountRep))
    expect(filtered.length).toBe(3)
  })

  it("should sort by company name", () => {
    const sorted = [...testTodos.active].sort((a, b) =>
      (a.company || "").localeCompare(b.company || ""),
    )
    expect(sorted[0].company).toBe("Apple")
    expect(sorted[1].company).toBe("Microsoft")
    expect(sorted[2].company).toBe("Wal-Mart")
  })

  it("should sort by date", () => {
    const sorted = [...testTodos.active].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    )
    expect(sorted[0].message).toBe("Task 3")
    expect(sorted[2].message).toBe("Task 1")
  })
})
