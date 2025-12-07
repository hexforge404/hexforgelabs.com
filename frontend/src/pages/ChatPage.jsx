// frontend/src/pages/ChatPage.jsx
import React, {
  useCallback,
  useRef,
  useEffect,
  useState,
} from "react";
import { useContentEngineChat } from "../hooks/useContentEngineChat";
import "./ChatPage.css";

const ChatPage = () => {
  const chatSessionIdRef = useRef(`chat-${Date.now()}`);
const {
  messages,
  input,
  setInput,
  isLoading,
  sendMessage,
  resetSession,
} = useContentEngineChat({
  mode: "assistant",
  sessionId: chatSessionIdRef.current,
  model: "HexForge Scribe",
});

  


  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  // Simple "boot" delay so the model feels like it's waking up
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBootDone(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleChange = useCallback(
  (e) => {
    setInput(e.target.value);
  },
  [setInput]
);

const handleKeyDown = useCallback(
  (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && bootDone) {
        sendMessage();
      }
    }
  },
  [sendMessage, isLoading, bootDone]
);

const handleClickSend = useCallback(() => {
  if (!isLoading && bootDone) {
    sendMessage();
  }
}, [sendMessage, isLoading, bootDone]);


  return (
    <div className="hf-chat-page">
      <div className="hf-chat-shell">
        <header className="hf-chat-header">
          <div className="hf-chat-logo">HexForge Labs</div>
          <div className="hf-chat-title">HexForge Assistant</div>
        </header>

        <main className="hf-chat-main">
          <div className="hf-chat-messages">
            {/* Light boot hint while the assistant is "spinning up" */}
            {!bootDone && (
              <div className="hf-chat-message hf-chat-message--assistant">
                <div className="hf-chat-message-role">Assistant</div>
                <div className="hf-chat-message-body hf-chat-typing">
                  Connecting to HexForge Scribe core…
                </div>
              </div>
            )}

              {messages.map((msg, idx) => (
              <div
                key={idx}
                className={
                  "hf-chat-message " +
                  (msg.role === "assistant"
                    ? "hf-chat-message--assistant"
                    : "hf-chat-message--user")
                }
              >
                <div className="hf-chat-message-role">
                  {msg.role === "assistant" ? "Assistant" : "You"}
                </div>
                <div className="hf-chat-message-body">
                  {msg.content}
                </div>
              </div>
            ))}


            {isLoading && (
              <div className="hf-chat-message hf-chat-message--assistant">
                <div className="hf-chat-message-role">Assistant</div>
                <div className="hf-chat-message-body hf-chat-typing">
                  Thinking…
                </div>
              </div>
            )}

           

            <div ref={bottomRef} />
          </div>
        </main>

        <footer className="hf-chat-input-bar">
          <textarea
            ref={inputRef}
            className="hf-chat-input"
            placeholder={
              bootDone
                ? 'Ask or command… (prefix with "blog-draft" to send to content engine)'
                : 'Connecting to HexForge Scribe…'
            }
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading || !bootDone}
            rows={1}
          />
          <button
            className="hf-chat-send"
            onClick={handleClickSend}
            disabled={isLoading || !bootDone || !input.trim()}
            aria-label="Send message"
          >
            ▶
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ChatPage;
