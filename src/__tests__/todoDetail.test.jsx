import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import TodoDetailModal from "../components/TodoDetailModal"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeTodo = (overrides = {}) => ({
  id: "todo-1",
  message: "Fix authentication bug",
  date: "2026-03-15",
  company: "Acme Corp",
  accountRep: "Jane Smith",
  description: "Users are unable to log in after password reset.",
  notes: [],
  labels: [],
  names: [],
  createdAt: "2026-03-10T09:00:00.000Z",
  updatedAt: "2026-03-10T09:00:00.000Z",
  ...overrides,
})

const availableLabels = [
  { id: "l1", name: "priority:high", color: "#e74c3c" },
  { id: "l2", name: "priority:low", color: "#27ae60" },
  { id: "l3", name: "status:in-progress", color: "#f39c12" },
  { id: "l4", name: "status:done", color: "#2ecc71" },
  { id: "l5", name: "bug", color: "#c0392b" },
]

const renderModal = (propOverrides = {}) => {
  const defaultProps = {
    todo: makeTodo(),
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    labels: availableLabels,
  }
  const props = { ...defaultProps, ...propOverrides }
  const result = render(<TodoDetailModal {...props} />)
  return { ...result, props }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TodoDetailModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // -----------------------------------------------------------------------
  // 1. Renders nothing when isOpen=false
  // -----------------------------------------------------------------------
  it("renders nothing when isOpen is false", () => {
    const { container } = renderModal({ isOpen: false })
    expect(container.innerHTML).toBe("")
  })

  // -----------------------------------------------------------------------
  // 2. Renders nothing when todo=null
  // -----------------------------------------------------------------------
  it("renders nothing when todo is null", () => {
    const { container } = renderModal({ todo: null })
    expect(container.innerHTML).toBe("")
  })

  // -----------------------------------------------------------------------
  // 3. Shows todo message, date, company, accountRep when open
  // -----------------------------------------------------------------------
  it("shows todo message as header when open", () => {
    renderModal()
    expect(screen.getByText("Fix authentication bug")).toBeInTheDocument()
  })

  it("shows a date badge", () => {
    renderModal()
    const dateBadge = screen.getByText((content, el) =>
      el.classList.contains("detail-info-badge") &&
      el.classList.contains("date") &&
      content.includes("Mar") &&
      content.includes("2026")
    )
    expect(dateBadge).toBeInTheDocument()
  })

  it("shows the company badge", () => {
    renderModal()
    const companyBadge = screen.getByText((content) => content.includes("Acme Corp"))
    expect(companyBadge).toBeInTheDocument()
    expect(companyBadge).toHaveClass("detail-info-badge", "company")
  })

  it("shows the account rep badge", () => {
    renderModal()
    const repBadge = screen.getByText((content) => content.includes("Jane Smith"))
    expect(repBadge).toBeInTheDocument()
    expect(repBadge).toHaveClass("detail-info-badge", "rep")
  })

  // -----------------------------------------------------------------------
  // 4. Can edit description
  // -----------------------------------------------------------------------
  it("can edit the description textarea", () => {
    renderModal()
    const textarea = screen.getByPlaceholderText("Add a description...")
    expect(textarea.value).toBe("Users are unable to log in after password reset.")

    fireEvent.change(textarea, { target: { value: "Updated description text" } })
    expect(textarea.value).toBe("Updated description text")
  })

  // -----------------------------------------------------------------------
  // 5. Can add a person, shows chip, can remove person
  // -----------------------------------------------------------------------
  it("can add a person and shows the person as a chip", () => {
    renderModal()
    const input = screen.getByPlaceholderText("Add person...")
    const addBtn = screen.getAllByRole("button", { name: "+" }).find(
      (btn) => btn.classList.contains("person-add-btn"),
    )

    fireEvent.change(input, { target: { value: "Alice Johnson" } })
    fireEvent.click(addBtn)

    expect(screen.getByText((content) => content.includes("Alice Johnson"))).toBeInTheDocument()
    // The input should be cleared after adding
    expect(input.value).toBe("")
  })

  it("can add a person by pressing Enter", () => {
    renderModal()
    const input = screen.getByPlaceholderText("Add person...")

    fireEvent.change(input, { target: { value: "Bob Williams" } })
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" })

    expect(screen.getByText((content) => content.includes("Bob Williams"))).toBeInTheDocument()
  })

  it("does not add a duplicate person", () => {
    renderModal({ todo: makeTodo({ names: ["Alice Johnson"] }) })

    const input = screen.getByPlaceholderText("Add person...")
    const addBtn = screen.getAllByRole("button", { name: "+" }).find(
      (btn) => btn.classList.contains("person-add-btn"),
    )

    fireEvent.change(input, { target: { value: "Alice Johnson" } })
    fireEvent.click(addBtn)

    // Should still only have one chip with Alice Johnson
    const chips = screen.getAllByText((content) => content.includes("Alice Johnson"))
    expect(chips).toHaveLength(1)
  })

  it("can remove a person chip", () => {
    renderModal({ todo: makeTodo({ names: ["Alice Johnson", "Bob Williams"] }) })

    // Both chips are present
    expect(screen.getByText((content) => content.includes("Alice Johnson"))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("Bob Williams"))).toBeInTheDocument()

    // Find the remove button inside Alice's chip (person-remove class)
    const aliceChip = screen.getByText((content) => content.includes("Alice Johnson"))
    const removeBtn = aliceChip.querySelector(".person-remove")
    fireEvent.click(removeBtn)

    expect(screen.queryByText((content) => content.includes("Alice Johnson"))).not.toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("Bob Williams"))).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 6. Can add a note - appears in notes list with timestamp
  // -----------------------------------------------------------------------
  it("can add a note that appears in the notes list", () => {
    const now = new Date("2026-03-30T12:00:00.000Z")
    vi.spyOn(Date, "now").mockReturnValue(now.getTime())

    renderModal()

    const noteInput = screen.getByPlaceholderText("Add a note...")
    const addNoteBtn = screen.getByRole("button", { name: "Add Note" })

    // Add Note button should be disabled when textarea is empty
    expect(addNoteBtn).toBeDisabled()

    fireEvent.change(noteInput, { target: { value: "This is a test note" } })
    expect(addNoteBtn).not.toBeDisabled()

    fireEvent.click(addNoteBtn)

    // Note text should be visible
    expect(screen.getByText("This is a test note")).toBeInTheDocument()
    // Note count should update
    expect(screen.getByText("Notes (1)")).toBeInTheDocument()
    // Textarea should be cleared
    expect(noteInput.value).toBe("")
  })

  // -----------------------------------------------------------------------
  // 7. Can edit an existing note
  // -----------------------------------------------------------------------
  it("can edit an existing note", () => {
    const existingNotes = [
      {
        id: "note-1",
        text: "Original note text",
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z",
      },
    ]

    renderModal({ todo: makeTodo({ notes: existingNotes }) })

    expect(screen.getByText("Original note text")).toBeInTheDocument()

    // Click the edit button (title="Edit note")
    const editBtn = screen.getByTitle("Edit note")
    fireEvent.click(editBtn)

    // An edit textarea should appear with the current text
    const editTextarea = screen.getByDisplayValue("Original note text")
    expect(editTextarea).toBeInTheDocument()

    // Change the text
    fireEvent.change(editTextarea, { target: { value: "Edited note text" } })

    // Click Save inside the edit form
    const saveBtn = screen.getByRole("button", { name: "Save" })
    fireEvent.click(saveBtn)

    // The note should now display the edited text
    expect(screen.getByText("Edited note text")).toBeInTheDocument()
    expect(screen.queryByText("Original note text")).not.toBeInTheDocument()
  })

  it("can cancel editing a note", () => {
    const existingNotes = [
      {
        id: "note-1",
        text: "Original note text",
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z",
      },
    ]

    renderModal({ todo: makeTodo({ notes: existingNotes }) })

    const editBtn = screen.getByTitle("Edit note")
    fireEvent.click(editBtn)

    const editTextarea = screen.getByDisplayValue("Original note text")
    fireEvent.change(editTextarea, { target: { value: "Some changes" } })

    // Click the Cancel button inside the note edit section (not the footer Cancel)
    const cancelButtons = screen.getAllByRole("button", { name: "Cancel" })
    const noteCancelBtn = cancelButtons.find((btn) => btn.classList.contains("note-cancel-btn"))
    fireEvent.click(noteCancelBtn)

    // Original text remains
    expect(screen.getByText("Original note text")).toBeInTheDocument()
    expect(screen.queryByText("Some changes")).not.toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 8. Can delete a note
  // -----------------------------------------------------------------------
  it("can delete a note", () => {
    const existingNotes = [
      {
        id: "note-1",
        text: "Note to keep",
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z",
      },
      {
        id: "note-2",
        text: "Note to delete",
        createdAt: "2026-03-21T10:00:00.000Z",
        updatedAt: "2026-03-21T10:00:00.000Z",
      },
    ]

    renderModal({ todo: makeTodo({ notes: existingNotes }) })

    expect(screen.getByText("Notes (2)")).toBeInTheDocument()
    expect(screen.getByText("Note to delete")).toBeInTheDocument()

    // Find the delete button for "Note to delete" (title="Delete note")
    const deleteButtons = screen.getAllByTitle("Delete note")
    // Notes are rendered in array order, "Note to keep" first, "Note to delete" second
    fireEvent.click(deleteButtons[1])

    expect(screen.queryByText("Note to delete")).not.toBeInTheDocument()
    expect(screen.getByText("Note to keep")).toBeInTheDocument()
    expect(screen.getByText("Notes (1)")).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 9. Label pills shown for assigned labels
  // -----------------------------------------------------------------------
  it("shows label pills for assigned labels", () => {
    renderModal({ todo: makeTodo({ labels: ["priority:high", "bug"] }) })

    const highPill = screen.getByText((content, element) => {
      return element.classList.contains("label-pill") && content.includes("priority:high")
    })
    expect(highPill).toBeInTheDocument()

    const bugPill = screen.getByText((content, element) => {
      return element.classList.contains("label-pill") && content.includes("bug")
    })
    expect(bugPill).toBeInTheDocument()
  })

  it("shows 'No labels assigned' when there are no labels", () => {
    renderModal({ todo: makeTodo({ labels: [] }) })
    expect(screen.getByText("No labels assigned")).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 10. Label picker toggles labels on/off
  // -----------------------------------------------------------------------
  it("opens the label picker when clicking '+ Add' and closes on 'Done'", () => {
    renderModal()

    // Label picker should not be visible initially
    expect(screen.queryByText("priority")).not.toBeInTheDocument()

    // Click "+ Add" to open the label picker
    const addBtn = screen.getByRole("button", { name: "+ Add" })
    fireEvent.click(addBtn)

    // Label picker groups should be visible (the group headers "priority", "status", and "bug")
    expect(screen.getByText((content, el) => el.classList.contains("label-picker-group-name") && content === "priority")).toBeInTheDocument()
    expect(screen.getByText((content, el) => el.classList.contains("label-picker-group-name") && content === "status")).toBeInTheDocument()
    expect(screen.getByText((content, el) => el.classList.contains("label-picker-group-name") && content === "bug")).toBeInTheDocument()

    // Button text should now be "Done"
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument()

    // Click "Done" to close
    fireEvent.click(screen.getByRole("button", { name: "Done" }))
    expect(screen.queryByRole("button", { name: "Done" })).not.toBeInTheDocument()
  })

  it("toggles a label on by clicking in the picker", () => {
    renderModal({ todo: makeTodo({ labels: [] }) })

    // Open label picker
    fireEvent.click(screen.getByRole("button", { name: "+ Add" }))

    // Click on "priority:high" in the picker
    const pickerItems = screen.getAllByRole("button").filter(
      (btn) => btn.classList.contains("label-picker-item")
    )
    const highItem = pickerItems.find((btn) => btn.textContent.includes("priority:high"))
    fireEvent.click(highItem)

    // A label pill for "priority:high" should now appear in the labels section
    const pill = screen.getByText((content, element) => {
      return element.classList.contains("label-pill") && content.includes("priority:high")
    })
    expect(pill).toBeInTheDocument()
  })

  it("toggles a label off by clicking it again in the picker", () => {
    renderModal({ todo: makeTodo({ labels: ["priority:high"] }) })

    // Open label picker
    fireEvent.click(screen.getByRole("button", { name: "+ Add" }))

    // The picker item for "priority:high" should be selected
    const pickerItems = screen.getAllByRole("button").filter(
      (btn) => btn.classList.contains("label-picker-item")
    )
    const highItem = pickerItems.find((btn) => btn.textContent.includes("priority:high"))
    expect(highItem).toHaveClass("selected")

    // Click to deselect
    fireEvent.click(highItem)

    // The pill should be gone, replaced by "No labels assigned"
    expect(screen.getByText("No labels assigned")).toBeInTheDocument()
    expect(highItem).not.toHaveClass("selected")
  })

  // -----------------------------------------------------------------------
  // 11. Save button calls onSave with updated todo
  // -----------------------------------------------------------------------
  it("calls onSave with the full edited todo including updatedAt", () => {
    const frozenTime = "2026-03-30T15:00:00.000Z"
    vi.spyOn(Date.prototype, "toISOString").mockReturnValue(frozenTime)

    const { props } = renderModal()

    // Make an edit to description
    const textarea = screen.getByPlaceholderText("Add a description...")
    fireEvent.change(textarea, { target: { value: "New description" } })

    // Click Save Changes
    const saveBtn = screen.getByRole("button", { name: "Save Changes" })
    fireEvent.click(saveBtn)

    expect(props.onSave).toHaveBeenCalledTimes(1)

    const savedTodo = props.onSave.mock.calls[0][0]
    expect(savedTodo.id).toBe("todo-1")
    expect(savedTodo.message).toBe("Fix authentication bug")
    expect(savedTodo.description).toBe("New description")
    expect(savedTodo.updatedAt).toBe(frozenTime)
  })

  it("calls onSave with added person and labels", () => {
    const { props } = renderModal({ todo: makeTodo({ labels: [], names: [] }) })

    // Add a person
    const personInput = screen.getByPlaceholderText("Add person...")
    fireEvent.change(personInput, { target: { value: "Charlie" } })
    const personAddBtn = screen.getAllByRole("button", { name: "+" }).find(
      (btn) => btn.classList.contains("person-add-btn"),
    )
    fireEvent.click(personAddBtn)

    // Open label picker and add a label
    fireEvent.click(screen.getByRole("button", { name: "+ Add" }))
    const pickerItems = screen.getAllByRole("button").filter(
      (btn) => btn.classList.contains("label-picker-item")
    )
    const bugItem = pickerItems.find((btn) => btn.textContent.includes("bug"))
    fireEvent.click(bugItem)

    // Save
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }))

    const savedTodo = props.onSave.mock.calls[0][0]
    expect(savedTodo.names).toContain("Charlie")
    expect(savedTodo.labels).toContain("bug")
  })

  // -----------------------------------------------------------------------
  // 12. Cancel button calls onClose
  // -----------------------------------------------------------------------
  it("calls onClose when Cancel button is clicked", () => {
    const { props } = renderModal()

    // The footer Cancel button (not the note-edit cancel)
    const footerButtons = screen.getByRole("button", { name: "Cancel" })
    fireEvent.click(footerButtons)

    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when the close (X) button is clicked", () => {
    const { props } = renderModal()

    const closeBtn = screen.getAllByRole("button").find(
      (btn) => btn.classList.contains("detail-close")
    )
    fireEvent.click(closeBtn)

    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when clicking the overlay", () => {
    const { props, container } = renderModal()

    const overlay = container.querySelector(".detail-modal-overlay")
    fireEvent.click(overlay)

    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------
  // 13. Notes are ordered newest first (prepended)
  // -----------------------------------------------------------------------
  it("prepends new notes so the newest appears first", () => {
    let noteCounter = 1000
    vi.spyOn(Date, "now").mockImplementation(() => noteCounter++)

    renderModal()

    const noteInput = screen.getByPlaceholderText("Add a note...")
    const addNoteBtn = screen.getByRole("button", { name: "Add Note" })

    // Add first note
    fireEvent.change(noteInput, { target: { value: "First note added" } })
    fireEvent.click(addNoteBtn)

    // Add second note
    fireEvent.change(noteInput, { target: { value: "Second note added" } })
    fireEvent.click(addNoteBtn)

    // Add third note
    fireEvent.change(noteInput, { target: { value: "Third note added" } })
    fireEvent.click(addNoteBtn)

    expect(screen.getByText("Notes (3)")).toBeInTheDocument()

    // Verify order: newest first in the DOM
    const noteTexts = screen.getAllByText(
      (content, element) => element.classList.contains("note-text")
    )
    expect(noteTexts[0]).toHaveTextContent("Third note added")
    expect(noteTexts[1]).toHaveTextContent("Second note added")
    expect(noteTexts[2]).toHaveTextContent("First note added")
  })

  it("prepends a new note before existing notes", () => {
    const existingNotes = [
      {
        id: "existing-1",
        text: "Old existing note",
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-01T10:00:00.000Z",
      },
    ]

    renderModal({ todo: makeTodo({ notes: existingNotes }) })

    const noteInput = screen.getByPlaceholderText("Add a note...")
    fireEvent.change(noteInput, { target: { value: "Brand new note" } })
    fireEvent.click(screen.getByRole("button", { name: "Add Note" }))

    const noteTexts = screen.getAllByText(
      (content, element) => element.classList.contains("note-text")
    )
    expect(noteTexts[0]).toHaveTextContent("Brand new note")
    expect(noteTexts[1]).toHaveTextContent("Old existing note")
  })

  // -----------------------------------------------------------------------
  // Additional edge cases
  // -----------------------------------------------------------------------
  it("does not add an empty note", () => {
    renderModal()

    const noteInput = screen.getByPlaceholderText("Add a note...")
    const addNoteBtn = screen.getByRole("button", { name: "Add Note" })

    // Try adding with only whitespace
    fireEvent.change(noteInput, { target: { value: "   " } })
    // Button should still be disabled because the trimmed value is empty
    expect(addNoteBtn).toBeDisabled()
  })

  it("does not add an empty person", () => {
    renderModal()

    const input = screen.getByPlaceholderText("Add person...")
    const addBtn = screen.getAllByRole("button", { name: "+" }).find(
      (btn) => btn.classList.contains("person-add-btn"),
    )

    fireEvent.change(input, { target: { value: "   " } })
    fireEvent.click(addBtn)

    // No person chip should appear (aside from the input row)
    const chips = screen.queryAllByText(
      (content, element) => element.classList.contains("person-chip")
    )
    expect(chips).toHaveLength(0)
  })

  it("shows the notes count in the label", () => {
    const notes = [
      {
        id: "n1",
        text: "Note 1",
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z",
      },
      {
        id: "n2",
        text: "Note 2",
        createdAt: "2026-03-21T10:00:00.000Z",
        updatedAt: "2026-03-21T10:00:00.000Z",
      },
      {
        id: "n3",
        text: "Note 3",
        createdAt: "2026-03-22T10:00:00.000Z",
        updatedAt: "2026-03-22T10:00:00.000Z",
      },
    ]
    renderModal({ todo: makeTodo({ notes }) })
    expect(screen.getByText("Notes (3)")).toBeInTheDocument()
  })

  it("shows (edited) indicator when a note updatedAt differs from createdAt", () => {
    const notes = [
      {
        id: "n1",
        text: "An edited note",
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "2026-03-20T14:30:00.000Z",
      },
    ]
    renderModal({ todo: makeTodo({ notes }) })
    expect(screen.getByText((content) => content.includes("(edited)"))).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // Subtask tests
  // -----------------------------------------------------------------------
  describe("Subtasks", () => {
    it("shows subtasks section header", () => {
      renderModal()
      expect(screen.getByText((content) => content.includes("Subtasks"))).toBeInTheDocument()
    })

    it("can add a subtask", () => {
      renderModal()

      const input = screen.getByPlaceholderText("Add a subtask...")
      fireEvent.change(input, { target: { value: "My subtask" } })

      // The subtask add button is "+" — find it via its class
      const addBtn = screen.getAllByRole("button", { name: "+" }).find(
        (btn) => btn.classList.contains("subtask-add-btn"),
      )
      fireEvent.click(addBtn)

      expect(screen.getByText("My subtask")).toBeInTheDocument()
      expect(input.value).toBe("")
    })

    it("does not add an empty subtask", () => {
      renderModal()

      const input = screen.getByPlaceholderText("Add a subtask...")
      fireEvent.change(input, { target: { value: "   " } })

      const addBtn = screen.getAllByRole("button", { name: "+" }).find(
        (btn) => btn.classList.contains("subtask-add-btn"),
      )
      // Button should be disabled
      expect(addBtn).toBeDisabled()
      fireEvent.click(addBtn)

      // No subtask items should exist
      const subtaskItems = screen.queryAllByText((_, el) =>
        el.classList.contains("subtask-text"),
      )
      expect(subtaskItems).toHaveLength(0)
    })

    it("shows existing subtasks from todo data", () => {
      const subtasks = [
        {
          id: "st1",
          message: "First subtask",
          completed: false,
          completedAt: null,
          createdAt: "2026-03-25T10:00:00.000Z",
          updatedAt: "2026-03-25T10:00:00.000Z",
        },
        {
          id: "st2",
          message: "Second subtask",
          completed: true,
          completedAt: "2026-03-26T12:00:00.000Z",
          createdAt: "2026-03-25T10:00:00.000Z",
          updatedAt: "2026-03-26T12:00:00.000Z",
        },
      ]

      renderModal({ todo: makeTodo({ subtasks }) })

      expect(screen.getByText("First subtask")).toBeInTheDocument()
      expect(screen.getByText("Second subtask")).toBeInTheDocument()
    })

    it("can toggle a subtask completion", () => {
      const subtasks = [
        {
          id: "st1",
          message: "Toggle me",
          completed: false,
          completedAt: null,
          createdAt: "2026-03-25T10:00:00.000Z",
          updatedAt: "2026-03-25T10:00:00.000Z",
        },
      ]

      renderModal({ todo: makeTodo({ subtasks }) })

      // Find the checkbox for the subtask
      const checkbox = screen.getByRole("checkbox", { checked: false })
      fireEvent.click(checkbox)

      // Checkbox should now be checked
      expect(checkbox.checked).toBe(true)
    })

    it("can delete a subtask", () => {
      const subtasks = [
        {
          id: "st1",
          message: "Delete me",
          completed: false,
          completedAt: null,
          createdAt: "2026-03-25T10:00:00.000Z",
          updatedAt: "2026-03-25T10:00:00.000Z",
        },
      ]

      renderModal({ todo: makeTodo({ subtasks }) })

      expect(screen.getByText("Delete me")).toBeInTheDocument()

      const deleteBtn = screen.getByTitle("Delete subtask")
      fireEvent.click(deleteBtn)

      expect(screen.queryByText("Delete me")).not.toBeInTheDocument()
    })

    it("can edit a subtask", () => {
      const subtasks = [
        {
          id: "st1",
          message: "Original subtask",
          completed: false,
          completedAt: null,
          createdAt: "2026-03-25T10:00:00.000Z",
          updatedAt: "2026-03-25T10:00:00.000Z",
        },
      ]

      renderModal({ todo: makeTodo({ subtasks }) })

      const editBtn = screen.getByTitle("Edit subtask")
      fireEvent.click(editBtn)

      const editInput = screen.getByDisplayValue("Original subtask")
      fireEvent.change(editInput, { target: { value: "Edited subtask" } })

      // Save the edit
      const saveBtn = screen.getByRole("button", { name: "Save" })
      fireEvent.click(saveBtn)

      expect(screen.getByText("Edited subtask")).toBeInTheDocument()
      expect(screen.queryByText("Original subtask")).not.toBeInTheDocument()
    })

    it("shows subtask progress bar when subtasks exist", () => {
      const subtasks = [
        {
          id: "st1",
          message: "Done",
          completed: true,
          completedAt: "2026-03-26T12:00:00.000Z",
          createdAt: "2026-03-25T10:00:00.000Z",
          updatedAt: "2026-03-26T12:00:00.000Z",
        },
        {
          id: "st2",
          message: "Not done",
          completed: false,
          completedAt: null,
          createdAt: "2026-03-25T10:00:00.000Z",
          updatedAt: "2026-03-25T10:00:00.000Z",
        },
      ]

      renderModal({ todo: makeTodo({ subtasks }) })

      // Should show progress text like "1/2 done"
      expect(screen.getByText((content) => content.includes("1/2 done"))).toBeInTheDocument()
    })

    it("includes subtasks in saved data", () => {
      const { props } = renderModal()

      // Add a subtask
      const input = screen.getByPlaceholderText("Add a subtask...")
      fireEvent.change(input, { target: { value: "Saved subtask" } })
      const addBtn = screen.getAllByRole("button", { name: "+" }).find(
        (btn) => btn.classList.contains("subtask-add-btn"),
      )
      fireEvent.click(addBtn)

      // Save
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }))

      const saved = props.onSave.mock.calls[0][0]
      expect(saved.subtasks).toHaveLength(1)
      expect(saved.subtasks[0].message).toBe("Saved subtask")
      expect(saved.subtasks[0].completed).toBe(false)
    })

    it("completed subtasks stay with parent in saved data", () => {
      const subtasks = [
        {
          id: "st1",
          message: "Completed task",
          completed: true,
          completedAt: "2026-03-26T12:00:00.000Z",
          createdAt: "2026-03-25T10:00:00.000Z",
          updatedAt: "2026-03-26T12:00:00.000Z",
        },
        {
          id: "st2",
          message: "Active task",
          completed: false,
          completedAt: null,
          createdAt: "2026-03-25T10:00:00.000Z",
          updatedAt: "2026-03-25T10:00:00.000Z",
        },
      ]

      const { props } = renderModal({ todo: makeTodo({ subtasks }) })

      // Save without changes
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }))

      const saved = props.onSave.mock.calls[0][0]
      expect(saved.subtasks).toHaveLength(2)
      expect(saved.subtasks.find((s) => s.id === "st1").completed).toBe(true)
      expect(saved.subtasks.find((s) => s.id === "st2").completed).toBe(false)
    })
  })
})
