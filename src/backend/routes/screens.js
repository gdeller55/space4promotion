import express from "express";

const router = express.Router();

let screens = [];

router.get("/", (req, res) => {
  res.json(screens);
});

router.post("/", (req, res) => {
  const newScreen = {
    id: Date.now().toString(),
    name: req.body.name || "New Screen",
    area_id: req.body.area_id || null,
    status: "online",
    paired: false,
    content: [],
    playlist: [],
    lastSeen: new Date().toISOString()
  };

  screens.push(newScreen);
  res.status(201).json(newScreen);
});

router.get("/:id", (req, res) => {
  const screen = screens.find((s) => s.id === req.params.id);

  if (!screen) {
    return res.status(404).json({ error: "Screen not found" });
  }

  res.json(screen);
});

router.put("/:id", (req, res) => {
  const index = screens.findIndex((s) => s.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Screen not found" });
  }

  screens[index] = {
    ...screens[index],
    ...req.body,
    lastSeen: new Date().toISOString()
  };

  res.json(screens[index]);
});

router.delete("/:id", (req, res) => {
  screens = screens.filter((s) => s.id !== req.params.id);
  res.json({ success: true });
});

export default router;