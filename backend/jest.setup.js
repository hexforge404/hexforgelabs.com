// Force mongodb-memory-server to use a Debian 12 compatible binary (>=7.0.3).
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || '7.0.14';
// Provide dummy Mailgun credentials so routes can initialize without failing during tests.
process.env.MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || 'test-mailgun-key';
process.env.MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'example.test';
process.env.MAILGUN_FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL || 'noreply@example.test';
process.env.TO_EMAIL = process.env.TO_EMAIL || 'to@example.test';
process.env.BCC_EMAIL = process.env.BCC_EMAIL || '';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';

jest.setTimeout(30000);

const originalFetch = global.fetch;

afterAll(() => {
  global.fetch = originalFetch;
});
