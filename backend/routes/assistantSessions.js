// backend/routes/assistantSessions.js
const express = require("express");
const router = express.Router();
const AssistantSession = require("../models/AssistantSession");

// GET /api/assistant-sessions/:sessionId
// Load a session transcript (or empty shell if not found)
router.get("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    const doc = await AssistantSession.findOne({ sessionId }).lean();

    if (!doc) {
      return res.json({
        sessionId,
        model: null,
        title: null,
        messages: [],
        createdAt: null,
        updatedAt: null,
      });
    }

    return res.json({
      sessionId: doc.sessionId,
      model: doc.model || null,
      title: doc.title || null,
      messages: doc.messages || [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    console.error("[assistant-sessions] GET error", err);
    return res.status(500).json({ error: "Failed to load assistant session" });
  }
});

// POST /api/assistant-sessions/:sessionId/append
// Append one or more messages to a session (upsert)
router.post("/:sessionId/append", async (req, res) => {
  const { sessionId } = req.params;
  const { model, title, messages } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages[] is required" });
  }

  const cleanMessages = messages.map((m) => ({
    role: ["assistant", "system"].includes(m.role) ? m.role : "user",
    content: String(m.content || "").slice(0, 4000),
    createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
  }));

  try {
    const doc = await AssistantSession.findOneAndUpdate(
      { sessionId },
      {
        $setOnInsert: { sessionId },
        $set: {
          model: model || undefined,
          title: title || undefined,
        },
        $push: { messages: { $each: cleanMessages } },
      },
      {
        new: true,
        upsert: true,
      }
    );

    return res.json({
      ok: true,
      sessionId: doc.sessionId,
      count: doc.messages.length,
    });
  } catch (err) {
    console.error("[assistant-sessions] append error", err);
    return res.status(500).json({ error: "Failed to append assistant session" });
  }
});

module.exports = router;
