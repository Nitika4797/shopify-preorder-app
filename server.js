
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Config ---
const PORT = process.env.PORT || 10000;
const SHOP = process.env.SHOP; // e.g. your-store.myshopify.com
const ADMIN_TOKEN = process.env.ADMIN_API_ACCESS_TOKEN; // Admin API access token (Custom app)
const API_SECRET = process.env.API_SECRET; // App API secret - for webhook verification
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

const BTN_TEXT = process.env.PREORDER_BTN_TEXT || 'Preorder Now';
const PREORDER_MESSAGE = process.env.PREORDER_MESSAGE || 'This item is on preorder and will ship as soon as it restocks.';

if (!SHOP || !ADMIN_TOKEN || !API_SECRET) {
  console.warn('[WARN] Missing required env vars. Check .env.example');
}

// --- Middleware ---
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(cors({
  origin: (origin, cb) => cb(null, true), // we're serving only public JS & admin UI
  credentials: false
}));

// Health
app.get('/health', (_, res) => res.json({ ok: true, shop: SHOP }));

// ---- Shopify Admin API helpers (REST) ----
const API_VERSION = '2024-07'; // adjust when needed

async function shopifyREST(pathname, { method = 'GET', body } = {}) {
  const url = `https://${SHOP}/admin/api/${API_VERSION}${pathname}`;
  const headers = {
    'X-Shopify-Access-Token': ADMIN_TOKEN,
    'Content-Type': 'application/json'
  };
  const resp = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`[Shopify REST ${method} ${pathname}] ${resp.status} ${resp.statusText} – ${text}`);
  }
  return resp.json();
}

// Convenience: find variants by inventory_item_id (REST supports this)
async function getVariantsByInventoryItemId(inventoryItemId) {
  const data = await shopifyREST(`/variants.json?inventory_item_ids=${inventoryItemId}`);
  return data.variants || [];
}

// Update a single variant to "continue selling when out of stock"
async function setVariantContinueSelling(variantId) {
  return shopifyREST(`/variants/${variantId}.json`, {
    method: 'PUT',
    body: { variant: { id: variantId, inventory_policy: 'continue' } }
  });
}

// Optional: write a simple metafield on the product to indicate preorder
async function setProductPreorderMetafield(productId) {
  const metafield = {
    metafield: {
      namespace: 'preorder',
      key: 'enabled',
      type: 'boolean',
      value: 'true',
      owner_id: productId,
      owner_resource: 'product'
    }
  };
  return shopifyREST(`/metafields.json`, { method: 'POST', body: metafield }).catch(() => null);
}

// ---- Webhook: inventory_levels/update ----
// In your app settings (Shopify Admin), point the webhook to:  POST {APP_URL}/webhooks/inventory
// Content type: JSON
app.post('/webhooks/inventory',
  bodyParser.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      // Verify HMAC
      const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
      const digest = crypto.createHmac('sha256', API_SECRET).update(req.body, 'utf8').digest('base64');
      if (hmacHeader !== digest) {
        console.warn('[Webhook] HMAC verification failed');
        return res.status(401).send('HMAC verification failed');
      }

      const payload = JSON.parse(req.body.toString('utf8'));
      // payload contains inventory_item_id, available, location_id, etc.
      const { inventory_item_id, available } = payload;

      if (typeof inventory_item_id === 'undefined') {
        console.warn('[Webhook] No inventory_item_id in payload');
        return res.sendStatus(200);
      }

      if (available <= 0) {
        // Find variants for this inventory item
        const variants = await getVariantsByInventoryItemId(inventory_item_id);
        for (const v of variants) {
          if (v.inventory_policy !== 'continue') {
            await setVariantContinueSelling(v.id);
            // Also mark product as preorder via metafield (best-effort)
            await setProductPreorderMetafield(v.product_id).catch(() => {});
            console.log(`[Webhook] Enabled CONTINUE selling for variant ${v.id} (product ${v.product_id})`);
          }
        }
      }

      return res.sendStatus(200);
    } catch (err) {
      console.error('[Webhook] Error', err);
      return res.sendStatus(500);
    }
  }
);

