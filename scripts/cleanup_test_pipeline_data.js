#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const CustomOrder = require('../backend/models/CustomOrder');
const PrintJob = require('../backend/models/PrintJob');
const Batch = require('../backend/models/Batch');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URI_LOCAL || process.env.MONGO_URL;
if (!MONGO_URI) {
  console.error('Missing MONGO_URI in environment. Set MONGO_URI in .env before running this script.');
  process.exit(1);
}

const args = process.argv.slice(2);
const options = {
  dryRun: false,
  deleteExisting: false,
  deleteSuspected: false,
  confirm: false,
  testRunId: null,
};

for (const arg of args) {
  if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--delete-existing') {
    options.deleteExisting = true;
  } else if (arg === '--delete-suspected') {
    options.deleteSuspected = true;
  } else if (arg === '--confirm') {
    options.confirm = true;
  } else if (arg.startsWith('--testRunId=')) {
    options.testRunId = arg.split('=')[1];
  }
}

if (!options.deleteExisting && !options.deleteSuspected) {
  options.dryRun = true;
}

const uploadsRoot = path.join(__dirname, '..', 'uploads');
const customOrdersRoot = path.join(uploadsRoot, 'custom-orders');

const orderImageDir = (orderId) => path.join(customOrdersRoot, orderId);

const log = (message) => console.log(message);

const normalizeFilter = (filter) => ({ ...filter, isTest: { $ne: true } });

async function removeOrderAssets(orderIds) {
  for (const orderId of orderIds) {
    const targetDir = orderImageDir(orderId);
    if (fs.existsSync(targetDir)) {
      if (options.dryRun) {
        log(`Would remove directory: ${targetDir}`);
      } else {
        fs.rmSync(targetDir, { recursive: true, force: true });
        log(`Removed directory: ${targetDir}`);
      }
    }
  }
}

async function main() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const confirmedFilter = { isTest: true, ...(options.testRunId ? { testRunId: options.testRunId } : {}) };
  const suspiciousOrderFilter = {
    isTest: { $ne: true },
    $or: [
      { 'customer.email': { $regex: /test\+pipeline/i } },
      { productName: { $regex: /hexforge.*test custom order/i } },
      { notes: { $regex: /auto-generated test custom order|test pipeline/i } },
    ],
  };
  const suspiciousPrintJobFilter = {
    isTest: { $ne: true },
    $or: [
      { generationMethod: 'test_pipeline' },
      { generationNotes: { $regex: /test pipeline/i } },
      { notes: { $regex: /test pipeline/i } },
    ],
  };
  const suspiciousBatchFilter = {
    isTest: { $ne: true },
    $or: [
      { notes: { $regex: /test batch|test pipeline/i } },
    ],
  };

  log('=== Test Pipeline Cleanup Review ===');
  log(`MONGO_URI: ${MONGO_URI.replace(/(mongodb:\/\/[^@]+@)/, 'mongodb://*****@')}`);
  if (options.testRunId) {
    log(`Targeting testRunId: ${options.testRunId}`);
  }
  log(`Mode: ${options.dryRun ? 'dry-run' : 'execute'}${options.deleteExisting ? ', delete-existing' : ''}${options.deleteSuspected ? ', delete-suspected' : ''}`);
  log('');

  const confirmedOrders = await CustomOrder.find(confirmedFilter).lean();
  const confirmedPrintJobs = await PrintJob.find(confirmedFilter).lean();
  const confirmedBatches = await Batch.find(confirmedFilter).lean();

  log(`Confirmed test orders: ${confirmedOrders.length}`);
  log(`Confirmed test print jobs: ${confirmedPrintJobs.length}`);
  log(`Confirmed test batches: ${confirmedBatches.length}`);

  const suspectedOrders = await CustomOrder.find(suspiciousOrderFilter).lean();
  const suspectedPrintJobs = await PrintJob.find(suspiciousPrintJobFilter).lean();
  const suspectedBatches = await Batch.find(suspiciousBatchFilter).lean();

  log(`Suspected legacy test orders: ${suspectedOrders.length}`);
  log(`Suspected legacy test print jobs: ${suspectedPrintJobs.length}`);
  log(`Suspected legacy test batches: ${suspectedBatches.length}`);

  if (confirmedOrders.length) {
    log('\nConfirmed test order IDs:');
    confirmedOrders.slice(0, 20).forEach((order) => log(`  - ${order.orderId} [${order.testRunId || 'no-run-id'}]`));
  }
  if (confirmedPrintJobs.length) {
    log('\nConfirmed print job IDs:');
    confirmedPrintJobs.slice(0, 20).forEach((job) => log(`  - ${job.printJobId} [${job.testRunId || 'no-run-id'}]`));
  }
  if (confirmedBatches.length) {
    log('\nConfirmed batch IDs:');
    confirmedBatches.slice(0, 20).forEach((batch) => log(`  - ${batch.batchId} [${batch.testRunId || 'no-run-id'}]`));
  }

  if (suspectedOrders.length) {
    log('\nSuspected legacy test order IDs:');
    suspectedOrders.slice(0, 20).forEach((order) => log(`  - ${order.orderId} email=${order.customer?.email || 'unknown'} notes=${order.notes || 'none'}`));
  }
  if (suspectedPrintJobs.length) {
    log('\nSuspected legacy test print job IDs:');
    suspectedPrintJobs.slice(0, 20).forEach((job) => log(`  - ${job.printJobId} generationMethod=${job.generationMethod || 'none'} notes=${job.notes || job.generationNotes || 'none'}`));
  }
  if (suspectedBatches.length) {
    log('\nSuspected legacy test batch IDs:');
    suspectedBatches.slice(0, 20).forEach((batch) => log(`  - ${batch.batchId} notes=${batch.notes || 'none'}`));
  }

  if (options.dryRun) {
    log('\nDry run complete. No records were deleted.');
    await mongoose.disconnect();
    return;
  }

  if (!options.confirm) {
    log('\nNo --confirm flag provided. Aborting before deleting anything.');
    await mongoose.disconnect();
    return;
  }

  if (options.deleteExisting) {
    log('\nDeleting confirmed test artifacts...');
    const deletedOrders = await CustomOrder.deleteMany(confirmedFilter);
    const deletedPrintJobs = await PrintJob.deleteMany(confirmedFilter);
    const deletedBatches = await Batch.deleteMany(confirmedFilter);
    await removeOrderAssets(confirmedOrders.map((order) => order.orderId));
    log(`Deleted orders: ${deletedOrders.deletedCount}`);
    log(`Deleted print jobs: ${deletedPrintJobs.deletedCount}`);
    log(`Deleted batches: ${deletedBatches.deletedCount}`);
  }

  if (options.deleteSuspected) {
    log('\nDeleting suspected legacy test artifacts...');
    const deletedOrders = await CustomOrder.deleteMany(suspiciousOrderFilter);
    const deletedPrintJobs = await PrintJob.deleteMany(suspiciousPrintJobFilter);
    const deletedBatches = await Batch.deleteMany(suspiciousBatchFilter);
    await removeOrderAssets(suspectedOrders.map((order) => order.orderId));
    log(`Deleted suspected orders: ${deletedOrders.deletedCount}`);
    log(`Deleted suspected print jobs: ${deletedPrintJobs.deletedCount}`);
    log(`Deleted suspected batches: ${deletedBatches.deletedCount}`);
  }

  await mongoose.disconnect();
  log('\nCompleted cleanup script.');
}

main().catch((err) => {
  console.error('Cleanup script failed:', err);
  process.exit(1);
});
