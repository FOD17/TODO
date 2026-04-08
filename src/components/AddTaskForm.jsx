import React, { useState, useEffect } from "react"
import Autocomplete from "./Autocomplete"

function AddTaskForm({
  onAdd,
  selectedCompany = "All",
  companies = [],
  accountExecutives = [],
  labels = [],
  companyAssignments = {},
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [message, setMessage] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [company, setCompany] = useState("")
  const [accountRep, setAccountRep] = useState("")
  const [selectedLabels, setSelectedLabels] = useState([])
  const [description, setDescription] = useState("")
  const [labelSearch, setLabelSearch] = useState("")

  // Pre-fill company and AE when in a company-specific view
  useEffect(() => {
    if (selectedCompany !== "All") {
      setCompany(selectedCompany)
      // Auto-fill AE from companyAssignments
      const aeId = companyAssignments[selectedCompany]
      if (aeId) {
        const ae = accountExecutives.find((a) => a.id === aeId)
        if (ae) setAccountRep(ae.name)
      }
    } else {
      setCompany("")
      setAccountRep("")
    }
  }, [selectedCompany, companyAssignments, accountExecutives])

  const handleCompanyChange = (val) => {
    setCompany(val)
    // Auto-fill AE when company is selected from the list
    const aeId = companyAssignments[val]
    if (aeId) {
      const ae = accountExecutives.find((a) => a.id === aeId)
      if (ae) setAccountRep(ae.name)
    }
  }

  const handleToggleLabel = (labelName) => {
    setSelectedLabels((prev) =>
      prev.includes(labelName)
        ? prev.filter((l) => l !== labelName)
        : [...prev, labelName],
    )
    setLabelSearch("")
  }

  const filteredLabels = labels.filter(
    (l) =>
      l.name.toLowerCase().includes(labelSearch.toLowerCase()) &&
      !selectedLabels.includes(l.name),
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!message.trim()) return

    onAdd({
      message: message.trim(),
      date,
      company: company.trim(),
      accountRep: accountRep.trim(),
      labels: selectedLabels,
      description: description.trim(),
      names: [],
      notes: [],
      subtasks: [],
    })

    // Reset form
    setMessage("")
    setDate(new Date().toISOString().split("T")[0])
    setDescription("")
    setSelectedLabels([])
    setLabelSearch("")
    if (selectedCompany === "All") {
      setCompany("")
      setAccountRep("")
    }
    setIsExpanded(false)
  }

  const handleCancel = () => {
    setMessage("")
    setDate(new Date().toISOString().split("T")[0])
    setDescription("")
    setSelectedLabels([])
    setLabelSearch("")
    if (selectedCompany === "All") {
      setCompany("")
      setAccountRep("")
    }
    setIsExpanded(false)
  }

  const getLabelDef = (name) => labels.find((l) => l.name === name)

  return (
    <div className="add-task-form">
      {!isExpanded ? (
        <div
          className="add-task-collapsed"
          role="button"
          tabIndex={0}
          aria-label="Add a new task"
          onClick={() => setIsExpanded(true)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsExpanded(true) } }}
        >
          <span className="add-task-plus" aria-hidden="true">+</span>
          <span className="add-task-placeholder">Add a new task...</span>
        </div>
      ) : (
        <form className="add-task-expanded" onSubmit={handleSubmit}>
          {/* Task name */}
          <label htmlFor="atf-message" className="sr-only">Task name</label>
          <input
            id="atf-message"
            type="text"
            className="atf-input atf-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
          />

          {/* Row: Date + Company + AE */}
          <div className="atf-row">
            <div className="atf-field">
              <label htmlFor="atf-date" className="atf-label">Date</label>
              <input
                id="atf-date"
                type="date"
                className="atf-input atf-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="atf-field">
              <label htmlFor="atf-company" className="atf-label">Company</label>
              <Autocomplete
                inputId="atf-company"
                value={company}
                onChange={handleCompanyChange}
                suggestions={companies}
                placeholder="Type or select..."
              />
            </div>
            <div className="atf-field">
              <label htmlFor="atf-ae" className="atf-label">Account Executive</label>
              <Autocomplete
                inputId="atf-ae"
                value={accountRep}
                onChange={(val) => setAccountRep(val)}
                suggestions={accountExecutives.map((ae) => ae.name)}
                placeholder="Type or select..."
              />
            </div>
          </div>

          {/* Labels */}
          <div className="atf-field">
            <label htmlFor="atf-label-search" className="atf-label">Labels</label>
            <div className="atf-labels-area">
              {selectedLabels.map((labelName) => {
                const def = getLabelDef(labelName)
                return (
                  <span
                    key={labelName}
                    className="atf-label-pill"
                    style={{
                      background: def ? `${def.color}22` : "rgba(52,152,219,0.12)",
                      color: def ? def.color : "#3498db",
                      border: `1px solid ${def ? `${def.color}44` : "rgba(52,152,219,0.25)"}`,
                    }}
                  >
                    {labelName}
                    <button
                      type="button"
                      className="atf-label-remove"
                      aria-label={`Remove label ${labelName}`}
                      onClick={() => handleToggleLabel(labelName)}
                    >
                      <span aria-hidden="true">✕</span>
                    </button>
                  </span>
                )
              })}
              <div className="atf-label-search-wrapper">
                <input
                  id="atf-label-search"
                  type="text"
                  role="combobox"
                  aria-expanded={labelSearch.length > 0 && filteredLabels.length > 0}
                  aria-autocomplete="list"
                  aria-controls="atf-label-listbox"
                  aria-label="Search and add labels"
                  className="atf-label-search"
                  value={labelSearch}
                  onChange={(e) => setLabelSearch(e.target.value)}
                  placeholder={selectedLabels.length > 0 ? "Add more..." : "Search labels..."}
                />
                {labelSearch && filteredLabels.length > 0 && (
                  <div id="atf-label-listbox" className="atf-label-dropdown" role="listbox" aria-label="Label suggestions">
                    {filteredLabels.map((label) => (
                      <div
                        key={label.id}
                        role="option"
                        aria-selected={false}
                        className="atf-label-option"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          handleToggleLabel(label.name)
                        }}
                      >
                        <span
                          className="atf-label-dot"
                          style={{ background: label.color }}
                        />
                        {label.name}
                      </div>
                    ))}
                  </div>
                )}
                {!labelSearch && labels.length > 0 && (
                  <div className="atf-label-quick">
                    {labels
                      .filter((l) => !selectedLabels.includes(l.name))
                      .slice(0, 6)
                      .map((label) => (
                        <button
                          key={label.id}
                          type="button"
                          className="atf-label-quick-btn"
                          onClick={() => handleToggleLabel(label.name)}
                          style={{
                            borderColor: `${label.color}66`,
                            color: label.color,
                          }}
                        >
                          <span
                            className="atf-label-dot"
                            style={{ background: label.color }}
                          />
                          {label.name}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="atf-field">
            <label htmlFor="atf-description" className="atf-label">Description (optional)</label>
            <textarea
              id="atf-description"
              className="atf-input atf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows="2"
            />
          </div>

          {/* Actions */}
          <div className="atf-actions">
            <button type="button" className="atf-btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
            <button
              type="submit"
              className="atf-btn-submit"
              disabled={!message.trim()}
            >
              Create Task
            </button>
          </div>
        </form>
      )}

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

        .add-task-collapsed:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        .add-task-form {
          margin-bottom: 24px;
        }

        .add-task-collapsed {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: var(--card);
          border: 1px dashed var(--border);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-task-collapsed:hover {
          border-color: var(--primary);
          border-style: solid;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .add-task-plus {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .add-task-placeholder {
          color: var(--text-muted);
          font-size: 14px;
        }

        .add-task-expanded {
          background: var(--card);
          border: 1px solid var(--primary);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          animation: formExpand 0.2s ease;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        @keyframes formExpand {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .atf-input {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 13px;
          color: var(--text);
          background: var(--background);
          font-family: inherit;
          box-sizing: border-box;
        }

        .atf-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
        }

        .atf-input::placeholder {
          color: var(--text-muted);
        }

        .atf-message {
          font-size: 15px;
          font-weight: 500;
          padding: 10px 12px;
        }

        .atf-row {
          display: flex;
          gap: 10px;
        }

        .atf-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-width: 0;
        }

        .atf-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .atf-date {
          cursor: pointer;
        }

        .atf-desc {
          resize: vertical;
          min-height: 40px;
        }

        /* Labels area */
        .atf-labels-area {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }

        .atf-label-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
        }

        .atf-label-remove {
          background: none;
          border: none;
          cursor: pointer;
          color: inherit;
          font-size: 9px;
          padding: 0 0 0 3px;
          opacity: 0.7;
        }

        .atf-label-remove:hover {
          opacity: 1;
        }

        .atf-label-search-wrapper {
          position: relative;
          display: inline-flex;
          flex-direction: column;
          min-width: 120px;
        }

        .atf-label-search {
          padding: 4px 8px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 12px;
          color: var(--text);
          background: var(--background);
          font-family: inherit;
          width: 140px;
        }

        .atf-label-search:focus {
          outline: none;
          border-color: var(--primary);
        }

        .atf-label-search::placeholder {
          color: var(--text-muted);
        }

        .atf-label-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 50;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          max-height: 150px;
          overflow-y: auto;
          margin-top: 2px;
          min-width: 180px;
        }

        .atf-label-option {
          padding: 6px 10px;
          font-size: 12px;
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .atf-label-option:hover {
          background: var(--background);
          color: var(--primary);
        }

        .atf-label-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .atf-label-quick {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 4px;
        }

        .atf-label-quick-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 11px;
          background: transparent;
          cursor: pointer;
          transition: all 0.15s;
        }

        .atf-label-quick-btn:hover {
          transform: scale(1.03);
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }

        /* Actions */
        .atf-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          padding-top: 4px;
          border-top: 1px solid var(--border);
        }

        .atf-btn-cancel,
        .atf-btn-submit {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .atf-btn-cancel {
          background: var(--background);
          color: var(--text);
          border: 1px solid var(--border);
        }

        .atf-btn-cancel:hover {
          border-color: var(--text-muted);
        }

        .atf-btn-submit {
          background: var(--primary);
          color: white;
        }

        .atf-btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .atf-btn-submit:not(:disabled):hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        @media (max-width: 640px) {
          .atf-row {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}

export default AddTaskForm
