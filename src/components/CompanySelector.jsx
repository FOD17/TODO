import React from "react"

function CompanySelector({
  companies,
  selectedCompany,
  onSelectCompany,
  stats,
}) {
  const allCompaniesCount = Object.values(stats).reduce(
    (sum, s) => sum + s.active,
    0,
  )

  return (
    <div className="company-selector card">
      <h3>Companies</h3>
      <div className="company-list">
        <button
          className={`company-btn ${selectedCompany === "All Companies" ? "active" : ""}`}
          onClick={() => onSelectCompany("All Companies")}
        >
          <span className="company-name">All Companies</span>
          <span className="company-count">{allCompaniesCount}</span>
        </button>

        {companies.map((company) => (
          <button
            key={company}
            className={`company-btn ${selectedCompany === company ? "active" : ""}`}
            onClick={() => onSelectCompany(company)}
          >
            <span className="company-name">{company}</span>
            <span className="company-count">{stats[company]?.active || 0}</span>
          </button>
        ))}
      </div>

      <style>{`
        .company-selector {
          max-height: 500px;
          overflow-y: auto;
        }

        .company-selector h3 {
          margin-bottom: 15px;
          font-size: 16px;
          color: #2c3e50;
        }

        .company-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .company-btn {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .company-btn:hover {
          background-color: #f8f9fa;
          border-color: #3498db;
        }

        .company-btn.active {
          background-color: #3498db;
          color: white;
          border-color: #3498db;
          font-weight: 600;
        }

        .company-name {
          flex: 1;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .company-count {
          background-color: rgba(0,0,0,0.1);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          margin-left: 8px;
        }

        .company-btn.active .company-count {
          background-color: rgba(255,255,255,0.3);
        }
      `}</style>
    </div>
  )
}

export default CompanySelector
