// routes/scriptLab.js
const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const router = express.Router();

const SCRIPTS_BASE_DIR =
  process.env.SCRIPTS_BASE_DIR || '/mnt/hdd-storage/hexforge-scripts';
const SCRIPT_LAB_TOKEN = process.env.SCRIPT_LAB_TOKEN;

// --- Token middleware (used only on write routes) ---
function requireScriptLabToken(req, res, next) {
  const token = req.header('X-Script-Lab-Token');
  if (!SCRIPT_LAB_TOKEN || token !== SCRIPT_LAB_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// GET /api/script-lab/list?device=skull-badusb
router.get('/list', async (req, res) => {
  const device = req.query.device;
  const baseDir = device
    ? path.join(SCRIPTS_BASE_DIR, device)
    : SCRIPTS_BASE_DIR;

  try {
    const entries = await fs.readdir(baseDir, { withFileTypes: true });

    const scripts = entries
      .filter((e) => e.isFile())
      .map((e) => ({
        name: e.name,
        device: device || null,
        path: path.join(baseDir, e.name),
      }));

    res.json({ scripts });
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Failed to list scripts', detail: String(err) });
  }
});

// GET /api/script-lab/get?name=skull-badusb/demo-01.ps1
router.get('/get', async (req, res) => {
  const name = req.query.name;
  if (!name) {
    return res.status(400).json({ error: 'Missing name' });
  }

  const filePath = path.join(SCRIPTS_BASE_DIR, name);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    res.json({ name, path: filePath, content });
  } catch (err) {
    res
      .status(404)
      .json({ error: 'Script not found', detail: String(err) });
  }
});

// POST /api/script-lab/save  (AI / admin only)
router.post('/save', requireScriptLabToken, async (req, res) => {
  const { name, content } = req.body || {};
  if (!name || typeof content !== 'string') {
    return res.status(400).json({ error: 'Missing name or content' });
  }

  const filePath = path.join(SCRIPTS_BASE_DIR, name);

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');

    res.json({ ok: true, name, path: filePath });
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Failed to save script', detail: String(err) });
  }
});

module.exports = router;
