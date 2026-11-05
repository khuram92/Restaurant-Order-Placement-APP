import axios from "axios";
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

/** Turns any API/network error into a readable message for the UI */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) return error.response.data.message;
    if (error.code === "ECONNABORTED")
      return "Request timed out. Please try again.";
    if (!error.response)
      return "Can't reach the server. Check your internet connection.";
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
