// AssistantPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import '../components/ChatAssistant.css';
import PromptPicker from '../components/PromptPicker';
import { parseSSEStream } from '../utils/parseSSEStream';
import { addUserMessage, addAssistantMessage, updateLastAssistantMessage } from '../utils/chatHelpers';
import { checkPing } from '../utils/assistant';

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
    checkPing().then((ok) => setStatus(ok ? 'online' : 'offline'));
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
        const text = await res.text();
        let output;

        try {
          const json = JSON.parse(text);
          output = json.output || '(No output)';
        } catch (e) {
          output = text;
        }

        setMessages(prev => [...prev, {
          from: 'assistant',
          text: output,
          time: responseTime
        }]);
      } else {
        setMessages(prev => [...prev, {
          from: 'assistant',
          text: '',
          time: responseTime
        }]);

        const reader = res.body.getReader();
        for await (const chunk of parseSSEStream(reader)) {
          setMessages(prev =>
            updateLastAssistantMessage(prev, prev[prev.length - 1].text + chunk)
          );
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
