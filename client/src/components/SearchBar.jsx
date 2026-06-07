function SearchBar({ errorMessage, symbols, status, onAddSymbol }) {
  const isLoading = status === "loading";
  const hasError = status === "error";

  return (
    <div className="search-panel">
      <h2>Search Symbols</h2>

      <select
        disabled={isLoading || hasError}
        onChange={(e) => onAddSymbol(e.target.value)}
        defaultValue=""
      >
        <option value="" disabled>
          {isLoading ? "Loading symbols..." : "Select a symbol"}
        </option>

        {symbols.map((stock) => (
          <option key={stock.symbol} value={stock.symbol}>
            {stock.symbol} - {stock.name}
          </option>
        ))}
      </select>

      {hasError && <p className="state-message is-error">{errorMessage}</p>}
    </div>
  );
}

export default SearchBar;
