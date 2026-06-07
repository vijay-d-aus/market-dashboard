const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const tickerClient = require("./socket/tickerClient");
const marketRoutes = require("./routes/marketRoutes");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend server is running"
  });
});

app.use("/api", marketRoutes);

io.on("connection", (frontendSocket) => {
  console.log("Frontend connected:", frontendSocket.id);

  frontendSocket.on("subscribe", (symbols) => {
    console.log("Frontend subscribed:", symbols);
    tickerClient.emit("subscribe", symbols);
  });

  frontendSocket.on("unsubscribe", (symbols) => {
    console.log("Frontend unsubscribed:", symbols);
    tickerClient.emit("unsubscribe", symbols);
  });

  frontendSocket.on("disconnect", () => {
    console.log("Frontend disconnected:", frontendSocket.id);
  });
});

tickerClient.on("ticker", (tick) => {
  console.log("Tick received:", tick.SYMBOL, tick.CLOSE);

  io.emit("ticker", tick);
});

const PORT = process.env.PORT || 5050;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
