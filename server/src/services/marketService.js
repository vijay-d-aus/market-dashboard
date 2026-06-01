const axios = require("axios");

const BASE_URL = process.env.MOCK_API_BASE_URL;

const fetchSymbols = async () => {
  const response = await axios.get(`${BASE_URL}/symbols`);
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
  const response = await axios.post(`${BASE_URL}/historical`, {
    symbol,
    start_date,
    end_date,
    limit,
    offset
  });

  return response.data;
};

module.exports = {
  fetchSymbols,
  fetchIntradayData,
  fetchHistoricalData
};