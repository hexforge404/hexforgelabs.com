const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const BlogController = require('../controllers/blogController');
const { requireAdmin } = require('../middleware/requireAdmin');

function rejectValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }

  return next();
}

// GET all public, published blog posts
router.get('/', BlogController.getAllPosts);

// POST new blog post
router.post(
  '/',
  requireAdmin,
  [
    body('title').notEmpty(),
    body('content').notEmpty(),
    body('visibility').isIn(['public', 'private', 'unlisted']),
    body('video').optional({ checkFalsy: true }).isURL(),
    body('affiliateLink').optional({ checkFalsy: true }).isURL(),
    body('tags').optional().isArray(),
    body('meta.description').optional().isString(),
    body('image').optional().isString(),
    body('isDraft').optional().isBoolean(),
    body('publishDate').optional({ checkFalsy: true }).isISO8601()
  ],
  rejectValidationErrors,
  BlogController.createPost
);

// GET a single public, published post by slug
router.get('/slug/:slug', BlogController.getPostBySlug);

// PUT update blog post
router.put(
  '/:id',
  requireAdmin,
  BlogController.updatePost
);

// DELETE blog post
router.delete(
  '/:id',
  requireAdmin,
  BlogController.deletePost
);

module.exports = router;
