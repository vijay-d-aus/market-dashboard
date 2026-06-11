import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import {
  clearAuthSession,
  createPriceAlert,
  fetchCurrentUser,
  fetchAlerts,
  fetchWatchlist,
  getAuthToken,
  getStoredUser,
  login,
  logout,
  register,
  saveWatchlist,
  setAuthSession
} from "../services/api";
import socket from "../services/socket";
import SearchBar from "../components/SearchBar";
import Watchlist from "../components/Watchlist";
import StockDetail from "../components/StockDetail";

const toChartPoint = (tick) => ({
  time: tick.TS ? tick.TS.slice(11, 19) : new Date().toLocaleTimeString(),
  price: Number(tick.CLOSE ?? tick.LTP)
});
const LIVE_CHART_POINT_LIMIT = 500;

const getStoredTheme = () => {
  return localStorage.getItem("theme") === "dark" ? "dark" : "light";
};

function Dashboard() {
  const [authUser, setAuthUser] = useState(() => {
    return getAuthToken() ? getStoredUser() : null;
  });
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    username: "",
    password: ""
  });
  const [authStatus, setAuthStatus] = useState(
    getAuthToken() ? "checking" : "idle"
  );
  const [authError, setAuthError] = useState("");
  const [symbols, setSymbols] = useState([]);
  const [symbolsStatus, setSymbolsStatus] = useState("idle");
  const [symbolsError, setSymbolsError] = useState("");
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistStatus, setWatchlistStatus] = useState("idle");
  const [watchlistError, setWatchlistError] = useState("");
  const [liveData, setLiveData] = useState({});
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [theme, setTheme] = useState(getStoredTheme);
  const [priceAlerts, setPriceAlerts] = useState([]);
  const [alertError, setAlertError] = useState("");
  const [notification, setNotification] = useState(null);
  const selectedSymbolRef = useRef(null);
  const watchlistRef = useRef(watchlist);
  const liveDataRef = useRef(liveData);
  const chartHistoryRef = useRef({});

  useEffect(() => {
    const validateSession = async () => {
      if (!getAuthToken()) return;

      try {
        const response = await fetchCurrentUser();
        const user = response.data.data.user;
        setAuthUser(user);
        setAuthSession({
          token: getAuthToken(),
          user
        });
        setAuthStatus("idle");
      } catch (error) {
        console.log("Stored session is no longer valid", error);
        clearAuthSession();
        setAuthUser(null);
        setAuthStatus("idle");
      }
    };

    validateSession();
  }, []);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    const loadInitialData = async () => {
      setSymbolsStatus("loading");
      setWatchlistStatus("loading");
      setSymbolsError("");
      setWatchlistError("");

      try {
        const [symbolsResponse, watchlistResponse, alertsResponse] = await Promise.all([
          api.get("/symbols"),
          fetchWatchlist(),
          fetchAlerts()
        ]);

        const savedWatchlist = Array.isArray(watchlistResponse.data.data)
          ? watchlistResponse.data.data
          : [];
        const savedAlerts = Array.isArray(alertsResponse.data.data)
          ? alertsResponse.data.data
          : [];

        setSymbols(symbolsResponse.data.data);
        setWatchlist(savedWatchlist);
        setPriceAlerts(savedAlerts);
        watchlistRef.current = savedWatchlist;
        setSymbolsStatus("success");
        setWatchlistStatus("success");

        if (socket.connected && savedWatchlist.length > 0) {
          socket.emit("subscribe", savedWatchlist);
        }
      } catch (error) {
        console.log("Failed to load initial data", error);
        setSymbolsStatus("error");
        setWatchlistStatus("error");
        setSymbolsError("Could not load symbols. Check the backend server.");
        setWatchlistError("Could not load saved watchlist from the backend.");
        setAlertError("Could not load saved alerts from the backend.");
      }
    };

    loadInitialData();
  }, [authUser]);

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      setConnectionStatus("Connected");
      socket.emit("authenticate", getAuthToken());

      if (watchlistRef.current.length > 0) {
        socket.emit("subscribe", watchlistRef.current);
      }
    });

    socket.on("disconnect", () => {
      setConnectionStatus("Disconnected");
    });

    socket.on("ticker", (tick) => {
      const price = Number(tick?.CLOSE ?? tick?.LTP);

      if (!tick?.SYMBOL || Number.isNaN(price)) {
        console.log("Malformed tick skipped", tick);
        return;
      }

      setLiveData((prev) => {
        const next = {
          ...prev,
          [tick.SYMBOL]: tick
        };

        liveDataRef.current = next;
        return next;
      });

      const chartPoint = toChartPoint(tick);
      const previousHistory = chartHistoryRef.current[tick.SYMBOL] || [];
      const nextSymbolHistory = [
        ...previousHistory,
        chartPoint
      ].slice(-LIVE_CHART_POINT_LIMIT);

      chartHistoryRef.current = {
        ...chartHistoryRef.current,
        [tick.SYMBOL]: nextSymbolHistory
      };

      if (selectedSymbolRef.current === tick.SYMBOL) {
        setChartData(nextSymbolHistory);
      }
    });

    socket.on("price_alert", (alert) => {
      setNotification({
        id: alert.id,
        symbol: alert.symbol,
        target: alert.target,
        price: alert.triggered_price,
        deliveryStatus: alert.delivery_status
      });

      setPriceAlerts((prev) => {
        const withoutAlert = prev.filter((item) => item.id !== alert.id);
        return [alert, ...withoutAlert];
      });
    });

    socket.on("price_alert_updated", (alert) => {
      setNotification((prev) => {
        if (!prev || prev.id !== alert.id) {
          return prev;
        }

        return {
          ...prev,
          deliveryStatus: alert.delivery_status
        };
      });

      setPriceAlerts((prev) => {
        return prev.map((item) => (item.id === alert.id ? alert : item));
      });
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("ticker");
      socket.off("price_alert");
      socket.off("price_alert_updated");
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket.connected) {
      socket.emit("authenticate", getAuthToken());
    }
  }, [authUser]);

  useEffect(() => {
    watchlistRef.current = watchlist;

    if (socket.connected && watchlist.length > 0) {
      socket.emit("subscribe", watchlist);
    }
  }, [watchlist]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const persistWatchlist = async (nextWatchlist, previousWatchlist) => {
    try {
      setWatchlistError("");
      const response = await saveWatchlist(nextWatchlist);
      const savedWatchlist = Array.isArray(response.data.data)
        ? response.data.data
        : nextWatchlist;

      setWatchlist(savedWatchlist);
      watchlistRef.current = savedWatchlist;
      setWatchlistStatus("success");
    } catch (error) {
      console.log("Failed to save watchlist", error);
      setWatchlist(previousWatchlist);
      watchlistRef.current = previousWatchlist;
      setWatchlistStatus("error");
      setWatchlistError("Could not save watchlist. Try again.");
    }
  };

  const handleAddSymbol = async (symbol) => {
    if (!symbol) return;

    if (!watchlist.includes(symbol)) {
      const updatedWatchlist = [...watchlist, symbol];
      setWatchlist(updatedWatchlist);
      await persistWatchlist(updatedWatchlist, watchlist);
    }
  };

  const handleRemoveSymbol = async (symbol) => {
    const updatedWatchlist = watchlist.filter((item) => item !== symbol);
    const previousWatchlist = watchlist;

    setWatchlist(updatedWatchlist);
    setLiveData((prev) => {
      const next = { ...prev };
      delete next[symbol];
      liveDataRef.current = next;
      return next;
    });
    delete chartHistoryRef.current[symbol];

    if (socket.connected) {
      socket.emit("unsubscribe", [symbol]);
    }

    if (selectedSymbol === symbol) {
      handleBackToWatchlist();
    }

    await persistWatchlist(updatedWatchlist, previousWatchlist);
  };

  const handleReorderSymbol = async (symbol, direction) => {
    const currentIndex = watchlist.indexOf(symbol);
    const nextIndex = currentIndex + direction;

    if (
      currentIndex === -1 ||
      nextIndex < 0 ||
      nextIndex >= watchlist.length
    ) {
      return;
    }

    const updatedWatchlist = [...watchlist];
    [updatedWatchlist[currentIndex], updatedWatchlist[nextIndex]] = [
      updatedWatchlist[nextIndex],
      updatedWatchlist[currentIndex]
    ];

    setWatchlist(updatedWatchlist);
    await persistWatchlist(updatedWatchlist, watchlist);
  };

  const handleSetPriceAlert = async (symbol, target) => {
    try {
      setAlertError("");
      const response = await createPriceAlert({ symbol, target });
      const alert = response.data.data;

      setPriceAlerts((prev) => [alert, ...prev]);
      setNotification(null);
    } catch (error) {
      console.log("Failed to create alert", error);
      setAlertError("Could not save price alert. Try again.");
    }
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthStatus("submitting");

    try {
      const authAction = authMode === "login" ? login : register;
      const response = await authAction(authForm);
      const session = response.data.data;

      setAuthSession(session);
      setAuthUser(session.user);
      setAuthForm({
        username: "",
        password: ""
      });
      setAuthStatus("idle");

      if (socket.connected) {
        socket.emit("authenticate", session.token);
      }
    } catch (error) {
      console.log("Authentication failed", error);
      setAuthStatus("idle");
      setAuthError(
        error.response?.data?.message || "Could not complete sign in."
      );
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.log("Logout failed", error);
    }

    if (socket.connected) {
      if (watchlistRef.current.length > 0) {
        socket.emit("unsubscribe", watchlistRef.current);
      }

      socket.emit("authenticate", "");
    }

    clearAuthSession();
    setAuthUser(null);
    setWatchlist([]);
    watchlistRef.current = [];
    setSymbolsStatus("idle");
    setWatchlistStatus("idle");
    setPriceAlerts([]);
    setLiveData({});
    liveDataRef.current = {};
    chartHistoryRef.current = {};
    handleBackToWatchlist();
  };

  const handleSelectSymbol = (symbol) => {
    selectedSymbolRef.current = symbol;
    setSelectedSymbol(symbol);
    setChartData(
      chartHistoryRef.current[symbol] ||
        (liveData[symbol] ? [toChartPoint(liveData[symbol])] : [])
    );
  };

  const handleBackToWatchlist = () => {
    selectedSymbolRef.current = null;
    setSelectedSymbol(null);
    setChartData([]);
  };

  const selectedTick = selectedSymbol ? liveData[selectedSymbol] : null;
  const selectedAlerts = selectedSymbol
    ? priceAlerts.filter((alert) => alert.symbol === selectedSymbol)
    : [];
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <main className="dashboard">
      <header className="dashboard__header">
        <div>
          <h1>Real-Time Market Dashboard</h1>
          <p className="dashboard__subtitle">Live NSE watchlist and charts</p>
        </div>

        <div className="dashboard__actions">
          {authUser && (
            <div className="user-session">
              <span>Signed in as {authUser.id}</span>
              <button type="button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}

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

      {!authUser && (
        <section className="auth-panel" aria-labelledby="auth-title">
          <h2 id="auth-title">
            {authMode === "login" ? "Sign in" : "Create account"}
          </h2>
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={authForm.username}
              onChange={(event) =>
                setAuthForm((prev) => ({
                  ...prev,
                  username: event.target.value
                }))
              }
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={
                authMode === "login" ? "current-password" : "new-password"
              }
              value={authForm.password}
              onChange={(event) =>
                setAuthForm((prev) => ({
                  ...prev,
                  password: event.target.value
                }))
              }
            />

            {authError && <p className="auth-error">{authError}</p>}

            <button type="submit" disabled={authStatus === "submitting"}>
              {authStatus === "submitting"
                ? "Working..."
                : authMode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <button
            className="auth-mode-toggle"
            type="button"
            onClick={() => {
              setAuthMode(authMode === "login" ? "register" : "login");
              setAuthError("");
            }}
          >
            {authMode === "login"
              ? "Create a new account"
              : "Use an existing account"}
          </button>
        </section>
      )}

      {authStatus === "checking" && (
        <p className="loading-copy">Checking saved session...</p>
      )}

      {authUser && (
        <>
      {notification && (
        <div className="price-alert-notification" role="status">
          <div>
            <strong>{notification.symbol} alert triggered</strong>
            <p>
              Target {notification.target} crossed at {notification.price}.
            </p>
            <p>Delivery: {notification.deliveryStatus || "pending"}</p>
          </div>
          <button type="button" onClick={() => setNotification(null)}>
            Dismiss
          </button>
        </div>
      )}

      {selectedSymbol ? (
        <StockDetail
          key={selectedSymbol}
          symbol={selectedSymbol}
          tick={selectedTick}
          chartData={chartData}
          priceAlerts={selectedAlerts}
          alertError={alertError}
          onSetPriceAlert={handleSetPriceAlert}
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
            status={watchlistStatus}
            errorMessage={watchlistError}
            onSelectSymbol={handleSelectSymbol}
            onRemoveSymbol={handleRemoveSymbol}
            onReorderSymbol={handleReorderSymbol}
          />
        </>
      )}
        </>
      )}
    </main>
  );
}

export default Dashboard;
