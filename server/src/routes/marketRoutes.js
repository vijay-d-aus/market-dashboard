const express = require("express");

const {
  getSymbols,
  getIntradayData,
  getHistoricalData
} = require("../controllers/marketController");

const router = express.Router();

router.get("/symbols", getSymbols);
router.post("/intraday", getIntradayData);
router.post("/historical", getHistoricalData);

module.exports = router;
