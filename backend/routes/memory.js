// backend/routes/memory.js
const express = require("express");
const MemoryModel = require("../models/Memory"); // Import Memory mongoose model
const { syncMemoryEntryToNotion } = require("../utils/notionSync");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const entry = new MemoryModel(req.body);
    await entry.save();

    // 🔁 Fire-and-forget Notion sync (ensure async to catch sync errors)
    setImmediate(() => {
      syncMemoryEntryToNotion(entry.toObject()).catch((err) => {
        console.error("[🧠 Notion] Background sync failed:", err.message || err);
      });
    });

    // Only return selected fields to avoid leaking internal details
    const {
      _id,
      name,
      description,
      category,
      tags,
      timestamp,
      tool,
      result,
      createdAt,
      updatedAt,
    } = entry.toObject();

    res.json({
      _id,
      name,
      description,
      category,
      tags,
      timestamp,
      tool,
      result,
      createdAt,
      updatedAt,
    });
  } catch (err) {
    console.error("[memory] save error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
