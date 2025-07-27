require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hexforge';

// ✅ Define schema locally so it's bound to this mongoose instance
const blogPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  coverImage: { type: String },
  content: { type: String },
  tags: [{ type: String }],
  author: { type: String, default: 'HexForge Labs' },
  date: { type: Date, default: Date.now },
  youtubeId: { type: String }, // For embedded YouTube videos
  affiliateLinks: [
    {
      label: String,
      url: String
    }
  ]
}, { timestamps: true });

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

const seedPost = async () => {
  try {
    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB!');

    const existing = await BlogPost.findOne({ slug: 'first-post' });
    if (existing) {
      console.log('ℹ️ Blog post already exists. Skipping.');
      return process.exit(0);
    }

    const newPost = new BlogPost({
      title: 'First Blog Post: Welcome to HexForge Labs!',
      slug: 'first-post',
      coverImage: '/images/hexforge-logo-full.png',
      content: `Welcome to the official HexForge Labs Blog. Expect updates on tools, builds, and behind-the-scenes insight.`,
      tags: ['welcome', 'announcement', 'hexforge'],
      youtubeId: 'dQw4w9WgXcQ',
      affiliateLinks: [
        { label: 'Get a Raspberry Pi', url: 'https://amzn.to/example' }
      ]
    });

    await newPost.save();
    console.log('✅ Blog post seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seedPost();
