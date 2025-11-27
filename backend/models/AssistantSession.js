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

    // 🔗 Link to a project (AssistantProject._id)
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssistantProject",
      default: null,
    },

    // Human-friendly label for this part/session
    partLabel: {
      type: String,
      trim: true,
      default: "",
    },

    // Content Engine integration
    enginePartId: {
      type: String,
      trim: true,
      default: "",
    },

    // Full path to this part's assets (logs, screenshots, video)
    assetsPath: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "AssistantSession",
  AssistantSessionSchema,
  "assistant_sessions"
);
