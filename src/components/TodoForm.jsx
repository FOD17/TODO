import React, { useState } from "react"

function TodoForm({ onAddTodo, companies, tags }) {
  const [message, setMessage] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [company, setCompany] = useState("")
  const [selectedNames, setSelectedNames] = useState([])
  const [accountRep, setAccountRep] = useState("")
  const [showCompanyInput, setShowCompanyInput] = useState(false)
  const [newCompany, setNewCompany] = useState("")

  const availableNames =
    company && tags[company]
      ? tags[company].filter((tag) => tag.includes(":"))
      : []

  const handleAddTodo = (e) => {
    e.preventDefault()

    if (!message.trim()) return

    const finalCompany = newCompany || company

    onAddTodo({
      message: message.trim(),
      description: description.trim(),
      date,
      company: finalCompany,
      names: selectedNames,
      accountRep: accountRep.trim(),
    })

    // Reset form
    setMessage("")
    setDescription("")
    setDate(new Date().toISOString().split("T")[0])
    setCompany("")
    setSelectedNames([])
    setAccountRep("")
    setNewCompany("")
    setShowCompanyInput(false)
  }

  const handleNameToggle = (name) => {
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    )
  }

  const isToday = date === new Date().toISOString().split("T")[0]
  const isPast = date < new Date().toISOString().split("T")[0]

  return (
    <form onSubmit={handleAddTodo} className="todo-form card">
      <h3>➕ New TODO</h3>

      <div className="form-group">
        <label>Message *</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What do you need to do?"
          rows="3"
          required
        />
      </div>

      <div className="form-group">
        <label>Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add more details about this TODO..."
          rows="2"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Date *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          {isPast && <span className="warning">⚠️ Past date</span>}
          {isToday && <span className="today">📅 Today</span>}
        </div>

        <div className="form-group">
          <label>Company *</label>
          <div className="company-input-group">
            {!showCompanyInput ? (
              <>
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                >
                  <option value="">Select company...</option>
                  {companies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCompanyInput(true)}
                  className="btn-add-company"
                  title="Add new company"
                >
                  +
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="New company name..."
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCompanyInput(false)
                    setNewCompany("")
                  }}
                  className="btn-cancel-company"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Account Rep</label>
          <input
            type="text"
            value={accountRep}
            onChange={(e) => setAccountRep(e.target.value)}
            placeholder="Account representative name"
          />
        </div>
      </div>

      {availableNames.length > 0 && (
        <div className="form-group">
          <label>Names (from: {company})</label>
          <div className="names-checkboxes">
            {availableNames.map((name) => (
              <label key={name} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedNames.includes(name)}
                  onChange={() => handleNameToggle(name)}
                />
                {name}
              </label>
            ))}
          </div>
        </div>
      )}

      <button type="submit" className="btn-primary btn-submit">
        Create TODO
      </button>

      <style>{`
        .todo-form {
          background: white;
        }

        .todo-form h3 {
          margin-bottom: 20px;
          font-size: 16px;
          color: #2c3e50;
        }

        .form-group {
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 6px;
          color: #555;
        }

        .form-group textarea,
        .form-group input[type="date"],
        .form-group input[type="text"],
        .form-group select {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 60px;
        }

        .form-group textarea:focus,
        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .company-input-group {
          display: flex;
          gap: 8px;
        }

        .company-input-group select,
        .company-input-group input {
          flex: 1;
        }

        .btn-add-company,
        .btn-cancel-company {
          padding: 10px 12px;
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-add-company:hover {
          background-color: #3498db;
          color: white;
        }

        .btn-cancel-company:hover {
          background-color: #e74c3c;
          color: white;
        }

        .warning {
          display: block;
          font-size: 12px;
          color: #e74c3c;
          margin-top: 4px;
        }

        .today {
          display: block;
          font-size: 12px;
          color: #27ae60;
          margin-top: 4px;
        }

        .names-checkboxes {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
        }

        .checkbox-label input[type="checkbox"] {
          cursor: pointer;
          width: 16px;
          height: 16px;
        }

        .btn-submit {
          width: 100%;
          padding: 12px;
          font-size: 16px;
          font-weight: 600;
          margin-top: 8px;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </form>
  )
}

export default TodoForm
