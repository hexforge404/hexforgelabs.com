import { useState, useEffect, useRef } from "react";
import { ASSISTANT_URL } from "../config";
import { parseSSEStream } from "../utils/parseSSEStream";
import { parseAssistantReply } from "../utils/parseAssistantReply";
import { addUserMessage, updateLastAssistantMessage } from "../utils/chatHelpers";
import { checkPing } from "../utils/assistant";

// Reusable chat hook for any assistant UI (drawer or full page)
export function useAssistantChat(storageKey = "hexforge_chat") {
  const [messages, setMessages] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : [];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("offline");
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  // Generate a unique id for each message
  const generateId = () => "_" + Math.random().toString(36).substr(2, 9);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  // Ping backend on load
  useEffect(() => {
    checkPing().then((ok) => setStatus(ok ? "online" : "offline"));
  }, []);

  // Auto-focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Send a message
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { ...addUserMessage(input), id: generateId() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const isCommand = input.trim().startsWith("!");
    const responseTime = new Date().toLocaleTimeString();

    try {
      const res = await fetch(`${ASSISTANT_URL}/mcp/${isCommand ? "chat" : "stream"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });

      // Handle command responses (non-stream)
      if (isCommand) {
        const reply = await parseAssistantReply(res);
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            from: "assistant",
            text: reply,
            time: responseTime,
          },
        ]);
      } else {
        // Stream response (SSE)
        if (!res.ok || !res.body) {
          throw new Error(`Streaming connection failed: ${res.status}`);
        }

        setMessages((prev) => [
          ...prev,
          { id: generateId(), from: "assistant", text: "▌", time: responseTime },
        ]);

        await parseSSEStream(res.body.getReader(), (chunk) => {
          setMessages((prev) => {
            const safePrev = prev ?? [];
            const last = safePrev[safePrev.length - 1];

            const updated = updateLastAssistantMessage(
              safePrev,
              (last?.text ?? "").replace(/▌$/, "") + chunk
            );

            // Smooth scroll on chunk updates
            chatRef.current?.scrollTo({
              top: chatRef.current.scrollHeight,
              behavior: "smooth",
            });

            return updated;
          });
        });
      }
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

  // Send message on Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

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
