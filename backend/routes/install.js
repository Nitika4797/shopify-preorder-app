const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

router.get('/callback', async (req, res) => {
  const { shop, code } = req.query;

  if (!shop || !code) {
    return res.status(400).send('Missing required parameters');
  }

  try {
    // Access token fetch from Shopify
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code
      })
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log(`Access Token for ${shop}:`, accessToken);

    // Save token in your DB for this shop
    await saveTokenToDB(shop, accessToken);

    res.redirect(`/dashboard?shop=${shop}`);
  } catch (error) {
    console.error('Error getting access token:', error);
    res.status(500).send('Auth failed');
  }
});

// Example function to save in MongoDB
async function saveTokenToDB(shop, token) {
  const ShopModel = require('../models/Shop');
  await ShopModel.findOneAndUpdate(
    { shop },
    { accessToken: token },
    { upsert: true }
  );
}

module.exports = router;
