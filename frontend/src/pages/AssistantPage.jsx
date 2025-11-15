// frontend/src/pages/AssistantPage.jsx

import React, { useState } from "react";
import "../components/ChatAssistant.css";
import PromptPicker from "../components/PromptPicker";
import { useAssistantChat } from "../hooks/useAssistantChat";

// Safely convert any value to displayable text
const renderText = (value) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const AssistantPage = () => {
  const {
    messages,
    input,
    setInput,
    loading,
    status,
    sendMessage,
    chatRef,
    inputRef,
  } = useAssistantChat("hexforge_chat_full");

  // Start with history visible on page load
  const [showHistory, setShowHistory] = useState(true);

  const tools = ["!os", "!usb", "!logs", "!ping 8.8.8.8", "!uptime", "!df", "!docker"];

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  const safeMessages = Array.isArray(messages) ? messages : [];
  const getMsgText = (msg) => renderText(msg.text ?? msg.content);
  const userHistory = safeMessages.filter(
    (msg) => msg.from === "user" || msg.role === "user"
  );

  return (
    <div className="assistant-page">
      {/* Top header */}
      <div className="chat-header">
        <strong>HexForge Assistant Lab</strong>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span
            className={`status-dot ${status}`}
            title={`Status: ${status}`}
          />
          <button
            onClick={() => setShowHistory((v) => !v)}
            style={{ fontSize: "12px" }}
          >
            {showHistory ? "🡸 Hide History" : "🡺 Show History"}
          </button>
        </div>
      </div>

      {/* Tool buttons + prompt picker */}
      <div className="chat-tools">
        {tools.map((cmd, i) => (
          <button key={i} onClick={() => setInput(cmd)}>
            {cmd}
          </button>
        ))}
        <PromptPicker onSelect={(text) => setInput(text)} />
      </div>

      {/* Main conversation area */}
      <div className="chat-messages fullscreen" ref={chatRef}>
        {safeMessages.map((msg, index) => (
          <div
            key={msg.id || msg.time || index}
            className={`chat-msg ${msg.from || msg.role || "assistant"}`}
          >
            <pre>{getMsgText(msg)}</pre>
            {msg.time && <small>{renderText(msg.time)}</small>}
          </div>
        ))}

        {loading && <div className="chat-msg assistant typing">▌</div>}
      </div>

      {/* History drawer – always in DOM, visibility controlled by showHistory */}
      <div
        className="chat-history"
        style={{ display: showHistory ? "block" : "none" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "4px",
          }}
        >
          <h4 style={{ margin: 0 }}>🧠 History</h4>
          <button
            onClick={() => setShowHistory(false)}
            style={{
              border: "none",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
              fontSize: "14px",
            }}
            title="Close history"
          >
            ✖
          </button>
        </div>

        <ul>
          {userHistory.map((msg, index) => {
            const fullText = getMsgText(msg);
            const preview =
              fullText.length > 40 ? fullText.slice(0, 37) + "..." : fullText;

            return (
              <li key={msg.id || msg.time || index}>
                <button
                  onClick={() => setInput(fullText)}
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    textAlign: "left",
                  }}
                >
                  <div>
                    🧑{" "}
                    <span style={{ fontWeight: 500 }}>
                      {preview || "(empty message)"}
                    </span>
                    {msg.tag && (
                      <span className="tag-label" style={{ marginLeft: 6 }}>
                        {renderText(msg.tag)}
                      </span>
                    )}
                  </div>
                  {msg.time && (
                    <small style={{ opacity: 0.6, marginTop: 2 }}>
                      {renderText(msg.time)}
                    </small>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Input row */}
      <div className="chat-input">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask or command..."
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
};

export default AssistantPage;
