import React, { useState, useEffect, useRef } from "react"

function TodoDetailModal({ todo, isOpen, onClose, onSave, labels = [] }) {
  const [editedTodo, setEditedTodo] = useState(null)
  const [newNote, setNewNote] = useState("")
  const [newPerson, setNewPerson] = useState("")
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editingNoteText, setEditingNoteText] = useState("")
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [newSubtask, setNewSubtask] = useState("")
  const [editingSubtaskId, setEditingSubtaskId] = useState(null)
  const [editingSubtaskText, setEditingSubtaskText] = useState("")
  const noteInputRef = useRef(null)

  useEffect(() => {
    if (todo && isOpen) {
      setEditedTodo({
        ...todo,
        notes: todo.notes || [],
        labels: todo.labels || [],
        names: todo.names || [],
        subtasks: todo.subtasks || [],
      })
      setNewNote("")
      setNewPerson("")
      setNewSubtask("")
      setEditingNoteId(null)
      setEditingSubtaskId(null)
      setShowLabelPicker(false)
    }
  }, [todo, isOpen])

  if (!isOpen || !editedTodo) return null

  const handleAddNote = () => {
    if (!newNote.trim()) return
    const note = {
      id: Date.now().toString(),
      text: newNote.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setEditedTodo((prev) => ({
      ...prev,
      notes: [note, ...prev.notes],
    }))
    setNewNote("")
    noteInputRef.current?.focus()
  }

  const handleEditNote = (noteId) => {
    const note = editedTodo.notes.find((n) => n.id === noteId)
    if (note) {
      setEditingNoteId(noteId)
      setEditingNoteText(note.text)
    }
  }

  const handleSaveNoteEdit = () => {
    if (!editingNoteText.trim()) return
    setEditedTodo((prev) => ({
      ...prev,
      notes: prev.notes.map((n) =>
        n.id === editingNoteId
          ? { ...n, text: editingNoteText.trim(), updatedAt: new Date().toISOString() }
          : n,
      ),
    }))
    setEditingNoteId(null)
    setEditingNoteText("")
  }

  const handleDeleteNote = (noteId) => {
    setEditedTodo((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== noteId),
    }))
  }

  const handleAddPerson = () => {
    if (!newPerson.trim()) return
    if (editedTodo.names.includes(newPerson.trim())) return
    setEditedTodo((prev) => ({
      ...prev,
      names: [...prev.names, newPerson.trim()],
    }))
    setNewPerson("")
  }

  const handleRemovePerson = (name) => {
    setEditedTodo((prev) => ({
      ...prev,
      names: prev.names.filter((n) => n !== name),
    }))
  }

  const handleToggleLabel = (labelName) => {
    setEditedTodo((prev) => {
      const has = prev.labels.includes(labelName)
      return {
        ...prev,
        labels: has
          ? prev.labels.filter((l) => l !== labelName)
          : [...prev.labels, labelName],
      }
    })
  }

  // Subtask handlers
  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return
    const subtask = {
      id: Date.now().toString(),
      message: newSubtask.trim(),
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setEditedTodo((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, subtask],
    }))
    setNewSubtask("")
  }

  const handleToggleSubtask = (subtaskId) => {
    setEditedTodo((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((st) =>
        st.id === subtaskId
          ? {
              ...st,
              completed: !st.completed,
              completedAt: !st.completed ? new Date().toISOString() : null,
              updatedAt: new Date().toISOString(),
            }
          : st,
      ),
    }))
  }

  const handleEditSubtask = (subtaskId) => {
    const st = editedTodo.subtasks.find((s) => s.id === subtaskId)
    if (st) {
      setEditingSubtaskId(subtaskId)
      setEditingSubtaskText(st.message)
    }
  }

  const handleSaveSubtaskEdit = () => {
    if (!editingSubtaskText.trim()) return
    setEditedTodo((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((st) =>
        st.id === editingSubtaskId
          ? { ...st, message: editingSubtaskText.trim(), updatedAt: new Date().toISOString() }
          : st,
      ),
    }))
    setEditingSubtaskId(null)
    setEditingSubtaskText("")
  }

  const handleDeleteSubtask = (subtaskId) => {
    setEditedTodo((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((st) => st.id !== subtaskId),
    }))
  }

  const completedSubtasks = editedTodo ? editedTodo.subtasks.filter((st) => st.completed).length : 0
  const totalSubtasks = editedTodo ? editedTodo.subtasks.length : 0

  const handleSave = () => {
    onSave({
      ...editedTodo,
      updatedAt: new Date().toISOString(),
    })
  }

  const formatTimestamp = (ts) => {
    if (!ts) return ""
    const d = new Date(ts)
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getLabelDef = (labelName) => {
    return labels.find((l) => l.name === labelName)
  }

  const groupedLabels = {}
  labels.forEach((label) => {
    const colonIdx = label.name.indexOf(":")
    const group = colonIdx === -1 ? label.name : label.name.substring(0, colonIdx)
    if (!groupedLabels[group]) groupedLabels[group] = []
    groupedLabels[group].push(label)
  })

  return (
    <>
      <div className="detail-modal-overlay" onClick={onClose} />
      <div className="detail-modal">
        <div className="detail-header">
          <h2>{editedTodo.message}</h2>
          <button className="detail-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="detail-body">
          {/* Info Row */}
          <div className="detail-info-row">
            {editedTodo.date && (
              <span className="detail-info-badge date">
                📅 {new Date(editedTodo.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
            {editedTodo.company && (
              <span className="detail-info-badge company">🏢 {editedTodo.company}</span>
            )}
            {editedTodo.accountRep && (
              <span className="detail-info-badge rep">👤 {editedTodo.accountRep}</span>
            )}
          </div>

          {/* Description */}
          <div className="detail-section">
            <label className="detail-label">Description</label>
            <textarea
              className="detail-textarea"
              value={editedTodo.description || ""}
              onChange={(e) =>
                setEditedTodo((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Add a description..."
              rows="3"
            />
          </div>

          {/* Labels */}
          <div className="detail-section">
            <div className="detail-section-header">
              <label className="detail-label">Labels</label>
              <button
                className="detail-add-btn"
                onClick={() => setShowLabelPicker(!showLabelPicker)}
              >
                {showLabelPicker ? "Done" : "+ Add"}
              </button>
            </div>

            {/* Current labels */}
            <div className="detail-labels">
              {editedTodo.labels.length > 0 ? (
                editedTodo.labels.map((labelName) => {
                  const def = getLabelDef(labelName)
                  return (
                    <span
                      key={labelName}
                      className="label-pill"
                      style={{
                        background: def ? `${def.color}22` : "rgba(52,152,219,0.12)",
                        color: def ? def.color : "#3498db",
                        border: `1px solid ${def ? `${def.color}44` : "rgba(52,152,219,0.25)"}`,
                      }}
                    >
                      {labelName}
                      <button
                        className="label-remove"
                        onClick={() => handleToggleLabel(labelName)}
                      >
                        ✕
                      </button>
                    </span>
                  )
                })
              ) : (
                <span className="detail-empty-hint">No labels assigned</span>
              )}
            </div>

            {/* Label picker */}
            {showLabelPicker && labels.length > 0 && (
              <div className="label-picker">
                {Object.entries(groupedLabels).map(([group, groupLabels]) => (
                  <div key={group} className="label-picker-group">
                    <div className="label-picker-group-name">{group}</div>
                    <div className="label-picker-items">
                      {groupLabels.map((label) => {
                        const isSelected = editedTodo.labels.includes(label.name)
                        return (
                          <button
                            key={label.id}
                            className={`label-picker-item ${isSelected ? "selected" : ""}`}
                            onClick={() => handleToggleLabel(label.name)}
                            style={{
                              background: isSelected ? `${label.color}22` : "transparent",
                              borderColor: isSelected ? label.color : "var(--border)",
                              color: isSelected ? label.color : "var(--text)",
                            }}
                          >
                            <span
                              className="label-color-dot"
                              style={{ background: label.color }}
                            />
                            {label.name}
                            {isSelected && <span className="label-check">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showLabelPicker && labels.length === 0 && (
              <p className="detail-empty-hint">
                No labels defined yet. Create labels in Settings &gt; Tags.
              </p>
            )}
          </div>

          {/* Subtasks */}
          <div className="detail-section">
            <label className="detail-label">
              Subtasks
              {totalSubtasks > 0 && (
                <span className="subtask-progress-text">
                  {" "}{completedSubtasks}/{totalSubtasks} done
                </span>
              )}
            </label>

            {/* Subtask progress bar */}
            {totalSubtasks > 0 && (
              <div className="subtask-progress-bar">
                <div
                  className="subtask-progress-fill"
                  style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                />
              </div>
            )}

            {/* Add subtask */}
            <div className="subtask-add-row">
              <input
                type="text"
                className="subtask-add-input"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Add a subtask..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddSubtask()
                  }
                }}
              />
              <button
                type="button"
                className="subtask-add-btn"
                onClick={handleAddSubtask}
                disabled={!newSubtask.trim()}
              >
                +
              </button>
            </div>

            {/* Subtask list */}
            <div className="subtask-list">
              {editedTodo.subtasks.map((st) => (
                <div key={st.id} className={`subtask-item ${st.completed ? "completed" : ""}`}>
                  {editingSubtaskId === st.id ? (
                    <div className="subtask-edit-row">
                      <input
                        type="text"
                        className="subtask-edit-input"
                        value={editingSubtaskText}
                        onChange={(e) => setEditingSubtaskText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleSaveSubtaskEdit()
                          } else if (e.key === "Escape") {
                            setEditingSubtaskId(null)
                          }
                        }}
                        autoFocus
                      />
                      <button className="subtask-save-btn" onClick={handleSaveSubtaskEdit}>
                        Save
                      </button>
                      <button
                        className="subtask-cancel-btn"
                        onClick={() => setEditingSubtaskId(null)}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="subtask-left">
                        <input
                          type="checkbox"
                          className="subtask-checkbox"
                          checked={st.completed}
                          onChange={() => handleToggleSubtask(st.id)}
                        />
                        <span className={`subtask-text ${st.completed ? "done" : ""}`}>
                          {st.message}
                        </span>
                      </div>
                      <div className="subtask-actions">
                        {st.completed && st.completedAt && (
                          <span className="subtask-completed-date">
                            {formatTimestamp(st.completedAt)}
                          </span>
                        )}
                        <button
                          className="subtask-action-btn"
                          onClick={() => handleEditSubtask(st.id)}
                          title="Edit subtask"
                        >
                          ✎
                        </button>
                        <button
                          className="subtask-action-btn delete"
                          onClick={() => handleDeleteSubtask(st.id)}
                          title="Delete subtask"
                        >
                          🗑
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {editedTodo.subtasks.length === 0 && (
                <p className="detail-empty-hint">No subtasks yet.</p>
              )}
            </div>
          </div>

          {/* People */}
          <div className="detail-section">
            <label className="detail-label">People</label>
            <div className="detail-people">
              {editedTodo.names.map((name) => (
                <span key={name} className="person-chip">
                  👤 {name}
                  <button
                    className="person-remove"
                    onClick={() => handleRemovePerson(name)}
                  >
                    ✕
                  </button>
                </span>
              ))}
              <div className="person-add-row">
                <input
                  type="text"
                  className="person-input"
                  placeholder="Add person..."
                  value={newPerson}
                  onChange={(e) => setNewPerson(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddPerson()
                    }
                  }}
                />
                <button className="person-add-btn" onClick={handleAddPerson}>
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="detail-section">
            <label className="detail-label">
              Notes ({editedTodo.notes.length})
            </label>

            {/* Add note */}
            <div className="note-add">
              <textarea
                ref={noteInputRef}
                className="note-input"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                rows="2"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    handleAddNote()
                  }
                }}
              />
              <button
                className="note-add-btn"
                onClick={handleAddNote}
                disabled={!newNote.trim()}
              >
                Add Note
              </button>
            </div>

            {/* Notes list */}
            <div className="notes-list">
              {editedTodo.notes.length === 0 && (
                <p className="detail-empty-hint">
                  No notes yet. Add one above.
                </p>
              )}
              {editedTodo.notes.map((note) => (
                <div key={note.id} className="note-item">
                  {editingNoteId === note.id ? (
                    <div className="note-edit">
                      <textarea
                        className="note-edit-input"
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                        rows="3"
                        autoFocus
                      />
                      <div className="note-edit-actions">
                        <button className="note-save-btn" onClick={handleSaveNoteEdit}>
                          Save
                        </button>
                        <button
                          className="note-cancel-btn"
                          onClick={() => {
                            setEditingNoteId(null)
                            setEditingNoteText("")
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="note-text">{note.text}</div>
                      <div className="note-meta">
                        <span className="note-timestamp">
                          {formatTimestamp(note.createdAt)}
                          {note.updatedAt !== note.createdAt && " (edited)"}
                        </span>
                        <div className="note-actions">
                          <button
                            className="note-action-btn"
                            onClick={() => handleEditNote(note.id)}
                            title="Edit note"
                          >
                            ✎
                          </button>
                          <button
                            className="note-action-btn delete"
                            onClick={() => handleDeleteNote(note.id)}
                            title="Delete note"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Timestamps */}
          <div className="detail-timestamps">
            <span>Created: {formatTimestamp(editedTodo.createdAt)}</span>
            {editedTodo.updatedAt && editedTodo.updatedAt !== editedTodo.createdAt && (
              <span>Updated: {formatTimestamp(editedTodo.updatedAt)}</span>
            )}
          </div>
        </div>

        <div className="detail-footer">
          <button className="detail-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="detail-btn-save" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>

      <style>{`
        .detail-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 200;
          animation: detailFadeIn 0.15s ease;
        }

        @keyframes detailFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .detail-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--card);
          border-radius: 12px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
          width: 90%;
          max-width: 640px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          z-index: 201;
          animation: detailSlideUp 0.2s ease;
        }

        @keyframes detailSlideUp {
          from {
            transform: translate(-50%, -48%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, -50%);
            opacity: 1;
          }
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px 20px 16px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .detail-header h2 {
          margin: 0;
          font-size: 20px;
          color: var(--text);
          font-weight: 700;
          line-height: 1.3;
          flex: 1;
          margin-right: 12px;
          word-break: break-word;
        }

        .detail-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: var(--text-muted);
          padding: 4px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        .detail-close:hover {
          color: var(--text);
          background: var(--background);
        }

        .detail-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .detail-body::-webkit-scrollbar {
          width: 6px;
        }
        .detail-body::-webkit-scrollbar-track {
          background: transparent;
        }
        .detail-body::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 3px;
        }

        .detail-info-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }

        .detail-info-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 6px;
        }

        .detail-info-badge.date {
          background: rgba(52, 152, 219, 0.1);
          color: #2980b9;
        }
        .detail-info-badge.company {
          background: rgba(155, 89, 182, 0.1);
          color: #8e44ad;
        }
        .detail-info-badge.rep {
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
        }

        .detail-section {
          margin-bottom: 20px;
        }

        .detail-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .detail-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .detail-textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-family: inherit;
          font-size: 14px;
          color: var(--text);
          background: var(--background);
          resize: vertical;
          box-sizing: border-box;
          line-height: 1.5;
        }

        .detail-textarea:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
        }

        .detail-textarea::placeholder {
          color: var(--text-muted);
        }

        /* Labels */
        .detail-labels {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          min-height: 28px;
        }

        .label-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .label-remove {
          background: none;
          border: none;
          cursor: pointer;
          color: inherit;
          font-size: 10px;
          padding: 0 0 0 4px;
          opacity: 0.7;
        }

        .label-remove:hover {
          opacity: 1;
        }

        .detail-add-btn {
          background: none;
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 2px 8px;
          font-size: 12px;
          cursor: pointer;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .detail-add-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .label-picker {
          margin-top: 10px;
          padding: 12px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 8px;
          max-height: 200px;
          overflow-y: auto;
        }

        .label-picker-group {
          margin-bottom: 10px;
        }

        .label-picker-group:last-child {
          margin-bottom: 0;
        }

        .label-picker-group-name {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .label-picker-items {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .label-picker-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border: 1px solid var(--border);
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .label-picker-item:hover {
          transform: scale(1.02);
        }

        .label-color-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .label-check {
          font-size: 11px;
          font-weight: 700;
        }

        /* People */
        .detail-people {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .person-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: rgba(245, 176, 65, 0.1);
          color: #d68910;
          border: 1px solid rgba(245, 176, 65, 0.25);
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .person-remove {
          background: none;
          border: none;
          cursor: pointer;
          color: inherit;
          font-size: 10px;
          padding: 0 0 0 4px;
          opacity: 0.7;
        }

        .person-remove:hover {
          opacity: 1;
        }

        .person-add-row {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .person-input {
          padding: 4px 8px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 12px;
          color: var(--text);
          background: var(--background);
          width: 140px;
          font-family: inherit;
        }

        .person-input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .person-input::placeholder {
          color: var(--text-muted);
        }

        .person-add-btn {
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 6px;
          width: 26px;
          height: 26px;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .person-add-btn:hover {
          opacity: 0.9;
        }

        /* Notes */
        .note-add {
          margin-bottom: 12px;
        }

        .note-input {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-family: inherit;
          font-size: 14px;
          color: var(--text);
          background: var(--background);
          resize: vertical;
          box-sizing: border-box;
          margin-bottom: 8px;
        }

        .note-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
        }

        .note-input::placeholder {
          color: var(--text-muted);
        }

        .note-add-btn {
          padding: 6px 14px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .note-add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .note-add-btn:not(:disabled):hover {
          opacity: 0.9;
        }

        .notes-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
        }

        .notes-list::-webkit-scrollbar {
          width: 4px;
        }
        .notes-list::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 2px;
        }

        .note-item {
          padding: 12px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 8px;
          transition: border-color 0.15s;
        }

        .note-item:hover {
          border-color: var(--primary);
        }

        .note-text {
          font-size: 14px;
          color: var(--text);
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
          margin-bottom: 8px;
        }

        .note-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .note-timestamp {
          font-size: 11px;
          color: var(--text-muted);
        }

        .note-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.15s;
        }

        .note-item:hover .note-actions {
          opacity: 1;
        }

        .note-action-btn {
          background: none;
          border: 1px solid var(--border);
          border-radius: 4px;
          cursor: pointer;
          padding: 2px 6px;
          font-size: 12px;
          color: var(--text-muted);
        }

        .note-action-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .note-action-btn.delete:hover {
          border-color: #e74c3c;
          color: #e74c3c;
        }

        .note-edit {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .note-edit-input {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--primary);
          border-radius: 4px;
          font-family: inherit;
          font-size: 14px;
          color: var(--text);
          background: var(--card);
          resize: vertical;
          box-sizing: border-box;
        }

        .note-edit-input:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.15);
        }

        .note-edit-actions {
          display: flex;
          gap: 6px;
        }

        .note-save-btn,
        .note-cancel-btn {
          padding: 4px 12px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .note-save-btn {
          background: var(--primary);
          color: white;
        }

        .note-cancel-btn {
          background: var(--background);
          color: var(--text);
          border: 1px solid var(--border);
        }

        .detail-empty-hint {
          font-size: 13px;
          color: var(--text-muted);
          font-style: italic;
          margin: 0;
        }

        /* Subtasks */
        .subtask-progress-text {
          font-weight: 500;
          font-size: 11px;
          color: var(--primary);
          text-transform: none;
          letter-spacing: 0;
        }

        .subtask-progress-bar {
          height: 4px;
          background: var(--border);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .subtask-progress-fill {
          height: 100%;
          background: var(--primary);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .subtask-add-row {
          display: flex;
          gap: 6px;
          margin-bottom: 8px;
        }

        .subtask-add-input {
          flex: 1;
          padding: 7px 10px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 13px;
          color: var(--text);
          background: var(--background);
          font-family: inherit;
        }

        .subtask-add-input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .subtask-add-input::placeholder {
          color: var(--text-muted);
        }

        .subtask-add-btn {
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 6px;
          width: 30px;
          height: 30px;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .subtask-add-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .subtask-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .subtask-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 6px;
          transition: border-color 0.15s;
          gap: 8px;
        }

        .subtask-item:hover {
          border-color: var(--primary);
        }

        .subtask-item.completed {
          opacity: 0.7;
        }

        .subtask-left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }

        .subtask-checkbox {
          appearance: none;
          width: 16px;
          height: 16px;
          border: 2px solid var(--border);
          border-radius: 4px;
          cursor: pointer;
          background: var(--card);
          flex-shrink: 0;
          position: relative;
        }

        .subtask-checkbox:checked {
          background: var(--primary);
          border-color: var(--primary);
        }

        .subtask-checkbox:checked::after {
          content: "✓";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 10px;
          font-weight: bold;
        }

        .subtask-text {
          font-size: 13px;
          color: var(--text);
          word-break: break-word;
        }

        .subtask-text.done {
          text-decoration: line-through;
          color: var(--text-muted);
        }

        .subtask-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
          opacity: 0;
          transition: opacity 0.15s;
        }

        .subtask-item:hover .subtask-actions {
          opacity: 1;
        }

        .subtask-completed-date {
          font-size: 10px;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .subtask-action-btn {
          background: none;
          border: 1px solid var(--border);
          border-radius: 4px;
          cursor: pointer;
          padding: 2px 5px;
          font-size: 11px;
          color: var(--text-muted);
        }

        .subtask-action-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .subtask-action-btn.delete:hover {
          border-color: #e74c3c;
          color: #e74c3c;
        }

        .subtask-edit-row {
          display: flex;
          gap: 6px;
          align-items: center;
          width: 100%;
        }

        .subtask-edit-input {
          flex: 1;
          padding: 5px 8px;
          border: 1px solid var(--primary);
          border-radius: 4px;
          font-size: 13px;
          color: var(--text);
          background: var(--card);
          font-family: inherit;
        }

        .subtask-edit-input:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.15);
        }

        .subtask-save-btn {
          padding: 4px 10px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }

        .subtask-cancel-btn {
          background: none;
          border: 1px solid var(--border);
          border-radius: 4px;
          cursor: pointer;
          padding: 3px 6px;
          font-size: 11px;
          color: var(--text-muted);
        }

        /* Timestamps */
        .detail-timestamps {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 10px;
          background: var(--background);
          border-radius: 6px;
          border: 1px solid var(--border);
          margin-top: 8px;
        }

        .detail-timestamps span {
          font-size: 11px;
          color: var(--text-muted);
        }

        /* Footer */
        .detail-footer {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }

        .detail-btn-cancel,
        .detail-btn-save {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.15s;
        }

        .detail-btn-cancel {
          background: var(--background);
          color: var(--text);
          border: 1px solid var(--border);
        }

        .detail-btn-cancel:hover {
          border-color: var(--primary);
        }

        .detail-btn-save {
          background: var(--primary);
          color: white;
        }

        .detail-btn-save:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        @media (max-width: 600px) {
          .detail-modal {
            width: 95%;
            max-height: 92vh;
          }

          .detail-header h2 {
            font-size: 18px;
          }

          .note-actions {
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}

export default TodoDetailModal
