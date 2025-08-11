// backend/routes/auth.js
// GET /api/auth/debug  -> shows exactly what we're sending
router.get('/debug', (req, res) => {
  res.json({
    shop: req.query.shop,
    SHOPIFY_API_KEY: (process.env.SHOPIFY_API_KEY || '').trim(),
    SHOPIFY_API_KEY_tail: (process.env.SHOPIFY_API_KEY || '').trim().slice(-6),
    SHOPIFY_API_SECRET_tail: (process.env.SHOPIFY_API_SECRET || '').trim().slice(-6),
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
    SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES
  });
});

