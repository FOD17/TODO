import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  createTagsStore,
  addCompany,
  removeCompany,
  addAccountExecutive,
  updateAccountExecutive,
  removeAccountExecutive,
  assignCompanyToAE,
  unassignCompany,
  getCompanies,
  getAccountExecutives,
  getCompanyAssignments,
  addLabel,
  updateLabel,
  removeLabel,
  getLabels,
  parseLabel,
  groupLabelsByTag,
} from "../utils/tagManager"

describe("Tag Manager", () => {
  let tagsData

  beforeEach(() => {
    tagsData = createTagsStore()
  })

  // ============================================================
  // 1. Company CRUD
  // ============================================================
  describe("Company CRUD", () => {
    it("should add a company to an empty list", () => {
      const result = addCompany(tagsData, "Acme Corp")
      expect(result.companies).toEqual(["Acme Corp"])
    })

    it("should keep companies sorted alphabetically after adding", () => {
      let result = addCompany(tagsData, "Zebra Inc")
      result = addCompany(result, "Alpha LLC")
      result = addCompany(result, "MidCo")
      expect(result.companies).toEqual(["Alpha LLC", "MidCo", "Zebra Inc"])
    })

    it("should not add duplicate company names", () => {
      let result = addCompany(tagsData, "Acme Corp")
      const resultAfterDup = addCompany(result, "Acme Corp")
      expect(resultAfterDup.companies).toEqual(["Acme Corp"])
      // Should return the same reference when duplicate
      expect(resultAfterDup).toBe(result)
    })

    it("should remove an existing company", () => {
      let result = addCompany(tagsData, "Acme Corp")
      result = addCompany(result, "Beta Ltd")
      result = removeCompany(result, "Acme Corp")
      expect(result.companies).toEqual(["Beta Ltd"])
    })

    it("should handle removing a company that does not exist", () => {
      let result = addCompany(tagsData, "Acme Corp")
      result = removeCompany(result, "NonExistent")
      expect(result.companies).toEqual(["Acme Corp"])
    })

    it("should handle removing from an empty companies list", () => {
      const result = removeCompany(tagsData, "Anything")
      expect(result.companies).toEqual([])
    })

    it("should return a new object (immutability) when adding a company", () => {
      const result = addCompany(tagsData, "Acme Corp")
      expect(result).not.toBe(tagsData)
    })

    it("should return a new object (immutability) when removing a company", () => {
      let result = addCompany(tagsData, "Acme Corp")
      const afterRemove = removeCompany(result, "Acme Corp")
      expect(afterRemove).not.toBe(result)
    })

    it("should handle adding a company when companies field is missing", () => {
      const result = addCompany({}, "Acme Corp")
      expect(result.companies).toEqual(["Acme Corp"])
    })
  })

  // ============================================================
  // 2. Account Executive CRUD
  // ============================================================
  describe("Account Executive CRUD", () => {
    it("should add an account executive with a generated id", () => {
      const result = addAccountExecutive(tagsData, "Alice Smith", "alice@example.com")
      expect(result.accountExecutives).toHaveLength(1)
      expect(result.accountExecutives[0].name).toBe("Alice Smith")
      expect(result.accountExecutives[0].email).toBe("alice@example.com")
      expect(result.accountExecutives[0].id).toBeDefined()
    })

    it("should default email to empty string when not provided", () => {
      const result = addAccountExecutive(tagsData, "Bob Jones")
      expect(result.accountExecutives[0].email).toBe("")
    })

    it("should sort account executives by name", () => {
      let result = addAccountExecutive(tagsData, "Zara", "zara@test.com")
      result = addAccountExecutive(result, "Alice", "alice@test.com")
      result = addAccountExecutive(result, "Mike", "mike@test.com")
      const names = result.accountExecutives.map((ae) => ae.name)
      expect(names).toEqual(["Alice", "Mike", "Zara"])
    })

    it("should update an existing account executive by id", () => {
      let result = addAccountExecutive(tagsData, "Alice", "alice@old.com")
      const aeId = result.accountExecutives[0].id
      result = updateAccountExecutive(result, aeId, "Alice Updated", "alice@new.com")
      expect(result.accountExecutives[0].name).toBe("Alice Updated")
      expect(result.accountExecutives[0].email).toBe("alice@new.com")
      expect(result.accountExecutives[0].id).toBe(aeId)
    })

    it("should default email to empty string when updating without email", () => {
      let result = addAccountExecutive(tagsData, "Alice", "alice@old.com")
      const aeId = result.accountExecutives[0].id
      result = updateAccountExecutive(result, aeId, "Alice Updated")
      expect(result.accountExecutives[0].email).toBe("")
    })

    it("should not alter other AEs when updating one", () => {
      vi.spyOn(Date, "now")
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2000)
      let result = addAccountExecutive(tagsData, "Alice", "alice@test.com")
      result = addAccountExecutive(result, "Bob", "bob@test.com")
      vi.restoreAllMocks()

      const bobId = result.accountExecutives.find((ae) => ae.name === "Bob").id
      result = updateAccountExecutive(result, bobId, "Bob Updated", "bob@new.com")

      const alice = result.accountExecutives.find((ae) => ae.name === "Alice")
      expect(alice.email).toBe("alice@test.com")
    })

    it("should remove an account executive by id", () => {
      let result = addAccountExecutive(tagsData, "Alice", "alice@test.com")
      const aeId = result.accountExecutives[0].id
      result = removeAccountExecutive(result, aeId)
      expect(result.accountExecutives).toHaveLength(0)
    })

    it("should handle removing a non-existent AE id gracefully", () => {
      let result = addAccountExecutive(tagsData, "Alice", "alice@test.com")
      result = removeAccountExecutive(result, "non-existent-id")
      expect(result.accountExecutives).toHaveLength(1)
    })

    it("should return a new object (immutability) when adding an AE", () => {
      const result = addAccountExecutive(tagsData, "Alice")
      expect(result).not.toBe(tagsData)
    })

    it("should handle adding an AE when accountExecutives field is missing", () => {
      const result = addAccountExecutive({}, "Alice", "a@b.com")
      expect(result.accountExecutives).toHaveLength(1)
      expect(result.accountExecutives[0].name).toBe("Alice")
    })
  })

  // ============================================================
  // 3. Company-AE Assignments
  // ============================================================
  describe("Company-AE Assignments", () => {
    it("should assign a company to an AE", () => {
      let result = addCompany(tagsData, "Acme Corp")
      result = addAccountExecutive(result, "Alice")
      const aeId = result.accountExecutives[0].id
      result = assignCompanyToAE(result, "Acme Corp", aeId)
      expect(result.companyAssignments["Acme Corp"]).toBe(aeId)
    })

    it("should overwrite an existing assignment for the same company", () => {
      vi.spyOn(Date, "now")
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2000)
      let result = addAccountExecutive(tagsData, "Alice")
      result = addAccountExecutive(result, "Bob")
      vi.restoreAllMocks()

      const aliceId = result.accountExecutives.find((ae) => ae.name === "Alice").id
      const bobId = result.accountExecutives.find((ae) => ae.name === "Bob").id

      result = assignCompanyToAE(result, "Acme Corp", aliceId)
      result = assignCompanyToAE(result, "Acme Corp", bobId)
      expect(result.companyAssignments["Acme Corp"]).toBe(bobId)
    })

    it("should support multiple company assignments simultaneously", () => {
      let result = addAccountExecutive(tagsData, "Alice")
      const aeId = result.accountExecutives[0].id
      result = assignCompanyToAE(result, "Acme Corp", aeId)
      result = assignCompanyToAE(result, "Beta Ltd", aeId)
      expect(Object.keys(result.companyAssignments)).toHaveLength(2)
      expect(result.companyAssignments["Acme Corp"]).toBe(aeId)
      expect(result.companyAssignments["Beta Ltd"]).toBe(aeId)
    })

    it("should unassign a company", () => {
      let result = addAccountExecutive(tagsData, "Alice")
      const aeId = result.accountExecutives[0].id
      result = assignCompanyToAE(result, "Acme Corp", aeId)
      result = unassignCompany(result, "Acme Corp")
      expect(result.companyAssignments["Acme Corp"]).toBeUndefined()
    })

    it("should not affect other assignments when unassigning one company", () => {
      let result = addAccountExecutive(tagsData, "Alice")
      const aeId = result.accountExecutives[0].id
      result = assignCompanyToAE(result, "Acme Corp", aeId)
      result = assignCompanyToAE(result, "Beta Ltd", aeId)
      result = unassignCompany(result, "Acme Corp")
      expect(result.companyAssignments["Beta Ltd"]).toBe(aeId)
      expect(result.companyAssignments["Acme Corp"]).toBeUndefined()
    })

    it("should handle unassigning a company that was never assigned", () => {
      const result = unassignCompany(tagsData, "NonExistent")
      expect(result.companyAssignments).toEqual({})
    })

    it("should return a new object (immutability) when assigning", () => {
      const result = assignCompanyToAE(tagsData, "Acme Corp", "ae1")
      expect(result).not.toBe(tagsData)
    })

    it("should return a new object (immutability) when unassigning", () => {
      let result = assignCompanyToAE(tagsData, "Acme Corp", "ae1")
      const afterUnassign = unassignCompany(result, "Acme Corp")
      expect(afterUnassign).not.toBe(result)
    })

    it("should handle assigning when companyAssignments field is missing", () => {
      const result = assignCompanyToAE({}, "Acme Corp", "ae1")
      expect(result.companyAssignments["Acme Corp"]).toBe("ae1")
    })
  })

  // ============================================================
  // 4. Getter Functions (defensive fallbacks)
  // ============================================================
  describe("Getter Functions", () => {
    it("getCompanies should return companies array", () => {
      const result = addCompany(tagsData, "Acme Corp")
      expect(getCompanies(result)).toEqual(["Acme Corp"])
    })

    it("getCompanies should return empty array when companies is undefined", () => {
      expect(getCompanies({})).toEqual([])
    })

    it("getCompanies should return empty array for a fresh store", () => {
      expect(getCompanies(tagsData)).toEqual([])
    })

    it("getAccountExecutives should return account executives array", () => {
      const result = addAccountExecutive(tagsData, "Alice", "a@b.com")
      const aes = getAccountExecutives(result)
      expect(aes).toHaveLength(1)
      expect(aes[0].name).toBe("Alice")
    })

    it("getAccountExecutives should return empty array when field is undefined", () => {
      expect(getAccountExecutives({})).toEqual([])
    })

    it("getCompanyAssignments should return assignments object", () => {
      const result = assignCompanyToAE(tagsData, "Acme Corp", "ae1")
      expect(getCompanyAssignments(result)).toEqual({ "Acme Corp": "ae1" })
    })

    it("getCompanyAssignments should return empty object when field is undefined", () => {
      expect(getCompanyAssignments({})).toEqual({})
    })

    it("getLabels should return labels array", () => {
      const result = addLabel(tagsData, "priority:high", "#ff0000")
      expect(getLabels(result)).toHaveLength(1)
    })

    it("getLabels should return empty array when field is undefined", () => {
      expect(getLabels({})).toEqual([])
    })
  })

  // ============================================================
  // 5. Label CRUD
  // ============================================================
  describe("Label CRUD", () => {
    it("should add a label with name, color, and generated id", () => {
      const result = addLabel(tagsData, "priority:high", "#ff0000")
      expect(result.labels).toHaveLength(1)
      expect(result.labels[0].name).toBe("priority:high")
      expect(result.labels[0].color).toBe("#ff0000")
      expect(result.labels[0].id).toBeDefined()
    })

    it("should use default color when none is provided", () => {
      const result = addLabel(tagsData, "status:open")
      expect(result.labels[0].color).toBe("#3498db")
    })

    it("should not add a label with a duplicate name", () => {
      let result = addLabel(tagsData, "priority:high", "#ff0000")
      const resultAfterDup = addLabel(result, "priority:high", "#00ff00")
      expect(resultAfterDup.labels).toHaveLength(1)
      // Should return the same reference on duplicate
      expect(resultAfterDup).toBe(result)
    })

    it("should allow labels with different names", () => {
      let result = addLabel(tagsData, "priority:high", "#ff0000")
      result = addLabel(result, "priority:low", "#00ff00")
      result = addLabel(result, "status:open", "#0000ff")
      expect(result.labels).toHaveLength(3)
    })

    it("should update an existing label by id", () => {
      let result = addLabel(tagsData, "priority:high", "#ff0000")
      const labelId = result.labels[0].id
      result = updateLabel(result, labelId, "priority:critical", "#990000")
      expect(result.labels[0].name).toBe("priority:critical")
      expect(result.labels[0].color).toBe("#990000")
      expect(result.labels[0].id).toBe(labelId)
    })

    it("should not alter other labels when updating one", () => {
      vi.spyOn(Date, "now")
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2000)
      let result = addLabel(tagsData, "priority:high", "#ff0000")
      result = addLabel(result, "status:open", "#00ff00")
      vi.restoreAllMocks()

      const firstId = result.labels[0].id
      result = updateLabel(result, firstId, "priority:critical", "#990000")

      const statusLabel = result.labels.find((l) => l.name === "status:open")
      expect(statusLabel).toBeDefined()
      expect(statusLabel.color).toBe("#00ff00")
    })

    it("should remove a label by id", () => {
      let result = addLabel(tagsData, "priority:high", "#ff0000")
      const labelId = result.labels[0].id
      result = removeLabel(result, labelId)
      expect(result.labels).toHaveLength(0)
    })

    it("should handle removing a non-existent label id gracefully", () => {
      let result = addLabel(tagsData, "priority:high", "#ff0000")
      result = removeLabel(result, "non-existent-id")
      expect(result.labels).toHaveLength(1)
    })

    it("should return a new object (immutability) when adding a label", () => {
      const result = addLabel(tagsData, "priority:high")
      expect(result).not.toBe(tagsData)
    })

    it("should return a new object (immutability) when removing a label", () => {
      let result = addLabel(tagsData, "priority:high")
      const afterRemove = removeLabel(result, result.labels[0].id)
      expect(afterRemove).not.toBe(result)
    })

    it("should handle adding a label when labels field is missing", () => {
      const result = addLabel({}, "priority:high", "#ff0000")
      expect(result.labels).toHaveLength(1)
      expect(result.labels[0].name).toBe("priority:high")
    })
  })

  // ============================================================
  // 6. parseLabel
  // ============================================================
  describe("parseLabel", () => {
    it("should split a scoped label with a colon into tag and subtag", () => {
      const result = parseLabel("priority:high")
      expect(result).toEqual({ tag: "priority", subtag: "high" })
    })

    it("should return the full name as tag with null subtag when no colon", () => {
      const result = parseLabel("urgent")
      expect(result).toEqual({ tag: "urgent", subtag: null })
    })

    it("should handle a colon at the beginning of the string", () => {
      const result = parseLabel(":value")
      expect(result).toEqual({ tag: "", subtag: "value" })
    })

    it("should handle a colon at the end of the string", () => {
      const result = parseLabel("prefix:")
      expect(result).toEqual({ tag: "prefix", subtag: "" })
    })

    it("should only split on the first colon when multiple colons are present", () => {
      const result = parseLabel("scope:sub:detail")
      expect(result).toEqual({ tag: "scope", subtag: "sub:detail" })
    })

    it("should handle an empty string", () => {
      const result = parseLabel("")
      expect(result).toEqual({ tag: "", subtag: null })
    })

    it("should handle a single colon", () => {
      const result = parseLabel(":")
      expect(result).toEqual({ tag: "", subtag: "" })
    })
  })

  // ============================================================
  // 7. groupLabelsByTag
  // ============================================================
  describe("groupLabelsByTag", () => {
    it("should group labels by their tag prefix", () => {
      const labels = [
        { id: "1", name: "priority:high", color: "#ff0000" },
        { id: "2", name: "priority:low", color: "#00ff00" },
        { id: "3", name: "status:open", color: "#0000ff" },
      ]
      const groups = groupLabelsByTag(labels)
      expect(Object.keys(groups)).toHaveLength(2)
      expect(groups["priority"]).toHaveLength(2)
      expect(groups["status"]).toHaveLength(1)
    })

    it("should place unscoped labels under their full name as tag", () => {
      const labels = [
        { id: "1", name: "urgent", color: "#ff0000" },
        { id: "2", name: "blocked", color: "#ff0000" },
      ]
      const groups = groupLabelsByTag(labels)
      expect(groups["urgent"]).toHaveLength(1)
      expect(groups["blocked"]).toHaveLength(1)
    })

    it("should handle a single label", () => {
      const labels = [{ id: "1", name: "priority:high", color: "#ff0000" }]
      const groups = groupLabelsByTag(labels)
      expect(Object.keys(groups)).toHaveLength(1)
      expect(groups["priority"]).toHaveLength(1)
      expect(groups["priority"][0].id).toBe("1")
    })

    it("should return an empty object for an empty array", () => {
      const groups = groupLabelsByTag([])
      expect(groups).toEqual({})
    })

    it("should handle a mix of scoped and unscoped labels", () => {
      const labels = [
        { id: "1", name: "priority:high", color: "#ff0000" },
        { id: "2", name: "urgent", color: "#ff0000" },
        { id: "3", name: "priority:low", color: "#00ff00" },
      ]
      const groups = groupLabelsByTag(labels)
      expect(groups["priority"]).toHaveLength(2)
      expect(groups["urgent"]).toHaveLength(1)
    })

    it("should preserve the full label objects in groups", () => {
      const labels = [
        { id: "1", name: "env:prod", color: "#ff0000" },
      ]
      const groups = groupLabelsByTag(labels)
      expect(groups["env"][0]).toEqual({ id: "1", name: "env:prod", color: "#ff0000" })
    })
  })

  // ============================================================
  // 8. Defensive Handling
  // ============================================================
  describe("Defensive Handling", () => {
    it("addCompany should handle tagsData with no companies field", () => {
      const result = addCompany({}, "Test")
      expect(result.companies).toEqual(["Test"])
    })

    it("removeCompany should handle tagsData with no companies field", () => {
      const result = removeCompany({}, "Test")
      expect(result.companies).toEqual([])
    })

    it("addAccountExecutive should handle tagsData with no accountExecutives field", () => {
      const result = addAccountExecutive({}, "Alice")
      expect(result.accountExecutives).toHaveLength(1)
    })

    it("updateAccountExecutive should handle tagsData with no accountExecutives field", () => {
      const result = updateAccountExecutive({}, "some-id", "Alice")
      expect(result.accountExecutives).toEqual([])
    })

    it("removeAccountExecutive should handle tagsData with no accountExecutives field", () => {
      const result = removeAccountExecutive({}, "some-id")
      expect(result.accountExecutives).toEqual([])
    })

    it("assignCompanyToAE should handle tagsData with no companyAssignments field", () => {
      const result = assignCompanyToAE({}, "Acme", "ae1")
      expect(result.companyAssignments).toEqual({ Acme: "ae1" })
    })

    it("unassignCompany should handle tagsData with no companyAssignments field", () => {
      const result = unassignCompany({}, "Acme")
      expect(result.companyAssignments).toEqual({})
    })

    it("addLabel should handle tagsData with no labels field", () => {
      const result = addLabel({}, "test-label")
      expect(result.labels).toHaveLength(1)
    })

    it("updateLabel should handle tagsData with no labels field", () => {
      const result = updateLabel({}, "some-id", "test", "#000")
      expect(result.labels).toEqual([])
    })

    it("removeLabel should handle tagsData with no labels field", () => {
      const result = removeLabel({}, "some-id")
      expect(result.labels).toEqual([])
    })

    it("should preserve other properties on tagsData when mutating", () => {
      const data = { companies: [], customField: "keep-me" }
      const result = addCompany(data, "Acme Corp")
      expect(result.customField).toBe("keep-me")
    })

    it("createTagsStore should return a fresh store with empty arrays", () => {
      const store = createTagsStore()
      expect(store.companies).toEqual([])
      expect(store.accountExecutives).toEqual([])
    })
  })
})
