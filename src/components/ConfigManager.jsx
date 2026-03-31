import React, { useState } from "react"
import { saveConfigLocalStorage } from "../utils/markdownHandler"
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

function ConfigManager({
  config,
  onConfigChange,
  showConfig,
  setShowConfig,
  tags = {},
  onTagsChange = () => {},
}) {
  const [activeTab, setActiveTab] = useState("theme")
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newAEName, setNewAEName] = useState("")
  const [newAEEmail, setNewAEEmail] = useState("")
  const [editingAE, setEditingAE] = useState(null)
  const [newLabelName, setNewLabelName] = useState("")
  const [newLabelColor, setNewLabelColor] = useState("#3498db")
  const [editingLabel, setEditingLabel] = useState(null)

  const companies = getCompanies(tags)
  const accountExecutives = getAccountExecutives(tags)
  const allLabels = getLabels(tags)
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

  const handleAddCompany = (e) => {
    e.preventDefault()
    if (newCompanyName.trim()) {
      const updatedTags = addCompany(tags, newCompanyName.trim())
      onTagsChange(updatedTags)
      setNewCompanyName("")
    }
  }

  const handleRemoveCompany = (company) => {
    const updatedTags = removeCompany(tags, company)
    onTagsChange(updatedTags)
  }

  const handleAddAccountExecutive = (e) => {
    e.preventDefault()
    if (newAEName.trim()) {
      const updatedTags = addAccountExecutive(
        tags,
        newAEName.trim(),
        newAEEmail.trim(),
      )
      onTagsChange(updatedTags)
      setNewAEName("")
      setNewAEEmail("")
    }
  }

  const handleUpdateAccountExecutive = (e) => {
    e.preventDefault()
    if (editingAE && newAEName.trim()) {
      const updatedTags = updateAccountExecutive(
        tags,
        editingAE.id,
        newAEName.trim(),
        newAEEmail.trim(),
      )
      onTagsChange(updatedTags)
      setNewAEName("")
      setNewAEEmail("")
      setEditingAE(null)
    }
  }

  const handleRemoveAccountExecutive = (id) => {
    const updatedTags = removeAccountExecutive(tags, id)
    onTagsChange(updatedTags)
  }

  const startEditingAE = (ae) => {
    setEditingAE(ae)
    setNewAEName(ae.name)
    setNewAEEmail(ae.email || "")
  }

  const handleAddLabel = (e) => {
    e.preventDefault()
    if (newLabelName.trim()) {
      const updatedTags = addLabel(tags, newLabelName.trim(), newLabelColor)
      onTagsChange(updatedTags)
      setNewLabelName("")
      setNewLabelColor("#3498db")
    }
  }

  const handleUpdateLabel = (e) => {
    e.preventDefault()
    if (editingLabel && newLabelName.trim()) {
      const updatedTags = updateLabel(
        tags,
        editingLabel.id,
        newLabelName.trim(),
        newLabelColor,
      )
      onTagsChange(updatedTags)
      setNewLabelName("")
      setNewLabelColor("#3498db")
      setEditingLabel(null)
    }
  }

  const handleRemoveLabel = (id) => {
    const updatedTags = removeLabel(tags, id)
    onTagsChange(updatedTags)
  }

  const startEditingLabel = (label) => {
    setEditingLabel(label)
    setNewLabelName(label.name)
    setNewLabelColor(label.color)
  }

  const themes = {
    "modern-light": {
      name: "Modern Light",
      description: "Clean, bright interface",
    },
    "one-light": { name: "One Light", description: "Atom One Light" },
    "github-light": {
      name: "GitHub Light",
      description: "GitHub's clean light theme",
    },
    "solarized-light": {
      name: "Solarized Light",
      description: "Precision colors",
    },
    "modern-dark": {
      name: "Modern Dark",
      description: "Dark mode with contrast",
    },
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

  return (
    <>
      {showConfig && (
        <div className="config-modal-overlay">
          <div className="config-modal">
            <div className="config-header">
              <h2>⚙️ Settings</h2>
              <button
                onClick={() => setShowConfig(false)}
                className="btn-close"
              >
                ✕
              </button>
            </div>

            <div className="config-tabs">
              <button
                className={`tab-btn ${activeTab === "theme" ? "active" : ""}`}
                onClick={() => setActiveTab("theme")}
              >
                🎨 Theme
              </button>
              <button
                className={`tab-btn ${activeTab === "companies" ? "active" : ""}`}
                onClick={() => setActiveTab("companies")}
              >
                🏢 Companies
              </button>
              <button
                className={`tab-btn ${activeTab === "executives" ? "active" : ""}`}
                onClick={() => setActiveTab("executives")}
              >
                👤 Account Executives
              </button>
              <button
                className={`tab-btn ${activeTab === "labels" ? "active" : ""}`}
                onClick={() => setActiveTab("labels")}
              >
                🏷 Tags
              </button>
            </div>

            <div className="config-content">
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
                      <label>
                        <input
                          type="checkbox"
                          checked={config.compactMode || false}
                          onChange={(e) =>
                            handleConfigChange("compactMode", e.target.checked)
                          }
                        />
                        Compact Mode
                      </label>
                      <span className="help-text">
                        Reduce spacing and font sizes
                      </span>
                    </div>
                  </section>
                </>
              )}

              {activeTab === "companies" && (
                <>
                  <section className="config-section">
                    <h3>Add New Company</h3>
                    <form onSubmit={handleAddCompany} className="tag-form">
                      <input
                        type="text"
                        placeholder="Company name (e.g., Acme Corp)"
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        className="tag-input"
                      />
                      <button type="submit" className="tag-btn-add">
                        ➕ Add Company
                      </button>
                    </form>
                  </section>

                  <section className="config-section">
                    <h3>Companies ({companies.length})</h3>
                    {companies.length > 0 ? (
                      <div className="tag-list">
                        {companies.map((company) => (
                          <div key={company} className="tag-item">
                            <div className="tag-item-content">
                              <span className="tag-icon">🏢</span>
                              <span className="tag-name">{company}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveCompany(company)}
                              className="tag-btn-delete"
                              title="Delete company"
                            >
                              🗑
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-message">
                        No companies added yet. Add one above!
                      </p>
                    )}
                  </section>
                </>
              )}

              {activeTab === "executives" && (
                <>
                  <section className="config-section">
                    <h3>{editingAE ? "Edit" : "Add New"} Account Executive</h3>
                    <form
                      onSubmit={
                        editingAE
                          ? handleUpdateAccountExecutive
                          : handleAddAccountExecutive
                      }
                      className="tag-form"
                    >
                      <input
                        type="text"
                        placeholder="Name (e.g., John Smith)"
                        value={newAEName}
                        onChange={(e) => setNewAEName(e.target.value)}
                        className="tag-input"
                        required
                      />
                      <input
                        type="email"
                        placeholder="Email (optional)"
                        value={newAEEmail}
                        onChange={(e) => setNewAEEmail(e.target.value)}
                        className="tag-input"
                      />
                      <div className="form-buttons">
                        <button type="submit" className="tag-btn-add">
                          {editingAE ? "💾 Update" : "➕ Add"} Executive
                        </button>
                        {editingAE && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAE(null)
                              setNewAEName("")
                              setNewAEEmail("")
                            }}
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
                              <span className="tag-icon">👤</span>
                              <div className="ae-info">
                                <span className="ae-name">{ae.name}</span>
                                {ae.email && (
                                  <span className="ae-email">{ae.email}</span>
                                )}
                              </div>
                            </div>
                            <div className="tag-actions">
                              <button
                                onClick={() => startEditingAE(ae)}
                                className="tag-btn-edit"
                                title="Edit"
                              >
                                ✎
                              </button>
                              <button
                                onClick={() =>
                                  handleRemoveAccountExecutive(ae.id)
                                }
                                className="tag-btn-delete"
                                title="Delete"
                              >
                                🗑
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-message">
                        No account executives added yet. Add one above!
                      </p>
                    )}
                  </section>
                </>
              )}

              {activeTab === "labels" && (
                <>
                  <section className="config-section">
                    <h3>{editingLabel ? "Edit" : "Create New"} Label</h3>
                    <p className="label-help-text">
                      Use <code>tag:subtag</code> format for scoped labels (e.g., status:pending, priority:high)
                    </p>
                    <form
                      onSubmit={editingLabel ? handleUpdateLabel : handleAddLabel}
                      className="tag-form"
                    >
                      <input
                        type="text"
                        placeholder="Label name (e.g., status:pending)"
                        value={newLabelName}
                        onChange={(e) => setNewLabelName(e.target.value)}
                        className="tag-input"
                        required
                      />
                      <div className="label-color-row">
                        <label className="label-color-label">Color:</label>
                        <div className="label-color-options">
                          {[
                            "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#1abc9c",
                            "#3498db", "#9b59b6", "#e91e63", "#607d8b", "#795548",
                          ].map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`label-color-swatch ${newLabelColor === color ? "active" : ""}`}
                              style={{ background: color }}
                              onClick={() => setNewLabelColor(color)}
                              title={color}
                            />
                          ))}
                          <input
                            type="color"
                            value={newLabelColor}
                            onChange={(e) => setNewLabelColor(e.target.value)}
                            className="label-color-custom"
                            title="Custom color"
                          />
                        </div>
                      </div>
                      {/* Preview */}
                      {newLabelName.trim() && (
                        <div className="label-preview">
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
                          {editingLabel ? "💾 Update" : "➕ Add"} Label
                        </button>
                        {editingLabel && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLabel(null)
                              setNewLabelName("")
                              setNewLabelColor("#3498db")
                            }}
                            className="tag-btn-cancel"
                          >
                            ✕ Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </section>

                  <section className="config-section">
                    <h3>Labels ({allLabels.length})</h3>
                    {allLabels.length > 0 ? (
                      <div className="label-groups">
                        {Object.entries(grouped).map(([group, groupLabels]) => (
                          <div key={group} className="label-group">
                            <div className="label-group-header">{group}</div>
                            <div className="tag-list">
                              {groupLabels.map((label) => (
                                <div key={label.id} className="tag-item">
                                  <div className="tag-item-content">
                                    <span
                                      className="label-dot"
                                      style={{ background: label.color }}
                                    />
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
                                  </div>
                                  <div className="tag-actions">
                                    <button
                                      onClick={() => startEditingLabel(label)}
                                      className="tag-btn-edit"
                                      title="Edit"
                                    >
                                      ✎
                                    </button>
                                    <button
                                      onClick={() => handleRemoveLabel(label.id)}
                                      className="tag-btn-delete"
                                      title="Delete"
                                    >
                                      🗑
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-message">
                        No labels created yet. Add one above!
                      </p>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .config-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .config-modal {
          background: var(--card);
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          width: 90%;
          max-width: 700px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
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
          font-size: 24px;
          cursor: pointer;
          color: var(--text);
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .btn-close:hover {
          background: var(--background);
          color: var(--primary);
        }

        .config-tabs {
          display: flex;
          gap: 4px;
          padding: 12px 20px;
          border-bottom: 1px solid var(--border);
          overflow-x: auto;
          flex-shrink: 0;
        }

        .tab-btn {
          padding: 8px 16px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tab-btn:hover {
          background: var(--background);
          color: var(--text);
        }

        .tab-btn.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .config-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .config-section {
          margin-bottom: 24px;
        }

        .config-section h3 {
          margin: 0 0 12px;
          font-size: 16px;
          color: var(--text);
          font-weight: 600;
        }

        .config-option {
          margin-bottom: 12px;
        }

        .config-option label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: var(--text);
          font-size: 14px;
        }

        .config-option input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .help-text {
          display: block;
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 4px;
          margin-left: 26px;
        }

        .themes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
          margin-bottom: 12px;
        }

        .theme-card {
          background: var(--background);
          color: var(--text);
          border: 2px solid var(--border);
          border-radius: 8px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          min-height: 80px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          position: relative;
        }

        .theme-card:hover {
          border-color: var(--primary);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .theme-card:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        .theme-card.active {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary), 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .theme-card.active::after {
          content: "✓";
          position: absolute;
          top: 6px;
          right: 8px;
          font-size: 14px;
          font-weight: 700;
          color: var(--primary);
        }

        .theme-name {
          font-weight: 700;
          font-size: 15px;
          margin-bottom: 6px;
          line-height: 1.3;
          color: var(--text);
        }

        .theme-desc {
          font-size: 13px;
          line-height: 1.4;
          color: var(--text-muted);
        }

        .tag-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 12px;
        }

        .tag-input {
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 14px;
          color: var(--text);
          background: var(--background);
          font-family: inherit;
        }

        .tag-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
        }

        .tag-input::placeholder {
          color: var(--text-muted);
        }

        .form-buttons {
          display: flex;
          gap: 8px;
        }

        .tag-form button {
          position: relative;
          z-index: 1;
        }

        .tag-btn-add,
        .tag-btn-cancel {
          padding: 11px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
          flex: 1;
          white-space: nowrap;
        }

        .tag-btn-add {
          background: var(--primary);
          color: white;
          box-shadow: 0 2px 4px rgba(52, 152, 219, 0.2);
        }

        .tag-btn-add:hover {
          opacity: 0.95;
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
          transform: translateY(-1px);
        }

        .tag-btn-add:active {
          transform: translateY(0);
        }

        .tag-btn-cancel {
          background: var(--background);
          color: var(--text);
          border: 1px solid var(--border);
        }

        .tag-btn-cancel:hover {
          background: var(--border);
        }

        .tag-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tag-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 6px;
          transition: all 0.2s;
        }

        .tag-item:hover {
          border-color: var(--primary);
          background: var(--card);
        }

        .tag-item-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .tag-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .tag-name {
          color: var(--text);
          font-weight: 600;
          font-size: 14px;
        }

        .ae-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: left;
        }

        .ae-name {
          color: var(--text);
          font-weight: 600;
          font-size: 14px;
        }

        .ae-email {
          color: var(--text-muted);
          font-size: 12px;
        }

        .tag-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }

        .tag-btn-edit,
        .tag-btn-delete {
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 4px;
          cursor: pointer;
          padding: 4px 8px;
          font-size: 14px;
          transition: all 0.2s;
          color: var(--text);
        }

        .tag-btn-edit:hover {
          border-color: #3498db;
          color: #3498db;
        }

        .tag-btn-delete:hover {
          border-color: #e74c3c;
          color: #e74c3c;
        }

        .empty-message {
          text-align: center;
          padding: 20px;
          color: var(--text-muted);
          font-size: 14px;
          font-style: italic;
          margin: 0;
        }

        .config-content::-webkit-scrollbar {
          width: 6px;
        }

        .config-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .config-content::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 3px;
        }

        .config-content::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }

        /* Labels tab */
        .label-help-text {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0 0 12px;
          line-height: 1.4;
        }

        .label-help-text code {
          background: var(--background);
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 12px;
          color: var(--primary);
        }

        .label-color-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .label-color-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          flex-shrink: 0;
        }

        .label-color-options {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }

        .label-color-swatch {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.15s;
          padding: 0;
        }

        .label-color-swatch:hover {
          transform: scale(1.15);
        }

        .label-color-swatch.active {
          border-color: var(--text);
          box-shadow: 0 0 0 2px var(--card);
        }

        .label-color-custom {
          width: 24px;
          height: 24px;
          border: 1px solid var(--border);
          border-radius: 4px;
          cursor: pointer;
          padding: 0;
          background: none;
        }

        .label-preview {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .label-preview-text {
          font-size: 12px;
          color: var(--text-muted);
        }

        .label-preview-pill {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .label-groups {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .label-group-header {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          padding-bottom: 4px;
          border-bottom: 1px solid var(--border);
        }

        .label-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .label-pill-display {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        @media (max-width: 600px) {
          .config-modal {
            width: 95%;
            max-height: 95vh;
          }

          .themes-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          }

          .config-tabs {
            flex-wrap: wrap;
          }

          .form-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  )
}

export default ConfigManager
