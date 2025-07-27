// backend/utils/notionSync.js
const { Client } = require("@notionhq/client");
const { getNotionTarget } = require("./notionRouter");
const stripAnsi = require("strip-ansi");
const fs = require("fs");
const path = require("path");

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// =============== Core Functions ===============

async function syncToNotion(entry, target = "assistant_log") {
  const databaseId = getNotionTarget(target);
  if (!databaseId || !entry.tool || !entry.timestamp) {
    console.warn("[🧠 Notion] Missing data or invalid target.");
    return;
  }

  let resultText = JSON.stringify(entry.result);
  resultText = stripAnsi(resultText).replace(/<[^>]*>/g, '').slice(0, 1900);

  const properties = {
    Name: { title: [{ text: { content: entry.tool } }] },
    Tool: { rich_text: [{ text: { content: entry.tool } }] },
    Result: { rich_text: [{ text: { content: resultText } }] },
    Timestamp: { date: { start: entry.timestamp } },
    Tag: { multi_select: [{ name: "Synced" }] },
    ...(entry.id && { ID: { rich_text: [{ text: { content: entry.id } }] } })
  };

  try {
    if (entry.notion_page_id) {
      await notion.pages.update({ page_id: entry.notion_page_id, properties });
      console.log(`[🧠 Notion] Updated '${entry.tool}' in '${target}'`);
    } else {
      const page = await notion.pages.create({ parent: { database_id: databaseId }, properties });
      console.log(`[🧠 Notion] Created '${entry.tool}' in '${target}'`);
      return page;
    }
  } catch (err) {
    console.error("[🧠 Notion] Sync failed:", err.body ?? err);
  }
}

async function readFromNotion(target = "assistant_log", filter = null) {
  const databaseId = getNotionTarget(target);
  if (!databaseId) return [];
  try {
    const res = await notion.databases.query({ database_id: databaseId, ...(filter && { filter }) });
    return res.results.map(page => ({
      id: page.id,
      tool: page.properties?.Tool?.rich_text?.[0]?.text?.content || "Unknown",
      result: page.properties?.Result?.rich_text?.[0]?.text?.content || "",
      timestamp: page.properties?.Timestamp?.date?.start || null,
      tags: page.properties?.Tag?.multi_select?.map(t => t.name) || [],
      notion_page_url: page.url,
    }));
  } catch (err) {
    console.error("[🧠 Notion] Read failed:", err.body ?? err);
    return [];
  }
}

async function deleteFromNotion(pageId) {
  if (!pageId) return;
  try {
    await notion.pages.update({ page_id: pageId, archived: true });
    console.log(`[🧠 Notion] Deleted page ${pageId}`);
  } catch (err) {
    console.error("[🧠 Notion] Delete failed:", err.body ?? err);
  }
}

async function deleteByTool(tool, target = "assistant_log") {
  const entries = await readFromNotion(target);
  const match = [...entries].reverse().find(e => e.tool === tool);
  if (match) await deleteFromNotion(match.id);
  else console.log(`[🧠 Notion] No entry found for '${tool}' in '${target}'`);
}

async function upsertByTool(entry, target = "assistant_log") {
  const match = (await readFromNotion(target)).find(e => e.tool === entry.tool);
  if (match) entry.notion_page_id = match.id;
  return syncToNotion(entry, target);
}

async function queryByTool(tool, target = "assistant_log") {
  return readFromNotion(target, {
    property: "Tool",
    rich_text: { equals: tool },
  });
}

function validateNotionEnv() {
  const allIds = Object.entries(process.env).filter(([k]) => k.startsWith("NOTION_"));
  const missing = allIds.filter(([, v]) => !v || v.includes("your_"));
  if (missing.length) console.warn("[⚠️ Notion] Missing IDs:", missing.map(([k]) => k).join(", "));
  else console.log("[✅ Notion] All Notion environment variables look valid.");
}

async function syncAllFromMemory(memory, target = "assistant_log") {
  for (const entry of memory) {
    await upsertByTool(entry, target);
  }
}

async function testNotionConnection() {
  const keys = Object.keys(process.env).filter(k => k.startsWith("NOTION_DB_"));
  for (const key of keys) {
    const dbId = process.env[key];
    try {
      await notion.databases.retrieve({ database_id: dbId });
      console.log(`[✅ Notion] ${key} is accessible`);
    } catch (e) {
      console.error(`[❌ Notion] ${key} failed:`, e.message);
    }
  }
}

async function generateKnowledgeEntry({ title, body, tags = [] }) {
  const databaseId = getNotionTarget("knowledge_base");
  if (!databaseId || !title || !body) return;

  try {
    await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: { title: [{ text: { content: title } }] },
        Tags: { multi_select: tags.map(t => ({ name: t })) },
        Content: { rich_text: [{ text: { content: body.slice(0, 1900) } }] }
      }
    });
    console.log(`[📘 KB] Created knowledge entry: '${title}'`);
  } catch (e) {
    console.error(`[📘 KB] Failed to create knowledge entry '${title}':`, e.message);
  }
}

async function attachFileToPage(pageId, filePath) {
  if (!pageId || !fs.existsSync(filePath)) return;
  const fileName = path.basename(filePath);

  try {
    await notion.blocks.children.append({
      block_id: pageId,
      children: [
        {
          object: "block",
          type: "file",
          file: {
            type: "external",
            external: { url: `https://hexforgelabs.com/uploads/${fileName}` }
          }
        }
      ]
    });
    console.log(`[📎 Notion] Attached file '${fileName}' to page ${pageId}`);
  } catch (err) {
    console.error("[📎 Notion] File attach failed:", err.message);
  }
}

// Express-compatible API endpoints (optional routing helpers)
const NotionRoutes = {
  async createKnowledgeEntry(req, res) {
    const { title, body, tags } = req.body;
    try {
      await generateKnowledgeEntry({ title, body, tags });
      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async attachFile(req, res) {
    const { pageId, filePath } = req.body;
    try {
      await attachFileToPage(pageId, filePath);
      res.json({ status: "file attached" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = {
  syncToNotion,
  readFromNotion,
  deleteFromNotion,
  deleteByTool,
  upsertByTool,
  queryByTool,
  validateNotionEnv,
  syncAllFromMemory,
  testNotionConnection,
  generateKnowledgeEntry,
  attachFileToPage,
  NotionRoutes
};
