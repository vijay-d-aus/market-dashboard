const express = require("express");

const {
  getSymbols,
  getIntradayData,
  getHistoricalData,
  getWatchlist,
  updateWatchlist
} = require("../controllers/marketController");

const router = express.Router();

router.get("/symbols", getSymbols);
router.post("/intraday", getIntradayData);
router.post("/historical", getHistoricalData);
router.get("/watchlist", getWatchlist);
router.put("/watchlist", updateWatchlist);

module.exports = router;
