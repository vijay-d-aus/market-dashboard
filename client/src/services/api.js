import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5050/api";

const api = axios.create({
  baseURL: API_BASE_URL
});

export const getDemoUserId = () => {
  return localStorage.getItem("demoUserId") || "demo-user";
};

export const setDemoUserId = (userId) => {
  const normalizedUserId = String(userId || "demo-user").trim() || "demo-user";
  localStorage.setItem("demoUserId", normalizedUserId);
  return normalizedUserId;
};

api.interceptors.request.use((config) => {
  config.headers["X-Demo-User"] = getDemoUserId();
  return config;
});

export const fetchHistoricalData = (payload) => {
  return api.post("/historical", payload);
};

export const fetchWatchlist = () => {
  return api.get("/watchlist");
};

export const saveWatchlist = (symbols) => {
  return api.put("/watchlist", { symbols });
};

export const fetchAlerts = () => {
  return api.get("/alerts");
};

export const createPriceAlert = (payload) => {
  return api.post("/alerts", payload);
};

export default api;
