import WatchlistCard from "./WatchlistCard";

function Watchlist({
  watchlist,
  liveData,
  onSelectSymbol,
  onRemoveSymbol
}) {
  return (
    <section className="watchlist">
      <h2>Watchlist</h2>

      {watchlist.length === 0 ? (
        <div className="empty-state">
          <h3>No symbols added yet</h3>
          <p>Add a symbol to start streaming live prices.</p>
        </div>
      ) : (
        <div className="watchlist__grid">
          {watchlist.map((symbol) => (
            <div className="watchlist__item" key={symbol}>
              <button
                className="watchlist__open"
                onClick={() => onSelectSymbol(symbol)}
                type="button"
              >
                <WatchlistCard symbol={symbol} tick={liveData[symbol]} />
              </button>
              <button
                className="watchlist__remove"
                onClick={() => onRemoveSymbol(symbol)}
                type="button"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default Watchlist;
