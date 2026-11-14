import axios from "axios";
import { handleUnauthorized } from "./session-events.js";

const versionedApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const apiRoot = versionedApiUrl.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");

export const platformApi = axios.create({
  baseURL: `${apiRoot}/api`,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

platformApi.interceptors.response.use((response) => response, handleUnauthorized);

export function getApiErrorMessage(error, fallback = "The request could not be completed.") {
  return error?.response?.data?.error?.message ?? fallback;
}