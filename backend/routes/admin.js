const express = require('express');
const fetch = require('node-fetch');
const Shop = require('../models/Shop');               // { shop, accessToken }
const Preorder = require('../models/PreorderConfig'); // tumhara model
const router = express.Router();

async function setInventoryPolicy({ shop, token, variantId, policy }) {
  const r = await fetch(`https://${shop}/admin/api/2024-07/variants/${variantId}.json`, {
    method: 'PUT',
    headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ variant: { id: Number(variantId), inventory_policy: policy } })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j;
}

router.post('/config', async (req, res) => {
  try {
    const { shop, productId, variantId, enabled, message, shipDate, limit } = req.body;

    const shopRow = await Shop.findOne({ shop });
    if (!shopRow?.accessToken) return res.status(401).json({ error: 'No shop token' });

    // save config
    const row = await Preorder.findOneAndUpdate(
      { shop, productId: String(productId), variantId: variantId || null },
      {
        enabled: !!enabled,
        customPreorderMessage: message || 'This item is available for preorder',
        expectedShippingDate: shipDate || null,
        preorderQuantityLimit: limit ?? null
      },
      { new: true, upsert: true }
    );

    // inventory_policy toggle (important!)
    if (variantId) {
      await setInventoryPolicy({
        shop,
        token: shopRow.accessToken,
        variantId,
        policy: enabled ? 'continue' : 'deny'
      });
    }

    res.json({ ok: true, row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

module.exports = router;
