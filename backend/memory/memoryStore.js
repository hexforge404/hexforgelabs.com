// backend/memory/memoryStore.js
const fs = require("fs");
const path = require("path");
const { syncToNotion } = require("../utils/notionSync");

const MEMORY_FILE = path.join(__dirname, "memory-log.json");

let memory = [];

// Load existing memory on startup
if (fs.existsSync(MEMORY_FILE)) {
  try {
    const raw = fs.readFileSync(MEMORY_FILE, "utf-8");
    memory = JSON.parse(raw);
    console.log(`[🧠 Memory] Loaded ${memory.length} entries from disk.`);
  } catch (err) {
    console.error("[🧠 Memory] Failed to load from disk:", err);
  }
}

function saveMemoryToDisk() {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
    console.log(`[🧠 Memory] Persisted ${memory.length} entries to disk.`);
  } catch (err) {
    console.error("[🧠 Memory] Failed to write to disk:", err);
  }
}

function generateHexId() {
  const currentMax = memory.reduce((max, entry) => {
    const match = entry.id && entry.id.match(/^HEX-(\d+)$/);
    const num = match ? parseInt(match[1], 10) : 0;
    return Math.max(max, num);
  }, 0);

  return `HEX-${currentMax + 1}`;
}

/**
 * Adds a new memory entry, caps at 100 entries, persists, and syncs to Notion.
 */
function addMemory(entry) {
  const timestamped = {
    ...entry,
    id: generateHexId(), // 🆕 Assign a unique HEX-N ID
    timestamp: new Date().toISOString(),
  };

  memory.push(timestamped);
  console.log("[🧠 Memory] Added:", timestamped);

  // Cap to latest 100
  if (memory.length > 100) {
    const removed = memory.shift();
    console.log("[🧠 Memory] Removed oldest entry:", removed);
  }

  saveMemoryToDisk();

  // Fire-and-forget Notion sync
  syncToNotion(timestamped).catch(err => {
    console.error("[🧠 Memory] Notion sync error:", err);
  });
}

/** Returns all stored memory objects. */
function getMemory() {
  console.log(`[🧠 Memory] Fetching ${memory.length} entries`);
  return memory;
}

/** Clears all stored memory entries, persists the empty file. */
function resetMemory() {
  console.log(`[🧠 Memory] Reset. ${memory.length} entries cleared.`);
  memory = [];
  saveMemoryToDisk();
}

/** Finds entries matching a specific tool name. */
function findByTool(tool) {
  const result = memory.filter(e => e.tool === tool);
  console.log(`[🧠 Memory] Found ${result.length} entries for tool '${tool}'`);
  return result;
}

/** Searches entries for a keyword in tool or result. */
function searchByKeyword(keyword) {
  const result = memory.filter(e =>
    JSON.stringify(e).toLowerCase().includes(keyword.toLowerCase())
  );
  console.log(`[🧠 Memory] Found ${result.length} entries matching '${keyword}'`);
  return result;
}

/** Returns the most recent memory entry. */
function getLastEntry() {
  if (memory.length === 0) return null;
  const last = memory[memory.length - 1];
  console.log("[🧠 Memory] Last entry:", last);
  return last;
}

/** Deletes the most recent entry for a given tool. */
function deleteLastByTool(tool) {
  const idx = [...memory].reverse().findIndex(e => e.tool === tool);
  if (idx === -1) return false;
  const realIdx = memory.length - 1 - idx;
  const [removed] = memory.splice(realIdx, 1);
  console.log(`[🧠 Memory] Deleted most recent '${tool}' entry:`, removed);
  saveMemoryToDisk();
  return true;
}

/** Clears all entries for a specific tool. */
function clearByTool(tool) {
  const before = memory.length;
  memory = memory.filter(e => e.tool !== tool);
  const removedCount = before - memory.length;
  console.log(`[🧠 Memory] Cleared ${removedCount} entries for tool '${tool}'`);
  saveMemoryToDisk();
  return removedCount;
}

/** Exports memory as a JSON string. */
function exportMemoryJSON() {
  console.log(`[🧠 Memory] Exporting memory: ${memory.length} entries`);
  return JSON.stringify(memory, null, 2);
}

/** Exports memory as a CSV string. */
function exportMemoryCSV() {
  console.log(`[🧠 Memory] Exporting memory as CSV: ${memory.length} entries`);
  const header = Object.keys(memory[0] || {}).join(",");
  const rows = memory.map(entry =>
    Object.values(entry)
      .map(val => `"${String(val).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header, ...rows].join("\n");
}

/** Exports memory as an XML string. */
function exportMemoryXML() {
  console.log(`[🧠 Memory] Exporting memory as XML: ${memory.length} entries`);
  const entriesXML = memory
    .map(entry => {
      const fields = Object.entries(entry)
        .map(([k, v]) => `<${k}>${String(v)}</${k}>`)
        .join("");
      return `<entry>${fields}</entry>`;
    })
    .join("");
  return `<memory>${entriesXML}</memory>`;
}

/** Exports memory as a YAML string. */
function exportMemoryYAML() {
  console.log(`[🧠 Memory] Exporting memory as YAML: ${memory.length} entries`);
  const docs = memory.map(entry =>
    Object.entries(entry)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join("\n")
  );
  return docs.join("\n---\n");
}

// Single export at bottom
module.exports = {
  addMemory,
  getMemory,
  resetMemory,
  findByTool,
  searchByKeyword,
  getLastEntry,
  deleteLastByTool,
  clearByTool,
  exportMemoryJSON,
  exportMemoryCSV,
  exportMemoryXML,
  exportMemoryYAML,
};
