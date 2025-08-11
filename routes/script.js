
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.setHeader('Content-Type','application/javascript');
  res.setHeader('Cache-Control','no-store');
  const appUrl = process.env.SHOPIFY_APP_URL;

  res.send(`(function(){
    function qs(sel,root){return (root||document).querySelector(sel);}
    function qsa(sel,root){return Array.from((root||document).querySelectorAll(sel));}

    function currentShop(){
      try{
        var meta = document.querySelector('meta[name=shopify-digital-wallet]') || document.querySelector('meta[name=shopify-checkout-api-token]');
      }catch(e){}
      var host = window.Shopify && Shopify.shop ? Shopify.shop : (window.location.host.includes('myshopify.com') ? window.location.host : null);
      return host;
    }

    function currentIds(){
      var productId = window.ShopifyAnalytics && ShopifyAnalytics.meta && ShopifyAnalytics.meta.product ? String(ShopifyAnalytics.meta.product.id) : null;
      var variantId = window.ShopifyAnalytics && ShopifyAnalytics.meta && ShopifyAnalytics.meta.selectedVariantId ? String(ShopifyAnalytics.meta.selectedVariantId) : null;
      return {productId, variantId};
    }

    async function getCfg(shop, productId, variantId){
      const u = new URL('${appUrl}/proxy');
      u.searchParams.set('shop', shop);
      u.searchParams.set('productId', productId);
      if(variantId) u.searchParams.set('variantId', variantId);
      const r = await fetch(u.toString(), { credentials:'omit' });
      return await r.json();
    }

    function patchUI(cfg){
      if(!cfg || !cfg.ok || !cfg.enabled) return;

      var btn = qs('form[action*="/cart/add"] [type=submit]') || qs('button[name="add"]') || qs('button.add-to-cart');
      if(!btn) return;
      btn.disabled = false;
      var txt = 'Pre-order';
      if (cfg.message) txt = cfg.message;
      btn.textContent = txt;

      // Add message UI
      var info = document.createElement('div');
      info.style.marginTop = '8px';
      info.style.fontSize = '14px';
      info.textContent = cfg.message || 'Available for preorder';
      var form = qs('form[action*="/cart/add"]');
      if(form) form.appendChild(info);

      // intercept submit to include line item property
      if(form){
        form.addEventListener('submit', function(e){
          var propsInput = document.createElement('input');
          propsInput.type='hidden';
          propsInput.name='properties[preorder]';
          propsInput.value = 'true';
          form.appendChild(propsInput);

          if(cfg.shipDate){
            var d = document.createElement('input');
            d.type='hidden';
            d.name='properties[ship_date]';
            d.value = cfg.shipDate;
            form.appendChild(d);
          }
        }, { once:true });
      }
    }

    async function init(){
      var shop = currentShop();
      var ids = currentIds();
      if(!shop || !ids.productId) return;
      try{
        var cfg = await getCfg(shop, ids.productId, ids.variantId);
        patchUI(cfg);
      }catch(e){}
    }

    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded', init);
    }else{
      init();
    }
  })();`);
});

module.exports = router;
