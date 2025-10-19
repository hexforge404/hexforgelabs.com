import { useState, useEffect, useRef } from "react";
import { ASSISTANT_URL } from "../config";
import { parseSSEStream } from "../utils/parseSSEStream";
import { addUserMessage, updateLastAssistantMessage } from "../utils/chatHelpers";
import { checkPing } from "../utils/assistant";

// Safe message loader
const safeLoadMessages = (key) => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Resetting corrupted chat:", err);
    localStorage.removeItem(key);
    return [];
  }
};

export function useAssistantChat(storageKey = "hexforge_chat") {
  const [messages, setMessages] = useState(() => safeLoadMessages(storageKey));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("offline");
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  const generateId = () => "-" + Math.random().toString(36).slice(2, 9);

  // persist messages
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  // ping assistant
  useEffect(() => {
    checkPing().then((ok) => setStatus(ok ? "online" : "offline"));
  }, []);

  // autofocus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { ...addUserMessage(input), id: generateId() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const isCommand = input.trim().startsWith("!");
    const time = new Date().toLocaleTimeString();

    try {
      const res = await fetch(`${ASSISTANT_URL}/mcp/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      // Command mode
      if (isCommand) {
        let text;
        try {
          const type = res.headers.get("content-type") || "";
          if (type.includes("json")) {
            const data = await res.json();
            text =
              typeof data === "string"
                ? data
                : data?.response || JSON.stringify(data, null, 2);
          } else {
            text = await res.text();
          }
        } catch (err) {
          text = `(Error parsing command: ${err.message})`;
        }
        setMessages((prev) => [
          ...prev,
          { id: generateId(), from: "assistant", text, time },
        ]);
        return;
      }

      // Streaming mode
      if (!res.ok || !res.body)
        throw new Error(`Streaming failed: ${res.status}`);
      setMessages((prev) => [
        ...prev,
        { id: generateId(), from: "assistant", text: "▌", time },
      ]);

      await parseSSEStream(res.body.getReader(), (chunk) => {
        setMessages((prev) => {
          const last = prev.at(-1);
          const lastText = (last?.text ?? "").replace(/▌$/, "");
          return updateLastAssistantMessage(
            prev,
            lastText + chunk + "▌"
          );
        });
        chatRef.current?.scrollTo({
          top: chatRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    } catch (err) {
      console.error("Assistant error:", err);
      setMessages((prev) => [
        ...prev,
        { id: generateId(), from: "assistant", text: "(Connection error)", time },
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
