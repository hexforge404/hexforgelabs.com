const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');

require('dotenv').config();

const proxyConfig = {
  target: 'http://backend:8000',
  changeOrigin: true,
  logLevel: 'debug',
  
  secure: process.env.NODE_ENV === 'production',
  xfwd: true,
  cookieDomainRewrite: {
    '*': process.env.NODE_ENV === 'production' ? '.yourdomain.com' : ''
  },
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('X-Forwarded-For', req.ip);
    if (req.headers.cookie) {
      proxyReq.setHeader('Cookie', req.headers.cookie);
    }
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(502).json({ 
      error: 'Bad Gateway',
      message: 'Connection to backend service failed'
    });
  },
  timeout: 5000
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = function(app) {
  // Health check endpoint bypass
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'frontend healthy' });
  });

  // Apply proxy with security headers
  app.use('/api', 
    (req, res, next) => {
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "default-src 'self'"
      });
      next();
    },
    apiLimiter,
    createProxyMiddleware(proxyConfig)
  );
};
