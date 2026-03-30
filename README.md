# 📋 Corporate TODO Tracker

A modern, React-based TODO list application designed specifically for managing technical information across multiple companies. Features markdown-based file persistence, advanced filtering, and intelligent analytics.

## ✨ Key Features

### Core TODO Management

- **Rich TODO metadata**: Each TODO includes message, date, company, contacts, and account representative
- **Company tags**: Create and manage tags for companies and individual contacts (e.g., "Wal-Mart: Chris Smith")
- **Completion tracking**: Completed TODOs move to a separate section, maintaining history
- **Date-aware sorting**: Todos sorted by date with indicators for overdue and due-soon items

### Multi-Company Management

- **Company selector**: Easily switch between 20+ companies with quick access sidebar
- **Company priority view**: Companies ranked by active TODO count
- **Company statistics**: Real-time overview of active, completed, and total TODOs per company
- **contacts tracking**: Track all contacts and account representatives per company

### Master View & Advanced Filtering

- **🎯 Master View**: Global view of all TODOs across all companies
- **📋 Company filters**: Quickly filter TODOs by one or multiple companies
- **👥 Account Rep filters**: Filter TODOs by account representative
- **🔄 Smart sorting**: Sort by date or company name
- **✓ Completion toggle**: Show/hide completed items in master view

### Contact Management

- **📇 Detailed contacts**: Store person or vendor contacts with email, phone, and notes
- **🏢 Company organization**: Contacts grouped by company for easy navigation
- **📝 Notes support**: Add expandable notes to each contact for additional context
- **🔄 Quick management**: Add, view, and delete contacts from the sidebar

### Advanced Features

- **🔍 Full-text search**: Search across message, company, contacts, and account representatives
- **📊 Dashboard analytics**:
  - Overall completion rate
  - Overdue and due-soon alerts
  - Company summary with active TODO counts
  - Completion trends by company
- **📥 Export functionality**: Download TODOs, tags, and contacts as files
- **🏷️ Tag management interface**: Centralized location to create and manage all tags
- **📱 Responsive design**: Works seamlessly on desktop (1024px+), tablet (768px), and mobile (480px)
- **🎨 Theme system**: Choose from 5 beautiful color schemes (Modern Light, Modern Dark, Forest, Ocean, Sunset)
- **⚙️ Customization**: Adjust sidebar position, compact mode, and default view

### Data Persistence & Sync

- **Markdown-based storage**: TODO and tag data stored in human-readable markdown format
- **JSON contacts**: Contact information stored in structured JSON for better nesting
- **LocalStorage backend**: Automatic persistence to browser storage
- **🔄 Hot reload**: Real-time sync across browser tabs and windows
- **Import/Export**: Download your data as markdown/JSON files for backup or migration
- **No database required**: Self-contained, privacy-focused solution

## 🚀 Getting Started

### Prerequisites

- Node.js (16+)
- npm or yarn

### Installation

```bash
# Clone or navigate to the project directory
cd TODO-Tracker

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open automatically at `http://localhost:3001` (or the next available port).

## 🆕 What's New (Latest Update)

### Master View with Advanced Filtering

- View all TODOs across all companies in a single unified interface
- Filter by one or multiple companies
- Filter by account representative
- Sort by date or company name
- Toggle visibility of completed items

### Contact Management System

- Add person or vendor contacts for each company
- Store email, phone number, and expandable notes
- Organize contacts by company with easy dropdown selection
- Full CRUD operations for managing relationships

### Theme & Customization System

Choose from **14 professional themes** inspired by popular code editors and design systems:

**Light Themes:**

- **One Light** - Atom One Light with excellent contrast
- **GitHub Light** - GitHub's clean, minimal light theme
- **Solarized Light** - Precision colors designed for readability
- **Modern Light** - Clean, bright interface with blue accents

**Dark Themes:**

