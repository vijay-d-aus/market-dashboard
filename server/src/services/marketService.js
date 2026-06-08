const axios = require("axios");
const cacheStore = require("./cacheStore");

const BASE_URL = process.env.MOCK_API_BASE_URL;
const CACHE_TTL_MS = 5 * 60 * 1000;

const fetchSymbols = async () => {
  return cacheStore.getOrSet("symbols", CACHE_TTL_MS, async () => {
    const response = await axios.get(`${BASE_URL}/symbols`);
    return response.data;
  });
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
  return cacheStore.getOrSet(cacheKey, CACHE_TTL_MS, async () => {
    const response = await axios.post(`${BASE_URL}/historical`, {
      symbol,
      start_date,
      end_date,
      limit,
      offset
    });

    return response.data;
  });
};

module.exports = {
  fetchSymbols,
  fetchIntradayData,
  fetchHistoricalData
};
