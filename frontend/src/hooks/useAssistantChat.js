import { useState, useEffect, useRef } from "react";
import { ASSISTANT_URL } from "../config";
import { parseSSEStream } from "../utils/parseSSEStream";
import { addUserMessage, updateLastAssistantMessage } from "../utils/chatHelpers";
import { checkPing } from "../utils/assistant";

// -----------------------------------------------------------
// Safe LocalStorage Loader
// -----------------------------------------------------------
const safeLoadMessages = (key) => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to parse chat history:", err);
    localStorage.removeItem(key);
    return [];
  }
};

// -----------------------------------------------------------
// Main Hook — Reusable Chat Logic
// -----------------------------------------------------------
export function useAssistantChat(storageKey = "hexforge_chat") {
  const [messages, setMessages] = useState(() => safeLoadMessages(storageKey));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("offline");
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  // --- Helper: generate unique IDs ---
  const generateId = () => "-" + Math.random().toString(36).slice(2, 9);

  // --- Persist messages to localStorage ---
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (err) {
      console.error("Failed to persist chat:", err);
    }
  }, [messages, storageKey]);

  // --- Ping backend once on mount ---
  useEffect(() => {
    checkPing().then((ok) => setStatus(ok ? "online" : "offline"));
  }, []);

  // --- Auto-focus input ---
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // -------------------------------------------------
  // Main send function (handles commands + streaming)
  // -------------------------------------------------
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { ...addUserMessage(input), id: generateId() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const isCommand = input.trim().startsWith("!");
    const responseTime = new Date().toLocaleTimeString();

    try {
      const res = await fetch(`${ASSISTANT_URL}/mcp/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      // --------------------------
      // Handle Command Responses
      // --------------------------
      if (isCommand) {
        let text = "(empty)";
        try {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const data = await res.json();
            text =
              typeof data === "string"
                ? data
                : data?.response || JSON.stringify(data, null, 2);
          } else {
            text = await res.text();
          }
        } catch (err) {
          console.error("Command parse error:", err);
          text = `(Error parsing response: ${err.message})`;
        }

        setMessages((prev) => [
          ...prev,
          { id: generateId(), from: "assistant", text, time: responseTime },
        ]);

        // ✅ Exit early so we don't trigger streaming logic
        return;
      }

      // --------------------------
      // Handle Streaming Responses
      // --------------------------
      if (!res.ok || !res.body)
        throw new Error(`Streaming connection failed: ${res.status}`);

      // Create placeholder assistant message with “▌” cursor
      setMessages((prev) => [
        ...prev,
        { id: generateId(), from: "assistant", text: "▌", time: responseTime },
      ]);

      // Process streamed chunks from the reader
      await parseSSEStream(res.body.getReader(), (chunk) => {
        setMessages((prev) => {
          const safePrev = prev ?? [];
          const last = safePrev[safePrev.length - 1];
          const lastText = (last?.text ?? "").replace(/▌$/, "");
          const updated = updateLastAssistantMessage(
            safePrev,
            lastText + chunk + "▌"
          );

          chatRef.current?.scrollTo({
            top: chatRef.current.scrollHeight,
            behavior: "smooth",
          });

          return updated;
        });
      });
    } catch (err) {
      console.error("Assistant error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          from: "assistant",
          text: "(Error connecting to assistant)",
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        chatRef.current?.scrollTo({
          top: chatRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  };

  // --- Send message on Enter ---
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  // --- Expose state and handlers ---
  return {
    messages,
    setMessages,
    input,
    setInput,
    loading,
    status,
    chatRef,
    inputRef,
    sendMessage,
    handleKeyDown,
  };
}
