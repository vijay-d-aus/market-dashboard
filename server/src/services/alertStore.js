const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DATA_DIR = path.join(__dirname, "../../data");
const DB_PATH = path.join(DATA_DIR, "market-dashboard.sqlite");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS price_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'legacy-user',
    symbol TEXT NOT NULL,
    target REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    delivery_status TEXT NOT NULL DEFAULT 'pending',
    triggered_price REAL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    triggered_at TEXT
  );

  CREATE TABLE IF NOT EXISTS price_alert_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id INTEGER NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'legacy-user',
    symbol TEXT NOT NULL,
    target REAL NOT NULL,
    event_type TEXT NOT NULL,
    price REAL,
    delivery_status TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alert_id) REFERENCES price_alerts(id)
  );
`);

const ensureColumn = (tableName, columnName, definition) => {
  const columns = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .map((column) => column.name);

  if (!columns.includes(columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

ensureColumn("price_alerts", "user_id", "TEXT NOT NULL DEFAULT 'legacy-user'");
ensureColumn(
  "price_alert_history",
  "user_id",
  "TEXT NOT NULL DEFAULT 'legacy-user'"
);

const normalizeAlert = (row, history = []) => ({
  id: row.id,
  user_id: row.user_id,
  symbol: row.symbol,
  target: row.target,
  status: row.status,
  delivery_status: row.delivery_status,
  triggered_price: row.triggered_price,
  created_at: row.created_at,
  triggered_at: row.triggered_at,
  history
});

const normalizeHistory = (row) => ({
  id: row.id,
  alert_id: row.alert_id,
  user_id: row.user_id,
  symbol: row.symbol,
  target: row.target,
  event_type: row.event_type,
  price: row.price,
  delivery_status: row.delivery_status,
  created_at: row.created_at
});

const getHistoryForAlert = (alertId) => {
  return db
    .prepare(
      `SELECT *
       FROM price_alert_history
       WHERE alert_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(alertId)
    .map(normalizeHistory);
};

const getAlertById = (alertId) => {
  const row = db.prepare("SELECT * FROM price_alerts WHERE id = ?").get(alertId);

  if (!row) return null;

  return normalizeAlert(row, getHistoryForAlert(row.id));
};

const normalizeUserId = (userId) => {
  return String(userId || "legacy-user").trim() || "legacy-user";
};

const listAlerts = (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  const rows = db
    .prepare(
      `SELECT *
       FROM price_alerts
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(normalizedUserId);

  return rows.map((row) => normalizeAlert(row, getHistoryForAlert(row.id)));
};

const createAlert = ({ userId, symbol, target }) => {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  const parsedTarget = Number(target);

  const result = db
    .prepare("INSERT INTO price_alerts (user_id, symbol, target) VALUES (?, ?, ?)")
    .run(normalizedUserId, normalizedSymbol, parsedTarget);

  db.prepare(
    `INSERT INTO price_alert_history
       (alert_id, user_id, symbol, target, event_type, delivery_status)
     VALUES (?, ?, ?, ?, 'created', 'pending')`
  ).run(result.lastInsertRowid, normalizedUserId, normalizedSymbol, parsedTarget);

  return getAlertById(result.lastInsertRowid);
};

const hasCrossedTarget = (previousPrice, currentPrice, targetPrice) => {
  if (previousPrice === null || previousPrice === undefined) {
    return currentPrice === targetPrice;
  }

  return (
    (previousPrice < targetPrice && currentPrice >= targetPrice) ||
    (previousPrice > targetPrice && currentPrice <= targetPrice)
  );
};

const triggerCrossedAlerts = ({ symbol, previousPrice, currentPrice }) => {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  const rows = db
    .prepare(
      `SELECT *
       FROM price_alerts
       WHERE symbol = ? AND status = 'active'
       ORDER BY created_at ASC, id ASC`
    )
    .all(normalizedSymbol);

  const triggeredAlerts = rows.filter((row) => {
    return hasCrossedTarget(previousPrice, currentPrice, row.target);
  });

  triggeredAlerts.forEach((alert) => {
    db.prepare(
      `UPDATE price_alerts
       SET status = 'triggered',
           delivery_status = 'pending',
           triggered_price = ?,
           triggered_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(currentPrice, alert.id);

    db.prepare(
      `INSERT INTO price_alert_history
         (alert_id, user_id, symbol, target, event_type, price, delivery_status)
       VALUES (?, ?, ?, ?, 'triggered', ?, 'pending')`
    ).run(alert.id, alert.user_id, alert.symbol, alert.target, currentPrice);
  });

  return triggeredAlerts.map((alert) => getAlertById(alert.id));
};

const markAlertsDelivered = (alertIds) => {
  const uniqueAlertIds = [...new Set(alertIds)];

  uniqueAlertIds.forEach((alertId) => {
    const alert = getAlertById(alertId);

    if (!alert) return;

    db.prepare(
      `UPDATE price_alerts
       SET delivery_status = 'delivered'
       WHERE id = ?`
    ).run(alertId);

    db.prepare(
      `INSERT INTO price_alert_history
         (alert_id, user_id, symbol, target, event_type, price, delivery_status)
       VALUES (?, ?, ?, ?, 'delivered', ?, 'delivered')`
    ).run(alertId, alert.user_id, alert.symbol, alert.target, alert.triggered_price);
  });

  return uniqueAlertIds.map(getAlertById).filter(Boolean);
};

module.exports = {
  createAlert,
  listAlerts,
  markAlertsDelivered,
  triggerCrossedAlerts
};
