// frontend/src/pages/ScriptLabPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';

import './ScriptLabPage.css';
import './ScriptLabPage.theme.css';

const DEFAULT_DEVICE = 'skull-badusb'; // adjust / add dropdown later if needed

const ScriptLabPage = () => {
  const [scripts, setScripts] = useState([]);        // [{ name, device, path }]
  const [selectedScript, setSelectedScript] = useState(null);
  const [code, setCode] = useState('// Select a script to get started…');
  const [status, setStatus] = useState('Idle');

  // AI helper
  const [aiInput, setAiInput] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const outputRef = useRef(null);

  // --- Helpers ---

  const detectLanguage = (filename) => {
    if (!filename) return 'plaintext';
    const lower = filename.toLowerCase();
    if (lower.endsWith('.ps1')) return 'powershell';
    if (lower.endsWith('.bat') || lower.endsWith('.cmd')) return 'bat';
    if (lower.endsWith('.sh')) return 'shell';
    if (lower.endsWith('.py')) return 'python';
    if (lower.endsWith('.js')) return 'javascript';
    if (lower.endsWith('.json')) return 'json';
    if (lower.endsWith('.md')) return 'markdown';
    return 'plaintext';
  };

  const fetchScripts = async () => {
    try {
      setStatus('Loading scripts…');

      // Read-only Script Lab listing
      const res = await axios.get('/api/script-lab/list', {
        params: { device: DEFAULT_DEVICE },
      });

      const list = res.data.scripts || [];
      setScripts(list);
      setStatus(`✅ Loaded ${list.length} script(s)`);

      if (list.length && !selectedScript) {
        handleSelectScript(list[0]);
      }
    } catch (err) {
      console.error('Failed to load scripts', err);
      setScripts([]);
      setStatus('❌ Could not load script list');
    }
  };

  const handleSelectScript = async (script) => {
    if (!script) return;

    try {
      setStatus('Loading script…');

      // Backend expects `name` relative to SCRIPTS_BASE_DIR,
      // e.g. "skull-badusb/demo-01.ps1"
      const relativeName = script.device
        ? `${script.device}/${script.name}`
        : script.name;

      const res = await axios.get('/api/script-lab/get', {
        params: { name: relativeName },
      });

      setSelectedScript(script);
      setCode(res.data.content ?? '// No content available');
      setStatus('✅ Script loaded');
    } catch (err) {
      console.error('Failed to open script', err);
      setStatus('❌ Failed to open script');
    }
  };

  const handleAskAI = async () => {
    if (!selectedScript && !aiInput.trim()) return;

    setAiLoading(true);
    setStatus('Talking to assistant…');
    setAiOutput('');

    const fileName = selectedScript ? selectedScript.name : '(none)';
    const fullPath = selectedScript ? selectedScript.path : '(no file selected)';

    try {
      const prompt = `
You are helping a user understand and safely use HexForge product scripts.

Current device: ${selectedScript?.device || '(unknown / not set)'}
Current script name: ${fileName}
Current script path: ${fullPath}

Current script content:
---
${code}
---

User question:
${aiInput || '(no explicit question – explain how this script works and how to customize it safely for Skull BadUSB / other devices)'}
      `.trim();

      const res = await axios.post('/assistant/mcp/chat', { prompt });

      const out =
        res.data.output ??
        res.data.response ??
        JSON.stringify(res.data, null, 2);

      setAiOutput(out);
      setStatus('✅ Assistant response ready');
    } catch (err) {
      console.error('AI helper error', err);
      setAiOutput('❌ Failed to contact assistant');
      setStatus('❌ Assistant error');
    } finally {
      setAiLoading(false);
    }
  };

  // --- Effects ---

  useEffect(() => {
    fetchScripts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [aiOutput]);

  // --- Render ---

  const fileName = selectedScript ? selectedScript.name : '(none)';
  const fullPath = selectedScript ? selectedScript.path : '';

  return (
    <div className="monaco-wrapper flex flex-col h-screen bg-zinc-950 text-white">
      <div className="scriptlab-shell">
        {/* Header */}
        <header className="scriptlab-header">
          <div>
            <h1 className="scriptlab-title">HEXFORGE SCRIPT LAB</h1>
            <p className="scriptlab-subtitle">
              Read-only payload library for HexForge devices. Use the assistant below to
              understand and customize scripts safely.
            </p>
            {fullPath && (
              <p className="scriptlab-path text-xs text-zinc-500 mt-1">
                {fullPath}
              </p>
            )}
          </div>
          <div className="scriptlab-header-actions">
            <button onClick={fetchScripts} className="btn-ghost">
              Refresh
            </button>
            {/* No Save/Run on public page – scripts are managed by you + the assistant */}
          </div>
        </header>

        {/* Main layout */}
        <div className="scriptlab-main">
          {/* Left: Script list */}
          <aside className="scriptlab-column scriptlab-column-left">
            <div className="scriptlab-section-header">
              <span className="section-label">SCRIPTS</span>
              <span className="section-meta">
                {DEFAULT_DEVICE || 'library'}
              </span>
            </div>

            <div className="scriptlab-file-list">
              {scripts.length === 0 && (
                <div className="empty-state">
                  No scripts found yet.
                  <br />
                  We&apos;ll add payloads here as products are finalized.
                </div>
              )}

              {scripts.map((script) => {
                const isActive =
                  selectedScript &&
                  selectedScript.device === script.device &&
                  selectedScript.name === script.name;

                return (
                  <button
                    key={`${script.device || 'global'}:${script.name}`}
                    onClick={() => handleSelectScript(script)}
                    className={
                      'scriptlab-file-item' + (isActive ? ' is-active' : '')
                    }
                  >
                    <span className="file-name">{script.name}</span>
                    <span className="file-path">
                      {script.path || script.device || ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Center: Editor (read-only) */}
          <section className="scriptlab-column scriptlab-column-center">
            <div className="scriptlab-section-header">
              <span className="section-label">SCRIPT</span>
              <span className="section-meta">
                {fileName || 'No script selected'}
              </span>
            </div>
            <div className="editor-container">
              <Editor
                height="100%"
                language={detectLanguage(fileName)}
                value={code}
                onChange={() => {
                  // Public Script Lab is read-only – ignore edits here.
                }}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </section>

          {/* Right: Details */}
          <aside className="scriptlab-column scriptlab-column-right">
            <div className="scriptlab-section-header">
              <span className="section-label">DETAILS</span>
            </div>
            <div className="scriptlab-details">
              <div className="detail-row">
                <span className="detail-label">Device</span>
                <span className="detail-value">
                  {selectedScript?.device || DEFAULT_DEVICE || '(not set)'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Script</span>
                <span className="detail-value">{fileName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Full Path</span>
                <span className="detail-value">
                  {fullPath || '(no file selected)'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Mode</span>
                <span className="detail-value">Read-only library</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value">{status}</span>
              </div>
            </div>
          </aside>
        </div>

        {/* AI helper (no shell, no execution) */}
        <section className="scriptlab-terminal">
          <div className="scriptlab-section-header">
            <span className="section-label">ASSISTANT</span>
            <span className="section-meta">Explain & customize scripts</span>
          </div>

          <textarea
            rows={3}
            placeholder={
              selectedScript
                ? 'Ask how this script works, how to tweak it, or how to safely use it on your device…'
                : 'Select a script, then ask how to use or modify it…'
            }
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            className="terminal-input"
          />

          <div className="terminal-buttons">
            <button
              onClick={() => {
                setAiInput('');
                setAiOutput('');
              }}
              className="btn-ghost"
            >
              Clear
            </button>
            <button
              onClick={handleAskAI}
              className="btn-primary"
              disabled={aiLoading}
            >
              {aiLoading ? 'Thinking…' : 'Ask Assistant'}
            </button>
          </div>

          <pre ref={outputRef} className="terminal-output">
            {aiOutput || 'No assistant output yet.'}
          </pre>
        </section>

        {/* Footer status */}
        <footer className="scriptlab-footer">
          <span className="section-label">SCRIPT LAB STATUS:</span>
          <span className="footer-output">
            {status || 'Idle'}
          </span>
        </footer>
      </div>
    </div>
  );
};

export default ScriptLabPage;
