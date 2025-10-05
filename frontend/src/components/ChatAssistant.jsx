import React from "react";
import "./ChatAssistant.css";
import PromptPicker from "./PromptPicker";
import { useAssistantChat } from "../hooks/useAssistantChat";

const ChatAssistant = ({ onClose }) => {
  const {
    messages,
    input,
    setInput,
    loading,
    status,
    sendMessage,
    chatRef,
    inputRef,
  } = useAssistantChat("hexforge_chat");

  const tools = ["!os", "!usb", "!logs", "!ping 8.8.8.8", "!uptime", "!df", "!docker"];
  const [showHistory, setShowHistory] = React.useState(true);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-drawer">
      <div className="chat-header">
        <strong>HexForge Assistant</strong>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className={`status-dot ${status}`} title={`Status: ${status}`} />
          <button onClick={() => setShowHistory((v) => !v)} style={{ fontSize: "12px" }}>
            {showHistory ? "🡸 Hide" : "🡺 History"}
          </button>
          <button onClick={onClose}>✖</button>
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

      <div className="chat-messages" ref={chatRef}>
        {messages.map((msg) => (
          <div key={msg.id || msg.time} className={`chat-msg ${msg.from}`}>
            <pre>{msg.text}</pre>
            <small>{msg.time}</small>
            {msg.from === "assistant" && (
              <button
                className="copy-btn"
                onClick={() => navigator.clipboard.writeText(msg.text)}
                title="Copy to clipboard"
              >
                📋
              </button>
            )}
          </div>
        ))}

        {loading && (
          <div className="chat-msg assistant">
            <span className="typing">▌</span>
          </div>
        )}
      </div>

      <div className="chat-input">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatAssistant;
