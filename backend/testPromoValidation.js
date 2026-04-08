require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const PromoCode = require('./models/PromoCode');

async function testPromoValidation() {
  try {
    // Connect to MongoDB
    const mongooseOptions = {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    };

    await mongoose.connect(process.env.MONGO_URI.replace('hexforge-mongo', 'localhost'), mongooseOptions);
    console.log('Connected to MongoDB');

    // Find a test promo code
    const promo = await PromoCode.findOne({ code: 'TEST50' });
    if (promo) {
      console.log('Found test promo code:', {
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        isActive: promo.isActive,
        usageCount: promo.usageCount,
        minimumOrderAmount: promo.minimumOrderAmount
      });
    } else {
      console.log('Test promo code not found');
    }

    await mongoose.connection.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Error testing promo validation:', error);
    process.exit(1);
  }
}

testPromoValidation();