import React from "react"
import { saveConfigLocalStorage } from "../utils/markdownHandler"

function ConfigManager({ config, onConfigChange, showConfig, setShowConfig }) {
  // Note: showConfig and setShowConfig are now managed by parent (App.jsx)

  const themes = {
    // Light themes
    "one-light": {
      name: "One Light",
      description: "Atom One Light - clean and readable",
      colors: {
        primary: "#4078f2",
        background: "#fafafa",
        text: "#383a42",
        card: "#ffffff",
      },
    },
    "github-light": {
      name: "GitHub Light",
      description: "GitHub's clean light theme",
      colors: {
        primary: "#0366d6",
        background: "#ffffff",
        text: "#24292e",
        card: "#f6f8fa",
      },
    },
    "solarized-light": {
      name: "Solarized Light",
      description: "Precision colors for machines and people",
      colors: {
        primary: "#268bd2",
        background: "#fdf6e3",
        text: "#657b83",
        card: "#eee8d5",
      },
    },
    "modern-light": {
      name: "Modern Light",
      description: "Clean, bright interface with blue accents",
      colors: {
        primary: "#3498db",
        background: "#f5f5f5",
        text: "#2c3e50",
        card: "#ffffff",
      },
    },
    // Dark themes
    "one-dark": {
      name: "One Dark",
      description: "Atom One Dark - popular and vibrant",
      colors: {
        primary: "#61afef",
        background: "#282c34",
        text: "#abb2bf",
        card: "#3e4451",
      },
    },
    dracula: {
      name: "Dracula",
      description: "Dark theme with vibrant colors",
      colors: {
        primary: "#8be9fd",
        background: "#282a36",
        text: "#f8f8f2",
        card: "#44475a",
      },
    },
    nord: {
      name: "Nord",
      description: "Arctic, north-bluish color palette",
      colors: {
        primary: "#88c0d0",
        background: "#2e3440",
        text: "#eceff4",
        card: "#3b4252",
      },
    },
    "solarized-dark": {
      name: "Solarized Dark",
      description: "Precision colors for machines and people",
      colors: {
        primary: "#268bd2",
        background: "#002b36",
        text: "#839496",
        card: "#073642",
      },
    },
    "gruvbox-dark": {
      name: "Gruvbox Dark",
      description: "Retro groove color scheme",
      colors: {
        primary: "#83a598",
        background: "#282828",
        text: "#ebdbb2",
        card: "#3c3836",
      },
    },
    "github-dark": {
      name: "GitHub Dark",
      description: "GitHub's dark theme",
      colors: {
        primary: "#58a6ff",
        background: "#0d1117",
        text: "#c9d1d9",
        card: "#161b22",
      },
    },
    "modern-dark": {
      name: "Modern Dark",
      description: "Dark mode with soft contrast",
      colors: {
        primary: "#3498db",
        background: "#1e1e1e",
        text: "#ecf0f1",
        card: "#2d2d2d",
      },
    },
    // Colorful themes
    forest: {
      name: "Forest",
      description: "Green-focused nature theme",
      colors: {
        primary: "#27ae60",
        background: "#ecf0f1",
        text: "#2c3e50",
        card: "#ffffff",
      },
    },
    ocean: {
      name: "Ocean",
      description: "Blue and teal ocean-inspired",
      colors: {
        primary: "#16a085",
        background: "#f0f8ff",
        text: "#1a3a52",
        card: "#ffffff",
      },
    },
    sunset: {
      name: "Sunset",
      description: "Warm orange and red tones",
      colors: {
        primary: "#e74c3c",
        background: "#fdf5f0",
        text: "#5d4037",
        card: "#ffffff",
      },
    },
  }

  const handleThemeChange = (themeKey) => {
    const newConfig = { ...config, theme: themeKey }
    saveConfigLocalStorage(newConfig)
    onConfigChange(newConfig)
  }

  const handleConfigChange = (key, value) => {
    const newConfig = { ...config, [key]: value }
    saveConfigLocalStorage(newConfig)
    onConfigChange(newConfig)
  }

  return (
    <>
      {showConfig && (
        <div className="config-modal-overlay">
          <div className="config-modal">
            <div className="config-header">
              <h2>⚙️ Settings</h2>
              <button
                onClick={() => setShowConfig(false)}
                className="btn-close"
              >
                ✕
              </button>
            </div>

            <div className="config-content">
              <section className="config-section">
                <h3>Theme</h3>
                <div className="themes-grid">
                  {Object.entries(themes).map(([key, theme]) => (
                    <button
                      key={key}
                      className={`theme-card ${config.theme === key ? "active" : ""}`}
                      onClick={() => handleThemeChange(key)}
                    >
                      <div className="theme-preview">
                        <div
                          className="color-swatch primary"
                          style={{
                            backgroundColor: theme.colors.primary,
                          }}
                        ></div>
                        <div
                          className="color-swatch bg"
                          style={{
                            backgroundColor: theme.colors.background,
                          }}
                        ></div>
                      </div>
                      <h4>{theme.name}</h4>
                      <p>{theme.description}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="config-section">
                <h3>Layout</h3>
                <div className="config-option">
                  <label>
                    <input
                      type="checkbox"
                      checked={config.compactMode}
                      onChange={(e) =>
                        handleConfigChange("compactMode", e.target.checked)
                      }
                    />
                    Compact Mode
                  </label>
                  <span className="help-text">
                    Reduce spacing and font sizes
                  </span>
                </div>

                <div className="config-option">
                  <label>
                    Sidebar Position: <strong>{config.sidebarPosition}</strong>
                  </label>
                  <div className="btn-group">
                    <button
                      className={`btn-opt ${config.sidebarPosition === "left" ? "active" : ""}`}
                      onClick={() =>
                        handleConfigChange("sidebarPosition", "left")
                      }
                    >
                      Left
                    </button>
                    <button
                      className={`btn-opt ${config.sidebarPosition === "right" ? "active" : ""}`}
                      onClick={() =>
                        handleConfigChange("sidebarPosition", "right")
                      }
                    >
                      Right
                    </button>
                  </div>
                </div>
              </section>

              <section className="config-section">
                <h3>Default View</h3>
                <div className="btn-group">
                  <button
                    className={`btn-opt ${config.defaultView === "company" ? "active" : ""}`}
                    onClick={() => handleConfigChange("defaultView", "company")}
                  >
                    Company View
                  </button>
                  <button
                    className={`btn-opt ${config.defaultView === "master" ? "active" : ""}`}
                    onClick={() => handleConfigChange("defaultView", "master")}
                  >
                    Master View
                  </button>
                </div>
              </section>

              <section className="config-section">
                <h3>Display Options</h3>
                <div className="config-option">
                  <label>
                    <input
                      type="checkbox"
                      checked={config.showCompletedByDefault}
                      onChange={(e) =>
                        handleConfigChange(
                          "showCompletedByDefault",
                          e.target.checked,
                        )
                      }
                    />
                    Show Completed TODOs by Default
                  </label>
                </div>
              </section>
            </div>

            <div className="config-footer">
              <p className="info-text">
                ✓ Settings are saved automatically to your browser
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .config-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          padding: 20px;
        }

        .config-modal {
          background: var(--card);
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          color: var(--text);
        }

        .config-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          background: var(--card);
          z-index: 100;
        }

        .config-header h2 {
          margin: 0;
          font-size: 20px;
          color: var(--text);
        }

        .btn-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--text);
          opacity: 0.5;
          padding: 0;
          transition: opacity 0.2s;
        }

        .btn-close:hover {
          opacity: 1;
        }

        .config-content {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .config-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .config-section h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: var(--text);
          opacity: 0.7;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .themes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
        }

        .theme-card {
          background: var(--card);
          border: 2px solid;
          border-color: rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          color: var(--text);
        }

        .theme-card:hover {
          border-color: var(--primary);
          box-shadow: 0 4px 12px var(--primary);
          opacity: 0.8;
        }

        .theme-card.active {
          border-color: var(--primary);
          background-color: rgba(0, 0, 0, 0.05);
          box-shadow: 0 0 0 3px var(--primary);
          opacity: 0.2;
        }

        .theme-preview {
          display: flex;
          gap: 4px;
          margin-bottom: 8px;
        }

        .color-swatch {
          flex: 1;
          height: 30px;
          border-radius: 4px;
        }

        .theme-card h4 {
          margin: 8px 0 4px 0;
          font-size: 13px;
          color: var(--text);
        }

        .theme-card p {
          margin: 0;
          font-size: 11px;
          color: var(--text);
          opacity: 0.6;
          line-height: 1.3;
        }

        .config-option {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .config-option label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          cursor: pointer;
          color: var(--text);
        }

        .config-option input[type="checkbox"] {
          cursor: pointer;
          width: 16px;
          height: 16px;
          accent-color: var(--primary);
        }

        .help-text {
          display: block;
          font-size: 12px;
          color: var(--text);
          opacity: 0.6;
          margin-left: 24px;
        }

        .btn-group {
          display: flex;
          gap: 8px;
        }

        .btn-opt {
          flex: 1;
          padding: 8px 12px;
          background-color: var(--card);
          border: 1px solid;
          border-color: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
          transition: all 0.2s;
        }

        .btn-opt:hover {
          border-color: var(--primary);
          background-color: rgba(0, 0, 0, 0.05);
        }

        .btn-opt.active {
          background-color: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .config-footer {
          padding: 16px 24px;
          border-top: 1px solid;
          border-color: rgba(0, 0, 0, 0.1);
          background-color: var(--card);
          text-align: center;
        }

        .info-text {
          margin: 0;
          font-size: 12px;
          color: var(--primary);
        }

        @media (max-width: 768px) {
          .config-modal {
            max-height: 90vh;
          }

          .config-header {
            padding: 16px;
          }

          .config-content {
            padding: 16px;
            gap: 16px;
          }

          .themes-grid {
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          }
        }
      `}</style>
    </>
  )
}

export default ConfigManager
