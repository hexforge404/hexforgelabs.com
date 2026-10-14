'use strict';

const requireSessionSecret = require('../utils/requireSessionSecret');

describe('requireSessionSecret', () => {
  test('rejects an undefined secret', () => {
    expect(() => requireSessionSecret(undefined))
      .toThrow('SESSION_SECRET must be configured');
  });

  test('rejects an empty secret', () => {
    expect(() => requireSessionSecret(''))
      .toThrow('SESSION_SECRET must be configured');
  });

  test('rejects whitespace-only secrets', () => {
    expect(() => requireSessionSecret('   '))
      .toThrow('SESSION_SECRET must be configured');
  });

  test('accepts a configured secret unchanged', () => {
    const value = 'test-only-session-secret-value';

    expect(requireSessionSecret(value)).toBe(value);
  });
});
