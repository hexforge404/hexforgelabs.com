// backend/models/AssistantProject.js
const mongoose = require("mongoose");

const AssistantProjectSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
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
    engineProjectId: {
      type: String,
      default: "",
    },
    assetsRootPath: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "AssistantProject",
  AssistantProjectSchema,
  "assistant_projects"
);
