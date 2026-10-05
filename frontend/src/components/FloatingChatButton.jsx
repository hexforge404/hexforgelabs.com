import React, { useState } from 'react';
import ChatAssistant from './ChatAssistant';
import './FloatingChatButton.css';

const FloatingChatButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <ChatAssistant onClose={() => setOpen(false)} />}
      <button
        className="floating-chat-btn"
        onClick={() => setOpen(true)}
        aria-label="Open HexForge Assistant"
        title="Open HexForge Assistant"
      >
        <svg
          className="floating-chat-icon"
          viewBox="0 0 24 24"
          width="26"
          height="26"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M4 5.5h16v11H9l-5 3v-14Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="8" cy="11" r="1" fill="currentColor" />
          <circle cx="12" cy="11" r="1" fill="currentColor" />
          <circle cx="16" cy="11" r="1" fill="currentColor" />
        </svg>
      </button>
    </>
  );
};

export default FloatingChatButton;
