import { useEffect, useState } from "react";
import { fetchHistoricalData } from "../services/api";
import StockChart from "./StockChart";

const HISTORICAL_RANGE = {
  start_date: "2026-05-04",
  end_date: "2026-05-08",
  limit: 100,
  offset: 0
};
const HISTORICAL_MIN_DATE = "2026-05-04";
const HISTORICAL_MAX_DATE = "2026-05-08";
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

const toHistoricalChartPoint = (row) => ({
  time: row.TS ? row.TS.slice(0, 16).replace("T", " ") : "",
  price: Number(row.CLOSE)
});

const validateHistoricalRange = ({ start_date, end_date }) => {
  if (!start_date || !end_date) {
    return "Choose both start and end dates.";
  }

  if (!DATE_FORMAT.test(start_date) || !DATE_FORMAT.test(end_date)) {
    return "Dates must use YYYY-MM-DD format.";
  }

  if (start_date > end_date) {
    return "Start date cannot be after end date.";
  }

  if (start_date < HISTORICAL_MIN_DATE || end_date > HISTORICAL_MAX_DATE) {
    return `Historical data is available from ${HISTORICAL_MIN_DATE} to ${HISTORICAL_MAX_DATE}.`;
  }

  return "";
};

function StockDetail({
  symbol,
  tick,
  chartData,
  priceAlerts = [],
  alertError,
  onSetPriceAlert,
  onBack
}) {
  const [viewMode, setViewMode] = useState("intraday");
  const [historicalChartData, setHistoricalChartData] = useState([]);
  const [historicalStatus, setHistoricalStatus] = useState("idle");
  const [historicalError, setHistoricalError] = useState("");
  const [historicalForm, setHistoricalForm] = useState({
    start_date: HISTORICAL_RANGE.start_date,
    end_date: HISTORICAL_RANGE.end_date
  });
  const [historicalQuery, setHistoricalQuery] = useState({
    ...HISTORICAL_RANGE,
    requestId: 0
  });
  const [alertTarget, setAlertTarget] = useState("");

  useEffect(() => {
    if (viewMode !== "historical") {
      return;
    }

    let ignore = false;

    const loadHistoricalData = async () => {
      setHistoricalStatus("loading");
      setHistoricalError("");

      try {
        const response = await fetchHistoricalData({
          symbol,
          start_date: historicalQuery.start_date,
          end_date: historicalQuery.end_date,
          limit: historicalQuery.limit,
          offset: historicalQuery.offset
        });

        if (ignore) return;

        const rows = response.data?.data || [];
        const chartPoints = rows.map(toHistoricalChartPoint);

        setHistoricalChartData(chartPoints);
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
  }, [historicalQuery, symbol, viewMode]);

  const isHistorical = viewMode === "historical";
  const activeChartData = isHistorical ? historicalChartData : chartData;
  const chartTitle = isHistorical
    ? `${symbol} Historical CLOSE Chart`
    : `${symbol} Live CLOSE Chart`;
  const emptyMessage = isHistorical
    ? "No historical data available."
    : "Waiting for live ticks...";

  const handleAlertSubmit = (event) => {
    event.preventDefault();

    const target = Number(alertTarget);

    if (!target || Number.isNaN(target)) {
      return;
    }

    onSetPriceAlert(symbol, target);
    setAlertTarget("");
  };

  const handleHistoricalFormChange = (event) => {
    const { name, value } = event.target;

    setHistoricalForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleHistoricalSubmit = (event) => {
    event.preventDefault();

    const validationMessage = validateHistoricalRange(historicalForm);

    if (validationMessage) {
      setHistoricalChartData([]);
      setHistoricalStatus("error");
      setHistoricalError(validationMessage);
      return;
    }

    setHistoricalChartData([]);
    setHistoricalError("");
    setHistoricalQuery((prev) => ({
      ...prev,
      start_date: historicalForm.start_date,
      end_date: historicalForm.end_date,
      requestId: prev.requestId + 1
    }));
    setViewMode("historical");
  };

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

      <form className="price-alert-form" onSubmit={handleAlertSubmit}>
        <label htmlFor={`price-alert-${symbol}`}>Price alert</label>
        <div>
          <input
            id={`price-alert-${symbol}`}
            min="0"
            step="0.05"
            type="number"
            value={alertTarget}
            placeholder="Target CLOSE"
            onChange={(event) => setAlertTarget(event.target.value)}
          />
          <button type="submit">Set alert</button>
        </div>
        {alertError && (
          <p className="price-alert-form__status is-error">{alertError}</p>
        )}
      </form>

      <section className="price-alert-history">
        <h3>Alert history</h3>
        {priceAlerts.length === 0 ? (
          <p className="state-message">No alerts set for {symbol}.</p>
        ) : (
          <div className="price-alert-history__list">
            {priceAlerts.map((alert) => (
              <article className="price-alert-history__item" key={alert.id}>
                <div>
                  <strong>Target {alert.target}</strong>
                  <span>{alert.status}</span>
                </div>
                <dl>
                  <div>
                    <dt>Delivery</dt>
                    <dd>{alert.delivery_status}</dd>
                  </div>
                  <div>
                    <dt>Triggered price</dt>
                    <dd>{alert.triggered_price || "Waiting"}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{alert.created_at}</dd>
                  </div>
                </dl>
                {alert.history?.length > 0 && (
                  <ul>
                    {alert.history.slice(0, 3).map((event) => (
                      <li key={event.id}>
                        {event.event_type} {event.price ? `at ${event.price}` : ""}
                        {event.delivery_status
                          ? ` (${event.delivery_status})`
                          : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {isHistorical && (
        <form className="historical-range-form" onSubmit={handleHistoricalSubmit}>
          <div className="historical-range-form__fields">
            <label>
              Start
              <input
                max={HISTORICAL_MAX_DATE}
                min={HISTORICAL_MIN_DATE}
                name="start_date"
                type="date"
                value={historicalForm.start_date}
                onChange={handleHistoricalFormChange}
              />
            </label>
            <label>
              End
              <input
                max={HISTORICAL_MAX_DATE}
                min={HISTORICAL_MIN_DATE}
                name="end_date"
                type="date"
                value={historicalForm.end_date}
                onChange={handleHistoricalFormChange}
              />
            </label>
            <button disabled={historicalStatus === "loading"} type="submit">
              Apply range
            </button>
          </div>
          <p>
            Available range: {HISTORICAL_MIN_DATE} to {HISTORICAL_MAX_DATE}
          </p>
        </form>
      )}

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
