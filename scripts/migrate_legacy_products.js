#!/usr/bin/env node
const path = require('path');

const root = path.resolve(__dirname, '..');

// Prepend backend/node_modules to module resolution
const Module = require('module');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain) {
  try {
    return originalResolve.call(this, request, parent, isMain);
  } catch (e) {
    try {
      return originalResolve.call(this, path.join(root, 'backend', 'node_modules', request), parent, isMain);
    } catch (e2) {
      throw e;
    }
  }
};

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load production env first, then root env (production values take precedence)
dotenv.config({ path: path.join(root, 'backend', '.env.production') });
dotenv.config({ path: path.join(root, '.env') });

const Product = require(path.join(root, 'backend', 'models', 'Product'));

function makeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    console.log('🧪 DRY RUN MODE: No database changes will be made');
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URI in environment');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  console.log('Connected to MongoDB');

  const query = {
    $or: [
      { title: { $exists: false } },
      { status: { $exists: false } },
      { hero_image_url: { $exists: false } },
      { slug: { $exists: false } },
    ],
  };

  const cursor = mongoose.connection.db.collection('products').find(query);
  let total = 0;
  let updated = 0;

  for await (const rawDoc of cursor) {
    total += 1;
    const updates = {};

    if (!rawDoc.title && rawDoc.name) {
      updates.title = String(rawDoc.name).trim();
    }

    if (!rawDoc.title && !rawDoc.name) {
      updates.title = `Product ${rawDoc._id}`;
    }

    if (!rawDoc.status) {
      updates.status = 'active';
    }

    if (!rawDoc.hero_image_url && rawDoc.image) {
      updates.hero_image_url = rawDoc.image;
    }

    if (!rawDoc.slug) {
      const base = rawDoc.title || rawDoc.name || `product-${rawDoc._id}`;
      updates.slug = makeSlug(base);
    }

    // Preserve existing data; only set values when fields are missing.
    if (Object.keys(updates).length > 0) {
      if (isDryRun) {
        console.log(`[DRY RUN] Would update ${rawDoc._id}: ${JSON.stringify(updates)}`);
        updated += 1;
      } else {
        try {
          await Product.updateOne({ _id: rawDoc._id }, { $set: updates });
          updated += 1;
          console.log(`Updated ${rawDoc._id}: ${JSON.stringify(updates)}`);
        } catch (err) {
          console.error(`Failed to update ${rawDoc._id}:`, err.message);
        }
      }
    }
  }

  console.log(`Found ${total} legacy products. ${isDryRun ? 'Would update' : 'Updated'} ${updated} documents.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
