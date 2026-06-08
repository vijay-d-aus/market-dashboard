const marketService = require("../services/marketService");
const watchlistStore = require("../services/watchlistStore");
const alertStore = require("../services/alertStore");

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

const getWatchlist = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: watchlistStore.getWatchlist()
    });
  } catch (error) {
    console.log("Watchlist read error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to load watchlist"
    });
  }
};

const updateWatchlist = (req, res) => {
  try {
    const { symbols } = req.body || {};

    if (!Array.isArray(symbols)) {
      return res.status(400).json({
        success: false,
        message: "Symbols must be an array"
      });
    }

    if (symbols.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Watchlist cannot contain more than 100 symbols"
      });
    }

    const invalidSymbol = symbols.find((symbol) => {
      return typeof symbol !== "string" || !symbol.trim();
    });

    if (invalidSymbol !== undefined) {
      return res.status(400).json({
        success: false,
        message: "Symbols must be non-empty strings"
      });
    }

    const data = watchlistStore.replaceWatchlist(symbols);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.log("Watchlist update error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to save watchlist"
    });
  }
};

const getAlerts = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: alertStore.listAlerts()
    });
  } catch (error) {
    console.log("Alerts read error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to load alerts"
    });
  }
};

const createAlert = (req, res) => {
  try {
    const { symbol, target } = req.body || {};
    const normalizedSymbol = String(symbol || "").trim().toUpperCase();
    const parsedTarget = Number(target);

    if (!normalizedSymbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required"
      });
    }

    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      return res.status(400).json({
        success: false,
        message: "Target must be a positive number"
      });
    }

    const data = alertStore.createAlert({
      symbol: normalizedSymbol,
      target: parsedTarget
    });

    res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    console.log("Alert create error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to create alert"
    });
  }
};

module.exports = {
  getSymbols,
  getIntradayData,
  getHistoricalData,
  getWatchlist,
  updateWatchlist,
  getAlerts,
  createAlert
};
