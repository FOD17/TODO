import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import AddTaskForm from "../components/AddTaskForm"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = () => ({
  onAdd: vi.fn(),
  selectedCompany: "All",
  companies: ["Acme Corp", "Globex", "Initech"],
  accountExecutives: [
    { id: "ae1", name: "Jane Smith" },
    { id: "ae2", name: "John Doe" },
  ],
  labels: [
    { id: "l1", name: "priority:high", color: "#e74c3c" },
    { id: "l2", name: "priority:low", color: "#27ae60" },
    { id: "l3", name: "bug", color: "#c0392b" },
  ],
  companyAssignments: {
    "Acme Corp": "ae1",
    Globex: "ae2",
  },
})

const renderForm = (overrides = {}) => {
  const props = { ...defaultProps(), ...overrides }
  const result = render(<AddTaskForm {...props} />)
  return { ...result, props }
}

const expandForm = () => {
  fireEvent.click(screen.getByText("Add a new task..."))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AddTaskForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // -----------------------------------------------------------------------
  // 1. Collapsed state
  // -----------------------------------------------------------------------
  it("renders in collapsed state by default", () => {
    renderForm()
    expect(screen.getByText("Add a new task...")).toBeInTheDocument()
    expect(screen.queryByPlaceholderText("What needs to be done?")).not.toBeInTheDocument()
  })

  it("expands when clicked", () => {
    renderForm()
    expandForm()
    expect(screen.getByPlaceholderText("What needs to be done?")).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 2. Form fields visible when expanded
  // -----------------------------------------------------------------------
  it("shows all form fields when expanded", () => {
    renderForm()
    expandForm()

    expect(screen.getByPlaceholderText("What needs to be done?")).toBeInTheDocument()
    expect(screen.getByText("Date")).toBeInTheDocument()
    expect(screen.getByText("Company")).toBeInTheDocument()
    expect(screen.getByText("Account Executive")).toBeInTheDocument()
    expect(screen.getByText("Labels")).toBeInTheDocument()
    expect(screen.getByText("Description (optional)")).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 3. Submit disabled when message empty
  // -----------------------------------------------------------------------
  it("disables submit button when message is empty", () => {
    renderForm()
    expandForm()

    const submitBtn = screen.getByRole("button", { name: "Create Task" })
    expect(submitBtn).toBeDisabled()
  })

  it("enables submit button when message is entered", () => {
    renderForm()
    expandForm()

    fireEvent.change(screen.getByPlaceholderText("What needs to be done?"), {
      target: { value: "New task" },
    })

    const submitBtn = screen.getByRole("button", { name: "Create Task" })
    expect(submitBtn).not.toBeDisabled()
  })

  // -----------------------------------------------------------------------
  // 4. Submit calls onAdd with correct data
  // -----------------------------------------------------------------------
  it("calls onAdd with form data on submit", () => {
    const { props } = renderForm()
    expandForm()

    fireEvent.change(screen.getByPlaceholderText("What needs to be done?"), {
      target: { value: "My new task" },
    })
    fireEvent.change(screen.getByPlaceholderText("Add details..."), {
      target: { value: "Some description" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Create Task" }))

    expect(props.onAdd).toHaveBeenCalledTimes(1)
    const call = props.onAdd.mock.calls[0][0]
    expect(call.message).toBe("My new task")
    expect(call.description).toBe("Some description")
    expect(call.labels).toEqual([])
    expect(call.names).toEqual([])
    expect(call.notes).toEqual([])
    expect(call.subtasks).toEqual([])
  })

  // -----------------------------------------------------------------------
  // 5. Form resets after submit
  // -----------------------------------------------------------------------
  it("resets form and collapses after submit", () => {
    renderForm()
    expandForm()

    fireEvent.change(screen.getByPlaceholderText("What needs to be done?"), {
      target: { value: "Task to submit" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create Task" }))

    // Should collapse back
    expect(screen.getByText("Add a new task...")).toBeInTheDocument()
    expect(screen.queryByPlaceholderText("What needs to be done?")).not.toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 6. Cancel resets form
  // -----------------------------------------------------------------------
  it("resets form and collapses on cancel", () => {
    renderForm()
    expandForm()

    fireEvent.change(screen.getByPlaceholderText("What needs to be done?"), {
      target: { value: "Will cancel this" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.getByText("Add a new task...")).toBeInTheDocument()
    expect(screen.queryByPlaceholderText("What needs to be done?")).not.toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 7. Auto-fills company and AE in company-specific view
  // -----------------------------------------------------------------------
  it("auto-fills company and AE when selectedCompany is set", () => {
    renderForm({ selectedCompany: "Acme Corp" })
    expandForm()

    // Company autocomplete should have Acme Corp
    const companyInputs = screen.getAllByDisplayValue("Acme Corp")
    expect(companyInputs.length).toBeGreaterThan(0)

    // AE should be auto-filled to Jane Smith (ae1 is assigned to Acme Corp)
    const aeInputs = screen.getAllByDisplayValue("Jane Smith")
    expect(aeInputs.length).toBeGreaterThan(0)
  })

  // -----------------------------------------------------------------------
  // 8. Label selection
  // -----------------------------------------------------------------------
  it("can select a label from quick pills", () => {
    const { props } = renderForm()
    expandForm()

    // Quick label buttons should be visible
    const quickBtns = screen.getAllByRole("button").filter(
      (btn) => btn.classList.contains("atf-label-quick-btn"),
    )
    expect(quickBtns.length).toBeGreaterThan(0)

    // Click the first quick label
    fireEvent.click(quickBtns[0])

    // Now submit and check the label was included
    fireEvent.change(screen.getByPlaceholderText("What needs to be done?"), {
      target: { value: "Task with label" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create Task" }))

    const call = props.onAdd.mock.calls[0][0]
    expect(call.labels.length).toBe(1)
  })

  it("can remove a selected label pill", () => {
    renderForm()
    expandForm()

    // Add a label via quick pill
    const quickBtns = screen.getAllByRole("button").filter(
      (btn) => btn.classList.contains("atf-label-quick-btn"),
    )
    fireEvent.click(quickBtns[0])

    // Should see a label pill with a remove button
    const removeBtn = screen.getByText("✕")
    expect(removeBtn).toBeInTheDocument()

    // Remove the label
    fireEvent.click(removeBtn)

    // Remove button should be gone
    expect(screen.queryByText("✕")).not.toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 9. Does not submit empty message
  // -----------------------------------------------------------------------
  it("does not submit when message is whitespace only", () => {
    const { props } = renderForm()
    expandForm()

    fireEvent.change(screen.getByPlaceholderText("What needs to be done?"), {
      target: { value: "   " },
    })

    const submitBtn = screen.getByRole("button", { name: "Create Task" })
    expect(submitBtn).toBeDisabled()

    expect(props.onAdd).not.toHaveBeenCalled()
  })
})
