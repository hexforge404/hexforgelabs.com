// frontend/src/pages/ChatPage.jsx
import React, {
  useCallback,
  useRef,
  useEffect,
  useState,
} from 'react';
import { useAssistantChat } from '../hooks/useAssistantChat';
import './ChatPage.css';

const ChatPage = () => {
  const {
    messages,
    input,
    setInput,
    loading,
    error,
    send,
    resetError,
  } = useAssistantChat({ mode: 'chat' });

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
      if (error) resetError();
      setInput(e.target.value);
    },
    [error, resetError, setInput]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!loading && bootDone) {
          send();
        }
      }
    },
    [send, loading, bootDone]
  );

  const handleClickSend = useCallback(() => {
    if (!loading && bootDone) {
      send();
    }
  }, [send, loading, bootDone]);

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

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={
                  'hf-chat-message ' +
                  (msg.role === 'assistant'
                    ? 'hf-chat-message--assistant'
                    : 'hf-chat-message--user')
                }
              >
                <div className="hf-chat-message-role">
                  {msg.role === 'assistant' ? 'Assistant' : 'You'}
                </div>
                <div className="hf-chat-message-body">
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="hf-chat-message hf-chat-message--assistant">
                <div className="hf-chat-message-role">Assistant</div>
                <div className="hf-chat-message-body hf-chat-typing">
                  Thinking…
                </div>
              </div>
            )}

            {error && <div className="hf-chat-error">{error}</div>}

            <div ref={bottomRef} />
          </div>
        </main>

        <footer className="hf-chat-input-bar">
          <textarea
            ref={inputRef}
            className="hf-chat-input"
            placeholder={
              bootDone
                ? 'Ask or command…'
                : 'Connecting to HexForge Scribe…'
            }
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={loading || !bootDone}
            rows={1}
          />
          <button
            className="hf-chat-send"
            onClick={handleClickSend}
            disabled={loading || !bootDone || !input.trim()}
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
