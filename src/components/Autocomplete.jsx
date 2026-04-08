import React, { useState, useRef, useEffect } from "react"

function Autocomplete({
  value,
  onChange,
  suggestions = [],
  placeholder = "",
  className = "",
  renderSuggestion,
  inputId,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [inputValue, setInputValue] = useState(value || "")
  const wrapperRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    setInputValue(value || "")
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filtered = suggestions.filter((s) => {
    const label = typeof s === "string" ? s : s.name || s.label || ""
    return label.toLowerCase().includes(inputValue.toLowerCase())
  })

  const handleSelect = (suggestion) => {
    const val = typeof suggestion === "string" ? suggestion : suggestion.name || suggestion.label || ""
    setInputValue(val)
    onChange(val, suggestion)
    setIsOpen(false)
    setHighlightIndex(-1)
  }

  const handleInputChange = (e) => {
    setInputValue(e.target.value)
    onChange(e.target.value)
    setIsOpen(true)
    setHighlightIndex(-1)
  }

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsOpen(true)
      return
    }

    if (!isOpen) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1))
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault()
      handleSelect(filtered[highlightIndex])
    } else if (e.key === "Escape") {
      setIsOpen(false)
      setHighlightIndex(-1)
    }
  }

  useEffect(() => {
    if (listRef.current && highlightIndex >= 0) {
      const item = listRef.current.children[highlightIndex]
      if (item) item.scrollIntoView({ block: "nearest" })
    }
  }, [highlightIndex])

  const listId = `ac-list-${placeholder.replace(/\s+/g, "-").toLowerCase() || "dropdown"}`

  return (
    <div className={`ac-wrapper ${className}`} ref={wrapperRef}>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={isOpen && filtered.length > 0}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={highlightIndex >= 0 ? `${listId}-option-${highlightIndex}` : undefined}
        className="ac-input"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {isOpen && filtered.length > 0 && (
        <div className="ac-dropdown" role="listbox" id={listId} ref={listRef}>
          {filtered.map((suggestion, i) => {
            const label = typeof suggestion === "string" ? suggestion : suggestion.name || suggestion.label || ""
            return (
              <div
                key={label + i}
                id={`${listId}-option-${i}`}
                role="option"
                aria-selected={i === highlightIndex}
                className={`ac-item ${i === highlightIndex ? "highlighted" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(suggestion)
                }}
                onMouseEnter={() => setHighlightIndex(i)}
              >
                {renderSuggestion ? renderSuggestion(suggestion, inputValue) : label}
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        .ac-wrapper {
          position: relative;
          flex: 1;
        }

        .ac-input {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 13px;
          color: var(--text);
          background: var(--background);
          font-family: inherit;
          box-sizing: border-box;
        }

        .ac-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
        }

        .ac-input::placeholder {
          color: var(--text-muted);
        }

        .ac-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 50;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          max-height: 180px;
          overflow-y: auto;
          margin-top: 2px;
        }

        .ac-dropdown::-webkit-scrollbar {
          width: 4px;
        }
        .ac-dropdown::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 2px;
        }

        .ac-item {
          padding: 8px 10px;
          font-size: 13px;
          color: var(--text);
          cursor: pointer;
          transition: background 0.1s;
        }

        .ac-item:hover,
        .ac-item.highlighted {
          background: var(--background);
          color: var(--primary);
        }
      `}</style>
    </div>
  )
}

export default Autocomplete
