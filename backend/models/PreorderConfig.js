
const mongoose = require('mongoose');

const preorderConfigSchema = new mongoose.Schema({
  shop: { type: String, index: true, required: true },
  productId: { type: String, index: true, required: true },
  variantId: { type: String, index: true, default: null },
  enabled: { type: Boolean, default: false },
  message: { type: String, default: 'This item is available for preorder' },
  shipDate: { type: Date, default: null },
  limit: { type: Number, default: null }, // null => no limit
  paymentType: { type: String, enum: ['full_upfront','deposit','upon_fulfillment'], default: 'full_upfront' },
  depositPercentage: { type: Number, min: 1, max: 100, default: 20 },
}, { timestamps: true });

preorderConfigSchema.index({ shop:1, productId:1, variantId:1 }, { unique: true });

module.exports = mongoose.model('PreorderConfig', preorderConfigSchema);
