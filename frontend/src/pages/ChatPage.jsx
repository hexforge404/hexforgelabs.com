import React, { useState, useEffect } from 'react';
import './ChatPage.css';

const ASSISTANT_URL = '/assistant';

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('offline');

  useEffect(() => {
    const checkPing = async () => {
      try {
        const res = await fetch(`/assistant/health`);
        const data = await res.json();
        if (!res.ok || data.status !== 'ok') throw new Error();
        setStatus('online');
      } catch {
        setStatus('offline');
      }
    };
    checkPing();
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const now = new Date().toLocaleTimeString();
    const newMessages = [...messages, { from: 'user', text: input, time: now }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/assistant/mcp/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input })
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullMessage = '';
      const responseTime = new Date().toLocaleTimeString();

      setMessages((prev) => [...prev, { from: 'assistant', text: '', time: responseTime }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            const piece = typeof json.response === 'string'
              ? json.response
              : JSON.stringify(json.response);
            fullMessage += piece;

            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                text: fullMessage
              };
              return updated;
            });
          } catch (err) {
            if (line.trim().startsWith('<')) {
              console.warn('Ignored HTML line in stream:', line);
              continue; // skip HTML
            } else {
              console.warn('Unparsable JSON stream line:', line);
            }
          }
        }
      }
    } catch (err) {
      console.error('Stream error:', err);
      setMessages((prev) => [...prev, {
        from: 'assistant',
        text: '(Error connecting to assistant)',
        time: new Date().toLocaleTimeString()
      }]);
    } finally {
      setLoading(false);
    }
  }; // ✅ <<== This closing brace was missing

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div
      className="chat-container"
      style={{
        background: `url(${process.env.PUBLIC_URL}/images/hero-background.png) no-repeat center center fixed`,
        backgroundSize: 'cover',
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

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.from}`}>
            {msg.from === 'assistant' && (
              <img
                src={`${process.env.PUBLIC_URL}/images/hexforge-logo.png`}
                alt="Assistant Icon"
                className="chat-avatar"
              />
            )}
            <pre>{msg.text}</pre>
          </div>
        ))}
        {loading && <div className="chat-msg assistant loading">...</div>}
      </div>

      <div className="chat-input">
        <input
          type="text"
          placeholder="Ask or command..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={sendMessage}>➤</button>
      </div>
    </div>
  );
};

export default ChatPage;
