import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import socket from "../services/socket";
import SearchBar from "../components/SearchBar";
import Watchlist from "../components/Watchlist";
import StockDetail from "../components/StockDetail";

const toChartPoint = (tick) => ({
  time: tick.TS ? tick.TS.slice(11, 19) : new Date().toLocaleTimeString(),
  price: Number(tick.CLOSE)
});

const getStoredWatchlist = () => {
  try {
    const storedWatchlist = localStorage.getItem("watchlist");
    const parsedWatchlist = storedWatchlist ? JSON.parse(storedWatchlist) : [];

    return Array.isArray(parsedWatchlist) ? parsedWatchlist : [];
  } catch {
    return [];
  }
};

const getStoredTheme = () => {
  return localStorage.getItem("theme") === "dark" ? "dark" : "light";
};

function Dashboard() {
  const [symbols, setSymbols] = useState([]);
  const [symbolsStatus, setSymbolsStatus] = useState("loading");
  const [symbolsError, setSymbolsError] = useState("");
  const [watchlist, setWatchlist] = useState(getStoredWatchlist);
  const [liveData, setLiveData] = useState({});
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [theme, setTheme] = useState(getStoredTheme);
  const selectedSymbolRef = useRef(null);
  const watchlistRef = useRef(watchlist);

  useEffect(() => {
    const fetchSymbols = async () => {
      setSymbolsStatus("loading");
      setSymbolsError("");

      try {
        const response = await api.get("/symbols");
        setSymbols(response.data.data);
        setSymbolsStatus("success");
      } catch (error) {
        console.log("Failed to fetch symbols", error);
        setSymbolsStatus("error");
        setSymbolsError("Could not load symbols. Check the backend server.");
      }
    };

    fetchSymbols();
  }, []);

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      setConnectionStatus("Connected");

      if (watchlistRef.current.length > 0) {
        socket.emit("subscribe", watchlistRef.current);
      }
    });

    socket.on("disconnect", () => {
      setConnectionStatus("Disconnected");
    });

    socket.on("ticker", (tick) => {
      if (!tick?.SYMBOL || tick.CLOSE === undefined || Number.isNaN(Number(tick.CLOSE))) {
        console.log("Malformed tick skipped", tick);
        return;
      }

      setLiveData((prev) => ({
        ...prev,
        [tick.SYMBOL]: tick
      }));

      setChartData((prev) => {
        if (!selectedSymbolRef.current || tick.SYMBOL !== selectedSymbolRef.current) {
          return prev;
        }

        const updated = [
          ...prev,
          toChartPoint(tick)
        ];

        return updated.slice(-50);
      });
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("ticker");
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    watchlistRef.current = watchlist;
    localStorage.setItem("watchlist", JSON.stringify(watchlist));

    if (socket.connected && watchlist.length > 0) {
      socket.emit("subscribe", watchlist);
    }
  }, [watchlist]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleAddSymbol = (symbol) => {
    if (!symbol) return;

    if (!watchlist.includes(symbol)) {
      const updatedWatchlist = [...watchlist, symbol];
      setWatchlist(updatedWatchlist);
    }
  };

  const handleRemoveSymbol = (symbol) => {
    const updatedWatchlist = watchlist.filter((item) => item !== symbol);

    setWatchlist(updatedWatchlist);
    setLiveData((prev) => {
      const next = { ...prev };
      delete next[symbol];
      return next;
    });

    if (socket.connected) {
      socket.emit("unsubscribe", [symbol]);
    }

    if (selectedSymbol === symbol) {
      handleBackToWatchlist();
    }
  };

  const handleSelectSymbol = (symbol) => {
    selectedSymbolRef.current = symbol;
    setSelectedSymbol(symbol);
    setChartData(liveData[symbol] ? [toChartPoint(liveData[symbol])] : []);
  };

  const handleBackToWatchlist = () => {
    selectedSymbolRef.current = null;
    setSelectedSymbol(null);
    setChartData([]);
  };

  const selectedTick = selectedSymbol ? liveData[selectedSymbol] : null;
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <main className="dashboard">
      <header className="dashboard__header">
        <div>
          <h1>Real-Time Market Dashboard</h1>
          <p className="dashboard__subtitle">Live NSE watchlist and charts</p>
        </div>

        <div className="dashboard__actions">
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme(nextTheme)}
          >
            {nextTheme} mode
          </button>

          <div
            className={`connection-pill ${
              connectionStatus === "Connected" ? "is-connected" : ""
            }`}
          >
            <span />
            {connectionStatus}
          </div>
        </div>
      </header>

      {selectedSymbol ? (
        <StockDetail
          key={selectedSymbol}
          symbol={selectedSymbol}
          tick={selectedTick}
          chartData={chartData}
          onBack={handleBackToWatchlist}
        />
      ) : (
        <>
          <SearchBar
            symbols={symbols}
            status={symbolsStatus}
            errorMessage={symbolsError}
            onAddSymbol={handleAddSymbol}
          />

          <Watchlist
            watchlist={watchlist}
            liveData={liveData}
            onSelectSymbol={handleSelectSymbol}
            onRemoveSymbol={handleRemoveSymbol}
          />
        </>
      )}
    </main>
  );
}

export default Dashboard;
