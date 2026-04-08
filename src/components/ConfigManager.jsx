import React, { useState, useEffect, useRef } from "react"
import { saveConfigLocalStorage } from "../utils/markdownHandler"
import { electronAdapter } from "../utils/electronAdapter"
import {
  addCompany,
  removeCompany,
  addAccountExecutive,
  updateAccountExecutive,
  removeAccountExecutive,
  getCompanies,
  getAccountExecutives,
  addLabel,
  updateLabel,
  removeLabel,
  getLabels,
  groupLabelsByTag,
} from "../utils/tagManager"

const SYNC_INTERVALS = [
  { label: "Every 30 minutes", value: 30 },
  { label: "Every hour", value: 60 },
  { label: "Every 3 hours", value: 180 },
  { label: "Every 6 hours", value: 360 },
  { label: "Every 12 hours", value: 720 },
  { label: "Every 24 hours", value: 1440 },
]

const EXPORT_FORMATS = [
  { value: "json", label: "App JSON", desc: "Full fidelity — reimportable" },
  { value: "csv", label: "CSV", desc: "Tasks only — Google Sheets / Excel" },
  { value: "markdown", label: "Markdown", desc: "Human-readable — Google Docs" },
]

const PRESET_COLORS = [
  "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#1abc9c",
  "#3498db", "#9b59b6", "#e91e63", "#607d8b", "#795548",
]

