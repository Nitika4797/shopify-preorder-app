
import express from "express";
import shopify, { registerWebhooks, ensureScriptTag } from "../shopify.js";

const router = express.Router();

router.get("/", shopify.auth.begin());
router.get("/callback", shopify.auth.callback(), async (req, res) => {
  const { shop, accessToken } = res.locals.shopify.session;
  await registerWebhooks(shop, accessToken);
  await ensureScriptTag(res.locals.shopify.session);
  // Redirect to embedded admin
  res.redirect(`/admin?shop=${shop}`);
});

router.post("/webhooks", shopify.processWebhooks());

export default router;
