const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const CustomOrder = require('../models/CustomOrder');
const PrintJob = require('../models/PrintJob');
const Batch = require('../models/Batch');
const {
  normalizeCustomOrder,
} = require('../utils/customOrderUtils');

const TEST_PIPELINE_MODE = process.env.TEST_PIPELINE_MODE === 'true' || process.env.TEST_PIPELINE_MODE === '1';
const TEST_PIPELINE_DISABLE_EMAILS = process.env.TEST_PIPELINE_DISABLE_EMAILS === 'true' || process.env.TEST_PIPELINE_DISABLE_EMAILS === '1';
const uploadsRoot = process.env.IMAGES_DIR || path.join(__dirname, '..', 'uploads');
const customOrdersRoot = path.join(uploadsRoot, 'custom-orders');
const seededAssetsDir = path.join(__dirname, '..', 'test-assets', 'custom-orders');

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
});

function requireAdmin(req, res, next) {
  if (req.session?.admin?.loggedIn) {
    return next();
  }
  console.warn('🚨 Unauthorized test pipeline access attempt from IP:', req.ip);
  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Admin login required',
  });
}

function formatResponse(step, success, data = {}, message = null) {
  return {
    step,
    success,
    message,
    data,
  };
}

function getSeededImages() {
  if (!fs.existsSync(seededAssetsDir)) {
    return [];
  }
  return fs.readdirSync(seededAssetsDir)
    .filter((filename) => /\.(jpg|jpeg|png|webp|gif)$/i.test(filename))
    .map((filename) => ({ filename, sourcePath: path.join(seededAssetsDir, filename) }));
}

const testPipelineNotEnabled = (req, res, next) => {
  if (!TEST_PIPELINE_MODE) {
    return res.status(403).json({
      error: 'Test pipeline mode is disabled',
      message: 'Set TEST_PIPELINE_MODE=true to enable this route',
    });
  }
  return next();
};

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const findTestOrder = async ({ orderId, testRunId }) => {
  const filter = { isTest: true };
  if (orderId) {
    filter.orderId = orderId;
  }
  if (testRunId) {
    filter.testRunId = testRunId;
  }
  if (!orderId && !testRunId) return null;
  return CustomOrder.findOne(filter);
};

const findTestPrintJob = async ({ printJobId, testRunId }) => {
  const filter = { isTest: true };
  if (printJobId) {
    filter.printJobId = printJobId;
  }
  if (testRunId) {
    filter.testRunId = testRunId;
  }
  if (!printJobId && !testRunId) return null;
  return PrintJob.findOne(filter);
};

const findTestBatch = async ({ batchId, testRunId }) => {
  const filter = { isTest: true };
  if (batchId) {
    filter.batchId = batchId;
  }
  if (testRunId) {
    filter.testRunId = testRunId;
  }
  if (!batchId && !testRunId) return null;
  return Batch.findOne(filter);
};

const copySeedImagesForOrder = async (orderId) => {
  const images = getSeededImages();
  if (!images.length) {
    throw new Error('No seeded test assets available');
  }

  const orderDir = path.join(customOrdersRoot, orderId);
  ensureDir(orderDir);

  return Promise.all(images.map(async ({ filename, sourcePath }) => {
    const targetPath = path.join(orderDir, filename);
    await fs.promises.copyFile(sourcePath, targetPath);
    const relativePath = `custom-orders/${orderId}/${filename}`;
    const publicUrl = `/uploads/custom-orders/${orderId}/${filename}`;
    return {
      path: publicUrl,
      publicUrl,
      relativePath,
      originalName: filename,
      mimeType: 'image/png',
      size: (await fs.promises.stat(targetPath)).size,
      uploadedAt: new Date(),
    };
  }));
};

const buildTestOrderPayload = (order, extra = {}) => ({
  orderId: order.orderId,
  testRunId: order.testRunId,
  isTest: order.isTest,
  paymentStatus: order.paymentStatus,
  fulfillmentStatus: order.fulfillmentStatus,
  status: order.status,
  totalPrice: order.totalPrice,
  depositAmount: order.depositAmount,
  remainingBalance: order.remainingBalance,
  images: order.images,
  ...extra,
});

