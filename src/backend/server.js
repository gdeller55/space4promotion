import express from "express";
import cors from "cors";

import screensRoutes from "./routes/screens.js";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/screens", screensRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});