// routes/userAuth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many auth attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// --- REGISTER VALIDATION (keep whatever you already have here) ---
// const validateRegister = [ ... your existing rules ... ];

// ✅ NEW LOGIN VALIDATION – uses "identifier" instead of "email"
const validateLogin = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// --- REGISTER ROUTE (leave as you already have it) ---
// router.post('/register', authLimiter, validateRegister, async (req, res) => { ... });

// ✅ UPDATED LOGIN ROUTE
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier, password } = req.body;

    // allow login by email OR username
    const query = identifier.includes('@')
      ? { email: identifier.toLowerCase() }
      : { username: identifier.toLowerCase() };

    const user = await User.findOne(query);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Save member session
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    };

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('User login error:', err);
    res.status(500).json({ message: 'Login failed', error: 'SERVER_ERROR' });
  }
});

// ✅ "me" route (make sure this exists)
router.get('/me', (req, res) => {
  if (req.session.user) {
    return res.json({
      loggedIn: true,
      user: req.session.user
    });
  }
  res.json({ loggedIn: false, user: null });
});

// ✅ logout route (make sure this exists too)
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('User logout error:', err);
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('hexforge.sid');
    res.json({ message: 'Logged out' });
  });
});

module.exports = router;
