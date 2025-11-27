// backend/routes/assistantProjects.js
const express = require("express");
const AssistantProject = require("../models/AssistantProject");
const AssistantSession = require("../models/AssistantSession");

const router = express.Router();

// GET /api/assistant-projects
router.get("/", async (req, res) => {
  try {
    const projects = await AssistantProject.find().sort({ updatedAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error("GET /assistant-projects error:", err);
    res.status(500).json({ error: "Failed to load assistant projects" });
  }
});

// helper – very simple slugger
function makeSlug(name) {
  const base =
    (name || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project";

  const rand = Math.random().toString(36).slice(2, 7);
  return `${base}-${rand}`;
}

// POST /api/assistant-projects
router.post("/", async (req, res) => {
  try {
    const { name, status, tags, description } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const project = new AssistantProject({
      slug: makeSlug(name),
      name: name.trim(),
      status: status || "active",
      tags: Array.isArray(tags) ? tags : [],
      description: description || "",
    });

    await project.save();
    res.status(201).json(project);
  } catch (err) {
    console.error("POST /assistant-projects error:", err);
    res.status(500).json({ error: "Failed to create assistant project" });
  }
});

// PATCH /api/assistant-projects/:id
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status, tags, description } = req.body || {};

    const project = await AssistantProject.findById(id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (name && name.trim()) project.name = name.trim();
    if (status) project.status = status;
    if (Array.isArray(tags)) project.tags = tags;
    if (typeof description === "string") project.description = description;

    await project.save();
    res.json(project);
  } catch (err) {
    console.error("PATCH /assistant-projects/:id error:", err);
    res.status(500).json({ error: "Failed to update assistant project" });
  }
});

// DELETE /api/assistant-projects/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const project = await AssistantProject.findById(id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    await project.deleteOne();
    // Optionally clear projectId from sessions:
    // await AssistantSession.updateMany({ projectId: id }, { $set: { projectId: null } });

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /assistant-projects/:id error:", err);
    res.status(500).json({ error: "Failed to delete assistant project" });
  }
});

// GET /api/assistant-projects/:id/sessions
router.get("/:id/sessions", async (req, res) => {
  try {
    const { id } = req.params;

    const sessions = await AssistantSession.find({ projectId: id }).sort({
      updatedAt: -1,
    });

    const payload = sessions.map((s) => ({
      sessionId: s.sessionId,
      title: s.title,
      model: s.model,
      enginePartId: s.enginePartId || null,
      assetsPath: s.assetsPath || null,
      partLabel: s.partLabel || null,
      updatedAt: s.updatedAt,
    }));

    res.json(payload);
  } catch (err) {
    console.error("GET /assistant-projects/:id/sessions error:", err);
    res.status(500).json({ error: "Failed to load project sessions" });
  }
});

module.exports = router;
