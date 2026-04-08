/**
 * Export utilities — pure functions that build export payloads.
 * All formats are returned as strings (or objects for JSON).
 */

// ---------------------------------------------------------------------------
// App JSON — full fidelity, re-importable
// ---------------------------------------------------------------------------
export function buildJsonExport({ todos, tags, emails }) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      todos,
      tags,
      // Audio messages omitted: base64 blobs are too large for text export
      emails,
    },
    null,
    2,
  )
}

// ---------------------------------------------------------------------------
// CSV — todos only (compatible with Google Sheets / Excel)
// ---------------------------------------------------------------------------
export function buildCsvExport({ todos }) {
  const csvRow = (t) => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`
    return [
      esc(t.id),
      esc(t.message),
      esc(t.date ? t.date.slice(0, 10) : ""),
      esc(t.company || ""),
      esc(t.accountRep || ""),
      esc((t.names || []).join(";")),
      esc((t.labels || []).join(";")),
      esc(t.description || ""),
      esc(t.completed ? "Yes" : "No"),
      esc(t.createdAt || ""),
      esc((t.subtasks || []).map((s) => `${s.completed ? "[x]" : "[ ]"} ${s.message}`).join(" | ")),
    ].join(",")
  }

  const header =
    "ID,Task,Due Date,Company,Account Rep,People,Labels,Description,Completed,Created,Subtasks"
  const active = (todos.active || []).map(csvRow)
  const completed = (todos.completed || []).map(csvRow)
  return [header, ...active, ...completed].join("\r\n")
}

// ---------------------------------------------------------------------------
// Markdown — human-readable todo list
// ---------------------------------------------------------------------------
export function buildMarkdownExport({ todos, tags }) {
  const lines = [
    `# TODO Tracker Export`,
    `*Exported: ${new Date().toLocaleString()}*`,
    "",
  ]

  const allCompanies = Array.from(
    new Set([
      ...tags.companies || [],
      ...[...todos.active, ...todos.completed].map((t) => t.company).filter(Boolean),
    ]),
  ).sort()

  // Group by company
  const byCompany = {}
  ;[...todos.active, ...todos.completed].forEach((t) => {
    const key = t.company || "Personal / Unassigned"
    if (!byCompany[key]) byCompany[key] = []
    byCompany[key].push(t)
  })

  Object.entries(byCompany)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([company, items]) => {
      lines.push(`## ${company}`, "")
      items.forEach((t) => {
        const check = t.completed ? "x" : " "
        const due = t.date ? ` _(due ${t.date.slice(0, 10)})_` : ""
        lines.push(`- [${check}] **${t.message}**${due}`)
        if (t.description) lines.push(`  > ${t.description}`)
        if (t.labels?.length) lines.push(`  Labels: ${t.labels.join(", ")}`)
        ;(t.subtasks || []).forEach((s) => {
          lines.push(`  - [${s.completed ? "x" : " "}] ${s.message}`)
        })
        ;(t.notes || []).forEach((n) => {
          lines.push(`  📝 ${n.text}`)
        })
      })
      lines.push("")
    })

  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Write to File System Access API directory handle
// ---------------------------------------------------------------------------
export async function writeToDirectory(dirHandle, filename, content) {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

// ---------------------------------------------------------------------------
// Trigger browser download (fallback when no directory handle)
// ---------------------------------------------------------------------------
export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Build filename with timestamp
// ---------------------------------------------------------------------------
export function buildFilename(format) {
  const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")
  const ext = { json: "json", csv: "csv", markdown: "md" }[format] || "json"
  return `todo-tracker-${ts}.${ext}`
}
