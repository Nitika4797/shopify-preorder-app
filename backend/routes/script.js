// backend/routes/script.js
const express = require('express');
const router = express.Router();

router.get('/script.js', (req, res) => {
  res.set('Content-Type', 'application/javascript');
  const appUrl = (process.env.SHOPIFY_APP_URL || '').replace(/\/$/, '');

  res.send(`(function(){
    var log = function(){ try { console.log('[preorder]', ...arguments); } catch(_){} };

    function getProductId(){
      try{
        // Dawn: product JSON
        var el=document.querySelector('script[type="application/ld+json"]');
        if(el){
          var data=JSON.parse(el.textContent||'{}');
          if(data && data['@type']==='Product' && data['@id']){
            var parts=String(data['@id']).split('/');
            var id = parts[parts.length-1] || null;
            if(id){ log('product id from ld+json', id); return id; }
          }
        }
      }catch(e){}
      if(window.meta && meta.product && meta.product.id){ log('product id from meta', meta.product.id); return meta.product.id; }
      if(window.ShopifyAnalytics && ShopifyAnalytics.meta && ShopifyAnalytics.meta.product && ShopifyAnalytics.meta.product.id){
        log('product id from ShopifyAnalytics', ShopifyAnalytics.meta.product.id);
        return ShopifyAnalytics.meta.product.id;
      }
      return null;
    }

    function getVariantId(){
      try{
        if(window.ShopifyAnalytics && ShopifyAnalytics.meta && ShopifyAnalytics.meta.selectedVariantId){
          log('variant id from ShopifyAnalytics', ShopifyAnalytics.meta.selectedVariantId);
          return ShopifyAnalytics.meta.selectedVariantId;
        }
        var sel=document.querySelector('form[action*="/cart/add"] [name="id"]');
        if(sel && sel.value){ log('variant id from form', sel.value); return sel.value; }
      }catch(e){}
      return null;
    }

    function findAddToCartBtn(){
      // Dawn add-to-cart submit
      var btn = document.querySelector('form[action*="/cart/add"] [type="submit"], form[action*="/cart/add"] button[name="add"], button[type="submit"][name="add"]');
      if(btn) return btn;
      // fallback
      return document.querySelector('form[action*="/cart/add"] button') || null;
    }

    function insertMessage(html){
      var form=document.querySelector('form[action*="/cart/add"]');
      var target=form || document.querySelector('product-form') || document.body;
      var boxId='preorder-msg-box';
      var old=document.getElementById(boxId);
      if(old) old.remove();

      var div=document.createElement('div');
      div.id=boxId;
      div.style.margin='10px 0';
      div.style.padding='12px';
      div.style.border='1px dashed #999';
      div.style.borderRadius='8px';
      div.style.background='#f7fbff';
      div.style.fontSize='14px';
      div.innerHTML=html;
      if(target && target.parentNode) target.parentNode.insertBefore(div, target.nextSibling);
    }

    function enableButton(btn){
      try{
        btn.disabled=false;
        btn.removeAttribute('disabled');
        btn.removeAttribute('aria-disabled');
        btn.classList.remove('disabled');
        // Dawn adds 'is-loading' or disabled classes sometimes
        btn.closest('button')?.classList?.remove('disabled');
      }catch(e){}
    }

    function updateButton(btn, label){
      if(!btn) return;
      enableButton(btn);
      // Dawn uses textContent for label inside span
      var span = btn.querySelector('span');
      if(span){ span.textContent = label; }
      else { btn.textContent = label; }
    }

    function buildMessage(d){
      var parts=[];
      if(d.message) parts.push(d.message);
      if(d.shipDate) parts.push('Estimated ship date: '+ new Date(d.shipDate).toDateString());
      if(d.limit!=null) parts.push('Preorder limit: '+d.limit);
      if(d.paymentType==='deposit' && d.depositPercentage!=null){
        parts.push('Deposit: '+d.depositPercentage+'% charged now');
      } else if(d.paymentType==='upon_fulfillment'){
        parts.push('Pay upon fulfillment');
      }
      return parts.join(' · ');
    }

    function run(){
      var pid=getProductId();
      if(!pid){ log('no product id'); return; }
      var vid=getVariantId();
      var shop=(window.Shopify&&Shopify.shop)||'';
      var url='${appUrl}/proxy?productId='+encodeURIComponent(pid);
      if(vid) url+='&variantId='+encodeURIComponent(vid);
      if(shop) url+='&shop='+encodeURIComponent(shop); // works even without App Proxy

      log('fetching', url);
      fetch(url,{credentials:'include'})
        .then(r=>r.json())
        .then(d=>{
          log('proxy resp', d);
          if(!d||!d.ok||!d.enabled){ return; }

          var btn=findAddToCartBtn();
          if(!btn){ log('no add-to-cart'); return; }

          updateButton(btn, 'Pre-order');
          insertMessage(buildMessage(d));
        })
        .catch(function(e){ log('error', e); });
    }

    // initial
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run);
    else run();

    // variant change re-check
    document.addEventListener('change', function(e){
      if(e.target && (e.target.name==='id' || e.target.closest('form[action*="/cart/add"]'))){
        setTimeout(run, 120);
      }
    });
  })();`);
});

module.exports = router;
