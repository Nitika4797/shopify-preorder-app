const express = require('express');
const router = express.Router();

router.get('/script.js', (req, res) => {
  res.set('Content-Type', 'application/javascript');
  const appUrl = (process.env.SHOPIFY_APP_URL || '').replace(/\/$/, '');

  res.send(`(function(){
    function getProductId(){
      try{
        var el=document.querySelector('script[type="application/ld+json"]');
        if(el){
          var data=JSON.parse(el.textContent||'{}');
          if(data && data['@type']==='Product' && data['@id']){
            var parts=String(data['@id']).split('/');
            return parts[parts.length-1]||null;
          }
        }
      }catch(e){}
      if(window.meta && meta.product && meta.product.id) return meta.product.id;
      if(window.ShopifyAnalytics && ShopifyAnalytics.meta && ShopifyAnalytics.meta.product && ShopifyAnalytics.meta.product.id) return ShopifyAnalytics.meta.product.id;
      return null;
    }
    function getVariantId(){
      try{
        if(window.ShopifyAnalytics && ShopifyAnalytics.meta && ShopifyAnalytics.meta.selectedVariantId) return ShopifyAnalytics.meta.selectedVariantId;
        var sel=document.querySelector('form[action*="/cart/add"] [name="id"]');
        if(sel && sel.value) return sel.value;
      }catch(e){}
      return null;
    }
    function findBtn(){
      return document.querySelector('form[action*="/cart/add"] [type="submit"], button[name="add"], button[type="submit"]');
    }
    function insertMsg(html){
      var target=document.querySelector('form[action*="/cart/add"]')||document.querySelector('product-form')||document.body;
      var div=document.createElement('div');
      div.style.margin='8px 0';
      div.style.padding='10px';
      div.style.border='1px dashed #aaa';
      div.style.fontSize='14px';
      div.innerHTML=html;
      target.parentNode.insertBefore(div, target);
    }

    function refresh(){
      var pid=getProductId();
      if(!pid) return;
      var vid=getVariantId();
      var shop=(window.Shopify&&Shopify.shop)||'';

      var url='${appUrl}/proxy?productId='+encodeURIComponent(pid);
      if(vid) url+='&variantId='+encodeURIComponent(vid);
      if(shop) url+='&shop='+encodeURIComponent(shop); // testing outside proxy

      fetch(url,{credentials:'include'})
        .then(r=>r.json())
        .then(d=>{
          if(!d||!d.ok||!d.enabled) return;
          var btn=findBtn(); if(btn) btn.textContent='Pre-order';

          var parts=[];
          if(d.message) parts.push(d.message);
          if(d.shipDate) parts.push('Estimated ship date: '+new Date(d.shipDate).toDateString());
          if(d.limit!=null) parts.push('Limit: '+d.limit+' preorders');
          if(d.paymentType==='deposit' && d.depositPercentage!=null){
            parts.push('Deposit: '+d.depositPercentage+'% charged now');
          } else if(d.paymentType==='upon_fulfillment'){
            parts.push('Pay upon fulfillment');
          }
          insertMsg(parts.join(' · '));
        })
        .catch(function(e){console.warn('preorder script error', e);});
    }

    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', refresh);
    else refresh();

    // also watch variant changes
    document.addEventListener('change', function(e){
      if(e.target && (e.target.name==='id' || e.target.closest('form[action*="/cart/add"]'))) {
        setTimeout(refresh, 100);
      }
    });
  })();`);
});

module.exports = router;
