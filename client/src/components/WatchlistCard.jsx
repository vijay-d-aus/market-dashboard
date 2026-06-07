function WatchlistCard({ symbol, tick }) {
  const change = Number(tick?.PRICE_DIFF || 0);
  const previousClose = Number(tick?.PREV_CLOSE || 0);
  const percentChange = previousClose
    ? (change / previousClose) * 100
    : 0;
  const changeClass = change >= 0 ? "is-positive" : "is-negative";

  return (
    <div className="watchlist-card">
      <div className="watchlist-card__header">
        <h3>{symbol}</h3>

        {tick && (
          <span className={`watchlist-card__change ${changeClass}`}>
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)} / {percentChange.toFixed(2)}%
          </span>
        )}
      </div>

      {tick ? (
        <div className="watchlist-card__body">
          <span className="watchlist-card__label">LTP</span>
          <p className="watchlist-card__price">{tick.CLOSE}</p>
          <dl>
            <div>
              <dt>Open</dt>
              <dd>{tick.OPEN}</dd>
            </div>
            <div>
              <dt>High</dt>
              <dd>{tick.HIGH}</dd>
            </div>
            <div>
              <dt>Low</dt>
              <dd>{tick.LOW}</dd>
            </div>
          </dl>
          <p className="watchlist-card__time">{tick.TS}</p>
        </div>
      ) : (
        <p className="state-message">Waiting for live data...</p>
      )}
    </div>
  );
}

export default WatchlistCard;
