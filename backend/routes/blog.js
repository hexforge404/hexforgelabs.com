const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const BlogController = require('../controllers/blogController');

// GET all blog posts
router.get('/', BlogController.getAllPosts);

// POST new blog post
router.post(
  '/',
  [
    body('title').notEmpty(),
    body('content').notEmpty(),
    body('visibility').isIn(['public', 'private', 'unlisted']),
    body('video').optional().isURL(),
    body('affiliateLink').optional().isURL(),
    body('tags').optional().isArray(),
    body('meta.description').optional().isString(),
    body('image').optional().isString(),
    body('isDraft').optional().isBoolean(),
    body('publishDate').optional().isISO8601()
  ],
  BlogController.createPost
);

// GET a single post by slug
router.get('/slug/:slug', BlogController.getPostBySlug);

// PUT update blog post
router.put('/:id', BlogController.updatePost);

// DELETE blog post
router.delete('/:id', BlogController.deletePost);

module.exports = router;
