'use strict';

function requireSessionSecret(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('SESSION_SECRET must be configured');
  }

  return value;
}

module.exports = requireSessionSecret;