const getDefaultTestCustomer = () => ({
  name: 'Test Customer',
  email: 'test+pipeline@hexforgelabs.com',
  phone: '+10000000000',
  shippingAddress: {
    street: '123 Test Ave',
    city: 'Testville',
    state: 'TX',
    zipCode: '77001',
    country: 'USA',
  },
});

const getDefaultPrintJobDefaults = () => ({
  printerProfile: 'Prusa MK4',
  materialProfile: 'PLA Standard',
  slicerProfile: 'PrusaSlicer',
  nozzle: '0.4mm',
  layerHeight: 0.2,
  infill: 15,
  wallCount: 2,
  estimatedPrintHours: 6,
});

const createBatchTotals = (printJobs) => {
  if (!Array.isArray(printJobs)) return 0;
  return printJobs.reduce((sum, job) => sum + Number(job.estimatedPrintHours || 0), 0);
};

const normalizeProfile = (value) => String(value || '').trim().toLowerCase();
const isBatchCompatibleWithJob = (job, batch) => {
  if (!job || !batch) return false;
  return (
    normalizeProfile(job.printerProfile) === normalizeProfile(batch.printerProfile) &&
    normalizeProfile(job.materialProfile) === normalizeProfile(batch.materialProfile) &&
    normalizeProfile(job.nozzle) === normalizeProfile(batch.nozzle) &&
    Number(job.layerHeight) === Number(batch.layerHeight)
  );
};

router.use(testPipelineNotEnabled);
router.use(requireAdmin);
router.use(adminLimiter);

router.post('/create-order', async (req, res) => {
  try {
    const testRunId = req.body.testRunId || `TR-${uuidv4()}`;
    const customer = req.body.customer || getDefaultTestCustomer();
    const totalPrice = typeof req.body.totalPrice === 'number' ? req.body.totalPrice : 100;
    const depositAmount = typeof req.body.depositAmount === 'number' ? req.body.depositAmount : Number((totalPrice / 2).toFixed(2));

    const order = new CustomOrder({
      productId: 'TEST-PRODUCT',
      productName: 'HexForge Test Custom Order',
      productType: 'panel',
      size: 'medium',
      panels: 'single',
      panelCount: 1,
      lightType: 'led',
      extras: [],
      notes: 'Auto-generated test custom order',
      customer,
      images: [],
      originalPrice: totalPrice,
      discountedTotal: totalPrice,
      totalPrice,
      depositAmount,
      paymentMethod: 'manual',
      paymentStatus: 'pending',
      fulfillmentStatus: 'awaiting_deposit',
      status: 'awaiting_deposit',
      fulfillmentTimestamps: {
        submittedAt: new Date(),
        awaitingDepositAt: new Date(),
      },
      isTest: true,
      testRunId,
      confirmationSent: false,
      depositConfirmationSent: false,
      adminNotificationSent: false,
    });

    const images = await copySeedImagesForOrder(order.orderId);
    order.images = images;

    await order.save();

    if (!TEST_PIPELINE_DISABLE_EMAILS) {
      // Emails are intentionally disabled for test pipeline runs.
    }

    return res.status(201).json({
      success: true,
      step: 'create-order',
      testRunId,
      orderId: order.orderId,
      result: buildTestOrderPayload(order),
    });
  } catch (err) {
    console.error('❌ Failed to create test custom order:', err);
    return res.status(500).json({
      success: false,
      step: 'create-order',
      error: 'Failed to create test custom order',
      details: err.message,
    });
  }
});

router.post('/simulate-payment', async (req, res) => {
  try {
    const { orderId, testRunId } = req.body;
    const order = await findTestOrder({ orderId, testRunId });
    if (!order) {
      return res.status(404).json({
        success: false,
        step: 'simulate-payment',
        error: 'Test custom order not found',
      });
    }

    order.paymentStatus = 'deposit_paid';
    order.fulfillmentStatus = 'deposit_paid';
    order.status = 'deposit_paid';
    order.depositPaidAt = new Date();
    order.fulfillmentTimestamps = {
      ...order.fulfillmentTimestamps,
      depositPaidAt: new Date(),
    };
    order.updatedAt = new Date();

    await order.save();

    return res.json({
      success: true,
      step: 'simulate-payment',
      orderId: order.orderId,
      testRunId: order.testRunId,
      result: buildTestOrderPayload(order),
    });
  } catch (err) {
    console.error('❌ Failed to simulate payment:', err);
    return res.status(500).json({
      success: false,
      step: 'simulate-payment',
      error: 'Failed to simulate deposit payment',
      details: err.message,
    });
  }
});

