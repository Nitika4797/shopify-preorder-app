// backend/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS for Shopify storefront (ScriptTag fetches)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (/\.myshopify\.com$/.test(origin)) return cb(null, true);
    cb(null, true); // admin pages etc.
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mongo
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Routes
app.use('/install', require('./routes/install'));   // creates ScriptTag on install
app.use('/admin', require('./routes/admin'));       // dashboard API (enable/disable)
app.use('/', require('./routes/proxy'));            // /proxy for config JSON
app.use('/', require('./routes/script'));           // /script.js storefront script
app.use('/api/preorders', require('./routes/preorders')); // optional: admin CRUD

// Health
app.get('/healthz', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log('Server on', PORT));
