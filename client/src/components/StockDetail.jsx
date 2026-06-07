import { useEffect, useState } from "react";
import { fetchHistoricalData } from "../services/api";
import StockChart from "./StockChart";

const HISTORICAL_RANGE = {
  start_date: "2026-05-04",
  end_date: "2026-05-08",
  limit: 100,
  offset: 0
};

const toHistoricalChartPoint = (row) => ({
  time: row.TS ? row.TS.slice(0, 16).replace("T", " ") : "",
  price: Number(row.CLOSE)
});

const getHistoricalCacheKey = (symbol) => {
  return [
    "historical",
    symbol,
    HISTORICAL_RANGE.start_date,
    HISTORICAL_RANGE.end_date,
    HISTORICAL_RANGE.limit,
    HISTORICAL_RANGE.offset
  ].join(":");
};

const getCachedHistoricalData = (symbol) => {
  try {
    const cached = localStorage.getItem(getHistoricalCacheKey(symbol));
    const parsed = cached ? JSON.parse(cached) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const setCachedHistoricalData = (symbol, data) => {
  localStorage.setItem(
    getHistoricalCacheKey(symbol),
    JSON.stringify(data)
  );
};

function StockDetail({ symbol, tick, chartData, onBack }) {
  const [viewMode, setViewMode] = useState("intraday");
  const [historicalChartData, setHistoricalChartData] = useState([]);
  const [historicalStatus, setHistoricalStatus] = useState("idle");
  const [historicalError, setHistoricalError] = useState("");

  useEffect(() => {
    if (viewMode !== "historical" || historicalChartData.length > 0) {
      return;
    }

    let ignore = false;

    const loadHistoricalData = async () => {
      const cachedData = getCachedHistoricalData(symbol);

      if (cachedData.length > 0) {
        setHistoricalChartData(cachedData);
        setHistoricalStatus("success");
        return;
      }

      setHistoricalStatus("loading");
      setHistoricalError("");

      try {
        const response = await fetchHistoricalData({
          symbol,
          ...HISTORICAL_RANGE
        });

        if (ignore) return;

        const rows = response.data?.data || [];
        const chartPoints = rows.map(toHistoricalChartPoint);

        setHistoricalChartData(chartPoints);
        setCachedHistoricalData(symbol, chartPoints);
        setHistoricalStatus("success");
      } catch (error) {
        if (ignore) return;

        setHistoricalChartData([]);
        setHistoricalStatus("error");
        setHistoricalError(
          error.response?.data?.message || "Failed to load historical data"
        );
      }
    };

    loadHistoricalData();

    return () => {
      ignore = true;
    };
  }, [historicalChartData.length, symbol, viewMode]);

  const isHistorical = viewMode === "historical";
  const activeChartData = isHistorical ? historicalChartData : chartData;
  const chartTitle = isHistorical
    ? `${symbol} Historical CLOSE Chart`
    : `${symbol} Live CLOSE Chart`;
  const emptyMessage = isHistorical
    ? "No historical data available."
    : "Waiting for live ticks...";

  return (
    <section className="stock-detail">
      <button className="stock-detail__back" type="button" onClick={onBack}>
        Back to watchlist
      </button>

      <div className="stock-detail__summary">
        <div>
          <p className="stock-detail__label">Symbol</p>
          <h2>{symbol}</h2>
        </div>

        <div>
          <p className="stock-detail__label">Close</p>
          <p className="stock-detail__price">
            {tick ? tick.CLOSE : "Waiting..."}
          </p>
        </div>
      </div>

      <div className="stock-detail__toggle" aria-label="Chart data mode">
        <button
          className={viewMode === "intraday" ? "is-active" : ""}
          type="button"
          onClick={() => setViewMode("intraday")}
        >
          Intraday
        </button>
        <button
          className={viewMode === "historical" ? "is-active" : ""}
          type="button"
          onClick={() => setViewMode("historical")}
        >
          Historical
        </button>
      </div>

      {isHistorical && historicalStatus === "loading" && (
        <p className="state-message">Loading historical data...</p>
      )}

      {isHistorical && historicalStatus === "error" && (
        <p className="state-message is-error">{historicalError}</p>
      )}

      <StockChart
        symbol={symbol}
        chartData={activeChartData}
        title={chartTitle}
        emptyMessage={emptyMessage}
      />
    </section>
  );
}

export default StockDetail;
