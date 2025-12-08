// backend/routes/notion.js
const express = require("express");
const { Client } = require("@notionhq/client");

// 🧠 Notion sync utilities (memory → notion, files, log entries)
const {
  NotionRoutes,
  syncToNotion,
  deleteByTool,
} = require("../utils/notionSync");

// 🔍 Discovery utilities
const {
  listAllNotionObjects,
  getNotionObject,
} = require("../utils/notionDiscovery");

// 🔧 Database IDs loaded from config/notionResources.js
const notionResources = require("../config/notionResources");

const router = express.Router();
const notion = new Client({ auth: process.env.NOTION_TOKEN });

/* ============================================================================
 * 🧠 KNOWLEDGE + FILE ATTACHMENT
 * ============================================================================
 */

// POST /api/notion/knowledge-entry
router.post("/knowledge-entry", NotionRoutes.createKnowledgeEntry);

// POST /api/notion/attach-file
router.post("/attach-file", NotionRoutes.attachFile);

/* ============================================================================
 * 🧠 MEMORY SYNC / DELETE
 * ============================================================================
 */

// POST /api/notion/memory-sync
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

// DELETE /api/notion/memory-delete
router.delete("/memory-delete", async (req, res) => {
  const { tool, target = "assistant_log" } = req.body || {};

  if (!tool || typeof tool !== "string" || tool.trim() === "") {
    return res.status(400).json({ error: "Missing or invalid tool" });
  }

  try {
    await deleteByTool(tool, target);
    return res.json({ status: "ok", mode: "delete" });
  } catch (err) {
    console.error("[🧠 Notion] /memory-delete error:", err, req.body);
    return res.status(500).json({ error: err.message });
  }
});

/* ============================================================================
 * 🔍 DATABASE / PAGE DISCOVERY
 * ============================================================================
 */

// GET /api/notion/discover
router.get("/discover", async (req, res) => {
  const type = (req.query.type || "database").toLowerCase();
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

/* ============================================================================
 * 📚 DIRECT DATABASE CONNECTORS (Admin Panel + Assistant)
 * ============================================================================
 */

// GET /api/notion/assistant-log
router.get("/assistant-log", async (req, res) => {
  try {
    const dbId = notionResources.assistantLogDbId;
    if (!dbId) return res.status(500).json({ error: "Assistant log DB not configured" });

    const response = await notion.databases.query({
      database_id: dbId,
      page_size: 50,
      sorts: [
        {
          property: "Last edited time",
          direction: "descending",
        },
      ],
    });

    res.json(response);
  } catch (err) {
    console.error("[Notion] /assistant-log error:", err.body || err);
    res.status(500).json({ error: "Failed to fetch assistant log from Notion" });
  }
});

// GET /api/notion/knowledge-base
router.get("/knowledge-base", async (req, res) => {
  try {
    const dbId = notionResources.knowledgeBaseDbId;
    if (!dbId) return res.status(500).json({ error: "Knowledge base DB not configured" });

    const response = await notion.databases.query({
      database_id: dbId,
      page_size: 50,
    });

    res.json(response);
  } catch (err) {
    console.error("[Notion] /knowledge-base error:", err.body || err);
    res.status(500).json({ error: "Failed to fetch knowledge base" });
  }
});

// GET /api/notion/inventory  ← Used by Admin Inventory Viewer & Assistant Tools
router.get("/inventory", async (req, res) => {
  try {
    const dbId = notionResources.inventoryDbId;
    if (!dbId) return res.status(500).json({ error: "Inventory DB not configured" });

    const response = await notion.databases.query({
      database_id: dbId,
      page_size: 200,
    });

    res.json(response);
  } catch (err) {
    console.error("[Notion] /inventory error:", err.body || err);
    res.status(500).json({ error: "Failed to fetch inventory from Notion" });
  }
});

module.exports = router;