router.post('/create-print-job', async (req, res) => {
  try {
    const { orderId, testRunId } = req.body;
    const order = await findTestOrder({ orderId, testRunId });
    if (!order) {
      return res.status(404).json({
        success: false,
        step: 'create-print-job',
        error: 'Test custom order not found',
      });
    }

    const normalizedOrder = normalizeCustomOrder(order);
    const defaults = getDefaultPrintJobDefaults();
    const printJob = new PrintJob({
      orderId: normalizedOrder.orderId,
      customOrderId: normalizedOrder._id,
      productType: normalizedOrder.productType || 'panel',
      partType: 'custom_order',
      sourceImages: Array.isArray(normalizedOrder.images) ? normalizedOrder.images : [],
      printerProfile: defaults.printerProfile,
      materialProfile: defaults.materialProfile,
      slicerProfile: defaults.slicerProfile,
      nozzle: defaults.nozzle,
      layerHeight: defaults.layerHeight,
      infill: defaults.infill,
      wallCount: defaults.wallCount,
      generationMethod: 'test_pipeline',
      lithophaneType: 'custom',
      targetWidthMm: 100,
      targetHeightMm: 100,
      targetDepthMm: 10,
      panelCount: normalizedOrder.panelCount || 1,
      generationNotes: 'Generated by test pipeline',
      status: 'queued_for_generation',
      assignedBatchId: '',
      stlFilename: '',
      stlPath: '',
      stlVersion: '',
      projectFilePath: '',
      gcodePath: '',
      estimatedPrintHours: defaults.estimatedPrintHours,
      notes: 'Test print job created from test custom order',
      isTest: true,
      testRunId: normalizedOrder.testRunId,
    });

    await printJob.save();

    return res.status(201).json({
      success: true,
      step: 'create-print-job',
      orderId: printJob.orderId,
      printJobId: printJob.printJobId,
      testRunId: printJob.testRunId,
      result: printJob.toObject({ getters: true, virtuals: false }),
    });
  } catch (err) {
    console.error('❌ Failed to create test print job:', err);
    return res.status(500).json({
      success: false,
      step: 'create-print-job',
      error: 'Failed to create test print job',
      details: err.message,
    });
  }
});

router.post('/apply-stl', async (req, res) => {
  try {
    const { printJobId, testRunId, stlFilename, stlPath, stlVersion, generationNotes } = req.body;
    const printJob = await findTestPrintJob({ printJobId, testRunId });
    if (!printJob) {
      return res.status(404).json({
        success: false,
        step: 'apply-stl',
        error: 'Test print job not found',
      });
    }

    if (stlFilename !== undefined) printJob.stlFilename = stlFilename;
    if (stlPath !== undefined) printJob.stlPath = stlPath;
    if (stlVersion !== undefined) printJob.stlVersion = stlVersion;
    if (generationNotes !== undefined) printJob.generationNotes = generationNotes;
    printJob.status = 'stl_ready';
    printJob.updatedAt = new Date();

    await printJob.save();

    return res.json({
      success: true,
      step: 'apply-stl',
      printJobId: printJob.printJobId,
      result: printJob.toObject({ getters: true, virtuals: false }),
    });
  } catch (err) {
    console.error('❌ Failed to apply STL handoff:', err);
    return res.status(500).json({
      success: false,
      step: 'apply-stl',
      error: 'Failed to apply STL handoff',
      details: err.message,
    });
  }
});

