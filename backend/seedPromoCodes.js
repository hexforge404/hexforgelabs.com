require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const PromoCode = require('./models/PromoCode');

async function seedPromoCodes() {
  try {
    // Connect to MongoDB - use localhost if running outside Docker
    const mongoUri = process.env.MONGO_URI.replace('hexforge-mongo', 'localhost');
    const mongooseOptions = {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    };

    await mongoose.connect(mongoUri, mongooseOptions);

    console.log('Connected to MongoDB');

    // Test promo codes
    const testPromoCodes = [
      {
        code: 'WELCOME10',
        description: '10% off your first custom lamp order',
        discountType: 'percentage',
        discountValue: 10,
        isActive: true,
        usageLimit: 100,
        usageCount: 0,
        minimumOrderAmount: 50,
        allowedCategories: ['custom-lamps'],
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      },
      {
        code: 'SAVE20',
        description: '$20 off custom lamp orders',
        discountType: 'fixed',
        discountValue: 20,
        isActive: true,
        usageLimit: 50,
        usageCount: 0,
        minimumOrderAmount: 100,
        allowedCategories: ['custom-lamps'],
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
      },
      {
        code: 'BLACKFRIDAY',
        description: '25% off all custom lamps - Black Friday special',
        discountType: 'percentage',
        discountValue: 25,
        isActive: true,
        usageLimit: 200,
        usageCount: 0,
        minimumOrderAmount: 0,
        allowedCategories: ['custom-lamps'],
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
      {
        code: 'TEST50',
        description: '50% off for testing purposes',
        discountType: 'percentage',
        discountValue: 50,
        isActive: true,
        usageLimit: 10,
        usageCount: 0,
        minimumOrderAmount: 0,
        allowedCategories: ['custom-lamps'],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    ];

    // Clear existing test promo codes
    await PromoCode.deleteMany({ code: { $in: testPromoCodes.map(p => p.code) } });

    // Insert new promo codes
    const insertedCodes = await PromoCode.insertMany(testPromoCodes);

    console.log(`Successfully seeded ${insertedCodes.length} promo codes:`);
    insertedCodes.forEach(code => {
      console.log(`- ${code.code}: ${code.description}`);
    });

    await mongoose.connection.close();
    console.log('Database connection closed');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding promo codes:', error);
    process.exit(1);
  }
}

seedPromoCodes();