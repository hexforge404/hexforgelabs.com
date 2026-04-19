const fs = require('fs/promises');
const fsSync = require('fs');
const { constants: fsConstants } = require('fs');
const path = require('path');
const { resolveCustomOrderImageDiskPath } = require('./customOrderUtils');

const STL_SHARED_ROOT = process.env.STL_SHARED_ROOT || '/shared/litho-handoff';

const getSharedJobRoot = (printJobId) => path.join(STL_SHARED_ROOT, printJobId);
const getSharedSourceDir = (printJobId) => path.join(getSharedJobRoot(printJobId), 'source');
const getSharedStlDir = (printJobId) => path.join(getSharedJobRoot(printJobId), 'stl');

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'item';

const slugifyCustomerName = (name) => slugify(name || 'customer');
const slugifyProductType = (type) => slugify(type || 'product');

const ensureDir = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
};

const ensureSharedJobFolders = async (printJobId) => {
  const root = getSharedJobRoot(printJobId);
  const sourceDir = getSharedSourceDir(printJobId);
  const stlDir = getSharedStlDir(printJobId);
  await ensureDir(root);
  await ensureDir(sourceDir);
  await ensureDir(stlDir);
  return {
    root,
    sourceDir,
    stlDir,
  };
};

const buildSourceImageFilename = ({ customerSlug, productSlug, shortJobId, panel = 1, role, ext }) => {
  const safeExt = (ext || '').replace(/[^a-z0-9]+/gi, '').toLowerCase() || 'jpg';
  if (role === 'nightlight') {
    return `${customerSlug}-${productSlug}-${shortJobId}-nightlight-v1.${safeExt}`;
  }
  const panelIndex = Number.isInteger(panel) && panel > 1 ? panel : 1;
  if (panelIndex === 1) {
    return `${customerSlug}-${productSlug}-${shortJobId}-main-v1.${safeExt}`;
  }
  return `${customerSlug}-${productSlug}-${shortJobId}-panel-${panelIndex}-v1.${safeExt}`;
};

const getShortJobId = (printJobId) => {
  const trimmed = String(printJobId || '').replace(/^PJ-/i, '');
  return trimmed.slice(0, 6) || String(printJobId || '').slice(-6);
};

