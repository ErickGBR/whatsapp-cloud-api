import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract server error message early
    const serverMsg = error.response?.data?.error;

    // Don't redirect on login attempts (expected to return 401 for bad creds)
    const url: string = error.config?.url || "";
    const isLoginRequest = url.includes("/auth/login") || url.includes("/api/auth/login");
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    // Enrich error with server message when available
    if (serverMsg) {
      error.message = serverMsg;
    }
    return Promise.reject(error);
  }
);

export default api;
