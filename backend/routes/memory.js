// backend/routes/memory.js
const express = require("express");
const { addMemory, getMemory, resetMemory } = require("../memory/memoryStore");
const router = express.Router();

router.post("/add", (req, res) => {
  addMemory(req.body);
  res.json({ status: "added" });
});

router.get("/all", (req, res) => {
  res.json(getMemory());
});

router.post("/reset", (req, res) => {
  resetMemory();
  res.json({ status: "cleared" });
}); 

module.exports = router;