- **One Dark** - Atom One Dark, popular and vibrant (Default)
- **Dracula** - Dark theme with stunning color contrast
- **Nord** - Arctic, north-bluish palette for less eye strain
- **Solarized Dark** - Precision dark mode variant
- **Gruvbox Dark** - Retro groove color scheme
- **GitHub Dark** - GitHub's official dark theme
- **Modern Dark** - Dark mode with soft contrast

**Colorful Themes:**

- **Forest** - Green-focused nature theme
- **Ocean** - Blue and teal ocean-inspired
- **Sunset** - Warm orange and red tones

**Additional Settings:**

- Customize sidebar position (left or right)
- Enable compact mode for more dense layouts
- Choose default view (Company View or Master View)
- Settings automatically save to database

### Real-Time Data Sync (Hot Reload)

- Changes sync automatically across browser tabs
- Works even when app is in background
- Storage event listeners ensure instant updates
- Perfect for multi-window workflows

### Enhanced Responsive Design

- Desktop: Full sidebar + content layout (1024px+)
- Tablet: Optimized spacing and touch targets (768px)
- Mobile: Stacked layout with simplified navigation (480px)
- All themes fully responsive across devices

## 📖 Usage Guide

### Creating a TODO

1. Fill in the **Message** describing what needs to be done
2. Select or enter a **Date** for when it's due
3. Choose or create a **Company**
4. (Optional) Add **Account Rep** name
5. (Optional) Select specific **Contacts** for the company
6. Click **Create TODO**

### Managing Companies & Contacts

1. Click **"Manage Tags"** in the header
2. Select a company or create a new one
3. Add tags in the format:
   - Simple title: `General`
   - Company contact: `Wal-Mart: Chris Smith`
4. Tags appear as selectable checkboxes when creating TODOs

### Using the Contact Manager

1. Click the **Contacts** tab in the sidebar
2. Select a company from the dropdown
3. Add new contacts:
   - Enter **Name**
   - Choose **Type**: Person or Vendor
   - Add **Email** (optional)
   - Add **Phone** (optional)
   - Add **Notes** (optional)
4. View all contacts organized by company
5. Click the note icon to expand/collapse notes
6. Delete contacts with the delete button

### Master View & Advanced Filtering

1. Click the **Master View** tab at the top
2. **Filter by Company**:
   - Click company buttons to select/deselect
   - View only TODOs from selected companies
   - Leave empty to show all
3. **Filter by Account Rep**:
   - Click account rep buttons to filter
   - Combine with company filters for precise results
4. **Sorting Options**:
   - Click **Sort by Date** or **Sort by Company**
   - Quickly organize your view
5. **Completion Toggle**:
   - Check **Show Completed** to include finished items
   - Uncheck to focus on active TODOs

### Filtering & Searching in Company View

- **Company Sidebar**: Click any company to view only their TODOs
- **Search Bar**: Type to search across all fields
- **Dashboard**: See overdue and due-soon alerts

### Completing TODOs

- Check the checkbox next to any TODO to mark it complete
- Completed TODOs appear in a separate section, sorted by date
- Click the ↩️ button to revert a completed TODO back to active

### Theme & Appearance Settings

1. Click the **⚙️ Settings** button in the top-right corner
2. **Change Theme**:
   - Modern Light: Clean, bright interface
   - Modern Dark: Easy on the eyes in low light
   - Forest: Nature-inspired green tones
   - Ocean: Calming blue palette
   - Sunset: Warm, energetic colors
3. **Layout Options**:
   - **Sidebar Position**: Move sidebar to left or right
   - **Compact Mode**: Reduce spacing for more content
4. **Default View**: Choose whether Master or Company view opens first

### Exporting Data

- Click **Export Todos** to download all TODOs as `todos.md`
- Click **Export Tags** to download all tags as `tags.md`
- Click **Export Contacts** to download all contacts as `contacts.json`
- These files can be imported into another TODO Tracker instance

