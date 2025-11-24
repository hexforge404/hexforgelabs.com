import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ASSISTANT_URL, API_URL } from "../config";

// Simple ID generator
const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

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
    if (!sessionId) return;

    let mounted = true;

    async function loadSession() {
      try {
        const url = `${API_URL}/assistant-sessions/${sessionId}`;
        const res = await axios.get(url);
        const data = res.data || {};

        if (!mounted) return;

        const loaded = (data.messages || []).map((m) => ({
          id: makeId(),
          role: m.role,
          content: m.content,
        }));

        setMessages(loaded);
      } catch (err) {
        console.error("[assistant] failed to load session", err);
      }
    }

    loadSession();
    return () => {
      mounted = false;
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

      // UI: push user message immediately
      const userMsg = { id: makeId(), role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      if (!overrideText) setInput("");

      try {
        // Call the assistant service (default /mcp/chat)
        const res = await axios.post(
          `${ASSISTANT_URL.replace(/\/$/, "")}/chat`,
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
        const content =
          typeof data.response === "string"
            ? data.response
            : JSON.stringify(data, null, 2);

        const assistantMsg = {
          id: makeId(),
          role: "assistant",
          content,
        };

        // UI update
        setMessages((prev) => [...prev, assistantMsg]);

        // (Optional) Local copy? Backend already saves via Python → Express
      } catch (err) {
        console.error("[assistant] send error:", err);
        let msg = "Something went wrong talking to the assistant.";

        if (err?.response?.data?.response)
          msg = String(err.response.data.response);
        else if (err.message) msg = err.message;

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
