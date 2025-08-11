
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const proxyRoutes = require('./routes/proxy');
const scriptRoutes = require('./routes/script');

const app = express();
const PORT = process.env.PORT || 10000;

// Mongo
mongoose.connect(process.env.MONGODB_URI, { })
  .then(()=>console.log('Mongo connected'))
  .catch(err=>console.error('Mongo error', err));

// CORS - allow Shopify domains and your store front
const allowed = [
  /\.myshopify\.com$/,
  /^localhost$/,
  /render\.com$/
];
app.use(cors({
  origin: (origin, cb)=>{
    if(!origin) return cb(null,true);
    try{
      const host = new URL(origin).host;
      if (allowed.some(rx=>rx.test(host))) return cb(null,true);
    }catch(e){}
    return cb(null,false);
  },
  credentials: false
}));
app.use(express.json());
// --- CORS for storefront (very permissive but safe: no credentials) ---
app.use((req, res, next) => {
  try {
    const origin = req.headers.origin || '';
    // allow any *.myshopify.com origin; otherwise fallback to *
    if (origin && /\.myshopify\.com$/.test(new URL(origin).hostname)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  } catch {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // we do NOT allow credentials, so wildcard is fine
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.urlencoded({ extended:true }));

// Health
app.get('/healthz', (req,res)=>res.json({ ok:true, ts:new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', adminRoutes);
app.use('/proxy', proxyRoutes);
app.use('/script.js', scriptRoutes);

// Root
app.get('/', (req,res)=>res.send('Preorder app running'));

// Start
app.listen(PORT, '0.0.0.0', ()=>console.log('Server on', PORT));
