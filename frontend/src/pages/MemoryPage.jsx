import React, { useEffect, useState } from 'react';
import './MemoryPage.css';

const MemoryPage = () => {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    fetch('/api/memory/all')
      .then(res => res.json())
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  return (
    <div className="memory-view">
      <h2>🧠 Assistant Memory Log</h2>
      <ul>
        {entries.slice().reverse().map((e, i) => (
          <li key={i}>
            <div><strong>{e.timestamp}</strong></div>
            <pre>{JSON.stringify(e.result, null, 2)}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MemoryPage;
