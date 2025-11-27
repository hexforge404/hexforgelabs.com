// backend/models/AssistantProject.js
const mongoose = require("mongoose");

const AssistantProjectSchema = new mongoose.Schema(
  {
    // Human-friendly slug / id, e.g. "hexforge-content-engine"
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Display name in the UI
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["active", "paused", "completed", "archived"],
      default: "active",
    },

    tags: {
      type: [String],
      default: [],
    },

    // 🔗 Content Engine integration -----------------------------

    // Project id/name as used by the Content Engine
    // e.g. "hexforge-content-engine", "hexforgelabs-store"
    engineProjectId: {
      type: String,
      default: "",
    },

    // Root path where that project's assets live (optional)
    // e.g. "/mnt/hdd-storage/hexforge-content-engine/projects/hexforge-content-engine"
    assetsRootPath: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AssistantProject", AssistantProjectSchema, "assistant_projects");

