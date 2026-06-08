import WatchlistCard from "./WatchlistCard";

function Watchlist({
  watchlist,
  liveData,
  status,
  errorMessage,
  onSelectSymbol,
  onRemoveSymbol,
  onReorderSymbol
}) {
  return (
    <section className="watchlist">
      <h2>Watchlist</h2>

      {errorMessage && (
        <div className="error-state">
          <h3>Watchlist sync issue</h3>
          <p>{errorMessage}</p>
        </div>
      )}

      {status === "loading" ? (
        <p className="state-message">Loading saved watchlist...</p>
      ) : watchlist.length === 0 ? (
        <div className="empty-state">
          <h3>No symbols added yet</h3>
          <p>Add a symbol to start streaming live prices.</p>
        </div>
      ) : (
        <div className="watchlist__grid">
          {watchlist.map((symbol, index) => (
            <div className="watchlist__item" key={symbol}>
              <button
                className="watchlist__open"
                onClick={() => onSelectSymbol(symbol)}
                type="button"
              >
                <WatchlistCard symbol={symbol} tick={liveData[symbol]} />
              </button>
              <div className="watchlist__actions">
                <button
                  aria-label={`Move ${symbol} up`}
                  className="watchlist__action"
                  disabled={index === 0}
                  onClick={() => onReorderSymbol(symbol, -1)}
                  title="Move up"
                  type="button"
                >
                  Up
                </button>
                <button
                  aria-label={`Move ${symbol} down`}
                  className="watchlist__action"
                  disabled={index === watchlist.length - 1}
                  onClick={() => onReorderSymbol(symbol, 1)}
                  title="Move down"
                  type="button"
                >
                  Down
                </button>
                <button
                  className="watchlist__remove"
                  onClick={() => onRemoveSymbol(symbol)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default Watchlist;
