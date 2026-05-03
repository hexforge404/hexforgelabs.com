const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { requireAdmin } = require('../middleware/requireAdmin');
const PhotoCheckRequest = require('../models/PhotoCheckRequest');

const PHOTO_CHECK_UPLOAD_DIR = path.join(__dirname, '../uploads/photo-checks');

const ensureDir = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
};

ensureDir(PHOTO_CHECK_UPLOAD_DIR).catch((err) => {
  console.error('Unable to create photo-check upload directory:', err);
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const photoUploadFields = upload.fields([
  { name: 'photos', maxCount: 5 },
  { name: 'photo', maxCount: 5 },
  { name: 'image', maxCount: 5 },
]);

const safeFilename = (originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  const base = path
    .basename(originalName, ext)
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120) || 'image';
  return `${base}-${Date.now()}${ext}`;
};

const createValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('product').optional().trim(),
];

router.post('/', photoUploadFields, createValidation, async (req, res) => {
  const errors = validationResult(req);
  const files = [
    ...(req.files?.photos || []),
    ...(req.files?.photo || []),
    ...(req.files?.image || []),
  ];

  if (files.length === 0) {
    return res.status(400).json({ errors: ['At least one image file is required'] });
  }

  if (files.length > 5) {
    return res.status(400).json({ errors: ['Please upload no more than 5 photos'] });
  }

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map((err) => err.msg) });
  }

  try {
    const requestId = `PC-${uuidv4()}`;
    const requestDir = path.join(PHOTO_CHECK_UPLOAD_DIR, requestId);
    await ensureDir(requestDir);

    const imageMetas = await Promise.all(
      files.map(async (file) => {
        const filename = safeFilename(file.originalname);
        const targetPath = path.join(requestDir, filename);
        await fs.writeFile(targetPath, file.buffer);

        const relativePath = `uploads/photo-checks/${requestId}/${filename}`;
        return {
          originalName: file.originalname,
          filename,
          path: relativePath,
          relativePath,
          mimeType: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
        };
      })
    );

    const firstImage = imageMetas[0];
    const photoCheck = new PhotoCheckRequest({
      requestId,
      customer: {
        name: req.body.name,
        email: req.body.email,
      },
      product: req.body.product?.trim() || 'lithophane',
      notes: req.body.notes?.trim() || undefined,
      image: {
        path: firstImage.path,
        publicUrl: firstImage.path,
        relativePath: firstImage.relativePath,
        originalName: firstImage.originalName,
        mimeType: firstImage.mimeType,
        size: firstImage.size,
        uploadedAt: firstImage.uploadedAt,
      },
      images: imageMetas,
    });

    await photoCheck.save();

    return res.status(201).json({
      success: true,
      requestId,
      imageCount: imageMetas.length,
      message: 'Photo check request received.',
    });
  } catch (error) {
    console.error('Error saving photo check request:', error);
    return res.status(500).json({ message: 'Unable to create photo check request' });
  }
});

router.get('/', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const requests = await PhotoCheckRequest.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ data: requests });
  } catch (error) {
    console.error('Error listing photo check requests:', error);
    return res.status(500).json({ message: 'Unable to list photo check requests' });
  }
});

router.get('/:requestId', requireAdmin, async (req, res) => {
  try {
    const request = await PhotoCheckRequest.findOne({ requestId: req.params.requestId }).lean();
    if (!request) {
      return res.status(404).json({ message: 'Photo check request not found' });
    }

    return res.json({ data: request });
  } catch (error) {
    console.error('Error fetching photo check request:', error);
    return res.status(500).json({ message: 'Unable to fetch photo check request' });
  }
});

router.patch('/:requestId/status', requireAdmin, express.json(), async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ['new', 'reviewed', 'contacted', 'converted', 'archived'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    const request = await PhotoCheckRequest.findOneAndUpdate(
      { requestId: req.params.requestId },
      { status },
      { new: true }
    ).lean();

    if (!request) {
      return res.status(404).json({ message: 'Photo check request not found' });
    }

    return res.json({ success: true, request });
  } catch (error) {
    console.error('Error updating photo check status:', error);
    return res.status(500).json({ message: 'Unable to update photo check status' });
  }
});

router.get('/:requestId/images/:filename', requireAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const filename = path.basename(req.params.filename);
    const request = await PhotoCheckRequest.findOne({ requestId }).lean();
    if (!request) {
      return res.status(404).json({ message: 'Photo check request not found' });
    }

    const allowedImages = [
      ...(request.images || []),
      ...(request.image && request.image.filename ? [request.image] : []),
    ];

    const image = allowedImages.find((img) => img.filename === filename);
    if (!image) {
      return res.status(403).json({ message: 'Image not authorized for this request' });
    }

    const requestDir = path.resolve(PHOTO_CHECK_UPLOAD_DIR, requestId);
    let targetPath;

    if (image.path) {
      const candidate = path.isAbsolute(image.path)
        ? image.path
        : path.resolve(__dirname, '..', image.path);
      if (candidate.startsWith(requestDir + path.sep)) {
        targetPath = candidate;
      }
    }

    if (!targetPath) {
      targetPath = path.resolve(requestDir, filename);
    }

    if (!targetPath.startsWith(requestDir + path.sep)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return res.sendFile(targetPath);
  } catch (error) {
    console.error('Error fetching photo check image:', error);
    return res.status(500).json({ message: 'Unable to fetch photo check image' });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ errors: [err.message] });
  }

  if (err && err.message === 'Only image files are allowed') {
    return res.status(400).json({ errors: [err.message] });
  }

  return next(err);
});

module.exports = router;
