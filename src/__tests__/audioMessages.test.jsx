import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import AudioTab from "../components/AudioTab"

// ---------------------------------------------------------------------------
// MediaRecorder mock factory
// ---------------------------------------------------------------------------

function makeMediaRecorder() {
  const recorder = {
    start: vi.fn(),
    stop: vi.fn(),
    state: "inactive",
    mimeType: "audio/webm",
    ondataavailable: null,
    onstop: null,
  }

  // Calling stop() triggers onstop synchronously (for test predictability)
  recorder.stop.mockImplementation(() => {
    recorder.state = "inactive"
    if (recorder.onstop) recorder.onstop()
  })

  recorder.start.mockImplementation(() => {
    recorder.state = "recording"
  })

  return recorder
}

// ---------------------------------------------------------------------------
// FileReader mock that immediately returns a fake data URL
// ---------------------------------------------------------------------------

function mockFileReader(dataUrl = "data:audio/webm;base64,FAKEAUDIO") {
  const fr = {
    readAsDataURL: vi.fn(function () {
      // Trigger onloadend synchronously
      this.result = dataUrl
      if (this.onloadend) this.onloadend()
    }),
    result: null,
    onloadend: null,
  }
  return fr
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_MESSAGES = [
  {
    id: "msg-1",
    title: "Morning standup notes",
    company: "Acme Corp",
    dataUrl: "data:audio/webm;base64,AAA",
    durationSeconds: 65,
    createdAt: "2026-04-03T09:00:00.000Z",
  },
  {
    id: "msg-2",
    title: "Follow-up call",
    company: "Globex",
    dataUrl: "data:audio/webm;base64,BBB",
    durationSeconds: 30,
    createdAt: "2026-04-02T14:00:00.000Z",
  },
]

const renderTab = (props = {}) => {
  const defaults = {
    company: "All",
    audioMessages: [],
    onAddAudioMessage: vi.fn(),
    onDeleteAudioMessage: vi.fn(),
  }
  return render(<AudioTab {...defaults} {...props} />)
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let recorderInstance

beforeEach(() => {
  recorderInstance = makeMediaRecorder()

  global.MediaRecorder = vi.fn(() => recorderInstance)
  global.MediaRecorder.isTypeSupported = vi.fn(() => true)

  navigator.mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
  }

  // Replace FileReader globally so recorder.onstop produces a dataUrl
  global.FileReader = vi.fn(() => mockFileReader())

  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AudioTab", () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders the title input and start recording button", () => {
    renderTab()
    expect(screen.getByPlaceholderText(/recording title/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /start recording/i })).toBeInTheDocument()
  })

  it("shows empty state when no messages exist for the company", () => {
    renderTab({ company: "Acme Corp", audioMessages: [] })
    expect(screen.getByText(/no recordings/i)).toBeInTheDocument()
  })

  it("shows all messages when company is 'All'", () => {
    renderTab({ company: "All", audioMessages: BASE_MESSAGES })
    expect(screen.getByText("Morning standup notes")).toBeInTheDocument()
    expect(screen.getByText("Follow-up call")).toBeInTheDocument()
  })

  it("filters messages by company", () => {
    renderTab({ company: "Acme Corp", audioMessages: BASE_MESSAGES })
    expect(screen.getByText("Morning standup notes")).toBeInTheDocument()
    expect(screen.queryByText("Follow-up call")).not.toBeInTheDocument()
  })

  it("displays messages in reverse-chronological order", () => {
    renderTab({ company: "All", audioMessages: BASE_MESSAGES })
    const titles = screen.getAllByText(/standup notes|Follow-up/i)
    // msg-1 (Apr 3) should appear before msg-2 (Apr 2)
    expect(titles[0].textContent).toContain("Morning standup notes")
    expect(titles[1].textContent).toContain("Follow-up call")
  })

  // ── Recording ──────────────────────────────────────────────────────────────

  it("calls getUserMedia when start recording is clicked", async () => {
    renderTab()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start recording/i }))
    })
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
  })

  it("shows stop button and timer after recording starts", async () => {
    renderTab()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start recording/i }))
    })
    expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument()
    expect(screen.getByText(/recording —/i)).toBeInTheDocument()
  })

  it("timer advances while recording", async () => {
    renderTab()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start recording/i }))
    })
    expect(screen.getByText(/0:00/)).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(3000) })
    expect(screen.getByText(/0:03/)).toBeInTheDocument()
  })

  it("calls onAddAudioMessage with correct shape after stop", async () => {
    const onAdd = vi.fn()
    renderTab({ company: "Acme Corp", onAddAudioMessage: onAdd })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start recording/i }))
    })

    act(() => { vi.advanceTimersByTime(5000) })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /stop/i }))
    })

    expect(onAdd).toHaveBeenCalledOnce()
    const msg = onAdd.mock.calls[0][0]
    expect(msg).toMatchObject({
      company: "Acme Corp",
      dataUrl: expect.stringContaining("data:audio"),
      durationSeconds: expect.any(Number),
      createdAt: expect.any(String),
    })
    expect(msg.id).toBeTruthy()
  })

  it("uses the title input value in the saved message", async () => {
    const onAdd = vi.fn()
    renderTab({ onAddAudioMessage: onAdd })

    fireEvent.change(screen.getByPlaceholderText(/recording title/i), {
      target: { value: "My custom title" },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start recording/i }))
    })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /stop/i }))
    })

    const msg = onAdd.mock.calls[0][0]
    expect(msg.title).toBe("My custom title")
  })

  it("falls back to date-based title when title input is empty", async () => {
    const onAdd = vi.fn()
    renderTab({ onAddAudioMessage: onAdd })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start recording/i }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /stop/i }))
    })

    const msg = onAdd.mock.calls[0][0]
    expect(msg.title).toContain("Recording")
  })

  // ── Delete ─────────────────────────────────────────────────────────────────

  it("calls onDeleteAudioMessage with the correct id", () => {
    const onDelete = vi.fn()
    renderTab({ company: "All", audioMessages: BASE_MESSAGES, onDeleteAudioMessage: onDelete })

    const deleteButtons = screen.getAllByTitle(/delete/i)
    fireEvent.click(deleteButtons[0])

    // First rendered message is msg-1 (most recent)
    expect(onDelete).toHaveBeenCalledWith("msg-1")
  })

  // ── Error handling ─────────────────────────────────────────────────────────

  it("shows error message when getUserMedia fails", async () => {
    navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
      new Error("Permission denied"),
    )

    renderTab()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start recording/i }))
    })

    expect(screen.getByText(/permission denied/i)).toBeInTheDocument()
  })
})
