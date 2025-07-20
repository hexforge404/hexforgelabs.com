const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product'); // adjust path if needed

dotenv.config();

const products = require('./data/products'); // this will be the full list from your notebook

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('MongoDB connected for seeding');
  await Product.deleteMany(); // optional: clear existing entries
  await Product.insertMany(products);
  console.log('✅ Products inserted successfully!');
  process.exit();
}).catch((err) => {
  console.error('❌ MongoDB seeding error:', err);
  process.exit(1);
});
