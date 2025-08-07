const mongoose = require('mongoose');

const preorderConfigSchema = new mongoose.Schema({
  shopId: {
    type: String,
    required: true,
    index: true
  },
  productId: {
    type: String,
    required: true,
    index: true
  },
  variantId: {
    type: String,
    required: false,
    index: true
  },
  isPreorderEnabled: {
    type: Boolean,
    default: false
  },
  preorderQuantityLimit: {
    type: Number,
    default: null // null means no limit
  },
  expectedShippingDate: {
    type: Date,
    default: null
  },
  customPreorderMessage: {
    type: String,
    default: 'This item is available for pre-order!'
  },
  paymentType: {
    type: String,
    enum: ['full_upfront', 'deposit', 'upon_fulfillment'],
    default: 'full_upfront'
  },
  depositPercentage: {
    type: Number,
    default: 20,
    min: 1,
    max: 100
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
preorderConfigSchema.index({ shopId: 1, productId: 1, variantId: 1 }, { unique: true });

module.exports = mongoose.model('PreorderConfig', preorderConfigSchema);

