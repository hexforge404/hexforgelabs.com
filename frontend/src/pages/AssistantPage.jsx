import React, { useState } from "react";
import "../components/ChatAssistant.css";
import PromptPicker from "../components/PromptPicker";
import { useAssistantChat } from "../hooks/useAssistantChat";

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

  const [showHistory, setShowHistory] = useState(true);
  const tools = ["!os", "!usb", "!logs", "!ping 8.8.8.8", "!uptime", "!df", "!docker"];

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="assistant-page">
      <div className="chat-header">
        <strong>HexForge Assistant Lab</strong>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className={`status-dot ${status}`} title={`Status: ${status}`} />
          <button
            onClick={() => setShowHistory((v) => !v)}
            style={{ fontSize: "12px" }}
          >
            {showHistory ? "🡸 Hide" : "🡺 History"}
          </button>
        </div>
      </div>

      <div className="chat-tools">
        {tools.map((cmd, i) => (
          <button key={i} onClick={() => setInput(cmd)}>
            {cmd}
          </button>
        ))}
        <PromptPicker onSelect={(text) => setInput(text)} />
      </div>

      <div className="chat-messages fullscreen" ref={chatRef}>
        {messages.map((msg) => (
          <div key={msg.id || msg.time} className={`chat-msg ${msg.from}`}>
            <pre>{msg.text}</pre>
            <small>{msg.time}</small>
          </div>
        ))}

        {loading && (
          <div className="chat-msg assistant typing">▌</div>
        )}
      </div>

      {showHistory && (
        <div className="chat-history">
          <h4>🧠 History</h4>
          <ul>
            {messages
              .filter((msg) => msg.from === "user")
              .map((msg) => (
                <li key={msg.id || msg.time}>
                  <button
                    onClick={() => setInput(msg.text)}
                    style={{ width: "100%" }}
                  >
                    🧑 {msg.text.slice(0, 30)}
                    {msg.tag && <span className="tag-label">{msg.tag}</span>}
                    <small style={{ float: "right", opacity: 0.6 }}>
                      {msg.time}
                    </small>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

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
