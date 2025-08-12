
# Shopify Preorder App (Node + Express)

A minimal but working Preorder app you can host for free (Render) and sell to clients.
- Auto-switches out-of-stock products to **Preorder** (updates variant `inventory_policy` to `continue`).
- Installs a **ScriptTag** to change the PDP "Add to cart" button to "Preorder" + badge/note.
- Simple embedded **Admin dashboard** to control text and behavior.
- **App Proxy** to provide config + an endpoint to enable preorder for a variant on demand.

## 1) What it does (flow)
1. Merchant installs the app (OAuth).
2. On install, the app auto-adds a ScriptTag pointing to `/script/storefront.js`.
3. On the storefront, when a product variant is **out of stock**, the script:
   - Switches the button label to **Preorder**,
   - Shows a badge/note,
   - Sends a POST to `/apps/preorder/enable` to set `inventory_policy=continue` for that variant (so it can be ordered).

Orders contain a line item property `Preorder=true (ETA …)` to let staff filter them.

---

## 2) Prerequisites
- **Shopify Partner** account
- A test or live store where you can install custom apps
- **MongoDB Atlas (Free Tier)** connection string
- A public host (e.g., **Render** free web service)

---

## 3) Local Setup (optional)
```bash
git clone <your-repo>
cd shopify-preorder-app
cp .env.example .env  # fill values
npm install
npm run dev
# Visit http://localhost:3000/auth?shop=your-store.myshopify.com
```

---

## 4) Deploy on Render (free)
1. Push this folder to a **GitHub** repo.
2. Create a new **Web Service** on Render:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment: add all **.env** keys (from `.env.example`), especially `HOST` as your Render URL.
3. After deploy, copy your live URL, e.g. `https://your-app.onrender.com` and set `HOST` to it.

---

## 5) Create the Shopify app in Partners
1. Go to **Apps → Create app → Custom app**.
2. **App URL**: `https://YOUR-HOST/auth`
3. **Allowed redirection URL(s)**: `https://YOUR-HOST/auth/callback`
4. **App Proxy** (Apps → Your App → App setup → **App proxy**):
   - Subpath prefix: `apps`
   - Subpath: `preorder`
   - Proxy URL: `https://YOUR-HOST/apps/preorder`
5. Scopes to request:  
   `write_products,read_products,write_script_tags,read_themes,read_orders,write_orders`
6. **Install** the app by visiting:  
   `https://your-store.myshopify.com/admin/oauth/authorize?client_id=APP_KEY&scope=SCOPES&redirect_uri=https://YOUR-HOST/auth/callback`  
   (or simply go to `https://YOUR-HOST/auth?shop=your-store.myshopify.com`).

---

## 6) How to test
- Open a product with **0 inventory** and "Deny" selling when out of stock.  
- Visit that product page on the storefront:
  - The **Add to Cart** changes to **Preorder**.
  - A badge/note appears.
  - App POSTs to `/apps/preorder/enable` → variant `inventory_policy` becomes **continue**.
  - When adding to cart, a line-item property `Preorder` is attached.

If the ScriptTag didn’t install (rare), you can **manually** add this to `theme.liquid` before `</body>`:
```html
<script src="https://YOUR-HOST/script/storefront.js"></script>
```

---

## 7) Admin Dashboard
- Go to `https://YOUR-HOST/admin?shop=your-store.myshopify.com` (opens inside Shopify Admin)
- Configure button text, badge text, preorder note, ETA date, and auto-enable behavior.

---

## 8) Notes & Limitations
- The app sets `inventory_policy=continue` on the variant so preorder can be purchased.
- If you enable `autoRevert`, you'll need an additional job/webhook logic to flip back to `deny` when inventory > 0 (left as an exercise).
- For strict themes, availability selectors differ; the provided script uses common selectors. Customize if needed.

---

## 9) Uninstall Handling
- Webhook `APP_UNINSTALLED` is registered; you can expand the handler to clean settings & ScriptTags.

---

## 10) Support
If you run into issues, check server logs on Render and ensure:
- `HOST` is **https** and publicly reachable,
- App Proxy is correctly configured,
- Scopes include **write_script_tags** and **write_products**,
- MongoDB URI is valid and accessible from Render.
