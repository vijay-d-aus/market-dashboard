const { io } = require("socket.io-client");

console.log("tickerClient loaded");

const tickerClient = io("https://mock-data.tealvue.in", {
  transports: ["websocket"]
});

tickerClient.on("connect", () => {
  console.log("Connected to ticker");
});

tickerClient.on("connect_error", (error) => {
  console.log("Ticker connection error:", error.message);
});

module.exports = tickerClient;