import WatchlistCard from "./WatchlistCard";

function Watchlist({ watchlist, liveData }) {
  return (
    <div>
      <h2>Watchlist</h2>

      {watchlist.length === 0 ? (
        <p>No symbols added yet.</p>
      ) : (
        watchlist.map((symbol) => (
          <WatchlistCard
            key={symbol}
            symbol={symbol}
            tick={liveData[symbol]}
          />
        ))
      )}
    </div>
  );
}

export default Watchlist;