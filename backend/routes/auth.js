const express = require('express');
const router = express.Router();

/**
 * GET /api/auth
 * Start OAuth by redirecting to Shopify's authorize URL.
 * Expects ?shop=your-store.myshopify.com
 */
router.get('/', (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).json({ error: 'Missing shop parameter' });

  const redirectUri = `${process.env.SHOPIFY_APP_URL}/api/auth/callback`;
  const scopes = process.env.SHOPIFY_SCOPES; // e.g. read_products,write_products

  const installUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${process.env.SHOPIFY_API_KEY}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return res.redirect(installUrl);
});

/**
 * Optional: keep your test endpoint
 * GET /api/auth/begin
 */
router.get('/begin', (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).json({ error: 'Missing shop parameter' });
  res.json({ success: true, shop, message: 'OAuth begin endpoint' });
});

/**
 * OAuth callback placeholder
 * GET /api/auth/callback
 */
router.get('/callback', (req, res) => {
  const { shop, code } = req.query;
  if (!shop || !code) return res.status(400).json({ error: 'Missing shop or code parameter' });
  // TODO: exchange code for access token
  res.json({ success: true, shop, message: 'OAuth callback received' });
});

module.exports = router;
