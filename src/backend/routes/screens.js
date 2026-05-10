import express from "express";

const router = express.Router();

// Persistent temp memory
const screens = {};

// GET all screens
router.get("/", (req, res) => {
  res.json(Object.values(screens));
});

// GET one screen
router.get("/:id", (req, res) => {
  const screen = screens[req.params.id];

  if (!screen) {
    return res.status(404).json({
      error: "Screen not found"
    });
  }

  res.json(screen);
});

// CREATE screen
router.post("/", (req, res) => {
  const id = Date.now().toString();

  const newScreen = {
    id,
    name: req.body.name || "New Screen",
    area_id: null,
    paired: false,
    status: "online",
    playlist: [],
    content: [],
    lastSeen: new Date().toISOString()
  };

  screens[id] = newScreen;

  console.log("Registered screen:", newScreen);

  res.status(201).json(newScreen);
});

// UPDATE screen
router.put("/:id", (req, res) => {
  const screen = screens[req.params.id];

  if (!screen) {
    return res.status(404).json({
      error: "Screen not found"
    });
  }

  screens[req.params.id] = {
    ...screen,
    ...req.body,
    lastSeen: new Date().toISOString()
  };

  res.json(screens[req.params.id]);
});

// DELETE screen
router.delete("/:id", (req, res) => {
  delete screens[req.params.id];

  res.json({
    success: true
  });
});

export default router;