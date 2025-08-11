const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (quick uptime probe)
app.get("/healthz", (_req, res) => res.send("OK"));


// Root: if opened directly, show a hint
app.get("/", (req, res) => {
  const { shop } = req.query;
  if (shop) return res.redirect(`/api/auth?shop=${shop}`);
  res.status(200).send("Preorder app is running. Add ?shop=your-store.myshopify.com to begin auth.");
});

// Routes
app.use('/', require('./routes/preorders'));  
app.use("/api/auth", require("./routes/auth"));
app.use("/api/preorders", require("./routes/preorders"));
app.use("/api/webhooks", require("./routes/webhooks"));
app.use('/', require('./routes/admin'));  // serves /admin


// Error handling
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong!" });
});

// ---- Mongo + server start (IMPORTANT) ----
const mongoUri = process.env.MONGODB_URI; // must be set on Render

if (!mongoUri) {
  console.error("MONGODB_URI is not set!");
  process.exit(1);
}

mongoose
  .connect(mongoUri, {
    dbName: "preorder",
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, "0.0.0.0", () => console.log(`Listening on ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

module.exports = app;
