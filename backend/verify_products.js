const mongoose = require('mongoose');
require('dotenv').config({ path: '/mnt/hdd-storage/hexforge-store/backend/.env.production' });
const Product = require('/mnt/hdd-storage/hexforge-store/backend/models/Product');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const missingTitle = await Product.countDocuments({
    $or: [{ title: { $exists: false } }, { title: null }, { title: '' }]
  });

  const missingStatus = await Product.countDocuments({
    $or: [{ status: { $exists: false } }, { status: null }, { status: '' }]
  });

  const missingHero = await Product.countDocuments({
    $or: [
      { hero_image_url: { $exists: false } },
      { hero_image_url: null },
      { hero_image_url: '' }
    ]
  });

  const missingSlug = await Product.countDocuments({
    $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }]
  });

  console.log({ missingTitle, missingStatus, missingHero, missingSlug });
  await mongoose.disconnect();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
