import { useEffect, useState } from "react";
import api from "../services/api";
import socket from "../services/socket";
import SearchBar from "../components/SearchBar";
import Watchlist from "../components/Watchlist";

function Dashboard() {
  const [symbols, setSymbols] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [liveData, setLiveData] = useState({});
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const response = await api.get("/symbols");
        setSymbols(response.data.data);
      } catch (error) {
        console.log("Failed to fetch symbols", error);
      }
    };

    fetchSymbols();
  }, []);

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      setConnectionStatus("Connected");
    });

    socket.on("disconnect", () => {
      setConnectionStatus("Disconnected");
    });

    socket.on("ticker", (tick) => {
      setLiveData((prev) => ({
        ...prev,
        [tick.SYMBOL]: tick
      }));
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("ticker");
      socket.disconnect();
    };
  }, []);

  const handleAddSymbol = (symbol) => {
    if (!symbol) return;

    if (!watchlist.includes(symbol)) {
      const updatedWatchlist = [...watchlist, symbol];
      setWatchlist(updatedWatchlist);

      socket.emit("subscribe", updatedWatchlist);
    }
  };

  return (
    <div>
      <h1>Real-Time Market Dashboard</h1>

      <p>Socket Status: {connectionStatus}</p>

      <SearchBar symbols={symbols} onAddSymbol={handleAddSymbol} />

      <Watchlist watchlist={watchlist} liveData={liveData} />
    </div>
  );
}

export default Dashboard;