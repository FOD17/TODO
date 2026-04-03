import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import Autocomplete from "../components/Autocomplete"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = () => ({
  value: "",
  onChange: vi.fn(),
  suggestions: ["Apple", "Banana", "Cherry", "Date", "Elderberry"],
  placeholder: "Type here...",
})

const renderAC = (overrides = {}) => {
  const props = { ...defaultProps(), ...overrides }
  const result = render(<Autocomplete {...props} />)
  return { ...result, props }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Autocomplete", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // jsdom doesn't implement scrollIntoView
    Element.prototype.scrollIntoView = vi.fn()
  })

  // -----------------------------------------------------------------------
  // 1. Renders input with placeholder
  // -----------------------------------------------------------------------
  it("renders an input with the provided placeholder", () => {
    renderAC()
    expect(screen.getByPlaceholderText("Type here...")).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 2. Shows dropdown on focus
  // -----------------------------------------------------------------------
  it("shows dropdown with suggestions on focus", () => {
    renderAC()
    const input = screen.getByPlaceholderText("Type here...")
    fireEvent.focus(input)

    expect(screen.getByText("Apple")).toBeInTheDocument()
    expect(screen.getByText("Banana")).toBeInTheDocument()
    expect(screen.getByText("Cherry")).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 3. Filters suggestions as user types
  // -----------------------------------------------------------------------
  it("filters suggestions based on input", () => {
    const { props } = renderAC()
    const input = screen.getByPlaceholderText("Type here...")

    fireEvent.change(input, { target: { value: "an" } })

    expect(screen.getByText("Banana")).toBeInTheDocument()
    expect(screen.queryByText("Apple")).not.toBeInTheDocument()
    expect(screen.queryByText("Cherry")).not.toBeInTheDocument()
    expect(props.onChange).toHaveBeenCalledWith("an")
  })

  // -----------------------------------------------------------------------
  // 4. Selects suggestion on click
  // -----------------------------------------------------------------------
  it("selects a suggestion when clicked", () => {
    const { props } = renderAC()
    const input = screen.getByPlaceholderText("Type here...")

    fireEvent.focus(input)
    fireEvent.mouseDown(screen.getByText("Cherry"))

    expect(props.onChange).toHaveBeenCalledWith("Cherry", "Cherry")
  })

  // -----------------------------------------------------------------------
  // 5. Keyboard navigation - ArrowDown
  // -----------------------------------------------------------------------
  it("highlights next item on ArrowDown", () => {
    renderAC()
    const input = screen.getByPlaceholderText("Type here...")

    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: "ArrowDown" })

    const items = screen.getAllByText((_, el) => el.classList.contains("ac-item"))
    expect(items[0]).toHaveClass("highlighted")
  })

  // -----------------------------------------------------------------------
  // 6. Keyboard navigation - Enter selects
  // -----------------------------------------------------------------------
  it("selects highlighted item on Enter", () => {
    const { props } = renderAC()
    const input = screen.getByPlaceholderText("Type here...")

    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: "ArrowDown" })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(props.onChange).toHaveBeenCalledWith("Apple", "Apple")
  })

  // -----------------------------------------------------------------------
  // 7. Escape closes dropdown
  // -----------------------------------------------------------------------
  it("closes dropdown on Escape", () => {
    renderAC()
    const input = screen.getByPlaceholderText("Type here...")

    fireEvent.focus(input)
    expect(screen.getByText("Apple")).toBeInTheDocument()

    fireEvent.keyDown(input, { key: "Escape" })
    expect(screen.queryByText("Apple")).not.toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 8. Displays value prop
  // -----------------------------------------------------------------------
  it("displays the provided value", () => {
    renderAC({ value: "Banana" })
    const input = screen.getByPlaceholderText("Type here...")
    expect(input.value).toBe("Banana")
  })

  // -----------------------------------------------------------------------
  // 9. Object suggestions
  // -----------------------------------------------------------------------
  it("works with object suggestions using name property", () => {
    const { props } = renderAC({
      suggestions: [
        { name: "Alice", id: 1 },
        { name: "Bob", id: 2 },
        { name: "Charlie", id: 3 },
      ],
    })
    const input = screen.getByPlaceholderText("Type here...")

    fireEvent.focus(input)
    expect(screen.getByText("Alice")).toBeInTheDocument()
    expect(screen.getByText("Bob")).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByText("Bob"))
    expect(props.onChange).toHaveBeenCalledWith("Bob", { name: "Bob", id: 2 })
  })

  // -----------------------------------------------------------------------
  // 10. No dropdown when no matches
  // -----------------------------------------------------------------------
  it("shows no dropdown when filter yields no matches", () => {
    renderAC()
    const input = screen.getByPlaceholderText("Type here...")

    fireEvent.change(input, { target: { value: "zzz" } })

    const dropdown = screen.queryByText((_, el) => el.classList.contains("ac-dropdown"))
    expect(dropdown).not.toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 11. ArrowDown wraps around
  // -----------------------------------------------------------------------
  it("wraps highlight from last to first on ArrowDown", () => {
    renderAC({ suggestions: ["A", "B"] })
    const input = screen.getByPlaceholderText("Type here...")

    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: "ArrowDown" }) // highlight A
    fireEvent.keyDown(input, { key: "ArrowDown" }) // highlight B
    fireEvent.keyDown(input, { key: "ArrowDown" }) // wrap to A

    const items = screen.getAllByText((_, el) => el.classList.contains("ac-item"))
    expect(items[0]).toHaveClass("highlighted")
  })
})
