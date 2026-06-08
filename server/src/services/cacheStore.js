const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DATA_DIR = path.join(__dirname, "../../data");
const DB_PATH = path.join(DATA_DIR, "market-dashboard.sqlite");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS cache_entries (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

const deleteExpired = () => {
  db.prepare("DELETE FROM cache_entries WHERE expires_at <= ?").run(Date.now());
};

const get = (key) => {
  const entry = db
    .prepare("SELECT value, expires_at FROM cache_entries WHERE key = ?")
    .get(key);

  if (!entry) return null;

  if (entry.expires_at <= Date.now()) {
    db.prepare("DELETE FROM cache_entries WHERE key = ?").run(key);
    return null;
  }

  try {
    return JSON.parse(entry.value);
  } catch (error) {
    db.prepare("DELETE FROM cache_entries WHERE key = ?").run(key);
    return null;
  }
};

const set = (key, value, ttlMs) => {
  const now = Date.now();

  db.prepare(
    `INSERT INTO cache_entries (key, value, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       expires_at = excluded.expires_at,
       updated_at = excluded.updated_at`
  ).run(key, JSON.stringify(value), now + ttlMs, now, now);
};

const getOrSet = async (key, ttlMs, producer) => {
  const cached = get(key);

  if (cached !== null) {
    return cached;
  }

  const freshValue = await producer();
  set(key, freshValue, ttlMs);

  return freshValue;
};

deleteExpired();

module.exports = {
  get,
  set,
  getOrSet,
  deleteExpired
};
