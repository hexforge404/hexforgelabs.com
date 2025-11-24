// frontend/src/hooks/useAssistantChat.js
import { useState, useCallback } from "react";
import axios from "axios";
import { ASSISTANT_URL } from "../config";

// Simple ID helper
const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/**
 * HexForge Assistant chat hook
 *
 * Usage:
 * const {
 *   messages, input, setInput, loading, error,
 *   send, resetError
 * } = useAssistantChat({ mode: "assistant", model: activeModel, sessionId });
 */
export function useAssistantChat(options = {}) {
  const { mode = "assistant", model, sessionId } = options;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetError = useCallback(() => setError(""), []);

  const send = useCallback(
    async (overrideText) => {
      const text = (overrideText ?? input).trim();
      if (!text || loading) return;

      setLoading(true);
      setError("");

      // push user message immediately for snappy UI
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: "user", content: text },
      ]);
      if (!overrideText) {
        setInput("");
      }

      try {
        const res = await axios.post(
          `${ASSISTANT_URL.replace(/\/$/, "")}/chat`,
          {
            message: text,
            mode,
            model,
            session_id: sessionId, // 🔗 send active session to backend
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = res.data || {};
        const content =
          typeof data.response === "string"
            ? data.response
            : JSON.stringify(data, null, 2);

        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: "assistant", content },
        ]);
      } catch (err) {
        console.error("[assistant] send error:", err);
        let msg = "Something went wrong talking to the assistant.";
        if (err.response && err.response.data && err.response.data.response) {
          msg = String(err.response.data.response);
        } else if (err.message) {
          msg = err.message;
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, mode, model, sessionId]
  );

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
