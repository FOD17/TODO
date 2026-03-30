import React from "react"

function Sidebar({ companies, selectedCompany, onSelectCompany, stats }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>📋 Projects</h2>
      </div>

      <nav className="projects-nav">
        <button
          className={`nav-item ${selectedCompany === "All" ? "active" : ""}`}
          onClick={() => onSelectCompany("All")}
        >
          <span className="nav-icon">🎯</span>
          <span className="nav-label">All Tasks</span>
          {stats?.total > 0 && <span className="badge">{stats.total}</span>}
        </button>

        <div className="nav-divider" />

        {companies.map((company) => (
          <button
            key={company}
            className={`nav-item ${selectedCompany === company ? "active" : ""}`}
            onClick={() => onSelectCompany(company)}
          >
            <span className="nav-icon">🏢</span>
            <span className="nav-label">{company}</span>
            {stats?.[company] && (
              <span className="badge">{stats[company]}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="stats-card">
          <div className="stat-item">
            <span className="stat-label">Today</span>
            <span className="stat-value">{stats?.today || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Overdue</span>
            <span className="stat-value urgent">{stats?.overdue || 0}</span>
          </div>
        </div>
      </div>

      <style>{`
        .sidebar {
          width: 280px;
          background: var(--card);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
          overflow-y: auto;
          padding: 0;
        }

        .sidebar-header {
          padding: 24px 16px 16px;
          border-bottom: 1px solid var(--border);
        }

        .sidebar-header h2 {
          margin: 0;
          font-size: 20px;
          color: var(--text);
          font-weight: 700;
        }

        .projects-nav {
          flex: 1;
          padding: 12px 8px;
          overflow-y: auto;
        }

        .nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 12px;
          background: transparent;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          color: var(--text);
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          margin-bottom: 4px;
        }

        .nav-item:hover {
          background: var(--background);
        }

        .nav-item.active {
          background: var(--primary);
          color: white;
        }

        .nav-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .nav-label {
          flex: 1;
          text-align: left;
        }

        .badge {
          background: var(--background);
          color: var(--text);
          font-size: 12px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        .nav-item.active .badge {
          background: rgba(255, 255, 255, 0.3);
          color: white;
        }

        .nav-divider {
          height: 1px;
          background: var(--border);
          margin: 8px 0;
        }

        .sidebar-footer {
          padding: 16px 8px;
          border-top: 1px solid var(--border);
        }

        .stats-card {
          background: var(--background);
          border-radius: 8px;
          padding: 12px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: center;
        }

        .stat-label {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--primary);
        }

        .stat-value.urgent {
          color: #e74c3c;
        }

        @media (max-width: 768px) {
          .sidebar {
            width: 0;
            border-right: none;
            position: fixed;
            left: 0;
            z-index: 50;
            transform: translateX(-100%);
            transition: transform 0.3s;
          }

          .sidebar.open {
            transform: translateX(0);
            width: 280px;
          }
        }

        /* Scrollbar styling */
        .sidebar::-webkit-scrollbar,
        .projects-nav::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar::-webkit-scrollbar-track,
        .projects-nav::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar::-webkit-scrollbar-thumb,
        .projects-nav::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 3px;
        }

        .sidebar::-webkit-scrollbar-thumb:hover,
        .projects-nav::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }
      `}</style>
    </aside>
  )
}

export default Sidebar
