const express = require('express');
const router = express.Router();

/**
 * Minimal embedded admin page
 * URL: /admin  (App URL = https://<your-app>/admin)
 * NOTE: MVP me hum sirf shop query param use kar rahe hain (secure session baad me add karenge)
 */
router.get('/admin', (req, res) => {
  const appUrl = (process.env.SHOPIFY_APP_URL || '').replace(/\/$/, '');
  const shop = (req.query.shop || '').trim();

  res.type('html').send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Preorder Admin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:24px;max-width:900px;margin:0 auto;background:#fafafa}
    h1{margin:0 0 12px}
    .card{background:#fff;border:1px solid #ddd;border-radius:12px;padding:16px;margin-bottom:16px}
    label{display:block;margin:8px 0 4px;font-weight:600}
    input[type="text"],input[type="number"],input[type="date"],select,textarea{
      width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;background:#fff
    }
    .row{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
    .row3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .muted{color:#666;font-size:12px}
    .actions{display:flex;gap:12px;margin-top:12px}
    button{padding:10px 16px;border:none;border-radius:8px;cursor:pointer}
    .primary{background:#2e6de2;color:#fff}
    .warning{background:#ddd}
    .ok{color:#0a7f2e;font-weight:600}
    .err{color:#b00020;font-weight:600}
    .note{background:#f7fbff;border:1px solid #cfe4ff;border-radius:8px;padding:8px 12px;margin-top:8px}
  </style>
</head>
<body>
  <h1>Preorder Settings</h1>
  <div class="card">
    <div class="muted">Store: <b id="storeName">${shop || '(unknown)'}</b></div>
    <div class="row">
      <div>
        <label>Product ID <span class="muted">(required)</span></label>
        <input id="productId" type="text" placeholder="e.g. 1234567890" />
      </div>
      <div>
        <label>Variant ID <span class="muted">(optional)</span></label>
        <input id="variantId" type="text" placeholder="e.g. 9876543210" />
      </div>
    </div>

    <div class="row3" style="margin-top:12px">
      <div>
        <label>Enable Preorder</label>
        <select id="enabled">
          <option value="true">Enabled</option>
          <option value="false" selected>Disabled</option>
        </select>
      </div>
      <div>
        <label>Qty Limit <span class="muted">(blank = no limit)</span></label>
        <input id="limit" type="number" min="0" placeholder="e.g. 50" />
      </div>
      <div>
        <label>Expected Ship Date</label>
        <input id="shipDate" type="date" />
      </div>
    </div>

    <label style="margin-top:12px">Custom Message</label>
    <textarea id="message" rows="3" placeholder="This item is available for pre-order!"></textarea>

    <div class="row" style="margin-top:12px">
      <div>
        <label>Payment Type</label>
        <select id="paymentType">
          <option value="full_upfront">Full upfront</option>
          <option value="deposit">Deposit</option>
          <option value="upon_fulfillment">Upon fulfillment</option>
        </select>
      </div>
      <div>
        <label>Deposit %</label>
        <input id="depositPct" type="number" min="1" max="100" placeholder="30" />
      </div>
    </div>

    <div class="actions">
      <button class="primary" id="loadBtn">Load</button>
      <button class="primary" id="saveBtn">Save</button>
      <button class="warning" id="clearBtn">Clear Form</button>
    </div>
    <div id="status"></div>
    <div class="note">
      Tip: Product/Variant IDs aap Shopify Admin ke product page URL me dekh sakte hain.<br/>
      Storefront script ke liye theme me ye add karein: <code>&lt;script src="${appUrl}/script.js" defer&gt;&lt;/script&gt;</code>
    </div>
  </div>

<script>
  const appUrl = '${appUrl}';
  const shop = '${shop}';

  function el(id){ return document.getElementById(id); }
  function setStatus(msg, ok){
    el('status').innerHTML = '<div class="' + (ok ? 'ok' : 'err') + '">' + msg + '</div>';
  }

  document.getElementById('clearBtn').onclick = () => {
    ['productId','variantId','limit','shipDate','message','depositPct'].forEach(id => el(id).value = '');
    el('enabled').value = 'false';
    el('paymentType').value = 'full_upfront';
    setStatus('Form cleared', true);
  };

  document.getElementById('loadBtn').onclick = async () => {
    const productId = el('productId').value.trim();
    const variantId = el('variantId').value.trim();
    if(!productId){ setStatus('Please enter Product ID', false); return; }

    try{
      const qs = new URLSearchParams({ productId });
      if(variantId) qs.set('variantId', variantId);
      if(shop) qs.set('shop', shop);

      const r = await fetch(appUrl + '/api/preorders?' + qs.toString(), {
        credentials: 'include'
      });
      const j = await r.json();

      if(!j.ok || !j.data){ setStatus('No config found', false); return; }
      const d = j.data;

      el('enabled').value = String(!!d.isPreorderEnabled);
      el('limit').value = d.preorderQuantityLimit ?? '';
      el('shipDate').value = d.expectedShippingDate ? new Date(d.expectedShippingDate).toISOString().slice(0,10) : '';
      el('message').value = d.customPreorderMessage || '';
      el('paymentType').value = d.paymentType || 'full_upfront';
      el('depositPct').value = d.depositPercentage ?? '';

      setStatus('Loaded', true);
    }catch(e){
      console.error(e); setStatus('Load failed', false);
    }
  };

  document.getElementById('saveBtn').onclick = async () => {
    const payload = {
      productId: el('productId').value.trim(),
      variantId: el('variantId').value.trim() || null,
      isPreorderEnabled: el('enabled').value === 'true',
      preorderQuantityLimit: el('limit').value ? Number(el('limit').value) : null,
      expectedShippingDate: el('shipDate').value || null,
      customPreorderMessage: el('message').value || 'This item is available for pre-order!',
      paymentType: el('paymentType').value,
      depositPercentage: el('depositPct').value ? Number(el('depositPct').value) : null
    };
    if(!payload.productId){ setStatus('Please enter Product ID', false); return; }

    try{
      const qs = new URLSearchParams();
      if(shop) qs.set('shop', shop);

      const r = await fetch(appUrl + '/api/preorders?' + qs.toString(), {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(payload),
        credentials:'include'
      });
      const j = await r.json();
      if(!j.ok){ throw new Error('Save failed'); }
      setStatus('Saved ✔', true);
    }catch(e){
      console.error(e); setStatus('Save failed', false);
    }
  };
</script>
</body>
</html>`);
});

module.exports = router;
