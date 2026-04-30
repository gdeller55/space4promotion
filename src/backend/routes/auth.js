import express from "express";

const router = express.Router();

// For now: returns a fixed user so your frontend can load.
// Later we can add real login.
router.get("/me", (_req, res) => {
  res.json({ email: "admin@example.com" });
});

export default router;