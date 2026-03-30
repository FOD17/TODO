import React from "react"
import {
  getCompletionRate,
  getOverdueCount,
  getDueSoonCount,
  getCompanyStats,
} from "../utils/analytics"

function Dashboard({ stats, todos }) {
  const completionRate = getCompletionRate(todos)
  const overdueCount = getOverdueCount(todos)
  const dueSoonCount = getDueSoonCount(todos)
  const totalActive = todos.active.length
  const totalCompleted = todos.completed.length
  const totalCompanies = Object.keys(stats).length

  return (
    <div className="dashboard card">
      <h3>📊 Dashboard</h3>

      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-value">{totalActive}</div>
          <div className="stat-label">Active TODOs</div>
        </div>

        <div className="stat-box">
          <div className="stat-value">{totalCompleted}</div>
          <div className="stat-label">Completed</div>
        </div>

        <div className="stat-box">
          <div className="stat-value">{completionRate}%</div>
          <div className="stat-label">Completion</div>
        </div>

        <div className="stat-box">
          <div className="stat-value">{totalCompanies}</div>
          <div className="stat-label">Companies</div>
        </div>
      </div>

      <div className="alerts">
        {overdueCount > 0 && (
          <div className="alert alert-overdue">
            <span className="alert-icon">⚠️</span>
            <span className="alert-text">
              {overdueCount} overdue TODO{overdueCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {dueSoonCount > 0 && (
          <div className="alert alert-due-soon">
            <span className="alert-icon">📌</span>
            <span className="alert-text">
              {dueSoonCount} due in next 3 days
            </span>
          </div>
        )}
      </div>

      {Object.keys(stats).length > 0 && (
        <div className="company-summary">
          <h4>Company Summary</h4>
          <div className="company-list">
            {Object.entries(stats)
              .sort((a, b) => b[1].active - a[1].active)
              .slice(0, 5)
              .map(([company, data]) => (
                <div key={company} className="company-item">
                  <span className="company-name">{company}</span>
                  <span className="company-stats">
                    {data.active}/{data.total}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      <style>{`
        .dashboard {
          background: white;
        }

        .dashboard h3 {
          margin-bottom: 16px;
          font-size: 16px;
          color: #2c3e50;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .stat-box {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px;
          border-radius: 6px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .stat-box:nth-child(2) {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .stat-box:nth-child(3) {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        .stat-box:nth-child(4) {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 12px;
          opacity: 0.9;
        }

        .alerts {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .alert-overdue {
          background-color: rgba(231, 76, 60, 0.1);
          color: #c0392b;
          border-left: 3px solid #e74c3c;
        }

        .alert-due-soon {
          background-color: rgba(243, 156, 18, 0.1);
          color: #d68910;
          border-left: 3px solid #f39c12;
        }

        .alert-icon {
          font-size: 14px;
        }

        .company-summary {
          padding-top: 16px;
          border-top: 1px solid #e0e0e0;
        }

        .company-summary h4 {
          font-size: 13px;
          color: #2c3e50;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .company-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .company-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background-color: #f9f9f9;
          border-radius: 4px;
          font-size: 12px;
        }

        .company-name {
          color: #2c3e50;
          font-weight: 500;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .company-stats {
          color: #3498db;
          font-weight: 600;
          margin-left: 8px;
        }
      `}</style>
    </div>
  )
}

export default Dashboard
