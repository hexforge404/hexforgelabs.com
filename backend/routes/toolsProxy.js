const express = require("express");
const multer = require("multer");
const FormData = require("form-data");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ✅ set in backend env (assistant is internal, no Cloudflare)
const ASSISTANT_INTERNAL_URL =
  process.env.ASSISTANT_INTERNAL_URL || "http://hexforge-assistant:11435";

// OPTIONAL: lock this to admins only (recommended)
function requireAdmin(req, res, next) {
  // adjust to match your auth/session shape
  if (req.session?.admin?.loggedIn) return next();
  return res.status(401).json({ ok: false, error: "Unauthorized" });
}

router.post("/heightmap/v1", requireAdmin, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "Missing image file" });
    }

    const name = (req.body?.name || "").trim();
    if (!name) {
      return res.status(400).json({ ok: false, error: "Missing name" });
    }

    const fd = new FormData();
    fd.append("image", req.file.buffer, {
      filename: req.file.originalname || "upload.png",
      contentType: req.file.mimetype || "application/octet-stream",
    });
    fd.append("name", name);

    // forward any optional fields you later add:
    // fd.append("mode", req.body.mode || "relief");

    const upstream = await fetch(`${ASSISTANT_INTERNAL_URL}/tool/heightmap/v1`, {
      method: "POST",
      body: fd,
      headers: fd.getHeaders(),
    });

    const text = await upstream.text();
    res.status(upstream.status);

    // pass-through JSON if possible
    try {
      return res.json(JSON.parse(text));
    } catch {
      return res.send(text);
    }
  } catch (err) {
    console.error("toolsProxy heightmap error:", err);
    return res.status(500).json({ ok: false, error: "Proxy failure" });
  }
});

module.exports = router;
