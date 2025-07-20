const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true
});

// Input validation rules
const validateLogin = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

router.post('/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;
    
    // Simple comparison for development
    if (process.env.NODE_ENV === 'development') {
      if (username === process.env.ADMIN_USERNAME && 
          password === process.env.ADMIN_PASSWORD) {
        req.session.admin = {
          loggedIn: true,
          username: username,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          createdAt: new Date()
        };
        return res.json({ message: 'Login successful' });
      }
    }
    // Production bcrypt comparison
    else {
      const isMatch = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
      if (username === process.env.ADMIN_USERNAME && isMatch) {
        req.session.admin = {
          loggedIn: true,
          username: username,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          createdAt: new Date()
        };
        return res.json({ message: 'Login successful' });
      }
    }

    console.warn(`❌ Failed login attempt for username: ${username} from IP: ${req.ip}`);
    return res.status(401).json({ message: 'Invalid credentials' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Authentication failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ 
        message: 'Logout failed',
        error: 'SERVER_ERROR'
      });
    }

    res.clearCookie('connect.sid');
    console.log(`🚪 Admin logged out from IP: ${req.ip}`);
    res.json({ message: 'Logged out successfully' });
  });
});

router.get('/check', (req, res) => {
  if (req.session.admin?.loggedIn) {
    return res.json({ 
      loggedIn: true,
      user: {
        username: req.session.admin.username,
        sessionStart: req.session.admin.createdAt
      }
    });
  }
  res.json({ loggedIn: false });
});

module.exports = router;
