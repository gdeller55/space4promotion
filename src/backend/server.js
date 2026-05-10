import express from "express";
import cors from "cors";

import screensRoutes from "./routes/screens.js";

const app = express();
const PORT = 5000;

app.use(cors({
  origin: [
    "https://space4promotion.vercel.app",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());


// Routes
app.use("/api/screens", screensRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});