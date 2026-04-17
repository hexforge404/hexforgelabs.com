const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const batchSchema = new mongoose.Schema({
  batchId: {
    type: String,
    default: () => `BATCH-${uuidv4()}`,
    unique: true,
    index: true
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
  printJobIds: {
    type: [String],
    default: []
  },
  totalEstimatedPrintHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: [
      'pending',
      'queued_for_batch',
      'assigned_to_printer',
      'ready_for_print',
      'printing',
      'printed',
      'completed',
      'failed',
      'cancelled'
    ],
    default: 'pending',
    index: true
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
  notes: {
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

batchSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Batch', batchSchema);
