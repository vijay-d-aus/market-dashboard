const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = require("./app");
const tickerClient = require("./socket/tickerClient");
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const socketSubscriptions = new Map();
const upstreamSubscriptions = new Set();

const normalizeSymbols = (symbols) => {
  const seen = new Set();
  const normalized = [];

  symbols.forEach((symbol) => {
    const value = String(symbol || "").trim().toUpperCase();

    if (value && !seen.has(value)) {
      seen.add(value);
      normalized.push(value);
    }
  });

  return normalized;
};

const hasSubscribersForSymbol = (symbol) => {
  for (const subscriptions of socketSubscriptions.values()) {
    if (subscriptions.has(symbol)) {
      return true;
    }
  }

  return false;
};

const subscribeUpstream = (symbols) => {
  const newSymbols = symbols.filter((symbol) => {
    return !upstreamSubscriptions.has(symbol);
  });

  if (newSymbols.length === 0) return;

  newSymbols.forEach((symbol) => upstreamSubscriptions.add(symbol));
  tickerClient.emit("subscribe", newSymbols);
};

const unsubscribeUpstream = (symbols) => {
  const unusedSymbols = symbols.filter((symbol) => {
    return upstreamSubscriptions.has(symbol) && !hasSubscribersForSymbol(symbol);
  });

  if (unusedSymbols.length === 0) return;

  unusedSymbols.forEach((symbol) => upstreamSubscriptions.delete(symbol));
  tickerClient.emit("unsubscribe", unusedSymbols);
};

io.on("connection", (frontendSocket) => {
  console.log("Frontend connected:", frontendSocket.id);
  socketSubscriptions.set(frontendSocket.id, new Set());

  frontendSocket.on("subscribe", (symbols) => {
    if (!Array.isArray(symbols)) {
      frontendSocket.emit("subscription_error", {
        message: "Subscribe payload must be an array of symbols"
      });
      return;
    }

    const normalizedSymbols = normalizeSymbols(symbols);
    const subscriptions = socketSubscriptions.get(frontendSocket.id);

    normalizedSymbols.forEach((symbol) => subscriptions.add(symbol));
    subscribeUpstream(normalizedSymbols);

    console.log("Frontend subscribed:", frontendSocket.id, normalizedSymbols);
  });

  frontendSocket.on("unsubscribe", (symbols) => {
    if (!Array.isArray(symbols)) {
      frontendSocket.emit("subscription_error", {
        message: "Unsubscribe payload must be an array of symbols"
      });
      return;
    }

    const normalizedSymbols = normalizeSymbols(symbols);
    const subscriptions = socketSubscriptions.get(frontendSocket.id);

    normalizedSymbols.forEach((symbol) => subscriptions.delete(symbol));
    unsubscribeUpstream(normalizedSymbols);

    console.log("Frontend unsubscribed:", frontendSocket.id, normalizedSymbols);
  });

  frontendSocket.on("disconnect", () => {
    const subscriptions = socketSubscriptions.get(frontendSocket.id) || new Set();

    socketSubscriptions.delete(frontendSocket.id);
    unsubscribeUpstream([...subscriptions]);

    console.log("Frontend disconnected:", frontendSocket.id);
  });
});

tickerClient.on("connect", () => {
  const symbols = [...upstreamSubscriptions];

  if (symbols.length > 0) {
    tickerClient.emit("subscribe", symbols);
  }
});

tickerClient.on("ticker", (tick) => {
  if (!tick?.SYMBOL || (tick.CLOSE === undefined && tick.LTP === undefined)) {
    console.log("Malformed tick skipped:", tick);
    return;
  }

  const symbol = String(tick.SYMBOL).trim().toUpperCase();
  let deliveredCount = 0;

  socketSubscriptions.forEach((subscriptions, socketId) => {
    if (!subscriptions.has(symbol)) return;

    io.to(socketId).emit("ticker", tick);
    deliveredCount += 1;
  });

  console.log(
    "Tick received:",
    symbol,
    tick.CLOSE ?? tick.LTP,
    "delivered to",
    deliveredCount,
    "client(s)"
  );
});

const PORT = process.env.PORT || 5050;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
