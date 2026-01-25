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

// --- REGISTER VALIDATION ---
const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 32 })
    .withMessage('Username must be 3-32 characters')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('Username can only include letters, numbers, dot, underscore, or dash'),
  body('email')
    .isEmail()
    .withMessage('Valid email required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
];

// ✅ NEW LOGIN VALIDATION – uses "identifier" instead of "email"
const validateLogin = [
  body('identifier')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email required')
    .normalizeEmail(),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 64 })
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// --- REGISTER ROUTE ---
router.post('/register', authLimiter, validateRegister, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const username = String(req.body.username || '').toLowerCase();
    const email = String(req.body.email || '').toLowerCase();
    const password = String(req.body.password || '');

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      passwordHash,
      roles: ['member']
    });

    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    };

    return res.status(201).json({
      message: 'Account created',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('User registration error:', err);
    return res.status(500).json({ message: 'Registration failed', error: 'SERVER_ERROR' });
  }
});

// ✅ UPDATED LOGIN ROUTE
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier, password } = req.body;
    const loginId = identifier || req.body.email || req.body.username;

    if (!loginId) {
      return res.status(400).json({ message: 'Username or email is required' });
    }

    // allow login by email OR username
    const query = String(loginId).includes('@')
      ? { email: String(loginId).toLowerCase() }
      : { username: String(loginId).toLowerCase() };

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
