const marketService = require("../services/marketService");

const getSymbols = async (req, res) => {
  try {
    const data = await marketService.fetchSymbols();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch symbols"
    });
  }
};

const getIntradayData = async (req, res) => {
  try {
    const { symbol, limit = 100, offset = 0 } = req.body;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required"
      });
    }

    const data = await marketService.fetchIntradayData({
      symbol,
      limit,
      offset
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch intraday data"
    });
  }
};

const getHistoricalData = async (req, res) => {
  try {
    const {
      symbol,
      start_date,
      end_date,
      limit = 100,
      offset = 0
    } = req.body;

    if (!symbol || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "symbol, start_date and end_date are required"
      });
    }

    const data = await marketService.fetchHistoricalData({
      symbol,
      start_date,
      end_date,
      limit,
      offset
    });

    res.json(data);
  } catch (error) {
    console.log("Historical API error:", error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch historical data",
      error: error.response?.data || error.message
    });
  }
};

module.exports = {
  getSymbols,
  getIntradayData,
  getHistoricalData
};