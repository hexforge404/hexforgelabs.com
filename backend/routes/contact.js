const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const ContactSubmission = require('../models/ContactSubmission');

const router = express.Router();
const allowedPageSources = ['portfolio', 'help', 'general'];

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many contact requests',
    message: 'Please wait a few minutes and try again.'
  }
});

const cleanString = (value) => String(value || '').trim();

const hashIp = (ip) => {
  if (!ip) return undefined;
  return crypto
    .createHash('sha256')
    .update(`${process.env.CONTACT_IP_HASH_SALT || 'hexforge-contact'}:${ip}`)
    .digest('hex');
};

router.post(
  '/',
  contactLimiter,
  body('website').optional({ checkFalsy: true }).isEmpty(),
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('A valid email is required'),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
  body('topic').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 4000 }),
  body('pageSource').optional({ checkFalsy: true }).isIn(allowedPageSources),
  async (req, res) => {
    if (cleanString(req.body.website)) {
      return res.status(400).json({ error: 'Invalid contact submission' });
    }

    const email = cleanString(req.body.email);
    const phone = cleanString(req.body.phone);
    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone is required' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const submission = await ContactSubmission.create({
        name: cleanString(req.body.name),
        email,
        phone,
        topic: cleanString(req.body.topic),
        message: cleanString(req.body.message),
        pageSource: allowedPageSources.includes(req.body.pageSource) ? req.body.pageSource : 'general',
        userAgent: cleanString(req.get('user-agent')).slice(0, 300),
        ipHash: hashIp(req.ip)
      });

      console.log('📬 Contact submission stored', {
        id: submission._id.toString(),
        pageSource: submission.pageSource,
        topic: submission.topic || 'unspecified',
        hasEmail: Boolean(submission.email),
        hasPhone: Boolean(submission.phone)
      });

      res.status(201).json({
        message: 'Contact submission received',
        id: submission._id
      });
    } catch (err) {
      console.error('❌ Contact submission error:', err);
      res.status(500).json({ error: 'Failed to save contact submission' });
    }
  }
);

module.exports = router;
