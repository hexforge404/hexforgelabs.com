const request = require('supertest');
// Increase timeout for downloading MongoDB binary and startup in CI-like envs
jest.setTimeout(120000);
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Product = require('../models/Product');
const CustomOrder = require('../models/CustomOrder');

// Define mock functions BEFORE mocking modules so they can be reused across tests
const mockStripeRetrieve = jest.fn();
const mockMailgunCreate = jest.fn().mockResolvedValue({ id: 'synthetic-message' });

// Mock Stripe with a factory that returns an instance with our mocked functions
jest.mock('stripe', () => jest.fn(() => ({
  checkout: {
    sessions: {
      retrieve: mockStripeRetrieve,
    },
  },
})));

// Mock mailgun.js with a factory that returns a client instance
jest.mock('mailgun.js', () => {
  return jest.fn(() => ({
    client: jest.fn(() => ({
      messages: {
        create: mockMailgunCreate,
      },
    })),
  }));
});

describe('Security containment tests', () => {
  let mongo;
  let app;

  beforeAll(async () => {
    // Request a MongoDB binary compatible with Debian 12 hosts in CI
    mongo = await MongoMemoryServer.create({ binary: { version: '7.0.3' } });
    const uri = mongo.getUri();

    process.env.NODE_ENV = 'test';
    process.env.MONGO_URI = uri;
    process.env.SESSION_SECRET = 'test-session-secret';
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD_HASH = 'not-used';
    // Provide a harmless Stripe key so the Stripe client initializes in tests
    process.env.STRIPE_SECRET_KEY = 'sk_test_dontuse';
    // Mailgun client expects a key at initialization; provide a harmless stub
    process.env.MAILGUN_API_KEY = 'key-dont-use';
    process.env.MAILGUN_DOMAIN = 'example.test';
    process.env.MAILGUN_FROM_EMAIL = 'noreply@example.test';

    app = require('../main');
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  beforeEach(async () => {
    // Reset mock call history before each test, but keep the module-factory wiring
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await Product.deleteMany({});
    await CustomOrder.deleteMany({});
  });

  test('Unauthenticated POST /api/products is rejected (401) and does not create product', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ title: 'ShouldNotCreate', price: 10 });

    expect(res.status).toBe(401);

    const count = await Product.countDocuments({ title: 'ShouldNotCreate' });
    expect(count).toBe(0);
  });

  test('Unauthenticated PUT /api/products/:id is rejected (401) and does not modify product', async () => {
    const product = await Product.create({ title: 'KeepMe', price: 5 });

    const res = await request(app)
      .put(`/api/products/${product._id}`)
      .send({ title: 'Hacked', price: 1 });

    expect(res.status).toBe(401);

    const found = await Product.findById(product._id);
    expect(String(found.title)).toBe('KeepMe');
  });

  test('Unauthenticated DELETE /api/products/:id is rejected (401) and does not delete product', async () => {
    const product = await Product.create({ title: 'DontDelete', price: 5 });

    const res = await request(app)
      .delete(`/api/products/${product._id}`)
      .send();

    expect(res.status).toBe(401);

    const found = await Product.findById(product._id);
    expect(found).toBeTruthy();
  });

  test('Public GET /api/products/custom-orders/:orderId is redacted', async () => {
    const order = await CustomOrder.create({
      orderId: 'redact-1',
      productId: 'prod-1',
      productName: 'Test',
      productType: 'panel',
      size: 'small',
      panels: 'single',
      panelCount: 1,
      lightType: 'led',
      images: [{ path: '/uploads/custom-orders/redact-1/img.jpg', originalName: 'img.jpg' }],
      customer: {
        name: 'Alice',
        email: 'a@example.com',
        phone: '555',
        shippingAddress: {
          street: '123 Test Street',
          city: 'TestCity',
          state: 'TS',
          zipCode: '12345',
          country: 'TestCountry'
        }
      },
      promoCode: 'PROMO',
      trackingNumber: 'TN123',
      trackingUrl: 'http://tracking.test/TN123',
      stripeSessionId: 'sess_123',
      paymentIntentId: 'pi_123',
      totalPrice: 100,
      originalPrice: 100,
      discountedTotal: 100,
      discountAmount: 0,
      depositAmount: 50,
      remainingBalance: 50,
      paymentStatus: 'pending',
      status: 'awaiting_deposit',
      fulfillmentStatus: 'awaiting_deposit',
      trackingCarrier: 'UPS'
    });

    const res = await request(app).get('/api/products/custom-orders/redact-1');
    expect(res.status).toBe(200);

    const body = res.body;
    const bodyJson = JSON.stringify(body);

    // Ensure sensitive fields are not present
    expect(body.customer).toBeUndefined();
    expect(body.promoCode).toBeUndefined();
    expect(body.trackingNumber).toBeUndefined();
    expect(body.trackingUrl).toBeUndefined();
    expect(body.stripeSessionId).toBeUndefined();
    expect(body.paymentIntentId).toBeUndefined();
    expect(body.images).toBeUndefined();

    // Verify private address and image path text do not appear in response
    expect(bodyJson).not.toMatch(/123 Test Street/);
    expect(bodyJson).not.toMatch(/TestCity/);
    expect(bodyJson).not.toMatch(/\/uploads\/custom-orders/);

    // imagesCount may be present as a number
    expect(typeof body.imagesCount === 'number' || body.imagesCount === undefined).toBeTruthy();
  });

  test('Requests under /uploads/custom-orders and /uploads/photo-checks return 404 and no-store cache', async () => {
    const res1 = await request(app).get('/uploads/custom-orders/some.jpg');
    expect(res1.status).toBe(404);
    expect(res1.headers['cache-control']).toBeDefined();
    expect(res1.headers['cache-control']).toMatch(/no-store/);

    const res2 = await request(app).get('/uploads/photo-checks/whatever.png');
    expect(res2.status).toBe(404);
    expect(res2.headers['cache-control']).toBeDefined();
    expect(res2.headers['cache-control']).toMatch(/no-store/);
  });

  test('Exact directory paths /uploads/custom-orders and /uploads/photo-checks (no trailing slash) return 404 and no-store', async () => {
    const res1 = await request(app).get('/uploads/custom-orders');
    expect(res1.status).toBe(404);
    expect(res1.headers['cache-control']).toMatch(/no-store/);

    const res2 = await request(app).get('/uploads/photo-checks');
    expect(res2.status).toBe(404);
    expect(res2.headers['cache-control']).toMatch(/no-store/);
  });

  test('POST /api/products/custom-orders/:orderId/confirm-deposit response is redacted', async () => {
    // Create a synthetic order with private/contact/media/tracking fields
    const order = await CustomOrder.create({
      orderId: 'confirm-test-1',
      productId: 'prod-1',
      productName: 'Test',
      productType: 'panel',
      size: 'medium',
      panels: 'double',
      panelCount: 2,
      lightType: 'led',
      images: [
        { path: '/uploads/custom-orders/confirm-test-1/img1.jpg', originalName: 'img1.jpg' },
        { path: '/uploads/custom-orders/confirm-test-1/img2.jpg', originalName: 'img2.jpg' }
      ],
      customer: {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '555-1234',
        shippingAddress: {
          street: '456 Deposit Ave',
          city: 'TestDepositCity',
          state: 'DA',
          zipCode: '54321',
          country: 'TestDepositCountry'
        }
      },
      promoCode: 'TESTPROMO',
      trackingNumber: 'TRACK123',
      trackingUrl: 'http://track.test/TRACK123',
      stripeSessionId: 'sess_orig',
      paymentIntentId: 'pi_orig',
      totalPrice: 150,
      originalPrice: 150,
      discountedTotal: 150,
      discountAmount: 0,
      depositAmount: 75,
      remainingBalance: 75,
      paymentStatus: 'pending',
      status: 'awaiting_deposit',
      fulfillmentStatus: 'awaiting_deposit',
      trackingCarrier: 'UPS'
    });

    // Configure Stripe mock to return a paid session for this test
    mockStripeRetrieve.mockResolvedValueOnce({
      id: 'sess_test_123',
      payment_status: 'paid',
      payment_intent: 'pi_test_123',
      metadata: {
        orderId: 'confirm-test-1',
        type: 'custom-order-deposit'
      }
    });

    // Mailgun mock is already configured to resolve successfully (mockResolvedValue set at module level)

    const res = await request(app)
      .post('/api/products/custom-orders/confirm-test-1/confirm-deposit')
      .send({ sessionId: 'sess_test_123' });

    expect(res.status).toBe(200);
    const body = res.body;

    // Ensure response includes only minimal fields
    expect(body.success).toBe(true);
    expect(body.orderId).toBe('confirm-test-1');
    expect(body.status).toBe('deposit_paid');
    expect(body.fulfillmentStatus).toBe('deposit_paid');
    expect(body.paymentStatus).toBe('deposit_paid');

    // Assert exact allowed keys in response
    expect(Object.keys(body).sort()).toEqual([
      'fulfillmentStatus',
      'orderId',
      'paymentStatus',
      'status',
      'success',
    ].sort());

    // Ensure sensitive fields are NOT present
    expect(body.customOrder).toBeUndefined();
    expect(body.customer).toBeUndefined();
    expect(body.images).toBeUndefined();
    expect(body.path).toBeUndefined();
    expect(body.publicUrl).toBeUndefined();
    expect(body.originalName).toBeUndefined();
    expect(body.promoCode).toBeUndefined();
    expect(body.trackingNumber).toBeUndefined();
    expect(body.trackingUrl).toBeUndefined();
    expect(body.stripeSessionId).toBeUndefined();
    expect(body.paymentIntentId).toBeUndefined();

    // Verify that Mailgun was called (confirming email attempt was mocked)
    expect(mockMailgunCreate).toHaveBeenCalled();
  });
});
