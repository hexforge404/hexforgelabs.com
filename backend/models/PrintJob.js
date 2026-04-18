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
      path: String,
      publicUrl: String,
      relativePath: String,
      originalName: String,
      mimeType: String,
      size: Number,
    }, { _id: false })],
    default: []
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
  status: {
    type: String,
    enum: ['queued_for_generation', 'generating_stl', 'stl_ready', 'queued_for_slicing', 'sliced', 'queued_for_batch', 'assigned_to_printer', 'printing', 'printed', 'failed', 'cancelled'],
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
