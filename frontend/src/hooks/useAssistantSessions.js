// frontend/src/hooks/useAssistantSessions.js
import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'hf-assistant-sessions';

const DEFAULT_SESSIONS = [
  { id: 'current', name: 'Current session' },
  { id: 'skull-badusb', name: 'Skull BadUSB planning' },
  { id: 'recon-unit', name: 'Recon Unit recovery' },
  { id: 'content-engine', name: 'Content engine notes' },
];

function loadFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.sessions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function createId() {
  return `hf-session-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function useAssistantSessions() {
  const [sessionsState, setSessionsState] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        sessions: DEFAULT_SESSIONS,
        activeSessionId: DEFAULT_SESSIONS[0].id,
      };
    }

    const stored = loadFromStorage();
    if (stored && stored.sessions.length > 0) {
      return stored;
    }

    return {
      sessions: DEFAULT_SESSIONS,
      activeSessionId: DEFAULT_SESSIONS[0].id,
    };
  });

  const { sessions, activeSessionId } = sessionsState;

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    saveToStorage(sessionsState);
  }, [sessionsState]);

  const setActiveSessionId = (id) => {
    setSessionsState((prev) => {
      if (!prev.sessions.some((s) => s.id === id)) return prev;
      return { ...prev, activeSessionId: id };
    });
  };

  const createSession = (name = 'New session') => {
    const id = createId();
    setSessionsState((prev) => ({
      sessions: [...prev.sessions, { id, name }],
      activeSessionId: id,
    }));
  };

  const renameSession = (id, name) => {
    setSessionsState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.id === id ? { ...s, name: name || s.name } : s
      ),
    }));
  };

  const deleteSession = (id) => {
    setSessionsState((prev) => {
      const remaining = prev.sessions.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        return {
          sessions: DEFAULT_SESSIONS,
          activeSessionId: DEFAULT_SESSIONS[0].id,
        };
      }
      let nextActive = prev.activeSessionId;
      if (prev.activeSessionId === id) {
        nextActive = remaining[0].id;
      }
      return { sessions: remaining, activeSessionId: nextActive };
    });
  };

  return {
    sessions,
    activeSessionId,
    activeSession,
    setActiveSessionId,
    createSession,
    renameSession,
    deleteSession,
  };
}
