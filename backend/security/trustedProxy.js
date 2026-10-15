'use strict';

const net = require('node:net');

function normalizeAddress(value) {
  if (typeof value !== 'string') return null;

  const address = value.trim();

  if (net.isIP(address) === 4) {
    return address;
  }

  if (net.isIP(address) === 6) {
    const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address);

    if (mapped && net.isIP(mapped[1]) === 4) {
      return mapped[1];
    }

    return address.toLowerCase();
  }

  return null;
}

function createTrustedProxy(trustedAddress) {
  const trusted = normalizeAddress(trustedAddress);

  if (!trusted) {
    return () => false;
  }

  return (remoteAddress) => {
    return normalizeAddress(remoteAddress) === trusted;
  };
}

module.exports = {
  normalizeAddress,
  createTrustedProxy,
};
