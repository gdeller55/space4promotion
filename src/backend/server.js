import screensRoutes from "./routes/screens.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import layoutZoneRoutes from "./routes/layoutZones.js";
import playlistRoutes from "./routes/playlists.js";
import mediaRoutes from "./routes/media.js";

dotenv.config();

const app = express();

// Allow your frontend to call this API from the browser.
// For now we keep it simple and allow all origins.
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/auth", authRoutes);
app.use("/layout-zones", layoutZoneRoutes);
app.use("/playlists", playlistRoutes);
app.use("/media", mediaRoutes);

// Health check (useful for testing)
app.get("/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));