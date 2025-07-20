const mongoose = require('mongoose');
const slugify = require('slugify');

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true },
  image: { type: String, trim: true },
  video: { type: String, trim: true },
  affiliateLink: { type: String, trim: true },
  tags: { type: [String], default: [] },
  visibility: { type: String, enum: ['public', 'private', 'unlisted'], default: 'public' },
  isDraft: { type: Boolean, default: false },
  meta: {
    description: { type: String, maxlength: 300 }
  },
  publishedAt: { type: Date, default: Date.now },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    sparse: true
  },
  author: { type: String, default: 'admin' }
}, { timestamps: true });

// Auto-generate slug from title
blogSchema.pre('validate', function (next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Blog', blogSchema);
