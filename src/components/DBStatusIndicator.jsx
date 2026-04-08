import React, { useState, useEffect } from "react"
import { syncManager } from "../utils/syncManager"

/**
 * Subtle dot in the bottom-right corner that reflects live database
 * connectivity. Green = connected, red = disconnected.
 * Clicking it opens the Database tab in Settings.
 */
export default function DBStatusIndicator({ onOpenSettings }) {
  const [available, setAvailable] = useState(syncManager.available)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    const unsub = syncManager.onStatusChange(({ type }) => {
      setAvailable(type === "online")
    })
    return unsub
  }, [])

  const label = available
    ? "Database connected"
    : "Database disconnected — click to configure"

  return (
    <div
      style={{
        position: "fixed",
        bottom: 84,
        right: 23,
        zIndex: 39,
      }}
    >
      <div
        data-testid="db-status-dot"
        role="button"
        tabIndex={0}
        aria-label={label}
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: available ? "#2ecc71" : "#e74c3c",
          cursor: "pointer",
          boxShadow: available
            ? "0 0 0 3px rgba(46,204,113,0.2)"
            : "0 0 0 3px rgba(231,76,60,0.2)",
          transition: "background-color 0.4s, box-shadow 0.4s",
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={onOpenSettings}
        onKeyDown={(e) => e.key === "Enter" && onOpenSettings && onOpenSettings()}
      />

      {showTooltip && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            right: 0,
            background: "rgba(0,0,0,0.78)",
            color: "#fff",
            fontSize: 11,
            lineHeight: 1.4,
            padding: "5px 9px",
            borderRadius: 5,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {label}
        </div>
      )}
    </div>
  )
}
