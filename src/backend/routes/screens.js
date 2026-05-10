import express from "express";

const router = express.Router();

// Temporary in-memory screen storage
let screens = [
  { id: 1, name: "Screen 1", area_id: 1 },
  { id: 2, name: "Screen 2", area_id: 2 }
];

// GET all screens
router.get("/", async (req, res) => {
  res.json(screens);
});

// POST create/register new screen
router.post("/", async (req, res) => {
  try {
    const newScreen = {
      id: Date.now(),
      name: req.body.name || "New Screen",
      area_id: req.body.area_id || null
    };

    screens.push(newScreen);

    res.status(201).json(newScreen);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to register screen"
    });
  }
});

export default router;