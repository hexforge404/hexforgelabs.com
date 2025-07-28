// HexForge Assistant
import React, { useState, useEffect, useRef } from 'react';
import './ChatAssistant.css';
import PromptPicker from './PromptPicker';
import { parseSSEStream } from '../utils/parseSSEStream';
import { addUserMessage, addAssistantMessage, updateLastAssistantMessage } from '../utils/chatHelpers';
const ASSISTANT_URL = '/assistant';



const ChatAssistant = ({ onClose }) => {
  const [messages, setMessages] = useState(() => {
    const stored = localStorage.getItem("hexforge_chat");
    return stored ? JSON.parse(stored) : [];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('offline');
  const tools = ["!os", "!usb", "!logs", "!ping 8.8.8.8", "!uptime", "!df", "!docker"];
  const [showHistory, setShowHistory] = useState(true);

  const inputRef = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    localStorage.setItem("hexforge_chat", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (window.innerWidth < 600) setShowHistory(false);
  }, []);

  useEffect(() => {
    const checkPing = async () => {
      try {
        const res = await fetch(`/assistant/health`)
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
    <div className="chat-drawer">
      <div className="chat-header">
        <strong>HexForge Assistant</strong>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className={`status-dot ${status}`} title={`Status: ${status}`} />
          <button onClick={() => setShowHistory((v) => !v)} style={{ fontSize: '12px' }}>
            {showHistory ? '🡸 Hide' : '🡺 History'}
          </button>
          <button onClick={onClose}>✖</button>
        </div>
      </div>

      <div className="chat-tools">
        {tools.map((cmd, i) => (
          <button key={i} onClick={() => setInput(cmd)}>{cmd}</button>
        ))}
        <PromptPicker onSelect={(text) => setInput(text)} />
      </div>

      <div className="chat-messages" ref={chatRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.from}`}>
            <pre>{msg.text}</pre>
            <small>{msg.time}</small>
            {msg.from === 'assistant' && (
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

        {showHistory && (
          <div className="chat-history">
            <h4>🧠 History</h4>
            <ul>
              {messages
                .filter((msg) => msg.from === 'user')
                .map((msg, i) => (
                  <li key={i}>
                    <button onClick={() => setInput(msg.text)} style={{ width: '100%' }}>
                      🧑 {msg.text.slice(0, 30)}
                      {msg.tag && <span className="tag-label">{msg.tag}</span>}
                      <small style={{ float: 'right', opacity: 0.6 }}>{msg.time}</small>
                    </button>
                    <input
                      type="text"
                      placeholder="Add tag..."
                      value={msg.tag || ''}
                      onChange={(e) => {
                        const updated = [...messages];
                        updated[i].tag = e.target.value;
                        setMessages(updated);
                      }}
                      style={{
                        width: '100%',
                        marginTop: '4px',
                        padding: '2px 6px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        background: '#111',
                        border: '1px solid #333',
                        color: '#ccc'
                      }}
                    />
                  </li>
                ))}
            </ul>

            <button onClick={() => {
              const userHistory = messages.filter((msg) => msg.from === 'user');
              const blob = new Blob([JSON.stringify(userHistory, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'chat-history.json';
              a.click();
              URL.revokeObjectURL(url);
            }}>
              Export History
            </button>

            <button
              style={{
                marginTop: '8px',
                width: '100%',
                background: '#222',
                color: '#ccc',
                border: '1px solid #444'
              }}
              onClick={() => {
                const cleared = messages.filter((msg) => msg.from !== 'user');
                setMessages(cleared);
              }}
            >
              Clear History
            </button>

            <button
              style={{
                marginTop: '8px',
                width: '100%',
                background: '#600',
                color: '#fff',
                border: '1px solid #400'
              }}
              onClick={() => setMessages([])}
            >
              Clear Chat
            </button>
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
