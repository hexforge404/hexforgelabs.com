// backend/models/AssistantSession.js
const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const AssistantSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    model: {
      type: String,
      default: null,
    },
    title: {
      type: String,
      default: null,
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },

    // Link to a project (optional)
    projectId: {
      // Store AssistantProject._id as a string
      type: String,
      default: null,
    },

    // Human-friendly label for this part/session
    partLabel: {
      type: String,
      default: "",
    },

    // Content Engine integration for this specific part
    enginePartId: {
      type: String,
      default: "",
    },

    // Full path to this part's assets (logs, screenshots, video)
    assetsPath: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);


module.exports = mongoose.model(
  "AssistantSession",
  AssistantSessionSchema,
  "assistant_sessions"
);
