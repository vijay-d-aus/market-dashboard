import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5050/api";

const api = axios.create({
  baseURL: API_BASE_URL
});

export const getAuthToken = () => {
  return localStorage.getItem("authToken") || "";
};

export const setAuthSession = ({ token, user }) => {
  localStorage.setItem("authToken", token);
  localStorage.setItem("authUser", JSON.stringify(user));
};

export const clearAuthSession = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
};

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser")) || null;
  } catch {
    return null;
  }
};

api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const login = (payload) => {
  return api.post("/auth/login", payload);
};

export const register = (payload) => {
  return api.post("/auth/register", payload);
};

export const fetchCurrentUser = () => {
  return api.get("/auth/me");
};

export const logout = () => {
  return api.post("/auth/logout");
};

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
