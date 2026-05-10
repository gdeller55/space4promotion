import express from "express";

const router = express.Router();

// Temporary memory database
let screens = [];

// GET all screens
router.get("/", (req, res) => {
  res.json(screens);
});

// GET one screen
router.get("/:id", (req, res) => {
  const screen = screens.find(
    (s) => s.id === Number(req.params.id)
  );

  if (!screen) {
    return res.status(404).json({
      error: "Screen not found"
    });
  }

  res.json(screen);
});

// CREATE screen
router.post("/", (req, res) => {
  const newScreen = {
    id: Date.now(),
    name: req.body.name || "New Screen",
    area_id: req.body.area_id || null,
    paired: false,
    status: "online",
    content: []
  };

  screens.push(newScreen);

  res.status(201).json(newScreen);
});

// UPDATE screen
router.put("/:id", (req, res) => {
  const index = screens.findIndex(
    (s) => s.id === Number(req.params.id)
  );

  if (index === -1) {
    return res.status(404).json({
      error: "Screen not found"
    });
  }

  screens[index] = {
    ...screens[index],
    ...req.body
  };

  res.json(screens[index]);
});

// DELETE screen
router.delete("/:id", (req, res) => {
  screens = screens.filter(
    (s) => s.id !== Number(req.params.id)
  );

  res.json({
    success: true
  });
});

export default router;