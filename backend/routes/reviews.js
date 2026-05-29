const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');
const Review = require('../models/Review');

const router = express.Router();

const validateReview = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('reviewText').trim().notEmpty().withMessage('Review text is required'),
  body('permissionToDisplay')
    .custom((value) => value === true || value === 'true' || value === 1 || value === '1')
    .withMessage('Permission to display must be granted'),
  body('customerName').optional().trim().isLength({ max: 120 }),
  body('email').optional().isEmail().withMessage('Email must be valid'),
  body('productType').optional().trim().isLength({ max: 120 }),
  body('imageUrl').optional().trim().isLength({ max: 500 }),
  body('permissionToUseName').optional().isBoolean().toBoolean(),
];

const normalizeString = (value) => String(value || '').trim();
const toBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1';

const uploadsRoot = process.env.IMAGES_DIR || path.join(__dirname, '..', 'uploads');
const reviewsUploadDir = path.join(uploadsRoot, 'reviews');

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_IMAGES = 5;
const MAX_VIDEOS = 1;
const MAX_FILES = 6;

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const MIME_EXTENSION_MAP = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

const ensureDir = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
};

ensureDir(reviewsUploadDir).catch((err) => {
  console.error('Unable to create review upload directory:', err);
});

const buildSafeFilename = (file) => {
  const ext = MIME_EXTENSION_MAP[file.mimetype] || path.extname(file.originalname).toLowerCase();
  const base = path
    .basename(file.originalname, path.extname(file.originalname))
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'review';
  const unique = crypto.randomBytes(6).toString('hex');
  return `${base}-${Date.now()}-${unique}${ext}`;
};

const storage = multer.diskStorage({
  destination: reviewsUploadDir,
  filename: (req, file, cb) => {
    cb(null, buildSafeFilename(file));
  },
});

const fileFilter = (req, file, cb) => {
  const isImage = ALLOWED_IMAGE_TYPES.has(file.mimetype);
  const isVideo = ALLOWED_VIDEO_TYPES.has(file.mimetype);
  if (isImage || isVideo) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE,
    files: MAX_FILES,
  },
});

const reviewUpload = upload.fields([
  { name: 'photos', maxCount: MAX_IMAGES },
  { name: 'video', maxCount: MAX_VIDEOS },
]);

const cleanupUploadedFiles = async (files) => {
  if (!files || files.length === 0) return;
  await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => undefined)));
};

router.post('/', reviewUpload, validateReview, async (req, res) => {
  const files = [
    ...(req.files?.photos || []),
    ...(req.files?.video || []),
  ];

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({ errors: errors.array() });
    }

    if (files.length > MAX_FILES) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({ message: `Too many files uploaded. Maximum ${MAX_FILES} total files.` });
    }

    const imageFiles = files.filter((file) => ALLOWED_IMAGE_TYPES.has(file.mimetype));
    const videoFiles = files.filter((file) => ALLOWED_VIDEO_TYPES.has(file.mimetype));

    if (imageFiles.length > MAX_IMAGES) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({ message: `Too many photos uploaded. Maximum ${MAX_IMAGES} photos.` });
    }

    if (videoFiles.length > MAX_VIDEOS) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({ message: 'Too many videos uploaded. Maximum 1 video.' });
    }

    const oversizedImage = imageFiles.find((file) => file.size > MAX_IMAGE_SIZE);
    if (oversizedImage) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({ message: 'Each image must be 8MB or smaller.' });
    }

    const media = files.map((file) => ({
      url: `/uploads/reviews/${file.filename}`,
      type: ALLOWED_VIDEO_TYPES.has(file.mimetype) ? 'video' : 'image',
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    }));

    const review = await Review.create({
      customerName: normalizeString(req.body.customerName),
      email: normalizeString(req.body.email),
      rating: Number(req.body.rating),
      reviewText: normalizeString(req.body.reviewText),
      productType: normalizeString(req.body.productType),
      imageUrl: normalizeString(req.body.imageUrl),
      permissionToDisplay: toBoolean(req.body.permissionToDisplay),
      permissionToUseName: toBoolean(req.body.permissionToUseName),
      status: 'pending',
      source: 'website',
      media,
      mediaApproved: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you — your review was submitted and will be reviewed before being posted.',
      id: review._id,
    });
  } catch (err) {
    await cleanupUploadedFiles(files);
    console.error('Review submission error:', err);
    return res.status(500).json({ message: 'Review submission failed' });
  }
});

router.get('/approved', async (req, res) => {
  try {
    const reviews = await Review.find({
      status: 'approved',
      permissionToDisplay: true,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const payload = reviews.map((item) => ({
      id: item._id,
      customerName: item.permissionToUseName ? item.customerName : '',
      rating: item.rating,
      reviewText: item.reviewText,
      productType: item.productType,
      imageUrl: item.imageUrl,
      media: Array.isArray(item.media)
        ? item.media
            .filter((mediaItem) => mediaItem && mediaItem.url && mediaItem.type)
            .map((mediaItem) => ({
              url: mediaItem.url,
              type: mediaItem.type,
            }))
        : [],
      createdAt: item.createdAt,
    }));

    return res.json({ success: true, reviews: payload });
  } catch (err) {
    console.error('Approved reviews fetch error:', err);
    return res.status(500).json({ message: 'Failed to load reviews' });
  }
});

router.use((err, req, res, next) => {
  const files = [
    ...(req.files?.photos || []),
    ...(req.files?.video || []),
  ];
  if (files.length > 0) {
    cleanupUploadedFiles(files).catch(() => undefined);
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files uploaded. Please use up to 5 photos and 1 video.' });
    }
    return res.status(400).json({ message: err.message || 'Upload failed.' });
  }
  if (err) {
    return res.status(400).json({ message: err.message || 'Upload failed.' });
  }
  return next();
});

module.exports = router;
