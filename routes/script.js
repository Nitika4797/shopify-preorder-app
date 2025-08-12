
import express from "express";

const router = express.Router();

// Storefront JS that runs on PDP and switches button to "Preorder" when selected variant is OOS
router.get("/storefront.js", async (req,res)=>{
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  const host = process.env.HOST;
  res.send(`
(function(){
  const CONFIG_URL = "${host}/apps/preorder/config";
  const ENABLE_URL = "${host}/apps/preorder/enable";

  function waitForProductForm(){
    return new Promise(resolve=>{
      const check = ()=>{
        const form = document.querySelector('form[action*="/cart/add"]');
        if(form){ resolve(form); } else { requestAnimationFrame(check); }
      };
      check();
    });
  }

  function getVariantInfo(){
    try{
      const el = document.querySelector('form[action*="/cart/add"] [name="id"]');
      const variantId = el && el.value ? el.value : null;
      // storefront JSON: window.ShopifyAnalytics.meta.product may exist; otherwise rely on availability bools
      const outOfStock = (document.querySelector('[data-product-availability="out-of-stock"]') || document.querySelector('.product-form__inventory .badge--sold-out')) ? true : false;
      return { variantId, outOfStock };
    }catch(e){ return { variantId:null, outOfStock:false }; }
  }

  async function getConfig(shop){
    try{
      const u = new URL(CONFIG_URL);
      if (shop) u.searchParams.set("shop", shop);
      const r = await fetch(u, { credentials: "omit" });
      const j = await r.json();
      return j.config || {};
    }catch(e){ return {}; }
  }

  function setPreorderUI(form, cfg){
    const btn = form.querySelector('[type="submit"], button[name="add"]');
    if (!btn) return;
    btn.dataset._originalText = btn.dataset._originalText || btn.textContent.trim();
    btn.textContent = cfg.buttonText || "Preorder";

    // Badge
    let badge = document.querySelector(".preorder-badge");
    if(!badge){
      badge = document.createElement("div");
      badge.className = "preorder-badge";
      badge.style.cssText = "margin:.5rem 0; padding:.5rem .75rem; border:1px dashed #888; font-size:.9rem;";
      btn.closest("form").insertAdjacentElement("beforebegin", badge);
    }
    const eta = cfg.shipEta ? (" Ships by "+cfg.shipEta+".") : "";
    badge.textContent = (cfg.badgeText || "Preorder") + " — " + (cfg.noteText || "This item is on preorder.") + eta;

    // Add line item property on submit
    form.addEventListener("submit", function(e){
      const propName = "properties[Preorder]";
      if(!form.querySelector('[name="'+propName+'"]')){
        const i = document.createElement("input");
        i.type = "hidden";
        i.name = propName;
        i.value = "true" + (cfg.shipEta ? (" (ETA "+cfg.shipEta+")") : "");
        form.appendChild(i);
      }
    }, { once: true });
  }

  function resetUI(form){
    const btn = form.querySelector('[type="submit"], button[name="add"]');
    if (btn && btn.dataset._originalText){
      btn.textContent = btn.dataset._originalText;
    }
    const badge = document.querySelector(".preorder-badge");
    if (badge) badge.remove();
  }

  async function run(){
    const form = await waitForProductForm();
    const shop = (window.Shopify && window.Shopify.shop) ? window.Shopify.shop : null;
    const cfg = await getConfig(shop);

    function update(){
      const info = getVariantInfo();
      if (!info.variantId) return;
      const available = !info.outOfStock;
      if (!available){
        setPreorderUI(form, cfg);
        if (cfg.enableAuto){
          // Ask server to set inventory_policy to continue
          fetch(ENABLE_URL + (shop ? ("?shop="+encodeURIComponent(shop)) : ""), {
            method: "POST",
            headers: { "Content-Type":"application/json" },
            body: JSON.stringify({ variantId: info.variantId })
          }).catch(()=>{});
        }
      } else {
        resetUI(form);
      }
    }

    // Initial + observe changes
    update();
    const mo = new MutationObserver(()=>update());
    mo.observe(document.body, { subtree:true, childList:true, attributes:true });
    document.addEventListener("change", update, true);
  }

  if (document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", run); } else { run(); }
})();
  `);
});

export default router;
