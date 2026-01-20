const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');

const Product = require('../models/Product');
const ProductAsset = require('../models/ProductAsset');

describe('POST /api/products/from-surface-job', () => {
  let mongo;
  let app;
  let agent;
  let originalFetch;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();

    process.env.NODE_ENV = 'test';
    process.env.MONGO_URI = uri;
    process.env.SESSION_SECRET = 'test-session-secret';
    process.env.SURFACE_PUBLIC_PREFIX = '/assets/surface';
    process.env.SURFACE_OUTPUT_DIR = '/tmp';
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash('super-secret', 4);

    app = require('../main');
    await mongoose.connect(uri);
    agent = request.agent(app);
    originalFetch = global.fetch;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
    global.fetch = originalFetch;
  });

  afterEach(async () => {
    await Product.deleteMany({});
    await ProductAsset.deleteMany({});
    global.fetch = originalFetch;
    agent = request.agent(app);
  });

  it('rejects non-admin callers', async () => {
    const res = await request(app)
      .post('/api/products/from-surface-job')
      .send({ job_id: 'job-na', title: 'Denied', price: 10 });

    expect(res.status).toBe(401);
  });

  it('promotes a completed surface job when admin is logged in', async () => {
    const manifest = {
      status: 'complete',
      job_id: 'job-123',
      subfolder: 'smoke-test',
      public_root: 'https://cdn.hexforge.test/assets/surface/smoke-test/job-123',
      public: {
        previews: { hero: 'previews/hero.png' },
        enclosure: { stl: 'enclosure/enclosure.stl' },
        job_manifest: 'https://cdn.hexforge.test/assets/surface/smoke-test/job-123/job_manifest.json',
      },
      outputs: [
        { type: 'texture', url: 'textures/albedo.png', checksum: 'abc', size: 1024 },
        { type: 'heightmap', url: 'heightmaps/hm.png', checksum: 'hm1', size: 512 },
      ],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => manifest,
    });

    await agent
      .post('/api/auth/login')
      .send({ username: process.env.ADMIN_USERNAME, password: 'super-secret' })
      .expect(200);

    const res = await agent
      .post('/api/products/from-surface-job')
      .send({
        job_id: 'job-123',
        subfolder: 'smoke-test',
        title: 'Smoke Test Relief',
        price: 129.99,
        category: 'surface',
        description: 'Test fixture product',
        tags: ['surface', 'fixture'],
        freeze_assets: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Smoke Test Relief');
    expect(res.body.hero_image_url).toBe('https://cdn.hexforge.test/assets/surface/smoke-test/job-123/previews/hero.png');

    const product = await Product.findById(res.body._id);
    const assets = await ProductAsset.find({ product: product._id });

    expect(product).toBeTruthy();
    expect(assets.length).toBeGreaterThanOrEqual(3);
    expect(assets.map((a) => a.type)).toEqual(expect.arrayContaining(['hero', 'stl', 'manifest']));
  });

  it('uses public_root + subfolder when resolving hero preview', async () => {
    const manifest = {
      status: 'completed',
      job_id: 'job-999',
      subfolder: 'nested',
      public_root: 'https://assets.hexforge.local/assets/surface/nested/job-999',
      public: {
        previews: { hero: 'previews/hero.png' },
        enclosure: { stl: 'enclosure/enclosure.stl' },
      },
      outputs: [],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => manifest,
    });

    await agent
      .post('/api/auth/login')
      .send({ username: process.env.ADMIN_USERNAME, password: 'super-secret' })
      .expect(200);

    const res = await agent
      .post('/api/products/from-surface-job')
      .send({
        job_id: 'job-999',
        subfolder: 'nested',
        title: 'Nested Hero',
        price: 75,
        category: 'surface',
      });

    expect(res.status).toBe(201);
    expect(res.body.hero_image_url).toBe('https://assets.hexforge.local/assets/surface/nested/job-999/previews/hero.png');
  });
});
