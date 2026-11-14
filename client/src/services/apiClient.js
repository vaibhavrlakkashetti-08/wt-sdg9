import axios from "axios";
import { handleUnauthorized } from "./session-events.js";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

apiClient.interceptors.response.use((response) => response, handleUnauthorized);

export async function getApiHealth({ signal } = {}) {
  const response = await apiClient.get("/health", { signal });
  return response.data.data;
}

export async function getCurrentUser({ signal } = {}) {
  const response = await apiClient.get("/auth/me", { signal });
  return response.data.data.user;
}

export async function registerAccount(credentials) {
  const response = await apiClient.post("/auth/register", credentials);
  return response.data.data.user;
}

export async function loginAccount(credentials) {
  const response = await apiClient.post("/auth/login", credentials);
  return response.data.data.user;
}

export async function logoutAccount() {
  const response = await apiClient.post("/auth/logout");
  return response.data.data;
}