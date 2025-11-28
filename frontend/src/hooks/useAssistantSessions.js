// frontend/src/hooks/useAssistantSessions.js
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_URL } from "../config";

const apiBase = API_URL.replace(/\/$/, "");

// These are your “pinned” starter sessions
const DEFAULT_SESSIONS = [
  { id: "current", title: "Current session", model: "HexForge Scribe" },
  { id: "skull-badusb", title: "Skull BadUSB planning", model: "HexForge Scribe" },
  { id: "recon-unit", title: "Recon Unit recovery", model: "HexForge Scribe" },
  { id: "content-notes", title: "Content engine notes", model: "HexForge Scribe" },
];

const ACTIVE_KEY = "hexforge.assistant.activeSessionId";

export function useAssistantSessions() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(
    () => window.localStorage.getItem(ACTIVE_KEY) || "current"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Persist active session id locally so refresh keeps focus
  useEffect(() => {
    if (activeSessionId) {
      window.localStorage.setItem(ACTIVE_KEY, activeSessionId);
    }
  }, [activeSessionId]);

  // Helper: normalise backend session shape
  const normaliseSession = (s) => {
  // Canonical ID for the assistant is the logical sessionId,
  // not the Mongo _id. Force both id and sessionId to match it.
  const sessionId = s.sessionId || s.id;

  return {
    id: sessionId,
    sessionId,
    title: s.title || sessionId || "Untitled session",
    model: s.model || "HexForge Scribe",
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
};


  // 🔁 Load sessions from backend on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const res = await axios.get(`${apiBase}/assistant/sessions`);
        const serverSessions = (res.data?.sessions || []).map(normaliseSession);

        // If DB is empty, seed the default four and save them to backend
        if (!cancelled && serverSessions.length === 0) {
          const seeded = [];

          for (const sess of DEFAULT_SESSIONS) {
            try {
              const createRes = await axios.post(`${apiBase}/assistant/sessions`, {
                sessionId: sess.id,
                title: sess.title,
                model: sess.model,
              });

              seeded.push(normaliseSession(createRes.data.session));
            } catch (e) {
              console.error("[assistantSessions] seed error", e);
            }
          }

          setSessions(seeded);
          if (!seeded.some((s) => s.id === activeSessionId)) {
            setActiveSessionId("current");
          }
          setLoading(false);
          return;
        }

        if (!cancelled) {
          setSessions(serverSessions);
          if (!serverSessions.some((s) => s.id === activeSessionId)) {
            // Fallback to "current" if active one was deleted
            const fallback =
              serverSessions.find((s) => s.id === "current") ||
              serverSessions[0] ||
              null;
            if (fallback) setActiveSessionId(fallback.id);
          }
        }
      } catch (err) {
        console.error("[assistantSessions] load error", err);
        if (!cancelled) {
          setError("Failed to load assistant sessions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []); // run once

  // ➕ Create a new session
  const createNewSession = useCallback(
    async (opts = {}) => {
      const index =
        sessions.filter((s) => s.id?.startsWith("session-")).length + 1;
      const sessionId = `session-${index}`;
      const title = opts.title || `Session ${index}`;
      const model = opts.model || "HexForge Scribe";

      try {
        const res = await axios.post(`${apiBase}/assistant/sessions`, {
          sessionId,
          title,
          model,
        });

        const created = normaliseSession(res.data.session);
        setSessions((prev) => [...prev, created]);
        setActiveSessionId(created.id);
        return created;
      } catch (err) {
        console.error("[assistantSessions] create error", err);
        setError("Failed to create session");
        return null;
      }
    },
    [sessions]
  );

  // ✏️ Rename a session
  const renameSession = useCallback(async (sessionId, newTitle) => {
    newTitle = String(newTitle || "").trim();
    if (!sessionId || !newTitle) return;

    try {
      const res = await axios.patch(
        `${apiBase}/assistant/sessions/${sessionId}`,
        { title: newTitle }
      );
      const updated = normaliseSession(res.data.session);

      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? updated : s))
      );
    } catch (err) {
      console.error("[assistantSessions] rename error", err);
      setError("Failed to rename session");
    }
  }, []);

  // 🗑 Delete a session
  const deleteSession = useCallback(
    async (sessionId) => {
      if (!sessionId) return;
      // Don't allow deleting your pinned “current” unless you really want to
      if (sessionId === "current") {
        console.warn("Skipping delete of pinned 'current' session");
        return;
      }

      try {
        await axios.delete(`${apiBase}/assistant/sessions/${sessionId}`);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));

        if (activeSessionId === sessionId) {
          const fallback =
            sessions.find((s) => s.id === "current") ||
            sessions.find((s) => s.id !== sessionId) ||
            null;
          if (fallback) setActiveSessionId(fallback.id);
        }
      } catch (err) {
        console.error("[assistantSessions] delete error", err);
        setError("Failed to delete session");
      }
    },
    [activeSessionId, sessions]
  );

  // Clear error message
  const clearError = useCallback(() => setError(""), []);

 // frontend/src/hooks/useAssistantSessions.js

const reloadSessions = useCallback(async () => {
  try {
    const res = await axios.get(`${apiBase}/assistant/sessions`);
    const serverSessions = (res.data?.sessions || []).map(normaliseSession);

    setSessions(serverSessions);

    // Keep activeSessionId valid
    setActiveSessionId((current) => {
      if (!current) {
        const first = serverSessions[0];
        return first ? first.id : current;
      }

      if (!serverSessions.some((s) => s.id === current)) {
        const fallback =
          serverSessions.find((s) => s.id === "current") || serverSessions[0];
        return fallback ? fallback.id : current;
      }

      return current;
    });
  } catch (err) {
    console.error("[assistantSessions] reload error", err);
  }
}, []);


  return {
    sessions,          // [{id, title, model, ...}]
    activeSessionId,   // "current", "session-5", etc.
    setActiveSessionId,
    createNewSession,
    renameSession,
    deleteSession,
    loading,
    error,
    clearError,
    reloadSessions,
  };
}
