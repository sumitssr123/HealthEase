import axios from "axios";

// Configurable API base URL, defaults to proxy / current origin
const API_BASE_URL = process.env.REACT_APP_API_URL || "";

const API = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically inject JWT token into Authorization header
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Gracefully handle 401 Unauthorized responses
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
    }
    return Promise.reject(error);
  }
);

export default API;
