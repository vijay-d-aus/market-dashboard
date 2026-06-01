const express = require("express");
const cors = require("cors");
require("dotenv").config();

const marketRoutes = require("./routes/marketRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ success: true, message: "Backend server is running" });
});

app.use("/api", marketRoutes);

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});