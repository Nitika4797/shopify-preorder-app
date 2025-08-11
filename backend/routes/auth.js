// backend/routes/auth.js
const express = require('express');
const router = express.Router();

/**
 * Debug: see what envs the server is using
 * GET /api/auth/debug?shop=nitika-app-store.myshopify.com
 */
router.get('/debug', (req, res) => {
  res.json({
    shop: req.query.shop,
    SHOPIFY_API_KEY_tail: (process.env.SHOPIFY_API_KEY || '').trim().slice(-6),
    SHOPIFY_API_SECRET_tail: (process.env.SHOPIFY_API_SECRET || '').trim().slice(-6),
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
    SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES,
  });
});

/**
 * Begin OAuth
 * GET /api/auth?shop=your-store.myshopify.com
 */
router.get('/', (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).send('Missing shop');

  const redirectUri = `${process.env.SHOPIFY_APP_URL}/api/auth/callback`;
  const installUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${encodeURIComponent(process.env.SHOPIFY_API_KEY)}` + // MUST be Client ID
    `&scope=${encodeURIComponent(process.env.SHOPIFY_SCOPES || '')}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return res.redirect(installUrl);
});

/**
 * OAuth callback placeholder
 * GET /api/auth/callback
 */
router.get('/callback', (req, res) => {
  const { shop, code } = req.query;
  if (!shop || !code) return res.status(400).json({ error: 'Missing shop or code' });
  // TODO: exchange code for access token
  res.json({ success: true, shop, message: 'OAuth callback received' });
});

module.exports = router;
