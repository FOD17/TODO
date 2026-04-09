import React from "react"
import MainFeed from "./MainFeed"
import AudioTab from "./AudioTab"
import EmailsTab from "./EmailsTab"

const TABS = [
  { id: "tasks", label: "Tasks" },
  { id: "audio", label: "Audio" },
  { id: "emails", label: "Emails" },
]

function CompanyTabs({
  selectedCompany,
  activeTab,
  onTabChange,
  // MainFeed props
  todos,
  onComplete,
  onDelete,
  onEdit,
  onClick,
  onSave,
  onAdd,
  showCompleted,
  onShowCompletedChange,
  labels,
  companies,
  accountExecutives,
  companyAssignments,
  // AudioTab props
  audioMessages,
  onAddAudioMessage,
  onDeleteAudioMessage,
  // EmailsTab props
  emails,
  onAddEmails,
  onDeleteEmails,
}) {
  return (
    <div className="company-tabs-root">
      {/* Tab bar */}
      <div className="tab-bar" role="tablist" aria-label="Company sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTab === "tasks" && (
          <div id="tabpanel-tasks" role="tabpanel" aria-labelledby="tab-tasks" className="tab-content-inner">
            <MainFeed
              todos={todos}
              onComplete={onComplete}
              onDelete={onDelete}
              onEdit={onEdit}
              onClick={onClick}
              onSave={onSave}
              onAdd={onAdd}
              selectedCompany={selectedCompany}
              showCompleted={showCompleted}
              onShowCompletedChange={onShowCompletedChange}
              labels={labels}
              companies={companies}
              accountExecutives={accountExecutives}
              companyAssignments={companyAssignments}
            />
          </div>
        )}

        {activeTab === "audio" && (
          <div id="tabpanel-audio" role="tabpanel" aria-labelledby="tab-audio" className="tab-inner">
            <AudioTab
              company={selectedCompany}
              audioMessages={audioMessages}
              onAddAudioMessage={onAddAudioMessage}
              onDeleteAudioMessage={onDeleteAudioMessage}
            />
          </div>
        )}

        {activeTab === "emails" && (
          <div id="tabpanel-emails" role="tabpanel" aria-labelledby="tab-emails" className="tab-inner">
            <EmailsTab
              company={selectedCompany}
              emails={emails}
              onAddEmails={onAddEmails}
              onDeleteEmails={onDeleteEmails}
            />
          </div>
        )}
      </div>

      <style>{`
        .company-tabs-root {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }

        .tab-bar {
          display: flex;
          gap: 2px;
          padding: 12px 24px 0;
          border-bottom: 1px solid var(--border);
          background: var(--background);
          flex-shrink: 0;
        }

        .tab-btn {
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 8px 18px 10px;
          font-size: calc(14px * var(--font-scale, 1));
          font-weight: 500;
          cursor: pointer;
          color: var(--text-muted);
          transition: all 0.15s;
          border-radius: 6px 6px 0 0;
          margin-bottom: -1px;
        }

        .tab-btn:hover {
          color: var(--text);
          background: rgba(52,152,219,0.06);
        }

        .tab-btn.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
          font-weight: 600;
          background: transparent;
        }

        .tab-content {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .tab-content-inner {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* MainFeed already handles its own scroll; audio/emails need theirs */
        .tab-inner {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          max-width: 700px;
          margin: 0 auto;
          width: 100%;
        }

        .tab-inner::-webkit-scrollbar {
          width: 6px;
        }

        .tab-inner::-webkit-scrollbar-track {
          background: transparent;
        }

        .tab-inner::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 3px;
        }

        @media (max-width: 768px) {
          .tab-bar {
            padding: 10px 16px 0;
          }

          .tab-btn {
            padding: 6px 12px 8px;
            font-size: calc(13px * var(--font-scale, 1));
          }

          .tab-inner {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  )
}

export default CompanyTabs
