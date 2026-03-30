# Electron Setup Guide

## Overview

Your TODO Tracker has been successfully converted from a React browser app to an **Electron desktop app** with **SQLite database persistence**. This means:

✅ Data persists across app restarts  
✅ No more losing data when browser cache is cleared  
✅ Full desktop application with native OS integration  
✅ SQLite database stores everything locally at: `~/Library/Application Support/TODO Tracker/data/todos.db`

## Installation

All dependencies are already installed. Here's what was added:

- **electron** - Desktop app framework
- **better-sqlite3** - High-performance SQLite database
- **electron-builder** - For packaging and distribution
- **electron-is-dev** - Detection for dev/production mode
- **concurrently** & **wait-on** - For dev server coordination

## Running the App

### Development Mode

```bash
npm run dev:electron
```

This will:

1. Start the Vite dev server (http://localhost:5173)
2. Open the Electron app with DevTools enabled
3. Hot reload will work for frontend changes

### Production Build

```bash
npm run build:electron
```

This will:

1. Build the React app to `dist/`
2. Package it with Electron Builder
3. Create distributable packages for your platform

## Architecture

### Main Process (`/electron/main.js`)

- Controls app lifecycle
- Manages BrowserWindow
- Handles IPC (Inter-Process Communication)
- Exposes database operations via IPC handlers

### Renderer Process (React App)

- Runs in the BrowserWindow
- Communicates with main process via `window.electron` API
- No direct file system access (security isolation)

### Preload Script (`/electron/preload.js`)

- Secure bridge between main and renderer processes
- Exposes safe `window.electron` API to React
- Uses contextBridge for security isolation

### Database (`/electron/database.js`)

- SQLite database manager using better-sqlite3
- Creates and manages tables: todos, tags, contacts, config
- Handles all CRUD operations
- Exports/imports backups

### Adapter (`/src/utils/electronAdapter.js`)

- React-friendly API that wraps IPC calls
- Falls back to localStorage if Electron isn't available (for testing)
- Methods: getTodos, addTodo, saveTags, saveContacts, getConfig, exportBackup, etc.

## Data Persistence

### Storage Location

- **macOS**: `~/Library/Application Support/TODO Tracker/data/todos.db`
- **Windows**: `C:\Users\[Username]\AppData\Roaming\TODO Tracker\data\todos.db`
- **Linux**: `~/.config/TODO Tracker/data/todos.db`

### Automatic Saves

- Todos, tags, contacts are debounced (saved every 500ms)
- Configuration changes save immediately
- Backup/snapshot features are available in the header

## Key Files Modified/Created

### New Files

- `/electron/main.js` - Electron main process (150+ lines)
- `/electron/preload.js` - IPC security bridge
- `/electron/database.js` - SQLite implementation (300+ lines)
- `/src/utils/electronAdapter.js` - React IPC wrapper

### Modified Files

- `/package.json` - Added Electron scripts and build config
- `/src/components/App.jsx` - Uses electronAdapter instead of localStorage
- `/src/utils/markdownHandler.js` - Sync load utilities for initial state

## Development Notes

### Testing

Tests should continue to work because `electronAdapter.js` falls back to localStorage when `window.electron` is undefined. Run:

```bash
npm test
```

### IPC Handler Pattern

All IPC handlers follow this pattern:

```javascript
ipcMain.handle("db:getTodos", async () => {
  return database.getTodos()
})
```

Exposed to React via preload:

```javascript
window.electron.getTodos() // Calls db:getTodos IPC handler
```

### Debounced Saves

High-frequency state changes are debounced to prevent excessive database writes:

```javascript
const saveTodosFn = debounce((todos) => {
  electronAdapter.saveTodos(todos) // Batches writes every 500ms
}, 500)
```

## Troubleshooting

### App Won't Start

1. Check if Node is installed: `node --version`
2. Reinstall dependencies: `npm install`
3. Try running dev server: `npm run dev`

### Database Errors

1. Data directory might not exist - it's created automatically
2. Check permissions: `ls -l ~/Library/Application\ Support/TODO\ Tracker/`
3. Backup file location for recovery

### Electron DevTools

DevTools are enabled in dev mode (press Cmd+Option+I on macOS). This shows:

- React component tree
- Network requests to dev server
- Console errors
- Debugger for main/renderer process

## Building for Distribution

When ready to distribute:

```bash
npm run build:electron
```

This creates:

- **macOS**: `dist/` contains .dmg (installer) and .zip (portable)
- **Windows**: Creates NSIS installer and portable exe
- **Linux**: Creates AppImage or deb package

Configured in `/package.json` under `"build"` section.

## Next Steps

1. **Test the app**: `npm run dev:electron`
2. **Verify data persistence**: Add some todos, restart the app
3. **Test backup/restore**: Use "💼 Full Backup" feature
4. **Run tests**: `npm test` (should still pass)
5. **Build for production**: `npm run build:electron` when ready

---

**Questions?** Check the IPC handler implementations in `/electron/main.js` or database methods in `/electron/database.js`
