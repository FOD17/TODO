# PostgreSQL Setup & Administration

This document covers everything you need to know about the PostgreSQL database that powers TODO Tracker: how to set it up, inspect it, back it up, and troubleshoot common issues.

---

## Table of Contents

1. [Database Connection](#database-connection)
2. [Schema Reference](#schema-reference)
3. [Running the App for the First Time](#running-the-app-for-the-first-time)
4. [Inspecting the Database](#inspecting-the-database)
5. [Backup & Restore](#backup--restore)
6. [Migrations](#migrations)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Configuration](#advanced-configuration)

---

## Database Connection

The app connects to PostgreSQL using a connection string. By default, it connects to a local PostgreSQL instance:

- **Default Connection:** `postgresql://localhost:5432/todo_tracker`
- **Environment Variable:** Override with `DATABASE_URL`
- **SSL:** Enabled in production, disabled for local development

> **Tip:** You can confirm the connection from within the app by opening the **Settings** panel → **Database Status**.

---

## Schema Reference

Four tables are created automatically on first launch.

### `todos`

Stores active and completed tasks.

```sql
CREATE TABLE IF NOT EXISTS todos (
  id          TEXT PRIMARY KEY,
  message     TEXT NOT NULL,
  date        TEXT NOT NULL,          -- ISO date string, e.g. '2026-04-15'
  company     TEXT,
  names       TEXT,                   -- comma-separated contact names
  accountRep  TEXT,
  completed   BOOLEAN DEFAULT FALSE,  -- FALSE = active, TRUE = completed
  description TEXT,
  createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `tags`

Stores per-company labels. A UNIQUE constraint prevents duplicates.

```sql
CREATE TABLE IF NOT EXISTS tags (
  id        TEXT PRIMARY KEY,
  company   TEXT NOT NULL,
  tagName   TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company, tagName)
);
```

### `contacts`

Stores person and vendor contacts per company.

```sql
CREATE TABLE IF NOT EXISTS contacts (
  id        TEXT PRIMARY KEY,
  company   TEXT NOT NULL,
  name      TEXT NOT NULL,
  type      TEXT,                    -- 'person' | 'vendor'
  email     TEXT,
  phone     TEXT,
  notes     TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `config`

Stores application settings as key/value pairs (values are JSON-serialised).

```sql
CREATE TABLE IF NOT EXISTS config (
  key       TEXT PRIMARY KEY,
  value     TEXT NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

> Fields like `labels`, `subtasks`, `notes`, and `accountExecutives` (which live in the React layer) are stored as JSON in the full todo/tags objects when syncing via the bulk-save methods. The PostgreSQL schema stores the core relational fields; rich nested data travels through the JSON backup layer.

---

## Running the App for the First Time

1. Set up PostgreSQL (see README.md for detailed instructions)
2. Install dependencies: `npm install`
3. Set DATABASE_URL if needed: `export DATABASE_URL="postgresql://localhost:5432/todo_tracker"`
4. Launch with Electron: `npm run dev:electron`
5. The app connects to PostgreSQL and creates tables automatically
6. No manual SQL scripts need to be run

If you want to reset to a clean database:

```bash
# Drop and recreate the database
dropdb todo_tracker
createdb todo_tracker
```

The next app launch will recreate all tables.

---

## Inspecting the Database

### Using psql (PostgreSQL CLI)

```bash
# Connect to the database
psql "$DATABASE_URL"

# Useful commands inside psql
\dt                          -- list all tables
\d todos                     -- show todos table schema
SELECT COUNT(*) FROM todos;  -- count todos
SELECT * FROM todos WHERE completed = false LIMIT 10;  -- active todos
SELECT company, COUNT(*) FROM todos GROUP BY company;  -- per-company count
\q                           -- quit
```

### Using pgAdmin (GUI)

[pgAdmin](https://www.pgadmin.org) is a free, web-based GUI for PostgreSQL. Connect to your database and explore tables visually.

### Using DBeaver (Cross-platform GUI)

[DBeaver](https://dbeaver.io) supports PostgreSQL and many other databases. Create a connection to your PostgreSQL instance.

### From the App's Settings

The **Settings** panel shows a database status summary including:

- Database connection string (masked)
- Table row counts (todos, tags, contacts)
- Sync status (available / offline)
- Dirty collection count (pending sync items)

---

## Backup & Restore

### Automatic Backup (localStorage)

The app **automatically mirrors every write to localStorage** as a backup. This happens synchronously before the PostgreSQL call returns. You do not need to do anything to enable it.

If PostgreSQL becomes unreachable, the app continues seamlessly from localStorage and queues changes for sync when PostgreSQL recovers.

### Manual Export (in-app)

Open **Settings → Export** to download a full backup:

| Format       | Use case                                 |
| ------------ | ---------------------------------------- |
| **JSON**     | Full fidelity; can be re-imported        |
| **CSV**      | Spreadsheet analysis                     |
| **Markdown** | Human-readable, version-control friendly |

### Manual Database Backup (pg_dump)

Use PostgreSQL's built-in backup tools:

```bash
# Backup the entire database
pg_dump "$DATABASE_URL" > todo_tracker_backup_$(date +%Y%m%d).sql

# Or backup just the schema
pg_dump --schema-only "$DATABASE_URL" > schema_backup.sql

# Or backup just the data
pg_dump --data-only "$DATABASE_URL" > data_backup.sql
```

### Restoring from a JSON Backup

1. Open **Settings → Import**
2. Select the `.json` backup file
3. The app restores all tables (todos, tags, contacts, config) directly into PostgreSQL

### Restoring from pg_dump

```bash
# Restore from backup
psql "$DATABASE_URL" < todo_tracker_backup.sql

# Or create a fresh database and restore
dropdb todo_tracker
createdb todo_tracker
psql "$DATABASE_URL" < todo_tracker_backup.sql
```

---

## Migrations

Schema migrations are handled automatically in `electron/database.cjs` via `ALTER TABLE … ADD COLUMN IF NOT EXISTS`. The current migration adds the `description` column to the `todos` table for databases created before this column existed:

```javascript
try {
  await this.client.query(
    "ALTER TABLE todos ADD COLUMN IF NOT EXISTS description TEXT",
  )
} catch (e) {
  // Column already exists — safe to ignore
}
```

**Adding a new migration:**

1. Add an `ALTER TABLE` statement in `initializeTables()` inside `electron/database.cjs`
2. Use `IF NOT EXISTS` to handle the "column already exists" case
3. Test with both a fresh database and an upgraded one

---

## Troubleshooting

### Connection refused

PostgreSQL is not running or not accessible.

**Fix:**

```bash
# Check if PostgreSQL is running
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql

# Start if needed
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

### Authentication failed

Username/password incorrect or permissions not granted.

**Fix:**

```bash
# Connect as superuser and grant permissions
psql postgres -c "CREATE USER todo_user WITH PASSWORD 'your_password';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE todo_tracker TO todo_user;"

# Or change password
psql postgres -c "ALTER USER todo_user PASSWORD 'new_password';"
```

### Database does not exist

The database hasn't been created yet.

**Fix:**

```bash
# Create the database
createdb todo_tracker

# Or as superuser
psql postgres -c "CREATE DATABASE todo_tracker OWNER todo_user;"
```

### Data not appearing after restart

The app reads from PostgreSQL on startup. If PostgreSQL is unavailable at launch, it falls back to localStorage. Possible causes:

- PostgreSQL service is not running
- Connection string is incorrect
- Network issues (for remote databases)

**Fix:** Check the database connection:

```bash
psql "$DATABASE_URL" -c "SELECT 1;"
```

### App shows stale data after sync

If the app loaded from localStorage (offline mode) and you expected fresh PostgreSQL data:

1. Check **Settings → Database Status** — confirm `available: true`
2. If offline, the app is using the backup. PostgreSQL may be recovering.
3. The SyncManager polls every 5 seconds. Wait for the next poll or restart the app.

### pg module not found (development)

```
Error: Cannot find module 'pg'
```

Run `npm install` — `pg` is a native module that must be compiled for your platform.

---

## Advanced Configuration

### Changing the Poll Interval

The SyncManager polls PostgreSQL health every 5 seconds by default. To change this, edit the adapter constructor in `src/utils/electronAdapter.js`:

```javascript
// The syncManager singleton uses a 5-second poll interval.
// To change it for your environment, you'd modify SyncManager's constructor:
import { SyncManager } from "./syncManager.js"
const syncManager = new SyncManager({ pollIntervalMs: 10_000 }) // 10 seconds
```

### Connection Pooling

The current implementation uses a single connection. For high-traffic applications, consider implementing connection pooling:

```javascript
const { Pool } = require("pg")
const pool = new Pool({
  connectionString: this.connectionString,
  max: 10, // Maximum connections
  idleTimeoutMillis: 30000,
})
```

### Database Maintenance

PostgreSQL databases benefit from regular maintenance:

```bash
# Analyze tables for query optimization
psql "$DATABASE_URL" -c "ANALYZE;"

# Vacuum for space reclamation
psql "$DATABASE_URL" -c "VACUUM;"

# Reindex if needed
psql "$DATABASE_URL" -c "REINDEX DATABASE todo_tracker;"
```
