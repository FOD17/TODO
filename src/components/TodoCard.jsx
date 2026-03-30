import React, { useState } from "react"

function TodoCard({ todo, onComplete, onDelete, onEdit, isCompleted }) {
  const [isHovered, setIsHovered] = useState(false)

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

    if (d < today) return "#e74c3c" // Red - Overdue
    if (d.getTime() === today.getTime()) return "#f39c12" // Orange - Today
    return "#3498db" // Blue - Future
  }

  return (
    <div
      className={`todo-card ${isCompleted ? "completed" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ borderLeftColor: getPriorityColor() }}
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
        </div>
      </div>

      <div className={`card-actions ${isHovered ? "visible" : ""}`}>
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
