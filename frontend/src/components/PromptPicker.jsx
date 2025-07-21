import React from 'react';

const PromptPicker = ({ onSelect }) => {
  const prompts = [
    { label: '🔧 System Status', text: '!status' },
    { label: '📶 Ping Google', text: '!ping 8.8.8.8' },
    { label: '🧠 View Memory', text: '!memory' },
    { label: '📊 Disk Usage', text: '!df' }
  ];

  return (
    <select onChange={(e) => onSelect(e.target.value)} defaultValue="">
      <option value="">🧠 Prompt Templates</option>
      {prompts.map((p, i) => (
        <option key={i} value={p.text}>{p.label}</option>
      ))}
    </select>
  );
};

export default PromptPicker;
