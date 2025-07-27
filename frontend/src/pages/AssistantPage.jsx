// AssistantPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import '../components/ChatAssistant.css';
import PromptPicker from '../components/PromptPicker';

const ASSISTANT_URL = '/assistant';



const AssistantPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('offline');
  const tools = ["!os", "!usb", "!logs", "!ping 8.8.8.8", "!uptime", "!df", "!docker"];
  const inputRef = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const stored = localStorage.getItem("hexforge_chat");
    if (stored) setMessages(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem("hexforge_chat", JSON.stringify(messages));
  }, [messages]);

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
    const isCommand = input.startsWith('!');
    const userMessage = {
      from: 'user',
      text: input,
      time: now,
      tag: isCommand ? input.split(' ')[0] : ''
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

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
          time: new Date().toLocaleTimeString()
        }]);
      } else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullMessage = '';
        const responseTime = new Date().toLocaleTimeString();
        setMessages(prev => [...prev, { from: 'assistant', text: '', time: responseTime }]);

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
        chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div className="assistant-page">
      <div className="chat-header">
        <strong>HexForge Assistant Lab</strong>
        <span className={`status-dot ${status}`} />
      </div>

      <div className="chat-tools">
        {tools.map((cmd, i) => (
          <button key={i} onClick={() => setInput(cmd)}>{cmd}</button>
        ))}
        <PromptPicker onSelect={setInput} />
      </div>

      <div className="chat-messages fullscreen" ref={chatRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.from}`}>
            <pre>{msg.text}</pre>
            <small>{msg.time}</small>
          </div>
        ))}
        {loading && <div className="chat-msg assistant typing">▌</div>}
      </div>

      <div className="chat-input">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask or command..."
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>Send</button>
      </div>
    </div>
  );
};

export default AssistantPage;
