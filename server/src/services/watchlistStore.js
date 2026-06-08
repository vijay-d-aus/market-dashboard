const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DATA_DIR = path.join(__dirname, "../../data");
const DB_PATH = path.join(DATA_DIR, "market-dashboard.sqlite");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS watchlist (
    symbol TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const normalizeSymbol = (symbol) => {
  return String(symbol || "").trim().toUpperCase();
};

const normalizeSymbols = (symbols) => {
  const seen = new Set();
  const normalized = [];

  symbols.forEach((symbol) => {
    const value = normalizeSymbol(symbol);

    if (value && !seen.has(value)) {
      seen.add(value);
      normalized.push(value);
    }
  });

  return normalized;
};

const getWatchlist = () => {
  return db
    .prepare("SELECT symbol FROM watchlist ORDER BY created_at ASC, symbol ASC")
    .all()
    .map((row) => row.symbol);
};

const replaceWatchlist = (symbols) => {
  const normalizedSymbols = normalizeSymbols(symbols);
  const insertStatement = db.prepare(
    "INSERT INTO watchlist (symbol) VALUES (?)"
  );

  db.exec("BEGIN");

  try {
    db.exec("DELETE FROM watchlist");
    normalizedSymbols.forEach((symbol) => insertStatement.run(symbol));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return normalizedSymbols;
};

module.exports = {
  getWatchlist,
  replaceWatchlist
};
