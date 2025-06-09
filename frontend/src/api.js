// frontend/src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// Añade el JWT a todas las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token ha caducado (401/403), lo elimina
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    if (response && (response.status === 401 || response.status === 403)) {
      localStorage.removeItem("token");
      window.location.href = "/";   // Redirección completa
    }
    // Propaga el error para que cada componente lo maneje si lo necesita
    return Promise.reject(error);
  }
);

export default api;
