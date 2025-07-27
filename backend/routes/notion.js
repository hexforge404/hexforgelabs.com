// backend/routes/notion.js
const express = require('express');
const { NotionRoutes } = require('../utils/notionSync');

const router = express.Router();

// POST /api/notion/knowledge-entry
router.post('/knowledge-entry', NotionRoutes.createKnowledgeEntry);

// POST /api/notion/attach-file
router.post('/attach-file', NotionRoutes.attachFile);

module.exports = router;
