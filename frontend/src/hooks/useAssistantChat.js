import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ASSISTANT_URL, API_URL } from "../config";

// Simple ID generator
const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Max size of what we persist into Mongo for a single message
const MAX_SESSION_MESSAGE_LENGTH = 8000;

function normalizeAssistantPayloadForStorage(payload) {
  // Turn any tool / agent payload into readable text
  let text =
    typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);

  // Clamp if it's huge (like docker_ps labels)
  if (text.length > MAX_SESSION_MESSAGE_LENGTH) {
    text =
      text.slice(0, MAX_SESSION_MESSAGE_LENGTH) +
      "\n\n[... output truncated for session history – full tool result was longer ...]";
  }

  return text;
}

/**
 * HexForge Assistant Chat Hook (with full session persistence)
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
        const base = API_URL.replace(/\/$/, "");
        const res = await axios.get(`${base}/assistant-sessions/${sessionId}`);
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
  async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading || !sessionId) return;

    setLoading(true);
    setError("");

    // 1) Push user message into UI immediately
    const userMsg = { id: makeId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    if (!overrideText) setInput("");

    try {
      // 2) Talk to assistant backend (FastAPI)
      const assistantBase = ASSISTANT_URL.replace(/\/$/, "");
      const res = await axios.post(
        `${assistantBase}/chat`,
        {
          message: text,
          mode,
          model,
          session_id: sessionId,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = res.data || {};

      // Raw response from backend – prefer `response` field if present
      const rawResponse =
        typeof data.response !== "undefined" ? data.response : data;

      // What we actually show in the UI (pretty-printed string)
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

      // 4) Persist both messages to Node/Mongo (CLAMPED)
      const apiBase = API_URL.replace(/\/$/, "");

      const storedAssistantContent =
        normalizeAssistantPayloadForStorage(displayContent);

      await axios.post(
        `${apiBase}/assistant-sessions/${sessionId}/append`,
        {
          model,
          messages: [
            { role: "user", content: text },
            { role: "assistant", content: storedAssistantContent },
          ],
        }
      );
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
