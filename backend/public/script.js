(function () {
    console.log('[Preorder App] Script loaded');

    // --- CONFIG ---
    const APP_URL = "https://shopify-preorder-app.onrender.com"; // backend base URL

    // Utility: Get current product & variant IDs from Shopify global object
    function getProductAndVariantId() {
        try {
            if (window.meta && window.meta.product && window.meta.product.id) {
                const productId = window.meta.product.id;
                const variantId = window.meta.product.variants?.[0]?.id || null;
                return { productId, variantId };
            }
            if (window.ShopifyAnalytics && window.ShopifyAnalytics.meta) {
                const meta = window.ShopifyAnalytics.meta;
                return {
                    productId: meta.product.id,
                    variantId: meta.selectedVariantId || meta.product.variants?.[0]?.id || null
                };
            }
        } catch (err) {
            console.error('[Preorder App] Error reading product data', err);
        }
        return { productId: null, variantId: null };
    }

    // Inject Preorder button
    function injectPreorderButton(message) {
        const form = document.querySelector('form[action*="/cart/add"]');
        if (!form) return console.warn('[Preorder App] No product form found');

        let btn = form.querySelector('.preorder-btn');
        if (!btn) {
            btn = document.createElement('button');
            btn.type = 'submit';
            btn.className = 'preorder-btn';
            btn.style.cssText = "background:#000;color:#fff;padding:12px 20px;border:none;cursor:pointer;width:100%;";
            form.appendChild(btn);
        }
        btn.innerText = message || "Pre-order Now";
    }

    // Fetch preorder config from backend
    async function checkPreorder(productId, variantId) {
        try {
            const shop = window.Shopify?.shop || window.location.hostname;
            const url = `${APP_URL}/proxy?productId=${productId}&variantId=${variantId}&shop=${shop}`;
            const res = await fetch(url, {
                credentials: "include"
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (data && data.enabled) {
                console.log('[Preorder App] Preorder active for product', data);
                injectPreorderButton(data.message);
            } else {
                console.log('[Preorder App] Preorder not enabled for this product');
            }
        } catch (err) {
            console.error('[Preorder App] Failed to fetch preorder config', err);
        }
    }

    // Run script when DOM ready
    document.addEventListener('DOMContentLoaded', function () {
        const { productId, variantId } = getProductAndVariantId();
        if (!productId) {
            console.warn('[Preorder App] Product ID not found, skipping');
            return;
        }
        checkPreorder(productId, variantId);
    });
})();
