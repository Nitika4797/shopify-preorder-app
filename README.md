# Shopify Preorder App (Custom / Private)

A minimal **private** preorder app that:
- Shows a **Preorder** button when the selected variant is **out of stock**.
- Collects preorder requests (name, email, quantity, note) via **Shopify App Proxy**.
- Stores submissions in **MongoDB** and lists them in a simple **Admin** page.

**No OAuth required** (use Shopify *Custom App* in your store).
Works on **any theme** with a tiny Liquid snippet.

---

## 1) Deploy the backend (Render)

1. Create a new **Web Service** on https://render.com (Node).
2. Use this repo as your source (or upload zip).
3. Set **Build Command:** `npm install`
4. Set **Start Command:** `npm start`
5. Add **Environment variables** (Render → Settings → Environment):
   - `PORT` = `10000` (or let Render provide one; if so, remove PORT from .env)
   - `APP_HOST` = your Render URL, e.g. `https://shopify-preorder-app.onrender.com`
   - `MONGODB_URI` = your Mongo connection string
   - `APP_PASSWORD` = a password you choose for the admin page
   - `SHOPIFY_SHARED_SECRET` = your Shopify **App Proxy** shared secret (from your Custom app)

> After deploy, visit `${APP_HOST}/` and `${APP_HOST}/admin?key=APP_PASSWORD`

---

## 2) Create a *Custom app* in your Shopify store

1. In **Shopify Admin** → **Apps** → **Develop apps** → **Create an app** → name it e.g. `Preorder App`.
2. Open the app → **App setup** → **App proxy**:
   - **Subpath prefix:** `apps`
   - **Subpath:** `preorder`
   - **Proxy URL:** your Render base URL, e.g. `https://shopify-preorder-app.onrender.com`
   - Save → copy the **Shared secret** and add it to your backend `.env` as `SHOPIFY_SHARED_SECRET`.
3. (Optional) You do **not** need to request Admin API scopes for this basic version.

Now Shopify will route storefront requests from `/apps/preorder/...` to your server and sign them.

---

## 3) Add the Liquid snippet to your theme

In your theme code, include the following inside the product template (e.g. `main-product.liquid` or `product.liquid`) **below the product form** or at the bottom of the template so it loads on product pages only:

```liquid
{% if template.name == 'product' %}
  <script>
  window.__PREORDER = {
    product: {
      id: {{ product.id | json }},
      title: {{ product.title | json }},
      variants: [
        {% for v in product.variants %}
        {
          id: {{ v.id }},
          title: {{ v.title | json }},
          inventory: {{ v.inventory_quantity | default: 0 }},
          available: {{ v.available | json }}
        }{% unless forloop.last %},{% endunless %}
        {% endfor %}
      ]
    }
  };
  </script>
  <script src="/apps/preorder/proxy.js?shop={{ shop.permanent_domain }}"></script>
{% endif %}
```

> The script will **hide/disable** the normal Add to Cart button and show a **Preorder** button **only when** the selected variant is out-of-stock.

**Important:** If you want customers to checkout immediately (charge now), enable **Continue selling when out of stock** on the product/variant. If you only want to **collect interest** (no checkout), keep it disabled — this app collects entries only.

---

## 4) View submissions (Admin)

Open:
```
{APP_HOST}/admin?key=YOUR_APP_PASSWORD
```
Optional filter by shop:
```
{APP_HOST}/admin?key=YOUR_APP_PASSWORD&shop=your-store.myshopify.com
```

---

## 5) What counts as “out of stock”?
We treat a variant as OOS when:
- `variant.available` is false **OR**
- `inventory_quantity <= 0`

The app renders a **Preorder** button in that case.

---

## 6) Extending (next steps)

- **Email**: Add an email sender (e.g. Resend, SendGrid) in `POST /apps/preorder/preorders`.
- **Admin export**: Add CSV/Excel export route.
- **Order creation**: Use Admin API to create a draft order and invoice customers later.
- **HMAC**: We already validate App Proxy signatures. Keep your `SHOPIFY_SHARED_SECRET` safe.

---

## Local Dev

```
cp .env.example .env
# fill values

npm install
npm run dev
# then open http://localhost:10000/
```

Because App Proxy requires Shopify to sign requests, test proxy endpoints by appending `?signature=test` after temporarily disabling `requireProxyAuth` check (for local only).