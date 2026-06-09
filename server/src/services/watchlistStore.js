const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DATA_DIR = path.join(__dirname, "../../data");
const DB_PATH = path.join(DATA_DIR, "market-dashboard.sqlite");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS watchlist_items (
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    position INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, symbol)
  );

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

const normalizeUserId = (userId) => {
  return String(userId || "demo-user").trim() || "demo-user";
};

const migrateDefaultWatchlist = () => {
  const existingCount = db
    .prepare("SELECT COUNT(*) AS count FROM watchlist_items")
    .get().count;

  if (existingCount > 0) return;

  const legacyRows = db
    .prepare(
      `SELECT symbol, position, created_at
       FROM watchlist
       ORDER BY position IS NULL ASC, position ASC, created_at ASC, symbol ASC`
    )
    .all();

  const insertStatement = db.prepare(
    `INSERT OR IGNORE INTO watchlist_items
       (user_id, symbol, position, created_at)
     VALUES ('demo-user', ?, ?, ?)`
  );

  legacyRows.forEach((row, index) => {
    insertStatement.run(row.symbol, row.position ?? index, row.created_at);
  });
};

migrateDefaultWatchlist();

const getWatchlist = (userId) => {
  const normalizedUserId = normalizeUserId(userId);

  return db
    .prepare(
      `SELECT symbol
       FROM watchlist_items
       WHERE user_id = ?
       ORDER BY position IS NULL ASC, position ASC, created_at ASC, symbol ASC`
    )
    .all(normalizedUserId)
    .map((row) => row.symbol);
};

const replaceWatchlist = (userId, symbols) => {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedSymbols = normalizeSymbols(symbols);
  const insertStatement = db.prepare(
    "INSERT INTO watchlist_items (user_id, symbol, position) VALUES (?, ?, ?)"
  );

  db.exec("BEGIN");

  try {
    db.prepare("DELETE FROM watchlist_items WHERE user_id = ?").run(normalizedUserId);
    normalizedSymbols.forEach((symbol, index) => {
      insertStatement.run(normalizedUserId, symbol, index);
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
