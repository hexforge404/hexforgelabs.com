const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Feedback = require('../models/Feedback');

router.post('/',
  body('message').notEmpty().withMessage('Feedback message is required'),
  body('email').optional().isEmail().withMessage('Invalid email'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const feedback = new Feedback(req.body);
      await feedback.save();
      res.json({ message: 'Feedback received' });
    } catch (err) {
      console.error('❌ Feedback Error:', err);
      res.status(500).json({ error: 'Failed to save feedback' });
    }
  }
);

module.exports = router;
