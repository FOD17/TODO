import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent, within } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import EmailsTab from "../components/EmailsTab"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EML_TEXT = `From: alice@example.com
Subject: Budget Review
Date: Mon, 06 Apr 2026 10:00:00 +0000

Please review the attached budget document.`

const ICS_TEXT = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Quarterly Planning
DTSTART:20260410T140000Z
DESCRIPTION:Q2 planning session with leadership
ORGANIZER;CN=Bob Smith:mailto:bob@example.com
LOCATION:Board Room
END:VEVENT
END:VCALENDAR`

const BASE_EMAILS = [
  {
    id: "e1",
    type: "email",
    subject: "Budget Review",
    from: "alice@example.com",
    date: "2026-04-06T10:00:00.000Z",
    body: "Please review the attached budget document.",
    location: "",
    company: "Acme Corp",
    fileName: "budget.eml",
  },
  {
    id: "e2",
    type: "calendar",
    subject: "Quarterly Planning",
    from: "Bob Smith",
    date: "2026-04-10T14:00:00.000Z",
    body: "Q2 planning session with leadership",
    location: "Board Room",
    company: "Acme Corp",
    fileName: "planning.ics",
  },
  {
    id: "e3",
    type: "email",
    subject: "Globex Newsletter",
    from: "news@globex.com",
    date: "2026-04-05T08:00:00.000Z",
    body: "This month's updates from Globex.",
    location: "",
    company: "Globex",
    fileName: "newsletter.eml",
  },
]

// ---------------------------------------------------------------------------
// FileReader mock helper
// ---------------------------------------------------------------------------

function mockFileReaderWith(text) {
  const fr = {
    readAsText: vi.fn(function () {
      this.result = text
      if (this.onload) this.onload({ target: this })
    }),
    result: null,
    onload: null,
  }
  return fr
}

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

const renderTab = (props = {}) => {
  const defaults = {
    company: "All",
    emails: [],
    onAddEmails: vi.fn(),
    onDeleteEmails: vi.fn(),
  }
  return render(<EmailsTab {...defaults} {...props} />)
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.spyOn(window, "open").mockReturnValue({
    document: { write: vi.fn(), close: vi.fn() },
    focus: vi.fn(),
    print: vi.fn(),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EmailsTab", () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders the upload zone", () => {
    renderTab()
    expect(screen.getByText(/drop .eml or .ics/i)).toBeInTheDocument()
  })

  it("shows empty state when no emails match the company", () => {
    renderTab({ company: "Acme Corp", emails: [] })
    expect(screen.getByText(/no emails or calendar items/i)).toBeInTheDocument()
  })

  it("renders all emails when company is 'All'", () => {
    renderTab({ company: "All", emails: BASE_EMAILS })
    expect(screen.getByText("Budget Review")).toBeInTheDocument()
    expect(screen.getByText("Quarterly Planning")).toBeInTheDocument()
    expect(screen.getByText("Globex Newsletter")).toBeInTheDocument()
  })

  it("filters emails by company", () => {
    renderTab({ company: "Acme Corp", emails: BASE_EMAILS })
    expect(screen.getByText("Budget Review")).toBeInTheDocument()
    expect(screen.getByText("Quarterly Planning")).toBeInTheDocument()
    expect(screen.queryByText("Globex Newsletter")).not.toBeInTheDocument()
  })

  it("shows email type icon (📧) for email items", () => {
    renderTab({ company: "All", emails: [BASE_EMAILS[0]] })
    expect(screen.getByText("📧")).toBeInTheDocument()
  })

  it("shows calendar type icon (📅) for calendar items", () => {
    renderTab({ company: "All", emails: [BASE_EMAILS[1]] })
    expect(screen.getByText("📅")).toBeInTheDocument()
  })

  it("displays from, date, and body preview", () => {
    renderTab({ company: "All", emails: [BASE_EMAILS[0]] })
    expect(screen.getByText("alice@example.com")).toBeInTheDocument()
    expect(screen.getByText(/Please review/i)).toBeInTheDocument()
  })

  it("displays location for calendar items", () => {
    renderTab({ company: "All", emails: [BASE_EMAILS[1]] })
    expect(screen.getByText(/Board Room/i)).toBeInTheDocument()
  })

  // ── File upload ────────────────────────────────────────────────────────────

  it("calls onAddEmails with parsed EML data on file upload", () => {
    const onAdd = vi.fn()
    // Intercept FileReader to inject EML text
    global.FileReader = vi.fn(() => mockFileReaderWith(EML_TEXT))

    renderTab({ company: "Acme Corp", onAddEmails: onAdd })

    const input = document.querySelector("input[type='file']")
    const file = new File([EML_TEXT], "test.eml", { type: "message/rfc822" })
    fireEvent.change(input, { target: { files: [file] } })

    expect(onAdd).toHaveBeenCalledOnce()
    const [items] = onAdd.mock.calls[0]
    expect(items).toHaveLength(1)
    expect(items[0].type).toBe("email")
    expect(items[0].subject).toBe("Budget Review")
    expect(items[0].company).toBe("Acme Corp")
    expect(items[0].fileName).toBe("test.eml")
  })

  it("calls onAddEmails with parsed ICS data on file upload", () => {
    const onAdd = vi.fn()
    global.FileReader = vi.fn(() => mockFileReaderWith(ICS_TEXT))

    renderTab({ company: "Globex", onAddEmails: onAdd })

    const input = document.querySelector("input[type='file']")
    const file = new File([ICS_TEXT], "event.ics", { type: "text/calendar" })
    fireEvent.change(input, { target: { files: [file] } })

    expect(onAdd).toHaveBeenCalledOnce()
    const [items] = onAdd.mock.calls[0]
    expect(items[0].type).toBe("calendar")
    expect(items[0].subject).toBe("Quarterly Planning")
    expect(items[0].company).toBe("Globex")
  })

  it("ignores files with unsupported extensions", () => {
    const onAdd = vi.fn()
    renderTab({ onAddEmails: onAdd })

    const input = document.querySelector("input[type='file']")
    const file = new File(["content"], "document.pdf", { type: "application/pdf" })
    fireEvent.change(input, { target: { files: [file] } })

    expect(onAdd).not.toHaveBeenCalled()
  })

  // ── Selection ──────────────────────────────────────────────────────────────

  it("toggles item selection when row is clicked", () => {
    renderTab({ company: "All", emails: BASE_EMAILS })
    const rows = screen.getAllByRole("checkbox")
    expect(rows[0]).not.toBeChecked()
    fireEvent.click(rows[0])
    expect(rows[0]).toBeChecked()
  })

  it("Select All button selects all visible items", () => {
    renderTab({ company: "Acme Corp", emails: BASE_EMAILS })
    fireEvent.click(screen.getByRole("button", { name: /select all/i }))
    const checkboxes = screen.getAllByRole("checkbox")
    checkboxes.forEach((cb) => expect(cb).toBeChecked())
  })

  it("Clear button deselects all items", () => {
    renderTab({ company: "Acme Corp", emails: BASE_EMAILS })
    // Select all first
    fireEvent.click(screen.getByRole("button", { name: /select all/i }))
    fireEvent.click(screen.getByRole("button", { name: /^clear$/i }))
    const checkboxes = screen.getAllByRole("checkbox")
    checkboxes.forEach((cb) => expect(cb).not.toBeChecked())
  })

  // ── Date range filter ──────────────────────────────────────────────────────

  it("hides items outside the from-date filter", () => {
    renderTab({ company: "All", emails: BASE_EMAILS })
    // Set fromDate to 2026-04-07 — should hide e1 (Apr 6) and e3 (Apr 5)
    const [fromInput] = document.querySelectorAll("input[type='date']")
    fireEvent.change(fromInput, { target: { value: "2026-04-07" } })

    expect(screen.queryByText("Budget Review")).not.toBeInTheDocument()
    expect(screen.queryByText("Globex Newsletter")).not.toBeInTheDocument()
    expect(screen.getByText("Quarterly Planning")).toBeInTheDocument()
  })

  it("hides items outside the to-date filter", () => {
    renderTab({ company: "All", emails: BASE_EMAILS })
    const [, toInput] = document.querySelectorAll("input[type='date']")
    // toDate = 2026-04-07, should hide e2 (Apr 10)
    fireEvent.change(toInput, { target: { value: "2026-04-07" } })

    expect(screen.queryByText("Quarterly Planning")).not.toBeInTheDocument()
    expect(screen.getByText("Budget Review")).toBeInTheDocument()
  })

  it("Clear filter button resets date range and shows all items", () => {
    renderTab({ company: "All", emails: BASE_EMAILS })
    const [fromInput] = document.querySelectorAll("input[type='date']")
    fireEvent.change(fromInput, { target: { value: "2026-04-09" } })
    // Only Quarterly Planning visible now
    expect(screen.queryByText("Budget Review")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /clear filter/i }))
    expect(screen.getByText("Budget Review")).toBeInTheDocument()
  })

  // ── Delete ─────────────────────────────────────────────────────────────────

  it("calls onDeleteEmails with selected ids and clears selection", () => {
    const onDelete = vi.fn()
    renderTab({ company: "Acme Corp", emails: BASE_EMAILS, onDeleteEmails: onDelete })

    // Select first item (e1 - Budget Review)
    fireEvent.click(screen.getAllByRole("checkbox")[0])
    fireEvent.click(screen.getByRole("button", { name: /delete/i }))

    expect(onDelete).toHaveBeenCalledOnce()
    expect(onDelete.mock.calls[0][0]).toContain("e1")

    // Selection should be cleared
    const checkboxes = screen.getAllByRole("checkbox")
    checkboxes.forEach((cb) => expect(cb).not.toBeChecked())
  })

  it("Delete button is disabled when nothing is selected", () => {
    renderTab({ company: "All", emails: BASE_EMAILS })
    expect(screen.getByRole("button", { name: /delete \(0\)/i })).toBeDisabled()
  })

  // ── PDF Export ─────────────────────────────────────────────────────────────

  it("Export PDF button is disabled when nothing is selected", () => {
    renderTab({ company: "All", emails: BASE_EMAILS })
    expect(screen.getByRole("button", { name: /export pdf \(0\)/i })).toBeDisabled()
  })

  it("calls window.open and print when Export PDF is clicked with selections", () => {
    renderTab({ company: "Acme Corp", emails: BASE_EMAILS })
    fireEvent.click(screen.getByRole("button", { name: /select all/i }))
    fireEvent.click(screen.getByRole("button", { name: /export pdf/i }))

    expect(window.open).toHaveBeenCalledWith("", "_blank")
    const winMock = window.open.mock.results[0].value
    expect(winMock.document.write).toHaveBeenCalled()
    expect(winMock.print).toHaveBeenCalled()
  })

  it("exported HTML contains selected item subjects", () => {
    renderTab({ company: "Acme Corp", emails: BASE_EMAILS })
    fireEvent.click(screen.getByRole("button", { name: /select all/i }))
    fireEvent.click(screen.getByRole("button", { name: /export pdf/i }))

    const winMock = window.open.mock.results[0].value
    const writtenHtml = winMock.document.write.mock.calls[0][0]
    expect(writtenHtml).toContain("Budget Review")
    expect(writtenHtml).toContain("Quarterly Planning")
  })

  it("Export PDF only includes selected (not all visible) items", () => {
    renderTab({ company: "All", emails: BASE_EMAILS })
    // Select only the first item (Budget Review)
    fireEvent.click(screen.getAllByRole("checkbox")[0])
    fireEvent.click(screen.getByRole("button", { name: /export pdf/i }))

    const winMock = window.open.mock.results[0].value
    const writtenHtml = winMock.document.write.mock.calls[0][0]
    expect(writtenHtml).toContain("Budget Review")
    expect(writtenHtml).not.toContain("Quarterly Planning")
  })
})