router.post('/create-batch', async (req, res) => {
  try {
    const { printJobId, testRunId } = req.body;
    const printJob = await findTestPrintJob({ printJobId, testRunId });
    if (!printJob) {
      return res.status(404).json({
        success: false,
        step: 'create-batch',
        error: 'Test print job not found',
      });
    }

    const batch = new Batch({
      printerProfile: printJob.printerProfile,
      materialProfile: printJob.materialProfile,
      slicerProfile: printJob.slicerProfile,
      nozzle: printJob.nozzle,
      layerHeight: printJob.layerHeight,
      printJobIds: [printJob.printJobId],
      totalEstimatedPrintHours: Number(printJob.estimatedPrintHours || 0),
      status: 'pending',
      projectFilePath: '',
      gcodePath: '',
      notes: 'Test batch generated from test print job',
      isTest: true,
      testRunId: printJob.testRunId,
    });

    await batch.save();
    printJob.assignedBatchId = batch.batchId;
    await printJob.save();

    return res.status(201).json({
      success: true,
      step: 'create-batch',
      batchId: batch.batchId,
      result: batch.toObject({ getters: true, virtuals: false }),
    });
  } catch (err) {
    console.error('❌ Failed to create batch from print job:', err);
    return res.status(500).json({
      success: false,
      step: 'create-batch',
      error: 'Failed to create batch from test print job',
      details: err.message,
    });
  }
});

router.post('/assign-job', async (req, res) => {
  try {
    const { printJobId, batchId, testRunId } = req.body;
    const printJob = await findTestPrintJob({ printJobId, testRunId });
    const batch = await findTestBatch({ batchId, testRunId });

    if (!printJob) {
      return res.status(404).json({
        success: false,
        step: 'assign-job',
        error: 'Test print job not found',
      });
    }
    if (!batch) {
      return res.status(404).json({
        success: false,
        step: 'assign-job',
        error: 'Test batch not found',
      });
    }

    if (!isBatchCompatibleWithJob(printJob, batch)) {
      return res.status(400).json({
        success: false,
        step: 'assign-job',
        error: 'Print job is not compatible with this batch',
      });
    }

    if (printJob.assignedBatchId && printJob.assignedBatchId !== batch.batchId) {
      return res.status(400).json({
        success: false,
        step: 'assign-job',
        error: 'Print job is already assigned to a different batch',
      });
    }

    if (!batch.printJobIds.includes(printJob.printJobId)) {
      batch.printJobIds.push(printJob.printJobId);
      batch.totalEstimatedPrintHours = createBatchTotals([printJob]);
      await batch.save();
    }

    printJob.assignedBatchId = batch.batchId;
    await printJob.save();

    return res.json({
      success: true,
      step: 'assign-job',
      batchId: batch.batchId,
      printJobId: printJob.printJobId,
      result: {
        batch: batch.toObject({ getters: true, virtuals: false }),
        printJob: printJob.toObject({ getters: true, virtuals: false }),
      },
    });
  } catch (err) {
    console.error('❌ Failed to assign print job to batch:', err);
    return res.status(500).json({
      success: false,
      step: 'assign-job',
      error: 'Failed to assign print job to batch',
      details: err.message,
    });
  }
});

