import TodoCard from "./TodoCard"
import AddTaskForm from "./AddTaskForm"

function MainFeed({
  todos,
  onComplete,
  onDelete,
  onEdit,
  onClick,
  onSave,
  onAdd,
  selectedCompany,
  showCompleted,
  onShowCompletedChange,
  labels = [],
  companies = [],
  accountExecutives = [],
  companyAssignments = {},
}) {
  const filterByCompany = (list) => {
    if (selectedCompany === "All") return list
    if (selectedCompany === "Personal") return list.filter((t) => !t.company || t.company === "Personal")
    return list.filter((t) => t.company === selectedCompany)
  }

  const filteredActive = filterByCompany(todos.active)
  const filteredCompleted = filterByCompany(todos.completed)

  const activeCount = filteredActive.length
  const completedCount = filteredCompleted.length
  const completionRate =
    activeCount + completedCount > 0
      ? Math.round((completedCount / (activeCount + completedCount)) * 100)
      : 0

  return (
    <main className="main-feed">
      {/* Header with stats */}
      <div className="feed-header">
        <div className="header-content">
          <h1>{selectedCompany === "All" ? "Your Tasks" : selectedCompany}</h1>
          {activeCount > 0 && (
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${completionRate}%`,
                }}
              />
              <span className="progress-text">
                {completedCount} of {activeCount + completedCount} done
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Add Task Form */}
      <AddTaskForm
        onAdd={onAdd}
        selectedCompany={selectedCompany}
        companies={companies}
        accountExecutives={accountExecutives}
        labels={labels}
        companyAssignments={companyAssignments}
      />

      {/* Active TODOs */}
      {activeCount > 0 ? (
        <section className="todo-section">
          <h2 className="section-title">🎯 Active Tasks ({activeCount})</h2>
          <div className="cards-container">
            {filteredActive.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                onComplete={onComplete}
                onDelete={onDelete}
                onEdit={onEdit}
                onClick={onClick}
                onSave={onSave}
                isCompleted={false}
                labels={labels}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">✨</div>
          <h3>No active tasks</h3>
          <p>All caught up! Add a task above to get started.</p>
        </div>
      )}

      {/* Completed TODOs */}
      {completedCount > 0 && (
        <section className="todo-section completed-section">
          <button
            className="section-toggle"
            onClick={() => onShowCompletedChange(!showCompleted)}
          >
            <span className="toggle-icon">{showCompleted ? "▼" : "▶"}</span>
            <h2 className="section-title">✅ Completed ({completedCount})</h2>
          </button>

          {showCompleted && (
            <div className="cards-container">
              {filteredCompleted.map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  onComplete={onComplete}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onClick={onClick}
                  onSave={onSave}
                  isCompleted={true}
                  labels={labels}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <style>{`
        .main-feed {
          flex: 1;
          padding: 24px;
          max-width: 700px;
          margin: 0 auto;
          width: 100%;
          overflow-y: auto;
          min-height: 100vh;
        }

        .feed-header {
          margin-bottom: 32px;
        }

        .header-content h1 {
          margin: 0 0 16px;
          font-size: 32px;
          font-weight: 700;
          color: var(--text);
        }

        .progress-bar {
          height: 8px;
          background: var(--background);
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary), #27ae60);
          transition: width 0.5s ease;
        }

        .progress-text {
          position: absolute;
          top: 12px;
          left: 0;
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 600;
        }

        /* Sections */
        .todo-section {
          margin-bottom: 32px;
        }

        .section-title {
          margin: 0 0 16px;
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .section-toggle {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          margin-bottom: 16px;
        }

        .toggle-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 12px;
          transition: all 0.2s;
        }

        .section-toggle:hover .toggle-icon {
          color: var(--primary);
        }

        .cards-container {
          display: flex;
          flex-direction: column;
        }

        .completed-section {
          opacity: 0.85;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .empty-state h3 {
          margin: 0 0 8px;
          font-size: 20px;
          color: var(--text);
        }

        .empty-state p {
          margin: 0;
          color: var(--text-muted);
          font-size: 14px;
        }

        /* Scrollbar */
        .main-feed::-webkit-scrollbar {
          width: 6px;
        }

        .main-feed::-webkit-scrollbar-track {
          background: transparent;
        }

        .main-feed::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 3px;
        }

        .main-feed::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }

        @media (max-width: 768px) {
          .main-feed {
            padding: 16px;
            margin-left: 0;
          }

          .feed-header {
            margin-bottom: 20px;
          }

          .header-content h1 {
            font-size: 24px;
          }

          .quick-add {
            flex-wrap: wrap;
          }

          .quick-date {
            width: 100%;
          }

          .section-title {
            font-size: 16px;
          }
        }
      `}</style>
    </main>
  )
}

export default MainFeed
