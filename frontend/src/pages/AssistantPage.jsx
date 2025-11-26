// frontend/src/pages/AssistantPage.jsx
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAssistantChat } from "../hooks/useAssistantChat";
import { useAssistantSessions } from "../hooks/useAssistantSessions";
import "./AssistantPage.css";

// Available model chips
const MODEL_OPTIONS = ["Lab Core", "Tool Runner", "HexForge Scribe"];

// Pinned system sessions (we avoid showing delete for these)
const PINNED_SESSION_IDS = new Set([
  "current",
  "skull-badusb",
  "recon-unit",
  "content-notes",
]);

const AssistantPage = () => {
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  // Boot sequence state
  const [bootStage, setBootStage] = useState(0);
  const [bootDone, setBootDone] = useState(false);

  // Sidebar collapsed -> hide history column
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sidebar active tab
  const [activeTab, setActiveTab] = useState("chats"); // 'chats' | 'projects' | 'models'

  // Simple project list (visual only for now)
  const [projectItems, setProjectItems] = useState([]);
  const [projectCounter, setProjectCounter] = useState(1);

  // Active model for assistant routing
  const [activeModel, setActiveModel] = useState("HexForge Scribe");

  // Lab browser state (iframe on the right)
  const [browserUrl, setBrowserUrl] = useState("https://hexforgelabs.com");
  const [browserInput, setBrowserInput] = useState("https://hexforgelabs.com");

  // Which session's overflow menu is open (for ⋯ menu)
  const [sessionMenuOpenId, setSessionMenuOpenId] = useState(null);

  // 🔹 Session management hook (Mongo-backed)
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    createNewSession,
    renameSession,
    deleteSession,
    loading: sessionsLoading,
    error: sessionsError,
    clearError: clearSessionsError,
  } = useAssistantSessions();

  // 🔹 Chat hook – pass mode + model + active sessionId
  const { messages, input, setInput, loading, error, send, resetError } =
    useAssistantChat({
      mode: "assistant",
      model: activeModel,
      sessionId: activeSessionId,
    });

  // Auto scroll chat
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, loading]);

  // Boot sequence animation
  useEffect(() => {
    const timeouts = [
      setTimeout(() => setBootStage(1), 200),
      setTimeout(() => setBootStage(2), 650),
      setTimeout(() => setBootStage(3), 1150),
      setTimeout(() => setBootStage(4), 1650),
      setTimeout(() => {
        setBootStage(5);
        setBootDone(true);
      }, 2200),
    ];

    return () => timeouts.forEach(clearTimeout);
  }, []);

  // Assistant → Lab Browser auto URL
  useEffect(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");

    if (!lastAssistant) return;

    const urlMatch = lastAssistant.content.match(
      /(https?:\/\/[^\s,)>\\]]+)|(hexforgelabs\.com[^\s,)>\\]]*)/i
    );

    if (!urlMatch) return;

    let url = urlMatch[0];
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    if (url !== browserUrl) {
      setBrowserUrl(url);
      setBrowserInput(url);
    }
  }, [messages, browserUrl]);

  const handleChange = useCallback(
    (e) => {
      if (error) resetError();
      setInput(e.target.value);
    },
    [error, resetError, setInput]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!loading && bootDone) {
          send();
        }
      }
    },
    [send, loading, bootDone]
  );

  const handleClickSend = useCallback(() => {
    if (!loading && bootDone && input.trim()) {
      send();
    }
  }, [send, loading, bootDone, input]);

  const handleToolClick = useCallback(
    (cmd) => {
      if (loading || !bootDone) return;
      setInput(cmd);
      send(cmd);
    },
    [loading, bootDone, setInput, send]
  );

  const handleBrowserGo = useCallback(
    (e) => {
      e.preventDefault();
      let url = browserInput.trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
      }
      setBrowserUrl(url);
      setBrowserInput(url);
    },
    [browserInput]
  );

  const browserDisabled = !bootDone;

  // --- New session / project handlers ---

  const handleNewSession = useCallback(async () => {
    clearSessionsError();
    const created = await createNewSession();
    if (created && created.id) {
      setActiveSessionId(created.id);
    }
    setSessionMenuOpenId(null);
  }, [clearSessionsError, createNewSession, setActiveSessionId]);

  const handleNewProject = useCallback(() => {
    setProjectItems((prev) => {
      const id = `project-${projectCounter}`;
      const label = `Untitled project ${projectCounter}`;
      setProjectCounter((n) => n + 1);
      return [...prev, { id, label }];
    });
  }, [projectCounter]);

  const handleSelectSession = useCallback(
    (id) => {
      clearSessionsError();
      resetError();
      setActiveSessionId(id);
      setSessionMenuOpenId(null);
    },
    [clearSessionsError, resetError, setActiveSessionId]
  );

  const handleRenameSession = useCallback(
    (session) => {
      const currentTitle = session.title || session.id;
      const next = window.prompt("Rename session:", currentTitle);
      if (!next || next.trim() === "" || next === currentTitle) {
        setSessionMenuOpenId(null);
        return;
      }
      renameSession(session.id, next.trim());
      setSessionMenuOpenId(null);
    },
    [renameSession]
  );

  const handleDeleteSession = useCallback(
    (session) => {
      if (PINNED_SESSION_IDS.has(session.id)) {
        window.alert(
          "This is a pinned system session. You can rename it, but not delete it."
        );
        setSessionMenuOpenId(null);
        return;
      }
      const ok = window.confirm(
        `Delete session "${session.title || session.id}" and its messages?`
      );
      if (!ok) {
        setSessionMenuOpenId(null);
        return;
      }
      deleteSession(session.id);
      setSessionMenuOpenId(null);
    },
    [deleteSession]
  );

  return (
    <div className="hf-assistant-page">
      <header className="hf-assistant-header">
        <div className="hf-assistant-logo">⚙ HexForge Assistant Lab</div>
        <button
          className="hf-assistant-history-toggle"
          onClick={() => setSidebarCollapsed((v) => !v)}
        >
          {sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        </button>
      </header>

      <main
        className={
          "hf-assistant-main" +
          (sidebarCollapsed ? " hf-assistant-main--no-history" : "")
        }
      >
        {/* Left column: session sidebar */}
        <aside
          className={
            "hf-assistant-history" +
            (sidebarCollapsed ? " hf-assistant-history--hidden" : "")
          }
        >
          <div className="hf-side-header">
            <span className="hf-side-header-title">SESSION HISTORY</span>
          </div>

          <div className="hf-side-tabs">
            <button
              type="button"
              className={
                "hf-side-tab" + (activeTab === "chats" ? " is-active" : "")
              }
              onClick={() => setActiveTab("chats")}
            >
              Chats
            </button>
            <button
              type="button"
              className={
                "hf-side-tab" + (activeTab === "projects" ? " is-active" : "")
              }
              onClick={() => setActiveTab("projects")}
            >
              Projects
            </button>
            <button
              type="button"
              className={
                "hf-side-tab" + (activeTab === "models" ? " is-active" : "")
              }
              onClick={() => setActiveTab("models")}
            >
              Models
            </button>
          </div>

          <div className="hf-side-actions">
            {activeTab === "chats" && (
              <button
                type="button"
                className="hf-assistant-toolbar-chip hf-side-add-button"
                onClick={handleNewSession}
                disabled={sessionsLoading}
              >
                + New session
              </button>
            )}
            {activeTab === "projects" && (
              <button
                type="button"
                className="hf-assistant-toolbar-chip hf-side-add-button"
                onClick={handleNewProject}
              >
                + New project
              </button>
            )}
          </div>

          {/* Chats tab: real sessions from backend */}
          {activeTab === "chats" && (
            <div className="hf-side-list">
              {sessionsError && (
                <div className="hf-side-item is-error">{sessionsError}</div>
              )}

              {sessionsLoading && sessions.length === 0 && (
                <div className="hf-side-item is-disabled">
                  Loading sessions…
                </div>
              )}

              {sessions.length === 0 && !sessionsLoading && !sessionsError && (
                <div className="hf-side-item is-disabled">
                  No sessions yet. Create one to get started.
                </div>
              )}

              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={
                    "hf-side-item" +
                    (s.id === activeSessionId ? " is-active" : "")
                  }
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectSession(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      handleSelectSession(s.id);
                  }}
                >
                  <span className="hf-side-item-label">
                    {s.title || s.sessionId || s.id}
                  </span>

                  {/* ⋯ overflow trigger */}
                  <button
                    type="button"
                    className="hf-side-item-options"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSessionMenuOpenId((prev) =>
                        prev === s.id ? null : s.id
                      );
                    }}
                    aria-label={`Session options for ${
                      s.title || s.sessionId || s.id
                    }`}
                  >
                    ⋯
                  </button>

                  {/* Overflow menu */}
                  {sessionMenuOpenId === s.id && (
                    <div
                      className="hf-side-item-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleRenameSession(s)}
                      >
                        Rename
                      </button>
                      {!PINNED_SESSION_IDS.has(s.id) && (
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => handleDeleteSession(s)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Projects tab */}
          {activeTab === "projects" && (
            <div className="hf-side-list">
              {projectItems.length === 0 && (
                <div className="hf-side-item is-disabled">
                  No projects yet. Create one to pin an assistant session.
                </div>
              )}
              {projectItems.map((p) => (
                <div key={p.id} className="hf-side-item is-disabled">
                  {p.label}
                </div>
              ))}
            </div>
          )}

          {/* Models tab – duplicate model selector view */}
          {activeTab === "models" && (
            <div className="hf-side-list">
              {MODEL_OPTIONS.map((m) => (
                <div
                  key={m}
                  className={
                    "hf-side-item" + (activeModel === m ? " is-active" : "")
                  }
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveModel(m)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setActiveModel(m);
                  }}
                >
                  {m}
                </div>
              ))}
            </div>
          )}

          <div className="hf-side-footer">
            <span className="hf-side-label">ACTIVE MODEL:</span>
            <div className="hf-model-chips">
              {MODEL_OPTIONS.map((m) => (
                <span
                  key={m}
                  className={
                    "hf-model-chip " + (activeModel === m ? "is-active" : "")
                  }
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveModel(m)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setActiveModel(m);
                  }}
                >
                  {m}
                </span>
              ))}
            </div>

            <p className="hf-side-note">
              (Every request now carries{" "}
              <code>model=&quot;{activeModel}&quot;</code> and{" "}
              <code>session_id=&quot;{activeSessionId}&quot;</code> so the
              backend can keep separate context per model/session.)
            </p>
          </div>
        </aside>

        {/* Center: assistant shell */}
        <section className="hf-assistant-shell">
          {/* Boot overlay */}
          {!bootDone && (
            <div className="hf-boot-overlay">
              <div className="hf-boot-window">
                <div className="hf-boot-title">
                  HexForge Assistant • Boot Sequence
                </div>
                <ul className="hf-boot-lines">
                  <li className={bootStage >= 1 ? "is-visible" : ""}>
                    [1/4] Initializing assistant core…
                  </li>
                  <li className={bootStage >= 2 ? "is-visible" : ""}>
                    [2/4] Loading tools: <code>!os</code>,{" "}
                    <code>!uptime</code>, <code>!df</code>,{" "}
                    <code>!docker</code>…
                  </li>
                  <li className={bootStage >= 3 ? "is-visible" : ""}>
                    [3/4] Linking Script Lab, Store, Blog, Lab Browser…
                  </li>
                  <li className={bootStage >= 4 ? "is-visible" : ""}>
                    [4/4] Model online: <strong>HexForge&nbsp;Scribe</strong>
                  </li>
                </ul>
                <div className="hf-boot-footer">
                  <span
                    className={
                      "hf-boot-status-dot " +
                      (bootStage >= 4 ? "is-ready" : "")
                    }
                  />
                  <span className="hf-boot-status-label">
                    {bootStage < 4 ? "Warming up…" : "Ready"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="hf-assistant-toolbar">
            <span className="hf-assistant-toolbar-label">Tools:</span>
            <button
              type="button"
              className="hf-assistant-toolbar-chip"
              onClick={() => handleToolClick("!os")}
              disabled={loading || !bootDone}
            >
              !os
            </button>
            <button
              type="button"
              className="hf-assistant-toolbar-chip"
              onClick={() => handleToolClick("!uptime")}
              disabled={loading || !bootDone}
            >
              !uptime
            </button>
            <button
              type="button"
              className="hf-assistant-toolbar-chip"
              onClick={() => handleToolClick("!df")}
              disabled={loading || !bootDone}
            >
              !df
            </button>
            <button
              type="button"
              className="hf-assistant-toolbar-chip"
              onClick={() => handleToolClick("!docker")}
              disabled={loading || !bootDone}
            >
              !docker
            </button>
          </div>

          <div className="hf-assistant-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={
                  "hf-assistant-message " +
                  (msg.role === "assistant"
                    ? "hf-assistant-message--assistant"
                    : "hf-assistant-message--user")
                }
              >
                <div className="hf-assistant-message-role">
                  {msg.role === "assistant" ? "Assistant" : "You"}
                </div>
                <div className="hf-assistant-message-body">
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="hf-assistant-message hf-assistant-message--assistant">
                <div className="hf-assistant-message-role">Assistant</div>
                <div className="hf-assistant-message-body hf-assistant-typing">
                  Running tools…
                </div>
              </div>
            )}

            {error && <div className="hf-assistant-error">{error}</div>}

            <div ref={bottomRef} />
          </div>

          <footer className="hf-assistant-input-bar">
            <textarea
              ref={inputRef}
              className="hf-assistant-input"
              placeholder={
                bootDone
                  ? "Type a question or command…"
                  : "Assistant is booting…"
              }
              aria-label="Assistant message"
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={loading || !bootDone}
              rows={1}
            />
            <button
              type="button"
              className="hf-assistant-send"
              onClick={handleClickSend}
              disabled={loading || !bootDone || !input.trim()}
              aria-label="Send message"
            >
              Send
            </button>
          </footer>
        </section>

        {/* Right: Lab browser column */}
        <aside className="hf-lab-browser">
          <div className="hf-lab-browser-header">
            <span className="section-label">LAB BROWSER</span>
          </div>

          <form className="hf-lab-browser-bar" onSubmit={handleBrowserGo}>
            <input
              type="text"
              className="hf-lab-browser-input"
              value={browserInput}
              onChange={(e) => setBrowserInput(e.target.value)}
              disabled={browserDisabled}
              aria-label="Lab browser address"
            />
            <button
              type="submit"
              className="hf-lab-browser-go"
              disabled={browserDisabled}
            >
              Go
            </button>
          </form>

          <div className="hf-lab-browser-frame">
            <iframe
              title="HexForge Lab Browser"
              src={browserUrl}
              className="hf-lab-browser-iframe"
            />
            <p className="hf-lab-browser-caption">
              The assistant can describe and suggest URLs. As we refine tools,
              we can let it send open-URL instructions to update this panel
              automatically.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default AssistantPage;
