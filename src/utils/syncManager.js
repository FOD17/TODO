/**
 * SyncManager
 *
 * Manages the reliability layer between SQLite (source of truth) and
 * localStorage (backup). Provides:
 *
 *  - Health-check polling: pings the SQLite IPC bridge on a fixed interval
 *  - Dirty tracking: records which data collections were mutated while SQLite
 *    was unreachable so they can be synced when connectivity is restored
 *  - Status-change events: notifies listeners when SQLite goes offline or
 *    comes back online so the rest of the app can react immediately
 *
 * Usage
 * -----
 *   import { syncManager } from './syncManager'
 *
 *   syncManager.start()          // begin polling (idempotent)
 *   syncManager.stop()           // stop polling
 *
 *   syncManager.available        // boolean — is SQLite reachable right now?
 *   syncManager.markDirty('todos')
 *   syncManager.hasDirty()       // true if anything needs syncing
 *
 *   const unsub = syncManager.onStatusChange(({ type }) => {
 *     if (type === 'online') { ... }   // SQLite came back
 *     if (type === 'offline') { ... }  // SQLite went down
 *   })
 *   unsub()  // remove listener
 */

export class SyncManager {
  constructor({ pollIntervalMs = 5_000 } = {}) {
    /** @type {boolean} Current SQLite reachability */
    this._available = false

    /**
     * Set to true by stop() so that any in-flight _doCheck() call
     * discards its result rather than firing stale events.
     * Reset to false by start() so the next polling cycle is active.
     * @type {boolean}
     */
    this._stopped = false

    /**
     * Collections that were mutated while SQLite was unreachable.
     * Valid values: 'todos' | 'tags' | 'contacts' | 'config'
     * @type {Set<string>}
     */
    this._dirty = new Set()

    /** @type {Array<Function>} Status-change listeners */
    this._listeners = []

    /** @type {ReturnType<typeof setInterval> | null} */
    this._timer = null

    this.POLL_INTERVAL_MS = pollIntervalMs
  }

  // ─── Public getters ────────────────────────────────────────────────────────

  /** True when SQLite is currently reachable. */
  get available() {
    return this._available
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Start background health-check polling.
   * Idempotent — calling more than once has no effect.
   */
  start() {
    if (this._timer !== null) return
    this._stopped = false
    // Kick off an immediate check before the first interval fires.
    this._doCheck()
    this._timer = setInterval(() => this._doCheck(), this.POLL_INTERVAL_MS)
  }

  /** Stop background polling. */
  stop() {
    // Mark stopped BEFORE clearing the timer so any in-flight _doCheck()
    // that checks this flag after its await will discard its result.
    this._stopped = true
    if (this._timer !== null) {
      clearInterval(this._timer)
      this._timer = null
    }
  }

  // ─── Availability management ───────────────────────────────────────────────

  /**
   * Perform a single health check and update internal state.
   * Called automatically by the polling interval; also exposed for testing.
   */
  async _doCheck() {
    const wasAvailable = this._available
    const nowAvailable = await this.checkHealth()

    // If stop() was called while the health check was in-flight, discard the
    // result so we don't fire stale events from a cancelled poll cycle.
    if (this._stopped) return

    this._available = nowAvailable

    if (!wasAvailable && nowAvailable) {
      this._emit("online")
    } else if (wasAvailable && !nowAvailable) {
      this._emit("offline")
    }
  }

  /**
   * Probe the SQLite IPC bridge.
   * Returns true only when window.electron.ping() resolves with { ok: true }.
   * Any error or missing bridge returns false without throwing.
   */
  async checkHealth() {
    try {
      if (typeof window === "undefined") return false
      if (!window.electron?.ping) return false
      const result = await window.electron.ping()
      return result?.ok === true
    } catch {
      return false
    }
  }

  /**
   * Directly set SQLite availability. Use this when an IPC call fails or
   * succeeds outside of the polling cycle (e.g., the adapter catches a thrown
   * error and wants to mark SQLite offline immediately rather than waiting for
   * the next poll).
   *
   * Fires the appropriate status-change event if the value changed.
   *
   * @param {boolean} val
   */
  setAvailable(val) {
    const was = this._available
    this._available = val
    if (!was && val) this._emit("online")
    else if (was && !val) this._emit("offline")
  }

  // ─── Dirty collection tracking ─────────────────────────────────────────────

  /**
   * Mark a data collection as dirty (localStorage has data that SQLite does
   * not, because a write failed or was skipped while SQLite was unreachable).
   *
   * @param {'todos'|'tags'|'contacts'|'config'} collection
   */
  markDirty(collection) {
    this._dirty.add(collection)
  }

  /**
   * Clear the dirty flag for a collection after it has been successfully
   * synced to SQLite.
   *
   * @param {'todos'|'tags'|'contacts'|'config'} collection
   */
  clearDirty(collection) {
    this._dirty.delete(collection)
  }

  /**
   * Returns true if the given collection has pending un-synced changes.
   * @param {string} collection
   */
  isDirty(collection) {
    return this._dirty.has(collection)
  }

  /** Returns a snapshot of all dirty collection names. */
  getDirty() {
    return new Set(this._dirty)
  }

  /** True if any collection has un-synced changes. */
  hasDirty() {
    return this._dirty.size > 0
  }

  /** Remove all dirty flags (use with care — only after a full successful sync). */
  clearAllDirty() {
    this._dirty.clear()
  }

  // ─── Event listeners ───────────────────────────────────────────────────────

  /**
   * Subscribe to status-change events.
   *
   * The callback receives a single object: { type: 'online' | 'offline' }
   *
   * @param {Function} fn
   * @returns {Function} Unsubscribe function
   */
  onStatusChange(fn) {
    this._listeners.push(fn)
    return () => {
      this._listeners = this._listeners.filter((l) => l !== fn)
    }
  }

  /** @private */
  _emit(type) {
    for (const fn of this._listeners) {
      try {
        fn({ type })
      } catch (err) {
        console.error("[SyncManager] listener error:", err)
      }
    }
  }

  // ─── Diagnostics ───────────────────────────────────────────────────────────

  /**
   * Returns a plain-object snapshot of current sync state.
   * Useful for debugging or displaying in a status UI.
   */
  getStatus() {
    return {
      available: this._available,
      dirty: Array.from(this._dirty),
      polling: this._timer !== null,
    }
  }
}

/** Singleton instance used by the rest of the application. */
export const syncManager = new SyncManager()
