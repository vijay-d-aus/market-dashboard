const axios = require("axios");

const BASE_URL = process.env.MOCK_API_BASE_URL;
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

const getCachedValue = (key) => {
  const entry = cache.get(key);

  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value;
};

const setCachedValue = (key, value) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
};

const fetchSymbols = async () => {
  const cacheKey = "symbols";
  const cached = getCachedValue(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await axios.get(`${BASE_URL}/symbols`);
  setCachedValue(cacheKey, response.data);

  return response.data;
};

const fetchIntradayData = async ({ symbol, limit, offset }) => {
  const response = await axios.post(`${BASE_URL}/realtime-current`, {
    symbol,
    limit,
    offset
  });

  return response.data;
};

const fetchHistoricalData = async ({
  symbol,
  start_date,
  end_date,
  limit,
  offset
}) => {
  const cacheKey = [
    "historical",
    symbol,
    start_date,
    end_date,
    limit,
    offset
  ].join(":");
  const cached = getCachedValue(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await axios.post(`${BASE_URL}/historical`, {
    symbol,
    start_date,
    end_date,
    limit,
    offset
  });

  setCachedValue(cacheKey, response.data);

  return response.data;
};

module.exports = {
  fetchSymbols,
  fetchIntradayData,
  fetchHistoricalData
};
