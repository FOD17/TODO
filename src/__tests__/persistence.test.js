import { describe, it, expect, beforeEach } from "vitest"
import { electronAdapter } from "../utils/electronAdapter"

describe("ElectronAdapter Persistence Tests", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // ============ 1. Todos round-trip ============

  describe("Todos round-trip", () => {
    it("should save and load todos with structure preserved", async () => {
      const todosData = {
        active: [
          {
            id: "1",
            message: "Buy groceries",
            company: "Wal-Mart",
            date: "2026-03-30",
            names: ["Chris"],
            accountRep: "John Doe",
            completed: 0,
          },
          {
            id: "2",
            message: "Fix deployment",
            company: "Microsoft",
            date: "2026-03-29",
            names: [],
            accountRep: "Jane Smith",
            completed: 0,
          },
        ],
        completed: [
          {
            id: "3",
            message: "Send invoice",
            company: "Apple",
            date: "2026-03-28",
            names: ["Tim"],
            accountRep: "John Doe",
            completed: 1,
          },
        ],
      }

      await electronAdapter.saveTodos(todosData)
      const loaded = await electronAdapter.getTodos()

      expect(loaded.active).toHaveLength(2)
      expect(loaded.completed).toHaveLength(1)
      expect(loaded.active[0].id).toBe("1")
      expect(loaded.active[0].message).toBe("Buy groceries")
      expect(loaded.active[0].company).toBe("Wal-Mart")
      expect(loaded.active[1].id).toBe("2")
      expect(loaded.completed[0].id).toBe("3")
      expect(loaded.completed[0].completed).toBe(1)
    })

    it("should preserve all todo fields through save/load cycle", async () => {
      const todosData = {
        active: [
          {
            id: "100",
            message: "Complex task",
            company: "Acme Corp",
            date: "2026-04-01",
            names: ["Alice", "Bob"],
            accountRep: "Charlie",
            completed: 0,
            priority: "high",
            labels: ["urgent", "billing"],
          },
        ],
        completed: [],
      }

      await electronAdapter.saveTodos(todosData)
      const loaded = await electronAdapter.getTodos()

      expect(loaded.active[0]).toEqual(todosData.active[0])
    })
  })

  // ============ 2. Tags round-trip ============

  describe("Tags round-trip", () => {
    it("should save and load tags with all fields preserved", async () => {
      const tagsData = {
        companies: ["Wal-Mart", "Microsoft", "Apple"],
        accountExecutives: ["John Doe", "Jane Smith"],
        companyAssignments: {
          "Wal-Mart": "John Doe",
          Microsoft: "Jane Smith",
          Apple: "John Doe",
        },
        labels: ["urgent", "billing", "follow-up"],
      }

      await electronAdapter.saveTags(tagsData)
      const loaded = await electronAdapter.getTags()

      expect(loaded.companies).toEqual(["Wal-Mart", "Microsoft", "Apple"])
      expect(loaded.accountExecutives).toEqual(["John Doe", "Jane Smith"])
      expect(loaded.companyAssignments).toEqual({
        "Wal-Mart": "John Doe",
        Microsoft: "Jane Smith",
        Apple: "John Doe",
      })
      expect(loaded.labels).toEqual(["urgent", "billing", "follow-up"])
    })

    it("should preserve companies array order", async () => {
      const tagsData = {
        companies: ["Zebra", "Alpha", "Middle"],
        accountExecutives: [],
        companyAssignments: {},
        labels: [],
      }

      await electronAdapter.saveTags(tagsData)
      const loaded = await electronAdapter.getTags()

      expect(loaded.companies[0]).toBe("Zebra")
      expect(loaded.companies[1]).toBe("Alpha")
      expect(loaded.companies[2]).toBe("Middle")
    })
  })

  // ============ 3. Tags dual-key consistency ============

  describe("Tags dual-key consistency", () => {
    it("should write to both 'tags.md' and 'tags' keys on save", async () => {
      const tagsData = {
        companies: ["TestCo"],
        accountExecutives: ["Rep One"],
        companyAssignments: { TestCo: "Rep One" },
        labels: ["label-a"],
      }

      await electronAdapter.saveTags(tagsData)

      const tagsMd = localStorage.getItem("tags.md")
      const tags = localStorage.getItem("tags")

      expect(tagsMd).not.toBeNull()
      expect(tags).not.toBeNull()
      expect(tagsMd).toBe(tags)

      const parsedMd = JSON.parse(tagsMd)
      const parsedTags = JSON.parse(tags)

      expect(parsedMd.companies).toEqual(["TestCo"])
      expect(parsedTags.companies).toEqual(["TestCo"])
    })
  })

  // ============ 4. Tags getTags reads "tags.md" first ============

  describe("Tags backwards compatibility", () => {
    it("should read from 'tags.md' first when both keys exist", async () => {
      const tagsMdData = {
        companies: ["FromTagsMd"],
        accountExecutives: ["Rep A"],
        companyAssignments: {},
        labels: ["md-label"],
      }
      const tagsData = {
        companies: ["FromTags"],
        accountExecutives: ["Rep B"],
        companyAssignments: {},
        labels: ["tags-label"],
      }

      localStorage.setItem("tags.md", JSON.stringify(tagsMdData))
      localStorage.setItem("tags", JSON.stringify(tagsData))

      const loaded = await electronAdapter.getTags()

      expect(loaded.companies).toEqual(["FromTagsMd"])
      expect(loaded.accountExecutives).toEqual(["Rep A"])
      expect(loaded.labels).toEqual(["md-label"])
    })

    it("should fall back to 'tags' key when 'tags.md' is not set", async () => {
      const tagsData = {
        companies: ["FallbackCo"],
        accountExecutives: ["Fallback Rep"],
        companyAssignments: { FallbackCo: "Fallback Rep" },
        labels: ["fallback-label"],
      }

      localStorage.setItem("tags", JSON.stringify(tagsData))

      const loaded = await electronAdapter.getTags()

      expect(loaded.companies).toEqual(["FallbackCo"])
      expect(loaded.accountExecutives).toEqual(["Fallback Rep"])
      expect(loaded.companyAssignments).toEqual({ FallbackCo: "Fallback Rep" })
      expect(loaded.labels).toEqual(["fallback-label"])
    })
  })

  // ============ 5. Tags structure validation ============

  describe("Tags structure validation", () => {
    it("should return safe defaults for completely malformed JSON", async () => {
      localStorage.setItem("tags.md", "not valid json at all")

      const loaded = await electronAdapter.getTags()

      expect(loaded.companies).toEqual([])
      expect(loaded.accountExecutives).toEqual([])
      expect(loaded.companyAssignments).toEqual({})
      expect(loaded.labels).toEqual([])
    })

    it("should return safe defaults when companies is not an array", async () => {
      localStorage.setItem(
        "tags.md",
        JSON.stringify({
          companies: "not-an-array",
          accountExecutives: ["Valid Rep"],
          companyAssignments: {},
          labels: [],
        }),
      )

      const loaded = await electronAdapter.getTags()

      expect(loaded.companies).toEqual([])
      expect(loaded.accountExecutives).toEqual(["Valid Rep"])
    })

    it("should return safe defaults when accountExecutives is not an array", async () => {
      localStorage.setItem(
        "tags.md",
        JSON.stringify({
          companies: ["ValidCo"],
          accountExecutives: 42,
          companyAssignments: {},
          labels: [],
        }),
      )

      const loaded = await electronAdapter.getTags()

      expect(loaded.companies).toEqual(["ValidCo"])
      expect(loaded.accountExecutives).toEqual([])
    })

    it("should return safe defaults when labels is not an array", async () => {
      localStorage.setItem(
        "tags.md",
        JSON.stringify({
          companies: ["ValidCo"],
          accountExecutives: [],
          companyAssignments: {},
          labels: "not-an-array",
        }),
      )

      const loaded = await electronAdapter.getTags()

      expect(loaded.labels).toEqual([])
    })

    it("should return empty object for missing companyAssignments", async () => {
      localStorage.setItem(
        "tags.md",
        JSON.stringify({
          companies: ["SomeCo"],
          accountExecutives: [],
        }),
      )

      const loaded = await electronAdapter.getTags()

      expect(loaded.companyAssignments).toEqual({})
      expect(loaded.labels).toEqual([])
    })

    it("should handle partially valid tag data gracefully", async () => {
      localStorage.setItem(
        "tags.md",
        JSON.stringify({
          companies: ["GoodCo"],
          // missing all other fields
        }),
      )

      const loaded = await electronAdapter.getTags()

      expect(loaded.companies).toEqual(["GoodCo"])
      expect(loaded.accountExecutives).toEqual([])
      expect(loaded.companyAssignments).toEqual({})
      expect(loaded.labels).toEqual([])
    })
  })

  // ============ 6. Config round-trip ============

  describe("Config round-trip", () => {
    it("should save and load config", async () => {
      const config = {
        theme: "modern-dark",
        sidebarPosition: "right",
        compactMode: true,
        defaultView: "master",
      }

      await electronAdapter.updateConfig(config)
      const loaded = await electronAdapter.getConfig()

      expect(loaded.theme).toBe("modern-dark")
      expect(loaded.sidebarPosition).toBe("right")
      expect(loaded.compactMode).toBe(true)
      expect(loaded.defaultView).toBe("master")
    })

    it("should preserve custom config fields", async () => {
      const config = {
        theme: "ocean",
        sidebarPosition: "left",
        compactMode: false,
        defaultView: "company",
        customSetting: "custom-value",
      }

      await electronAdapter.updateConfig(config)
      const loaded = await electronAdapter.getConfig()

      expect(loaded.customSetting).toBe("custom-value")
    })
  })

  // ============ 7. Config defaults when empty ============

  describe("Config defaults", () => {
    it("should return default config when no config is stored", async () => {
      const config = await electronAdapter.getConfig()

      expect(config.theme).toBe("github-dark")
      expect(config.sidebarPosition).toBe("left")
      expect(config.compactMode).toBe(false)
      expect(config.defaultView).toBe("company")
    })

    it("should return default config with all expected keys", async () => {
      const config = await electronAdapter.getConfig()

      expect(config).toHaveProperty("theme")
      expect(config).toHaveProperty("sidebarPosition")
      expect(config).toHaveProperty("compactMode")
      expect(config).toHaveProperty("defaultView")
    })
  })

  // ============ 8. Labels field preservation ============

  describe("Labels field preservation", () => {
    it("should preserve labels array through save/load cycle", async () => {
      const tagsData = {
        companies: ["LabelTestCo"],
        accountExecutives: ["Rep"],
        companyAssignments: {},
        labels: ["urgent", "billing", "follow-up", "internal"],
      }

      await electronAdapter.saveTags(tagsData)
      const loaded = await electronAdapter.getTags()

      expect(loaded.labels).toEqual(["urgent", "billing", "follow-up", "internal"])
      expect(loaded.labels).toHaveLength(4)
    })

    it("should preserve empty labels array", async () => {
      const tagsData = {
        companies: ["EmptyLabelCo"],
        accountExecutives: [],
        companyAssignments: {},
        labels: [],
      }

      await electronAdapter.saveTags(tagsData)
      const loaded = await electronAdapter.getTags()

      expect(loaded.labels).toEqual([])
      expect(Array.isArray(loaded.labels)).toBe(true)
    })

    it("should preserve labels with special characters", async () => {
      const tagsData = {
        companies: [],
        accountExecutives: [],
        companyAssignments: {},
        labels: ["high-priority", "Q1 2026", "client/vendor", "$$$ revenue"],
      }

      await electronAdapter.saveTags(tagsData)
      const loaded = await electronAdapter.getTags()

      expect(loaded.labels).toEqual([
        "high-priority",
        "Q1 2026",
        "client/vendor",
        "$$$ revenue",
      ])
    })
  })

  // ============ 8b. Subtasks field preservation ============

  describe("Subtasks field preservation", () => {
    it("should preserve subtasks array through save/load cycle", async () => {
      const todosData = {
        active: [
          {
            id: "sub-1",
            message: "Task with subtasks",
            company: "Acme",
            date: "2026-04-01",
            names: [],
            accountRep: "Jane",
            completed: 0,
            subtasks: [
              {
                id: "st1",
                message: "Subtask A",
                completed: false,
                completedAt: null,
                createdAt: "2026-03-25T10:00:00.000Z",
                updatedAt: "2026-03-25T10:00:00.000Z",
              },
              {
                id: "st2",
                message: "Subtask B",
                completed: true,
                completedAt: "2026-03-26T12:00:00.000Z",
                createdAt: "2026-03-25T10:00:00.000Z",
                updatedAt: "2026-03-26T12:00:00.000Z",
              },
            ],
          },
        ],
        completed: [],
      }

      await electronAdapter.saveTodos(todosData)
      const loaded = await electronAdapter.getTodos()

      expect(loaded.active[0].subtasks).toHaveLength(2)
      expect(loaded.active[0].subtasks[0].message).toBe("Subtask A")
      expect(loaded.active[0].subtasks[0].completed).toBe(false)
      expect(loaded.active[0].subtasks[1].message).toBe("Subtask B")
      expect(loaded.active[0].subtasks[1].completed).toBe(true)
      expect(loaded.active[0].subtasks[1].completedAt).toBe("2026-03-26T12:00:00.000Z")
    })

    it("should preserve empty subtasks array", async () => {
      const todosData = {
        active: [
          {
            id: "sub-2",
            message: "Task without subtasks",
            subtasks: [],
          },
        ],
        completed: [],
      }

      await electronAdapter.saveTodos(todosData)
      const loaded = await electronAdapter.getTodos()

      expect(loaded.active[0].subtasks).toEqual([])
      expect(Array.isArray(loaded.active[0].subtasks)).toBe(true)
    })

    it("should preserve subtasks on completed todos", async () => {
      const todosData = {
        active: [],
        completed: [
          {
            id: "sub-3",
            message: "Completed parent",
            completed: 1,
            subtasks: [
              {
                id: "st1",
                message: "Child task",
                completed: true,
                completedAt: "2026-03-26T12:00:00.000Z",
                createdAt: "2026-03-25T10:00:00.000Z",
                updatedAt: "2026-03-26T12:00:00.000Z",
              },
            ],
          },
        ],
      }

      await electronAdapter.saveTodos(todosData)
      const loaded = await electronAdapter.getTodos()

      expect(loaded.completed[0].subtasks).toHaveLength(1)
      expect(loaded.completed[0].subtasks[0].completed).toBe(true)
    })
  })

  // ============ 9. Backup/restore ============

  describe("Backup and restore", () => {
    it("should export a backup containing all data", async () => {
      const todosData = {
        active: [{ id: "1", message: "Backup task", completed: 0 }],
        completed: [],
      }
      const tagsData = {
        companies: ["BackupCo"],
        accountExecutives: ["Backup Rep"],
        companyAssignments: { BackupCo: "Backup Rep" },
        labels: ["backup-label"],
      }
      const configData = {
        theme: "forest",
        sidebarPosition: "right",
        compactMode: true,
        defaultView: "master",
      }

      await electronAdapter.saveTodos(todosData)
      await electronAdapter.saveTags(tagsData)
      await electronAdapter.updateConfig(configData)

      const backup = await electronAdapter.exportBackup()

      expect(backup.todos.active).toHaveLength(1)
      expect(backup.todos.active[0].message).toBe("Backup task")
      expect(backup.tags).toBeDefined()
      expect(backup.config).toBeDefined()
      expect(backup.contacts).toBeDefined()
      expect(backup.exportedAt).toBeDefined()
      expect(typeof backup.exportedAt).toBe("string")
    })

    it("should restore all data from a backup", async () => {
      const backupData = {
        todos: {
          active: [
            { id: "10", message: "Restored task", completed: 0 },
            { id: "11", message: "Another restored", completed: 0 },
          ],
          completed: [{ id: "12", message: "Done task", completed: 1 }],
        },
        tags: {
          companies: ["RestoredCo"],
          accountExecutives: ["Restored Rep"],
          companyAssignments: { RestoredCo: "Restored Rep" },
          labels: ["restored-label"],
        },
        contacts: {
          RestoredCo: {
            "Alice Johnson": [
              { id: "c1", name: "Alice Johnson", email: "alice@restored.com" },
            ],
          },
        },
        config: {
          theme: "sunset",
          sidebarPosition: "left",
          compactMode: false,
          defaultView: "company",
        },
      }

      const result = await electronAdapter.importBackup(backupData)
      expect(result.status).toBe("success")

      const todos = await electronAdapter.getTodos()
      expect(todos.active).toHaveLength(2)
      expect(todos.active[0].message).toBe("Restored task")
      expect(todos.completed).toHaveLength(1)

      const config = await electronAdapter.getConfig()
      expect(config.theme).toBe("sunset")
      expect(config.compactMode).toBe(false)

      const contacts = await electronAdapter.getContacts()
      expect(contacts.RestoredCo).toBeDefined()
    })

    it("should export and re-import producing identical data", async () => {
      const todosData = {
        active: [{ id: "r1", message: "Round trip", completed: 0 }],
        completed: [],
      }
      const configData = {
        theme: "ocean",
        sidebarPosition: "left",
        compactMode: false,
        defaultView: "company",
      }

      await electronAdapter.saveTodos(todosData)
      await electronAdapter.updateConfig(configData)

      const backup = await electronAdapter.exportBackup()

      // Clear everything
      localStorage.clear()

      // Verify storage is empty
      const emptyTodos = await electronAdapter.getTodos()
      expect(emptyTodos.active).toHaveLength(0)

      // Restore
      await electronAdapter.importBackup(backup)

      const restoredTodos = await electronAdapter.getTodos()
      expect(restoredTodos.active).toHaveLength(1)
      expect(restoredTodos.active[0].message).toBe("Round trip")

      const restoredConfig = await electronAdapter.getConfig()
      expect(restoredConfig.theme).toBe("ocean")
    })

    it("should handle partial backup data gracefully", async () => {
      // Import backup with only todos (no tags, contacts, config)
      const partialBackup = {
        todos: {
          active: [{ id: "p1", message: "Partial", completed: 0 }],
          completed: [],
        },
      }

      const result = await electronAdapter.importBackup(partialBackup)
      expect(result.status).toBe("success")

      const todos = await electronAdapter.getTodos()
      expect(todos.active).toHaveLength(1)

      // Config should still be default since it was not in backup
      const config = await electronAdapter.getConfig()
      expect(config.theme).toBe("github-dark")
    })
  })

  // ============ 10. Defensive: defaults and invalid JSON ============

  describe("Defensive behavior", () => {
    it("should return default todos when no data exists", async () => {
      const todos = await electronAdapter.getTodos()

      expect(todos).toEqual({ active: [], completed: [] })
    })

    it("should return default tags when no data exists", async () => {
      const tags = await electronAdapter.getTags()

      expect(tags).toEqual({
        companies: [],
        accountExecutives: [],
        companyAssignments: {},
        labels: [],
      })
    })

    it("should return default config when no data exists", async () => {
      const config = await electronAdapter.getConfig()

      expect(config.theme).toBe("github-dark")
      expect(config.sidebarPosition).toBe("left")
      expect(config.compactMode).toBe(false)
      expect(config.defaultView).toBe("company")
    })

    it("should return empty contacts when no data exists", async () => {
      const contacts = await electronAdapter.getContacts()

      expect(contacts).toEqual({})
    })

    it("should handle invalid JSON in todos gracefully", async () => {
      localStorage.setItem("todos", "{broken json!!!")

      // JSON.parse will throw, so getTodos should throw
      // This verifies the adapter does not silently swallow corruption
      await expect(electronAdapter.getTodos()).rejects.toThrow()
    })

    it("should handle invalid JSON in tags gracefully", async () => {
      localStorage.setItem("tags.md", "{broken json!!!")

      const tags = await electronAdapter.getTags()

      // Tags has a try/catch, so it should return safe defaults
      expect(tags).toEqual({
        companies: [],
        accountExecutives: [],
        companyAssignments: {},
        labels: [],
      })
    })

    it("should handle invalid JSON in config gracefully", async () => {
      localStorage.setItem("config", "{broken json!!!")

      // JSON.parse will throw since there is no try/catch in getConfig
      await expect(electronAdapter.getConfig()).rejects.toThrow()
    })

    it("should export defaults when storage is completely empty", async () => {
      const backup = await electronAdapter.exportBackup()

      expect(backup.todos).toEqual({ active: [], completed: [] })
      expect(backup.tags).toEqual({})
      expect(backup.contacts).toEqual({})
      expect(backup.config).toEqual({})
      expect(backup.exportedAt).toBeDefined()
    })

    it("should handle empty string in localStorage for tags", async () => {
      localStorage.setItem("tags.md", "")

      // Empty string is falsy so it should fall through to "tags" key
      // and if that is also missing, return defaults
      const tags = await electronAdapter.getTags()

      expect(tags).toEqual({
        companies: [],
        accountExecutives: [],
        companyAssignments: {},
        labels: [],
      })
    })

    it("should handle null-like values in tag arrays", async () => {
      localStorage.setItem(
        "tags.md",
        JSON.stringify({
          companies: null,
          accountExecutives: undefined,
          companyAssignments: null,
          labels: null,
        }),
      )

      const tags = await electronAdapter.getTags()

      expect(Array.isArray(tags.companies)).toBe(true)
      expect(tags.companies).toEqual([])
      expect(Array.isArray(tags.accountExecutives)).toBe(true)
      expect(tags.accountExecutives).toEqual([])
      expect(Array.isArray(tags.labels)).toBe(true)
      expect(tags.labels).toEqual([])
    })
  })

  // ============ 7. Audio messages round-trip ============

  describe("Audio messages round-trip", () => {
    it("returns empty array when nothing is stored", async () => {
      const result = await electronAdapter.getAudioMessages()
      expect(result).toEqual([])
    })

    it("saves and loads audio messages preserving all fields", async () => {
      const messages = [
        {
          id: "audio-1",
          title: "Morning standup",
          company: "Acme Corp",
          dataUrl: "data:audio/webm;base64,AAAA",
          durationSeconds: 45,
          createdAt: "2026-04-03T09:00:00.000Z",
        },
        {
          id: "audio-2",
          title: "Follow-up",
          company: "Globex",
          dataUrl: "data:audio/webm;base64,BBBB",
          durationSeconds: 120,
          createdAt: "2026-04-02T14:00:00.000Z",
        },
      ]

      await electronAdapter.saveAudioMessages(messages)
      const loaded = await electronAdapter.getAudioMessages()

      expect(loaded).toHaveLength(2)
      expect(loaded[0].id).toBe("audio-1")
      expect(loaded[0].title).toBe("Morning standup")
      expect(loaded[0].company).toBe("Acme Corp")
      expect(loaded[0].durationSeconds).toBe(45)
      expect(loaded[1].id).toBe("audio-2")
    })

    it("writes to the 'audio_messages' localStorage key", async () => {
      const messages = [{ id: "a1", title: "Test", company: "", dataUrl: "data:", durationSeconds: 10, createdAt: new Date().toISOString() }]
      await electronAdapter.saveAudioMessages(messages)
      const raw = localStorage.getItem("audio_messages")
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw)
      expect(parsed[0].id).toBe("a1")
    })

    it("overwrites previous audio messages on save", async () => {
      await electronAdapter.saveAudioMessages([{ id: "old", title: "Old", company: "", dataUrl: "data:", durationSeconds: 5, createdAt: new Date().toISOString() }])
      await electronAdapter.saveAudioMessages([{ id: "new", title: "New", company: "", dataUrl: "data:", durationSeconds: 10, createdAt: new Date().toISOString() }])
      const loaded = await electronAdapter.getAudioMessages()
      expect(loaded).toHaveLength(1)
      expect(loaded[0].id).toBe("new")
    })
  })

  // ============ 8. Emails round-trip ============

  describe("Emails round-trip", () => {
    it("returns empty array when nothing is stored", async () => {
      const result = await electronAdapter.getEmails()
      expect(result).toEqual([])
    })

    it("saves and loads emails preserving all fields", async () => {
      const emailItems = [
        {
          id: "email-1",
          type: "email",
          subject: "Budget Review",
          from: "alice@example.com",
          date: "2026-04-06T10:00:00.000Z",
          body: "Please review the budget.",
          location: "",
          company: "Acme Corp",
          fileName: "budget.eml",
        },
        {
          id: "email-2",
          type: "calendar",
          subject: "Team Standup",
          from: "Bob Smith",
          date: "2026-04-07T09:00:00.000Z",
          body: "Daily sync",
          location: "Conference Room A",
          company: "Acme Corp",
          fileName: "standup.ics",
        },
      ]

      await electronAdapter.saveEmails(emailItems)
      const loaded = await electronAdapter.getEmails()

      expect(loaded).toHaveLength(2)
      expect(loaded[0].id).toBe("email-1")
      expect(loaded[0].type).toBe("email")
      expect(loaded[0].subject).toBe("Budget Review")
      expect(loaded[0].from).toBe("alice@example.com")
      expect(loaded[1].type).toBe("calendar")
      expect(loaded[1].location).toBe("Conference Room A")
    })

    it("writes to the 'email_files' localStorage key", async () => {
      const items = [{ id: "e1", type: "email", subject: "Test", from: "", date: new Date().toISOString(), body: "", location: "", company: "", fileName: "test.eml" }]
      await electronAdapter.saveEmails(items)
      const raw = localStorage.getItem("email_files")
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw)
      expect(parsed[0].id).toBe("e1")
    })

    it("overwrites previous emails on save", async () => {
      await electronAdapter.saveEmails([{ id: "old-e", type: "email", subject: "Old", from: "", date: new Date().toISOString(), body: "", location: "", company: "", fileName: "old.eml" }])
      await electronAdapter.saveEmails([{ id: "new-e", type: "email", subject: "New", from: "", date: new Date().toISOString(), body: "", location: "", company: "", fileName: "new.eml" }])
      const loaded = await electronAdapter.getEmails()
      expect(loaded).toHaveLength(1)
      expect(loaded[0].id).toBe("new-e")
    })
  })
})
