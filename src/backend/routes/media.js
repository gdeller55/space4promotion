import express from "express";
import { pool } from "../db.js";

const router = express.Router();

// GET /media
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM media ORDER BY title ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;