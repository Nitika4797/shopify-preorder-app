const express = require('express');
const fetch = require('node-fetch');
const ShopModel = require('../models/Shop');
const router = express.Router();

// Enable Preorder API endpoint
router.post('/enable', async (req, res) => {
  try {
    const { shop, productId } = req.body;

    if (!shop || !productId) {
      return res.status(400).json({ error: 'shop and productId are required' });
    }

    // Get saved token from DB
    const shopData = await ShopModel.findOne({ shop });
    if (!shopData || !shopData.accessToken) {
      return res.status(401).json({ error: 'No access token found for this shop' });
    }
    const accessToken = shopData.accessToken;

    // Update product in Shopify
    const response = await fetch(`https://${shop}/admin/api/2024-04/products/${productId}.json`, {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product: {
          id: productId,
          tags: 'preorder'
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error enabling preorder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
