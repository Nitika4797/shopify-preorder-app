
import dotenv from "dotenv";
import { shopifyApp, LATEST_API_VERSION } from "@shopify/shopify-app-express";
import { MongoDBSessionStorage } from "@shopify/shopify-app-session-storage-mongodb";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-07";
import { MongoClient } from "mongodb";
import { getShopSettings } from "./lib/shopSettings.js";

dotenv.config();

const {
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,
  SCOPES,
  HOST,
  MONGODB_URI
} = process.env;

export const mongoClient = new MongoClient(MONGODB_URI);
await mongoClient.connect();
export const db = mongoClient.db(process.env.MONGODB_DB || "preorder_app");
export const settingsCollection = db.collection("settings");

const sessionStorage = new MongoDBSessionStorage(mongoClient, {
  databaseName: process.env.MONGODB_DB || "preorder_app",
});

const shopify = shopifyApp({
  api: {
    apiKey: SHOPIFY_API_KEY,
    apiSecretKey: SHOPIFY_API_SECRET,
    apiVersion: LATEST_API_VERSION,
    scopes: (SCOPES || "write_products,read_products,write_script_tags,read_themes,read_orders,write_orders").split(","),
    restResources
  },
  auth: {
    path: "/auth",
    callbackPath: "/auth/callback",
  },
  sessionStorage,
  webhooks: {
    path: "/webhooks"
  }
});

export default shopify;

// Utilities

export async function registerWebhooks(shop, accessToken) {
  const topics = [
    {topic: "APP_UNINSTALLED", address: "/webhooks"},
  ];
  for (const t of topics) {
    try {
      await shopify.api.webhooks.register({
        session: { shop, accessToken },
        registrations: [{
          topic: t.topic,
          path: t.address
        }]
      });
    } catch (e) {
      console.error("Webhook register error", e);
    }
  }
}

// Ensure storefront ScriptTag is installed so our JS runs on PDP
export async function ensureScriptTag(session) {
  try {
    const client = new shopify.api.clients.Rest({ session });
    const src = `${process.env.HOST}/script/storefront.js`;

    const list = await client.get({ path: "script_tags" });
    const exists = (list?.body?.script_tags || []).some(s => (s.src||"").startswith(src));

    if (!exists) {
      await client.post({
        path: "script_tags",
        data: {
          script_tag: {
            event: "onload",
            src
          }
        },
        type: "application/json"
      });
    }
  } catch (e) {
    console.error("ensureScriptTag error", e);
  }
}

// Helper to toggle variant inventory policy
export async function setVariantInventoryPolicy(session, variantId, policy) {
  const client = new shopify.api.clients.Rest({ session });
  return await client.put({
    path: `variants/${variantId}`,
    data: { variant: { id: variantId, inventory_policy: policy } },
    type: "application/json"
  });
}

// Fetch shop settings with fallback defaults
export async function getSettingsForShop(shop) {
  const s = await getShopSettings(shop);
  return {
    enableAuto: s?.enableAuto ?? true,
    buttonText: s?.buttonText ?? "Preorder",
    badgeText: s?.badgeText ?? "Preorder",
    noteText: s?.noteText ?? "This item is on preorder. Ships soon.",
    shipEta: s?.shipEta ?? "",
    autoRevert: s?.autoRevert ?? false
  };
}
