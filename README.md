# Corporate TODO Tracker

A modern Electron + React desktop application for managing technical information across multiple companies — with a **PostgreSQL source-of-truth database** and an automatic **localStorage backup** that keeps your data safe even when the database is temporarily unreachable.

---

## Table of Contents

1. [Key Features](#key-features)
2. [Architecture Overview](#architecture-overview)
3. [Data Storage: PostgreSQL + localStorage](#data-storage-postgresql--localstorage)
4. [Sync & Resilience](#sync--resilience)
5. [Getting Started](#getting-started)
6. [Usage Guide](#usage-guide)
7. [Testing](#testing)
8. [Mutation Testing (Stryker)](#mutation-testing-stryker)
9. [Export & Backup](#export--backup)
10. [Themes & Customization](#themes--customization)
11. [Project Structure](#project-structure)
12. [Development Scripts](#development-scripts)

---

## Key Features

### Core TODO Management

- Rich metadata per TODO: message, due date, company, contacts, account representative
- Completion tracking — completed items move to a separate section
- Date-aware sorting with overdue / due-soon visual indicators
- Subtasks with individual completion tracking and progress bars
- Notes per TODO with edit history

### Multi-Company & Contact Management

- Company sidebar ranked by active TODO count
- Per-company tabs: Tasks · Contacts · Audio · Emails
- Full contact CRUD (person / vendor) with email, phone, notes
- Account executive assignments per company

### Master View & Filtering

- Global view across all companies
- Filter by company, account rep, or completion status
- Sort by date or company name

### Data & Sync

- **PostgreSQL** as the primary database (local or remote)
- **localStorage** as an automatic backup, always kept in sync
- **Automatic failover** — if PostgreSQL becomes unreachable, the app continues from localStorage
- **Automatic sync** — when PostgreSQL comes back, all changes made offline are pushed back

### Additional Features

- Full-text search across message, company, contacts, and account rep
- Dashboard analytics (completion rate, overdue alerts, company summaries)
- Export to JSON, CSV, or Markdown
- 14 professional themes (light + dark + colorful)
- Audio message recording per company
- Email / calendar file (.eml / .ics) import

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  React Application (Renderer Process)                           │
│                                                                 │
│  App.jsx ──► electronAdapter.js ──► SyncManager.js             │
│               │  (src/utils/)                                   │
│               │                                                 │
│      ┌────────┴──────────┐                                      │
│      │                   │                                      │
│  ┌───▼────────────┐  ┌───▼──────────────┐                      │
│  │ PostgreSQL     │  │  localStorage    │                      │
│  │ PRIMARY        │  │  BACKUP          │                      │
│  │ source of      │  │  always kept     │                      │
│  │ truth          │  │  in sync         │                      │
│  └───────────────┘  └──────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
         │  IPC (contextBridge)
         │
┌────────▼────────────────────────────────────────────────────────┐
│  Electron Main Process                                          │
│                                                                 │
│  main.cjs  ──►  database.cjs  ──►  PostgreSQL                  │
│  (IPC handlers)   (DBManager)      (localhost:5432)            │
└─────────────────────────────────────────────────────────────────┘
```

### Component Layers

| Layer        | File                           | Responsibility                                 |
| ------------ | ------------------------------ | ---------------------------------------------- |
| UI           | `src/components/App.jsx`       | React state, debounced saves                   |
| Adapter      | `src/utils/electronAdapter.js` | PostgreSQL ↔ localStorage routing              |
| Sync         | `src/utils/syncManager.js`     | Health polling, dirty tracking, reconnect sync |
| IPC Bridge   | `electron/preload.cjs`         | Secure contextBridge                           |
| Main Process | `electron/main.cjs`            | IPC handlers                                   |
| Database     | `electron/database.cjs`        | PostgreSQL via pg                              |

---

## Data Storage: PostgreSQL + localStorage

### PostgreSQL — Primary Database

The application uses **PostgreSQL** as the primary database, connecting via the `pg` Node.js client library:

- **Default Connection:** `postgresql://localhost:5432/todo_tracker`
- **Environment Variable:** Set `DATABASE_URL` to override the default
- **SSL:** Enabled in production, disabled for local development
- **Connection Pooling:** Built-in connection management via pg client

#### Database Schema

```sql
-- Active and completed tasks
CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  date TEXT NOT NULL,
  company TEXT,
  names TEXT,
  accountRep TEXT,
  completed BOOLEAN DEFAULT FALSE,
  description TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Per-company labels / tags
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  tagName TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company, tagName)
);

-- Contacts (persons and vendors)
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,           -- 'person' | 'vendor'
  email TEXT,
  phone TEXT,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Application configuration
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,  -- JSON-serialised value
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### localStorage — Automatic Backup

Every write to PostgreSQL is **also mirrored to localStorage** (write-through cache). This means:

- If PostgreSQL is unreachable, the app can immediately continue from localStorage
- On a fresh install or after a database move, the backup can be used to reseed PostgreSQL
- No data is ever silently lost

> Audio messages and email files are stored in localStorage only (base64 blobs are too large for PostgreSQL and remain in the backup layer by design).

---

## PostgreSQL Setup and Startup

### What to create

The app creates the PostgreSQL database tables automatically when you launch the Electron desktop version. You do not need to create tables or run SQL setup scripts manually.

### How to start the app with PostgreSQL

```bash
npm install
npm run dev:electron
```

This starts the Electron app and connects to PostgreSQL, creating all necessary tables on first run.

### Default database connection

- **Default URL:** `postgresql://localhost:5432/todo_tracker`
- **Environment Variable:** Override with `DATABASE_URL`
- **SSL:** Enabled in production, disabled for local development

### Confirm PostgreSQL connection

```bash
# Test connection with psql
psql "$DATABASE_URL" -c "SELECT version();"

# Or with the default connection
psql "postgresql://localhost:5432/todo_tracker" -c "SELECT version();"
```

### Inspect the database with psql

```bash
# Connect to database
psql "$DATABASE_URL"

# Useful commands inside psql
\dt                          -- list all tables
\d todos                     -- show todos table schema
SELECT COUNT(*) FROM todos;  -- count todos
SELECT * FROM todos WHERE completed = false LIMIT 10;  -- active todos
SELECT company, COUNT(*) FROM todos GROUP BY company;  -- per-company count
\q                           -- quit
```

### Resetting the PostgreSQL database

If you need a clean start, drop and recreate the database:

```bash
# Drop and recreate database
dropdb todo_tracker
createdb todo_tracker

# Or with psql
psql -c "DROP DATABASE IF EXISTS todo_tracker;"
psql -c "CREATE DATABASE todo_tracker;"
```

Then restart the Electron app to recreate tables.

### Troubleshooting connection issues

**Connection refused:**

- Ensure PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
- Check if port 5432 is open: `netstat -an | grep 5432`

**Authentication failed:**

- Verify username/password in DATABASE_URL
- Check pg_hba.conf for authentication rules

**Database doesn't exist:**

- Create it: `createdb todo_tracker`

**Permission denied:**

- Grant permissions: `GRANT ALL PRIVILEGES ON DATABASE todo_tracker TO todo_user;`

---

## Sync & Resilience

```
Normal operation (PostgreSQL available)
─────────────────────────────────────
 Write ──► PostgreSQL  (primary)
       └─► localStorage  (backup mirror)

 Read  ──► PostgreSQL  (source of truth)


PostgreSQL unavailable
─────────────────────────────────────
 Write ──► localStorage  (backup)
       └─► dirty flag set for collection

 Read  ──► localStorage  (backup)


Recovery (PostgreSQL comes back)
─────────────────────────────────────
 SyncManager detects reconnect
   └──► for each dirty collection:
           read localStorage ──► push to PostgreSQL
           clear dirty flag
```

### How It Works

**SyncManager** (`src/utils/syncManager.js`) runs a background health-check every 5 seconds by calling `window.electron.ping()` through the IPC bridge. It tracks:

| State                | Meaning                                    |
| -------------------- | ------------------------------------------ |
| `available = true`   | PostgreSQL connection is healthy           |
| `available = false`  | PostgreSQL is unreachable; using backup    |
| `dirty: Set<string>` | Collections modified during offline period |

When PostgreSQL recovers:

1. SyncManager detects the transition `false → true` and fires an `'online'` event
2. `ElectronAdapter` receives the event and calls `_syncDirtyCollections()`
3. Each dirty collection is read from localStorage and pushed to PostgreSQL
4. The dirty flag is cleared; PostgreSQL and localStorage are back in sync

**Dirty flag persistence:** If a sync push fails (PostgreSQL connection fails mid-sync), the dirty flag is kept and the sync retries on the next reconnection.

### Failure Scenarios

| Scenario                   | Behavior                                                    |
| -------------------------- | ----------------------------------------------------------- |
| Normal operation           | All reads/writes go to PostgreSQL; localStorage is a mirror |
| PostgreSQL call throws     | Fallback to localStorage; collection marked dirty           |
| App restarts while offline | Loads from localStorage; syncs to PostgreSQL when available |
| Corrupted backup           | PostgreSQL wins (source of truth) on next successful read   |
| Sync push fails            | Dirty flag kept; retried on next `'online'` event           |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** 7+
- **PostgreSQL** 12+ (local installation or remote database)
- macOS, Windows, or Linux

### PostgreSQL Setup

#### Option 1: Local PostgreSQL Installation

**macOS (with Homebrew):**

```bash
# Install PostgreSQL
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Create database
createdb todo_tracker

# Optional: Create a dedicated user
createuser --createdb --login todo_user
psql -c "ALTER USER todo_user PASSWORD 'your_password_here';"
```

**Windows (with Chocolatey):**

```bash
# Install PostgreSQL
choco install postgresql

# Create database
createdb todo_tracker

# Optional: Create a dedicated user
createuser --createdb --login todo_user
psql -c "ALTER USER todo_user PASSWORD 'your_password_here';"
```

**Linux (Ubuntu/Debian):**

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb todo_tracker

# Optional: Create a dedicated user
sudo -u postgres createuser --createdb --login todo_user
sudo -u postgres psql -c "ALTER USER todo_user PASSWORD 'your_password_here';"
```

#### Option 2: Docker PostgreSQL (Recommended for Development)

```bash
# Run PostgreSQL in Docker
docker run --name todo-postgres \
  -e POSTGRES_DB=todo_tracker \
  -e POSTGRES_USER=todo_user \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -p 5432:5432 \
  -d postgres:15

# Verify connection
psql "postgresql://todo_user:mysecretpassword@localhost:5432/todo_tracker" -c "SELECT version();"
```

#### Option 3: Cloud PostgreSQL (Production)

Use services like:

- **Supabase** (free tier available)
- **Neon** (serverless PostgreSQL)
- **AWS RDS PostgreSQL**
- **Google Cloud SQL**
- **Azure Database for PostgreSQL**

Set the `DATABASE_URL` environment variable to your cloud database connection string.

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd TODO-Tracker

# 2. Install dependencies
npm install

# 3. Set database connection (optional - defaults to localhost)
export DATABASE_URL="postgresql://todo_user:mysecretpassword@localhost:5432/todo_tracker"

# 4a. Run in browser (dev) mode — uses localStorage only
npm run dev

# 4b. Run as Electron desktop app — uses PostgreSQL + localStorage
npm run dev:electron
```

On first launch, the app creates all necessary tables in PostgreSQL automatically. No manual schema setup is required.

### Build for Production

```bash
# Build the React app
npm run build

# Package as a native desktop app (macOS .dmg / Windows .exe)
npm run build:electron
```

---

## Usage Guide

### Creating a TODO

1. Fill in the **Message** describing what needs to be done
2. Select or type a **Date** for the due date
3. Choose or create a **Company**
4. (Optional) Add an **Account Rep** and select **Contacts**
5. Click **Create TODO**

### Managing Companies & Labels

1. Click **Manage Tags** in the header
2. Add companies, assign account executives, create labels
3. Labels appear as selectable checkboxes when creating or editing TODOs

### Using the Contact Manager

1. Click the **Contacts** tab in the company panel
2. Select a company from the dropdown
3. Add contacts with name, type, email, phone, and notes

### Master View

1. Click **Master View** at the top
2. Filter by company, account rep; sort by date or company
3. Toggle **Show Completed** to include finished items

### Completing TODOs

- Check the checkbox on any TODO to mark it complete
- Click the ↩ button on a completed TODO to revert it

---

## Testing

The project has **405 tests** across 13 test files covering:

| Test File                      | What it covers                                           |
| ------------------------------ | -------------------------------------------------------- |
| `syncManager.test.js`          | Health polling, dirty tracking, events, edge cases       |
| `electronAdapter.sync.test.js` | Write-through backup, SQLite fallback, sync-on-reconnect |
| `persistence.test.js`          | Full CRUD round-trips, backup/restore                    |
| `config.test.js`               | Config load/save, defaults                               |
| `tagManager.test.js`           | Company, label, account executive management             |
| `markdownHandler.test.js`      | Markdown serialisation/parsing                           |
| `fileParser.test.js`           | .eml and .ics file parsing                               |
| `addTaskForm.test.jsx`         | Form submission and validation                           |
| `autocomplete.test.jsx`        | Autocomplete component                                   |
| `todoDetail.test.jsx`          | Todo detail modal, subtasks, notes                       |
| `audioMessages.test.jsx`       | Audio recording/playback                                 |
| `emailsTab.test.jsx`           | Email management                                         |
| `analytics.test.js`            | Completion rate, overdue calculations                    |

```bash
# Run all tests
npm test

# Run with interactive UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

---

## Mutation Testing (Stryker)

[Stryker](https://stryker-mutator.io) modifies your source code in small ways (flipping booleans, removing conditions, changing operators) and re-runs the test suite. If a test catches the change the mutant is **killed** — good. If all tests still pass the mutant **survived** — a gap in your coverage.

```bash
# Mutate all sync-critical utility files
npm run test:mutation

# Target just SyncManager (faster iteration)
npm run test:mutation:sync
```

Configuration is in [stryker.config.mjs](stryker.config.mjs). Reports are written to `reports/mutation/`.

**Threshold:** mutation score must be ≥ 50% or the command exits with an error (suitable for CI).

---

## Export & Backup

### Automatic Backup

localStorage is always an up-to-date copy of the PostgreSQL database. No action required.

### Manual Export

In the **Settings** panel (gear icon):

| Format   | Use case                                     |
| -------- | -------------------------------------------- |
| JSON     | Full fidelity re-import; includes all fields |
| CSV      | Excel / Google Sheets                        |
| Markdown | Human-readable; grouped by company           |

### Import

Use the **Import** option in Settings to restore from a previously exported JSON file. This restores SQLite directly when available, or localStorage as fallback.

---

## Themes & Customization

14 professional themes — toggle in the **Settings** panel:

**Light:** Modern Light · One Light · GitHub Light · Solarized Light

**Dark:** One Dark · Dracula · Nord · Solarized Dark · Gruvbox Dark · GitHub Dark · Modern Dark

**Colorful:** Forest · Ocean · Sunset

**Layout options:**

- Sidebar position: left or right
- Compact mode: reduce spacing for more content
- Default view: Company or Master

---

## Project Structure

```
TODO-Tracker/
├── electron/
│   ├── main.cjs          # Electron main process + IPC handlers
│   ├── preload.cjs        # Secure contextBridge (window.electron)
│   └── database.cjs       # DBManager — PostgreSQL via pg
│
├── src/
│   ├── components/
│   │   ├── App.jsx        # Root React component, state management
│   │   ├── Sidebar.jsx    # Company list + stats
│   │   ├── CompanyTabs.jsx # Tasks / Contacts / Audio / Email tabs
│   │   ├── TodoCard.jsx   # Individual task card
│   │   ├── AddTaskForm.jsx # New task form
│   │   ├── MainFeed.jsx   # Task list + filtering
│   │   ├── Autocomplete.jsx
│   │   ├── ConfigManager.jsx # Settings + export
│   │   ├── AudioTab.jsx
│   │   └── EmailsTab.jsx
│   │
│   ├── utils/
│   │   ├── electronAdapter.js   # SQLite ↔ localStorage routing
│   │   ├── syncManager.js       # Health polling + dirty sync
│   │   ├── markdownHandler.js   # Markdown I/O + localStorage helpers
│   │   ├── tagManager.js        # Company / label / AE management
│   │   ├── exportUtils.js       # JSON / CSV / Markdown export
│   │   └── fileParser.js        # .eml and .ics parsing
│   │
│   └── __tests__/
│       ├── syncManager.test.js
│       ├── electronAdapter.sync.test.js
│       ├── persistence.test.js
│       ├── config.test.js
│       ├── tagManager.test.js
│       ├── markdownHandler.test.js
│       ├── fileParser.test.js
│       ├── addTaskForm.test.jsx
│       ├── autocomplete.test.jsx
│       ├── todoDetail.test.jsx
│       ├── audioMessages.test.jsx
│       ├── emailsTab.test.jsx
│       └── analytics.test.js
│
├── docs/
│   ├── POSTGRESQL_SETUP.md   # Database setup & administration
│   └── SYNC_ARCHITECTURE.md # Deep-dive into the sync layer
│
├── stryker.config.mjs       # Mutation testing configuration
├── vitest.config.js         # Test runner configuration
├── vite.config.js           # Build configuration
└── package.json
```

---

## Development Scripts

```bash
npm run dev               # Vite dev server (browser/localStorage mode)
npm run dev:electron      # Electron + Vite (PostgreSQL mode)
npm run build             # Production React build
npm run build:electron    # Package as native app
npm test                  # Run all tests
npm run test:ui           # Vitest interactive UI
npm run test:coverage     # Coverage report
npm run test:mutation     # Stryker mutation testing
npm run test:mutation:sync # Mutate SyncManager only
npm run lint              # ESLint
```

---

## Data Format Reference

### Todo Object

```json
{
  "id": "1712345678901",
  "message": "Call Wal-Mart about Q1 status",
  "date": "2026-04-15",
  "company": "Wal-Mart",
  "accountRep": "Jane Doe",
  "names": ["Chris Smith", "Sarah Johnson"],
  "description": "Follow up on the pending contract renewal",
  "completed": 0,
  "labels": ["follow-up", "urgent"],
  "subtasks": [
    { "id": "st1", "message": "Prepare agenda", "completed": false }
  ],
  "notes": [{ "text": "Left voicemail", "createdAt": "2026-04-10T14:00:00Z" }],
  "createdAt": "2026-04-01T09:00:00Z",
  "updatedAt": "2026-04-10T14:00:00Z"
}
```

### Config Object

```json
{
  "theme": "github-dark",
  "sidebarPosition": "left",
  "compactMode": false,
  "defaultView": "company",
  "autoSyncEnabled": false,
  "exportFormat": "json"
}
```

---

## Privacy & Storage

- **100% local** — no server communication, no cloud sync by default
- Data lives on your machine at the platform user-data directory
- Export anytime for backup or migration
- The localStorage backup is an additional safety net inside the browser engine

---

## Support & Feedback

For issues, questions, or feature requests, please create an issue in the repository.
