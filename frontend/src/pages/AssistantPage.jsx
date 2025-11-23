// frontend/src/pages/AssistantPage.jsx
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAssistantChat } from '../hooks/useAssistantChat';
import './AssistantPage.css';

const AssistantPage = () => {
  const {
    messages,
    input,
    setInput,
    loading,
    error,
    send,
    resetError,
  } = useAssistantChat({ mode: 'assistant' });

  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  // Boot sequence state
  const [bootStage, setBootStage] = useState(0);
  const [bootDone, setBootDone] = useState(false);

  // Sidebar (history / projects / models) visibility
  const [showHistory, setShowHistory] = useState(true);

  // Lab browser state (iframe on the right)
  const [browserUrl, setBrowserUrl] = useState('https://hexforgelabs.com');
  const [browserInput, setBrowserInput] = useState('https://hexforgelabs.com');

  // Auto scroll chat
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, loading]);

  // Boot sequence animation
  useEffect(() => {
    const timeouts = [
      setTimeout(() => setBootStage(1), 200),
      setTimeout(() => setBootStage(2), 650),
      setTimeout(() => setBootStage(3), 1150),
      setTimeout(() => setBootStage(4), 1650),
      setTimeout(() => {
        setBootStage(5);
        setBootDone(true);
      }, 2200),
    ];

    return () => timeouts.forEach(clearTimeout);
  }, []);

  // Assistant → Lab Browser auto URL
  useEffect(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant');

    if (!lastAssistant) return;

    const urlMatch = lastAssistant.content.match(
      /(https?:\/\/[^\s,)>\\]]+)|(hexforgelabs\.com[^\s,)>\\]]*)/i
    );

    if (!urlMatch) return;

    let url = urlMatch[0];
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    if (url !== browserUrl) {
      setBrowserUrl(url);
      setBrowserInput(url);
    }
  }, [messages, browserUrl]);

  const handleChange = useCallback(
    (e) => {
      if (error) resetError();
      setInput(e.target.value);
    },
    [error, resetError, setInput]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!loading && bootDone) {
          send();
        }
      }
    },
    [send, loading, bootDone]
  );

  const handleClickSend = useCallback(() => {
    if (!loading && bootDone) {
      send();
    }
  }, [send, loading, bootDone]);

  const handleToolClick = useCallback(
    (cmd) => {
      if (loading || !bootDone) return;
      setInput(cmd);
      send(cmd);
    },
    [loading, bootDone, setInput, send]
  );

  const handleBrowserGo = useCallback(
    (e) => {
      e.preventDefault();
      let url = browserInput.trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      setBrowserUrl(url);
      setBrowserInput(url);
    },
    [browserInput]
  );

  const browserDisabled = !bootDone;

  return (
    <div className="hf-assistant-page">
      <header className="hf-assistant-header">
        <div className="hf-assistant-logo">⚙ HexForge Assistant Lab</div>
        <button
          className="hf-assistant-history-toggle"
          onClick={() => setShowHistory((v) => !v)}
        >
          {showHistory ? 'Collapse Sidebar' : 'Expand Sidebar'}
        </button>
      </header>

      <main
        className={
          'hf-assistant-main ' +
          (!showHistory ? 'hf-assistant-main--no-history' : '')
        }
      >
        {/* Left column: chats / projects / models */}
        <aside
          className={
            'hf-assistant-history ' +
            (!showHistory ? 'hf-assistant-history--hidden' : '')
          }
        >
          <div className="hf-side-header">
            <span className="section-label">Session History</span>
            <button
              type="button"
              className="hf-side-header-toggle"
              onClick={() => setShowHistory(false)}
            >
              Hide
            </button>
          </div>

          <div className="hf-side-tabs">
            <button className="hf-side-tab is-active">Chats</button>
            <button className="hf-side-tab">Projects</button>
            <button className="hf-side-tab">Models</button>
          </div>

          <div className="hf-side-list">
            <div className="hf-side-item is-active">Current session</div>
            <div className="hf-side-item">Skull BadUSB planning</div>
            <div className="hf-side-item">Recon Unit recovery</div>
            <div className="hf-side-item">Content engine notes</div>
          </div>

          <div className="hf-side-footer">
            <span className="hf-side-label">Active model:</span>
            <div className="hf-model-chips">
              <span className="hf-model-chip">Lab Core</span>
              <span className="hf-model-chip">Tool Runner</span>
              <span className="hf-model-chip is-active">HexForge Scribe</span>
            </div>
            <p className="hf-side-note">
              (Backend will treat these the same for now – later we can route
              tools / prompts per model.)
            </p>
          </div>
        </aside>

        {/* Center: assistant shell */}
        <section className="hf-assistant-shell">
          {/* Boot overlay */}
          {!bootDone && (
            <div className="hf-boot-overlay">
              <div className="hf-boot-window">
                <div className="hf-boot-title">
                  HexForge Assistant • Boot Sequence
                </div>
                <ul className="hf-boot-lines">
                  <li className={bootStage >= 1 ? 'is-visible' : ''}>
                    [1/4] Initializing assistant core…
                  </li>
                  <li className={bootStage >= 2 ? 'is-visible' : ''}>
                    [2/4] Loading tools: <code>!os</code>, <code>!uptime</code>,{' '}
                    <code>!df</code>, <code>!docker</code>…
                  </li>
                  <li className={bootStage >= 3 ? 'is-visible' : ''}>
                    [3/4] Linking Script Lab, Store, Blog, Lab Browser…
                  </li>
                  <li className={bootStage >= 4 ? 'is-visible' : ''}>
                    [4/4] Model online:{' '}
                    <strong>HexForge&nbsp;Scribe</strong>
                  </li>
                </ul>
                <div className="hf-boot-footer">
                  <span
                    className={
                      'hf-boot-status-dot ' +
                      (bootStage >= 4 ? 'is-ready' : '')
                    }
                  />
                  <span className="hf-boot-status-label">
                    {bootStage < 4 ? 'Warming up…' : 'Ready'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="hf-assistant-toolbar">
            <span className="hf-assistant-toolbar-label">Tools:</span>
            <button
              className="hf-assistant-toolbar-chip"
              onClick={() => handleToolClick('!os')}
              disabled={loading || !bootDone}
            >
              !os
            </button>
            <button
              className="hf-assistant-toolbar-chip"
              onClick={() => handleToolClick('!uptime')}
              disabled={loading || !bootDone}
            >
              !uptime
            </button>
            <button
              className="hf-assistant-toolbar-chip"
              onClick={() => handleToolClick('!df')}
              disabled={loading || !bootDone}
            >
              !df
            </button>
            <button
              className="hf-assistant-toolbar-chip"
              onClick={() => handleToolClick('!docker')}
              disabled={loading || !bootDone}
            >
              !docker
            </button>
          </div>

          <div className="hf-assistant-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={
                  'hf-assistant-message ' +
                  (msg.role === 'assistant'
                    ? 'hf-assistant-message--assistant'
                    : 'hf-assistant-message--user')
                }
              >
                <div className="hf-assistant-message-role">
                  {msg.role === 'assistant' ? 'Assistant' : 'You'}
                </div>
                <div className="hf-assistant-message-body">
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="hf-assistant-message hf-assistant-message--assistant">
                <div className="hf-assistant-message-role">Assistant</div>
                <div className="hf-assistant-message-body hf-assistant-typing">
                  Running tools…
                </div>
              </div>
            )}

            {error && <div className="hf-assistant-error">{error}</div>}

            <div ref={bottomRef} />
          </div>

          <footer className="hf-assistant-input-bar">
            <textarea
              ref={inputRef}
              className="hf-assistant-input"
              placeholder={
                bootDone
                  ? 'Type a question or command…'
                  : 'Assistant is booting…'
              }
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={loading || !bootDone}
              rows={1}
            />
            <button
              className="hf-assistant-send"
              onClick={handleClickSend}
              disabled={loading || !bootDone || !input.trim()}
            >
              Send
            </button>
          </footer>
        </section>

        {/* Right: Lab browser column */}
        <aside className="hf-lab-browser">
          <div className="hf-lab-browser-header">
            <span className="section-label">Lab Browser</span>
          </div>

          <form className="hf-lab-browser-bar" onSubmit={handleBrowserGo}>
            <input
              type="text"
              className="hf-lab-browser-input"
              value={browserInput}
              onChange={(e) => setBrowserInput(e.target.value)}
              disabled={browserDisabled}
              aria-label="Lab browser address"
            />
            <button
              type="submit"
              className="hf-lab-browser-go"
              disabled={browserDisabled}
            >
              Go
            </button>
          </form>

          <div className="hf-lab-browser-frame">
            <iframe
              title="HexForge Lab Browser"
              src={browserUrl}
              className="hf-lab-browser-iframe"
            />
            <p className="hf-lab-browser-caption">
              The assistant can describe and suggest URLs. As we refine tools,
              we can let it send open-URL instructions to update this panel
              automatically.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default AssistantPage;
