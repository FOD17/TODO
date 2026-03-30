import React, { useState } from "react"

function ContactManager({
  contacts,
  companies,
  onUpdateContact,
  onRemoveContact,
}) {
  const [selectedCompany, setSelectedCompany] = useState(companies[0] || "")
  const [selectedTag, setSelectedTag] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    type: "person", // 'person' or 'vendor'
    email: "",
    phone: "",
    notes: "",
  })
  const [showNotes, setShowNotes] = useState({})

  const companyContacts = selectedCompany
    ? contacts.companies?.[selectedCompany]?.contacts || []
    : []

  const handleAddContact = (e) => {
    e.preventDefault()

    if (!selectedCompany || !formData.name.trim() || !formData.type) {
      return
    }

    onUpdateContact(selectedCompany, {
      ...formData,
      name: formData.name.trim(),
      id: Date.now().toString(),
    })

    setFormData({
      name: "",
      type: "person",
      email: "",
      phone: "",
      notes: "",
    })
    setShowForm(false)
  }

  return (
    <div className="contact-manager card">
      <h3>👥 Contact Manager</h3>

      <div className="contact-section">
        <div className="contact-header">
          <select
            value={selectedCompany}
            onChange={(e) => {
              setSelectedCompany(e.target.value)
              setShowForm(false)
            }}
            className="company-select"
          >
            <option value="">Select company...</option>
            {companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {selectedCompany && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary btn-small"
            >
              {showForm ? "Close" : "+ Add Contact"}
            </button>
          )}
        </div>

        {showForm && selectedCompany && (
          <form onSubmit={handleAddContact} className="contact-form">
            <div className="form-row">
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
              >
                <option value="person">Person</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>

            <div className="form-row">
              <input
                type="email"
                placeholder="Email (optional)"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <textarea
              placeholder="Notes (optional)"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows="2"
            />

            <button type="submit" className="btn-primary">
              Save Contact
            </button>
          </form>
        )}

        {companyContacts.length > 0 && (
          <div className="contacts-list">
            {companyContacts.map((contact) => (
              <div key={contact.id} className="contact-card">
                <div className="contact-header-info">
                  <div>
                    <h4>
                      {contact.type === "vendor" ? "🏪" : "👤"} {contact.name}
                    </h4>
                    <span className="contact-type">
                      {contact.type === "vendor" ? "Vendor" : "Contact"}
                    </span>
                  </div>
                  <button
                    onClick={() => onRemoveContact(selectedCompany, contact.id)}
                    className="btn-remove"
                  >
                    ✕
                  </button>
                </div>

                <div className="contact-details">
                  {contact.email && (
                    <div className="detail-item">
                      <span className="label">📧 Email:</span>
                      <a href={`mailto:${contact.email}`}>{contact.email}</a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="detail-item">
                      <span className="label">📞 Phone:</span>
                      <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                    </div>
                  )}
                  {contact.notes && (
                    <div className="detail-item">
                      <button
                        className="btn-text"
                        onClick={() =>
                          setShowNotes({
                            ...showNotes,
                            [contact.id]: !showNotes[contact.id],
                          })
                        }
                      >
                        {showNotes[contact.id] ? "▼" : "▶"} Notes
                      </button>
                      {showNotes[contact.id] && (
                        <p className="notes">{contact.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedCompany && companyContacts.length === 0 && !showForm && (
          <p className="empty-message">No contacts added yet</p>
        )}
      </div>

      <style>{`
        .contact-manager {
          background: white;
          margin-bottom: 20px;
        }

        .contact-manager h3 {
          margin-bottom: 16px;
          font-size: 16px;
          color: #2c3e50;
        }

        .contact-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .contact-header {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .company-select {
          flex: 1;
          min-width: 200px;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 13px;
        }

        .btn-small {
          padding: 8px 12px;
          font-size: 13px;
          white-space: nowrap;
        }

        .contact-form {
          background-color: #f9f9f9;
          padding: 12px;
          border-radius: 4px;
          border: 1px solid #e0e0e0;
        }

        .contact-form .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 8px;
        }

        .contact-form input,
        .contact-form select,
        .contact-form textarea {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 13px;
          font-family: inherit;
        }

        .contact-form input:focus,
        .contact-form select:focus,
        .contact-form textarea:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
        }

        .contact-form button {
          width: 100%;
          margin-top: 8px;
        }

        .contacts-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .contact-card {
          background-color: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 12px;
        }

        .contact-card:hover {
          border-color: #3498db;
          box-shadow: 0 2px 4px rgba(52, 152, 219, 0.1);
        }

        .contact-header-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .contact-header-info h4 {
          margin: 0 0 4px 0;
          font-size: 14px;
          color: #2c3e50;
        }

        .contact-type {
          display: inline-block;
          background-color: #3498db;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
        }

        .btn-remove {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          color: #999;
          padding: 4px;
          transition: color 0.2s;
        }

        .btn-remove:hover {
          color: #e74c3c;
        }

        .contact-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-item .label {
          font-weight: 600;
          color: #555;
        }

        .detail-item a {
          color: #3498db;
          text-decoration: none;
        }

        .detail-item a:hover {
          text-decoration: underline;
        }

        .btn-text {
          background: none;
          border: none;
          cursor: pointer;
          color: #3498db;
          padding: 0;
          font-weight: 600;
          font-size: 13px;
        }

        .notes {
          background-color: white;
          padding: 8px;
          border-left: 2px solid #f39c12;
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        }

        .empty-message {
          color: #999;
          font-size: 13px;
          text-align: center;
          padding: 20px;
          margin: 0;
        }

        @media (max-width: 768px) {
          .contact-form .form-row {
            grid-template-columns: 1fr;
          }

          .contact-header {
            flex-direction: column;
          }

          .company-select {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  )
}

export default ContactManager
