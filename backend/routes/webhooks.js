const express = require('express');
const crypto = require('crypto');
const PreorderConfig = require('../models/PreorderConfig');
const router = express.Router();

// Middleware to verify webhook authenticity
const verifyWebhook = (req, res, next) => {
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  const body = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  if (hash !== hmac) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

// Order created webhook
router.post('/orders/create', verifyWebhook, async (req, res) => {
  try {
    const order = req.body;
    const shopId = req.get('X-Shopify-Shop-Domain');
    
    console.log('Order created webhook received:', order.id);
    
    // Check if any line items are pre-orders
    const preorderItems = [];
    
    for (const lineItem of order.line_items) {
      const config = await PreorderConfig.findOne({
        shopId,
        productId: lineItem.product_id.toString(),
        variantId: lineItem.variant_id?.toString(),
        isPreorderEnabled: true
      });
      
      if (config) {
        preorderItems.push({
          lineItem,
          config
        });
      }
    }
    
    if (preorderItems.length > 0) {
      // Tag the order as containing pre-orders
      // Note: In a real implementation, you would use the Shopify Admin API
      // to add tags to the order
      console.log(`Order ${order.id} contains ${preorderItems.length} pre-order items`);
      
      // Here you could:
      // 1. Update inventory counts
      // 2. Send notification emails
      // 3. Create fulfillment schedules
      // 4. Update order tags via Admin API
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing order webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Product updated webhook
router.post('/products/update', verifyWebhook, async (req, res) => {
  try {
    const product = req.body;
    const shopId = req.get('X-Shopify-Shop-Domain');
    
    console.log('Product updated webhook received:', product.id);
    
    // Check if this product has preorder configurations
    const configs = await PreorderConfig.find({
      shopId,
      productId: product.id.toString()
    });
    
    if (configs.length > 0) {
      console.log(`Product ${product.id} has ${configs.length} preorder configurations`);
      // Handle product updates that might affect preorders
      // e.g., if product is discontinued, disable preorders
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing product webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

module.exports = router;

