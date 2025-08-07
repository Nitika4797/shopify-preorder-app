const express = require('express');
const PreorderConfig = require('../models/PreorderConfig');
const router = express.Router();

// Get all preorder configurations for a shop
router.get('/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const configs = await PreorderConfig.find({ shopId });
    res.json(configs);
  } catch (error) {
    console.error('Error fetching preorder configs:', error);
    res.status(500).json({ error: 'Failed to fetch preorder configurations' });
  }
});

// Get preorder configuration for a specific product/variant
router.get('/:shopId/:productId/:variantId?', async (req, res) => {
  try {
    const { shopId, productId, variantId } = req.params;
    
    const query = { shopId, productId };
    if (variantId && variantId !== 'undefined') {
      query.variantId = variantId;
    }
    
    const config = await PreorderConfig.findOne(query);
    res.json(config || { isPreorderEnabled: false });
  } catch (error) {
    console.error('Error fetching preorder config:', error);
    res.status(500).json({ error: 'Failed to fetch preorder configuration' });
  }
});

// Create or update preorder configuration
router.post('/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const {
      productId,
      variantId,
      isPreorderEnabled,
      preorderQuantityLimit,
      expectedShippingDate,
      customPreorderMessage,
      paymentType,
      depositPercentage
    } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const query = { shopId, productId };
    if (variantId) {
      query.variantId = variantId;
    }

    const updateData = {
      shopId,
      productId,
      variantId,
      isPreorderEnabled,
      preorderQuantityLimit,
      expectedShippingDate,
      customPreorderMessage,
      paymentType,
      depositPercentage
    };

    const config = await PreorderConfig.findOneAndUpdate(
      query,
      updateData,
      { upsert: true, new: true }
    );

    res.json(config);
  } catch (error) {
    console.error('Error saving preorder config:', error);
    res.status(500).json({ error: 'Failed to save preorder configuration' });
  }
});

// Delete preorder configuration
router.delete('/:shopId/:productId/:variantId?', async (req, res) => {
  try {
    const { shopId, productId, variantId } = req.params;
    
    const query = { shopId, productId };
    if (variantId && variantId !== 'undefined') {
      query.variantId = variantId;
    }
    
    await PreorderConfig.findOneAndDelete(query);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting preorder config:', error);
    res.status(500).json({ error: 'Failed to delete preorder configuration' });
  }
});

module.exports = router;

