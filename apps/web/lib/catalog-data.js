import { fallbackCatalog } from "./fallback-catalog";

export const WEB_STORAGE_KEY = "imb-web-session";
export const DEFAULT_API_BASE_URL = "http://localhost:8000/api/v1";

export function getStoredApiBaseUrl() {
  if (typeof window === "undefined") return DEFAULT_API_BASE_URL;

  try {
    const raw = window.localStorage.getItem(WEB_STORAGE_KEY);
    if (!raw) return DEFAULT_API_BASE_URL;
    const parsed = JSON.parse(raw);
    return parsed?.apiBaseUrl || DEFAULT_API_BASE_URL;
  } catch {
    return DEFAULT_API_BASE_URL;
  }
}

export async function fetchCatalogJson(path, options = {}) {
  const baseUrl = options.apiBaseUrl || getStoredApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Client-Platform": "web",
      "X-App-Version": "0.1.0",
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

export function hrefForItem(item) {
  if (item.content_type === "audio") return `/audio/${item.slug}`;
  if (item.content_type === "series") return `/series/${item.slug}`;
  return `/movies/${item.slug}`;
}

export function listFallbackMovies() {
  return fallbackCatalog.movies || [];
}

export function listFallbackSeries() {
  return fallbackCatalog.home.sections
    .flatMap((section) => section.items || [])
    .filter((item) => item.content_type === "series");
}

export function listFallbackAudio() {
  return fallbackCatalog.audio || [];
}

export function listFallbackKdrama() {
  return fallbackCatalog.home.sections
    .filter((section) => section.key === "kdrama" || section.title?.toLowerCase().includes("kdrama"))
    .flatMap((section) => section.items || []);
}

export function listFallbackAnime() {
  return fallbackCatalog.home.sections
    .filter((section) => section.key === "anime" || section.title?.toLowerCase().includes("anime"))
    .flatMap((section) => section.items || []);
}

export function listFallbackCartoons() {
  return fallbackCatalog.home.sections
    .filter((section) => section.key === "cartoons" || section.title?.toLowerCase().includes("cartoon"))
    .flatMap((section) => section.items || []);
}

export function searchFallbackItems(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return fallbackCatalog.home.sections
    .flatMap((section) => section.items || [])
    .filter((item) => item.title?.toLowerCase().includes(normalized));
}

export function getFallbackDetail(contentType, slug) {
  if (contentType === "audio") return fallbackCatalog.audioDetails?.[slug] || null;
  if (contentType === "movie") return fallbackCatalog.movieDetails?.[slug] || null;
  return (
    fallbackCatalog.home.sections
      .flatMap((section) => section.items || [])
      .find((item) => item.content_type === contentType && item.slug === slug) || null
  );
}
