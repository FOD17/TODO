import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { SyncManager } from "../utils/syncManager"

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a SyncManager with a short poll interval so tests are fast. */
function makeSM(opts = {}) {
  return new SyncManager({ pollIntervalMs: 50, ...opts })
}

/** Resolve after `ms` milliseconds. */
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("SyncManager", () => {
  let sm

  beforeEach(() => {
    sm = makeSM()
    // Ensure no real window.electron leaks between tests.
    if (typeof window !== "undefined") {
      delete window.electron
    }
  })

  afterEach(() => {
    sm.stop()
  })

  // ─── Initial state ──────────────────────────────────────────────────────────

  describe("initial state", () => {
    it("starts as unavailable", () => {
      expect(sm.available).toBe(false)
    })

    it("starts with no dirty collections", () => {
      expect(sm.hasDirty()).toBe(false)
      expect(sm.getDirty().size).toBe(0)
    })

    it("starts with polling off", () => {
      expect(sm.getStatus().polling).toBe(false)
    })

    it("getStatus returns correct initial shape", () => {
      const s = sm.getStatus()
      expect(s).toEqual({ available: false, dirty: [], polling: false })
    })
  })

  // ─── checkHealth ────────────────────────────────────────────────────────────

  describe("checkHealth()", () => {
    it("returns false when window.electron is not defined", async () => {
      expect(await sm.checkHealth()).toBe(false)
    })

    it("returns false when window.electron.ping is missing", async () => {
      window.electron = {}
      expect(await sm.checkHealth()).toBe(false)
    })

    it("returns false when ping rejects", async () => {
      window.electron = { ping: vi.fn().mockRejectedValue(new Error("IPC error")) }
      expect(await sm.checkHealth()).toBe(false)
    })

    it("returns false when ping resolves with ok !== true", async () => {
      window.electron = { ping: vi.fn().mockResolvedValue({ ok: false }) }
      expect(await sm.checkHealth()).toBe(false)
    })

    it("returns false when ping resolves with no ok field", async () => {
      window.electron = { ping: vi.fn().mockResolvedValue({}) }
      expect(await sm.checkHealth()).toBe(false)
    })

    it("returns false when ping resolves with null", async () => {
      window.electron = { ping: vi.fn().mockResolvedValue(null) }
      expect(await sm.checkHealth()).toBe(false)
    })

    it("returns true when ping resolves with { ok: true }", async () => {
      window.electron = {
        ping: vi.fn().mockResolvedValue({ ok: true, timestamp: Date.now() }),
      }
      expect(await sm.checkHealth()).toBe(true)
    })

    it("does not throw when window is undefined (SSR-like)", async () => {
      // We can't truly remove window in jsdom, but we can test the undefined guard
      // by checking that a missing ping doesn't throw.
      window.electron = undefined
      await expect(sm.checkHealth()).resolves.toBe(false)
    })
  })

  // ─── setAvailable ───────────────────────────────────────────────────────────

  describe("setAvailable()", () => {
    it("sets available to true", () => {
      sm.setAvailable(true)
      expect(sm.available).toBe(true)
    })

    it("sets available to false", () => {
      sm.setAvailable(true)
      sm.setAvailable(false)
      expect(sm.available).toBe(false)
    })

    it("fires 'online' event when transitioning false → true", () => {
      const cb = vi.fn()
      sm.onStatusChange(cb)
      sm.setAvailable(false)
      sm.setAvailable(true)
      expect(cb).toHaveBeenCalledOnce()
      expect(cb).toHaveBeenCalledWith({ type: "online" })
    })

    it("fires 'offline' event when transitioning true → false", () => {
      const cb = vi.fn()
      sm.onStatusChange(cb)
      sm.setAvailable(true)
      cb.mockClear()
      sm.setAvailable(false)
      expect(cb).toHaveBeenCalledOnce()
      expect(cb).toHaveBeenCalledWith({ type: "offline" })
    })

    it("does NOT fire when value stays the same (true → true)", () => {
      const cb = vi.fn()
      sm.onStatusChange(cb)
      sm.setAvailable(true)
      cb.mockClear()
      sm.setAvailable(true)
      expect(cb).not.toHaveBeenCalled()
    })

    it("does NOT fire when value stays the same (false → false)", () => {
      const cb = vi.fn()
      sm.onStatusChange(cb)
      sm.setAvailable(false)
      expect(cb).not.toHaveBeenCalled()
    })
  })

  // ─── Dirty tracking ─────────────────────────────────────────────────────────

  describe("dirty collection tracking", () => {
    it("markDirty / isDirty round-trip", () => {
      sm.markDirty("todos")
      expect(sm.isDirty("todos")).toBe(true)
    })

    it("isDirty returns false for unmarked collections", () => {
      expect(sm.isDirty("todos")).toBe(false)
      expect(sm.isDirty("tags")).toBe(false)
    })

    it("hasDirty returns false when nothing is marked", () => {
      expect(sm.hasDirty()).toBe(false)
    })

    it("hasDirty returns true after marking any collection", () => {
      sm.markDirty("contacts")
      expect(sm.hasDirty()).toBe(true)
    })

    it("clearDirty removes a specific collection", () => {
      sm.markDirty("todos")
      sm.markDirty("tags")
      sm.clearDirty("todos")
      expect(sm.isDirty("todos")).toBe(false)
      expect(sm.isDirty("tags")).toBe(true)
    })

    it("clearAllDirty removes every dirty flag", () => {
      sm.markDirty("todos")
      sm.markDirty("tags")
      sm.markDirty("contacts")
      sm.markDirty("config")
      sm.clearAllDirty()
      expect(sm.hasDirty()).toBe(false)
    })

    it("getDirty returns a snapshot, not the live set", () => {
      sm.markDirty("todos")
      const snapshot = sm.getDirty()
      sm.markDirty("tags")
      expect(snapshot.has("tags")).toBe(false) // snapshot is not mutated
      expect(sm.getDirty().has("tags")).toBe(true)
    })

    it("marking the same collection twice is idempotent", () => {
      sm.markDirty("todos")
      sm.markDirty("todos")
      expect(sm.getDirty().size).toBe(1)
    })

    it("tracks all four standard collections independently", () => {
      const all = ["todos", "tags", "contacts", "config"]
      all.forEach((c) => sm.markDirty(c))
      all.forEach((c) => expect(sm.isDirty(c)).toBe(true))
      expect(sm.getDirty().size).toBe(4)
    })

    it("clearing a non-dirty collection is a no-op (no throw)", () => {
      expect(() => sm.clearDirty("todos")).not.toThrow()
      expect(sm.hasDirty()).toBe(false)
    })

    it("getStatus.dirty reflects current dirty set", () => {
      sm.markDirty("todos")
      sm.markDirty("config")
      const { dirty } = sm.getStatus()
      expect(dirty).toContain("todos")
      expect(dirty).toContain("config")
      expect(dirty).toHaveLength(2)
    })
  })

  // ─── Listener management ────────────────────────────────────────────────────

  describe("onStatusChange listeners", () => {
    it("adds and notifies a listener", () => {
      const cb = vi.fn()
      sm.onStatusChange(cb)
      sm.setAvailable(true)
      expect(cb).toHaveBeenCalled()
    })

    it("returned unsubscribe function removes the listener", () => {
      const cb = vi.fn()
      const unsub = sm.onStatusChange(cb)
      unsub()
      sm.setAvailable(true)
      expect(cb).not.toHaveBeenCalled()
    })

    it("multiple listeners all receive the event", () => {
      const a = vi.fn()
      const b = vi.fn()
      const c = vi.fn()
      sm.onStatusChange(a)
      sm.onStatusChange(b)
      sm.onStatusChange(c)
      sm.setAvailable(true)
      expect(a).toHaveBeenCalled()
      expect(b).toHaveBeenCalled()
      expect(c).toHaveBeenCalled()
    })

    it("a throwing listener does not prevent others from being called", () => {
      const bad = vi.fn().mockImplementation(() => { throw new Error("boom") })
      const good = vi.fn()
      sm.onStatusChange(bad)
      sm.onStatusChange(good)
      // Should not throw at the call site
      expect(() => sm.setAvailable(true)).not.toThrow()
      expect(good).toHaveBeenCalled()
    })

    it("removing one listener does not affect remaining listeners", () => {
      const a = vi.fn()
      const b = vi.fn()
      const unsubA = sm.onStatusChange(a)
      sm.onStatusChange(b)
      unsubA()
      sm.setAvailable(true)
      expect(a).not.toHaveBeenCalled()
      expect(b).toHaveBeenCalled()
    })

    it("calling unsub twice is safe (no throw, no double-removal error)", () => {
      const cb = vi.fn()
      const unsub = sm.onStatusChange(cb)
      unsub()
      expect(() => unsub()).not.toThrow()
    })
  })

  // ─── Polling lifecycle ──────────────────────────────────────────────────────

  describe("start() / stop()", () => {
    it("start() sets polling to true", () => {
      window.electron = { ping: vi.fn().mockResolvedValue({ ok: true }) }
      sm.start()
      expect(sm.getStatus().polling).toBe(true)
    })

    it("stop() sets polling to false", () => {
      window.electron = { ping: vi.fn().mockResolvedValue({ ok: true }) }
      sm.start()
      sm.stop()
      expect(sm.getStatus().polling).toBe(false)
    })

    it("start() is idempotent — calling twice does not create two intervals", async () => {
      const ping = vi.fn().mockResolvedValue({ ok: true })
      window.electron = { ping }
      sm.start()
      sm.start() // second call should be no-op
      // Give the immediate check time to run.
      await wait(20)
      // Only one interval exists — exactly one immediate call.
      expect(ping).toHaveBeenCalledTimes(1)
    })

    it("stop() after stop() is a no-op (no throw)", () => {
      sm.stop()
      expect(() => sm.stop()).not.toThrow()
    })

    it("poll fires 'online' when PostgreSQL becomes reachable", async () => {
      const cb = vi.fn()
      sm.onStatusChange(cb)
      window.electron = {
        ping: vi.fn().mockResolvedValue({ ok: true, timestamp: Date.now() }),
      }
      sm.start()
      await wait(30) // wait for immediate _doCheck
      sm.stop()
      expect(cb).toHaveBeenCalledWith({ type: "online" })
      expect(sm.available).toBe(true)
    })

    it("poll fires 'offline' when PostgreSQL becomes unreachable", async () => {
      const cb = vi.fn()
      // Start as available.
      sm.setAvailable(true)
      sm.onStatusChange(cb)
      // Ping will now fail.
      window.electron = { ping: vi.fn().mockRejectedValue(new Error("down")) }
      sm.start()
      await wait(30)
      sm.stop()
      expect(cb).toHaveBeenCalledWith({ type: "offline" })
      expect(sm.available).toBe(false)
    })

    it("poll does NOT fire events when availability is unchanged", async () => {
      const cb = vi.fn()
      sm.onStatusChange(cb)
      // Already false, ping also returns false.
      window.electron = { ping: vi.fn().mockRejectedValue(new Error("still down")) }
      sm.start()
      await wait(30)
      sm.stop()
      // No transition occurred, so no event should have fired.
      expect(cb).not.toHaveBeenCalled()
    })
  })

  // ─── _doCheck integration ───────────────────────────────────────────────────

  describe("_doCheck() internal method", () => {
    it("updates available when health check succeeds", async () => {
      window.electron = { ping: vi.fn().mockResolvedValue({ ok: true }) }
      await sm._doCheck()
      expect(sm.available).toBe(true)
    })

    it("updates available when health check fails", async () => {
      sm.setAvailable(true)
      window.electron = { ping: vi.fn().mockRejectedValue(new Error("err")) }
      await sm._doCheck()
      expect(sm.available).toBe(false)
    })

    it("fires 'online' on first successful check after init", async () => {
      const cb = vi.fn()
      sm.onStatusChange(cb)
      window.electron = { ping: vi.fn().mockResolvedValue({ ok: true }) }
      await sm._doCheck()
      expect(cb).toHaveBeenCalledWith({ type: "online" })
    })

    it("fires 'offline' when previously available and check fails", async () => {
      sm.setAvailable(true)
      const cb = vi.fn()
      sm.onStatusChange(cb)
      window.electron = { ping: vi.fn().mockRejectedValue(new Error("x")) }
      await sm._doCheck()
      expect(cb).toHaveBeenCalledWith({ type: "offline" })
    })
  })

  // ─── getStatus ──────────────────────────────────────────────────────────────

  describe("getStatus()", () => {
    it("reflects current available state", () => {
      sm.setAvailable(true)
      expect(sm.getStatus().available).toBe(true)
    })

    it("reflects all dirty collections as an array", () => {
      sm.markDirty("todos")
      sm.markDirty("tags")
      const { dirty } = sm.getStatus()
      expect(Array.isArray(dirty)).toBe(true)
      expect(dirty).toContain("todos")
      expect(dirty).toContain("tags")
    })

    it("reflects polling state correctly", () => {
      expect(sm.getStatus().polling).toBe(false)
      window.electron = { ping: vi.fn().mockResolvedValue({ ok: true }) }
      sm.start()
      expect(sm.getStatus().polling).toBe(true)
      sm.stop()
      expect(sm.getStatus().polling).toBe(false)
    })
  })

  // ─── Edge cases ─────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles ping returning a non-object value", async () => {
      window.electron = { ping: vi.fn().mockResolvedValue("ok") }
      expect(await sm.checkHealth()).toBe(false)
    })

    it("handles ping returning undefined", async () => {
      window.electron = { ping: vi.fn().mockResolvedValue(undefined) }
      expect(await sm.checkHealth()).toBe(false)
    })

    it("handles ping returning { ok: 1 } (truthy but not true)", async () => {
      window.electron = { ping: vi.fn().mockResolvedValue({ ok: 1 }) }
      // Strict === true check should return false.
      expect(await sm.checkHealth()).toBe(false)
    })

    it("transitions correctly through multiple online/offline cycles", async () => {
      const events = []
      sm.onStatusChange((e) => events.push(e.type))

      sm.setAvailable(true)   // offline→online
      sm.setAvailable(false)  // online→offline
      sm.setAvailable(false)  // no change
      sm.setAvailable(true)   // offline→online
      sm.setAvailable(true)   // no change
      sm.setAvailable(false)  // online→offline

      expect(events).toEqual(["online", "offline", "online", "offline"])
    })

    it("markDirty accepts arbitrary string collection names without throwing", () => {
      expect(() => sm.markDirty("unknown_collection")).not.toThrow()
      expect(sm.isDirty("unknown_collection")).toBe(true)
    })

    it("concurrent async checks resolve without race condition", async () => {
      let calls = 0
      window.electron = {
        ping: vi.fn().mockImplementation(async () => {
          calls++
          await wait(5)
          return { ok: true }
        }),
      }
      // Fire multiple checks simultaneously.
      await Promise.all([sm._doCheck(), sm._doCheck(), sm._doCheck()])
      expect(sm.available).toBe(true)
    })

    it("clearAllDirty after no marks is a no-op", () => {
      expect(() => sm.clearAllDirty()).not.toThrow()
      expect(sm.hasDirty()).toBe(false)
    })

    it("getDirty returns an empty Set when nothing is dirty", () => {
      const d = sm.getDirty()
      expect(d instanceof Set).toBe(true)
      expect(d.size).toBe(0)
    })
  })
})
