import axios, { type AxiosRequestConfig } from "axios";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
});

export function authHeaders(accessToken?: string | null): AxiosRequestConfig {
  return accessToken
    ? { headers: { Authorization: `Bearer ${accessToken}` } }
    : {};
}
