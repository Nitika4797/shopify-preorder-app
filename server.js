
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import {fileURLToPath} from "url";
import bodyParser from "body-parser";
import cookieSession from "cookie-session";
import shopify, { registerWebhooks, ensureScriptTag } from "./shopify.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import proxyRoutes from "./routes/proxy.js";
import scriptRoutes from "./routes/script.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieSession({
  name: "session",
  keys: [process.env.SESSION_SECRET || "dev_secret"],
  maxAge: 7*24*60*60*1000,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production"
}));

// Static (for admin page styles)
app.use("/public", express.static(path.join(__dirname, "public")));

// Auth + Install
app.use("/auth", authRoutes);

// Admin UI (embedded)
app.use("/admin", shopify.validateAuthenticatedSession(), adminRoutes);

// App Proxy & Storefront Script
router.get("/config", async (req,res)=>{ ... }); // <-- yahi /apps/preorder/config serve karta hai

app.use("/script", scriptRoutes);

// Health
app.get("/", (req,res)=>res.send("Preorder App is running ✔"));

// After app starts, show helpful logs
app.listen(PORT, async () => {
  console.log(`Running on http://localhost:${PORT}`);
});
