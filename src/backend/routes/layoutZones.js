import express from "express";
import { pool } from "../db.js";

const router = express.Router();

// GET /layout-zones?layout_id=UUID
router.get("/", async (req, res) => {
  try {
    const { layout_id } = req.query;
    if (!layout_id) return res.status(400).json({ error: "layout_id is required" });

    const result = await pool.query(
      "SELECT * FROM layout_zones WHERE layout_id = $1 ORDER BY COALESCE(z_index, 0) ASC",
      [layout_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /layout-zones
router.post("/", async (req, res) => {
  try {
    const data = req.body || {};
    const keys = Object.keys(data);
    const values = Object.values(data);

    if (keys.length === 0) return res.status(400).json({ error: "No data provided" });

    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const query = `
      INSERT INTO layout_zones (${keys.join(", ")})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /layout-zones/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body || {};
    const keys = Object.keys(data);
    const values = Object.values(data);

    if (keys.length === 0) return res.status(400).json({ error: "No data provided" });

    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const query = `
      UPDATE layout_zones
      SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;

    const result = await pool.query(query, [...values, id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /layout-zones/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM layout_zones WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;