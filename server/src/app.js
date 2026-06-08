const express = require("express");
const cors = require("cors");

const marketRoutes = require("./routes/marketRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend server is running"
  });
});

app.use("/api", marketRoutes);

module.exports = app;
