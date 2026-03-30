import React, { useState } from "react"

function EditTodoDrawer({ todo, isOpen, onClose, onSave }) {
  const [description, setDescription] = useState(todo?.description || "")

  const handleSave = () => {
    if (todo) {
      onSave({
        ...todo,
        description: description.trim(),
      })
      onClose()
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown"
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <>
      {isOpen && <div className="drawer-overlay" onClick={onClose} />}
      <div className={`drawer ${isOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <h3>Edit TODO</h3>
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="drawer-content">
          {todo && (
            <>
              <div className="drawer-section">
                <label>Message</label>
                <p className="drawer-message">{todo.message}</p>
              </div>

              <div className="drawer-section">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add or edit description..."
                  rows="5"
                />
              </div>

              <div className="drawer-section">
                <label>Date</label>
                <p>{todo.date}</p>
              </div>

              <div className="drawer-section">
                <label>Company</label>
                <p>{todo.company || "N/A"}</p>
              </div>

              {todo.accountRep && (
                <div className="drawer-section">
                  <label>Account Rep</label>
                  <p>{todo.accountRep}</p>
                </div>
              )}

              <div className="drawer-timestamps">
                <div className="timestamp-item">
                  <span className="timestamp-label">Created:</span>
                  <span className="timestamp-value">
                    {formatDate(todo.createdAt)}
                  </span>
                </div>
                {todo.updatedAt && todo.updatedAt !== todo.createdAt && (
                  <div className="timestamp-item">
                    <span className="timestamp-label">Last Updated:</span>
                    <span className="timestamp-value">
                      {formatDate(todo.updatedAt)}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="drawer-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Save Changes
          </button>
        </div>

        <style>{`
          .drawer-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 99;
          }

          .drawer {
            position: fixed;
            right: -400px;
            top: 0;
            bottom: 0;
            width: 400px;
            background: var(--card);
            box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
            transition: right 0.3s ease;
            z-index: 100;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
          }

          .drawer.open {
            right: 0;
          }

          .drawer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid var(--border);
            flex-shrink: 0;
          }

          .drawer-header h3 {
            margin: 0;
            color: var(--text);
            font-size: 18px;
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
          }

          .btn-close:hover {
            color: var(--primary);
          }

          .drawer-content {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
          }

          .drawer-section {
            margin-bottom: 20px;
          }

          .drawer-section label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }

          .drawer-section p {
            margin: 0;
            color: var(--text);
            font-size: 14px;
            line-height: 1.5;
            padding: 8px;
            background: var(--background);
            border-radius: 4px;
          }

          .drawer-message {
            font-weight: 500;
            font-size: 15px;
          }

          .drawer-section textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--border);
            border-radius: 4px;
            font-family: inherit;
            font-size: 14px;
            color: var(--text);
            background: var(--background);
            resize: vertical;
            box-sizing: border-box;
          }

          .drawer-section textarea:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(var(--primary), 0.1);
          }

          .drawer-timestamps {
            background: var(--background);
            padding: 12px;
            border-radius: 4px;
            border: 1px solid var(--border);
            margin-top: 20px;
          }

          .timestamp-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 12px;
          }

          .timestamp-item:last-child {
            margin-bottom: 0;
          }

          .timestamp-label {
            color: var(--text-muted);
            font-weight: 600;
          }

          .timestamp-value {
            color: var(--text);
            font-family: "Courier New", monospace;
            font-size: 11px;
          }

          .drawer-footer {
            display: flex;
            gap: 12px;
            padding: 20px;
            border-top: 1px solid var(--border);
            flex-shrink: 0;
          }

          .drawer-footer button {
            flex: 1;
            padding: 10px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            transition: all 0.2s;
          }

          .btn-primary {
            background: var(--primary);
            color: white;
          }

          .btn-primary:hover {
            opacity: 0.9;
            transform: translateY(-1px);
          }

          .btn-secondary {
            background: var(--background);
            color: var(--text);
            border: 1px solid var(--border);
          }

          .btn-secondary:hover {
            background: var(--card);
            border-color: var(--primary);
          }

          @media (max-width: 600px) {
            .drawer {
              width: 100%;
              right: -100%;
            }
          }
        `}</style>
      </div>
    </>
  )
}

export default EditTodoDrawer
