const mongoose = require('mongoose');

const runtimeSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  value: {
    type: String,
    required: true,
    trim: true,
  },
  updatedBy: {
    type: String,
    trim: true,
    default: 'system',
  },
  enabledAt: {
    type: Date,
    default: null,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('RuntimeSetting', runtimeSettingSchema);