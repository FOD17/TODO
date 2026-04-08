import React, { useState } from "react"

function Sidebar({
  allCompanies,
  selectedCompany,
  onSelectCompany,
  stats,
  tags,
  onTagsChange,
  companyTypes = {},
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState({})
  const [assignDropdown, setAssignDropdown] = useState(null)
  const [draggedCompany, setDraggedCompany] = useState(null)
  const [dragOverTarget, setDragOverTarget] = useState(null)

  const accountExecutives = tags.accountExecutives || []
  const companyAssignments = tags.companyAssignments || {}

  // Group companies by AE
  const assignedSet = new Set()
  const aeGroups = accountExecutives.map((ae) => {
    const companies = allCompanies.filter(
      (c) => companyAssignments[c] === ae.id,
    )
    companies.forEach((c) => assignedSet.add(c))
    return { ae, companies }
  })
  const unassignedCompanies = allCompanies.filter((c) => !assignedSet.has(c))
  const hasAEGroups = aeGroups.some((g) => g.companies.length > 0)

  const toggleGroup = (id) => {
    setCollapsedGroups((prev) => ({ ...prev, [id]: !prev[id] }))
  }
  const isGroupExpanded = (id) => !collapsedGroups[id]

  const handleAssign = (company, aeId) => {
    const newAssignments = { ...(tags.companyAssignments || {}) }
    if (aeId === null) {
      delete newAssignments[company]
    } else {
      newAssignments[company] = aeId
    }
    onTagsChange({ ...tags, companyAssignments: newAssignments })
    setAssignDropdown(null)
  }

  // --- Drag and drop ---
  const handleDragStart = (e, company) => {
    setDraggedCompany(company)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", company)
  }

  const handleDragEnd = () => {
    setDraggedCompany(null)
    setDragOverTarget(null)
  }

  const handleDragOver = (e, targetId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragOverTarget !== targetId) {
      setDragOverTarget(targetId)
    }
  }

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverTarget(null)
    }
  }

  const handleDrop = (e, aeId) => {
    e.preventDefault()
    if (draggedCompany) {
      handleAssign(draggedCompany, aeId)
    }
    setDraggedCompany(null)
    setDragOverTarget(null)
  }

  // --- Helpers ---
  const getInitials = (name) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  const getCompanyCount = (company) => stats?.[company] || 0

  const getAETotalCount = (ae) =>
    allCompanies
      .filter((c) => companyAssignments[c] === ae.id)
      .reduce((sum, c) => sum + (stats?.[c] || 0), 0)

  // --- Render helpers ---
  const renderCompanyItem = (company, indented = false) => {
    const isDragging = draggedCompany === company
    const type = companyTypes[company] || "company"
    const isVendor = type === "vendor"
    return (
      <div
        key={company}
        className={`company-row ${indented ? "indented" : ""} ${isDragging ? "dragging" : ""}`}
        draggable={!collapsed}
        onDragStart={(e) => handleDragStart(e, company)}
        onDragEnd={handleDragEnd}
      >
        <button
          className={`nav-item ${selectedCompany === company ? "active" : ""} ${isVendor ? "nav-item-vendor" : "nav-item-company"}`}
          onClick={() => onSelectCompany(company)}
          aria-current={selectedCompany === company ? "page" : undefined}
          title={
            collapsed
              ? `${company} (${getCompanyCount(company)}) — ${type}`
              : undefined
          }
        >
          <span className="nav-icon" aria-hidden="true">{isVendor ? "🔧" : "🏢"}</span>
          {!collapsed && (
            <>
              <span className="nav-label">{company}</span>
              <span className={`type-indicator ${type}`} aria-label={type} />
              <span className="badge">{getCompanyCount(company)}</span>
            </>
          )}
          {collapsed && (
            <span className="badge-collapsed">
              {getCompanyCount(company)}
            </span>
          )}
        </button>
        {!collapsed && accountExecutives.length > 0 && (
          <button
            className="assign-btn"
            onClick={(e) => {
              e.stopPropagation()
              setAssignDropdown(
                assignDropdown === company ? null : company,
              )
            }}
            title="Move to Account Executive"
          >
            ⋮
          </button>
        )}
        {assignDropdown === company && (
          <div className="assign-menu">
            <div className="assign-menu-title">Move to...</div>
            <div
              className={`assign-option ${!companyAssignments[company] ? "current" : ""}`}
              onClick={() => handleAssign(company, null)}
            >
              — Unassigned
            </div>
            {accountExecutives.map((ae) => (
              <div
                key={ae.id}
                className={`assign-option ${companyAssignments[company] === ae.id ? "current" : ""}`}
                onClick={() => handleAssign(company, ae.id)}
              >
                👤 {ae.name}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {assignDropdown && (
        <div
          className="assign-overlay"
          onClick={() => setAssignDropdown(null)}
        />
      )}

      <div className="sidebar-header">
        {!collapsed && <h2>📋 Projects</h2>}
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="projects-nav" aria-label="Project navigation">
        {/* Personal */}
        <button
          className={`nav-item nav-item-personal ${selectedCompany === "Personal" ? "active" : ""}`}
          onClick={() => onSelectCompany("Personal")}
          aria-current={selectedCompany === "Personal" ? "page" : undefined}
          title={collapsed ? `Personal (${stats?.["Personal"] || 0})` : undefined}
        >
          <span className="nav-icon" aria-hidden="true">👤</span>
          {!collapsed && (
            <>
              <span className="nav-label">Personal</span>
              <span className="badge">{stats?.["Personal"] || 0}</span>
            </>
          )}
          {collapsed && <span className="badge-collapsed">{stats?.["Personal"] || 0}</span>}
        </button>

        {/* All Tasks */}
        <button
          className={`nav-item ${selectedCompany === "All" ? "active" : ""}`}
          onClick={() => onSelectCompany("All")}
          aria-current={selectedCompany === "All" ? "page" : undefined}
          title={collapsed ? `All Tasks (${stats?.total || 0})` : undefined}
        >
          <span className="nav-icon" aria-hidden="true">🎯</span>
          {!collapsed && (
            <>
              <span className="nav-label">All Tasks</span>
              <span className="badge">{stats?.total || 0}</span>
            </>
          )}
          {collapsed && (
            <span className="badge-collapsed">{stats?.total || 0}</span>
          )}
        </button>

        <div className="nav-divider" />

        {/* AE-grouped companies */}
        {aeGroups.map(({ ae, companies }) => (
          <div
            key={ae.id}
            className={`ae-group ${dragOverTarget === ae.id ? "drag-over" : ""}`}
            onDragOver={(e) => handleDragOver(e, ae.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, ae.id)}
          >
            <button
              className="ae-header"
              onClick={() => {
                if (!collapsed) toggleGroup(ae.id)
              }}
              title={
                collapsed
                  ? `${ae.name} (${getAETotalCount(ae)})`
                  : undefined
              }
            >
              <span className="ae-initials">
                {getInitials(ae.name)}
              </span>
              {!collapsed && (
                <>
                  <span className="nav-label">{ae.name}</span>
                  <span className="badge ae-badge">
                    {getAETotalCount(ae)}
                  </span>
                  <span
                    className={`chevron ${isGroupExpanded(ae.id) ? "expanded" : ""}`}
                  >
                    ›
                  </span>
                </>
              )}
              {collapsed && (
                <span className="badge-collapsed">
                  {getAETotalCount(ae)}
                </span>
              )}
            </button>
            {!collapsed && isGroupExpanded(ae.id) && (
              <div className="ae-companies">
                {companies.length > 0 ? (
                  companies.map((c) => renderCompanyItem(c, true))
                ) : (
                  <div className="empty-group">
                    Drag a company here
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Unassigned companies */}
        {unassignedCompanies.length > 0 && (
          <div
            className={`unassigned-section ${dragOverTarget === "unassigned" ? "drag-over" : ""}`}
            onDragOver={(e) => handleDragOver(e, "unassigned")}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, null)}
          >
            {hasAEGroups && <div className="nav-divider" />}
            {!collapsed && hasAEGroups && (
              <div className="section-label">Unassigned</div>
            )}
            {unassignedCompanies.map((c) => renderCompanyItem(c))}
          </div>
        )}

        {/* Drop zone when all companies are assigned */}
        {unassignedCompanies.length === 0 &&
          draggedCompany &&
          hasAEGroups && (
            <div
              className={`unassigned-drop-zone ${dragOverTarget === "unassigned" ? "drag-over" : ""}`}
              onDragOver={(e) => handleDragOver(e, "unassigned")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, null)}
            >
              <div className="nav-divider" />
              <div className="drop-zone-label">Drop here to unassign</div>
            </div>
          )}
      </nav>

      <div className="sidebar-footer">
        <div className={`stats-card ${collapsed ? "stats-collapsed" : ""}`}>
          <div className="stat-item">
            <span className="stat-label">Today</span>
            <span className="stat-value">{stats?.today || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Overdue</span>
            <span className="stat-value urgent">
              {stats?.overdue || 0}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        /* ===== Sidebar shell ===== */
        .sidebar {
          width: 280px;
          min-width: 280px;
          background: var(--card);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
          overflow: hidden;
          padding: 0;
          transition: width 0.2s ease, min-width 0.2s ease;
        }

        .sidebar.collapsed {
          width: 60px;
          min-width: 60px;
        }

        /* ===== Header ===== */
        .sidebar-header {
          padding: 20px 16px 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .sidebar.collapsed .sidebar-header {
          padding: 16px 8px;
          justify-content: center;
        }

        .sidebar-header h2 {
          margin: 0;
          font-size: 20px;
          color: var(--text);
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
        }

        .collapse-btn {
          background: none;
          border: 1px solid var(--border);
          border-radius: 6px;
          cursor: pointer;
          color: var(--text-muted);
          font-size: 16px;
          font-weight: 700;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
          font-family: inherit;
        }

        .collapse-btn:hover {
          background: var(--background);
          color: var(--text);
          border-color: var(--primary);
        }

        .collapse-btn:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        .nav-item:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: -2px;
        }

        /* ===== Nav ===== */
        .projects-nav {
          flex: 1;
          padding: 12px 8px;
          overflow-y: auto;
        }

        .sidebar.collapsed .projects-nav {
          padding: 8px 4px;
        }

        /* ===== Nav items ===== */
        .nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          color: var(--text);
          font-size: 14px;
          font-weight: 500;
          transition: all 0.15s;
          margin-bottom: 2px;
        }

        .sidebar.collapsed .nav-item {
          flex-direction: column;
          gap: 2px;
          padding: 8px 4px;
          justify-content: center;
          text-align: center;
        }

        .nav-item:hover {
          background: var(--background);
        }

        .nav-item.active {
          background: var(--primary);
          color: white;
        }

        /* Personal — subtle purple tint */
        .nav-item-personal:not(.active) {
          border-left: 3px solid #9b59b6;
        }
        .nav-item-personal.active {
          background: #9b59b6;
        }

        /* Vendor — orange left accent */
        .nav-item-vendor:not(.active) {
          border-left: 3px solid #e67e22;
        }
        .nav-item-vendor.active {
          background: #e67e22;
        }

        /* Type indicator dot in nav row */
        .type-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
          opacity: 0.7;
        }
        .type-indicator.vendor { background: #e67e22; }
        .type-indicator.company { background: #3498db; }

        .nav-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .nav-label {
          flex: 1;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ===== Badges ===== */
        .badge {
          background: var(--background);
          color: var(--text);
          font-size: 12px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 10px;
          flex-shrink: 0;
          min-width: 22px;
          text-align: center;
        }

        .nav-item.active .badge {
          background: rgba(255, 255, 255, 0.25);
          color: white;
        }

        .badge-collapsed {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          line-height: 1;
        }

        .nav-item.active .badge-collapsed {
          color: rgba(255, 255, 255, 0.8);
        }

        .nav-divider {
          height: 1px;
          background: var(--border);
          margin: 8px 4px;
        }

        /* ===== Company row (nav-item + three-dot menu) ===== */
        .company-row {
          position: relative;
          display: flex;
          align-items: center;
        }

        .company-row[draggable="true"] {
          cursor: grab;
        }

        .company-row[draggable="true"]:active {
          cursor: grabbing;
        }

        .company-row .nav-item {
          flex: 1;
          min-width: 0;
          cursor: pointer;
        }

        .company-row.dragging {
          opacity: 0.35;
        }

        /* ===== Tree indentation (VSCode style) ===== */
        .ae-companies {
          position: relative;
          margin-left: 24px;
        }

        .company-row.indented {
          position: relative;
          padding-left: 16px;
        }

        /* Vertical indent guide */
        .company-row.indented::before {
          content: "";
          position: absolute;
          left: 5px;
          top: 0;
          bottom: 0;
          width: 1px;
          background: var(--border);
          opacity: 0.7;
        }

        /* Horizontal connector tick */
        .company-row.indented::after {
          content: "";
          position: absolute;
          left: 5px;
          top: 50%;
          width: 10px;
          height: 1px;
          background: var(--border);
          opacity: 0.7;
        }

        /* Last child: stop vertical line at center (L-shape) */
        .company-row.indented:last-child::before {
          bottom: 50%;
        }

        .sidebar.collapsed .ae-companies {
          margin-left: 0;
        }

        .sidebar.collapsed .company-row.indented {
          padding-left: 0;
        }

        .sidebar.collapsed .company-row.indented::before,
        .sidebar.collapsed .company-row.indented::after {
          display: none;
        }

        /* ===== Vertical three-dot assign button ===== */
        .assign-btn {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          font-size: 16px;
          padding: 2px 4px;
          border-radius: 4px;
          opacity: 0;
          transition: all 0.15s;
          line-height: 1;
          letter-spacing: 0;
        }

        .company-row:hover .assign-btn {
          opacity: 1;
        }

        .assign-btn:hover {
          background: var(--background);
          color: var(--text);
        }

        /* ===== Assign dropdown menu ===== */
        .assign-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 99;
        }

        .assign-menu {
          position: absolute;
          left: 100%;
          top: 0;
          margin-left: 4px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
          z-index: 100;
          min-width: 190px;
          padding: 4px;
          white-space: nowrap;
        }

        .assign-menu-title {
          padding: 6px 12px 4px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .assign-option {
          padding: 8px 12px;
          cursor: pointer;
          border-radius: 6px;
          font-size: 13px;
          color: var(--text);
          transition: background 0.1s;
        }

        .assign-option:hover {
          background: var(--background);
        }

        .assign-option.current {
          color: var(--primary);
          font-weight: 600;
        }

        /* ===== AE Groups ===== */
        .ae-group {
          margin-bottom: 2px;
          border-radius: 8px;
          transition: background 0.15s;
        }

        .ae-group.drag-over {
          background: color-mix(in srgb, var(--primary) 12%, transparent);
        }

        .ae-header {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: transparent;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          transition: all 0.15s;
        }

        .sidebar.collapsed .ae-header {
          flex-direction: column;
          gap: 2px;
          padding: 8px 4px;
          justify-content: center;
        }

        .ae-header:hover {
          background: var(--background);
        }

        .ae-initials {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .ae-badge {
          font-size: 11px;
        }

        .chevron {
          font-size: 18px;
          font-weight: 700;
          transition: transform 0.2s;
          color: var(--text-muted);
          flex-shrink: 0;
          line-height: 1;
        }

        .chevron.expanded {
          transform: rotate(90deg);
        }

        .empty-group {
          padding: 6px 16px 8px 22px;
          font-size: 12px;
          color: var(--text-muted);
          font-style: italic;
        }

        .section-label {
          padding: 8px 12px 4px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ===== Unassigned drop targets ===== */
        .unassigned-section {
          border-radius: 8px;
          transition: background 0.15s;
        }

        .unassigned-section.drag-over {
          background: color-mix(in srgb, var(--primary) 8%, transparent);
        }

        .unassigned-drop-zone {
          border-radius: 8px;
          padding: 4px;
          transition: background 0.15s;
        }

        .unassigned-drop-zone.drag-over {
          background: color-mix(in srgb, var(--primary) 8%, transparent);
        }

        .drop-zone-label {
          padding: 10px 12px;
          font-size: 12px;
          color: var(--text-muted);
          text-align: center;
          border: 1px dashed var(--border);
          border-radius: 8px;
        }

        .drag-over .drop-zone-label {
          border-color: var(--primary);
          color: var(--primary);
        }

        /* ===== Footer stats ===== */
        .sidebar-footer {
          padding: 12px 8px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }

        .stats-card {
          background: var(--background);
          border-radius: 8px;
          padding: 12px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .stats-card.stats-collapsed {
          grid-template-columns: 1fr;
          padding: 8px 6px;
          gap: 8px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: center;
        }

        .stat-label {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
        }

        .stats-collapsed .stat-label {
          font-size: 9px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--primary);
        }

        .stats-collapsed .stat-value {
          font-size: 18px;
        }

        .stat-value.urgent {
          color: #e74c3c;
        }

        /* ===== Scrollbar ===== */
        .projects-nav::-webkit-scrollbar {
          width: 6px;
        }

        .projects-nav::-webkit-scrollbar-track {
          background: transparent;
        }

        .projects-nav::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 3px;
        }

        .projects-nav::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }

        /* ===== Responsive ===== */
        @media (max-width: 768px) {
          .sidebar {
            width: 0;
            min-width: 0;
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
            min-width: 280px;
          }
        }
      `}</style>
    </aside>
  )
}

export default Sidebar