## 📐 Data Format

### Todos (todos.md)

```markdown
# ACTIVE TODOS

- [ ] Call Wal-Mart about Q1 status | Date: 2026-03-28 | Company: Wal-Mart | Names: Chris Smith | Account Rep: John Doe

# COMPLETED TODOS

- [x] Email Microsoft | Date: 2026-03-20 | Company: Microsoft | Account Rep: Jane Doe
```

### Tags (tags.md)

```markdown
## Wal-Mart

- Wal-Mart: Chris Smith
- Wal-Mart: Sarah Johnson
- General

## Microsoft

- Microsoft: Bill Gates
```

### Contacts (contacts.json)

```json
{
  "companies": {
    "Wal-Mart": {
      "name": "Wal-Mart",
      "contacts": [
        {
          "id": "1234567890",
          "name": "Chris Smith",
          "type": "person",
          "email": "chris.smith@walmart.com",
          "phone": "(555) 123-4567",
          "notes": "Primary contact for Q1 initiatives"
        },
        {
          "id": "0987654321",
          "name": "Acme Consulting",
          "type": "vendor",
          "email": "contact@acmeconsulting.com",
          "phone": "(555) 987-6543",
          "notes": "Handles implementation projects"
        }
      ]
    }
  }
}
```

### Config (config.json)

```json
{
  "theme": "modern-dark",
  "sidebarPosition": "left",
  "compactMode": false,
  "defaultView": "company"
}
```

## 🧪 Testing

The project includes **45 comprehensive tests** covering:

- **Markdown parsing & serialization** (todos, tags, contacts)
- **Contact management** (CRUD operations, person/vendor types, nesting)
- **Config system** (theme persistence, layout options)
- **Master view filtering** (company filters, account rep filters, multi-select)
- **Sorting functionality** (by date, by company)
- **Analytics calculations** (completion rates, company summaries)

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

**Test Results**: ✅ 45 tests passing (3 test files)

## 📊 Analytics & Reporting

The Dashboard provides:

- **Active TODOs**: Total count of items to complete
- **Completed**: Historical count of finished items
- **Completion Rate**: Percentage of all TODOs that are completed
- **Companies**: Number of companies being managed
- **Alerts**: Automatic notifications for overdue and due-soon items
- **Company Summary**: Top 5 companies by active TODO count

## 🔒 Privacy & Storage

- **100% client-side**: All data stored locally in your browser
- **No server communication**: Your data never leaves your computer
- **LocalStorage backend**: Data persists across browser sessions
- **Export anytime**: Full control - export your data for backup or migration

## 🏗️ Architecture

- **Frontend**: React 18 with functional components and Hooks
- **Build**: Vite for fast development and optimized builds
- **Storage**: Browser LocalStorage with markdown & JSON serialization
- **Testing**: Vitest with comprehensive unit tests (45 tests)
- **Styling**: CSS-in-JS with component-scoped styles and CSS variables for theming
- **Theme System**: 5 pre-built themes with customizable colors
- **Hot Reload**: Real-time sync across tabs via storage event listeners
- **Responsive**: Mobile-first design with breakpoints at 480px, 768px, 1024px

## 📁 Project Structure

```
TODO-Tracker/
├── index.html                       # Main HTML template
├── public/
├── src/
│   ├── components/
│   │   ├── App.jsx                  # Main app container with theme & view management
│   │   ├── CompanySelector.jsx      # Company navigation sidebar
│   │   ├── TodoForm.jsx             # TODO creation form
│   │   ├── TodoList.jsx             # Active & completed TODO display
│   │   ├── Dashboard.jsx            # Analytics & overview
│   │   ├── TagManager.jsx           # Tag creation & management
│   │   ├── ContactManager.jsx       # Contact/vendor management interface
│   │   ├── MasterTodoView.jsx       # Global view with filtering & sorting
│   │   └── ConfigManager.jsx        # Settings modal (themes, layout, etc.)
│   ├── utils/
│   │   ├── markdownHandler.js       # Parse & serialize markdown + config/contacts
│   │   └── analytics.js             # Data aggregation & statistics
│   ├── __tests__/
│   │   ├── markdownHandler.test.js
│   │   ├── analytics.test.js
│   │   └── config.test.js           # Tests for contacts, config, filtering
│   ├── main.jsx
│   └── App.css
├── package.json
├── vite.config.js
├── vitest.config.js
└── README.md
```

