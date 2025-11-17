// backend/routes/uploads.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Folder inside the backend container where images are written.
// This will be shared with Nginx via a Docker volume.
const IMAGES_DIR = process.env.IMAGES_DIR || path.join(__dirname, '..', 'uploads');

// Make sure the folder exists
const fs = require('fs');
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, IMAGES_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^\w\-]+/g, '');
    const unique = `${base}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, unique);
  },
});

// Only allow images, 5 MB max
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error('Only image files (jpg, png, webp, gif) are allowed.'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// POST /api/uploads/image
router.post('/image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const filename = req.file.filename;

  // This URL is what the frontend will store in product.image
  // Nginx will serve /images/* from the shared volume.
  const url = `/images/${filename}`;

  return res.json({ filename, url });
});

module.exports = router;
