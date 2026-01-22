const request = require('supertest');

describe('/api/admin/session cache behavior', () => {
  let app;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.SESSION_SECRET = 'test-session-secret';
    app = require('../main');
  });

  test('returns 200 with no-cache headers and no etag', async () => {
    const res = await request(app).get('/api/admin/session');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toMatch(/no-store/);
    expect(res.headers['pragma']).toBe('no-cache');
    expect(res.headers['expires']).toBe('0');
    expect(res.headers['surrogate-control']).toBe('no-store');
    expect(res.headers['etag']).toBeUndefined();
    expect(res.body).toEqual(
      expect.objectContaining({
        loggedIn: false,
        isAdmin: false,
      })
    );
  });

  test('does not return 304 even when If-None-Match is sent', async () => {
    const res = await request(app)
      .get('/api/admin/session')
      .set('If-None-Match', '"fake-etag"');

    expect(res.status).toBe(200);
    expect(res.headers['etag']).toBeUndefined();
  });
});