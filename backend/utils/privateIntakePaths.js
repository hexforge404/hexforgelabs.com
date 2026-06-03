const path = require('path');

const PRIVATE_INTAKE_DIR = process.env.PRIVATE_INTAKE_DIR || path.join(__dirname, '..', 'private-intake');
const CUSTOM_ORDER_PRIVATE_DIR = path.join(PRIVATE_INTAKE_DIR, 'custom-orders');

module.exports = {
  PRIVATE_INTAKE_DIR,
  CUSTOM_ORDER_PRIVATE_DIR,
};
