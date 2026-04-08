/**
 * Pure parsers for .eml (email) and .ics (iCalendar) files.
 * No side effects — safe to test in isolation.
 */

// ---------------------------------------------------------------------------
// EML parser
// ---------------------------------------------------------------------------

export function parseEml(text) {
  const lines = text.split(/\r?\n/)

  // Parse headers — handle folded lines (continuation starts with space/tab)
  const headers = {}
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === "") {
      i++
      break // blank line marks end of headers
    }
    if ((line.startsWith(" ") || line.startsWith("\t")) && Object.keys(headers).length > 0) {
      const lastKey = Object.keys(headers).pop()
      headers[lastKey] += " " + line.trim()
    } else {
      const colonIdx = line.indexOf(":")
      if (colonIdx !== -1) {
        const key = line.substring(0, colonIdx).toLowerCase().trim()
        headers[key] = line.substring(colonIdx + 1).trim()
      }
    }
    i++
  }

  if (!headers["subject"] && !headers["from"]) {
    throw new Error("EML file is missing required headers (Subject and From).")
  }

  const body = lines.slice(i).join("\n").trim()

  let date
  try {
    date = headers["date"] ? new Date(headers["date"]).toISOString() : new Date().toISOString()
  } catch {
    date = new Date().toISOString()
  }

  return {
    type: "email",
    subject: decodeEmailHeader(headers["subject"] || "(No Subject)"),
    from: decodeEmailHeader(headers["from"] || ""),
    date,
    body: stripHtml(body),
    location: "",
  }
}

function decodeEmailHeader(value) {
  // Handle RFC 2047 encoded words: =?charset?encoding?encoded?=
  return value.replace(
    /=\?([^?]+)\?([BbQq])\?([^?]+)\?=/g,
    (_, _charset, encoding, encoded) => {
      try {
        if (encoding.toUpperCase() === "B") {
          return atob(encoded)
        }
        // Q encoding
        return encoded
          .replace(/_/g, " ")
          .replace(/=([0-9A-Fa-f]{2})/g, (__, hex) =>
            String.fromCharCode(parseInt(hex, 16)),
          )
      } catch {
        return encoded
      }
    },
  )
}

function stripHtml(text) {
  return text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// ---------------------------------------------------------------------------
// ICS parser
// ---------------------------------------------------------------------------

export function parseIcs(text) {
  // Unfold continuation lines (lines starting with space/tab are continuations)
  const unfolded = text.replace(/\r?\n[ \t]/g, "")
  const lines = unfolded.split(/\r?\n/).filter(Boolean)

  // Find the first VEVENT block
  const startIdx = lines.findIndex((l) => l === "BEGIN:VEVENT")
  const endIdx = lines.findIndex((l) => l === "END:VEVENT")

  if (startIdx === -1 || endIdx === -1) {
    throw new Error("ICS file does not contain a valid VEVENT block.")
  }

  const eventLines = lines.slice(startIdx + 1, endIdx)
  const props = {}

  for (const line of eventLines) {
    const colonIdx = line.indexOf(":")
    if (colonIdx === -1) continue
    // Key may have parameters: DTSTART;TZID=America/New_York → key is DTSTART
    const rawKey = line.substring(0, colonIdx)
    const key = rawKey.split(";")[0].toUpperCase()
    const value = line.substring(colonIdx + 1)
    props[key] = { raw: rawKey, value }
  }

  if (!props["SUMMARY"]) {
    throw new Error("ICS VEVENT is missing required SUMMARY field.")
  }

  const subject = unescapeIcs(props["SUMMARY"].value)
  const body = props["DESCRIPTION"] ? unescapeIcs(props["DESCRIPTION"].value) : ""
  const location = props["LOCATION"] ? unescapeIcs(props["LOCATION"].value) : ""
  const date = props["DTSTART"] ? parseIcsDate(props["DTSTART"].value) : new Date().toISOString()

  // ORGANIZER can be:
  //   ORGANIZER;CN="Jane Doe":mailto:jane@example.com
  //   ORGANIZER:mailto:jane@example.com
  let from = ""
  if (props["ORGANIZER"]) {
    const rawKey = props["ORGANIZER"].raw
    const cnMatch = rawKey.match(/CN=["']?([^"';:]+)["']?/i)
    if (cnMatch) {
      from = cnMatch[1].trim()
    } else {
      from = props["ORGANIZER"].value.replace(/^mailto:/i, "").trim()
    }
  }

  return {
    type: "calendar",
    subject,
    from,
    date,
    body,
    location,
  }
}

function unescapeIcs(value) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
}

function parseIcsDate(value) {
  const isUtc = value.endsWith("Z")
  const clean = value.replace(/Z$/, "")

  if (clean.length === 8) {
    // YYYYMMDD — date only, treat as UTC midnight so behaviour is timezone-independent
    return new Date(
      `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T00:00:00Z`,
    ).toISOString()
  }

  if (clean.length >= 15) {
    // YYYYMMDDTHHmmss — re-attach Z for UTC values so the hour is preserved
    const suffix = isUtc ? "Z" : ""
    return new Date(
      `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}` +
        `T${clean.slice(9, 11)}:${clean.slice(11, 13)}:${clean.slice(13, 15)}${suffix}`,
    ).toISOString()
  }

  // Fallback
  return new Date(value).toISOString()
}
