const express = require('express');
const router = express.Router();
const PreorderConfig = require('../models/PreorderConfig');

// --------- helpers ----------
const getShopId = req =>
  (req.query.shop || req.headers['x-shop-domain'] || req.headers['x-shopify-shop-domain'] || '').trim();

const norm = v => (v == null ? null : String(v));

const parseDate = v => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

// --------- Admin: create/update (upsert) ----------
/**
 * POST /api/preorders
 * body: {
 *   productId (required), variantId (optional),
 *   isPreorderEnabled (bool),
 *   preorderQuantityLimit (number|null),
 *   expectedShippingDate (date string|null),
 *   customPreorderMessage (string),
 *   paymentType ("full_upfront" | "deposit" | "upon_fulfillment"),
 *   depositPercentage (1..100)
 * }
 * query: ?shop=your-store.myshopify.com  (for MVP; later use session)
 */
router.post('/', async (req, res) => {
  try {
    const shopId = getShopId(req);
    if (!shopId) return res.status(400).json({ error: 'Missing shop' });

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

    if (!productId) return res.status(400).json({ error: 'Missing productId' });

    const $set = {
      isPreorderEnabled: !!isPreorderEnabled,
      preorderQuantityLimit: preorderQuantityLimit === null ? null : Number(preorderQuantityLimit),
      expectedShippingDate: parseDate(expectedShippingDate),
      customPreorderMessage: customPreorderMessage ?? undefined,
      paymentType: paymentType ?? undefined,
      depositPercentage: depositPercentage == null ? undefined : Number(depositPercentage)
    };

    const doc = await PreorderConfig.findOneAndUpdate(
      { shopId, productId: String(productId), variantId: norm(variantId) },
      { $set },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ ok: true, data: doc });
  } catch (err) {
    console.error('POST /api/preorders error', err);
    res.status(500).json({ error: 'Failed to save preorder config' });
  }
});

// --------- Admin: read ----------
/**
 * GET /api/preorders?productId=...&variantId=...&shop=...
 */
router.get('/', async (req, res) => {
  try {
    const shopId = getShopId(req);
    if (!shopId) return res.status(400).json({ error: 'Missing shop' });

    const { productId, variantId } = req.query;
    if (!productId) return res.status(400).json({ error: 'Missing productId' });

    const doc = await PreorderConfig.findOne({
      shopId,
      productId: String(productId),
      variantId: norm(variantId)
    });

    res.json({ ok: true, data: doc || null });
  } catch (err) {
    console.error('GET /api/preorders error', err);
    res.status(500).json({ error: 'Failed to load preorder config' });
  }
});

// --------- Storefront proxy (for theme or ScriptTag) ----------
/**
 * Shopify App Proxy (or direct for testing):
 *   Shopify → Apps → App setup → App proxy:
 *     Subpath prefix: apps
 *     Subpath: preorder
 *     Proxy URL: https://<your-app-domain>/proxy
 *
 * Shopify storefront will call:
 *   https://{shop}/apps/preorder?productId=..&variantId=..
 * We serve it here (at our Proxy URL):
 */
router.get('/proxy', async (req, res) => {
  try {
    const shopId =
      (req.headers['x-shopify-shop-domain'] || req.query.shop || '').trim(); // allow ?shop for testing
    const { productId, variantId } = req.query;

    if (!shopId || !productId) {
      return res.status(400).json({ error: 'Missing shop or productId' });
    }

    const doc = await PreorderConfig.findOne({
      shopId,
      productId: String(productId),
      variantId: norm(variantId)
    });

    res.json({
      ok: true,
      productId: String(productId),
      variantId: norm(variantId),
      enabled: !!(doc && doc.isPreorderEnabled),
      message: doc?.customPreorderMessage || null,
      shipDate: doc?.expectedShippingDate || null,
      limit: doc?.preorderQuantityLimit ?? null,
      paymentType: doc?.paymentType || 'full_upfront',
      depositPercentage: doc?.depositPercentage ?? null
    });
  } catch (err) {
    console.error('GET /proxy error', err);
    res.status(500).json({ error: 'Proxy failed' });
  }
});

module.exports = router;
