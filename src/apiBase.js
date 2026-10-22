const DEFAULT_PRODUCTION_API_BASE = "https://deluxe-tunes-api.onrender.com";
const LOCAL_API_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const isLocalFrontend = typeof window !== "undefined" &&
  (LOCAL_API_HOSTS.has(window.location.hostname) || window.location.protocol === "file:");

export function resolveApiBase(candidates) {
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    try {
      const parsed = new URL(candidate.trim());
      if (!["https:", "http:"].includes(parsed.protocol)) continue;
      if (!isLocalFrontend && (parsed.protocol !== "https:" || LOCAL_API_HOSTS.has(parsed.hostname))) continue;
      return parsed.origin.replace(/\/+$/, "");
    } catch {
      continue;
    }
  }
  return import.meta.env.DEV && isLocalFrontend ? "http://localhost:8787" : DEFAULT_PRODUCTION_API_BASE;
}

const runtimeApiBases = typeof window !== "undefined" ? [
  window.__DT_API_BASE__,
  window.__DT_OAUTH_BASE__,
  window.__DT_CONFIG__?.apiBaseUrl,
  window.__DT_CONFIG__?.oauthBaseUrl,
] : [];

export const API_BASE = resolveApiBase([
  import.meta.env.VITE_API_BASE_URL,
  ...runtimeApiBases,
  import.meta.env.VITE_OAUTH_BASE_URL,
  import.meta.env.VITE_APP_ORIGIN,
]);
export const BACKEND_ENABLED = true;
