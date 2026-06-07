const marketService = require("../services/marketService");

const normalizePagination = ({ limit = 100, offset = 0 }) => {
  const parsedLimit = Number(limit);
  const parsedOffset = Number(offset);

  if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
    return {
      error: "Limit must be a positive integer"
    };
  }

  if (parsedLimit > 5000) {
    return {
      error: "Limit cannot be more than 5000"
    };
  }

  if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
    return {
      error: "Offset must be a non-negative integer"
    };
  }

  return {
    limit: parsedLimit,
    offset: parsedOffset
  };
};

const isDateString = (value) => {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
};

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
    const { symbol, limit = 100, offset = 0 } = req.body || {};
    const pagination = normalizePagination({ limit, offset });

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required"
      });
    }

    if (pagination.error) {
      return res.status(400).json({
        success: false,
        message: pagination.error
      });
    }

    const data = await marketService.fetchIntradayData({
      symbol: symbol.toUpperCase(),
      limit: pagination.limit,
      offset: pagination.offset
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

const getHistoricalData = async (req, res) => {
  try {
    const {
      symbol,
      start_date,
      end_date,
      limit = 100,
      offset = 0
    } = req.body || {};
    const pagination = normalizePagination({ limit, offset });

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required"
      });
    }

    if (!start_date) {
      return res.status(400).json({
        success: false,
        message: "Start date is required"
      });
    }

    if (!end_date) {
      return res.status(400).json({
        success: false,
        message: "End date is required"
      });
    }

    if (!isDateString(start_date) || !isDateString(end_date)) {
      return res.status(400).json({
        success: false,
        message: "Dates must use YYYY-MM-DD format"
      });
    }

    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date"
      });
    }

    if (pagination.error) {
      return res.status(400).json({
        success: false,
        message: pagination.error
      });
    }

    const data = await marketService.fetchHistoricalData({
      symbol: symbol.toUpperCase(),
      start_date,
      end_date,
      limit: pagination.limit,
      offset: pagination.offset
    });

    res.status(200).json(data);
  } catch (error) {
    console.log("Historical error:", error.response?.data || error.message);

    res.status(error.response?.status || 500).json({
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
