import { describe, it, expect } from "vitest"
import { parseEml, parseIcs } from "../utils/fileParser"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MINIMAL_EML = `From: Alice Smith <alice@example.com>
To: bob@example.com
Subject: Hello World
Date: Thu, 03 Apr 2026 10:00:00 +0000
Content-Type: text/plain

This is the email body.
It has multiple lines.`

const HTML_EML = `From: sender@example.com
Subject: HTML Email
Date: Fri, 04 Apr 2026 08:00:00 +0000

<html><body><p>Hello <b>World</b></p></body></html>`

const ENCODED_SUBJECT_EML = `From: sender@example.com
Subject: =?utf-8?B?SGVsbG8gV29ybGQ=?=
Date: Sat, 05 Apr 2026 09:00:00 +0000

Body text`

const FOLDED_HEADER_EML = `From: sender@example.com
Subject: This is a very long subject line that has been
 folded across two lines
Date: Sun, 06 Apr 2026 10:00:00 +0000

Short body`

const MINIMAL_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Team Standup
DTSTART:20260403T090000Z
DTEND:20260403T093000Z
DESCRIPTION:Daily team sync
ORGANIZER;CN=Jane Doe:mailto:jane@example.com
LOCATION:Conference Room B
END:VEVENT
END:VCALENDAR`

const DATE_ONLY_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:All-Day Event
DTSTART:20260415
END:VEVENT
END:VCALENDAR`

const FOLDED_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Long Event
DESCRIPTION:This is a very long description that has been folded
 across multiple lines in the ICS file
DTSTART:20260403T100000Z
END:VEVENT
END:VCALENDAR`

const NO_CN_ORGANIZER_ICS = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Meeting
DTSTART:20260403T110000Z
ORGANIZER:mailto:organizer@example.com
END:VEVENT
END:VCALENDAR`

const ESCAPED_ICS = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Meeting\, Team
DESCRIPTION:Bring coffee\\n and donuts\\nSee you there
DTSTART:20260403T120000Z
END:VEVENT
END:VCALENDAR`

// ---------------------------------------------------------------------------
// parseEml tests
// ---------------------------------------------------------------------------

describe("parseEml", () => {
  it("returns type 'email'", () => {
    const result = parseEml(MINIMAL_EML)
    expect(result.type).toBe("email")
  })

  it("extracts subject correctly", () => {
    const result = parseEml(MINIMAL_EML)
    expect(result.subject).toBe("Hello World")
  })

  it("extracts from correctly", () => {
    const result = parseEml(MINIMAL_EML)
    expect(result.from).toBe("Alice Smith <alice@example.com>")
  })

  it("parses date to ISO 8601", () => {
    const result = parseEml(MINIMAL_EML)
    expect(result.date).toBe(new Date("Thu, 03 Apr 2026 10:00:00 +0000").toISOString())
  })

  it("extracts plain text body", () => {
    const result = parseEml(MINIMAL_EML)
    expect(result.body).toContain("This is the email body.")
    expect(result.body).toContain("It has multiple lines.")
  })

  it("returns empty string for location", () => {
    const result = parseEml(MINIMAL_EML)
    expect(result.location).toBe("")
  })

  it("strips HTML tags from body", () => {
    const result = parseEml(HTML_EML)
    expect(result.body).not.toContain("<html>")
    expect(result.body).not.toContain("<b>")
    expect(result.body).toContain("Hello")
    expect(result.body).toContain("World")
  })

  it("decodes base64 encoded subject header", () => {
    const result = parseEml(ENCODED_SUBJECT_EML)
    expect(result.subject).toBe("Hello World")
  })

  it("handles folded header lines", () => {
    const result = parseEml(FOLDED_HEADER_EML)
    expect(result.subject).toContain("This is a very long subject line")
    expect(result.subject).toContain("folded across two lines")
  })

  it("throws when both Subject and From headers are missing", () => {
    const noHeaders = `Content-Type: text/plain\n\nBody only`
    expect(() => parseEml(noHeaders)).toThrow()
  })

  it("uses '(No Subject)' fallback when Subject is present but empty-ish", () => {
    const noSubject = `From: alice@example.com\nDate: Thu, 03 Apr 2026 10:00:00 +0000\n\nBody`
    const result = parseEml(noSubject)
    expect(result.subject).toBe("(No Subject)")
  })
})

// ---------------------------------------------------------------------------
// parseIcs tests
// ---------------------------------------------------------------------------

describe("parseIcs", () => {
  it("returns type 'calendar'", () => {
    const result = parseIcs(MINIMAL_ICS)
    expect(result.type).toBe("calendar")
  })

  it("extracts SUMMARY as subject", () => {
    const result = parseIcs(MINIMAL_ICS)
    expect(result.subject).toBe("Team Standup")
  })

  it("extracts DESCRIPTION as body", () => {
    const result = parseIcs(MINIMAL_ICS)
    expect(result.body).toBe("Daily team sync")
  })

  it("extracts LOCATION", () => {
    const result = parseIcs(MINIMAL_ICS)
    expect(result.location).toBe("Conference Room B")
  })

  it("extracts CN from ORGANIZER property", () => {
    const result = parseIcs(MINIMAL_ICS)
    expect(result.from).toBe("Jane Doe")
  })

  it("falls back to mailto address when no CN in ORGANIZER", () => {
    const result = parseIcs(NO_CN_ORGANIZER_ICS)
    expect(result.from).toBe("organizer@example.com")
  })

  it("parses full datetime DTSTART (YYYYMMDDTHHmmssZ)", () => {
    const result = parseIcs(MINIMAL_ICS)
    const date = new Date(result.date)
    expect(date.getUTCFullYear()).toBe(2026)
    expect(date.getUTCMonth()).toBe(3) // April = 3
    expect(date.getUTCDate()).toBe(3)
    expect(date.getUTCHours()).toBe(9)
    expect(date.getUTCMinutes()).toBe(0)
  })

  it("parses date-only DTSTART (YYYYMMDD)", () => {
    const result = parseIcs(DATE_ONLY_ICS)
    const date = new Date(result.date)
    // Use UTC methods — date-only values are stored as UTC midnight
    expect(date.getUTCFullYear()).toBe(2026)
    expect(date.getUTCMonth()).toBe(3) // April
    expect(date.getUTCDate()).toBe(15)
  })

  it("unfolds continuation lines in DESCRIPTION", () => {
    const result = parseIcs(FOLDED_ICS)
    expect(result.body).toContain("This is a very long description")
    expect(result.body).toContain("across multiple lines")
  })

  it("unescapes ICS special characters in SUMMARY", () => {
    const result = parseIcs(ESCAPED_ICS)
    expect(result.subject).toBe("Meeting, Team")
  })

  it("unescapes \\n in DESCRIPTION as newline", () => {
    const result = parseIcs(ESCAPED_ICS)
    expect(result.body).toContain("\n")
    expect(result.body).toContain("and donuts")
  })

  it("throws when VEVENT block is missing", () => {
    const noEvent = `BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR`
    expect(() => parseIcs(noEvent)).toThrow()
  })

  it("throws when SUMMARY is missing from VEVENT", () => {
    const noSummary = `BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20260403T090000Z\nEND:VEVENT\nEND:VCALENDAR`
    expect(() => parseIcs(noSummary)).toThrow()
  })

  it("returns empty location when LOCATION is absent", () => {
    const result = parseIcs(DATE_ONLY_ICS)
    expect(result.location).toBe("")
  })

  it("returns empty from when ORGANIZER is absent", () => {
    const result = parseIcs(DATE_ONLY_ICS)
    expect(result.from).toBe("")
  })
})
