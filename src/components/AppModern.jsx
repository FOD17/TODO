import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  loadTodosLocalStorageSync,
  loadTagsLocalStorageSync,
  loadConfigLocalStorageSync,
  loadContactsLocalStorageSync,
} from "../utils/markdownHandler"
import { electronAdapter } from "../utils/electronAdapter"
import { debounce } from "../utils/debounce"
import Sidebar from "./Sidebar"
import MainFeed from "./MainFeed"
import EditTodoDrawer from "./EditTodoDrawer"
import ConfigManager from "./ConfigManager"

function App() {
  const [todos, setTodos] = useState(loadTodosLocalStorageSync())
  const [tags, setTags] = useState(loadTagsLocalStorageSync())
  const [config, setConfig] = useState(loadConfigLocalStorageSync())
  const [selectedCompany, setSelectedCompany] = useState("All")
  const [showConfig, setShowConfig] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [selectedTodo, setSelectedTodo] = useState(null)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)

  // Get company list
  const companies = useMemo(() => {
    const companySet = new Set(
      [...todos.active, ...todos.completed]
        .map((t) => t.company)
        .filter(Boolean),
    )
    return Array.from(companySet).sort()
  }, [todos])

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date().toDateString()
    let totalActive = todos.active.length
    let todayCount = 0
    let overdueCount = 0

    todos.active.forEach((todo) => {
      if (new Date(todo.date).toDateString() === today) {
        todayCount++
      } else if (new Date(todo.date) < new Date(today)) {
        overdueCount++
      }
    })

    const companyStats = {}
    companies.forEach((company) => {
      companyStats[company] = todos.active.filter(
        (t) => t.company === company,
      ).length
    })

    return {
      total: totalActive,
      today: todayCount,
      overdue: overdueCount,
      ...companyStats,
    }
  }, [todos, companies])

  // Save todos
  const saveTodosFn = useRef(
    debounce((todosData) => {
      electronAdapter.saveTodos(todosData).catch((e) => {
        console.error("Failed to save todos:", e)
      })
    }, 500),
  ).current

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedTodos, loadedTags, loadedConfig] = await Promise.all([
          electronAdapter.getTodos(),
          electronAdapter.getTags(),
          electronAdapter.getConfig(),
        ])

        if (loadedTodos) setTodos(loadedTodos)
        if (loadedTags) setTags(loadedTodos)
        if (loadedConfig) setConfig(loadedConfig)
      } catch (e) {
        console.error("Failed to load data:", e)
      }
    }

    loadData()
  }, [])

  // Save todos when they change
  useEffect(() => {
    saveTodosFn(todos)
  }, [todos, saveTodosFn])

  // Callbacks
  const addTodo = useCallback((todoData) => {
    const newTodo = {
      id: Date.now().toString(),
      ...todoData,
      description: todoData.description || "",
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setTodos((prev) => ({
      ...prev,
      active: [newTodo, ...prev.active],
    }))
  }, [])

  const addQuickTodo = useCallback(
    (todoData) => {
      const newTodo = {
        id: Date.now().toString(),
        message: todoData.message,
        date: todoData.date,
        company: selectedCompany === "All" ? "" : selectedCompany,
        names: [],
        accountRep: "",
        description: "",
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setTodos((prev) => ({
        ...prev,
        active: [newTodo, ...prev.active],
      }))
    },
    [selectedCompany],
  )

  const completeTodo = useCallback((todoId) => {
    setTodos((prev) => {
      const todo = prev.active.find((t) => t.id === todoId)
      if (!todo) return prev

      return {
        active: prev.active.filter((t) => t.id !== todoId),
        completed: [...prev.completed, { ...todo, completed: true }],
      }
    })
  }, [])

  const uncompleteTodo = useCallback((todoId) => {
    setTodos((prev) => {
      const todo = prev.completed.find((t) => t.id === todoId)
      if (!todo) return prev

      return {
        active: [...prev.active, { ...todo, completed: false }],
        completed: prev.completed.filter((t) => t.id !== todoId),
      }
    })
  }, [])

  const deleteTodo = useCallback((todoId, isCompleted = false) => {
    setTodos((prev) => ({
      ...prev,
      active: isCompleted
        ? prev.active
        : prev.active.filter((t) => t.id !== todoId),
      completed: isCompleted
        ? prev.completed.filter((t) => t.id !== todoId)
        : prev.completed,
    }))
  }, [])

  const editTodo = useCallback((updatedTodo) => {
    const now = new Date().toISOString()
    const updatedWithTimestamp = {
      ...updatedTodo,
      updatedAt: now,
    }

    setTodos((prev) => {
      const isCompleted = prev.completed.find((t) => t.id === updatedTodo.id)

      if (isCompleted) {
        return {
          ...prev,
          completed: prev.completed.map((t) =>
            t.id === updatedTodo.id ? updatedWithTimestamp : t,
          ),
        }
      } else {
        return {
          ...prev,
          active: prev.active.map((t) =>
            t.id === updatedTodo.id ? updatedWithTimestamp : t,
          ),
        }
      }
    })
  }, [])

  return (
    <div className={`app-modern theme-${config.theme}`}>
      <div className="app-layout">
        {/* Sidebar */}
        <Sidebar
          companies={companies}
          selectedCompany={selectedCompany}
          onSelectCompany={setSelectedCompany}
          stats={stats}
        />

        {/* Main Content */}
        <MainFeed
          todos={todos}
          onComplete={completeTodo}
          onDelete={deleteTodo}
          onEdit={(todo) => {
            setSelectedTodo(todo)
            setIsEditDrawerOpen(true)
          }}
          onAddQuick={addQuickTodo}
          selectedCompany={selectedCompany}
          showCompleted={showCompleted}
          onShowCompletedChange={setShowCompleted}
        />

        {/* Edit Drawer */}
        <EditTodoDrawer
          todo={selectedTodo}
          isOpen={isEditDrawerOpen}
          onClose={() => {
            setIsEditDrawerOpen(false)
            setSelectedTodo(null)
          }}
          onSave={(updatedTodo) => {
            editTodo(updatedTodo)
            setIsEditDrawerOpen(false)
            setSelectedTodo(null)
          }}
        />

        {/* Settings Modal */}
        <ConfigManager
          config={config}
          setConfig={setConfig}
          showConfig={showConfig}
          setShowConfig={setShowConfig}
        />
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen",
            "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue",
            sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .app-modern {
          height: 100vh;
          overflow: hidden;
          background: var(--background);
        }

        .app-layout {
          display: flex;
          height: 100vh;
          overflow: hidden;
        }

        /* Light Theme */
        .app-modern.theme-modern-light,
        .app-modern:not([class*="theme-"]) {
          --primary: #3498db;
          --background: #f8f9fa;
          --text: #2c3e50;
          --card: #ffffff;
          --border: #e0e0e0;
          --text-muted: #999999;
        }

        .app-modern.theme-one-light {
          --primary: #4078f2;
          --background: #fafafa;
          --text: #383a42;
          --card: #ffffff;
          --border: #e0e0e0;
          --text-muted: #999999;
        }

        .app-modern.theme-github-light {
          --primary: #0366d6;
          --background: #ffffff;
          --text: #24292e;
          --card: #f6f8fa;
          --border: #e1e4e8;
          --text-muted: #999999;
        }

        .app-modern.theme-solarized-light {
          --primary: #268bd2;
          --background: #fdf6e3;
          --text: #2c3e50;
          --card: #eee8d5;
          --border: #d4cba8;
          --text-muted: #999999;
        }

        /* Dark Themes */
        .app-modern.theme-modern-dark {
          --primary: #3498db;
          --background: #1e1e1e;
          --text: #ecf0f1;
          --card: #2d2d2d;
          --border: #404040;
          --text-muted: #999999;
        }

        .app-modern.theme-one-dark {
          --primary: #61afef;
          --background: #282c34;
          --text: #abb2bf;
          --card: #3e4451;
          --border: #565c64;
          --text-muted: #848b96;
        }

        .app-modern.theme-dracula {
          --primary: #8be9fd;
          --background: #282a36;
          --text: #f8f8f2;
          --card: #44475a;
          --border: #6272a4;
          --text-muted: #999999;
        }

        .app-modern.theme-nord {
          --primary: #88c0d0;
          --background: #2e3440;
          --text: #eceff4;
          --card: #3b4252;
          --border: #4c566a;
          --text-muted: #999999;
        }

        .app-modern.theme-solarized-dark {
          --primary: #93a1a1;
          --background: #002b36;
          --text: #93a1a1;
          --card: #073642;
          --border: #166d90;
          --text-muted: #507a8d;
        }

        .app-modern.theme-gruvbox-dark {
          --primary: #fe8019;
          --background: #282828;
          --text: #ebdbb2;
          --card: #3c3836;
          --border: #504945;
          --text-muted: #928374;
        }

        .app-modern.theme-github-dark {
          --primary: #79c0ff;
          --background: #0d1117;
          --text: #e6edf3;
          --card: #161b22;
          --border: #30363d;
          --text-muted: #8b949e;
        }

        .app-modern.theme-forest {
          --primary: #27ae60;
          --background: #ecf0f1;
          --text: #2c3e50;
          --card: #ffffff;
          --border: #e0e0e0;
          --text-muted: #999999;
        }

        .app-modern.theme-ocean {
          --primary: #16a085;
          --background: #f0f8ff;
          --text: #1a3a52;
          --card: #ffffff;
          --border: #d4e6f1;
          --text-muted: #999999;
        }

        .app-modern.theme-sunset {
          --primary: #e74c3c;
          --background: #fdf5f0;
          --text: #5d4037;
          --card: #ffffff;
          --border: #f0d5cf;
          --text-muted: #999999;
        }

        /* Settings Button */
        .settings-button-corner {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 40;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--primary);
          border: none;
          cursor: pointer;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.2s;
        }

        .settings-button-corner:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .settings-button-corner:active {
          transform: scale(0.95);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .app-layout {
            overflow-y: auto;
          }
        }
      `}</style>
    </div>
  )
}

export default App
