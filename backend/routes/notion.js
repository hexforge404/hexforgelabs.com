// backend/routes/notion.js
const express = require("express");
const { Client } = require("@notionhq/client");

const {
  NotionRoutes,
  syncToNotion,
  deleteByTool,
} = require("../utils/notionSync");

const {
  listAllNotionObjects,
  getNotionObject,
} = require("../utils/notionDiscovery"); // 🔍 discovery helpers

const notionResources = require("../config/notionResources");

const router = express.Router();
const notion = new Client({ auth: process.env.NOTION_TOKEN });

/* ============================
 *  🧠 Memory & Knowledge routes
 * ============================ */

// POST /api/notion/knowledge-entry
router.post("/knowledge-entry", NotionRoutes.createKnowledgeEntry);

// POST /api/notion/attach-file
router.post("/attach-file", NotionRoutes.attachFile);

// === 🧠 Memory → Notion sync endpoints ===

// One-shot write. Does NOT look up existing entries.
router.post("/memory-sync", async (req, res) => {
  const { entry, target = "assistant_log" } = req.body || {};

  if (
    !entry ||
    typeof entry.tool !== "string" ||
    entry.tool.trim() === "" ||
    !entry.timestamp ||
    entry.timestamp.trim() === "" ||
    isNaN(Date.parse(entry.timestamp))
  ) {
    return res
      .status(400)
      .json({ error: "Missing or invalid entry, tool, or timestamp" });
  }

  try {
    const page = await syncToNotion(entry, target);
    return res.json({ status: "ok", mode: "sync", page });
  } catch (err) {
    console.error("[🧠 Notion] /memory-sync error:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/memory-delete", async (req, res) => {
  const { tool, target = "assistant_log" } = req.body || {};

  if (!tool || typeof tool !== "string" || tool.trim() === "") {
    return res.status(400).json({ error: "Missing or invalid tool" });
  }

  try {
    await deleteByTool(tool, target);
    return res.json({ status: "ok", mode: "delete" });
  } catch (err) {
    console.error(
      "[🧠 Notion] /memory-delete error:",
      err,
      "Request body:",
      req.body
    );
    return res.status(500).json({ error: err.message });
  }
});

/* ============================
 *  🔍 Discovery helpers
 * ============================ */

// GET /api/notion/discover?type=database|page|both&query=...
router.get("/discover", async (req, res) => {
  const type = (req.query.type || "database").toLowerCase(); // database | page | both
  const query = req.query.query || "";

  try {
    const items = await listAllNotionObjects({ type, query });
    return res.json({
      type,
      query: query || null,
      count: items.length,
      items,
    });
  } catch (err) {
    console.error("[🧠 Notion] /discover error:", err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// GET /api/notion/object/:id
router.get("/object/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const obj = await getNotionObject(id);
    return res.json(obj);
  } catch (err) {
    console.error("[🧠 Notion] /object error:", err);
    return res.status(404).json({ error: err.message || String(err) });
  }
});

/* ============================
 *  📚 Direct DB helpers
 * ============================ */

// GET /api/notion/assistant-log
router.get("/assistant-log", async (req, res) => {
  try {
    const dbId = notionResources.assistantLogDbId;
    if (!dbId) {
      return res
        .status(500)
        .json({ error: "Assistant log DB id not configured" });
    }

    const response = await notion.databases.query({
      database_id: dbId,
      page_size: 20,
      sorts: [
        {
          timestamp: "last_edited_time",
          direction: "descending",
        },
      ],
    });

    res.json(response);
  } catch (err) {
    console.error("[Notion] /assistant-log error:", err.body || err);
    res
      .status(500)
      .json({ error: "Failed to fetch assistant log from Notion" });
  }
});

// GET /api/notion/knowledge-base
router.get("/knowledge-base", async (req, res) => {
  try {
    const dbId = notionResources.knowledgeBaseDbId;
    if (!dbId) {
      return res
        .status(500)
        .json({ error: "Knowledge base DB id not configured" });
    }

    const response = await notion.databases.query({
      database_id: dbId,
      page_size: 50,
    });

    res.json(response);
  } catch (err) {
    console.error("[Notion] /knowledge-base error:", err.body || err);
    res
      .status(500)
      .json({ error: "Failed to fetch knowledge base from Notion" });
  }
});

// GET /api/notion/inventory
router.get("/inventory", async (req, res) => {
  try {
    const dbId = notionResources.inventoryDbId;
    if (!dbId) {
      return res
        .status(500)
        .json({ error: "Inventory DB id not configured" });
    }

    const response = await notion.databases.query({
      database_id: dbId,
      page_size: 100,
    });

    res.json(response);
  } catch (err) {
    console.error("[Notion] /inventory error:", err.body || err);
    res
      .status(500)
      .json({ error: "Failed to fetch inventory from Notion" });
  }
});

module.exports = router;
