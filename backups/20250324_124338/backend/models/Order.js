const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  items: [
    {
      name: String,
      price: Number,
    }
  ],
  total: Number,
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
