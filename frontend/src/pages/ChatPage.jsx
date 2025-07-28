import React, { useState, useEffect, useRef } from 'react';
import './ChatPage.css';
import { parseSSEStream } from '../utils/parseSSEStream';
import { addUserMessage, updateLastAssistantMessage } from '../utils/chatHelpers';
import { checkPing } from '../utils/assistant';

const ChatPage = () => {
  const [messages, setMessages] = useState(() => {
    const stored = localStorage.getItem("hexforge_chat_main");
    return stored ? JSON.parse(stored) : [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('offline');
  const chatRef = useRef(null);

  useEffect(() => {
    checkPing().then((ok) => setStatus(ok ? 'online' : 'offline'));
  }, []);

  useEffect(() => {
    localStorage.setItem("hexforge_chat_main", JSON.stringify(messages));
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = addUserMessage(input);
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const isCommand = input.trim().startsWith('!');
    const responseTime = new Date().toLocaleTimeString();

    try {
      const res = await fetch(`/assistant/mcp/${isCommand ? 'chat' : 'stream'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input })
      });

      if (isCommand) {
        const json = await res.json();
        setMessages(prev => [...prev, {
          from: 'assistant',
          text: json.output || '(No output)',
          time: responseTime
        }]);
      } else {
        setMessages(prev => [...prev, {
          from: 'assistant',
          text: '',
          time: responseTime
        }]);

        await parseSSEStream(res, (chunk) => {
          setMessages(prev => updateLastAssistantMessage(prev, chunk));
        });
      }
    } catch (err) {
      console.error('Assistant error:', err);
      setMessages(prev => [...prev, {
        from: 'assistant',
        text: '(Error connecting to assistant)',
        time: new Date().toLocaleTimeString()
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        chatRef.current?.scrollTo({
          top: chatRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div className="chat-container" style={{
      background: `url(${process.env.PUBLIC_URL}/images/hero-background.png) no-repeat center center fixed`,
      backgroundSize: 'cover',
    }}>
      <div className="chat-header">
        <img src={`${process.env.PUBLIC_URL}/images/hexforge-logo-full.png`} alt="HexForge Labs" className="chat-logo" />
        <strong>HexForge Assistant</strong>
        <span className={`status-dot ${status}`} />
      </div>

      <div className="chat-messages" ref={chatRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.from}`}>
            <pre>{msg.text}</pre>
          </div>
        ))}
        {loading && <div className="chat-msg assistant typing">▌</div>}
      </div>

      <div className="chat-input">
        <input
          type="text"
          placeholder="Ask or command..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>➤</button>
      </div>
    </div>
  );
};

export default ChatPage;
