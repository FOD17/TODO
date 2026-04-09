import React, { useState, useRef, useEffect } from "react"

function AudioTab({ company, audioMessages, onAddAudioMessage, onDeleteAudioMessage }) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [title, setTitle] = useState("")
  const [playingId, setPlayingId] = useState(null)
  const [error, setError] = useState("")

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)
  // Map of id → HTMLAudioElement
  const audioEls = useRef({})

  const filteredMessages = audioMessages
    .filter((m) => company === "All" || m.company === company)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const startRecording = async () => {
    setError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Pick best supported mime type
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", ""].find(
        (t) => !t || MediaRecorder.isTypeSupported(t),
      )

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        })
        const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000)

        const reader = new FileReader()
        reader.onloadend = () => {
          if (reader.error) {
            console.error("[AudioTab] FileReader failed to encode recording:", reader.error)
            setError("Failed to encode recording.")
            return
          }
          const message = {
            id: Date.now().toString(),
            title: title.trim() || `Recording ${new Date().toLocaleDateString()}`,
            company: company === "All" ? "" : company,
            dataUrl: reader.result,
            durationSeconds,
            createdAt: new Date().toISOString(),
          }
          onAddAudioMessage(message)
          setTitle("")
          setRecordingTime(0)
        }
        reader.onerror = () => {
          console.error("[AudioTab] FileReader error encoding recording blob")
          setError("Failed to save recording.")
        }
        reader.readAsDataURL(blob)
      }

      recorder.start()
      startTimeRef.current = Date.now()
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(
        () => setRecordingTime((t) => t + 1),
        1000,
      )
    } catch (err) {
      setError("Could not access microphone: " + err.message)
    }
  }

  const stopRecording = () => {
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }

  const handlePlay = (id) => {
    // Pause any currently playing audio
    if (playingId && audioEls.current[playingId]) {
      audioEls.current[playingId].pause()
      audioEls.current[playingId].currentTime = 0
    }

    if (playingId === id) {
      setPlayingId(null)
      return
    }

    const el = audioEls.current[id]
    if (el) {
      el.play().catch((e) => console.warn(`[AudioTab] Audio play failed for id=${id}:`, e.message))
      setPlayingId(id)
      el.onended = () => setPlayingId(null)
    }
  }

  const handleDelete = (id) => {
    if (playingId === id) {
      audioEls.current[id]?.pause()
      setPlayingId(null)
    }
    onDeleteAudioMessage(id)
  }

  useEffect(() => {
    return () => clearInterval(timerRef.current)
  }, [])

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const formatDate = (iso) =>
    new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <div className="audio-tab">
      {/* Record panel */}
      <div className="record-panel">
        <div className="record-panel-header">
          {isRecording ? (
            <span className="recording-live">
              <span className="rec-dot" />
              Recording — {formatDuration(recordingTime)}
            </span>
          ) : (
            <span className="panel-label">New Recording</span>
          )}
        </div>

        {!isRecording && (
          <input
            className="title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Recording title (optional)"
          />
        )}

        {error && <p className="audio-error">{error}</p>}

        <button
          className={`record-btn ${isRecording ? "stop" : "start"}`}
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? "⏹ Stop" : "⏺ Start Recording"}
        </button>
      </div>

      {/* Messages list */}
      <div className="audio-list">
        {filteredMessages.length === 0 ? (
          <div className="audio-empty">
            <div className="empty-icon-lg">🎙️</div>
            <p>No recordings for {company === "All" ? "any company" : company} yet.</p>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className={`audio-row ${playingId === msg.id ? "playing" : ""}`}
            >
              {/* Hidden audio element */}
              <audio
                ref={(el) => {
                  if (el) audioEls.current[msg.id] = el
                  else delete audioEls.current[msg.id]
                }}
                src={msg.dataUrl}
                preload="metadata"
              />

              <div className="audio-info">
                <span className="audio-title">{msg.title}</span>
                <div className="audio-meta-row">
                  <span className="audio-date">{formatDate(msg.createdAt)}</span>
                  {msg.company && (
                    <span className="audio-company">🏢 {msg.company}</span>
                  )}
                  <span className="audio-duration">
                    ⏱ {formatDuration(msg.durationSeconds)}
                  </span>
                </div>
              </div>

              <div className="audio-controls">
                <button
                  className={`play-btn ${playingId === msg.id ? "active" : ""}`}
                  onClick={() => handlePlay(msg.id)}
                  title={playingId === msg.id ? "Stop" : "Play"}
                >
                  {playingId === msg.id ? "⏸" : "▶"}
                </button>
                <button
                  className="del-btn"
                  onClick={() => handleDelete(msg.id)}
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .audio-tab {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .record-panel {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .record-panel-header {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
        }

        .panel-label {
          color: var(--text);
        }

        .recording-live {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #e74c3c;
          font-weight: 600;
        }

        .rec-dot {
          width: 10px;
          height: 10px;
          background: #e74c3c;
          border-radius: 50%;
          animation: pulse 1s infinite;
          flex-shrink: 0;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .title-input {
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          background: var(--background);
          color: var(--text);
          outline: none;
          transition: border-color 0.15s;
        }

        .title-input:focus {
          border-color: var(--primary);
        }

        .audio-error {
          margin: 0;
          font-size: 13px;
          color: #e74c3c;
        }

        .record-btn {
          align-self: flex-start;
          padding: 8px 20px;
          border-radius: 8px;
          border: none;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
        }

        .record-btn.start {
          background: #e74c3c;
          color: #fff;
        }

        .record-btn.stop {
          background: var(--border);
          color: var(--text);
        }

        .record-btn:hover {
          opacity: 0.85;
        }

        .audio-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .audio-empty {
          text-align: center;
          padding: 48px 20px;
          color: var(--text-muted);
        }

        .empty-icon-lg {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.5;
        }

        .audio-row {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: border-color 0.2s;
        }

        .audio-row.playing {
          border-color: var(--primary);
          background: rgba(52,152,219,0.04);
        }

        .audio-info {
          flex: 1;
          min-width: 0;
        }

        .audio-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          display: block;
          margin-bottom: 4px;
          word-break: break-word;
        }

        .audio-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 12px;
          color: var(--text-muted);
        }

        .audio-company {
          color: #8e44ad;
        }

        .audio-controls {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }

        .play-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid var(--border);
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          color: var(--text);
        }

        .play-btn.active {
          border-color: var(--primary);
          color: var(--primary);
          background: rgba(52,152,219,0.08);
        }

        .play-btn:not(.active):hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .del-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          color: var(--text-muted);
        }

        .del-btn:hover {
          border-color: #e74c3c;
          color: #e74c3c;
        }
      `}</style>
    </div>
  )
}

export default AudioTab
