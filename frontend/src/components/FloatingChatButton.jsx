import React, { useState } from 'react';
import ChatAssistant from './ChatAssistant';
import './FloatingChatButton.css';

const FloatingChatButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <ChatAssistant onClose={() => setOpen(false)} />}
      <button className="floating-chat-btn" onClick={() => setOpen(true)}>
        💬
      </button>
    </>
  );
};

export default FloatingChatButton;
