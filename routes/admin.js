
import express from "express";
import { getShopSettings, upsertShopSettings } from "../lib/shopSettings.js";

const router = express.Router();

router.get("/", async (req,res)=>{
  const shop = res.locals.shopify.session.shop;
  const s = await getShopSettings(shop);
  res.setHeader("Content-Type","text/html; charset=utf-8");
  res.send(`
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Preorder App — Admin</title>
    <link rel="stylesheet" href="/public/admin.css"/>
  </head>
  <body>
    <div class="wrap">
      <h1>Preorder App — Settings</h1>
      <form method="post" action="/admin/save">
        <label><input type="checkbox" name="enableAuto" ${(s?.enableAuto??true) ? "checked":""}/> Auto-enable preorder when out of stock</label>
        <label>Button text <input name="buttonText" value="${s?.buttonText ?? "Preorder"}"/></label>
        <label>Badge text <input name="badgeText" value="${s?.badgeText ?? "Preorder"}"/></label>
        <label>Cart note text <input name="noteText" value="${s?.noteText ?? "This item is on preorder. Ships soon."}"/></label>
        <label>Estimated ship date (optional) <input name="shipEta" value="${s?.shipEta ?? ""}" placeholder="e.g., 2025-09-15"/></label>
        <label><input type="checkbox" name="autoRevert" ${(s?.autoRevert??false) ? "checked":""}/> Auto-revert to normal when back in stock</label>
        <button type="submit">Save settings</button>
      </form>
      <p>Embed the storefront script automatically installed as a ScriptTag. If you need manual include, add this line before </body> in theme.liquid:</p>
      <pre>&lt;script src="${process.env.HOST}/script/storefront.js"&gt;&lt;/script&gt;</pre>
    </div>
  </body>
  </html>
  `);
});

router.post("/save", express.urlencoded({extended:true}), async (req,res)=>{
  const shop = res.locals.shopify.session.shop;
  const data = {
    enableAuto: !!req.body.enableAuto,
    autoRevert: !!req.body.autoRevert,
    buttonText: (req.body.buttonText||"Preorder").toString().slice(0,40),
    badgeText: (req.body.badgeText||"Preorder").toString().slice(0,40),
    noteText: (req.body.noteText||"This item is on preorder. Ships soon.").toString().slice(0,140),
    shipEta: (req.body.shipEta||"").toString().slice(0,40)
  };
  await upsertShopSettings(shop, data);
  res.redirect("/admin");
});

export default router;
