
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const Shop = require('../models/Shop');

const router = express.Router();

// Start OAuth
router.get('/', async (req, res) => {
  try {
    const { shop } = req.query;
    if (!shop) return res.status(400).send('Missing shop');

    const scopes = process.env.SHOPIFY_SCOPES;
    const redirectUri = `${process.env.SHOPIFY_APP_URL}/api/auth/callback`;

    const installUrl =
      `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}`+
      `&scope=${encodeURIComponent(scopes)}`+
      `&redirect_uri=${encodeURIComponent(redirectUri)}`;

    res.redirect(installUrl);
  } catch (e) {
    console.error('Auth start error', e);
    res.status(500).send('Auth start failed');
  }
});

// OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { shop, code } = req.query;
    if (!shop || !code) return res.status(400).send('Missing shop or code');

    const tokenResp = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code
      })
    });
    const tokenJson = await tokenResp.json();
    if (!tokenResp.ok || !tokenJson.access_token) {
      console.error('Token exchange failed', tokenJson);
      return res.status(400).send('Token exchange failed');
    }

    await Shop.findOneAndUpdate(
      { shop },
      { shop, accessToken: tokenJson.access_token },
      { upsert: true }
    );

    // ensure ScriptTag
    try {
      await fetch(`https://${shop}/admin/api/2024-04/script_tags.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': tokenJson.access_token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          script_tag: {
            event: 'onload',
            src: `${process.env.SHOPIFY_APP_URL}/script.js`
          }
        })
      });
    } catch (err) {
      console.warn('ScriptTag create failed (non-blocking):', err?.status || err);
    }

    res.json({ success:true, shop, message: 'OAuth callback received' });
  } catch (e) {
    console.error('Auth callback error', e);
    res.status(500).send('Auth callback failed');
  }
});

module.exports = router;
