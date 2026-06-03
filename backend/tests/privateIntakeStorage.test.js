const path = require('path');
const os = require('os');

describe('Private intake storage utilities', () => {
  const originalPrivateIntakeDir = process.env.PRIVATE_INTAKE_DIR;

  afterEach(() => {
    if (originalPrivateIntakeDir === undefined) {
      delete process.env.PRIVATE_INTAKE_DIR;
    } else {
      process.env.PRIVATE_INTAKE_DIR = originalPrivateIntakeDir;
    }
    jest.resetModules();
  });

  test('honors PRIVATE_INTAKE_DIR when set before requiring the path utility', () => {
    const tempDir = path.join(os.tmpdir(), `hexforge-private-intake-test-${Date.now()}`);
    process.env.PRIVATE_INTAKE_DIR = tempDir;
    jest.resetModules();

    const { PRIVATE_INTAKE_DIR, CUSTOM_ORDER_PRIVATE_DIR } = require('../utils/privateIntakePaths');

    expect(PRIVATE_INTAKE_DIR).toBe(tempDir);
    expect(CUSTOM_ORDER_PRIVATE_DIR).toBe(path.join(tempDir, 'custom-orders'));
  });

  test('resolveCustomOrderImageDiskPath maps blocked legacy custom-order metadata into private intake root', () => {
    const tempDir = path.join(os.tmpdir(), `hexforge-private-intake-test-${Date.now()}`);
    process.env.PRIVATE_INTAKE_DIR = tempDir;
    jest.resetModules();

    const { CUSTOM_ORDER_PRIVATE_DIR } = require('../utils/privateIntakePaths');
    const { resolveCustomOrderImageDiskPath } = require('../utils/customOrderUtils');

    const result = resolveCustomOrderImageDiskPath({ path: '/uploads/custom-orders/order-123/image.png' });

    expect(result).toBe(path.join(CUSTOM_ORDER_PRIVATE_DIR, 'order-123', 'image.png'));
  });

  test('resolveCustomOrderImageDiskPath rejects traversal attempts outside the private intake root', () => {
    const tempDir = path.join(os.tmpdir(), `hexforge-private-intake-test-${Date.now()}`);
    process.env.PRIVATE_INTAKE_DIR = tempDir;
    jest.resetModules();

    const { resolveCustomOrderImageDiskPath } = require('../utils/customOrderUtils');
    const result = resolveCustomOrderImageDiskPath({ path: '/uploads/custom-orders/order-123/../../evil.txt' });

    expect(result).toBeNull();
  });
});
