
import express from "express";
import shopify, { getSettingsForShop, setVariantInventoryPolicy } from "../shopify.js";

const router = express.Router();

// App Proxy routes must be whitelisted in your app setup (e.g., Subpath: /apps/preorder, Prefix: apps, Proxy URL: https://YOUR_HOST/apps/preorder)
router.get("/config", async (req, res) => {
  const shop = req.query.shop || req.get("X-Shopify-Shop-Domain");
  const config = await getSettingsForShop(shop);
  res.json({ success: true, config });
});

// Toggle variant to continue selling when OOS (called by storefront JS if enabled)
router.post("/enable", express.json(), async (req, res) => {
  try {
    const shop = req.query.shop || req.get("X-Shopify-Shop-Domain");
    const { variantId } = req.body || {};
    if (!variantId) return res.status(400).json({ success:false, error:"variantId required" });

    const sessionId = await shopify.sessionStorage.findSessionsByShop(shop);
    const session = Array.isArray(sessionId) ? sessionId[0] : sessionId;
    if (!session) return res.status(401).json({ success:false, error:"No session" });

    await setVariantInventoryPolicy(session, variantId, "continue");
    res.json({ success: true });
  } catch (e) {
    console.error("enable preorder error", e);
    res.status(500).json({ success:false, error: e?.message || "Server error" });
  }
});

export default router;
