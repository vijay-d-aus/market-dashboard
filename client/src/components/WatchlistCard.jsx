function WatchlistCard({ symbol, tick }) {
  return (
    <div>
      <h3>{symbol}</h3>

      {tick ? (
        <>
          <p>Price: {tick.CLOSE}</p>
          <p>Open: {tick.OPEN}</p>
          <p>High: {tick.HIGH}</p>
          <p>Low: {tick.LOW}</p>
          <p>Change: {tick.PRICE_DIFF}</p>
          <p>Time: {tick.TS}</p>
        </>
      ) : (
        <p>Waiting for live data...</p>
      )}
    </div>
  );
}

export default WatchlistCard;