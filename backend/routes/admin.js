
const express = require('express');
const PreorderConfig = require('../models/PreorderConfig');
const Shop = require('../models/Shop');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const router = express.Router();

// Set preorder config
router.post('/preorders', async (req, res) => {
  try {
    const { shop } = req.query;
    if (!shop) return res.status(400).json({ ok:false, error:'Missing shop' });

    const body = req.body || {};
    if (!body.productId) return res.status(400).json({ ok:false, error:'Missing productId' });

    const doc = await PreorderConfig.findOneAndUpdate(
      { shop, productId: body.productId, variantId: body.variantId || null },
      {
        shop,
        productId: body.productId,
        variantId: body.variantId || null,
        enabled: !!body.enabled,
        message: body.message || 'This item is available for preorder',
        shipDate: body.shipDate || null,
        limit: body.limit ?? null,
        paymentType: body.paymentType || 'full_upfront',
        depositPercentage: body.depositPercentage || 20
      },
      { upsert: true, new: true }
    );

    // if enabled, set policy continue
    if (doc.enabled) {
      const shp = await Shop.findOne({ shop });
      if (shp?.accessToken && body.variantId) {
        try {
          await fetch(`https://${shop}/admin/api/2024-04/variants/${body.variantId}.json`, {
            method: 'PUT',
            headers: {
              'X-Shopify-Access-Token': shp.accessToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ variant: { id: body.variantId, inventory_policy: 'continue' } })
          });
        } catch (e) {
          console.warn('Failed to set inventory_policy continue (non-blocking)', e);
        }
      }
    }

    res.json({ ok:true, data: doc });
  } catch (e) {
    console.error('POST /preorders error', e);
    res.status(500).json({ ok:false, error:'Server error' });
  }
});

// Admin UI (very small page)
router.get('/admin', async (req, res) => {
  const { shop } = req.query;
  res.setHeader('Content-Type','text/html');
  res.send(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Preorder Admin</title>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;max-width:760px;margin:40px auto;padding:0 16px}
    label{display:block;margin:12px 0 6px}
    input,select,button{padding:10px;border:1px solid #ddd;border-radius:8px;width:100%}
    button{background:#111;color:#fff;margin-top:16px}
    .row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .card{border:1px solid #eee;padding:16px;border-radius:12px}
  </style>
</head>
<body>
  <h1>Preorder Admin</h1>
  <p>Shop: <b>${shop || ''}</b></p>

  <div class="card">
    <div class="row">
      <div>
        <label>Product ID</label>
        <input id="productId" placeholder="e.g. 1234567890"/>
      </div>
      <div>
        <label>Variant ID (optional)</label>
        <input id="variantId" placeholder="e.g. 1234567890"/>
      </div>
    </div>
    <div class="row">
      <div>
        <label>Enable</label>
        <select id="enabled"><option value="true">true</option><option value="false">false</option></select>
      </div>
      <div>
        <label>Limit (optional)</label>
        <input id="limit" type="number" placeholder="e.g. 100"/>
      </div>
    </div>
    <label>Message</label>
    <input id="message" placeholder="This item is available for preorder"/>
    <label>Ship Date (YYYY-MM-DD)</label>
    <input id="shipDate" placeholder="2025-12-31"/>
    <div class="row">
      <div>
        <label>Payment Type</label>
        <select id="paymentType">
          <option value="full_upfront">full_upfront</option>
          <option value="deposit">deposit</option>
          <option value="upon_fulfillment">upon_fulfillment</option>
        </select>
      </div>
      <div>
        <label>Deposit %</label>
        <input id="depositPercentage" type="number" value="20"/>
      </div>
    </div>
    <button onclick="save()">Save</button>
    <div id="out" style="margin-top:12px"></div>
  </div>

<script>
async function save(){
  const qs = new URLSearchParams(window.location.search);
  const shop = qs.get('shop');
  const payload = {
    productId: document.getElementById('productId').value.trim(),
    variantId: document.getElementById('variantId').value.trim() || null,
    enabled: document.getElementById('enabled').value === 'true',
    limit: document.getElementById('limit').value ? Number(document.getElementById('limit').value) : null,
    message: document.getElementById('message').value.trim() || 'This item is available for preorder',
    shipDate: document.getElementById('shipDate').value ? new Date(document.getElementById('shipDate').value).toISOString() : null,
    paymentType: document.getElementById('paymentType').value,
    depositPercentage: Number(document.getElementById('depositPercentage').value || 20)
  };
  const res = await fetch('/api/preorders?shop='+encodeURIComponent(shop), {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  const j = await res.json();
  document.getElementById('out').innerText = JSON.stringify(j,null,2);
}
</script>
</body></html>
  `);
});

module.exports = router;
