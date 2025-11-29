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
import { useAssistantProjects } from "../hooks/useAssistantProjects";



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
  
  const [attachLoading, setAttachLoading] = useState(false);



  // Active model for assistant routing
  const [activeModel, setActiveModel] = useState("HexForge Scribe");

  // Lab browser state (iframe on the right)
  const [browserUrl, setBrowserUrl] = useState("https://hexforgelabs.com");
  const [browserInput, setBrowserInput] = useState("https://hexforgelabs.com");

  // Which session's overflow menu is open (for ⋯ menu)
  const [sessionMenuOpenId, setSessionMenuOpenId] = useState(null);
  const [projectMenuOpenId, setProjectMenuOpenId] = useState(null);

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
    reloadSessions,
  } = useAssistantSessions();

   const {
  projects,
  projectsLoading,
  projectsError,
  selectedProject,
  projectSessions,
  projectSessionsLoading,
  projectSessionsError,
  loadProjects,
  createProject,
  renameProject,
  deleteProject,
  selectProject,
  clearProjectsError: clearProjectsApiError,
} = useAssistantProjects();



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

      const handleNewProject = useCallback(async () => {
  // create a basic project (local or backend)
  const created = await createProject("Untitled project");

  // Prompt for a name right after creation
  const currentName = created?.name || "Untitled project";
  const next = window.prompt("New project name:", currentName);

  if (next && next.trim() && next.trim() !== currentName) {
    const projectId = created._id || created.id || created.slug;
    if (projectId) {
      await renameProject(projectId, next.trim());
    }
  }
}, [createProject, renameProject]);

const handleRenameProject = useCallback(
  (project) => {
    if (!project) return;
    const currentName = project.name || project.slug || "Untitled project";
    const next = window.prompt("Rename project:", currentName);
    if (!next || next.trim() === "" || next.trim() === currentName) {
      setProjectMenuOpenId(null);
      return;
    }
    const projectId = project._id || project.id || project.slug;
    if (projectId) {
      renameProject(projectId, next.trim());
    }
    setProjectMenuOpenId(null);
  },
  [renameProject]
);

const handleDeleteProject = useCallback(
  (project) => {
    if (!project) return;
    const label = project.name || project.slug || "Untitled project";
    const ok = window.confirm(
      `Delete project "${label}"?\n\n(This won't delete any underlying sessions yet; it's just a label.)`
    );
    if (!ok) {
      setProjectMenuOpenId(null);
      return;
    }

    const projectId = project._id || project.id || project.slug;
    if (projectId) {
      deleteProject(projectId);
    }

    // Clear selection if we deleted the active project
    if (
      selectedProject &&
      (selectedProject._id === project._id ||
        selectedProject.id === project.id ||
        selectedProject.slug === project.slug)
    ) {
      selectProject(null);
    }

    setProjectMenuOpenId(null);
  },
  [deleteProject, selectedProject, selectProject]
);


