import axios, { type InternalAxiosRequestConfig } from "axios";
import { getToken } from "./storage";

const baseURL = process.env.EXPO_PUBLIC_API_URL;

if (!baseURL) {
  console.warn("⚠️ EXPO_PUBLIC_API_URL is not set in .env");
}

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Attach the token to every request automatically
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
let onSessionEnded: (() => void) | null = null;
export const setSessionEndedHandler = (handler: (() => void) | null) => {
  onSessionEnded = handler;
};

api.interceptors.response.use(undefined, (error: unknown) => {
  // Only for requests that carried a token (a wrong password at login is also 401)
  if (
    axios.isAxiosError(error) &&
    error.response?.status === 401 &&
    error.config?.headers?.Authorization
  ) {
    onSessionEnded?.();
  }
  throw error;
});
const MAX_RETRIES = 2;
api.interceptors.response.use(undefined, async (error: unknown) => {
  const config = axios.isAxiosError(error)
    ? (error.config as (InternalAxiosRequestConfig & { _retry?: number }) | undefined)
    : undefined;
  const isNetworkProblem = axios.isAxiosError(error) && !error.response;
  const isGet = (config?.method ?? "get").toLowerCase() === "get";
  if (!config || !isNetworkProblem || !isGet) throw error;

  config._retry = (config._retry ?? 0) + 1;
  if (config._retry > MAX_RETRIES) throw error;
  await new Promise((r) => setTimeout(r, 1000 * config._retry!));
  return api(config);
});

/** Turns any API/network error into a readable message for the UI */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) return error.response.data.message;
     if (error.code === "ECONNABORTED")
      return "This is taking too long. Check your internet and try again.";
    if (!error.response)
      return "You seem to be offline. Check your internet and try again.";
  }
  if (error instanceof Error && error.message) {
    // fetch network failures say "Network request failed"
    if (error.message.includes("Network request failed")) {
      return "Can't reach the server. Check your internet connection.";
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
};
