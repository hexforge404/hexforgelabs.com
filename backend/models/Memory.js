// backend/models/Memory.js
const mongoose = require("mongoose");

const MemorySchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    type: { type: String, default: "tool" },
    category: { type: String, default: "general" },
    tags: { type: [String], default: [] },
    user: { type: String, default: "assistant" },
    timestamp: { type: Date, default: Date.now },
    tool: String,
    result: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Memory", MemorySchema);
