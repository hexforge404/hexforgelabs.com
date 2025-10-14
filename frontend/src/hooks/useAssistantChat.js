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
  const generateId = () => "-" + Math.random().toString(36).slice(2, 9);

  // Save chat history to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  // Ping backend on load to show status
  useEffect(() => {
    checkPing().then((ok) => setStatus(ok ? "online" : "offline"));
  }, []);

  // Auto-focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Send message to assistant
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { ...addUserMessage(input), id: generateId() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const isCommand = input.trim().startsWith("!");
    const responseTime = new Date().toLocaleTimeString();

    try {
      // ✅ Use /mcp/chat for both normal and command messages
      const res = await fetch(`${ASSISTANT_URL}/mcp/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }), // FIXED: was { prompt: input }
      });

      // If command: expect a short JSON response
      if (isCommand) {
        const json = await res.json().catch(() => null);
        const reply = parseAssistantReply(json);
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

        // Create placeholder message with “▌” cursor
        setMessages((prev) => [
          ...prev,
          { id: generateId(), from: "assistant", text: "▌", time: responseTime },
        ]);

        // Read and append streamed chunks
        await parseSSEStream(res.body.getReader(), (chunk) => {
          setMessages((prev) => {
            const safePrev = prev ?? [];
            const last = safePrev[safePrev.length - 1];
            const lastText = (last?.text ?? "").replace(/▌$/, "");
            const updated = updateLastAssistantMessage(safePrev, lastText + chunk + "▌");

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