const copyOrExportSourceImagesToSharedFolder = async ({ printJob, customOrder }) => {
  if (!printJob || !printJob.printJobId || !customOrder) {
    return { sharedSourceFolder: '', sourceImages: [] };
  }

  const { sourceDir } = await ensureSharedJobFolders(printJob.printJobId);
  const customerSlug = slugifyCustomerName(customOrder.customer?.name || customOrder.orderId || 'customer');
  const productSlug = slugifyProductType(customOrder.productType || customOrder.productName || 'lamp');
  const shortJobId = getShortJobId(printJob.printJobId);

  const images = Array.isArray(customOrder.images) ? [...customOrder.images] : [];
  if (customOrder.nightlightAddon?.imageSource === 'separate_upload' && customOrder.nightlightAddon?.separateImage?.path) {
    images.push({
      ...customOrder.nightlightAddon.separateImage,
      panel: 0,
      panelLabel: 'Nightlight',
      originalName: customOrder.nightlightAddon.separateImage.originalName || 'nightlight-image',
    });
  }

  const exported = [];
  console.info('[SOURCE PIPELINE] total image records received by helper', {
    printJobId: printJob.printJobId,
    totalImages: images.length,
  });

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const rawPath = String(image.relativePath || image.publicUrl || image.path || '').trim().replace(/\\/g, '/');

    let sourcePath = resolveCustomOrderImageDiskPath(rawPath) || '';
    if (!sourcePath && rawPath) {
      const normalizedRawPath = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
      if (normalizedRawPath.startsWith('uploads/')) {
        sourcePath = path.resolve(process.cwd(), normalizedRawPath);
      }
    }
    if (sourcePath && !path.isAbsolute(sourcePath)) {
      sourcePath = path.resolve(sourcePath);
    }

    const sourceExistsFs = sourcePath ? fsSync.existsSync(sourcePath) : false;
    console.log('[SOURCE PIPELINE] resolved absolute path:', sourcePath);
    console.info('[SOURCE PIPELINE] processing image', {
      printJobId: printJob.printJobId,
      index,
      panel: image.panel,
      originalName: image.originalName,
      rawPath,
      resolvedSourceDiskPath: sourcePath,
      sourceExistsFs,
    });

    if (!rawPath) {
      console.warn('[SOURCE PIPELINE] skipping image with missing path', {
        printJobId: printJob.printJobId,
        index,
        panel: image.panel,
        originalName: image.originalName,
      });
      continue;
    }

    if (!sourcePath) {
      console.warn('[SOURCE PIPELINE] invalid source path', {
        printJobId: printJob.printJobId,
        index,
        panel: image.panel,
        rawPath,
        originalName: image.originalName,
      });
      continue;
    }

    let sourceStats;
    let sourceExists = false;
    try {
      sourceStats = await fs.stat(sourcePath);
      sourceExists = sourceStats.isFile();
      if (!sourceExists) {
        throw new Error('source path is not a file');
      }
    } catch (err) {
      console.warn('[SOURCE PIPELINE] source file missing or unreadable', {
        printJobId: printJob.printJobId,
        index,
        panel: image.panel,
        sourcePath,
        sourceExists,
        error: err.message || err,
      });
      continue;
    }

    const ext = path.extname(image.originalName || sourcePath || '').toLowerCase().replace(/^\./, '') || 'jpg';
    const panelValue = Number.isInteger(image.panel) ? image.panel : index + 1;
    const filename = buildSourceImageFilename({
      customerSlug,
      productSlug,
      shortJobId,
      panel: panelValue,
      role: image.panel === 0 ? 'nightlight' : 'lamp',
      ext,
    });
    const destinationPath = path.join(sourceDir, filename);

    console.info('[SOURCE PIPELINE] destination plan', {
      printJobId: printJob.printJobId,
      index,
      panel: panelValue,
      renamedFilename: filename,
      destinationPath,
    });

    console.info('[SOURCE PIPELINE] exporting image', {
      printJobId: printJob.printJobId,
      index,
      panel: panelValue,
      sourcePath,
      destinationPath,
      originalName: image.originalName,
      renamedFilename: filename,
    });

    let copyResult = 'copied';
    let copyError = null;
    try {
      await fs.copyFile(sourcePath, destinationPath, fsConstants.COPYFILE_EXCL);
    } catch (copyErr) {
      if (copyErr.code === 'EEXIST') {
        console.info('[SOURCE PIPELINE] destination already exists, preserving existing file', {
          printJobId: printJob.printJobId,
          index,
          panel: panelValue,
          destinationPath,
          sourcePath,
        });
        copyResult = 'EEXIST';
      } else {
        copyResult = 'failed';
        copyError = copyErr.message || String(copyErr);
        console.warn('[SOURCE PIPELINE] failed to copy image', {
          printJobId: printJob.printJobId,
          index,
          panel: panelValue,
          sourcePath,
          destinationPath,
          error: copyError,
        });
        continue;
      }
    }

    console.info('[SOURCE PIPELINE] copy result', {
      printJobId: printJob.printJobId,
      index,
      panel: panelValue,
      originalName: image.originalName,
      sourcePath,
      destinationPath,
      copyResult,
      error: copyError,
    });

    exported.push({
      originalName: image.originalName || path.basename(sourcePath),
      renamedFilename: filename,
      destinationPath,
      sharedSourceFolder: sourceDir,
      sourcePath,
      mimeType: image.mimeType || undefined,
      size: sourceStats.size,
      uploadedAt: image.uploadedAt || new Date(),
      panel: panelValue,
      panelLabel: image.panelLabel || (panelValue === 0 ? 'Nightlight' : `Panel ${panelValue}`),
    });

    console.info('[SOURCE PIPELINE] export complete', {
      printJobId: printJob.printJobId,
      destinationPath,
      originalName: image.originalName,
    });
  }

  console.info('[SOURCE PIPELINE] export summary', {
    printJobId: printJob.printJobId,
    totalImageRecords: images.length,
    exportedImageCount: exported.length,
    sourceDir,
  });

  return {
    sharedSourceFolder: sourceDir,
    sourceImages: exported,
  };
};

module.exports = {
  STL_SHARED_ROOT,
  slugifyCustomerName,
  slugifyProductType,
  ensureSharedJobFolders,
  buildSourceImageFilename,
  copyOrExportSourceImagesToSharedFolder,
};
