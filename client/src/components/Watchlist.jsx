import WatchlistCard from "./WatchlistCard";

function Watchlist({ watchlist, liveData, onSelectSymbol }) {
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
            <button
              className="watchlist__item"
              key={symbol}
              onClick={() => onSelectSymbol(symbol)}
              type="button"
            >
              <WatchlistCard symbol={symbol} tick={liveData[symbol]} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default Watchlist;
