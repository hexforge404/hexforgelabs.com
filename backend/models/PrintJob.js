const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const printJobSchema = new mongoose.Schema({
  printJobId: {
    type: String,
    default: () => `PJ-${uuidv4()}`,
    unique: true,
    index: true
  },
  orderId: {
    type: String,
    required: true,
    index: true
  },
  customOrderId: {
    type: String,
    trim: true,
    default: ''
  },
  productType: {
    type: String,
    trim: true,
    default: ''
  },
  partType: {
    type: String,
    trim: true,
    default: ''
  },
  sourceImages: {
    type: [new mongoose.Schema({
      originalName: String,
      renamedFilename: String,
      destinationPath: String,
      sharedSourceFolder: String,
      sourcePath: String,
      mimeType: String,
      size: Number,
      uploadedAt: { type: Date, default: Date.now },
      panel: Number,
      panelLabel: String,
    }, { _id: false })],
    default: []
  },
  sharedSourceFolder: {
    type: String,
    trim: true,
    default: ''
  },
  printerProfile: {
    type: String,
    trim: true,
    default: ''
  },
  materialProfile: {
    type: String,
    trim: true,
    default: ''
  },
  slicerProfile: {
    type: String,
    trim: true,
    default: ''
  },
  nozzle: {
    type: String,
    trim: true,
    default: ''
  },
  layerHeight: {
    type: Number,
    default: 0.2
  },
  infill: {
    type: Number,
    default: 20
  },
  wallCount: {
    type: Number,
    default: 2
  },
  generationMethod: {
    type: String,
    trim: true,
    default: ''
  },
  lithophaneType: {
    type: String,
    trim: true,
    default: ''
  },
  targetWidthMm: {
    type: Number,
    default: 0
  },
  targetHeightMm: {
    type: Number,
    default: 0
  },
  targetDepthMm: {
    type: Number,
    default: 0
  },
  panelCount: {
    type: Number,
    default: 1
  },
  generationNotes: {
    type: String,
    trim: true,
    default: ''
  },
  stlFilename: {
    type: String,
    trim: true,
    default: ''
  },
  stlVersion: {
    type: String,
    trim: true,
    default: ''
  },
  stlHandoff: {
    type: {
      status: {
        type: String,
        trim: true,
        default: 'missing',
        enum: ['missing', 'registered', 'copied', 'verified', 'failed'],
      },
      source: {
        type: {
          sourceType: { type: String, trim: true, default: '' },
          originalPath: { type: String, trim: true, default: '' },
          originalFilename: { type: String, trim: true, default: '' },
          version: { type: String, trim: true, default: '' },
          sizeBytes: { type: Number, default: 0 },
          checksumSha256: { type: String, trim: true, default: '' },
          registeredAt: { type: Date, default: null },
          registeredBy: { type: String, trim: true, default: '' },
        },
        default: {},
      },
      managedCopy: {
        type: {
          copied: { type: Boolean, default: false },
          copiedAt: { type: Date, default: null },
          copiedBy: { type: String, trim: true, default: '' },
          productionPath: { type: String, trim: true, default: '' },
          productionFilename: { type: String, trim: true, default: '' },
          checksumSha256: { type: String, trim: true, default: '' },
          sizeBytes: { type: Number, default: 0 },
        },
        default: {},
      },
      verification: {
        type: {
          fileExistsAtRegistration: { type: Boolean, default: false },
          fileExistsAfterCopy: { type: Boolean, default: false },
          extensionValid: { type: Boolean, default: false },
          checksumMatch: { type: Boolean, default: false },
          lastVerifiedAt: { type: Date, default: null },
          verificationMessage: { type: String, trim: true, default: '' },
        },
        default: {},
      },
    },
    default: {
      status: 'missing',
      source: {},
      managedCopy: {},
      verification: {},
    },
  },
  status: {
    type: String,
    enum: ['queued_for_generation', 'generating_stl', 'stl_ready', 'queued_for_slicing', 'sliced', 'queued_for_batch', 'assigned_to_printer', 'printing', 'printed', 'ready_to_ship', 'shipped', 'completed', 'qa_review', 'qa_failed', 'failed', 'print_failed', 'cancelled'],
    default: 'queued_for_generation',
    index: true
  },
  assignedBatchId: {
    type: String,
    trim: true,
    default: ''
  },
  stlPath: {
    type: String,
    trim: true,
    default: ''
  },
  projectFilePath: {
    type: String,
    trim: true,
    default: ''
  },
  gcodePath: {
    type: String,
    trim: true,
    default: ''
  },
  lifecycleEvents: {
    type: [{
      status: { type: String, trim: true, default: '' },
      eventStatus: { type: String, trim: true, default: '' },
      label: { type: String, trim: true, default: '' },
      at: { type: Date, default: Date.now },
      actorType: { type: String, trim: true, default: 'system' },
      actorId: { type: String, trim: true, default: '' },
      actorName: { type: String, trim: true, default: '' },
      source: { type: String, trim: true, default: '' },
      note: { type: String, trim: true, default: '' },
      metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    }],
    default: []
  },
  estimatedPrintHours: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  isTest: {
    type: Boolean,
    default: false,
    index: true
  },
  testRunId: {
    type: String,
    trim: true,
    default: '',
    index: true
  },
  createdBy: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

printJobSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PrintJob', printJobSchema);
