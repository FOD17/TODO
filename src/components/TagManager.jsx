import React, { useState } from "react"

function TagManager({ tags, onAddTag, onRemoveTag }) {
  const [newTag, setNewTag] = useState("")
  const [newCompany, setNewCompany] = useState("")
  const [selectedCompany, setSelectedCompany] = useState("")
  const [expandedCompanies, setExpandedCompanies] = useState(new Set())

  const allCompanies = Object.keys(tags).sort()

  const handleAddTag = (e) => {
    e.preventDefault()

    const company = newCompany.trim() || selectedCompany

    if (!company) {
      alert("Please select or enter a company")
      return
    }

    if (!newTag.trim()) {
      alert("Please enter a tag name")
      return
    }

    onAddTag(company, newTag.trim())
    setNewTag("")
    setNewCompany("")
    setSelectedCompany("")
  }

  const toggleCompanyExpanded = (company) => {
    const updated = new Set(expandedCompanies)
    if (updated.has(company)) {
      updated.delete(company)
    } else {
      updated.add(company)
    }
    setExpandedCompanies(updated)
  }

  // Separate main tags from subtags (tags with colons)
  const getMainTags = (companyTags) => {
    return companyTags.filter((tag) => !tag.includes(":")).sort()
  }

  const getSubtags = (companyTags, mainTag) => {
    return companyTags
      .filter((tag) => tag.startsWith(mainTag + ":"))
      .map((tag) => tag.substring(mainTag.length + 1).trim())
      .sort()
  }

  return (
    <div className="tag-manager-page">
      <div className="tag-manager-header">
        <h2>🏷️ Manage Tags & Companies</h2>
        <p>Organize your companies and contacts with tags</p>
      </div>

      <div className="tag-manager-container">
        <div className="tag-add-section card">
          <h3>Add New Tag</h3>
          <form onSubmit={handleAddTag}>
            <div className="form-section">
              <label>Company *</label>
              <input
                type="text"
                list="company-suggestions"
                value={newCompany || selectedCompany}
                onChange={(e) => {
                  if (allCompanies.includes(e.target.value)) {
                    setSelectedCompany(e.target.value)
                    setNewCompany("")
                  } else {
                    setNewCompany(e.target.value)
                    setSelectedCompany("")
                  }
                }}
                placeholder="Select or type company name..."
                autoComplete="off"
              />
              <datalist id="company-suggestions">
                {allCompanies.map((company) => (
                  <option key={company} value={company} />
                ))}
              </datalist>
            </div>

            <div className="form-section">
              <label>Tag or Contact Name *</label>
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="e.g., General"
                autoFocus
              />
              <small>Tip: Use "Company: Person" for contact tags</small>
            </div>

            <button type="submit" className="btn-primary">
              ✓ Add Tag
            </button>
          </form>
        </div>

        <div className="tags-tree card">
          <h3>Companies & Tags</h3>
          {allCompanies.length === 0 ? (
            <p className="empty-state">
              No tags yet. Create your first tag to get started!
            </p>
          ) : (
            <div className="company-tree">
              {allCompanies.map((company) => {
                const isExpanded = expandedCompanies.has(company)
                const companyTags = tags[company] || []
                const mainTags = getMainTags(companyTags)

                return (
                  <div key={company} className="tree-company">
                    <button
                      className="company-header"
                      onClick={() => toggleCompanyExpanded(company)}
                    >
                      <span className="expand-icon">
                        {isExpanded ? "▼" : "▶"}
                      </span>
                      <span className="company-name">{company}</span>
                      <span className="tag-count">({companyTags.length})</span>
                    </button>

                    {isExpanded && (
                      <div className="company-content">
                        {mainTags.length === 0 && (
                          <p className="empty-tags">No tags for this company</p>
                        )}
                        {mainTags.map((mainTag) => {
                          const subtags = getSubtags(companyTags, mainTag)
                          return (
                            <div key={mainTag} className="tag-group">
                              <div className="main-tag">
                                <span className="tag-icon">📌</span>
                                <span className="tag-text">{mainTag}</span>
                                <button
                                  onClick={() => onRemoveTag(company, mainTag)}
                                  className="btn-remove"
                                  title="Remove tag"
                                >
                                  ✕
                                </button>
                              </div>

                              {subtags.length > 0 && (
                                <div className="subtags">
                                  {subtags.map((subtag) => (
                                    <div key={subtag} className="subtag">
                                      <span className="subtag-icon">👤</span>
                                      <span className="subtag-text">
                                        {subtag}
                                      </span>
                                      <button
                                        onClick={() =>
                                          onRemoveTag(
                                            company,
                                            `${mainTag}: ${subtag}`,
                                          )
                                        }
                                        className="btn-remove"
                                        title="Remove contact"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .tag-manager-page {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }

        .tag-manager-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .tag-manager-header h2 {
          font-size: 28px;
          color: #2c3e50;
          margin-bottom: 8px;
        }

        .tag-manager-header p {
          color: #7f8c8d;
          font-size: 14px;
        }

        .tag-manager-container {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 20px;
        }

        .tag-add-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          height: fit-content;
          position: sticky;
          top: 20px;
        }

        .tag-add-section h3 {
          margin-bottom: 16px;
          color: #2c3e50;
          font-size: 16px;
        }

        .form-section {
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
        }

        .form-section label {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 6px;
          color: #555;
        }

        .form-section input {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 13px;
          font-family: inherit;
        }

        .form-section input:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
        }

        .form-section small {
          font-size: 11px;
          color: #999;
          margin-top: 4px;
        }

        .tag-add-section .btn-primary {
          width: 100%;
          margin-top: 8px;
        }

        .tags-tree {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .tags-tree h3 {
          margin-bottom: 16px;
          color: #2c3e50;
          font-size: 16px;
        }

        .empty-state {
          text-align: center;
          color: #999;
          padding: 40px 20px;
          font-size: 14px;
        }

        .company-tree {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tree-company {
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          overflow: hidden;
        }

        .company-header {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background-color: #f8f9fa;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: #2c3e50;
          transition: all 0.2s;
          text-align: left;
        }

        .company-header:hover {
          background-color: #ecf0f1;
        }

        .expand-icon {
          display: inline-block;
          width: 20px;
          flex-shrink: 0;
          text-align: center;
        }

        .company-name {
          flex: 1;
        }

        .tag-count {
          font-size: 12px;
          color: #7f8c8d;
          background: white;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .company-content {
          padding: 12px;
          background: white;
          border-top: 1px solid #e0e0e0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .empty-tags {
          color: #999;
          font-size: 12px;
          margin: 0;
          padding: 8px 0;
        }

        .tag-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .main-tag {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: #ecf0f1;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          color: #2c3e50;
        }

        .tag-icon {
          flex-shrink: 0;
        }

        .tag-text {
          flex: 1;
          word-break: break-word;
        }

        .subtags {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-left: 20px;
        }

        .subtag {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          background: #f8f9fa;
          border-radius: 4px;
          font-size: 12px;
          color: #555;
          border-left: 2px solid #3498db;
        }

        .subtag-icon {
          flex-shrink: 0;
        }

        .subtag-text {
          flex: 1;
          word-break: break-word;
        }

        .btn-remove {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 14px;
          padding: 0;
          flex-shrink: 0;
          transition: color 0.2s;
        }

        .btn-remove:hover {
          color: #e74c3c;
        }

        @media (max-width: 1024px) {
          .tag-manager-container {
            grid-template-columns: 1fr;
          }

          .tag-add-section {
            position: static;
          }
        }

        @media (max-width: 768px) {
          .tag-manager-header h2 {
            font-size: 24px;
          }

          .tag-add-section,
          .tags-tree {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  )
}

export default TagManager
