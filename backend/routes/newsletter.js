const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Newsletter = require('../models/Newsletter');

router.post('/',
  body('email').isEmail().withMessage('Valid email is required'),
  body('name').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const existing = await Newsletter.findOne({ email: req.body.email });
      if (existing) return res.status(409).json({ message: 'Already subscribed' });

      const subscriber = new Newsletter(req.body);
      await subscriber.save();
      res.json({ message: 'Subscribed to newsletter' });
    } catch (err) {
      console.error('❌ Newsletter Error:', err);
      res.status(500).json({ error: 'Failed to subscribe' });
    }
  }
);

module.exports = router;

