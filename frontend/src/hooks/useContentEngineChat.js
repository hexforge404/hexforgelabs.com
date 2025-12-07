import { useState, useCallback } from "react";

// NGINX proxies /mcp → hexforge-assistant in your stack
const API_BASE =
  process.env.REACT_APP_ASSISTANT_BASE_URL || "/mcp";

export function useContentEngineChat(_config = {}) {
  const [messages, setMessages] = useState([]); // { role: 'user' | 'assistant', content: string }
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetSession = useCallback(() => {
    setMessages([]);
    setInput("");
  }, []);

  const sendMessage = useCallback(
    async (textOverride) => {
      const text = (textOverride ?? input).trim();
      if (!text) return;

      // add user message immediately
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
      ]);
      setInput("");
      setIsLoading(true);

      try {
        // 🔹 Talk to the same /mcp/chat handler the Assistant page uses
        const res = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // backend accepts `message` or `prompt`
            message: text,
            // we can pass a model label; backend will map it via MODEL_MAP
            model: "HexForge Scribe",
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `⚠️ Assistant error (${res.status}): ${errText}`,
            },
          ]);
          return;
        }

        const data = await res.json();

        // Backend wraps everything in { response: ... }
        let reply;
        if (typeof data.response === "string") {
          reply = data.response;
        } else if (data.response) {
          reply = JSON.stringify(data.response, null, 2);
        } else {
          reply = JSON.stringify(data, null, 2);
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: reply },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `❌ Network error talking to assistant: ${err.message}`,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  return {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
    handleKeyDown,
    resetSession,
  };
}
