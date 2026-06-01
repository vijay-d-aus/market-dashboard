const express = require("express");

const {
  getSymbols,
  getIntradayData
} = require("../controllers/marketController");

const router = express.Router();

router.get("/symbols", getSymbols);
router.post("/intraday", getIntradayData);

module.exports = router;