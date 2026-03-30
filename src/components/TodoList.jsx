import React from "react"

function TodoList({
  active,
  completed,
  onComplete,
  onDelete,
  onUncomplete,
  onEdit,
}) {
  const formatDate = (date) => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const isToday = d.toDateString() === today.toDateString()
    const isYesterday = d.toDateString() === yesterday.toDateString()

    if (isToday) return "Today"
    if (isYesterday) return "Yesterday"

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    })
  }

  const isOverdue = (date) => {
    const d = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    d.setHours(0, 0, 0, 0)
    return d < today
  }

  const isDueToday = (date) => {
    const d = new Date(date)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  }

  return (
    <div className="todo-lists">
      {active.length > 0 && (
        <section className="todo-section card">
          <h3>🎯 Active TODOs ({active.length})</h3>
          <div className="todos-list">
            {active.map((todo) => (
              <div
                key={todo.id}
                className={`todo-item ${isOverdue(todo.date) ? "overdue" : isDueToday(todo.date) ? "due-today" : ""}`}
              >
                <div className="todo-checkbox">
                  <input
                    type="checkbox"
                    id={`todo-${todo.id}`}
                    onChange={() => onComplete(todo.id)}
                  />
                  <label htmlFor={`todo-${todo.id}`}></label>
                </div>

                <div className="todo-content">
                  <p className="todo-message">{todo.message}</p>
                  <div className="todo-meta">
                    <span
                      className={`meta-item date ${isOverdue(todo.date) ? "overdue" : isDueToday(todo.date) ? "due-today" : ""}`}
                    >
                      📅 {formatDate(todo.date)}
                    </span>
                    {todo.company && (
                      <span className="meta-item company">
                        🏢 {todo.company}
                      </span>
                    )}
                    {todo.names.length > 0 && (
                      <span className="meta-item people">
                        👥 {todo.names.join(", ")}
                      </span>
                    )}
                    {todo.accountRep && (
                      <span className="meta-item rep">
                        📞 {todo.accountRep}
                      </span>
                    )}
                  </div>
                </div>

                <div className="todo-actions">
                  <button
                    onClick={() => onComplete(todo.id)}
                    className="btn-icon btn-complete"
                    title="Mark complete"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => onEdit?.(todo)}
                    className="btn-icon btn-edit"
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => onDelete(todo.id, false)}
                    className="btn-icon btn-delete"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section className="todo-section card completed-section">
          <h3>✅ Completed TODOs ({completed.length})</h3>
          <div className="todos-list">
            {completed.map((todo) => (
              <div key={todo.id} className="todo-item completed">
                <div className="todo-checkbox">
                  <input
                    type="checkbox"
                    id={`todo-${todo.id}`}
                    checked
                    onChange={() => onUncomplete(todo.id)}
                  />
                  <label htmlFor={`todo-${todo.id}`}></label>
                </div>

                <div className="todo-content">
                  <p className="todo-message">{todo.message}</p>
                  <div className="todo-meta">
                    <span className="meta-item date">
                      📅 {formatDate(todo.date)}
                    </span>
                    {todo.company && (
                      <span className="meta-item company">
                        🏢 {todo.company}
                      </span>
                    )}
                    {todo.names.length > 0 && (
                      <span className="meta-item people">
                        👥 {todo.names.join(", ")}
                      </span>
                    )}
                    {todo.accountRep && (
                      <span className="meta-item rep">
                        📞 {todo.accountRep}
                      </span>
                    )}
                  </div>
                </div>

                <div className="todo-actions">
                  <button
                    onClick={() => onUncomplete(todo.id)}
                    className="btn-icon btn-uncomplete"
                    title="Mark incomplete"
                  >
                    ↩
                  </button>
                  <button
                    onClick={() => onEdit?.(todo)}
                    className="btn-icon btn-edit"
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => onDelete(todo.id, true)}
                    className="btn-icon btn-delete"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {active.length === 0 && completed.length === 0 && (
        <section className="todo-section card empty-state">
          <div className="empty-message">
            <p>📭 No TODOs yet</p>
            <p>Create your first TODO to get started!</p>
          </div>
        </section>
      )}

      <style>{`
        .todo-lists {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .todo-section {
          background: white;
        }

        .todo-section h3 {
          margin-bottom: 16px;
          font-size: 16px;
          color: #2c3e50;
        }

        .todos-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .todo-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          background-color: var(--card);
          border: 1px solid var(--border);
          border-radius: 6px;
          transition: all 0.2s;
          align-items: flex-start;
        }

        .todo-item:hover {
          background-color: var(--card);
          border-color: var(--primary);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .todo-item.overdue {
          border-left: 4px solid #e74c3c;
          background-color: rgba(231, 76, 60, 0.03);
        }

        .todo-item.due-today {
          border-left: 4px solid #f39c12;
          background-color: rgba(243, 156, 18, 0.03);
        }

        .todo-item.completed {
          opacity: 0.7;
          background-color: var(--card);
        }

        .todo-item.completed .todo-message {
          color: var(--text-muted);
        }

        .todo-checkbox {
          position: relative;
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 0;
        }

        .todo-checkbox input[type="checkbox"] {
          position: relative;
          appearance: none;
          width: 20px;
          height: 20px;
          cursor: pointer;
          border: 2px solid var(--border);
          border-radius: 4px;
          background-color: var(--card);
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .todo-checkbox input[type="checkbox"]:hover {
          border-color: var(--primary);
        }

        .todo-checkbox input[type="checkbox"]:checked {
          background-color: #27ae60;
          border-color: #27ae60;
        }

        .todo-checkbox input[type="checkbox"]:checked::after {
          content: '✓';
          display: block;
          color: white;
          font-size: 12px;
          font-weight: bold;
          text-align: center;
          line-height: 16px;
        }

        .todo-content {
          flex: 1;
          min-width: 0;
        }

        .todo-message {
          margin: 0 0 8px 0;
          font-size: 15px;
          font-weight: 500;
          word-break: break-word;
          color: var(--text);
        }

        .todo-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 12px;
        }

        .meta-item {
          display: inline-block;
          background-color: var(--card);
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid var(--border);
          white-space: nowrap;
        }

        .meta-item.date.overdue {
          background-color: rgba(231, 76, 60, 0.1);
          border-color: #e74c3c;
          color: #c0392b;
          font-weight: 600;
        }

        .meta-item.date.due-today {
          background-color: rgba(243, 156, 18, 0.1);
          border-color: #f39c12;
          color: #d68910;
          font-weight: 600;
        }

        .meta-item.company {
          background-color: rgba(52, 152, 219, 0.1);
          border-color: var(--primary);
          color: #2980b9;
        }

        .meta-item.people {
          background-color: rgba(155, 89, 182, 0.1);
          border-color: #9b59b6;
          color: #8e44ad;
        }

        .meta-item.rep {
          background-color: rgba(39, 174, 96, 0.1);
          border-color: #27ae60;
          color: #229954;
        }

        .todo-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
          opacity: 0.6;
        }

        .btn-icon:hover {
          opacity: 1;
          background-color: rgba(0,0,0,0.05);
        }

        .btn-complete:hover {
          background-color: rgba(39, 174, 96, 0.2);
        }

        .btn-uncomplete:hover {
          background-color: rgba(241, 196, 15, 0.2);
        }

        .btn-edit:hover {
          background-color: rgba(52, 152, 219, 0.2);
        }

        .btn-delete:hover {
          background-color: rgba(231, 76, 60, 0.2);
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
        }

        .empty-message {
          color: #999;
        }

        .empty-message p:first-child {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .empty-message p:last-child {
          font-size: 14px;
        }

        .completed-section {
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .todo-item {
            flex-direction: column;
            gap: 8px;
          }

          .todo-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  )
}

export default TodoList
