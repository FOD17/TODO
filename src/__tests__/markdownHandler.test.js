import { describe, it, expect, beforeEach } from "vitest"
import {
  parseMarkdownFile,
  generateMarkdownContent,
  parseTagsFile,
  generateTagsContent,
} from "../utils/markdownHandler"

describe("Markdown Handler Tests", () => {
  describe("parseMarkdownFile", () => {
    it("should parse empty markdown content", () => {
      const result = parseMarkdownFile("")
      expect(result.active).toEqual([])
      expect(result.completed).toEqual([])
    })

    it("should parse active todos", () => {
      const content = `# ACTIVE TODOS

- [ ] Call Wal-Mart | Date: 2026-03-27 | Company: Wal-Mart | Names: Chris Smith | Account Rep: John Doe

# COMPLETED TODOS`

      const result = parseMarkdownFile(content)
      expect(result.active.length).toBe(1)
      expect(result.active[0].message).toBe("Call Wal-Mart")
      expect(result.active[0].completed).toBe(false)
      expect(result.active[0].company).toBe("Wal-Mart")
      expect(result.active[0].names).toContain("Chris Smith")
      expect(result.active[0].accountRep).toBe("John Doe")
    })

    it("should parse completed todos", () => {
      const content = `# ACTIVE TODOS

# COMPLETED TODOS

- [x] Old task | Date: 2026-03-20 | Company: Microsoft`

      const result = parseMarkdownFile(content)
      expect(result.completed.length).toBe(1)
      expect(result.completed[0].message).toBe("Old task")
      expect(result.completed[0].completed).toBe(true)
    })

    it("should handle multiple names", () => {
      const content = `# ACTIVE TODOS

- [ ] Task | Date: 2026-03-27 | Company: Apple | Names: Steve Jobs, Tim Cook

# COMPLETED TODOS`

      const result = parseMarkdownFile(content)
      expect(result.active[0].names).toEqual(["Steve Jobs", "Tim Cook"])
    })

    it("should handle missing optional fields", () => {
      const content = `# ACTIVE TODOS

- [ ] Simple task | Date: 2026-03-27

# COMPLETED TODOS`

      const result = parseMarkdownFile(content)
      expect(result.active[0].message).toBe("Simple task")
      expect(result.active[0].company).toBe("")
      expect(result.active[0].names).toEqual([])
      expect(result.active[0].accountRep).toBe("")
    })
  })

  describe("generateMarkdownContent", () => {
    it("should generate correct markdown format", () => {
      const todos = {
        active: [
          {
            id: "1",
            message: "Test",
            date: new Date("2026-03-27"),
            company: "Test Corp",
            names: [],
            accountRep: "Bob",
            completed: false,
          },
        ],
        completed: [],
      }

      const content = generateMarkdownContent(todos)
      expect(content).toContain("# ACTIVE TODOS")
      expect(content).toContain("# COMPLETED TODOS")
      expect(content).toContain("Test")
      expect(content).toContain("Test Corp")
      expect(content).toContain("Bob")
    })

    it("should sort todos by date descending", () => {
      const todos = {
        active: [
          {
            id: "1",
            message: "First",
            date: new Date("2026-03-25"),
            company: "",
            names: [],
            accountRep: "",
            completed: false,
          },
          {
            id: "2",
            message: "Second",
            date: new Date("2026-03-27"),
            company: "",
            names: [],
            accountRep: "",
            completed: false,
          },
        ],
        completed: [],
      }

      const content = generateMarkdownContent(todos)
      const firstIndex = content.indexOf("Second")
      const secondIndex = content.indexOf("First")
      expect(firstIndex).toBeLessThan(secondIndex)
    })

    it("should handle multiple names in output", () => {
      const todos = {
        active: [
          {
            id: "1",
            message: "Task",
            date: new Date("2026-03-27"),
            company: "Corp",
            names: ["Alice", "Bob"],
            accountRep: "",
            completed: false,
          },
        ],
        completed: [],
      }

      const content = generateMarkdownContent(todos)
      expect(content).toContain("Alice, Bob")
    })
  })

  describe("parseTagsFile", () => {
    it("should parse empty tags content", () => {
      const result = parseTagsFile("")
      expect(result).toEqual({})
    })

    it("should parse company tags", () => {
      const content = `## Wal-Mart
- Wal-Mart: Chris Smith
- Wal-Mart: John Doe
- General

## Microsoft
- Microsoft: Bill Gates`

      const result = parseTagsFile(content)
      expect(result["Wal-Mart"]).toContain("Wal-Mart: Chris Smith")
      expect(result["Wal-Mart"]).toContain("General")
      expect(result["Microsoft"]).toContain("Microsoft: Bill Gates")
    })
  })

  describe("generateTagsContent", () => {
    it("should generate markdown tags format", () => {
      const tags = {
        "Wal-Mart": ["Wal-Mart: Chris Smith", "General"],
        Microsoft: ["Microsoft: Bill Gates"],
      }

      const content = generateTagsContent(tags)
      expect(content).toContain("## Wal-Mart")
      expect(content).toContain("## Microsoft")
      expect(content).toContain("- Wal-Mart: Chris Smith")
    })

    it("should sort companies alphabetically", () => {
      const tags = {
        "Zebra Corp": [],
        "Apple Inc": [],
      }

      const content = generateTagsContent(tags)
      const appleIndex = content.indexOf("## Apple Inc")
      const zebraIndex = content.indexOf("## Zebra Corp")
      expect(appleIndex).toBeLessThan(zebraIndex)
    })
  })

  describe("Round-trip parsing", () => {
    it("should preserve data through parse and generate cycle", () => {
      const original = {
        active: [
          {
            id: "1",
            message: "Important task",
            date: new Date("2026-03-27"),
            company: "Wal-Mart",
            names: ["Chris Smith", "Jane Doe"],
            accountRep: "John Doe",
            completed: false,
          },
        ],
        completed: [
          {
            id: "2",
            message: "Old task",
            date: new Date("2026-03-20"),
            company: "3M",
            names: [],
            accountRep: "Alice",
            completed: true,
          },
        ],
      }

      const generated = generateMarkdownContent(original)
      const parsed = parseMarkdownFile(generated)

      expect(parsed.active.length).toBe(1)
      expect(parsed.active[0].message).toBe("Important task")
      expect(parsed.active[0].company).toBe("Wal-Mart")
      expect(parsed.active[0].names).toEqual(["Chris Smith", "Jane Doe"])

      expect(parsed.completed.length).toBe(1)
      expect(parsed.completed[0].message).toBe("Old task")
    })
  })
})