// ---- App Proxy endpoint to serve storefront JS ----
// Set App Proxy (Admin -> App setup): Subpath prefix = "apps", Subpath = "preorder"
// Proxy URL = {APP_URL}/proxy
// Then include in theme.liquid: <script src="https://YOUR-STORE.myshopify.com/apps/preorder/preorder.js"></script>
app.get('/proxy/preorder.js', async (req, res) => {
  // NOTE: You can verify proxy signature if you enable "Sign proxy requests" in Shopify admin.
  res.type('application/javascript');
  res.send(`
(function(){
  // ===== Simple Preorder UX injector =====
  var BTN_TEXT = ${JSON.stringify(BTN_TEXT)};
  var PREORDER_MESSAGE = ${JSON.stringify(PREORDER_MESSAGE)};

  function findProductForm(){
    return document.querySelector('form[action*="/cart/add"]');
  }

  function getVariantIdFromForm(form){
    var input = form && form.querySelector('input[name="id"]');
    return input ? input.value : null;
  }

  function ensurePreorderBadge(form){
    var id = 'preorder-helper-msg';
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.margin = '8px 0';
      el.style.fontSize = '14px';
      el.style.lineHeight = '1.4';
      el.style.padding = '10px';
      el.style.borderRadius = '8px';
      el.style.border = '1px solid #e5e7eb';
      el.style.background = '#f9fafb';
      form.appendChild(el);
    }
    el.textContent = PREORDER_MESSAGE;
  }

  function setButtonState(form, isPreorder){
    var btn = form && form.querySelector('[type="submit"]');
    if (!btn) return;
    if (isPreorder){
      btn.disabled = false; // make sure users can click
      btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
      btn.textContent = BTN_TEXT;
      // add a line-item property so you can recognize preorders in the order
      var propName = 'properties[Preorder]';
      var propInput = form.querySelector('input[name="'+propName+'"]');
      if (!propInput){
        propInput = document.createElement('input');
        propInput.type = 'hidden';
        propInput.name = propName;
        form.appendChild(propInput);
      }
      propInput.value = 'true';
      ensurePreorderBadge(form);
    } else {
      if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
      var propInput = form.querySelector('input[name="properties[Preorder]"]');
      if (propInput) propInput.remove();
      var msg = document.getElementById('preorder-helper-msg');
      if (msg) msg.remove();
    }
  }

  async function checkVariantAvailability(variantId){
    try {
      var resp = await fetch('/variants/' + variantId + '.js', { credentials: 'same-origin' });
      if (!resp.ok) return null;
      var data = await resp.json();
      return !!data.available; // boolean
    } catch (e){
      return null;
    }
  }

  async function evaluate(){
    var form = findProductForm();
    if (!form) return;
    var variantId = getVariantIdFromForm(form);
    if (!variantId) return;

    var available = await checkVariantAvailability(variantId);
    if (available === null) return;

    if (!available){
      // Sold out -> Preorder UX
      setButtonState(form, true);
    } else {
      setButtonState(form, false);
    }
  }

  // Observe variant changes
  var observer = new MutationObserver(function(){ evaluate(); });
  function start(){
    var form = findProductForm();
    if (!form) return;
    var idInput = form.querySelector('input[name="id"]');
    if (idInput){
      observer.observe(idInput, { attributes: true, attributeFilter: ['value'] });
      idInput.addEventListener('change', evaluate);
    }
    evaluate();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(start, 1);
  } else {
    document.addEventListener('DOMContentLoaded', start);
  }
})();
  `);
});

// Optional: very small admin page (static HTML) to show status & settings preview
app.get('/admin', (_req, res) => {
  res.type('html').send(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Preorder App – Admin</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #111827; }
    .card { max-width: 760px; margin: auto; border:1px solid #e5e7eb; border-radius: 16px; padding: 24px; box-shadow: 0 10px 20px rgba(0,0,0,.03); }
    .k { color: #6b7280; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    input { width: 100%; padding: 10px 12px; border:1px solid #d1d5db; border-radius: 10px; }
    button { padding: 10px 14px; border-radius: 10px; border: 0; background: #111827; color: white; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🛒 Preorder App for Shopify</h1>
    <p>This app turns sold‑out variants into <b>Preorder</b> by: <br/>1) showing a preorder button + message on product pages, and <br/>2) (via webhook) switching variants to <code>Continue selling when out of stock</code> when inventory hits 0.</p>
    <hr/>
    <div class="grid">
      <div>
        <div class="k">Shop</div>
        <div><code>${SHOP || '(env SHOP not set)'}</code></div>
      </div>
      <div>
        <div class="k">App URL</div>
        <div><code>${APP_URL}</code></div>
      </div>
      <div>
        <div class="k">Button text</div>
        <div><code>${BTN_TEXT}</code></div>
      </div>
      <div>
        <div class="k">Message</div>
        <div><code>${PREORDER_MESSAGE}</code></div>
      </div>
    </div>
    <p style="margin-top:16px">Theme snippet to include (replace with your store domain):</p>
    <pre><code>&lt;script src="https://${SHOP || 'your-store.myshopify.com'}/apps/preorder/preorder.js"&gt;&lt;/script&gt;</code></pre>
  </div>
</body>
</html>
  `);
});

// Fallback
app.get('/', (_req, res) => {
  res.type('text').send('Shopify Preorder App is running. See /admin and /health');
});

app.listen(PORT, () => {
  console.log(`➡ Preorder app running on :${PORT}`);
});
