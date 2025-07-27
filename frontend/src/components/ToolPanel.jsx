import React, { useEffect, useState } from "react";
import axios from "axios";

function ToolPanel({ runTool }) {
  const [tools, setTools] = useState([]);

  useEffect(() => {
    axios.get("/api/tool/list")
      .then(res => setTools(res.data.tools || []))
      .catch(err => console.error("Tool list error:", err));
  }, []);

  return (
    <div className="tool-panel">
      {tools.map((tool) => (
        <button
          key={tool.name}
          onClick={() => runTool(tool.name)}
        >
          {tool.label}
        </button>
      ))}
    </div>
  );
}

export default ToolPanel;
