import React from "react";
import "./ChatPage.css";
import { useAssistantChat } from "../hooks/useAssistantChat";

const ChatPage = () => {
  const {
    messages,
    input,
    setInput,
    loading,
    status,
    sendMessage,
    chatRef,
    inputRef,
  } = useAssistantChat("hexforge_chat_main");

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="chat-container"
      style={{
        background: `url(${process.env.PUBLIC_URL}/images/hero-background.png) no-repeat center center fixed`,
        backgroundSize: "cover",
      }}
    >
      <div className="chat-header">
        <img
          src={`${process.env.PUBLIC_URL}/images/hexforge-logo-full.png`}
          alt="HexForge Labs"
          className="chat-logo"
        />
        <strong>HexForge Assistant</strong>
        <span className={`status-dot ${status}`} />
      </div>

      <div className="chat-messages" ref={chatRef}>
        {messages.map((msg) => (
          <div key={msg.id || msg.time} className={`chat-msg ${msg.from}`}>
            <pre>{msg.text}</pre>
          </div>
        ))}
        {loading && (
          <div className="chat-msg assistant typing">▌</div>
        )}
      </div>

      <div className="chat-input">
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask or command..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          ➤
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
