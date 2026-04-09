import React, { useState, useRef } from "react"
import { parseEml, parseIcs } from "../utils/fileParser"

function EmailsTab({ company, emails, onAddEmails, onDeleteEmails }) {
  const [selected, setSelected] = useState(new Set())
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const fileInputRef = useRef(null)

  // Filter by company then by date range
  const companyFiltered = emails.filter(
    (e) => company === "All" || e.company === company,
  )

  const visibleEmails = companyFiltered.filter((e) => {
    const d = new Date(e.date)
    if (fromDate && d < new Date(fromDate + "T00:00:00Z")) return false
    if (toDate && d > new Date(toDate + "T23:59:59Z")) return false
    return true
  })

  // -------------------------------------------------------------------------
  // File processing
  // -------------------------------------------------------------------------

  const processFiles = (files) => {
    setUploadError("")
    const results = []
    let pending = 0

    for (const file of files) {
      const ext = file.name.split(".").pop().toLowerCase()
      if (!["eml", "ics"].includes(ext)) continue
      pending++

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target.result
          const parsed = ext === "ics" ? parseIcs(text) : parseEml(text)
          results.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            ...parsed,
            company: company === "All" ? "" : company,
            fileName: file.name,
          })
        } catch (err) {
          console.error(`[EmailsTab] Failed to parse ${file.name}:`, err)
          setUploadError((prev) =>
            prev ? `${prev}\n${file.name}: ${err.message}` : `${file.name}: ${err.message}`,
          )
        }
        pending--
        if (pending === 0 && results.length > 0) {
          onAddEmails(results)
        }
      }
      reader.onerror = () => {
        console.error(`[EmailsTab] FileReader error reading ${file.name}`)
        setUploadError((prev) =>
          prev ? `${prev}\n${file.name}: could not read file` : `${file.name}: could not read file`,
        )
        pending--
        if (pending === 0 && results.length > 0) onAddEmails(results)
      }
      reader.readAsText(file)
    }
  }

  const handleFileInput = (e) => {
    processFiles(Array.from(e.target.files))
    e.target.value = ""
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    processFiles(Array.from(e.dataTransfer.files))
  }

  // -------------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------------

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(visibleEmails.map((e) => e.id)))
  const clearSelection = () => setSelected(new Set())

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  const handleDeleteSelected = () => {
    if (selected.size === 0) return
    onDeleteEmails(Array.from(selected))
    setSelected(new Set())
  }

  // -------------------------------------------------------------------------
  // PDF Export
  // -------------------------------------------------------------------------

  const handleExportPdf = () => {
    const toExport = visibleEmails.filter((e) => selected.has(e.id))
    if (toExport.length === 0) return

    const html = buildPrintHtml(toExport)
    const win = window.open("", "_blank")
    if (!win) {
      console.error("[EmailsTab] Could not open print window — popup may be blocked")
      return
    }
    try {
      win.document.write(html)
      win.document.close()
      win.focus()
      win.print()
    } catch (err) {
      console.error("[EmailsTab] Print failed:", err)
    }
  }

  const buildPrintHtml = (items) => {
    const rows = items
      .map(
        (item) => `
        <div class="item">
          <div class="item-header">
            <span class="type-badge">${item.type === "calendar" ? "📅 Calendar" : "📧 Email"}</span>
            <h2 class="subject">${escHtml(item.subject)}</h2>
            <div class="meta">
              ${item.from ? `<span>From: ${escHtml(item.from)}</span>` : ""}
              ${item.location ? `<span>Location: ${escHtml(item.location)}</span>` : ""}
              <span>Date: ${new Date(item.date).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}</span>
              ${item.company ? `<span>Company: ${escHtml(item.company)}</span>` : ""}
              <span class="file-name">File: ${escHtml(item.fileName)}</span>
            </div>
          </div>
          ${item.body ? `<div class="body"><pre>${escHtml(item.body)}</pre></div>` : ""}
        </div>`,
      )
      .join('<div class="page-break"></div>')

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Email Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 24px; color: #222; }
    h1 { font-size: 22px; margin-bottom: 24px; color: #1a1a1a; }
    .item { margin-bottom: 32px; }
    .item-header { border-bottom: 2px solid #e0e0e0; padding-bottom: 12px; margin-bottom: 12px; }
    .type-badge { font-size: 12px; background: #f0f4ff; color: #3366cc; padding: 2px 8px; border-radius: 10px; }
    .subject { margin: 8px 0 6px; font-size: 18px; }
    .meta { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #555; }
    .file-name { color: #999; font-size: 12px; }
    .body pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 13px; color: #333; background: #f9f9f9; padding: 12px; border-radius: 6px; border: 1px solid #e8e8e8; }
    .page-break { page-break-after: always; }
    @media print { .page-break { display: block; break-after: page; } }
  </style>
</head>
<body>
  <h1>Email Export — ${items.length} item${items.length !== 1 ? "s" : ""}</h1>
  ${rows}
</body>
</html>`
  }

  const escHtml = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")

  // -------------------------------------------------------------------------
  // Formatting helpers
  // -------------------------------------------------------------------------

  const formatDate = (iso) =>
    new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const truncate = (text, maxLen = 120) => {
    if (!text) return ""
    return text.length > maxLen ? text.slice(0, maxLen) + "…" : text
  }

  const selectedCount = [...selected].filter((id) =>
    visibleEmails.some((e) => e.id === id),
  ).length

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="emails-tab">
      {/* Upload zone */}
      <div
        className={`upload-zone ${dragOver ? "drag-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".eml,.ics"
          multiple
          style={{ display: "none" }}
          onChange={handleFileInput}
        />
        <span className="upload-icon">📂</span>
        <span className="upload-label">
          Drop .eml or .ics files here, or click to upload
        </span>
      </div>

      {uploadError && (
        <div className="upload-error">
          <strong>Upload errors:</strong>
          <pre>{uploadError}</pre>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="date-range">
            <label className="range-label">From</label>
            <input
              type="date"
              className="date-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <label className="range-label">To</label>
            <input
              type="date"
              className="date-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
            {(fromDate || toDate) && (
              <button
                className="clear-range-btn"
                onClick={() => {
                  setFromDate("")
                  setToDate("")
                }}
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        <div className="toolbar-right">
          <button className="tool-btn" onClick={selectAll} disabled={visibleEmails.length === 0}>
            Select all
          </button>
          <button className="tool-btn" onClick={clearSelection} disabled={selectedCount === 0}>
            Clear
          </button>
          <button
            className="tool-btn export-btn"
            onClick={handleExportPdf}
            disabled={selectedCount === 0}
            title="Export selected items as PDF"
          >
            Export PDF ({selectedCount})
          </button>
          <button
            className="tool-btn delete-btn"
            onClick={handleDeleteSelected}
            disabled={selectedCount === 0}
          >
            Delete ({selectedCount})
          </button>
        </div>
      </div>

      {/* Email list */}
      <div className="email-list">
        {visibleEmails.length === 0 ? (
          <div className="emails-empty">
            <div className="empty-icon-lg">📭</div>
            <p>
              {companyFiltered.length > 0
                ? "No items match the selected date range."
                : `No emails or calendar items for ${company === "All" ? "any company" : company} yet.`}
            </p>
          </div>
        ) : (
          visibleEmails.map((item) => (
            <div
              key={item.id}
              className={`email-row ${selected.has(item.id) ? "selected" : ""}`}
              onClick={() => toggleSelect(item.id)}
            >
              <input
                type="checkbox"
                className="email-check"
                checked={selected.has(item.id)}
                onChange={() => toggleSelect(item.id)}
                onClick={(e) => e.stopPropagation()}
              />

              <span className="type-icon">
                {item.type === "calendar" ? "📅" : "📧"}
              </span>

              <div className="email-content">
                <div className="email-subject">{item.subject}</div>
                <div className="email-meta">
                  {item.from && <span className="email-from">{item.from}</span>}
                  <span className="email-date">{formatDate(item.date)}</span>
                  {item.location && (
                    <span className="email-location">📍 {item.location}</span>
                  )}
                  {item.company && (
                    <span className="email-company">🏢 {item.company}</span>
                  )}
                  <span className="email-filename">{item.fileName}</span>
                </div>
                {item.body && (
                  <p className="email-preview">{truncate(item.body)}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .emails-tab {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Upload zone */
        .upload-zone {
          border: 2px dashed var(--border);
          border-radius: 12px;
          padding: 28px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          background: var(--card);
        }

        .upload-zone:hover,
        .upload-zone.drag-over {
          border-color: var(--primary);
          background: rgba(52,152,219,0.04);
        }

        .upload-icon {
          font-size: 32px;
        }

        .upload-label {
          font-size: 14px;
          color: var(--text-muted);
        }

        .upload-error {
          background: rgba(231,76,60,0.08);
          border: 1px solid rgba(231,76,60,0.3);
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 13px;
          color: #c0392b;
        }

        .upload-error pre {
          margin: 6px 0 0;
          white-space: pre-wrap;
          font-family: inherit;
        }

        /* Toolbar */
        .toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: space-between;
        }

        .toolbar-left,
        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .date-range {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .range-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .date-input {
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 5px 8px;
          font-size: 12px;
          background: var(--card);
          color: var(--text);
          outline: none;
        }

        .date-input:focus {
          border-color: var(--primary);
        }

        .clear-range-btn {
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 12px;
          cursor: pointer;
          color: var(--text-muted);
        }

        .clear-range-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .tool-btn {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          color: var(--text);
          transition: all 0.15s;
          white-space: nowrap;
        }

        .tool-btn:disabled {
          opacity: 0.4;
          cursor: default;
        }

        .tool-btn:not(:disabled):hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .tool-btn.export-btn:not(:disabled) {
          background: var(--primary);
          border-color: var(--primary);
          color: #fff;
        }

        .tool-btn.export-btn:not(:disabled):hover {
          opacity: 0.85;
          color: #fff;
        }

        .tool-btn.delete-btn:not(:disabled):hover {
          border-color: #e74c3c;
          color: #e74c3c;
        }

        /* Email list */
        .email-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .emails-empty {
          text-align: center;
          padding: 48px 20px;
          color: var(--text-muted);
        }

        .empty-icon-lg {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.5;
        }

        .email-row {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .email-row:hover {
          border-color: var(--primary);
        }

        .email-row.selected {
          border-color: var(--primary);
          background: rgba(52,152,219,0.06);
        }

        .email-check {
          margin-top: 3px;
          flex-shrink: 0;
          cursor: pointer;
          width: 16px;
          height: 16px;
          accent-color: var(--primary);
        }

        .type-icon {
          font-size: 18px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .email-content {
          flex: 1;
          min-width: 0;
        }

        .email-subject {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 4px;
          word-break: break-word;
        }

        .email-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .email-from {
          color: var(--text);
          font-weight: 500;
        }

        .email-date {
          color: #2980b9;
        }

        .email-company {
          color: #8e44ad;
        }

        .email-filename {
          color: var(--text-muted);
          font-style: italic;
        }

        .email-preview {
          margin: 0;
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.5;
          word-break: break-word;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}

export default EmailsTab
