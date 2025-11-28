// frontend/src/hooks/useAssistantChat.js
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_URL } from "../config";

const apiBase = API_URL.replace(/\/$/, "");

// Simple ID generator
const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Max size of what we persist into Mongo for a single message (kept in case you
// want to clamp inside the backend later)
const MAX_SESSION_MESSAGE_LENGTH = 8000;

function normalizeAssistantPayloadForStorage(payload) {
  let text =
    typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);

  if (text.length > MAX_SESSION_MESSAGE_LENGTH) {
    text =
      text.slice(0, MAX_SESSION_MESSAGE_LENGTH) +
      "\n\n[... output truncated for session history – full tool result was longer ...]";
  }

  return text;
}

/**
 * HexForge Assistant Chat Hook (with session persistence)
 *
 * Props:
 *   model      - "Tool Runner", "Lab Core", "HexForge Scribe"
 *   sessionId  - "session-7", "skull-badusb", etc.
 *   mode       - always "assistant" for now
 */
export function useAssistantChat({ model, sessionId, mode = "assistant" }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetError = useCallback(() => setError(""), []);

  // ---------------------------------------------------------
  // 1) Load session history from backend when sessionId changes
  // ---------------------------------------------------------
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const sid = encodeURIComponent(sessionId);
        const res = await axios.get(
          `${apiBase}/assistant/sessions/${sid}`
        );
        const data = res.data || {};

        const loaded = (data.messages || []).map((m, idx) => ({
          id: m.id || m._id || `${idx}-${m.role}`,
          role: m.role,
          content: m.content,
        }));

        if (!cancelled) {
          setMessages(loaded);
        }
      } catch (err) {
        console.error("[assistant] failed to load session", err);
        if (!cancelled) {
          // Don’t hard-error the UI, just show empty history
          setMessages([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // ---------------------------------------------------------
  // 2) Send a message
  // ---------------------------------------------------------
  const send = useCallback(
    async (overrideInput) => {
      if (loading) return;

      const raw =
        typeof overrideInput === "string" ? overrideInput : input;
      const text = (raw || "").trim();
      if (!text) return;

      const sid = sessionId || "current";

      setLoading(true);
      setError("");

      // 1) Optimistically add user message to UI
      const userMsg = {
        id: makeId(),
        role: "user",
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");

      try {
        // 2) Call Node backend, which will:
        //    - proxy to Python assistant
        //    - persist messages in Mongo
        const res = await fetch(
          `${apiBase}/assistant/sessions/${encodeURIComponent(
            sid
          )}/append`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode,
              model,
              input: text,
            }),
          }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error || `Assistant request failed (${res.status})`
          );
        }

        const data = await res.json();

        const rawResponse =
          typeof data.response !== "undefined" ? data.response : data;

        const displayContent =
          typeof rawResponse === "string"
            ? rawResponse
            : JSON.stringify(rawResponse, null, 2);

        const assistantMsg = {
          id: makeId(),
          role: "assistant",
          content: displayContent,
        };

        // 3) Update UI with assistant message
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        console.error("[assistant] send error:", err);
        let msg = "Something went wrong talking to the assistant.";

        if (err?.response?.data?.error) {
          msg = String(err.response.data.error);
        } else if (err.message) {
          msg = err.message;
        }

        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, sessionId, mode, model]
  );

  // ---------------------------------------------------------
  // Exported API
  // ---------------------------------------------------------
  return {
    messages,
    input,
    setInput,
    loading,
    error,
    send,
    resetError,
  };
}
