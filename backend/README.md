
# Shopify Preorder App (Backend)

Minimal backend that:
- Handles OAuth with Shopify
- Saves shop access token to MongoDB
- Injects a ScriptTag pointing to `/script.js` (no theme edits)
- Provides a tiny Admin UI at `/admin` to toggle preorder for a product/variant
- Front-end script replaces “Sold out” with “Pre‑order” and allows purchase when inventory is 0

## Environment variables

Set these in Render:
```
SHOPIFY_API_KEY=your_client_id
SHOPIFY_API_SECRET=your_client_secret
SHOPIFY_SCOPES=read_products,write_products,read_inventory,write_inventory,read_script_tags,write_script_tags
SHOPIFY_APP_URL=https://your-app.onrender.com
MONGODB_URI=your_mongodb_uri
PORT=10000
```

## Start
```
npm install
npm start
```

Visit:
- `/api/auth?shop=STORE.myshopify.com` to install
- `/admin?shop=STORE.myshopify.com` to manage a product
- `/healthz` for health
```