## 💡 Tips & Best Practices

### Organizing Companies

- Keep company names consistent (e.g., "Wal-Mart" not "Walmart")
- Use the tag manager to pre-create all contacts for large accounts
- Leverage the company priority view to focus on high-activity accounts

### Maximum Productivity

- Use "Today" view to focus on what's urgent
- Set due dates intelligently - near-future dates for active work
- Review the dashboard daily for overdue items
- Use the search feature for bulk operations or history searches
- **Master View** is perfect for strategic planning across all accounts

### Theme Descriptions

1. **Modern Light** - Clean, professional design with light backgrounds and dark text
   - Best for: Daytime work, printed reports
   - Primary colors: Blue accents on white/light gray

2. **Modern Dark** - Easy on the eyes in low-light environments
   - Best for: Evening work, reduced eye strain
   - Primary colors: Blue accents on dark gray/charcoal

3. **Forest** - Nature-inspired greens and earth tones
   - Best for: Creative work, outdoor environments
   - Primary colors: Forest green on light backgrounds

4. **Ocean** - Calming blue palette inspired by water
   - Best for: Focused work, relaxation
   - Primary colors: Ocean blue with white accents

5. **Sunset** - Warm, energetic colors for motivation
   - Best for: High-energy work, motivation boost
   - Primary colors: Orange and warm tones on light backgrounds

### Data Backup

- Export your data monthly to a safe location
- Keep exported markdown files in version control or cloud storage
- Export before major browser cleanups or updates

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build locally
npm test             # Run tests once
npm run test:ui      # Run tests with interactive UI
npm run test:coverage # Generate coverage report
```

### Technology Stack

- **React 18.2.0** - UI framework
- **Vite 5.0+** - Build tool
- **Vitest 1.0+** - Testing framework (45 tests)
- **CSS-in-JS** - Component styling with CSS variables for theming

## 📝 License

MIT License - feel free to use, modify, and distribute!

## 🤝 Support & Feedback

For issues, questions, or feature requests, please create an issue in the repository.

## 🎯 Intelligent Features Included

### 1. **Smart Date Indicators**

- Overdue TODOs highlighted in red
- Due today TODOs highlighted in orange
- Quick visual scanning of priorities

### 2. **Overdue & Due-Soon Alerts**

- Automatic detection of past-due items
- 3-day look-ahead for upcoming deadlines
- Dashboard alerts for quick wins

### 3. **Company Priority Ranking**

- Automatically sorted by active TODO count
- Focus on high-impact accounts first
- Company summary showing active/total count ratio

### 4. **Contact Management**

- Centralized tag system for all companies and contacts
- Quick selection when creating TODOs
- Account representative tracking for relationships

### 5. **Search Across All Fields**

- Find TODOs by message content
- Filter by company name
- Search by contact name or account rep
- Helps discover patterns and history

### 6. **Completion Analytics**

- Track completion rate trends
- View company-specific completion metrics
- Historical data available in completed section

## 🚀 Future Enhancement Ideas

- Multi-user support with conflict resolution
- Recurring TODOs for regular maintenance tasks
- Email notifications and reminders
- Calendar view integration
- Drag-and-drop TODO organization
- Team collaboration features
- Cloud sync option for automatic backup
- Mobile app (React Native)
- Dark mode and custom color pickers
- Advanced search with saved filters
