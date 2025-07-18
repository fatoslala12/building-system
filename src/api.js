import axios from "axios";

const api = axios.create({
  baseURL: "https://building-system.onrender.com",
});

// Interceptor për të shtuar token-in në çdo kërkesë
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
