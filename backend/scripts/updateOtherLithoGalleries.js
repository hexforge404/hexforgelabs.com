const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

const TARGET_NAMES = [
  'Multi-panel Lithophane Lamp',
  'Lithophane Box',
];

const MULTI_PANEL_HERO = '/images/products/litho-multipanel/hero-main.jpg';
const MULTI_PANEL_GALLERY = [
  '/images/products/litho-multipanel/hero-main.jpg',
  '/images/products/litho-multipanel/hero-alt.jpg',
  '/images/products/litho-multipanel/panel-1.jpg',
  '/images/products/litho-multipanel/panel-2.jpg',
  '/images/products/litho-multipanel/panel-3.jpg',
  '/images/products/litho-multipanel/panel-4.jpg',
  '/images/products/litho-multipanel/process-1.jpg',
  '/images/products/litho-multipanel/process-2.jpg',
];

const BOX_HERO = '/images/products/litho-box/hero-main.jpg';
const BOX_GALLERY = [
  '/images/products/litho-box/hero-main.jpg',
  '/images/products/litho-box/hero-alt.jpg',
  '/images/products/litho-box/glow-close.jpg',
  '/images/products/litho-box/angle-1.jpg',
  '/images/products/litho-box/angle-2.jpg',
  '/images/products/litho-box/process-1.jpg',
];

const formatName = (value) => String(value || '').trim();

const getGalleryLength = (value) =>
  Array.isArray(value) ? value.length : 0;

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error('Missing MONGO_URI in environment.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, {
    retryWrites: true,
    w: 'majority',
  });

  const allNames = await Product.find({}, { title: 1, name: 1 })
    .lean();
  const nameList = allNames
    .map((item) => formatName(item.title || item.name))
    .filter(Boolean);

  const missing = [];
  const products = [];

  for (const targetName of TARGET_NAMES) {
    const product = await Product.findOne({ title: targetName });
    if (!product) {
      missing.push(targetName);
    } else {
      products.push(product);
    }
  }

  if (missing.length) {
    const matches = nameList.filter((name) =>
      missing.some((target) =>
        name.toLowerCase().includes(target.toLowerCase())
      )
    );

    console.error('Exact product name match not found for:');
    missing.forEach((name) => console.error(`- ${name}`));

    if (matches.length) {
      console.error('\nClosest matching product names:');
      matches.forEach((name) => console.error(`- ${name}`));
    } else {
      console.error('\nNo close name matches found.');
    }

    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('--- Current Products ---');
  for (const product of products) {
    console.log(`\nName: ${product.title || product.name || 'Unknown'}`);
    console.log(`SKU: ${product.sku || 'Unknown'}`);
    console.log(`hero_image_url: ${product.hero_image_url || ''}`);
    console.log(`imageGallery length: ${getGalleryLength(product.imageGallery)}`);
  }

  for (const product of products) {
    const update = {
      hero_image_url: product.title === 'Lithophane Box' ? BOX_HERO : MULTI_PANEL_HERO,
      imageGallery: product.title === 'Lithophane Box' ? BOX_GALLERY : MULTI_PANEL_GALLERY,
    };

    await Product.updateOne(
      { _id: product._id },
      { $set: update }
    );
  }

  console.log('\n--- Updated Products ---');
  for (const product of products) {
    const updated = await Product.findById(product._id).lean();
    console.log(`\nName: ${updated?.title || updated?.name || 'Unknown'}`);
    console.log(`SKU: ${updated?.sku || 'Unknown'}`);
    console.log(`hero_image_url: ${updated?.hero_image_url || ''}`);
    console.log(`imageGallery length: ${getGalleryLength(updated?.imageGallery)}`);
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
