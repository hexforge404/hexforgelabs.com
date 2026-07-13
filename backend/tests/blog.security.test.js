process.env.MONGOMS_VERSION = '7.0.14';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Blog = require('../models/Blog');

describe('blog route security and public visibility', () => {
  let mongo;
  let app;
  let agent;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();

    process.env.NODE_ENV = 'test';
    process.env.MONGO_URI = uri;
    process.env.SESSION_SECRET = 'blog-test-session-secret';
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash('super-secret', 4);

    app = require('../main');
    await mongoose.connect(uri);

    agent = request.agent(app);
  });

  afterAll(async () => {
    await mongoose.disconnect();

    if (mongo) {
      await mongo.stop();
    }
  });

  afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await Blog.deleteMany({});
    }

    if (app) {
      agent = request.agent(app);
    }
  });

  test('rejects unauthenticated blog writes', async () => {
    const postResponse = await request(app)
      .post('/api/blog')
      .send({
        title: 'Denied Post',
        content: 'This must not be created.',
        visibility: 'private',
        isDraft: true,
      });

    expect(postResponse.status).toBe(401);

    const putResponse = await request(app)
      .put('/api/blog/507f1f77bcf86cd799439011')
      .send({
        title: 'Denied Update',
        content: 'This must not be updated.',
        visibility: 'private',
        isDraft: true,
      });

    expect(putResponse.status).toBe(401);

    const deleteResponse = await request(app)
      .delete('/api/blog/507f1f77bcf86cd799439011');

    expect(deleteResponse.status).toBe(401);

    expect(await Blog.countDocuments()).toBe(0);
  });

  test('public list excludes drafts and non-public posts', async () => {
    await Blog.create([
      {
        title: 'Published Public Post',
        slug: 'published-public-post',
        content: 'Visible content.',
        visibility: 'public',
        isDraft: false,
      },
      {
        title: 'Public Draft',
        slug: 'public-draft',
        content: 'Draft content.',
        visibility: 'public',
        isDraft: true,
      },
      {
        title: 'Private Published Post',
        slug: 'private-published-post',
        content: 'Private content.',
        visibility: 'private',
        isDraft: false,
      },
    ]);

    const response = await request(app).get('/api/blog');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].slug).toBe('published-public-post');
  });

  test('public slug route hides drafts and private posts', async () => {
    await Blog.create([
      {
        title: 'Hidden Draft',
        slug: 'hidden-draft',
        content: 'Draft content.',
        visibility: 'public',
        isDraft: true,
      },
      {
        title: 'Hidden Private Post',
        slug: 'hidden-private-post',
        content: 'Private content.',
        visibility: 'private',
        isDraft: false,
      },
      {
        title: 'Visible Post',
        slug: 'visible-post',
        content: 'Visible content.',
        visibility: 'public',
        isDraft: false,
      },
    ]);

    await request(app)
      .get('/api/blog/slug/hidden-draft')
      .expect(404);

    await request(app)
      .get('/api/blog/slug/hidden-private-post')
      .expect(404);

    const visible = await request(app)
      .get('/api/blog/slug/visible-post')
      .expect(200);

    expect(visible.body.slug).toBe('visible-post');
  });

  test('authenticated admin can create a valid draft', async () => {
    await agent
      .post('/api/auth/login')
      .send({
        username: process.env.ADMIN_USERNAME,
        password: 'super-secret',
      })
      .expect(200);

    const response = await agent
      .post('/api/blog')
      .send({
        title: 'Review Queue Draft',
        slug: 'review-queue-draft',
        content: '# Review Queue Draft\n\nGrounded test content.',
        tags: ['hexforge', 'repair'],
        visibility: 'private',
        isDraft: true,
        publishDate: '2026-07-12T20:30:00.000Z',
        meta: {
          description: 'A private draft created during security testing.',
        },
        image: '',
        video: '',
        affiliateLink: '',
      });

    expect(response.status).toBe(201);
    expect(response.body.slug).toBe('review-queue-draft');
    expect(response.body.visibility).toBe('private');
    expect(response.body.isDraft).toBe(true);

    const stored = await Blog.findOne({
      slug: 'review-queue-draft',
    }).lean();

    expect(stored).toBeTruthy();
    expect(stored.publishedAt.toISOString()).toBe(
      '2026-07-12T20:30:00.000Z'
    );
  });

  test('authenticated invalid POST returns 400 and creates nothing', async () => {
    await agent
      .post('/api/auth/login')
      .send({
        username: process.env.ADMIN_USERNAME,
        password: 'super-secret',
      })
      .expect(200);

    const response = await agent
      .post('/api/blog')
      .send({
        title: '',
        content: '',
        visibility: 'worldwide',
        isDraft: 'not-a-boolean',
        video: 'not-a-url',
      });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(expect.any(Array));
    expect(response.body.errors.length).toBeGreaterThan(0);
    expect(await Blog.countDocuments()).toBe(0);
  });
});
