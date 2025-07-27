// backend/controllers/blogController.js
const Blog = require('../models/Blog');
const slugify = require('slugify');

exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Blog.find({ visibility: 'public' }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
};

exports.getPostBySlug = async (req, res) => {
  try {
    const post = await Blog.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
};

exports.createPost = async (req, res) => {
  try {
    const {
      title,
      content,
      image,
      video,
      affiliateLink,
      tags,
      meta,
      visibility,
      isDraft,
      publishDate
    } = req.body;

    const newPost = new Blog({
      title,
      content,
      image,
      video,
      affiliateLink,
      tags,
      meta,
      visibility,
      isDraft,
      publishDate,
      slug: req.body.slug || slugify(title, { lower: true, strict: true })
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
exports.updatePost = async (req, res) => {
  try {
    const {
      title,
      content,
      image,
      video,
      affiliateLink,
      tags,
      meta,
      visibility,
      isDraft,
      publishDate
    } = req.body;

    const updatedPost = await Blog.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content,
        image,
        video,
        affiliateLink,
        tags,
        meta,
        visibility,
        isDraft,
        publishDate,
        slug: req.body.slug || slugify(title, { lower: true, strict: true })
      },
      { new: true }
    );

    if (!updatedPost) return res.status(404).json({ error: 'Post not found' });
    res.json(updatedPost);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


exports.deletePost = async (req, res) => {
  try {
    const deleted = await Blog.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Post not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
};
