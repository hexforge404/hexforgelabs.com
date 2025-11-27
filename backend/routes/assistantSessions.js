// backend/routes/assistantSessions.js
const express = require("express");
const router = express.Router();
const AssistantSession = require("../models/AssistantSession");

// 🔹 GET /api/assistant-sessions
// List all sessions (metadata only)
router.get("/", async (req, res) => {
  try {
    const docs = await AssistantSession.find(
      {},
      "sessionId title model createdAt updatedAt"
    )
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({
      sessions: docs.map((doc) => ({
        id: doc.sessionId,
        sessionId: doc.sessionId,
        title: doc.title || doc.sessionId,
        model: doc.model || null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
    });
  } catch (err) {
    console.error("[assistant-sessions] list error", err);
    return res.status(500).json({ error: "Failed to list assistant sessions" });
  }
});

// 🔹 POST /api/assistant-sessions
// Create or upsert a session *without* needing messages
router.post("/", async (req, res) => {
  const { sessionId, title, model } = req.body || {};
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    const doc = await AssistantSession.findOneAndUpdate(
      { sessionId },
      {
        $setOnInsert: { sessionId },
        $set: {
          title: title || sessionId,
          model: model || undefined,
        },
      },
      { new: true, upsert: true }
    );

    return res.json({
      ok: true,
      session: {
        id: doc.sessionId,
        sessionId: doc.sessionId,
        title: doc.title || doc.sessionId,
        model: doc.model || null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (err) {
    console.error("[assistant-sessions] create error", err);
    return res.status(500).json({ error: "Failed to create assistant session" });
  }
});

// 🔹 PATCH /api/assistant-sessions/:sessionId
// Rename / change model
router.patch("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const { title, model } = req.body || {};

  if (!title && !model) {
    return res
      .status(400)
      .json({ error: "Nothing to update (title or model required)" });
  }

  try {
    const update = {};
    if (title) update.title = String(title).slice(0, 120);
    if (model) update.model = String(model);

    const doc = await AssistantSession.findOneAndUpdate(
      { sessionId },
      { $set: update },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json({
      ok: true,
      session: {
        id: doc.sessionId,
        sessionId: doc.sessionId,
        title: doc.title || doc.sessionId,
        model: doc.model || null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (err) {
    console.error("[assistant-sessions] patch error", err);
    return res.status(500).json({ error: "Failed to update assistant session" });
  }
});

// 🔹 DELETE /api/assistant-sessions/:sessionId
// Delete a whole session (metadata + messages)
router.delete("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    const result = await AssistantSession.deleteOne({ sessionId });
    return res.json({
      ok: true,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("[assistant-sessions] delete error", err);
    return res.status(500).json({ error: "Failed to delete assistant session" });
  }
});


// 🔹 EXISTING ROUTES (keep what you already had below)
// GET /api/assistant-sessions/:sessionId
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

// backend/routes/assistantSessions.js (example PATCH)
router.patch("/:sessionId/metadata", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { projectId, partLabel, enginePartId, assetsPath } = req.body;

    const update = {};
    if (typeof projectId !== "undefined") update.projectId = projectId || null;
    if (typeof partLabel !== "undefined") update.partLabel = partLabel;
    if (typeof enginePartId !== "undefined") update.enginePartId = enginePartId;
    if (typeof assetsPath !== "undefined") update.assetsPath = assetsPath;

    const session = await AssistantSession.findOneAndUpdate(
      { sessionId },
      update,
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }

    res.json(session);
  } catch (err) {
    console.error("[assistant-sessions] metadata update error:", err);
    res.status(500).json({ error: "Failed to update session metadata." });
  }
});


// POST /api/assistant-sessions/:sessionId/append
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
