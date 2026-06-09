const crypto = require("node:crypto");
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DATA_DIR = path.join(__dirname, "../../data");
const DB_PATH = path.join(DATA_DIR, "market-dashboard.sqlite");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS auth_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

const normalizeUserId = (userId) => {
  return String(userId || "").trim().toLowerCase().slice(0, 64);
};

const hashPassword = (password, salt) => {
  return crypto.scryptSync(password, salt, 64).toString("hex");
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const createToken = (userId) => {
  const token = crypto.randomBytes(32).toString("hex");

  db.prepare(
    "INSERT INTO auth_tokens (token_hash, user_id) VALUES (?, ?)"
  ).run(hashToken(token), userId);

  return token;
};

const serializeUser = (row) => ({
  id: row.id,
  created_at: row.created_at
});

const getUserById = (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(normalizedUserId);

  return row ? serializeUser(row) : null;
};

const register = ({ userId, password }) => {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedPassword = String(password || "");

  if (!normalizedUserId) {
    return {
      error: "Username is required"
    };
  }

  if (!/^[a-z0-9._-]+$/.test(normalizedUserId)) {
    return {
      error: "Username can use letters, numbers, dots, dashes, and underscores"
    };
  }

  if (normalizedPassword.length < 6) {
    return {
      error: "Password must be at least 6 characters"
    };
  }

  if (getUserById(normalizedUserId)) {
    return {
      error: "User already exists"
    };
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(normalizedPassword, salt);

  db.prepare(
    "INSERT INTO users (id, password_hash, password_salt) VALUES (?, ?, ?)"
  ).run(normalizedUserId, passwordHash, salt);

  return login({
    userId: normalizedUserId,
    password: normalizedPassword
  });
};

const login = ({ userId, password }) => {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedPassword = String(password || "");
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(normalizedUserId);

  if (!row) {
    return {
      error: "Invalid username or password"
    };
  }

  const expectedHash = Buffer.from(row.password_hash, "hex");
  const actualHash = Buffer.from(
    hashPassword(normalizedPassword, row.password_salt),
    "hex"
  );

  if (
    expectedHash.length !== actualHash.length ||
    !crypto.timingSafeEqual(expectedHash, actualHash)
  ) {
    return {
      error: "Invalid username or password"
    };
  }

  return {
    user: serializeUser(row),
    token: createToken(row.id)
  };
};

const getUserByToken = (token) => {
  const normalizedToken = String(token || "").trim();

  if (!normalizedToken) return null;

  const row = db
    .prepare(
      `SELECT users.*
       FROM auth_tokens
       JOIN users ON users.id = auth_tokens.user_id
       WHERE auth_tokens.token_hash = ?`
    )
    .get(hashToken(normalizedToken));

  return row ? serializeUser(row) : null;
};

const revokeToken = (token) => {
  const normalizedToken = String(token || "").trim();

  if (!normalizedToken) return;

  db.prepare("DELETE FROM auth_tokens WHERE token_hash = ?").run(
    hashToken(normalizedToken)
  );
};

module.exports = {
  getUserByToken,
  login,
  register,
  revokeToken
};
