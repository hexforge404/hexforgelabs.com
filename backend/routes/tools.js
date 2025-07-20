const express = require('express');
const os = require('os');
const { execSync } = require('child_process');
const router = express.Router();

router.get('/os-info', (req, res) => {
  res.json({
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    memory: os.totalmem(),
    cpus: os.cpus().map(c => c.model)
  });
});

router.get('/usb-list', (req, res) => {
  try {
    const output = execSync('lsusb').toString();
    res.json({ devices: output.split('\n').filter(Boolean) });
  } catch (err) {
    res.status(500).json({ error: 'lsusb failed' });
  }
});

router.get('/ping', (req, res) => {
  try {
    const host = req.query.host || '8.8.8.8';
    const output = execSync(`ping -c 2 ${host}`).toString();
    res.json({ result: output });
  } catch (err) {
    res.status(500).json({ error: 'Ping failed' });
  }
});

module.exports = router;
