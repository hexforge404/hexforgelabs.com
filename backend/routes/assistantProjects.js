// backend/routes/assistantProjects.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const AssistantProject = require("../models/AssistantProject");
const AssistantSession = require("../models/AssistantSession");

// GET /api/assistant-projects
// List all projects
router.get("/", async (req, res) => {
  try {
    const projects = await AssistantProject.find().sort({ createdAt: -1 }).lean();
    res.json(projects);
  } catch (err) {
    console.error("[assistant-projects] list error:", err);
    res.status(500).json({ error: "Failed to load assistant projects." });
  }
});

// POST /api/assistant-projects
// Create a new project
router.post("/", async (req, res) => {
  try {
    const {
      slug,
      name,
      description,
      status,
      tags,
      engineProjectId,
      assetsRootPath,
    } = req.body;

    if (!slug || !name) {
      return res.status(400).json({ error: "slug and name are required." });
    }

    const project = new AssistantProject({
      slug,
      name,
      description,
      status,
      tags,
      engineProjectId,
      assetsRootPath,
    });

    await project.save();
    res.status(201).json(project);
  } catch (err) {
    console.error("[assistant-projects] create error:", err);

    if (err.code === 11000) {
      return res.status(409).json({ error: "Project slug must be unique." });
    }

    res.status(500).json({ error: "Failed to create assistant project." });
  }
});

// GET /api/assistant-projects/:id
// Fetch a single project by Mongo _id OR slug
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let project = null;

    // If it looks like an ObjectId, try that first
    if (mongoose.isValidObjectId(id)) {
      project = await AssistantProject.findById(id);
    }

    // Otherwise (or if not found), fall back to slug
    if (!project) {
      project = await AssistantProject.findOne({ slug: id });
    }

    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    res.json(project);
  } catch (err) {
    console.error("[assistant-projects] get error:", err);
    res.status(500).json({ error: "Failed to load assistant project." });
  }
});

// PATCH /api/assistant-projects/:id
// Update basic project fields + engine pointers
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const update = {};

    [
      "slug",
      "name",
      "description",
      "status",
      "tags",
      "engineProjectId",
      "assetsRootPath",
    ].forEach((key) => {
      if (typeof req.body[key] !== "undefined") {
        update[key] = req.body[key];
      }
    });

    const project =
      (await AssistantProject.findByIdAndUpdate(id, update, {
        new: true,
      })) ||
      (await AssistantProject.findOneAndUpdate({ slug: id }, update, {
        new: true,
      }));

    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    res.json(project);
  } catch (err) {
    console.error("[assistant-projects] update error:", err);
    res.status(500).json({ error: "Failed to update assistant project." });
  }
});

// GET /api/assistant-projects/:id/sessions
// All sessions attached to this project, with part labels + engine fields
// GET /api/assistant-projects/:id/sessions
router.get("/:id/sessions", async (req, res) => {
  try {
    const { id } = req.params;

    let project = null;

    if (mongoose.isValidObjectId(id)) {
      project = await AssistantProject.findById(id);
    }
    if (!project) {
      project = await AssistantProject.findOne({ slug: id });
    }

    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    const sessions = await AssistantSession.find({
      projectId: String(project._id),   // 🔴 change is here
    })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      project,
      sessions,
    });
  } catch (err) {
    console.error("[assistant-projects] sessions error:", err);
    res.status(500).json({ error: "Failed to load project sessions." });
  }
});


module.exports = router;
