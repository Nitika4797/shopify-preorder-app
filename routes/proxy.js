
const express = require('express');
const PreorderConfig = require('../models/PreorderConfig');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { shop, productId, variantId } = req.query;
    if (!shop || !productId) return res.json({ ok:false });

    const cfg = await PreorderConfig.findOne({
      shop,
      productId,
      variantId: variantId || null
    });

    if (!cfg) return res.json({ ok:false });

    res.json({
      ok:true,
      productId: cfg.productId,
      variantId: cfg.variantId,
      enabled: cfg.enabled,
      message: cfg.message,
      shipDate: cfg.shipDate,
      limit: cfg.limit,
      paymentType: cfg.paymentType,
      depositPercentage: cfg.depositPercentage
    });
  } catch (e) {
    console.error('proxy error', e);
    res.json({ ok:false });
  }
});

module.exports = router;
