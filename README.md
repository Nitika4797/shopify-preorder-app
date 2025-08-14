
# Preorder App for Shopify (Custom App, Node/Express)

This app automatically switches variants to **Continue selling when out of stock** when inventory reaches 0, and it adds a **Preorder** experience on product pages (button text + message + line‑item property) via an **App Proxy** script.

---

## 1) What you get

- ✅ Node 18 + Express server ready for Render/any host
- ✅ Webhook endpoint for `inventory_levels/update`
- ✅ Auto-update variants to `inventory_policy: continue` when quantity <= 0
- ✅ App Proxy endpoint serving `/apps/preorder/preorder.js`
- ✅ Lightweight Admin status page at `/admin`
- ✅ No OAuth required (uses your one-store **Custom App** Admin API token)

---

## 2) Shopify Admin setup (once per store)

1. In your store admin: **Apps → Develop apps → Create an app**  
   App name: “Preorder app for Shopify”

2. **Configure Admin API scopes** and then **Install app**.  
   Required scopes:
   - `read_products`, `write_products`
   - `read_inventory`

3. After install, copy the **Admin API access token** and **API secret key**.  
   You’ll put these in your server `.env`.

4. (Webhooks) In your app → **Configure** → **Events** (or **Webhooks**) → Add:
   - **Topic:** `inventory_levels/update`  
   - **Destination:** HTTP  
   - **URL:** `https://YOUR-APP-URL/webhooks/inventory`  
   - **Format:** JSON

5. (App Proxy) In your app → **App setup** → **App proxy**:
   - **Subpath prefix:** `apps`
   - **Subpath:** `preorder`
   - **Proxy URL:** `https://YOUR-APP-URL/proxy`
   - Save. (Signing is optional; this app does not require it.)

---

## 3) Deploy (Render example)

1. Create a new **Web Service** on Render (Node 18).  
2. Build command: `npm install`  
   Start command: `npm start`

3. Add **Environment Variables**:
   - `SHOP=your-store.myshopify.com`
   - `ADMIN_API_ACCESS_TOKEN=shpat_...`  (from step 3 above)
   - `API_SECRET=...`                    (from step 3 above)
   - `APP_URL=https://your-render-app.onrender.com`
   - *(optional)* `PREORDER_BTN_TEXT=Preorder Now`
   - *(optional)* `PREORDER_MESSAGE=This item is on preorder. We will ship as soon as it restocks.`

4. Open `https://YOUR-APP-URL/admin` to confirm it’s running.

---

## 4) Add the storefront script

In your theme (Online Store → Themes → Edit code), open **`layout/theme.liquid`** and add before `</head>`:

```liquid
<script src="https://{{ shop.domain }}/apps/preorder/preorder.js"></script>
```

> This loads the app-proxied JavaScript that:
> - Detects the selected variant
> - If **sold out**, changes the **Add to cart** button text to your preorder text
> - Adds a line‑item property `Preorder=true`
> - Shows a small preorder message

> **Tip:** Orders that contain preorders will show `Preorder: true` in the line item properties.

---

## 5) How it works (auto “continue selling”)

- Shopify sends **`inventory_levels/update`** -> our webhook checks if **available <= 0**.
- If yes, we look up all variants with that `inventory_item_id` and switch their `inventory_policy` to **`continue`**.
- This allows your theme’s cart form to accept the item even when it’s sold out.

**Manual test:** In Shopify admin, set any one variant’s **Inventory policy** to **Continue selling when out of stock**, set its quantity to 0, and view the product page. The button should flip to “Preorder Now” and orders will include a `Preorder` property.

---

## 6) Troubleshooting

- **Script not loading on product page?**  
  Double-check the App Proxy path and that you used your **store domain** in the script src.
- **Still can’t add to cart when sold out?**  
  Confirm the variant’s **Inventory policy** is `Continue selling when out of stock`. The webhook should set this automatically after the next inventory update, but you can set it manually for testing.
- **Webhook 401 (HMAC failed)?**  
  Ensure `API_SECRET` in your server matches the app’s **API secret key** in Shopify Admin.
- **Multiple locations?**  
  The webhook triggers per inventory item/location; the app updates the variant regardless of location.

---

## 7) Local run (optional)

```bash
cp .env.example .env
# fill SHOP, ADMIN_API_ACCESS_TOKEN, API_SECRET, APP_URL
npm install
npm start
# open http://localhost:10000/admin
```

---

## 8) Uninstall / remove

- Remove the `<script>` tag from your theme.
- Delete the webhook subscription from the app settings.
- Remove the Render service.

---

**That’s it.** You can now sell out-of-stock items as **Preorders** with a single lightweight app.
