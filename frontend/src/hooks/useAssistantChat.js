// frontend/src/hooks/useAssistantChat.js
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_URL, ASSISTANT_URL } from "../config";

const apiBase = API_URL.replace(/\/$/, "");
const assistantBase = ASSISTANT_URL.replace(/\/$/, "");

// Simple ID generator
const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Max size of what we persist into Mongo for a single message
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
 *   mode       - "assistant" or "chat"
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
        // 2) Call Python assistant via /mcp/chat
        const chatRes = await fetch(`${assistantBase}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Backend expects `message` (NOT `input`)
            message: text,
            model,
            mode,
            session_id: sid,
          }),
        });


        if (!chatRes.ok) {
          const body = await chatRes.json().catch(() => ({}));
          throw new Error(
            body.error || `Assistant request failed (${chatRes.status})`
          );
        }

        const data = await chatRes.json();

        // Prefer `response` field if present
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

        // 4) Persist both messages to Node/Mongo (best-effort)
        try {
          const storedAssistantContent =
            normalizeAssistantPayloadForStorage(displayContent);

          await axios.post(
            `${apiBase}/assistant/sessions/${encodeURIComponent(sid)}/append`,
            {
              model,
              messages: [
                { role: "user", content: text },
                { role: "assistant", content: storedAssistantContent },
              ],
            }
          );
        } catch (persistErr) {
          console.error(
            "[assistant] failed to persist session history:",
            persistErr
          );
          // Do NOT surface to user; chat already worked.
        }
      } catch (err) {
        console.error("[assistant] send error:", err);
        let msg = "The assistant glitched out. Try again in a moment.";

        if (err?.message?.includes("Failed to fetch")) {
          msg = "Cannot reach assistant service. Check server or network.";
        } else if (err?.message?.startsWith("Assistant request failed (5")) {
          msg = "Assistant backend threw a 5xx error. Check logs on the server.";
        }

        setError(msg);
      }
      setLoading(false);
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
