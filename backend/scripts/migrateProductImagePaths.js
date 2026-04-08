const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../models/Product');

const apply = process.argv.includes('--apply');

const uploadsDir = process.env.IMAGES_DIR || path.join(__dirname, '..', 'uploads');
const frontendImagesDir = path.join(__dirname, '..', '..', 'frontend', 'public', 'images');

const fileExists = (dir, filename) => {
  if (!filename) return false;
  const fullPath = path.join(dir, filename);
  return fs.existsSync(fullPath);
};

const normalizeValue = (value) => {
  if (!value) return { value, changed: false, reason: 'empty' };
  const raw = String(value).trim();
  if (!raw) return { value: raw, changed: false, reason: 'empty' };

  if (/^https?:\/\//i.test(raw)) {
    return { value: raw, changed: false, reason: 'external' };
  }

  if (raw.startsWith('/uploads/')) {
    return { value: raw, changed: false, reason: 'uploads' };
  }

  if (raw.startsWith('uploads/')) {
    return { value: `/${raw}`, changed: true, reason: 'normalize-uploads' };
  }

  if (raw.startsWith('/images/')) {
    const filename = raw.replace('/images/', '');
    const existsInUploads = fileExists(uploadsDir, filename);
    const existsInFrontend = fileExists(frontendImagesDir, filename);
    if (existsInUploads && !existsInFrontend) {
      return { value: `/uploads/${filename}`, changed: true, reason: 'images-to-uploads' };
    }
    return { value: raw, changed: false, reason: 'images' };
  }

  if (raw.startsWith('images/')) {
    const filename = raw.replace('images/', '');
    const existsInUploads = fileExists(uploadsDir, filename);
    const existsInFrontend = fileExists(frontendImagesDir, filename);
    if (existsInUploads && !existsInFrontend) {
      return { value: `/uploads/${filename}`, changed: true, reason: 'images-to-uploads' };
    }
    return { value: `/${raw}`, changed: true, reason: 'normalize-images' };
  }

  const existsInUploads = fileExists(uploadsDir, raw);
  if (existsInUploads) {
    return { value: `/uploads/${raw}`, changed: true, reason: 'bare-to-uploads' };
  }

  return { value: raw, changed: false, reason: 'missing-file' };
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error('Missing MONGO_URI in environment.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, {
    retryWrites: true,
    w: 'majority',
  });

  const products = await Product.find({}, {
    title: 1,
    image: 1,
    hero_image_url: 1,
    imageGallery: 1,
  }).lean();

  let candidates = 0;
  let updated = 0;
  let skipped = 0;
  let missingFiles = 0;

  for (const product of products) {
    const updates = {};
    const changes = [];

    const fields = ['image', 'hero_image_url'];
    for (const field of fields) {
      const { value, changed, reason } = normalizeValue(product[field]);
      if (reason === 'missing-file') missingFiles += 1;
      if (changed) {
        candidates += 1;
        updates[field] = value;
        changes.push({ field, from: product[field], to: value, reason });
      } else {
        skipped += 1;
      }
    }

    if (Array.isArray(product.imageGallery)) {
      const nextGallery = [...product.imageGallery];
      let galleryChanged = false;

      nextGallery.forEach((entry, index) => {
        const { value, changed, reason } = normalizeValue(entry);
        if (reason === 'missing-file') missingFiles += 1;
        if (changed) {
          candidates += 1;
          nextGallery[index] = value;
          galleryChanged = true;
          changes.push({ field: `imageGallery[${index}]`, from: entry, to: value, reason });
        } else {
          skipped += 1;
        }
      });

      if (galleryChanged) {
        updates.imageGallery = nextGallery;
      }
    }

    if (changes.length > 0) {
      console.log(`\nProduct ${product._id} (${product.title || 'Untitled'}):`);
      changes.forEach((change) => {
        console.log(`- ${change.field}: ${change.from} -> ${change.to} (${change.reason})`);
      });

      if (apply) {
        await Product.updateOne({ _id: product._id }, { $set: updates });
        updated += 1;
      }
    }
  }

  console.log('\n--- Summary ---');
  console.log(`products scanned: ${products.length}`);
  console.log(`fields updated candidates: ${candidates}`);
  console.log(`updated: ${updated}`);
  console.log(`skipped: ${skipped}`);
  console.log(`missing files: ${missingFiles}`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
