const express = require("express");
const {
  getCurrentUser,
  login,
  logout,
  register
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

const {
  getSymbols,
  getIntradayData,
  getHistoricalData,
  getWatchlist,
  updateWatchlist,
  getAlerts,
  createAlert
} = require("../controllers/marketController");

const router = express.Router();

router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", requireAuth, getCurrentUser);
router.post("/auth/logout", requireAuth, logout);

router.get("/symbols", getSymbols);
router.post("/intraday", getIntradayData);
router.post("/historical", getHistoricalData);
router.get("/watchlist", requireAuth, getWatchlist);
router.put("/watchlist", requireAuth, updateWatchlist);
router.get("/alerts", requireAuth, getAlerts);
router.post("/alerts", requireAuth, createAlert);

module.exports = router;
