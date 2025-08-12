
import { settingsCollection } from "../shopify.js";

export async function getShopSettings(shop) {
  if (!shop) return null;
  return await settingsCollection.findOne({ shop });
}

export async function upsertShopSettings(shop, settings) {
  await settingsCollection.updateOne(
    { shop },
    { $set: { shop, ...settings, updatedAt: new Date() } },
    { upsert: true }
  );
}
