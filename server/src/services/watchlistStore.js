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
    position INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const tableColumns = db
  .prepare("PRAGMA table_info(watchlist)")
  .all()
  .map((column) => column.name);

if (!tableColumns.includes("position")) {
  db.exec("ALTER TABLE watchlist ADD COLUMN position INTEGER");
}

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
    .prepare(
      `SELECT symbol
       FROM watchlist
       ORDER BY position IS NULL ASC, position ASC, created_at ASC, symbol ASC`
    )
    .all()
    .map((row) => row.symbol);
};

const replaceWatchlist = (symbols) => {
  const normalizedSymbols = normalizeSymbols(symbols);
  const insertStatement = db.prepare(
    "INSERT INTO watchlist (symbol, position) VALUES (?, ?)"
  );

  db.exec("BEGIN");

  try {
    db.exec("DELETE FROM watchlist");
    normalizedSymbols.forEach((symbol, index) => {
      insertStatement.run(symbol, index);
    });
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
