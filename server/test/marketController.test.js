const assert = require("node:assert/strict");
const { beforeEach, describe, it } = require("node:test");

const marketController = require("../src/controllers/marketController");
const marketService = require("../src/services/marketService");

const originalMarketService = {
  fetchSymbols: marketService.fetchSymbols,
  fetchIntradayData: marketService.fetchIntradayData,
  fetchHistoricalData: marketService.fetchHistoricalData
};

const createResponse = () => {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
};

const callController = async (handler, body) => {
  const response = createResponse();

  await handler({ body }, response);

  return response;
};

describe("market controller validation and proxy errors", () => {
  beforeEach(() => {
    marketService.fetchSymbols = originalMarketService.fetchSymbols;
    marketService.fetchIntradayData = originalMarketService.fetchIntradayData;
    marketService.fetchHistoricalData = originalMarketService.fetchHistoricalData;
  });

  it("rejects intraday requests without a symbol", async () => {
    const response = await callController(marketController.getIntradayData, {});

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body, {
      success: false,
      message: "Symbol is required"
    });
  });

  it("rejects invalid intraday pagination before proxying", async () => {
    let proxied = false;
    marketService.fetchIntradayData = async () => {
      proxied = true;
    };

    const response = await callController(marketController.getIntradayData, {
      symbol: "RELIANCE",
      limit: 0,
      offset: -1
    });

    assert.equal(proxied, false);
    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body, {
      success: false,
      message: "Limit must be a positive integer"
    });
  });

  it("rejects historical requests with missing dates", async () => {
    const response = await callController(marketController.getHistoricalData, {
      symbol: "RELIANCE"
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body, {
      success: false,
      message: "Start date is required"
    });
  });

  it("rejects historical requests with invalid date format", async () => {
    const response = await callController(marketController.getHistoricalData, {
      symbol: "RELIANCE",
      start_date: "2026/05/04",
      end_date: "2026-05-08"
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body, {
      success: false,
      message: "Dates must use YYYY-MM-DD format"
    });
  });

  it("rejects historical requests where start date is after end date", async () => {
    const response = await callController(marketController.getHistoricalData, {
      symbol: "RELIANCE",
      start_date: "2026-05-08",
      end_date: "2026-05-04"
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body, {
      success: false,
      message: "Start date cannot be after end date"
    });
  });

  it("returns the upstream status for intraday proxy errors", async () => {
    marketService.fetchIntradayData = async () => {
      const error = new Error("upstream unavailable");
      error.response = {
        status: 503,
        data: {
          message: "mock API unavailable"
        }
      };
      throw error;
    };

    const response = await callController(marketController.getIntradayData, {
      symbol: "RELIANCE",
      limit: 1,
      offset: 0
    });

    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.body, {
      success: false,
      message: "Failed to fetch intraday data",
      error: {
        message: "mock API unavailable"
      }
    });
  });

  it("returns the upstream status for historical proxy errors", async () => {
    marketService.fetchHistoricalData = async () => {
      const error = new Error("bad gateway");
      error.response = {
        status: 502,
        data: {
          detail: "historical proxy failed"
        }
      };
      throw error;
    };

    const response = await callController(marketController.getHistoricalData, {
      symbol: "RELIANCE",
      start_date: "2026-05-04",
      end_date: "2026-05-08",
      limit: 1,
      offset: 0
    });

    assert.equal(response.statusCode, 502);
    assert.deepEqual(response.body, {
      success: false,
      message: "Failed to fetch historical data",
      error: {
        detail: "historical proxy failed"
      }
    });
  });

  it("returns a clean symbols error when the proxy fails", async () => {
    marketService.fetchSymbols = async () => {
      throw new Error("network failed");
    };

    const response = await callController(marketController.getSymbols);

    assert.equal(response.statusCode, 500);
    assert.deepEqual(response.body, {
      success: false,
      message: "Failed to fetch symbols"
    });
  });
});
