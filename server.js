
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 10000;

const REQUIRED_ENVS = ['MONGODB_URI', 'APP_HOST', 'APP_PASSWORD', 'SHOPIFY_SHARED_SECRET'];
REQUIRED_ENVS.forEach(k => {
  if (!process.env[k]) console.warn(`[WARN] Missing env ${k}. Please set it in .env`);
});

// --- Mongo ---
mongoose.connect(process.env.MONGODB_URI, { })
  .then(()=>console.log('✅ Mongo connected'))
  .catch(err=>console.error('❌ Mongo error', err));

// --- Models ---
const preorderSchema = new mongoose.Schema({
  shopDomain: String,
  productId: String,
  productTitle: String,
  variantId: String,
  variantTitle: String,
  quantity: { type: Number, default: 1 },
  customerName: String,
  email: String,
  note: String,
}, { timestamps: true });

const Preorder = mongoose.model('Preorder', preorderSchema);

// --- Helpers ---
function verifyAppProxyHmac(req) {
  // Shopify App Proxy sends HMAC in query as "signature" or "sig" sometimes; 
  // the current standard is "signature" (hex of SHA256).
  const { signature, ...rest } = req.query || {};
  if (!signature) return false;
  const message = Object.keys(rest).sort().map(k => `${k}=${rest[k]}`).join('');
  const digest = crypto.createHmac('sha256', process.env.SHOPIFY_SHARED_SECRET || '').update(message).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

function requireProxyAuth(req, res, next) {
  if (!process.env.SHOPIFY_SHARED_SECRET) return next(); // allow for local testing
  try {
    if (verifyAppProxyHmac(req)) return next();
  } catch (e) {}
  return res.status(401).send('Invalid proxy signature');
}

// --- Middleware ---
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// CORS is NOT needed on proxy routes because they are same-origin via Shopify App Proxy.
// But we enable CORS for admin (you opening from your domain).
app.use(cors({
  origin: (origin, cb)=> cb(null, true),
  credentials: false
}));

// --- Proxy JS (served via App Proxy): /apps/preorder/proxy.js ---
app.get('/apps/preorder/proxy.js', requireProxyAuth, (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
  (function(){
    // Lightweight helper
    function $(sel, ctx){ return (ctx||document).querySelector(sel); }
    function $all(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }

    // Expect window.__PREORDER injected by Liquid
    var cfg = (window.__PREORDER || {}).product;
    if (!cfg) return;

    // Detect variant select + add-to-cart form
    var form = document.querySelector('form[action*="/cart/add"]');
    if(!form) return;

    function getCurrentVariantId() {
      var input = form.querySelector('input[name="id"]');
      if (input && input.value) return input.value;
      // Fallback: select[name="id"]
      var select = form.querySelector('select[name="id"]');
      return select ? select.value : null;
    }

    function getVariantInfo(vid) {
      if (!cfg.variants) return null;
      for (var i=0;i<cfg.variants.length;i++){
        if (String(cfg.variants[i].id) === String(vid)) return cfg.variants[i];
      }
      return null;
    }

    function ensurePreorderUI() {
      // Create preorder button if missing
      var btn = document.getElementById('preorder-btn');
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'preorder-btn';
        btn.style.width = '100%';
        btn.style.padding = '14px 18px';
        btn.style.borderRadius = '8px';
        btn.style.fontWeight = '600';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.style.marginTop = '8px';
        btn.textContent = 'Preorder';
        form.appendChild(btn);
        btn.addEventListener('click', openPreorderModal);
      }

      // Simple modal
      if (!document.getElementById('preorder-modal')) {
        var m = document.createElement('div');
        m.id = 'preorder-modal';
        m.style.position = 'fixed';
        m.style.inset = '0';
        m.style.background = 'rgba(0,0,0,.45)';
        m.style.display = 'none';
        m.style.alignItems = 'center';
        m.style.justifyContent = 'center';
        m.innerHTML = '<div style="background:#fff;max-width:420px;width:92%;border-radius:12px;padding:20px;font-family:system-ui, -apple-system, Segoe UI, Roboto, sans-serif;">'
          + '<h3 style="margin:0 0 12px;font-size:20px;">Preorder this item</h3>'
          + '<p style="margin:0 0 12px;color:#444">Tell us how to reach you. We’ll notify you before shipping.</p>'
          + '<label style="display:block;margin:8px 0 4px">Name</label><input id="po-name" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px">'
          + '<label style="display:block;margin:8px 0 4px">Email</label><input id="po-email" type="email" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px">'
          + '<label style="display:block;margin:8px 0 4px">Quantity</label><input id="po-qty" type="number" min="1" value="1" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px">'
          + '<label style="display:block;margin:8px 0 4px">Note (optional)</label><textarea id="po-note" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px"></textarea>'
          + '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;">'
          + '<button id="po-cancel" style="padding:10px 14px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;">Cancel</button>'
          + '<button id="po-submit" style="padding:10px 14px;border-radius:8px;border:none;background:#111;color:#fff;cursor:pointer;">Submit</button>'
          + '</div></div>';
        document.body.appendChild(m);
        m.addEventListener('click', function(e){ if(e.target.id==='preorder-modal') closePreorderModal(); });
        m.querySelector('#po-cancel').addEventListener('click', closePreorderModal);
        m.querySelector('#po-submit').addEventListener('click', submitPreorder);
      }
    }

    function openPreorderModal(){ document.getElementById('preorder-modal').style.display='flex'; }
    function closePreorderModal(){ document.getElementById('preorder-modal').style.display='none'; }

    function variantIsOOS(vid){
      var info = getVariantInfo(vid);
      if (!info) return false;
      var inv = (typeof info.inventory === 'number') ? info.inventory : 0;
      var available = !!info.available;
      return (!available || inv <= 0);
    }

    function toggleButtons(){
      var addBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      var vid = getCurrentVariantId();
      if (!addBtn || !vid) return;

      if (variantIsOOS(vid)) {
        addBtn.style.opacity = 0.4;
        addBtn.style.pointerEvents = 'none';
        ensurePreorderUI();
        document.getElementById('preorder-btn').style.display = 'block';
      } else {
        addBtn.style.opacity = 1.0;
        addBtn.style.pointerEvents = 'auto';
        var pb = document.getElementById('preorder-btn');
        if (pb) pb.style.display = 'none';
      }
    }

    function submitPreorder(){
      var vid = getCurrentVariantId();
      var vinfo = getVariantInfo(vid) || {};
      var name = document.getElementById('po-name').value.trim();
      var email = document.getElementById('po-email').value.trim();
      var qty = parseInt(document.getElementById('po-qty').value || '1', 10);
      var note = document.getElementById('po-note').value.trim();

      if(!email){ alert('Email is required'); return; }

      var payload = {
        productId: String(cfg.id),
        productTitle: cfg.title,
        variantId: String(vid || ''),
        variantTitle: vinfo.title || '',
        quantity: isNaN(qty) ? 1 : Math.max(1, qty),
        customerName: name,
        email: email,
        note: note
      };

      fetch('/apps/preorder/preorders?shop='+(window.Shopify && window.Shopify.shop || ''), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r=>r.json()).then(function(resp){
        if (resp && resp.success) {
          alert('Preorder submitted! We will contact you soon.');
          closePreorderModal();
        } else {
          alert('Failed to submit preorder.');
        }
      }).catch(function(){
        alert('Failed to submit preorder.');
      });
    }

    // Initial + observe variant changes
    toggleButtons();
    document.addEventListener('change', function(e){
      if (e.target && (e.target.name === 'id' || e.target.id && e.target.id.includes('SingleOptionSelector'))) {
        setTimeout(toggleButtons, 0);
      }
    });
  })();
  `);
});

// --- Create preorder (App Proxy POST) ---
app.post('/apps/preorder/preorders', requireProxyAuth, async (req, res) => {
  try {
    const shopDomain = (req.query.shop || '').toLowerCase();
    const payload = req.body || {};
    const doc = await Preorder.create({
      shopDomain,
      productId: payload.productId,
      productTitle: payload.productTitle,
      variantId: payload.variantId,
      variantTitle: payload.variantTitle,
      quantity: payload.quantity || 1,
      customerName: payload.customerName || '',
      email: payload.email || '',
      note: payload.note || ''
    });
    res.json({ success: true, id: doc._id });
  } catch (e) {
    console.error('Create preorder error', e);
    res.status(500).json({ success: false, error: 'server_error' });
  }
});

// --- Simple Admin (password via ?key=...) ---
app.get('/admin', async (req, res) => {
  const key = req.query.key;
  if (!key || key !== (process.env.APP_PASSWORD||'')) {
    res.status(401).send('<h3>Unauthorized</h3><p>Append ?key=YOUR_APP_PASSWORD</p>');
    return;
  }
  const shop = (req.query.shop || '').toLowerCase();
  const q = shop ? { shopDomain: shop } : {};
  const list = await Preorder.find(q).sort({ createdAt: -1 }).limit(500);
  res.setHeader('Content-Type', 'text/html');
  const rows = list.map(d => `
    <tr>
      <td>${d.shopDomain || ''}</td>
      <td>${d.productTitle || ''}<br><small>${d.productId}</small></td>
      <td>${d.variantTitle || ''}<br><small>${d.variantId}</small></td>
      <td>${d.quantity}</td>
      <td>${d.customerName || ''}<br><small>${d.email || ''}</small></td>
      <td>${d.note || ''}</td>
      <td>${new Date(d.createdAt).toLocaleString()}</td>
    </tr>
  `).join('');
  res.send(`
  <!doctype html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Preorders Admin</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px;background:#f7f7f8;color:#111}
    h1{font-size:22px;margin:0 0 12px}
    .card{background:#fff;border-radius:14px;box-shadow:0 1px 2px rgba(0,0,0,.05);padding:16px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th,td{border-bottom:1px solid #eee;padding:10px;text-align:left;font-size:14px;vertical-align:top}
    th{font-weight:600;background:#fafafa}
    input{padding:8px 10px;border:1px solid #ddd;border-radius:8px}
    .bar{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:8px}
  </style>
  </head><body>
    <div class="bar">
      <h1>Preorders</h1>
      <form method="GET" action="/admin">
        <input type="hidden" name="key" value="${key}">
        <input name="shop" placeholder="filter: mystore.myshopify.com" value="${shop}">
        <button type="submit">Filter</button>
      </form>
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Shop</th><th>Product</th><th>Variant</th><th>Qty</th><th>Customer</th><th>Note</th><th>Created</th></tr></thead>
        <tbody>${rows || ''}</tbody>
      </table>
    </div>
  </body></html>
  `);
});

app.get('/', (req,res)=>res.send('Preorder app is running.'));

app.listen(PORT, ()=>{
  console.log('🚀 Server listening on', PORT);
  console.log('Admin:', (process.env.APP_HOST||'http://localhost:'+PORT) + '/admin?key=YOUR_APP_PASSWORD');
});
