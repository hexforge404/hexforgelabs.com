const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

const SKU = 'LITHCYL01';
const HERO_IMAGE_URL = '/images/products/litho-cylinder/hero-main.jpg';
const IMAGE_GALLERY = [
  '/images/products/litho-cylinder/hero-main.jpg',
  '/images/products/litho-cylinder/hero-alt.jpg',
  '/images/products/litho-cylinder/panel-1.jpg',
  '/images/products/litho-cylinder/panel-2.jpg',
  '/images/products/litho-cylinder/panel-3.jpg',
  '/images/products/litho-cylinder/panel-4.jpg',
  '/images/products/litho-cylinder/process-1.jpg',
  '/images/products/litho-cylinder/process-2.jpg',
];

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error('Missing MONGO_URI in environment.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, {
    retryWrites: true,
    w: 'majority',
  });

  const product = await Product.findOne({ sku: SKU });
  if (!product) {
    console.error(`Product with SKU ${SKU} not found. No changes made.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const oldHero = product.hero_image_url || '';
  const oldGalleryLen = Array.isArray(product.imageGallery)
    ? product.imageGallery.length
    : 0;

  console.log('--- Current Product ---');
  console.log(`Name: ${product.title || product.name || 'Unknown'}`);
  console.log(`SKU: ${product.sku}`);
  console.log(`hero_image_url: ${oldHero}`);
  console.log(`imageGallery length: ${oldGalleryLen}`);

  await Product.updateOne(
    { _id: product._id },
    {
      $set: {
        hero_image_url: HERO_IMAGE_URL,
        imageGallery: IMAGE_GALLERY,
      },
    }
  );

  const updated = await Product.findById(product._id).lean();
  const newHero = (updated && updated.hero_image_url) || '';
  const newGalleryLen = updated && Array.isArray(updated.imageGallery)
    ? updated.imageGallery.length
    : 0;

  console.log('\n--- Updated Product ---');
  console.log(`hero_image_url: ${newHero}`);
  console.log(`imageGallery length: ${newGalleryLen}`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