const handleAttachCurrentSession = useCallback(
  async () => {
    if (!selectedProject) {
      window.alert("Select a project in the Projects tab first.");
      return;
    }
    if (!activeSessionId) {
      window.alert("You need an active chat session to attach.");
      return;
    }

    // Optional friendly default label
    const defaultLabel = selectedProject.name
      ? `Part – ${selectedProject.name}`
      : "Part label";

    const partLabelInput = window.prompt(
      "Part label for this session (optional):",
      defaultLabel
    );

    const body = {
      projectId: selectedProject._id, // store AssistantProject ObjectId on the session
    };

    if (partLabelInput && partLabelInput.trim()) {
      body.partLabel = partLabelInput.trim();
    }

    setAttachLoading(true);
    try {
      const res = await fetch(
        `/api/assistant/sessions/${encodeURIComponent(
          activeSessionId
        )}/metadata`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.error || `Failed to attach session (${res.status})`
        );
      }

      // Optionally read the response (we don't really need it right now)
      await res.json().catch(() => null);

      // Refresh the selected project's sessions so the right panel updates
      await reloadSessions();
      await selectProject(selectedProject);

      window.alert("Session attached to project.");
    } catch (err) {
      console.error("attachCurrentSession error:", err);
      window.alert(
        `Failed to attach current session:\n\n${err.message || String(err)}`
      );
    } finally {
      setAttachLoading(false);
    }
  },
  [activeSessionId, selectedProject, selectProject, reloadSessions]
);





  const handleSelectSession = useCallback(
    (id) => {
      console.log("[handleSelectSession] clicked", id);
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
            <div className="hf-assistant-projects">
              {/* Project list */}
              <div className="hf-assistant-projects-list">
                <div className="hf-assistant-projects-header">
                  <span className="hf-assistant-projects-title">Projects</span>
                  {projectsLoading && (
                    <span className="hf-assistant-pill hf-assistant-pill--dim">
                      Loading…
                    </span>
                  )}
                </div>

                {projectsError && (
                  <div className="hf-assistant-error">{projectsError}</div>
                )}

                {projects.length === 0 &&
                  !projectsLoading &&
                  !projectsError && (
                    <div className="hf-assistant-empty">
                      No assistant projects yet.
                      <br />
                      You can create them via the UI or API.
                    </div>
                  )}

                <div className="hf-assistant-projects-scroll">
                  {projects.map((project) => {
                    const id = project._id || project.id || project.slug;
                    const isActive =
                      selectedProject &&
                      (selectedProject._id === project._id ||
                        selectedProject.id === project.id ||
                        selectedProject.slug === project.slug);

                    return (
                      <div
                        key={id}
                        className={
                          "hf-side-item hf-assistant-project-row" +
                          (isActive ? " hf-assistant-project-row--active" : "")
                        }
                        role="button"
                        tabIndex={0}
                        onClick={() => selectProject(project)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            selectProject(project);
                          }
                        }}
                      >
                        <div className="hf-assistant-project-row-main">
                          {/* Top line: name + ⋯ menu */}
                          <div className="hf-assistant-project-header">
                            <div className="hf-assistant-project-name">
                              {project.name || "Untitled project"}
                            </div>

                            <button
                              type="button"
                              className="hf-side-item-options"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectMenuOpenId((prev) =>
                                  prev === id ? null : id
                                );
                              }}
                              aria-label={`Project options for ${
                                project.name || project.slug || id
                              }`}
                            >
                              ⋯
                            </button>

                            {projectMenuOpenId === id && (
                              <div
                                className="hf-side-item-menu"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRenameProject(project)
                                  }
                                >
                                  Rename
                                </button>
                                <button
                                  type="button"
                                  className="is-danger"
                                  onClick={() =>
                                    handleDeleteProject(project)
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Second line: status + tags (compact) */}
                          <div className="hf-assistant-project-meta">
                            <span
                              className={`hf-assistant-status-pill hf-assistant-status-pill--${
                                project.status || "active"
                              }`}
                            >
                              {project.status || "active"}
                            </span>

                            {project.tags && project.tags.length > 0 && (
                              <span className="hf-assistant-tags">
                                {project.tags.join(" • ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sessions for selected project */}
              <div className="hf-assistant-project-sessions">
                {!selectedProject && (
                  <div className="hf-assistant-empty hf-assistant-empty--centered">
                    Select a project on the left to see its sessions.
                  </div>
                )}

                {selectedProject && (
                  <>
                    <div className="hf-assistant-project-sessions-header">
                      <div>
                        <div className="hf-assistant-project-sessions-title">
                          {selectedProject.name}
                        </div>
                        <div className="hf-assistant-project-sessions-subtitle">
                          {selectedProject.description ||
                            selectedProject.slug ||
                            ""}
                        </div>
                      </div>

                      <div className="hf-assistant-project-sessions-actions">
                        {projectSessionsLoading && (
                          <span className="hf-assistant-pill hf-assistant-pill--dim">
                            Loading…
                          </span>
                        )}

                        {activeSessionId && (
                          <button
                            type="button"
                            className="hf-assistant-attach-btn"
                            onClick={handleAttachCurrentSession}
                            disabled={
                              attachLoading || projectSessionsLoading
                            }
                          >
                            {attachLoading
                              ? "Attaching…"
                              : "Attach current session"}
                          </button>
                        )}
                        {!activeSessionId && (
                          <div className="hf-assistant-helper-text">
                            Start a chat or select a session first.
                          </div>
                        )}
                      </div>
                    </div>

                    {projectSessionsError && (
                      <div className="hf-assistant-error">
                        {projectSessionsError}
                      </div>
                    )}

                    {projectSessions.length === 0 &&
                      !projectSessionsLoading &&
                      !projectSessionsError && (
                        <div className="hf-assistant-empty">
                          No sessions linked to this project yet.
                          <br />
                          Use “Attach current session” to link one.
                        </div>
                      )}

                    {projectSessions.length > 0 && (
                    <div className="hf-assistant-project-sessions-list">
                      {projectSessions.map((s) => {
                        const rowSessionId = s.sessionId || s.id;

                        return (
                          <div
                            key={rowSessionId}
                            className={
                              "hf-assistant-project-session-row" +
                              (activeSessionId === rowSessionId ? " is-active" : "")
                            }
                            onClick={() => {
                              // 1) switch active session
                              handleSelectSession(rowSessionId);
                              // 2) jump you back to the Chats tab
                              setActiveTab("chats");
                            }}
                          >
                            <div className="hf-assistant-project-session-main">
                              <div className="hf-assistant-project-session-title">
                                {s.partLabel || s.title || rowSessionId}
                              </div>
                              <div className="hf-assistant-project-session-meta">
                                <span className="hf-assistant-pill hf-assistant-pill--tiny">
                                  {s.model || "unknown model"}
                                </span>
                                {s.enginePartId && (
                                  <span className="hf-assistant-pill hf-assistant-pill--tiny">
                                    {s.enginePartId}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="hf-assistant-project-session-path">
                              {s.assetsPath || "No assets path set"}
                            </div>

                            <div className="hf-assistant-project-session-dates">
                              <span>
                                Updated:{" "}
                                {s.updatedAt ? new Date(s.updatedAt).toLocaleString() : "—"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}



                  </>
                )}
              </div>
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
           {messages.map((msg) => {
              const isUser = msg.role === "user";

              // Normalize content
              const content =
                typeof msg.content === "string"
                  ? msg.content
                  : JSON.stringify(msg.content, null, 2);

              // USER MESSAGE
              if (isUser) {
                return (
                  <div
                    key={msg.id || msg._id || Math.random()}
                    className="hf-chat-message hf-chat-message--user"
                  >
                    {content}
                  </div>
                );
              }

              // ASSISTANT MESSAGE (with nice formatting + scrollable)
              return (
                <div
                  key={msg.id || msg._id || Math.random()}
                  className="hf-chat-message hf-chat-message--assistant"
                >
                  <pre className="hf-chat-message-body">
                    {content}
                  </pre>
                </div>
              );
            })}



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
