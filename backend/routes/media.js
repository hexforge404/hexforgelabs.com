// backend/routes/media.js
const express = require("express");

const router = express.Router();

// Required env
const MEDIA_API_URL = process.env.MEDIA_API_URL; // e.g. http://hexforge-media-api:8700
const MEDIA_API_KEY = process.env.MEDIA_API_KEY;

// Basic guard so we fail loudly instead of silently
function assertEnv(req, res) {
  if (!MEDIA_API_URL) {
    res.status(500).json({ error: "MEDIA_API_URL is not set on backend" });
    return false;
  }
  if (!MEDIA_API_KEY) {
    res.status(500).json({ error: "MEDIA_API_KEY is not set on backend" });
    return false;
  }
  return true;
}

async function forward(req, res, path, method = "POST") {
  if (!assertEnv(req, res)) return;

  try {
    const url = `${MEDIA_API_URL}${path}`;

    const r = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Media-Api-Key": MEDIA_API_KEY,
      },
      body: method === "GET" ? undefined : JSON.stringify(req.body ?? {}),
    });

    const text = await r.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }

    return res.status(r.status).json(payload);
  } catch (err) {
    console.error("[media proxy] error:", err);
    return res.status(502).json({
      error: "Failed to reach media API",
      detail: err.message,
    });
  }
}

// Health check (GET)
router.get("/health", async (req, res) => {
  if (!assertEnv(req, res)) return;

  try {
    const url = `${MEDIA_API_URL}/health`;
    const r = await fetch(url, {
      method: "GET",
      headers: { "X-Media-Api-Key": MEDIA_API_KEY },
    });
    const text = await r.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
    return res.status(r.status).json(payload);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

// Blog JSON save
router.post("/blog-json", (req, res) => forward(req, res, "/blog-json", "POST"));

// Queue image job
router.post("/queue/image", (req, res) =>
  forward(req, res, "/media/queue/image", "POST")
);

// Queue voice job
router.post("/queue/voice", (req, res) =>
  forward(req, res, "/media/queue/voice", "POST")
);

// Direct TTS
router.post("/tts", (req, res) => forward(req, res, "/tts", "POST"));

// Direct STT
router.post("/stt", (req, res) => forward(req, res, "/stt", "POST"));

// Image loop
router.post("/image-loop", (req, res) => forward(req, res, "/image-loop", "POST"));

// 3D job queue
router.post("/3d", async (req, res) => {
  const r = await client().post("/3d/queue", req.body);
  res.status(r.status).json(r.data);
});

// Laser vectorization  job queue
router.post("/laser/vectorize", async (req, res) => {
  const r = await client().post("/laser/vectorize", req.body);
  res.status(r.status).json(r.data);
});


module.exports = router;
