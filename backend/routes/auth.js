// backend/routes/auth.js
router.get('/', (req, res) => {
  try {
    const { shop } = req.query;
    if (!shop) return res.status(400).json({ error: 'Missing shop parameter' });

    const appUrl = process.env.SHOPIFY_APP_URL;
    const key = process.env.SHOPIFY_API_KEY;
    const scopes = process.env.SHOPIFY_SCOPES;

    // Log what we have (will show in Render logs)
    console.log('AUTH HIT', { shop, appUrl, keyPresent: !!key, scopes });

    const redirectUri = `${appUrl}/api/auth/callback`;
    const installUrl =
      `https://${shop}/admin/oauth/authorize` +
      `?client_id=${key}` +
      `&scope=${encodeURIComponent(scopes || '')}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`;

    // Instead of redirecting, just show what we would redirect to
    return res.json({ ok: true, installUrl });
  } catch (e) {
    console.error('AUTH ERROR', e);
    res.status(500).json({ error: 'auth route crashed', detail: String(e) });
  }
});
