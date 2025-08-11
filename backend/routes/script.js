const express = require('express');
const router = express.Router();

router.get('/script.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    (function(){
      function log(){ try{ console.log('[Preorder]', ...arguments); }catch(e){} }

      function getShopDomain(){
        if (window.Shopify && Shopify.shop) return Shopify.shop;
        return location.hostname;
      }

      // Dawn and most OS 2.0 themes embed a JSON blob with product info
      function readProductIds(){
        var productId = null, variantId = null;

        // Preferred: theme JSON
        var el = document.querySelector('script[type="application/json"][data-product]');
        if (el) {
          try {
            var json = JSON.parse(el.textContent);
            if (json && json.id) productId = String(json.id);
            // the selected variant id is either in the form element
            var currentVariantInput = document.querySelector('form[action*="/cart/add"] [name="id"]');
            if (currentVariantInput && currentVariantInput.value) {
              variantId = String(currentVariantInput.value);
            } else if (json && json.variants && json.variants.length) {
              // fallback to first variant
              variantId = String(json.variants[0].id);
            }
          } catch(e){}
        }

        // Fallback: ShopifyAnalytics
        if (!productId && window.ShopifyAnalytics && ShopifyAnalytics.meta && ShopifyAnalytics.meta.product) {
          productId = String(ShopifyAnalytics.meta.product.id);
          if (ShopifyAnalytics.meta.selectedVariantId) variantId = String(ShopifyAnalytics.meta.selectedVariantId);
        }

        // Absolute fallback: hidden input name=id
        if (!variantId) {
          var v = document.querySelector('form[action*="/cart/add"] [name="id"]');
          if (v && v.value) variantId = String(v.value);
        }

        return { productId, variantId };
      }

      function setPreorderUI(){
        var addBtn = document.querySelector('form[action*="/cart/add"] button[type="submit"], button[name="add"]');
        if (!addBtn) return;

        // Re-enable the button even when the theme disabled it for "sold out"
        addBtn.disabled = false;
        addBtn.textContent = 'Pre-order';
        addBtn.classList.add('preorder-btn');

        // Add a properties flag so you can detect preorder in orders
        var form = addBtn.closest('form');
        if (form && !form.querySelector('input[name="properties[_preorder]"]')) {
          var flag = document.createElement('input');
          flag.type = 'hidden';
          flag.name = 'properties[_preorder]';
          flag.value = 'true';
          form.appendChild(flag);
        }
      }

      async function fetchConfig(productId, variantId){
        var shop = getShopDomain();
        var url = 'https://${process.env.SHOPIFY_APP_URL.replace('https://','')}/proxy'
                + '?shop=' + encodeURIComponent(shop)
                + '&productId=' + encodeURIComponent(productId)
                + (variantId ? '&variantId=' + encodeURIComponent(variantId) : '');
        try {
          // no cookies/credentials
          var res = await fetch('https://' + url, { credentials: 'omit' });
          return await res.json();
        } catch(e){
          log('proxy error', e);
          return { ok:false };
        }
      }

      async function run(){
        var ids = readProductIds();
        if (!ids.productId) { log('No productId found'); return; }

        var cfg = await fetchConfig(ids.productId, ids.variantId);
        log('config', cfg);
        if (!cfg || !cfg.ok || !cfg.enabled) return;

        setPreorderUI();

        // Also re-apply when variant changes
        var variantSelect = document.querySelector('form[action*="/cart/add"] [name="id"]');
        if (variantSelect) {
          variantSelect.addEventListener('change', async function(){
            var newIds = readProductIds();
            var cfg2 = await fetchConfig(newIds.productId, newIds.variantId);
            if (cfg2 && cfg2.ok && cfg2.enabled) setPreorderUI();
          }, { passive:true });
        }
      }

      if (document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', run);
      } else {
        run();
      }
    })();
  `);
});

module.exports = router;
