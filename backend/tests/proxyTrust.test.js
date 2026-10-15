'use strict';

const express = require('express');
const request = require('supertest');

const {
  normalizeAddress,
  createTrustedProxy,
} = require('../security/trustedProxy');

function makeApp(trustedAddress) {
  const app = express();

  app.set('trust proxy', createTrustedProxy(trustedAddress));

  app.get('/ip-test', (req, res) => {
    res.json({
      ip: req.ip,
      ips: req.ips,
    });
  });

  return app;
}

describe('Trusted proxy address validation', () => {
  test('accepts the configured IPv4 address', () => {
    const trust = createTrustedProxy('172.18.0.8');

    expect(trust('172.18.0.8')).toBe(true);
  });

  test('accepts the IPv4-mapped IPv6 equivalent', () => {
    const trust = createTrustedProxy('172.18.0.8');

    expect(trust('::ffff:172.18.0.8')).toBe(true);
  });

  test('rejects other Docker containers', () => {
    const trust = createTrustedProxy('172.18.0.8');

    expect(trust('172.18.0.3')).toBe(false);
    expect(trust('172.18.0.4')).toBe(false);
    expect(trust('172.18.0.9')).toBe(false);
  });

  test('rejects arbitrary public addresses', () => {
    const trust = createTrustedProxy('172.18.0.8');

    expect(trust('8.8.8.8')).toBe(false);
    expect(trust('172.99.1.1')).toBe(false);
  });

  test('fails closed when no trusted address is configured', () => {
    expect(createTrustedProxy(undefined)('172.18.0.8')).toBe(false);
    expect(createTrustedProxy('invalid')('172.18.0.8')).toBe(false);
  });

  test('normalizes IPv4-mapped IPv6 addresses', () => {
    expect(normalizeAddress('::ffff:172.18.0.8')).toBe('172.18.0.8');
  });

  test('rejects malformed IP addresses', () => {
    expect(normalizeAddress('172.18.0.999')).toBeNull();
    expect(normalizeAddress('not-an-ip')).toBeNull();
  });
});

describe('Express forwarded-protocol protection', () => {
  function protocolApp(trustedAddress) {
    const app = express();

    app.set('trust proxy', createTrustedProxy(trustedAddress));

    app.get('/protocol-test', (req, res) => {
      res.json({
        protocol: req.protocol,
        secure: req.secure,
      });
    });

    return app;
  }

  test('ignores spoofed HTTPS protocol from an untrusted peer', async () => {
    const app = protocolApp('172.18.0.8');

    const response = await request(app)
      .get('/protocol-test')
      .set('X-Forwarded-Proto', 'https');

    expect(response.status).toBe(200);
    expect(response.body.protocol).toBe('http');
    expect(response.body.secure).toBe(false);
  });

  test('accepts HTTPS protocol from a trusted loopback proxy', async () => {
    const app = express();

    app.set('trust proxy', (ip) =>
      createTrustedProxy('127.0.0.1')(ip) ||
      createTrustedProxy('::1')(ip)
    );

    app.get('/protocol-test', (req, res) => {
      res.json({
        protocol: req.protocol,
        secure: req.secure,
      });
    });

    const response = await request(app)
      .get('/protocol-test')
      .set('X-Forwarded-Proto', 'https');

    expect(response.status).toBe(200);
    expect(response.body.protocol).toBe('https');
    expect(response.body.secure).toBe(true);
  });
});

describe('Express forwarded-header protection', () => {
  test('ignores spoofed X-Forwarded-For from an untrusted peer', async () => {
    const app = makeApp('172.18.0.8');

    const response = await request(app)
      .get('/ip-test')
      .set('X-Forwarded-For', '203.0.113.99');

    expect(response.status).toBe(200);
    expect(response.body.ip).not.toBe('203.0.113.99');
    expect(response.body.ips).toEqual([]);
  });

  test('ignores forwarded headers when no proxy is configured', async () => {
    const app = makeApp(undefined);

    const response = await request(app)
      .get('/ip-test')
      .set('X-Forwarded-For', '203.0.113.99');

    expect(response.status).toBe(200);
    expect(response.body.ip).not.toBe('203.0.113.99');
    expect(response.body.ips).toEqual([]);
  });

  test('trusts the actual loopback peer and rejects spoofed earlier hops', async () => {
    const app = express();

    app.set('trust proxy', (ip) => {
      return createTrustedProxy('127.0.0.1')(ip) ||
        createTrustedProxy('::1')(ip);
    });

    app.get('/ip-test', (req, res) => {
      res.json({ ip: req.ip, ips: req.ips });
    });

    const response = await request(app)
      .get('/ip-test')
      .set('X-Forwarded-For', '198.51.100.99, 203.0.113.10');

    expect(response.status).toBe(200);
    expect(response.body.ip).toBe('203.0.113.10');
    expect(response.body.ips).toEqual(['203.0.113.10']);
  });
});
