const marketService = require("../services/marketService");

const getSymbols = async (req, res) => {
  try {
    const data = await marketService.fetchSymbols();

    res.status(200).json({
      success: true,
      data: data.data
    });
  } catch (error) {
    console.log("Symbols error:", error.response?.data || error.message);

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

    if (limit > 5000) {
      return res.status(400).json({
        success: false,
        message: "Limit cannot be more than 5000"
      });
    }

    if (offset < 0) {
      return res.status(400).json({
        success: false,
        message: "Offset cannot be negative"
      });
    }

    const data = await marketService.fetchIntradayData({
      symbol: symbol.toUpperCase(),
      limit,
      offset
    });

    res.status(200).json(data);
  } catch (error) {
    console.log("Intraday error:", error.response?.data || error.message);

    res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to fetch intraday data",
      error: error.response?.data || error.message
    });
  }
};

module.exports = {
  getSymbols,
  getIntradayData
};