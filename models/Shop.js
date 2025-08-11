
const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  shop: { type: String, unique: true, index: true },
  accessToken: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Shop', shopSchema);
