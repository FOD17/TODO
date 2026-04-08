import React, { useState, useRef, useEffect } from "react"

function TodoCard({ todo, onComplete, onDelete, onEdit, onClick, onSave, isCompleted, labels = [] }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addType, setAddType] = useState("subtask")
  const [addText, setAddText] = useState("")
  const [tooltipLabel, setTooltipLabel] = useState(null)
  const addInputRef = useRef(null)
  const tooltipRef = useRef(null)

  const subtasks = todo.subtasks || []
  const notes = todo.notes || []
  const totalItems = subtasks.length + notes.length
  const hasItems = totalItems > 0
  const showModal = totalItems > 4

  const formatDate = (date) => {
    const d = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const isToday = d.toDateString() === today.toDateString()
    const isTomorrow = d.toDateString() === tomorrow.toDateString()
    const isPast = d < today && !isToday

    if (isToday) return "📅 Today"
    if (isTomorrow) return "📅 Tomorrow"
    if (isPast)
      return `⚠️ ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`

    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const getPriorityColor = () => {
    const d = new Date(todo.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    d.setHours(0, 0, 0, 0)

    if (d < today) return "#e74c3c"
    if (d.getTime() === today.getTime()) return "#f39c12"
    return "#3498db"
  }

  const handleExpandToggle = (e) => {
    e.stopPropagation()
    if (!hasItems && !showAddForm) {
      handlePlusClick(e)
      return
    }
    if (showModal) {
      if (onClick) onClick(todo)
    } else {
      setIsExpanded((prev) => !prev)
    }
  }

  const handlePlusClick = (e) => {
    e.stopPropagation()
    setShowAddForm((prev) => !prev)
    if (!showAddForm) {
      setIsExpanded(true)
      setTimeout(() => addInputRef.current?.focus(), 50)
    }
  }

  const handleAddItem = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!addText.trim() || !onSave) return

    let updatedTodo
    if (addType === "subtask") {
      const subtask = {
        id: Date.now().toString(),
        message: addText.trim(),
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      updatedTodo = {
        ...todo,
        subtasks: [...subtasks, subtask],
        updatedAt: new Date().toISOString(),
      }
    } else {
      const note = {
        id: Date.now().toString(),
        text: addText.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      updatedTodo = {
        ...todo,
        notes: [note, ...notes],
        updatedAt: new Date().toISOString(),
      }
    }

    onSave(updatedTodo)
    setAddText("")
    setIsExpanded(true)
    addInputRef.current?.focus()
  }

  const handleToggleSubtask = (e, subtaskId) => {
    e.stopPropagation()
    if (!onSave) return
    onSave({
      ...todo,
      subtasks: subtasks.map((st) =>
        st.id === subtaskId
          ? {
              ...st,
              completed: !st.completed,
              completedAt: !st.completed ? new Date().toISOString() : null,
              updatedAt: new Date().toISOString(),
            }
          : st,
      ),
      updatedAt: new Date().toISOString(),
    })
  }

  const completedSubtasks = subtasks.filter((s) => s.completed).length

  // Close tooltip when clicking anywhere outside
  useEffect(() => {
    if (!tooltipLabel) return
    const close = (e) => {
      if (!tooltipRef.current?.closest(".card-labels")?.contains(e.target)) {
        setTooltipLabel(null)
      }
    }
    document.addEventListener("mousedown", close)
    document.addEventListener("focusin", close)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("focusin", close)
    }
  }, [tooltipLabel])

  return (
    <div
      className={`todo-card ${isCompleted ? "completed" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ borderLeftColor: getPriorityColor(), cursor: "pointer" }}
      onClick={(e) => {
        if (
          e.target.closest(".card-checkbox") ||
          e.target.closest(".card-actions") ||
          e.target.closest(".card-expandable")
        )
          return
        if (onClick) onClick(todo)
      }}
    >
      <div className="card-checkbox">
        <input
          type="checkbox"
          id={`card-${todo.id}`}
          checked={isCompleted}
          onChange={() => onComplete(todo.id)}
        />
        <label htmlFor={`card-${todo.id}`} />
      </div>

      <div className="card-content">
        <h3 className="card-title">{todo.message}</h3>

        {todo.description && (
          <p className="card-description">{todo.description}</p>
        )}

        {/* Label pills */}
        {todo.labels?.length > 0 && (
          <div className="card-labels" role="list" aria-label="Labels">
            {todo.labels.map((labelName) => {
              const def = labels.find((l) => l.name === labelName)
              const hasDesc = def?.description
              return (
                <span
                  key={labelName}
                  role="listitem"
                  className={`card-label-pill ${hasDesc ? "has-desc" : ""}`}
                  style={{
                    background: def ? `${def.color}22` : "rgba(52,152,219,0.12)",
                    color: def ? def.color : "#3498db",
                    border: `1px solid ${def ? `${def.color}44` : "rgba(52,152,219,0.25)"}`,
                  }}
                  tabIndex={hasDesc ? 0 : undefined}
                  aria-label={hasDesc ? `${labelName}: ${def.description}` : labelName}
                  onClick={(e) => {
                    if (!hasDesc) return
                    e.stopPropagation()
                    setTooltipLabel(tooltipLabel === labelName ? null : labelName)
                  }}
                  onKeyDown={(e) => {
                    if (!hasDesc) return
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      e.stopPropagation()
                      setTooltipLabel(tooltipLabel === labelName ? null : labelName)
                    }
                  }}
                >
                  {labelName}
                  {hasDesc && <span className="pill-info-dot" aria-hidden="true">·</span>}
                  {hasDesc && tooltipLabel === labelName && (
                    <span
                      ref={tooltipRef}
                      className="label-tooltip"
                      role="tooltip"
                      aria-live="polite"
                    >
                      {def.description}
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        )}

        <div className="card-meta">
          <span className="meta-badge date">{formatDate(todo.date)}</span>
          {todo.company && (
            <span className="meta-badge company">🏢 {todo.company}</span>
          )}
          {todo.accountRep && (
            <span className="meta-badge rep">👤 {todo.accountRep}</span>
          )}
          {todo.names?.length > 0 && (
            <span className="meta-badge people">
              👥 {todo.names.join(", ")}
            </span>
          )}
          {hasItems && (
            <button
              className="meta-badge items-toggle card-expandable"
              onClick={handleExpandToggle}
              title={showModal ? "View all in detail" : isExpanded ? "Collapse" : "Expand"}
            >
              {subtasks.length > 0 && (
                <>
                  <span className="subtask-mini-bar">
                    <span
                      className="subtask-mini-fill"
                      style={{
                        width: `${(completedSubtasks / subtasks.length) * 100}%`,
                      }}
                    />
                  </span>
                  {completedSubtasks}/{subtasks.length}
                </>
              )}
              {notes.length > 0 && (
                <span className="notes-inline-badge">
                  📝 {notes.length}
                </span>
              )}
              <span className="expand-chevron">
                {showModal ? "↗" : isExpanded ? "▴" : "▾"}
              </span>
            </button>
          )}
        </div>

        {/* Inline expanded items (≤ 4 total) */}
        {isExpanded && !showModal && hasItems && (
          <div className="card-items-expanded card-expandable" onClick={(e) => e.stopPropagation()}>
            {subtasks.map((st) => (
              <div
                key={st.id}
                className={`card-subtask-item ${st.completed ? "done" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={st.completed}
                  onChange={(e) => handleToggleSubtask(e, st.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="subtask-text">{st.message}</span>
              </div>
            ))}
            {notes.map((note) => (
              <div key={note.id} className="card-note-item">
                <span className="note-icon">📝</span>
                <span className="note-text">{note.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick add form */}
        {showAddForm && (
          <form
            className="card-add-form card-expandable"
            onSubmit={handleAddItem}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="add-type-row">
              <button
                type="button"
                className={`type-tab ${addType === "subtask" ? "active" : ""}`}
                onClick={() => setAddType("subtask")}
              >
                Subtask
              </button>
              <button
                type="button"
                className={`type-tab ${addType === "note" ? "active" : ""}`}
                onClick={() => setAddType("note")}
              >
                Note
              </button>
            </div>
            <div className="add-input-row">
              <input
                ref={addInputRef}
                className="add-input"
                value={addText}
                onChange={(e) => setAddText(e.target.value)}
                placeholder={addType === "subtask" ? "Add a subtask..." : "Add a note..."}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowAddForm(false)
                    setAddText("")
                  }
                }}
              />
              <button
                type="submit"
                className="add-submit-btn"
                disabled={!addText.trim()}
              >
                Add
              </button>
            </div>
          </form>
        )}
      </div>

      <div className={`card-actions ${isHovered ? "visible" : ""}`}>
        <button
          className="action-btn plus-btn"
          onClick={handlePlusClick}
          title="Add subtask or note"
        >
          +
        </button>
        <button
          className="action-btn edit-btn"
          onClick={() => onEdit(todo)}
          title="Edit"
        >
          ✎
        </button>
        <button
          className="action-btn delete-btn"
          onClick={() => onDelete(todo.id, isCompleted)}
          title="Delete"
        >
          🗑
        </button>
      </div>

      <style>{`
        .todo-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-left: 4px solid #3498db;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          transition: all 0.3s ease;
          margin-bottom: 12px;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .todo-card:hover {
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
          border-color: var(--primary);
        }

        .todo-card.completed {
          opacity: 0.6;
          background: var(--background);
        }

        .todo-card.completed .card-title,
        .todo-card.completed .card-description {
          color: var(--text-muted);
          text-decoration: none;
        }

        .card-checkbox {
          flex-shrink: 0;
          margin-top: 4px;
        }

        .card-checkbox input[type="checkbox"] {
          appearance: none;
          width: 20px;
          height: 20px;
          border: 2px solid var(--border);
          border-radius: 6px;
          cursor: pointer;
          background: var(--card);
          transition: all 0.2s;
          position: relative;
        }

        .card-checkbox input[type="checkbox"]:hover {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        .card-checkbox input[type="checkbox"]:checked {
          background: var(--primary);
          border-color: var(--primary);
        }

        .card-checkbox input[type="checkbox"]:checked::after {
          content: "✓";
          display: block;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 12px;
          font-weight: bold;
        }

        .card-content {
          flex: 1;
          min-width: 0;
        }

        .card-title {
          margin: 0 0 8px;
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          word-break: break-word;
          line-height: 1.4;
        }

        .card-description {
          margin: 0 0 12px;
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.5;
          word-break: break-word;
        }

        .card-labels {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 8px;
        }

        .card-label-pill {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          position: relative;
        }

        .card-label-pill.has-desc {
          cursor: pointer;
        }

        .card-label-pill.has-desc:hover {
          filter: brightness(1.1);
        }

        .card-label-pill:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 2px;
        }

        .pill-info-dot {
          font-size: 14px;
          line-height: 1;
          opacity: 0.7;
        }

        .label-tooltip {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: var(--text);
          color: var(--card);
          font-size: 12px;
          font-weight: 400;
          line-height: 1.4;
          padding: 6px 10px;
          border-radius: 6px;
          white-space: normal;
          width: max-content;
          max-width: 220px;
          text-align: center;
          z-index: 200;
          pointer-events: none;
          animation: tooltipIn 0.12s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .label-tooltip::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: var(--text);
        }

        @keyframes tooltipIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .meta-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: var(--background);
          color: var(--text);
          font-size: 12px;
          font-weight: 500;
          border-radius: 4px;
          white-space: nowrap;
        }

        .meta-badge.date {
          background: rgba(52, 152, 219, 0.1);
          color: #2980b9;
          font-weight: 600;
        }

        .meta-badge.company {
          background: rgba(155, 89, 182, 0.1);
          color: #8e44ad;
        }

        .meta-badge.rep {
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
        }

        .meta-badge.people {
          background: rgba(245, 176, 65, 0.1);
          color: #d68910;
        }

        .meta-badge.items-toggle {
          background: rgba(52, 152, 219, 0.08);
          color: var(--primary);
          gap: 6px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: background 0.15s;
        }

        .meta-badge.items-toggle:hover {
          background: rgba(52, 152, 219, 0.18);
        }

        .subtask-mini-bar {
          width: 32px;
          height: 4px;
          background: var(--border);
          border-radius: 2px;
          overflow: hidden;
          display: inline-block;
          vertical-align: middle;
        }

        .subtask-mini-fill {
          display: block;
          height: 100%;
          background: var(--primary);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .notes-inline-badge {
          opacity: 0.85;
        }

        .expand-chevron {
          font-size: 10px;
          opacity: 0.7;
        }

        /* Expanded inline items */
        .card-items-expanded {
          margin-top: 10px;
          border-top: 1px solid var(--border);
          padding-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .card-subtask-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text);
        }

        .card-subtask-item input[type="checkbox"] {
          appearance: none;
          width: 16px;
          height: 16px;
          border: 2px solid var(--border);
          border-radius: 4px;
          cursor: pointer;
          background: var(--card);
          flex-shrink: 0;
          position: relative;
          transition: all 0.2s;
        }

        .card-subtask-item input[type="checkbox"]:checked {
          background: var(--primary);
          border-color: var(--primary);
        }

        .card-subtask-item input[type="checkbox"]:checked::after {
          content: "✓";
          display: block;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 10px;
          font-weight: bold;
        }

        .card-subtask-item.done .subtask-text {
          text-decoration: line-through;
          color: var(--text-muted);
        }

        .subtask-text {
          line-height: 1.4;
        }

        .card-note-item {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          font-size: 13px;
          color: var(--text-muted);
        }

        .note-icon {
          flex-shrink: 0;
          font-size: 12px;
          margin-top: 1px;
        }

        .note-text {
          line-height: 1.4;
          word-break: break-word;
        }

        /* Quick add form */
        .card-add-form {
          margin-top: 10px;
          border-top: 1px solid var(--border);
          padding-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .add-type-row {
          display: flex;
          gap: 4px;
        }

        .type-tab {
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 3px 10px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          color: var(--text-muted);
          transition: all 0.15s;
        }

        .type-tab.active {
          background: var(--primary);
          border-color: var(--primary);
          color: #fff;
        }

        .type-tab:not(.active):hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .add-input-row {
          display: flex;
          gap: 6px;
        }

        .add-input {
          flex: 1;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 5px 10px;
          font-size: 13px;
          background: var(--background);
          color: var(--text);
          outline: none;
          transition: border-color 0.15s;
        }

        .add-input:focus {
          border-color: var(--primary);
        }

        .add-submit-btn {
          background: var(--primary);
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 5px 12px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.15s;
        }

        .add-submit-btn:disabled {
          opacity: 0.45;
          cursor: default;
        }

        .add-submit-btn:not(:disabled):hover {
          opacity: 0.85;
        }

        /* Card actions */
        .card-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .card-actions.visible {
          opacity: 1;
        }

        .action-btn {
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          cursor: pointer;
          padding: 6px 8px;
          font-size: 14px;
          color: var(--text);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn:hover {
          border-color: var(--primary);
          background: var(--background);
        }

        .plus-btn {
          font-size: 18px;
          font-weight: 300;
          line-height: 1;
        }

        .plus-btn:hover {
          color: var(--primary);
        }

        .edit-btn:hover {
          color: #3498db;
        }

        .delete-btn:hover {
          color: #e74c3c;
          border-color: #e74c3c;
        }

        @media (max-width: 640px) {
          .todo-card {
            padding: 12px;
          }

          .card-title {
            font-size: 15px;
          }

          .card-actions {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export default TodoCard
