function SearchBar({ symbols, onAddSymbol }) {
  return (
    <div>
      <h2>Search Symbols</h2>

      <select onChange={(e) => onAddSymbol(e.target.value)} defaultValue="">
        <option value="" disabled>
          Select a symbol
        </option>

        {symbols.map((stock) => (
          <option key={stock.symbol} value={stock.symbol}>
            {stock.symbol} - {stock.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SearchBar;