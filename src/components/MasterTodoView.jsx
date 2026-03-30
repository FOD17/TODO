import React, { useState, useMemo } from "react"
import TodoList from "./TodoList"
import EditTodoDrawer from "./EditTodoDrawer"

function MasterTodoView({
  todos,
  companies,
  accountReps,
  onComplete,
  onDelete,
  onUncomplete,
  onSaveEdit,
}) {
  const [selectedCompanies, setSelectedCompanies] = useState([])
  const [selectedReps, setSelectedReps] = useState([])
  const [showCompleted, setShowCompleted] = useState(false)
  const [sortBy, setSortBy] = useState("date")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTodo, setSelectedTodo] = useState(null)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)

  const filteredTodos = useMemo(() => {
    let active = todos.active
    let completed = todos.completed

    if (selectedCompanies.length > 0) {
      active = active.filter((t) => selectedCompanies.includes(t.company))
      completed = completed.filter((t) => selectedCompanies.includes(t.company))
    }

    if (selectedReps.length > 0) {
      active = active.filter((t) => selectedReps.includes(t.accountRep))
      completed = completed.filter((t) => selectedReps.includes(t.accountRep))
    }

    // Sort
    if (sortBy === "company") {
      active = [...active].sort((a, b) =>
        (a.company || "").localeCompare(b.company || ""),
      )
      completed = [...completed].sort((a, b) =>
        (a.company || "").localeCompare(b.company || ""),
      )
    } else {
      active = [...active].sort((a, b) => new Date(b.date) - new Date(a.date))
      completed = [...completed].sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      )
    }

    return {
      active,
      completed: showCompleted ? completed : [],
    }
  }, [todos, selectedCompanies, selectedReps, showCompleted, sortBy])

  const toggleCompany = (company) => {
    setSelectedCompanies((prev) =>
      prev.includes(company)
        ? prev.filter((c) => c !== company)
        : [...prev, company],
    )
  }

  const toggleRep = (rep) => {
    setSelectedReps((prev) =>
      prev.includes(rep) ? prev.filter((r) => r !== rep) : [...prev, rep],
    )
  }

  return (
    <div className="master-todo-view">
      <div className="master-header">
        <button
          className="toggle-filters-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? "🔼 Hide Filters" : "🔽 Show Filters"}
        </button>
        <div className="quick-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
            />
            Completed
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="date">By Date</option>
            <option value="company">By Company</option>
          </select>
        </div>
      </div>

      {showFilters && (
        <div className="master-controls">
          <div className="control-section">
            <h4>Companies</h4>
            <div className="checkbox-group">
              <button
                className={`filter-btn ${selectedCompanies.length === 0 ? "active" : ""}`}
                onClick={() => setSelectedCompanies([])}
              >
                All
              </button>
              {companies.map((company) => (
                <button
                  key={company}
                  className={`filter-btn ${selectedCompanies.includes(company) ? "active" : ""}`}
                  onClick={() => toggleCompany(company)}
                >
                  {company}
                </button>
              ))}
            </div>
          </div>

          <div className="control-section">
            <h4>Account Reps</h4>
            <div className="checkbox-group">
              <button
                className={`filter-btn ${selectedReps.length === 0 ? "active" : ""}`}
                onClick={() => setSelectedReps([])}
              >
                All
              </button>
              {accountReps.map((rep) => (
                <button
                  key={rep}
                  className={`filter-btn ${selectedReps.includes(rep) ? "active" : ""}`}
                  onClick={() => toggleRep(rep)}
                >
                  {rep}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <TodoList
        active={filteredTodos.active}
        completed={filteredTodos.completed}
        onComplete={onComplete}
        onDelete={onDelete}
        onUncomplete={onUncomplete}
        onEdit={(todo) => {
          setSelectedTodo(todo)
          setIsEditDrawerOpen(true)
        }}
      />

      <EditTodoDrawer
        todo={selectedTodo}
        isOpen={isEditDrawerOpen}
        onClose={() => {
          setIsEditDrawerOpen(false)
          setSelectedTodo(null)
        }}
        onSave={(updatedTodo) => {
          onSaveEdit?.(updatedTodo)
          setIsEditDrawerOpen(false)
          setSelectedTodo(null)
        }}
      />

      <style>{`
        .master-todo-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .master-controls {
          background: white;
          padding: 16px;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
        }

        .control-section {
          margin-bottom: 16px;
        }

        .control-section:last-child {
          margin-bottom: 0;
        }

        .control-section h4 {
          font-size: 13px;
          font-weight: 600;
          color: #555;
          margin-bottom: 8px;
        }

        .checkbox-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .filter-btn {
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          padding: 6px 12px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          border-color: #3498db;
          background-color: #f5f5f5;
        }

        .filter-btn.active {
          background-color: #3498db;
          color: white;
          border-color: #3498db;
        }

        .control-row {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }

        .control-row label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          cursor: pointer;
        }

        .control-row input[type="checkbox"] {
          cursor: pointer;
        }

        .sort-select {
          padding: 6px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 13px;
          background-color: white;
          cursor: pointer;
        }

        .sort-select:focus {
          outline: none;
          border-color: #3498db;
        }

        @media (max-width: 768px) {
          .master-controls {
            padding: 12px;
          }

          .control-section h4 {
            font-size: 12px;
          }

          .filter-btn {
            padding: 5px 10px;
            font-size: 11px;
          }

          .control-row {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  )
}

export default MasterTodoView
