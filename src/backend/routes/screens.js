const express = require("express");
const router = express.Router();

// Temporary test route
router.get("/", async (req, res) => {
  res.json([
    { id: 1, name: "Screen 1", area_id: 1 },
    { id: 2, name: "Screen 2", area_id: 2 }
  ]);
});

module.exports = router;