import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import './MonacoEditorPage.css';
import './MonacoEditorPage.theme.css';
import axios from 'axios';

const MonacoEditorPage = () => {
  const [code, setCode] = useState('// Loading...');
  const [filename, setFilename] = useState('');
  const [files, setFiles] = useState([]);
  const [extensionFilter] = useState('.py');
  const [recursive] = useState(true);
  const [terminalMode, setTerminalMode] = useState('ai');
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalOutput, setTerminalOutput] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState('');
  const [leftTab, setLeftTab] = useState('Files');
  const [rightTab, setRightTab] = useState('Info');

  const outputRef = useRef(null);
  const inputRef = useRef(null);

  const handleOpenFile = async (path) => {
    try {
      const res = await axios.post('/api/editor/open', { path });
      setCode(res.data.content ?? '// No content available');
      setFilename(path);
      setStatus('✅ File loaded');
    } catch {
      setStatus('❌ Failed to open');
    }
  };

  const handleSaveFile = async () => {
    if (!filename || code == null) {
      setStatus('❌ No file or code to save');
      return;
    }
    try {
      await axios.post('/api/editor/save', { path: filename, content: code });
      setStatus('✅ File saved');
    } catch {
      setStatus('❌ Failed to save');
    }
  };

  const handleTerminalSubmit = async () => {
    if (!terminalInput) return;
    inputRef.current?.focus();
    try {
      if (terminalMode === 'ai') {
        const res = await axios.post('/chat', { message: terminalInput });
        setTerminalOutput(res.data.response ?? '(No response)');
      } else {
        const res = await axios.post('/api/editor/terminal', { command: terminalInput });
        setTerminalOutput(res.data.output ?? '(No output)');
      }
    } catch {
      setTerminalOutput('❌ Command failed');
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await axios.get('/api/editor/list', {
        params: { ext: extensionFilter, recursive }
      });
      setFiles(res.data.files || []);
      if (res.data.files?.length && !filename) handleOpenFile(res.data.files[0]);
    } catch {
      setFiles([]);
      setStatus('❌ Could not load file list');
    }
  };

  const handleRunCode = async () => {
    try {
      const res = await axios.post('/api/editor/execute', { content: code });
      setOutput(res.data.output ?? '(No output)');
      setStatus('✅ Code executed');
    } catch (err) {
      setOutput(err.response?.data?.output || 'Execution failed');
      setStatus('❌ Run error');
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const detectLanguage = (filename) => {
    const extMap = {
      '.js': 'javascript', '.sh': 'shell', '.json': 'json',
      '.html': 'html', '.css': 'css', '.md': 'markdown'
    };
    const ext = Object.keys(extMap).find(e => filename.endsWith(e));
    return extMap[ext] || 'python';
  };

  return (
    <div className="monaco-wrapper flex flex-col h-screen bg-zinc-950 text-white">
    
      {/* Top Bar */}
      <div className="bg-zinc-900 p-2 text-sm flex items-center justify-between border-b border-zinc-700">
        <div>
          <button onClick={() => setLeftTab(leftTab === 'Files' ? 'Terminal' : 'Files')} className="px-3 py-1">
            {leftTab}
          </button>
          <button onClick={() => setRightTab(rightTab === 'Info' ? 'Details' : 'Info')} className="px-3 py-1">
            {rightTab}
          </button>
        </div>
        <div>
          <button onClick={fetchFiles} className="bg-emerald-600 px-3 py-1 rounded text-white">Refresh Files</button>
          <button onClick={() => setFilename('')} className="bg-red-600 ml-2 px-3 py-1 rounded text-white">Close File</button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Left Panel */}
        {leftTab === 'Files' && (
          <div className="w-60 bg-zinc-900 border-r border-zinc-700 flex flex-col">
            <div className="p-3 border-b border-zinc-700 text-xs text-zinc-400 font-bold">Files</div>
            <div className="overflow-y-auto flex-1">
              {files.map((file, idx) => (
                <button key={idx} onClick={() => handleOpenFile(file)} className={`w-full px-3 py-1 text-sm truncate ${file === filename ? 'bg-zinc-800 text-emerald-400' : 'text-white hover:bg-zinc-800'}`}>
                  {file.split('/').pop()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Editor + Terminal */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-zinc-900 p-2 flex justify-between items-center border-b border-zinc-700">
            <span className="text-zinc-400 truncate">{filename}</span>
            <div>
              <button onClick={handleSaveFile} className="bg-emerald-600 px-3 py-1 rounded text-white">Save</button>
              <span className="ml-3 text-xs text-zinc-400">{status}</span>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="editor-container">
              <Editor
                height="100%"
                language={detectLanguage(filename)}
                value={code}
                onChange={(val) => setCode(val ?? '')}
                theme="vs-dark"
              />
            </div>


          {/* Terminal */}
          {leftTab === 'Terminal' && (
            <div className="terminal-panel bg-zinc-900 border-t border-zinc-700 p-2 text-xs text-green-400 max-h-48 overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-zinc-400">Mode:</label>
                <select value={terminalMode} onChange={(e) => setTerminalMode(e.target.value)} className="bg-zinc-800 px-2 py-1 text-xs border border-zinc-600 text-white">
                  <option value="ai">AI Chat</option>
                  <option value="shell">Shell Command</option>
                </select>
              </div>
              <textarea
                ref={inputRef}
                rows={2}
                placeholder={terminalMode === 'ai' ? 'Ask the AI something...' : 'Type a shell command...'}
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                className="w-full bg-zinc-800 p-2 mb-2 text-white border border-zinc-600 resize-none"
              />
              <div className="flex gap-2 mb-2">
                <button onClick={() => setTerminalInput('')} className="bg-zinc-700 px-3 py-1 text-white text-xs rounded">Clear</button>
                <button onClick={handleTerminalSubmit} className="bg-emerald-600 px-3 py-1 text-white text-xs rounded">Run</button>
              </div>
              <pre ref={outputRef} className="text-green-300">{terminalOutput}</pre>
            </div>
          )}

          {/* Footer */}
          <div className="bg-zinc-900 p-2 border-t border-zinc-700 flex justify-between items-center">
            <button onClick={handleRunCode} className="bg-emerald-600 text-sm text-white px-3 py-1 rounded">Run Code</button>
            <span className="text-xs text-zinc-400">{output}</span>
          </div>
        </div>

        {/* Right Panel */}
        {rightTab === 'Details' && (
          <div className="w-60 bg-zinc-900 border-l border-zinc-700 flex flex-col">
            <div className="p-3 border-b border-zinc-700 text-xs text-zinc-400 font-bold">Details</div>
            <div className="p-3 text-sm text-white">
              <div><strong>File:</strong> {filename?.split('/').pop() || '(none)'}</div>
              <div><strong>Mode:</strong> {terminalMode}</div>
              <div><strong>Status:</strong> {status}</div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default MonacoEditorPage;
