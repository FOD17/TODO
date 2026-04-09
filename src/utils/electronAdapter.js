/**
 * API Client — Next.js fetch-based replacement for the Electron IPC adapter.
 *
 * Keeps the same public interface so all existing components work unchanged.
 * Every method calls a Next.js API route instead of window.electron.*.
 */

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

class ApiClient {
  /** No-op — kept for interface compatibility. Server is always available. */
  onDataRefresh() {
    return () => {}
  }

  // ── TODOS ─────────────────────────────────────────────────────────────────
  async getTodos() {
    return apiFetch('/api/todos')
  }

  async saveTodos(data) {
    return apiFetch('/api/todos', { method: 'PUT', body: JSON.stringify(data) })
  }

  async addTodo(data) {
    return apiFetch('/api/todos', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateTodo(id, updates) {
    return apiFetch(`/api/todos/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
  }

  async deleteTodo(id) {
    return apiFetch(`/api/todos/${id}`, { method: 'DELETE' })
  }

  async completeTodo(id) {
    return apiFetch(`/api/todos/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'complete' }) })
  }

  async uncompleteTodo(id) {
    return apiFetch(`/api/todos/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'uncomplete' }) })
  }

  // ── TAGS ─────────────────────────────────────────────────────────────────
  async getTags() {
    return apiFetch('/api/tags')
  }

  async saveTags(data) {
    return apiFetch('/api/tags', { method: 'PUT', body: JSON.stringify(data) })
  }

  async addTag(company, tagName) {
    const tags = await this.getTags()
    if (!tags.companies.includes(company)) tags.companies.push(company)
    return this.saveTags(tags)
  }

  async removeTag(company, tagName) {
    const tags = await this.getTags()
    return this.saveTags(tags)
  }

  // ── CONTACTS ─────────────────────────────────────────────────────────────
  async getContacts() {
    return apiFetch('/api/contacts')
  }

  async saveContacts(data) {
    return apiFetch('/api/contacts', { method: 'PUT', body: JSON.stringify(data) })
  }

  async addContact(company, contact) {
    return apiFetch('/api/contacts', { method: 'POST', body: JSON.stringify({ company, ...contact }) })
  }

  async updateContact(company, contactId, updates) {
    return apiFetch(`/api/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify({ company, ...updates }),
    })
  }

  async deleteContact(company, contactId) {
    return apiFetch(`/api/contacts/${contactId}?company=${encodeURIComponent(company)}`, { method: 'DELETE' })
  }

  // ── CONFIG ────────────────────────────────────────────────────────────────
  async getConfig() {
    return apiFetch('/api/config')
  }

  async updateConfig(config) {
    return apiFetch('/api/config', { method: 'PUT', body: JSON.stringify(config) })
  }

  // ── BACKUP ────────────────────────────────────────────────────────────────
  async exportBackup() {
    return apiFetch('/api/backup')
  }

  async importBackup(data) {
    return apiFetch('/api/backup', { method: 'POST', body: JSON.stringify(data) })
  }

  // ── AUDIO MESSAGES ────────────────────────────────────────────────────────
  // Stored in localStorage only — base64 blobs are too large for the DB.
  async getAudioMessages() {
    try {
      const raw = localStorage.getItem('audio_messages')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  }

  async saveAudioMessages(data) {
    try { localStorage.setItem('audio_messages', JSON.stringify(data)) } catch (e) {
      console.error('[ApiClient] Failed to save audio messages:', e)
    }
    return data
  }

  // ── EMAILS ────────────────────────────────────────────────────────────────
  // Stored in localStorage only (same reasoning as audio).
  async getEmails() {
    try {
      const raw = localStorage.getItem('email_files')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  }

  async saveEmails(data) {
    try { localStorage.setItem('email_files', JSON.stringify(data)) } catch (e) {
      console.error('[ApiClient] Failed to save emails:', e)
    }
    return data
  }

  // ── CONNECTION ────────────────────────────────────────────────────────────
  // In Next.js, the connection is configured via DATABASE_URL in .env.local.
  async getConnectionInfo() {
    return { configured: true, note: 'Set DATABASE_URL in .env.local' }
  }

  async testConnection() {
    return apiFetch('/api/health')
  }

  async setConnection() {
    return { ok: false, error: 'In Next.js, edit DATABASE_URL in .env.local and restart the server.' }
  }

  async getStatus() {
    try { return await apiFetch('/api/health') }
    catch (err) { return { ok: false, error: err.message } }
  }
}

export const electronAdapter = new ApiClient()