router.post('/run', async (req, res) => {
  try {
    const testRunId = req.body.testRunId || `TR-${uuidv4()}`;
    const customer = req.body.customer || getDefaultTestCustomer();
    const totalPrice = typeof req.body.totalPrice === 'number' ? req.body.totalPrice : 100;
    const depositAmount = typeof req.body.depositAmount === 'number' ? req.body.depositAmount : Number((totalPrice / 2).toFixed(2));

    const order = new CustomOrder({
      productId: 'TEST-PRODUCT',
      productName: 'HexForge Test Custom Order',
      productType: 'panel',
      size: 'medium',
      panels: 'single',
      panelCount: 1,
      lightType: 'led',
      extras: [],
      notes: 'Auto-generated test custom order',
      customer,
      images: [],
      originalPrice: totalPrice,
      discountedTotal: totalPrice,
      totalPrice,
      depositAmount,
      paymentMethod: 'manual',
      paymentStatus: 'deposit_paid',
      fulfillmentStatus: 'deposit_paid',
      status: 'deposit_paid',
      fulfillmentTimestamps: {
        submittedAt: new Date(),
        awaitingDepositAt: new Date(),
        depositPaidAt: new Date(),
      },
      isTest: true,
      testRunId,
      confirmationSent: false,
      depositConfirmationSent: false,
      adminNotificationSent: false,
    });

    const images = await copySeedImagesForOrder(order.orderId);
    order.images = images;
    await order.save();

    const normalizedOrder = normalizeCustomOrder(order);
    const defaults = getDefaultPrintJobDefaults();
    const printJob = new PrintJob({
      orderId: normalizedOrder.orderId,
      customOrderId: normalizedOrder._id,
      productType: normalizedOrder.productType || 'panel',
      partType: 'custom_order',
      sourceImages: Array.isArray(normalizedOrder.images) ? normalizedOrder.images : [],
      printerProfile: defaults.printerProfile,
      materialProfile: defaults.materialProfile,
      slicerProfile: defaults.slicerProfile,
      nozzle: defaults.nozzle,
      layerHeight: defaults.layerHeight,
      infill: defaults.infill,
      wallCount: defaults.wallCount,
      generationMethod: 'test_pipeline',
      lithophaneType: 'custom',
      targetWidthMm: 100,
      targetHeightMm: 100,
      targetDepthMm: 10,
      panelCount: normalizedOrder.panelCount || 1,
      generationNotes: 'Generated by full test pipeline',
      status: 'stl_ready',
      assignedBatchId: '',
      stlFilename: req.body.stlFilename || `test-${uuidv4()}.stl`,
      stlPath: req.body.stlPath || `/uploads/custom-orders/${order.orderId}/${req.body.stlFilename || `test-${uuidv4()}.stl`}`,
      stlVersion: req.body.stlVersion || 'v1',
      projectFilePath: '',
      gcodePath: '',
      estimatedPrintHours: defaults.estimatedPrintHours,
      notes: 'Full pipeline test print job',
      isTest: true,
      testRunId,
    });

    await printJob.save();

    const batch = new Batch({
      printerProfile: printJob.printerProfile,
      materialProfile: printJob.materialProfile,
      slicerProfile: printJob.slicerProfile,
      nozzle: printJob.nozzle,
      layerHeight: printJob.layerHeight,
      printJobIds: [printJob.printJobId],
      totalEstimatedPrintHours: Number(printJob.estimatedPrintHours || 0),
      status: 'pending',
      projectFilePath: '',
      gcodePath: '',
      notes: 'Full pipeline generated batch',
      isTest: true,
      testRunId,
    });

    await batch.save();
    printJob.assignedBatchId = batch.batchId;
    await printJob.save();

    return res.status(201).json({
      success: true,
      step: 'run',
      testRunId,
      result: {
        order: buildTestOrderPayload(order),
        printJob: printJob.toObject({ getters: true, virtuals: false }),
        batch: batch.toObject({ getters: true, virtuals: false }),
      },
    });
  } catch (err) {
    console.error('❌ Failed to run full test pipeline:', err);
    return res.status(500).json({
      success: false,
      step: 'run',
      error: 'Failed to run full test pipeline',
      details: err.message,
    });
  }
});

router.delete('/cleanup', async (req, res) => {
  try {
    const { testRunId } = req.body;
    if (!testRunId) {
      return res.status(400).json({
        success: false,
        step: 'cleanup',
        error: 'testRunId is required',
      });
    }

    const orders = await CustomOrder.find({ isTest: true, testRunId });
    const printJobs = await PrintJob.find({ isTest: true, testRunId });
    const batches = await Batch.find({ isTest: true, testRunId });

    const orderIds = orders.map((order) => order.orderId);
    const removedOrders = await CustomOrder.deleteMany({ isTest: true, testRunId });
    const removedPrintJobs = await PrintJob.deleteMany({ isTest: true, testRunId });
    const removedBatches = await Batch.deleteMany({ isTest: true, testRunId });

    for (const orderId of orderIds) {
      const targetDir = path.join(customOrdersRoot, orderId);
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
    }

    return res.json({
      success: true,
      step: 'cleanup',
      testRunId,
      result: {
        ordersRemoved: removedOrders.deletedCount,
        printJobsRemoved: removedPrintJobs.deletedCount,
        batchesRemoved: removedBatches.deletedCount,
      },
    });
  } catch (err) {
    console.error('❌ Failed to cleanup test pipeline data:', err);
    return res.status(500).json({
      success: false,
      step: 'cleanup',
      error: 'Failed to cleanup test pipeline data',
      details: err.message,
    });
  }
});

module.exports = router;
