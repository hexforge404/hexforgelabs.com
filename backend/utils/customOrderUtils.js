const fs = require('fs');
const path = require('path');

const uploadsRoot = process.env.IMAGES_DIR || path.join(__dirname, '..', '..', 'uploads');
const customOrdersRoot = path.join(uploadsRoot, 'custom-orders');

const FULFILLMENT_STAGES = [
  'submitted',
  'awaiting_deposit',
  'deposit_paid',
  'reviewing_assets',
  'print_ready',
  'ready_to_ship',
  'in_production',
  'printed',
  'assembled',
  'packed',
  'shipped',
  'completed',
  'cancelled'
];

const ALLOWED_FULFILLMENT_TRANSITIONS = {
  submitted: ['awaiting_deposit'],
  awaiting_deposit: ['deposit_paid'],
  deposit_paid: ['awaiting_deposit', 'reviewing_assets'],
  reviewing_assets: ['deposit_paid', 'print_ready', 'ready_to_ship'],
  print_ready: ['reviewing_assets', 'ready_to_ship', 'in_production'],
  ready_to_ship: ['reviewing_assets', 'print_ready', 'in_production'],
  in_production: ['print_ready', 'ready_to_ship', 'printed'],
  printed: ['in_production', 'assembled'],
  assembled: ['printed', 'packed'],
  packed: ['assembled', 'shipped'],
  shipped: ['packed', 'completed'],
  completed: ['shipped'],
  cancelled: []
};

const FULFILLMENT_STAGE_TIMESTAMP_KEYS = {
  submitted: 'submittedAt',
  awaiting_deposit: 'awaitingDepositAt',
  deposit_paid: 'depositPaidAt',
  reviewing_assets: 'reviewingAssetsAt',
  print_ready: 'printReadyAt',
  ready_to_ship: 'readyToShipAt',
  in_production: 'inProductionAt',
  printed: 'printedAt',
  assembled: 'assembledAt',
  packed: 'packedAt',
  shipped: 'shippedAt',
  completed: 'completedAt',
  cancelled: 'cancelledAt'
};

const isAllowedFulfillmentTransition = (currentStage, nextStage) => {
  if (!currentStage || !nextStage) return false;
  if (currentStage === nextStage) return true;
  return ALLOWED_FULFILLMENT_TRANSITIONS[currentStage]?.includes(nextStage) || false;
};

const getFulfillmentTimestampKey = (stage) => FULFILLMENT_STAGE_TIMESTAMP_KEYS[stage] || null;

const normalizeCustomOrderImagePath = (rawPath) => {
  if (!rawPath) return '';
  const value = String(rawPath).trim();
  if (!value) return '';
  if (value.startsWith('data:') || /^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/uploads/') || value.startsWith('/images/')) return value;
  if (value.includes('/uploads/')) {
    return value.slice(value.indexOf('/uploads/'));
  }
  const filename = value.split('/').pop();
  if (!filename || !filename.includes('.')) return value;
  return `/uploads/custom-orders/${filename}`;
};

const resolveCustomOrderImageDiskPath = (image) => {
  if (!image) return null;
  const raw = String(image.relativePath || image.publicUrl || image.path || '').trim().replace(/\\/g, '/');
  if (!raw) return null;

  let relativePath = raw;
  if (relativePath.startsWith('/')) {
    relativePath = relativePath.slice(1);
  }
  if (relativePath.includes('uploads/custom-orders/')) {
    relativePath = relativePath.slice(relativePath.indexOf('uploads/custom-orders/') + 'uploads/'.length);
  }
  if (relativePath.startsWith('uploads/')) {
    relativePath = relativePath.slice('uploads/'.length);
  }
  if (relativePath.startsWith('custom-orders/')) {
    return path.join(customOrdersRoot, relativePath.slice('custom-orders/'.length));
  }

  return path.join(customOrdersRoot, relativePath);
};

const isCustomOrderPrintReady = (customOrder) => {
  if (!customOrder) return false;
  const imageCount = Array.isArray(customOrder.images)
    ? customOrder.images.length
    : Number(customOrder.imagesCount || 0);
  const paid = ['paid_in_full', 'deposit_paid'].includes(customOrder.paymentStatus);
  const status = customOrder.fulfillmentStatus || customOrder.status;
  const validStatus = !['cancelled', 'completed'].includes(status);
  return paid && imageCount > 0 && validStatus;
};

const isProductionCustomOrderEligible = (customOrder) => {
  if (!customOrder) return false;
  if (customOrder.isTest) return false;
  const paid = ['deposit_paid', 'paid_in_full'].includes(customOrder.paymentStatus);
  const status = customOrder.fulfillmentStatus || customOrder.status;
  const validStatus = status && !['cancelled', 'completed'].includes(status);
  const imageCount = Array.isArray(customOrder.images)
    ? customOrder.images.length
    : Number(customOrder.imagesCount || 0);
  return paid && validStatus && imageCount > 0;
};

const normalizeCustomOrder = (customOrder) => {
  const obj = customOrder.toObject ? customOrder.toObject({ getters: true, virtuals: false }) : { ...customOrder };

  if (Array.isArray(obj.images)) {
    obj.images = obj.images.map((img) => {
      const normalizedPath = normalizeCustomOrderImagePath(img.path || img.publicUrl || img.relativePath);
      const normalizedPublicUrl = normalizeCustomOrderImagePath(img.publicUrl || img.path || img.relativePath);
      return {
        ...img,
        path: normalizedPath,
        publicUrl: normalizedPublicUrl,
        relativePath: img.relativePath || String(img.path || img.publicUrl || '').replace(/^\//, ''),
      };
    });
  }

  if (obj.nightlightAddon?.separateImage) {
    const separateImage = obj.nightlightAddon.separateImage;
    const normalizedPath = normalizeCustomOrderImagePath(separateImage.path || separateImage.publicUrl || separateImage.relativePath);
    const normalizedPublicUrl = normalizeCustomOrderImagePath(separateImage.publicUrl || separateImage.path || separateImage.relativePath);
    obj.nightlightAddon.separateImage = {
      ...separateImage,
      path: normalizedPath,
      publicUrl: normalizedPublicUrl,
      relativePath: separateImage.relativePath || String(separateImage.path || separateImage.publicUrl || '').replace(/^\//, ''),
    };
  }

  obj.imagesCount = Array.isArray(obj.images) ? obj.images.length : 0;
  obj.fulfillmentStatus = obj.fulfillmentStatus || obj.status;
  obj.isPrintReady = isCustomOrderPrintReady(obj);
  return obj;
};

module.exports = {
  normalizeCustomOrderImagePath,
  resolveCustomOrderImageDiskPath,
  isCustomOrderPrintReady,
  isProductionCustomOrderEligible,
  normalizeCustomOrder,
  FULFILLMENT_STAGES,
  ALLOWED_FULFILLMENT_TRANSITIONS,
  isAllowedFulfillmentTransition,
  getFulfillmentTimestampKey,
};
