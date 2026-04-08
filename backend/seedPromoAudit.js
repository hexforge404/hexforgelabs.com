require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const PromoAuditLog = require('./models/PromoAuditLog');
const PromoCode = require('./models/PromoCode');

async function seedPromoAudit() {
  try {
    const mongoUri = process.env.MONGO_URI.replace('hexforge-mongo', 'localhost');
    await mongoose.connect(mongoUri, {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    const existingPromo = await PromoCode.findOne();
    const promoCode = existingPromo?.code || 'AUDITTEST';

    const actor = {
      username: process.env.ADMIN_USERNAME || 'admin',
      role: 'admin',
    };

    const sampleBefore = {
      code: promoCode,
      description: 'Sample promo for audit log seed',
      discountType: 'percentage',
      discountValue: 10,
      isActive: true,
    };

    const sampleAfter = {
      ...sampleBefore,
      discountValue: 15,
      isActive: false,
    };

    const entries = [
      {
        action: 'create',
        promoCode,
        actor,
        after: sampleBefore,
        metadata: { sourceIp: '127.0.0.1' },
      },
      {
        action: 'update',
        promoCode,
        actor,
        before: sampleBefore,
        after: sampleAfter,
        metadata: { sourceIp: '127.0.0.1' },
      },
      {
        action: 'disable',
        promoCode,
        actor,
        before: { ...sampleBefore, isActive: true },
        after: { ...sampleBefore, isActive: false },
        metadata: { sourceIp: '127.0.0.1' },
      },
      {
        action: 'enable',
        promoCode,
        actor,
        before: { ...sampleBefore, isActive: false },
        after: { ...sampleBefore, isActive: true },
        metadata: { sourceIp: '127.0.0.1' },
      },
      {
        action: 'delete',
        promoCode,
        actor,
        before: sampleAfter,
        metadata: { sourceIp: '127.0.0.1' },
      },
      {
        action: 'import',
        promoCode: null,
        actor,
        metadata: { importCount: 3, sourceIp: '127.0.0.1' },
      },
      {
        action: 'export',
        promoCode: null,
        actor,
        metadata: { exportFormat: 'csv', sourceIp: '127.0.0.1' },
      },
    ];

    await PromoAuditLog.insertMany(entries);
    console.log(`Seeded ${entries.length} promo audit logs.`);

    await mongoose.connection.close();
  } catch (err) {
    console.error('Failed to seed promo audit logs:', err);
    process.exit(1);
  }
}

seedPromoAudit();
