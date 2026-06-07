import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5050/api";

const api = axios.create({
  baseURL: API_BASE_URL
});

export const fetchHistoricalData = (payload) => {
  return api.post("/historical", payload);
};

export default api;
