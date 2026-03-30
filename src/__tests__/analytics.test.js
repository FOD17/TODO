import { describe, it, expect } from "vitest"
import {
  getCompanyStats,
  getCompanyPriority,
  searchTodos,
  filterTodosByCompany,
  getOverdueCount,
  getDueSoonCount,
  getCompletionRate,
} from "../utils/analytics"

describe("Analytics Tests", () => {
  const sampleTodos = {
    active: [
      {
        id: "1",
        message: "Call Wal-Mart",
        date: new Date("2026-03-30"),
        company: "Wal-Mart",
        names: ["Chris Smith"],
        accountRep: "John Doe",
        completed: false,
      },
      {
        id: "2",
        message: "Email Microsoft",
        date: new Date("2026-03-28"),
        company: "Microsoft",
        names: [],
        accountRep: "",
        completed: false,
      },
      {
        id: "3",
        message: "Follow up Apple",
        date: new Date("2026-03-25"),
        company: "Apple",
        names: ["Tim Cook"],
        accountRep: "Jane Doe",
        completed: false,
      },
    ],
    completed: [
      {
        id: "4",
        message: "Old task",
        date: new Date("2026-03-20"),
        company: "Wal-Mart",
        names: [],
        accountRep: "",
        completed: true,
      },
    ],
  }

  describe("getCompanyStats", () => {
    it("should calculate correct stats", () => {
      const stats = getCompanyStats(sampleTodos)

      expect(stats["Wal-Mart"].total).toBe(2)
      expect(stats["Wal-Mart"].active).toBe(1)
      expect(stats["Wal-Mart"].completed).toBe(1)
      expect(stats["Microsoft"].total).toBe(1)
    })

    it("should track names and account reps", () => {
      const stats = getCompanyStats(sampleTodos)

      expect(stats["Wal-Mart"].names).toContain("Chris Smith")
      expect(stats["Wal-Mart"].accountReps).toContain("John Doe")
    })

    it("should handle todos without company", () => {
      const todos = {
        active: [{ id: "1", message: "Test", company: "", completed: false }],
        completed: [],
      }

      const stats = getCompanyStats(todos)
      expect(Object.keys(stats)).not.toContain("")
    })
  })

  describe("getCompanyPriority", () => {
    it("should sort by active count descending", () => {
      const stats = {
        "Wal-Mart": { active: 5, completed: 2 },
        Microsoft: { active: 10, completed: 1 },
        Apple: { active: 3, completed: 0 },
      }

      const priority = getCompanyPriority(stats)
      expect(priority[0]).toBe("Microsoft")
      expect(priority[1]).toBe("Wal-Mart")
      expect(priority[2]).toBe("Apple")
    })
  })

  describe("searchTodos", () => {
    it("should search by message", () => {
      const results = searchTodos(sampleTodos, "Call")
      expect(results.length).toBe(1)
      expect(results[0].message).toBe("Call Wal-Mart")
    })

    it("should search by company", () => {
      const results = searchTodos(sampleTodos, "Apple")
      expect(results.length).toBe(1)
      expect(results[0].company).toBe("Apple")
    })

    it("should search by names", () => {
      const results = searchTodos(sampleTodos, "Chris")
      expect(results.length).toBe(1)
      expect(results[0].message).toBe("Call Wal-Mart")
    })

    it("should search by account rep", () => {
      const results = searchTodos(sampleTodos, "John Doe")
      expect(results.length).toBe(1)
    })

    it("should be case-insensitive", () => {
      const results = searchTodos(sampleTodos, "MICROSOFT")
      expect(results.length).toBe(1)
    })

    it("should return empty for no matches", () => {
      const results = searchTodos(sampleTodos, "NonExistent")
      expect(results.length).toBe(0)
    })
  })

  describe("filterTodosByCompany", () => {
    it("should filter todos by company", () => {
      const filtered = filterTodosByCompany(sampleTodos, "Wal-Mart")
      expect(filtered.active.length).toBe(1)
      expect(filtered.completed.length).toBe(1)
    })

    it("should return empty arrays for unknown company", () => {
      const filtered = filterTodosByCompany(sampleTodos, "Unknown")
      expect(filtered.active.length).toBe(0)
      expect(filtered.completed.length).toBe(0)
    })
  })

  describe("getOverdueCount", () => {
    it("should count overdue todos", () => {
      const today = new Date()
      const todos = {
        active: [
          {
            id: "1",
            date: new Date(today.getTime() - 86400000),
            completed: false,
          }, // Yesterday
          {
            id: "2",
            date: new Date(today.getTime() + 86400000),
            completed: false,
          }, // Tomorrow
        ],
        completed: [],
      }

      const count = getOverdueCount(todos)
      expect(count).toBe(1)
    })

    it("should not count completed todos", () => {
      const today = new Date()
      const todos = {
        active: [],
        completed: [
          {
            id: "1",
            date: new Date(today.getTime() - 86400000),
            completed: true,
          },
        ],
      }

      const count = getOverdueCount(todos)
      expect(count).toBe(0)
    })
  })

  describe("getDueSoonCount", () => {
    it("should count todos due in next 3 days", () => {
      const today = new Date()
      const todos = {
        active: [
          { id: "1", date: today, completed: false }, // Today
          {
            id: "2",
            date: new Date(today.getTime() + 86400000),
            completed: false,
          }, // Tomorrow
          {
            id: "3",
            date: new Date(today.getTime() + 7 * 86400000),
            completed: false,
          }, // Next week
        ],
        completed: [],
      }

      const count = getDueSoonCount(todos, 3)
      expect(count).toBe(2)
    })
  })

  describe("getCompletionRate", () => {
    it("should calculate completion percentage", () => {
      const todos = {
        active: [{ id: "1", completed: false }],
        completed: [{ id: "2", completed: true }],
      }

      const rate = getCompletionRate(todos)
      expect(rate).toBe(50)
    })

    it("should return 0 for no todos", () => {
      const todos = { active: [], completed: [] }
      const rate = getCompletionRate(todos)
      expect(rate).toBe(0)
    })

    it("should return 100 for all completed", () => {
      const todos = {
        active: [],
        completed: [{ id: "1", completed: true }],
      }

      const rate = getCompletionRate(todos)
      expect(rate).toBe(100)
    })
  })
})