function ConfigManager({
  config,
  onConfigChange,
  showConfig,
  setShowConfig,
  tags = {},
  onTagsChange = () => {},
  onManualExport = () => {},
  onSelectSyncFolder = () => {},
  defaultTab = "theme",
}) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  // Jump to defaultTab each time the modal opens
  const wasOpen = useRef(false)
  useEffect(() => {
    if (showConfig && !wasOpen.current) {
      setActiveTab(defaultTab)
    }
    wasOpen.current = showConfig
  }, [showConfig, defaultTab])
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyType, setNewCompanyType] = useState("company")
  const [newAEName, setNewAEName] = useState("")
  const [newAEEmail, setNewAEEmail] = useState("")
  const [editingAE, setEditingAE] = useState(null)
  const [newLabelName, setNewLabelName] = useState("")
  const [newLabelColor, setNewLabelColor] = useState("#3498db")
  const [newLabelDescription, setNewLabelDescription] = useState("")
  const [editingLabel, setEditingLabel] = useState(null)
  const [exportStatus, setExportStatus] = useState("")

  // ── Required table SQL ─────────────────────────────────────────────────────
  const TABLE_SQL = {
    todos: `CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  date TEXT NOT NULL,
  company TEXT,
  names TEXT,
  "accountRep" TEXT,
  completed BOOLEAN DEFAULT FALSE,
  description TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
    tags: `CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  "tagName" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company, "tagName")
);`,
    contacts: `CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
    config: `CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
  }

  // ── Database connection state ───────────────────────────────────────────────
  const [dbHost, setDbHost] = useState("localhost")
  const [dbPort, setDbPort] = useState("5432")
  const [dbName, setDbName] = useState("postgres")
  const [dbUser, setDbUser] = useState("")
  const [dbPassword, setDbPassword] = useState("")
  const [dbShowPassword, setDbShowPassword] = useState(false)
  const [dbTestStatus, setDbTestStatus] = useState(null)  // null | "testing" | { ok, error }
  const [dbSaveStatus, setDbSaveStatus] = useState(null)  // null | "saving" | { ok, error }
  const [dbInfoLoaded, setDbInfoLoaded] = useState(false)

  // Load current connection info when the Database tab is first opened
  useEffect(() => {
    if (activeTab === "database" && !dbInfoLoaded) {
      electronAdapter.getConnectionInfo().then((info) => {
        if (info) {
          setDbHost(info.host || "localhost")
          setDbPort(String(info.port || 5432))
          setDbName(info.database || "postgres")
          setDbUser(info.user || "")
          // Never pre-fill the password field — user must re-enter to change
        }
        setDbInfoLoaded(true)
      })
    }
  }, [activeTab, dbInfoLoaded])

  const companies = getCompanies(tags)
  const companyTypes = tags.companyTypes || {}
  const accountExecutives = getAccountExecutives(tags)
  const allLabels = getLabels(tags) // already sorted alphabetically
  const grouped = groupLabelsByTag(allLabels)

  const handleThemeChange = (theme) => {
    const newConfig = { ...config, theme }
    saveConfigLocalStorage(newConfig)
    onConfigChange(newConfig)
  }

  const handleConfigChange = (key, value) => {
    const newConfig = { ...config, [key]: value }
    saveConfigLocalStorage(newConfig)
    onConfigChange(newConfig)
  }

  // ── Companies ──────────────────────────────────────────────────────────────

  const handleAddCompany = (e) => {
    e.preventDefault()
    if (!newCompanyName.trim()) return
    onTagsChange(addCompany(tags, newCompanyName.trim(), newCompanyType))
    setNewCompanyName("")
    setNewCompanyType("company")
  }

  const handleRemoveCompany = (company) => {
    onTagsChange(removeCompany(tags, company))
  }

  // ── Account Executives ─────────────────────────────────────────────────────

  const handleAddAccountExecutive = (e) => {
    e.preventDefault()
    if (!newAEName.trim()) return
    onTagsChange(addAccountExecutive(tags, newAEName.trim(), newAEEmail.trim()))
    setNewAEName("")
    setNewAEEmail("")
  }

  const handleUpdateAccountExecutive = (e) => {
    e.preventDefault()
    if (!editingAE || !newAEName.trim()) return
    onTagsChange(updateAccountExecutive(tags, editingAE.id, newAEName.trim(), newAEEmail.trim()))
    setNewAEName("")
    setNewAEEmail("")
    setEditingAE(null)
  }

  const handleRemoveAccountExecutive = (id) => {
    onTagsChange(removeAccountExecutive(tags, id))
  }

  const startEditingAE = (ae) => {
    setEditingAE(ae)
    setNewAEName(ae.name)
    setNewAEEmail(ae.email || "")
  }

  // ── Labels ─────────────────────────────────────────────────────────────────

  const handleAddLabel = (e) => {
    e.preventDefault()
    if (!newLabelName.trim()) return
    onTagsChange(addLabel(tags, newLabelName.trim(), newLabelColor, newLabelDescription.trim()))
    setNewLabelName("")
    setNewLabelColor("#3498db")
    setNewLabelDescription("")
  }

  const handleUpdateLabel = (e) => {
    e.preventDefault()
    if (!editingLabel || !newLabelName.trim()) return
    onTagsChange(updateLabel(tags, editingLabel.id, newLabelName.trim(), newLabelColor, newLabelDescription.trim()))
    setNewLabelName("")
    setNewLabelColor("#3498db")
    setNewLabelDescription("")
    setEditingLabel(null)
  }

  const handleRemoveLabel = (id) => {
    onTagsChange(removeLabel(tags, id))
  }

  const startEditingLabel = (label) => {
    setEditingLabel(label)
    setNewLabelName(label.name)
    setNewLabelColor(label.color)
    setNewLabelDescription(label.description || "")
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  const handleManualExport = (format) => {
    setExportStatus("Exporting…")
    try {
      onManualExport(format)
      setExportStatus(`Exported as ${format.toUpperCase()}`)
    } catch {
      setExportStatus("Export failed")
    }
    setTimeout(() => setExportStatus(""), 3000)
  }

  // ── Database connection ────────────────────────────────────────────────────

  const dbParams = () => ({
    host: dbHost.trim() || "localhost",
    port: parseInt(dbPort) || 5432,
    database: dbName.trim() || "postgres",
    user: dbUser.trim(),
    password: dbPassword,
  })

  const handleTestConnection = async () => {
    setDbTestStatus("testing")
    setDbSaveStatus(null)
    const result = await electronAdapter.testConnection(dbParams())
    setDbTestStatus(result)
  }

  const handleSaveConnection = async () => {
    setDbSaveStatus("saving")
    setDbTestStatus(null)
    const result = await electronAdapter.setConnection(dbParams())
    setDbSaveStatus(result)
    if (result.ok) {
      setDbPassword("") // clear password from memory after save
    }
  }

  const themes = {
    "modern-light": { name: "Modern Light", description: "Clean, bright interface" },
    "one-light": { name: "One Light", description: "Atom One Light" },
    "github-light": { name: "GitHub Light", description: "GitHub's clean light theme" },
    "solarized-light": { name: "Solarized Light", description: "Precision colors" },
    "modern-dark": { name: "Modern Dark", description: "Dark mode with contrast" },
    "one-dark": { name: "One Dark", description: "Atom One Dark" },
    dracula: { name: "Dracula", description: "Dark theme" },
    nord: { name: "Nord", description: "Arctic palette" },
    "solarized-dark": { name: "Solarized Dark", description: "Solarized dark" },
    "gruvbox-dark": { name: "Gruvbox Dark", description: "Retro groove" },
    "github-dark": { name: "GitHub Dark", description: "GitHub dark" },
    forest: { name: "Forest", description: "Green nature theme" },
    ocean: { name: "Ocean", description: "Blue ocean theme" },
    sunset: { name: "Sunset", description: "Warm sunset colors" },
  }

  const tabs = [
    { id: "theme", label: "🎨 Theme" },
    { id: "companies", label: "🏢 Companies" },
    { id: "executives", label: "👤 Executives" },
    { id: "labels", label: "🏷 Tags" },
    { id: "export", label: "📤 Export & Sync" },
    { id: "database", label: "🔌 Database" },
  ]

  if (!showConfig) return null

  return (
    <>
      <div
        className="config-modal-overlay"
        onClick={() => setShowConfig(false)}
        aria-label="Close settings"
        role="button"
        tabIndex={-1}
        onKeyDown={(e) => e.key === "Escape" && setShowConfig(false)}
      />
      <div
        className="config-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="config-header">
          <h2 id="config-dialog-title">⚙️ Settings</h2>
          <button
            onClick={() => setShowConfig(false)}
            className="btn-close"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="config-tabs" role="tablist" aria-label="Settings sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="config-content">

          {/* ── THEME ── */}
          {activeTab === "theme" && (
            <>
              <section className="config-section">
                <h3>Color Theme</h3>
                <div className="themes-grid">
                  {Object.entries(themes).map(([key, theme]) => (
                    <button
                      key={key}
                      className={`theme-card ${config.theme === key ? "active" : ""}`}
                      onClick={() => handleThemeChange(key)}
                      aria-pressed={config.theme === key}
                    >
                      <div className="theme-name">{theme.name}</div>
                      <div className="theme-desc">{theme.description}</div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="config-section">
                <h3>Layout Options</h3>
                <div className="config-option">
                  <label htmlFor="compact-mode-toggle">
                    <input
                      id="compact-mode-toggle"
                      type="checkbox"
                      checked={config.compactMode || false}
                      onChange={(e) => handleConfigChange("compactMode", e.target.checked)}
                    />
                    Compact Mode
                  </label>
                  <span className="help-text">Reduce spacing and font sizes</span>
                </div>
              </section>
            </>
          )}

          {/* ── COMPANIES ── */}
          {activeTab === "companies" && (
            <>
              <section className="config-section">
                <h3>Add New Entry</h3>
                <form onSubmit={handleAddCompany} className="tag-form">
                  <input
                    type="text"
                    placeholder="Name (e.g., Acme Corp)"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    className="tag-input"
                    aria-label="Company or vendor name"
                  />
                  <fieldset className="type-fieldset">
                    <legend className="sr-only">Type</legend>
                    <label className="type-radio">
                      <input
                        type="radio"
                        name="company-type"
                        value="company"
                        checked={newCompanyType === "company"}
                        onChange={() => setNewCompanyType("company")}
                      />
                      <span className="type-chip company-chip">🏢 Company</span>
                    </label>
                    <label className="type-radio">
                      <input
                        type="radio"
                        name="company-type"
                        value="vendor"
                        checked={newCompanyType === "vendor"}
                        onChange={() => setNewCompanyType("vendor")}
                      />
                      <span className="type-chip vendor-chip">🔧 Vendor</span>
                    </label>
                  </fieldset>
                  <button type="submit" className="tag-btn-add">
                    ➕ Add
                  </button>
                </form>
              </section>

              <section className="config-section">
                <h3>Companies &amp; Vendors ({companies.length})</h3>
                {companies.length > 0 ? (
                  <div className="tag-list">
                    {companies.map((company) => {
                      const type = companyTypes[company] || "company"
                      return (
                        <div key={company} className="tag-item">
                          <div className="tag-item-content">
                            <span className={`type-dot ${type === "vendor" ? "vendor-dot" : "company-dot"}`} aria-label={type} />
                            <span className="tag-icon">{type === "vendor" ? "🔧" : "🏢"}</span>
                            <div>
                              <span className="tag-name">{company}</span>
                              <span className={`type-badge-small ${type}`}>{type}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveCompany(company)}
                            className="tag-btn-delete"
                            aria-label={`Remove ${company}`}
                          >
                            🗑
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="empty-message">No companies or vendors added yet.</p>
                )}
              </section>
            </>
          )}

          {/* ── EXECUTIVES ── */}
          {activeTab === "executives" && (
            <>
              <section className="config-section">
                <h3>{editingAE ? "Edit" : "Add New"} Account Executive</h3>
                <form
                  onSubmit={editingAE ? handleUpdateAccountExecutive : handleAddAccountExecutive}
                  className="tag-form"
                >
                  <input
                    type="text"
                    placeholder="Name (e.g., John Smith)"
                    value={newAEName}
                    onChange={(e) => setNewAEName(e.target.value)}
                    className="tag-input"
                    aria-label="Account executive name"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={newAEEmail}
                    onChange={(e) => setNewAEEmail(e.target.value)}
                    className="tag-input"
                    aria-label="Account executive email"
                  />
                  <div className="form-buttons">
                    <button type="submit" className="tag-btn-add">
                      {editingAE ? "💾 Update" : "➕ Add"} Executive
                    </button>
                    {editingAE && (
                      <button
                        type="button"
                        onClick={() => { setEditingAE(null); setNewAEName(""); setNewAEEmail("") }}
                        className="tag-btn-cancel"
                      >
                        ✕ Cancel
                      </button>
                    )}
                  </div>
                </form>
              </section>

              <section className="config-section">
                <h3>Account Executives ({accountExecutives.length})</h3>
                {accountExecutives.length > 0 ? (
                  <div className="tag-list">
                    {accountExecutives.map((ae) => (
                      <div key={ae.id} className="tag-item">
                        <div className="tag-item-content">
                          <span className="tag-icon" aria-hidden="true">👤</span>
                          <div className="ae-info">
                            <span className="ae-name">{ae.name}</span>
                            {ae.email && <span className="ae-email">{ae.email}</span>}
                          </div>
                        </div>
                        <div className="tag-actions">
                          <button onClick={() => startEditingAE(ae)} className="tag-btn-edit" aria-label={`Edit ${ae.name}`}>✎</button>
                          <button onClick={() => handleRemoveAccountExecutive(ae.id)} className="tag-btn-delete" aria-label={`Delete ${ae.name}`}>🗑</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-message">No account executives added yet.</p>
                )}
              </section>
            </>
          )}

          {/* ── LABELS ── */}
          {activeTab === "labels" && (
            <>
              <section className="config-section">
                <h3>{editingLabel ? "Edit" : "Create New"} Tag</h3>
                <p className="label-help-text">
                  Use <code>tag:subtag</code> format for scoped labels (e.g., <code>status:pending</code>). Tags are sorted alphabetically.
                </p>
                <form onSubmit={editingLabel ? handleUpdateLabel : handleAddLabel} className="tag-form">
                  <input
                    type="text"
                    placeholder="Tag name (e.g., important)"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="tag-input"
                    aria-label="Tag name"
                    required
                  />
                  <textarea
                    placeholder="Description — shown as a tooltip when clicking this tag (optional)"
                    value={newLabelDescription}
                    onChange={(e) => setNewLabelDescription(e.target.value)}
                    className="tag-input tag-description-input"
                    rows={2}
                    aria-label="Tag description"
                  />
                  <div className="label-color-row">
                    <span className="label-color-label" id="color-label">Color:</span>
                    <div className="label-color-options" role="group" aria-labelledby="color-label">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`label-color-swatch ${newLabelColor === color ? "active" : ""}`}
                          style={{ background: color }}
                          onClick={() => setNewLabelColor(color)}
                          aria-label={color}
                          aria-pressed={newLabelColor === color}
                        />
                      ))}
                      <input
                        type="color"
                        value={newLabelColor}
                        onChange={(e) => setNewLabelColor(e.target.value)}
                        className="label-color-custom"
                        aria-label="Custom color"
                      />
                    </div>
                  </div>

                  {newLabelName.trim() && (
                    <div className="label-preview" aria-live="polite">
                      <span className="label-preview-text">Preview:</span>
                      <span
                        className="label-preview-pill"
                        style={{
                          background: `${newLabelColor}22`,
                          color: newLabelColor,
                          border: `1px solid ${newLabelColor}44`,
                        }}
                      >
                        {newLabelName.trim()}
                      </span>
                    </div>
                  )}

                  <div className="form-buttons">
                    <button type="submit" className="tag-btn-add">
                      {editingLabel ? "💾 Update" : "➕ Add"} Tag
                    </button>
                    {editingLabel && (
                      <button
                        type="button"
                        onClick={() => { setEditingLabel(null); setNewLabelName(""); setNewLabelColor("#3498db"); setNewLabelDescription("") }}
                        className="tag-btn-cancel"
                      >
                        ✕ Cancel
                      </button>
                    )}
                  </div>
                </form>
              </section>

              <section className="config-section">
                <h3>Tags ({allLabels.length})</h3>
                {allLabels.length > 0 ? (
                  <div className="label-groups">
                    {Object.entries(grouped).map(([group, groupLabels]) => (
                      <div key={group} className="label-group">
                        <div className="label-group-header" aria-label={`Group: ${group}`}>{group}</div>
                        <div className="tag-list">
                          {groupLabels.map((label) => (
                            <div key={label.id} className="tag-item">
                              <div className="tag-item-content">
                                <span className="label-dot" style={{ background: label.color }} aria-hidden="true" />
                                <div className="label-info">
                                  <span
                                    className="label-pill-display"
                                    style={{
                                      background: `${label.color}22`,
                                      color: label.color,
                                      border: `1px solid ${label.color}44`,
                                    }}
                                  >
                                    {label.name}
                                  </span>
                                  {label.description && (
                                    <span className="label-desc-preview">{label.description}</span>
                                  )}
                                </div>
                              </div>
                              <div className="tag-actions">
                                <button onClick={() => startEditingLabel(label)} className="tag-btn-edit" aria-label={`Edit tag ${label.name}`}>✎</button>
                                <button onClick={() => handleRemoveLabel(label.id)} className="tag-btn-delete" aria-label={`Delete tag ${label.name}`}>🗑</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-message">No tags created yet.</p>
                )}
              </section>
            </>
          )}

          {/* ── EXPORT & SYNC ── */}
          {activeTab === "export" && (
            <>
              <section className="config-section">
                <h3>Manual Export</h3>
                <p className="label-help-text">Download a snapshot of your data right now.</p>
                <div className="export-format-grid">
                  {EXPORT_FORMATS.map((f) => (
                    <div key={f.value} className="export-format-card">
                      <div className="export-format-info">
                        <span className="export-format-name">{f.label}</span>
                        <span className="export-format-desc">{f.desc}</span>
                      </div>
                      <button
                        className="export-dl-btn"
                        onClick={() => handleManualExport(f.value)}
                        aria-label={`Download ${f.label} export`}
                      >
                        ⬇ Download
                      </button>
                    </div>
                  ))}
                </div>
                {exportStatus && (
                  <p className="export-status" role="status" aria-live="polite">{exportStatus}</p>
                )}
              </section>

              <section className="config-section">
                <h3>Auto Sync to Folder</h3>
                <p className="label-help-text">
                  Select a local folder and enable automatic periodic exports. Uses the{" "}
                  <strong>File System Access API</strong> — supported in Chrome/Edge/Electron.
                </p>

                <div className="sync-folder-row">
                  <div className="sync-folder-display" aria-label="Selected folder">
                    {config.syncFolderName ? (
                      <span className="sync-folder-name">📁 {config.syncFolderName}</span>
                    ) : (
                      <span className="sync-folder-none">No folder selected</span>
                    )}
                  </div>
                  <button
                    className="tag-btn-add sync-pick-btn"
                    onClick={onSelectSyncFolder}
                    disabled={!window.showDirectoryPicker}
                    aria-label="Choose export folder"
                  >
                    📂 Choose Folder
                  </button>
                </div>
                {!window.showDirectoryPicker && (
                  <p className="sync-unavailable">
                    ⚠️ Folder picker is not available in this browser. Use Chrome, Edge, or the Electron app.
                  </p>
                )}

                <div className="sync-options">
                  <div className="config-option">
                    <label htmlFor="auto-sync-toggle">
                      <input
                        id="auto-sync-toggle"
                        type="checkbox"
                        checked={config.autoSyncEnabled || false}
                        disabled={!config.syncFolderName}
                        onChange={(e) => handleConfigChange("autoSyncEnabled", e.target.checked)}
                      />
                      Enable automatic sync
                    </label>
                    {!config.syncFolderName && (
                      <span className="help-text">Select a folder above to enable.</span>
                    )}
                  </div>

                  <div className="config-option">
                    <label htmlFor="sync-interval-select">Sync interval</label>
                    <select
                      id="sync-interval-select"
                      className="sync-interval-select"
                      value={config.syncInterval || 60}
                      onChange={(e) => handleConfigChange("syncInterval", Number(e.target.value))}
                      disabled={!config.autoSyncEnabled}
                    >
                      {SYNC_INTERVALS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="config-option">
                    <label htmlFor="sync-format-select">Sync file format</label>
                    <select
                      id="sync-format-select"
                      className="sync-interval-select"
                      value={config.exportFormat || "json"}
                      onChange={(e) => handleConfigChange("exportFormat", e.target.value)}
                    >
                      {EXPORT_FORMATS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  {config.lastSyncAt && (
                    <p className="last-sync-text">
                      Last synced: {new Date(config.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
          {/* ── DATABASE ── */}
          {activeTab === "database" && (
            <>
              <section className="config-section">
                <h3>Connection</h3>
                <p className="label-help-text">
                  Connects to a local PostgreSQL database. Changes take effect immediately —
                  the app hot-swaps the connection without restarting.
                </p>
                <p style={{ fontSize: 11, color: typeof window !== "undefined" && window.electron ? "#2ecc71" : "#e74c3c", marginBottom: 8 }}>
                  {typeof window !== "undefined" && window.electron ? "✓ Electron bridge detected" : "✗ Electron bridge NOT detected — open DevTools console and check for [preload] log"}
                </p>

                <div className="db-form">
                  <div className="db-form-row">
                    <div className="db-form-field db-field-grow">
                      <label htmlFor="db-host">Host</label>
                      <input
                        id="db-host"
                        type="text"
                        className="tag-input"
                        value={dbHost}
                        onChange={(e) => setDbHost(e.target.value)}
                        placeholder="localhost"
                        autoComplete="off"
                      />
                    </div>
                    <div className="db-form-field db-field-port">
                      <label htmlFor="db-port">Port</label>
                      <input
                        id="db-port"
                        type="number"
                        className="tag-input"
                        value={dbPort}
                        onChange={(e) => setDbPort(e.target.value)}
                        placeholder="5432"
                        min="1"
                        max="65535"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="db-form-field">
                    <label htmlFor="db-name">Database</label>
                    <input
                      id="db-name"
                      type="text"
                      className="tag-input"
                      value={dbName}
                      onChange={(e) => setDbName(e.target.value)}
                      placeholder="postgres"
                      autoComplete="off"
                    />
                  </div>

                  <div className="db-form-field">
                    <label htmlFor="db-user">Username</label>
                    <input
                      id="db-user"
                      type="text"
                      className="tag-input"
                      value={dbUser}
                      onChange={(e) => setDbUser(e.target.value)}
                      placeholder="Leave blank to use system default"
                      autoComplete="username"
                    />
                  </div>

                  <div className="db-form-field">
                    <label htmlFor="db-password">Password</label>
                    <div className="db-password-row">
                      <input
                        id="db-password"
                        type={dbShowPassword ? "text" : "password"}
                        className="tag-input db-password-input"
                        value={dbPassword}
                        onChange={(e) => setDbPassword(e.target.value)}
                        placeholder="Leave blank if no password required"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="db-toggle-pw"
                        onClick={() => setDbShowPassword((v) => !v)}
                        aria-label={dbShowPassword ? "Hide password" : "Show password"}
                        title={dbShowPassword ? "Hide password" : "Show password"}
                      >
                        {dbShowPassword ? "🙈" : "👁"}
                      </button>
                    </div>
                    <span className="help-text" style={{ marginLeft: 0 }}>
                      Saved encrypted via macOS Keychain — never stored as plain text.
                    </span>
                  </div>

                  <div className="db-actions">
                    <button
                      type="button"
                      className="tag-btn-cancel db-btn"
                      onClick={handleTestConnection}
                      disabled={dbTestStatus === "testing" || dbSaveStatus === "saving"}
                      aria-label="Test database connection"
                    >
                      {dbTestStatus === "testing" ? "Testing…" : "Test Connection"}
                    </button>
                    <button
                      type="button"
                      className="tag-btn-add db-btn"
                      onClick={handleSaveConnection}
                      disabled={dbTestStatus === "testing" || dbSaveStatus === "saving"}
                      aria-label="Save connection and reconnect"
                    >
                      {dbSaveStatus === "saving" ? "Connecting…" : "Save & Connect"}
                    </button>
                  </div>

                  {dbTestStatus && dbTestStatus !== "testing" && (
                    <div role="status" aria-live="polite">
                      <div className={`db-status-msg ${dbTestStatus.ok ? "db-status-ok" : "db-status-err"}`}>
                        {dbTestStatus.ok
                          ? dbTestStatus.missingTables?.length === 0
                            ? "Connection successful — all required tables present"
                            : `Connection successful — ${dbTestStatus.missingTables.length} missing table${dbTestStatus.missingTables.length > 1 ? "s" : ""} (see below)`
                          : `Connection failed: ${dbTestStatus.error}`}
                      </div>

                      {dbTestStatus.ok && dbTestStatus.missingTables?.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-primary)" }}>
                            Run the following SQL in your database to create the missing tables:
                          </p>
                          {dbTestStatus.missingTables.map((table) => (
                            <div key={table} style={{ marginBottom: 10 }}>
                              <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 3, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                {table}
                              </p>
                              <pre style={{
                                fontSize: 11,
                                background: "var(--bg-secondary, #1e1e1e)",
                                color: "var(--text-primary, #d4d4d4)",
                                padding: "10px 12px",
                                borderRadius: 6,
                                overflowX: "auto",
                                margin: 0,
                                border: "1px solid var(--border-color, #333)",
                                userSelect: "all",
                              }}>
                                {TABLE_SQL[table]}
                              </pre>
                            </div>
                          ))}
                          <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                            After running the SQL, click Save &amp; Connect — the app will create any missing tables automatically on first connect.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {dbSaveStatus && dbSaveStatus !== "saving" && (
                    <div
                      className={`db-status-msg ${dbSaveStatus.ok ? "db-status-ok" : "db-status-err"}`}
                      role="status"
                      aria-live="polite"
                    >
                      {dbSaveStatus.ok
                        ? "Connected and saved — the app is now using this database"
                        : `Failed to connect: ${dbSaveStatus.error}`}
                    </div>
                  )}
                </div>
              </section>

              <section className="config-section">
                <h3>Tips</h3>
                <ul className="db-tips">
                  <li>The default connection is <code>localhost:5432/postgres</code> with no username or password.</li>
                  <li>To verify PostgreSQL is running, open Terminal and run: <code>psql -d postgres -c "SELECT version();"</code></li>
                  <li>To inspect the app tables in DBeaver, connect to your database and look for <code>todos</code>, <code>tags</code>, <code>contacts</code>, and <code>config</code>.</li>
                </ul>
              </section>
            </>
          )}
        </div>
      </div>

      <style>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .config-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .config-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--card);
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          width: 90%;
          max-width: 720px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1001;
          animation: slideUp 0.25s ease;
        }

        @keyframes slideUp {
          from { transform: translate(-50%, calc(-50% + 16px)); opacity: 0; }
          to   { transform: translate(-50%, -50%); opacity: 1; }
        }

        .config-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .config-header h2 {
          margin: 0;
          font-size: 20px;
          color: var(--text);
        }

        .btn-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: var(--text-muted);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .btn-close:hover { background: var(--background); color: var(--text); }
        .btn-close:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

        .config-tabs {
          display: flex;
          gap: 4px;
          padding: 12px 20px;
          border-bottom: 1px solid var(--border);
          overflow-x: auto;
          flex-shrink: 0;
          scrollbar-width: none;
        }
        .config-tabs::-webkit-scrollbar { display: none; }

        .tab-btn {
          padding: 7px 14px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 13px;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .tab-btn:hover { background: var(--background); color: var(--text); }
        .tab-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
        .tab-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

        .config-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }

        .config-section { margin-bottom: 28px; }
        .config-section h3 { margin: 0 0 12px; font-size: 15px; color: var(--text); font-weight: 600; }

        .config-option { margin-bottom: 12px; }
        .config-option label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: var(--text);
          font-size: 14px;
        }
        .config-option input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: var(--primary); }

        .help-text {
          display: block;
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 4px;
          margin-left: 24px;
        }

        /* Themes */
        .themes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
          margin-bottom: 12px;
        }

        .theme-card {
          background: var(--background);
          color: var(--text);
          border: 2px solid var(--border);
          border-radius: 8px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: center;
          min-height: 72px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          position: relative;
        }

        .theme-card:hover { border-color: var(--primary); transform: translateY(-1px); }
        .theme-card:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
        .theme-card.active { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(52,152,219,0.2); }
        .theme-card.active::after {
          content: "✓";
          position: absolute;
          top: 6px;
          right: 8px;
          font-size: 13px;
          font-weight: 700;
          color: var(--primary);
        }

        .theme-name { font-weight: 700; font-size: 14px; margin-bottom: 4px; color: var(--text); }
        .theme-desc { font-size: 12px; color: var(--text-muted); }

        /* Company type */
        .type-fieldset { border: none; padding: 0; margin: 0; display: flex; gap: 10px; }
        .type-radio { display: flex; align-items: center; gap: 6px; cursor: pointer; }
        .type-radio input[type="radio"] { accent-color: var(--primary); width: 15px; height: 15px; }
        .type-chip {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s;
        }
        .company-chip { background: rgba(52,152,219,0.12); color: #2980b9; border-color: rgba(52,152,219,0.3); }
        .vendor-chip { background: rgba(230,126,34,0.12); color: #d35400; border-color: rgba(230,126,34,0.3); }

        .type-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .company-dot { background: #3498db; }
        .vendor-dot { background: #e67e22; }

        .type-badge-small {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          padding: 1px 6px;
          border-radius: 8px;
          margin-left: 6px;
        }
        .type-badge-small.company { background: rgba(52,152,219,0.12); color: #2980b9; }
        .type-badge-small.vendor { background: rgba(230,126,34,0.12); color: #d35400; }

        /* Forms */
        .tag-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }

        .tag-input {
          padding: 9px 12px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 14px;
          color: var(--text);
          background: var(--background);
          font-family: inherit;
          transition: border-color 0.15s;
        }
        .tag-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 2px rgba(52,152,219,0.1); }
        .tag-input::placeholder { color: var(--text-muted); }
        .tag-description-input { resize: vertical; min-height: 52px; line-height: 1.4; }

        .form-buttons { display: flex; gap: 8px; }

        .tag-btn-add, .tag-btn-cancel {
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s;
          flex: 1;
          white-space: nowrap;
        }

        .tag-btn-add { background: var(--primary); color: #fff; }
        .tag-btn-add:hover { opacity: 0.9; }
        .tag-btn-add:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
        .tag-btn-add:disabled { opacity: 0.45; cursor: default; }

        .tag-btn-cancel { background: var(--background); color: var(--text); border: 1px solid var(--border); }
        .tag-btn-cancel:hover { background: var(--border); }

        .tag-list { display: flex; flex-direction: column; gap: 8px; }

        .tag-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 6px;
          gap: 10px;
          transition: border-color 0.15s;
        }
        .tag-item:hover { border-color: var(--primary); }

        .tag-item-content { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .tag-icon { font-size: 16px; flex-shrink: 0; }
        .tag-name { color: var(--text); font-weight: 600; font-size: 14px; }

        .ae-info { display: flex; flex-direction: column; gap: 1px; }
        .ae-name { color: var(--text); font-weight: 600; font-size: 14px; }
        .ae-email { color: var(--text-muted); font-size: 12px; }

        .tag-actions { display: flex; gap: 4px; flex-shrink: 0; }

        .tag-btn-edit, .tag-btn-delete {
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 4px;
          cursor: pointer;
          padding: 4px 8px;
          font-size: 14px;
          transition: all 0.15s;
          color: var(--text);
        }
        .tag-btn-edit:hover { border-color: #3498db; color: #3498db; }
        .tag-btn-edit:focus-visible { outline: 2px solid #3498db; outline-offset: 2px; }
        .tag-btn-delete:hover { border-color: #e74c3c; color: #e74c3c; }
        .tag-btn-delete:focus-visible { outline: 2px solid #e74c3c; outline-offset: 2px; }

        .empty-message {
          text-align: center;
          padding: 20px;
          color: var(--text-muted);
          font-size: 14px;
          font-style: italic;
          margin: 0;
        }

        /* Labels */
        .label-help-text { font-size: 13px; color: var(--text-muted); margin: 0 0 12px; line-height: 1.4; }
        .label-help-text code { background: var(--background); padding: 2px 6px; border-radius: 3px; font-size: 12px; color: var(--primary); }

        .label-color-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .label-color-label { font-size: 13px; font-weight: 600; color: var(--text); flex-shrink: 0; }
        .label-color-options { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }

        .label-color-swatch {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.12s;
          padding: 0;
        }
        .label-color-swatch:hover { transform: scale(1.2); }
        .label-color-swatch.active { border-color: var(--text); box-shadow: 0 0 0 2px var(--card); }
        .label-color-swatch:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

        .label-color-custom { width: 22px; height: 22px; border: 1px solid var(--border); border-radius: 4px; cursor: pointer; padding: 0; background: none; }

        .label-preview { display: flex; align-items: center; gap: 8px; }
        .label-preview-text { font-size: 12px; color: var(--text-muted); }
        .label-preview-pill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }

        .label-groups { display: flex; flex-direction: column; gap: 14px; }
        .label-group-header { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid var(--border); }
        .label-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .label-pill-display { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }

        .label-info { display: flex; flex-direction: column; gap: 2px; }
        .label-desc-preview { font-size: 11px; color: var(--text-muted); line-height: 1.3; }

        /* Export */
        .export-format-grid { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }

        .export-format-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 8px;
          gap: 12px;
        }

        .export-format-info { display: flex; flex-direction: column; gap: 2px; }
        .export-format-name { font-weight: 600; font-size: 14px; color: var(--text); }
        .export-format-desc { font-size: 12px; color: var(--text-muted); }

        .export-dl-btn {
          background: var(--primary);
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 7px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity 0.15s;
          flex-shrink: 0;
        }
        .export-dl-btn:hover { opacity: 0.88; }
        .export-dl-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

        .export-status { font-size: 13px; color: #27ae60; margin: 4px 0 0; font-weight: 500; }

        .sync-folder-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
        .sync-folder-display { flex: 1; min-width: 0; }
        .sync-folder-name { font-size: 13px; color: var(--text); font-weight: 500; word-break: break-all; }
        .sync-folder-none { font-size: 13px; color: var(--text-muted); font-style: italic; }
        .sync-pick-btn { flex: none; padding: 9px 14px; }
        .sync-unavailable { font-size: 12px; color: #e67e22; margin: 4px 0 0; }

        .sync-options { display: flex; flex-direction: column; gap: 12px; }

        .sync-interval-select {
          margin-left: 8px;
          padding: 5px 10px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--background);
          color: var(--text);
          font-size: 13px;
          cursor: pointer;
        }
        .sync-interval-select:disabled { opacity: 0.5; cursor: default; }
        .sync-interval-select:focus { outline: 2px solid var(--primary); outline-offset: 2px; }

        .last-sync-text { font-size: 12px; color: var(--text-muted); margin: 0; }

        /* Database tab */
        .db-form { display: flex; flex-direction: column; gap: 14px; }
        .db-form-row { display: flex; gap: 10px; }
        .db-form-field { display: flex; flex-direction: column; gap: 5px; }
        .db-form-field label { font-size: 13px; font-weight: 600; color: var(--text); }
        .db-field-grow { flex: 1; }
        .db-field-port { width: 100px; flex-shrink: 0; }

        .db-password-row { display: flex; gap: 6px; align-items: center; }
        .db-password-input { flex: 1; }
        .db-toggle-pw {
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 6px 10px;
          cursor: pointer;
          font-size: 14px;
          flex-shrink: 0;
          transition: border-color 0.15s;
        }
        .db-toggle-pw:hover { border-color: var(--primary); }
        .db-toggle-pw:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

        .db-actions { display: flex; gap: 10px; margin-top: 4px; }
        .db-btn { flex: 1; }

        .db-status-msg {
          font-size: 13px;
          font-weight: 500;
          padding: 8px 12px;
          border-radius: 6px;
          margin-top: 2px;
        }
        .db-status-ok { background: rgba(46,204,113,0.12); color: #27ae60; }
        .db-status-err { background: rgba(231,76,60,0.1); color: #c0392b; }

        .db-tips {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          line-height: 1.5;
        }
        .db-tips code {
          background: var(--background);
          padding: 1px 5px;
          border-radius: 3px;
          font-size: 12px;
          color: var(--primary);
        }

        @media (max-width: 600px) {
          .config-modal { width: 98%; max-height: 96vh; }
          .themes-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
          .config-tabs { flex-wrap: wrap; }
          .form-buttons { flex-direction: column; }
          .export-format-card { flex-direction: column; align-items: flex-start; }
          .export-dl-btn { width: 100%; }
        }
      `}</style>
    </>
  )
}

export default ConfigManager
