import { fetchCatalogJson, getStoredApiBaseUrl } from "./catalog-data";

export const FALLBACK_SITE_CONFIG = {
  telegram_bot_username: "",
  public_site_url: "",
  rewarded_ad_duration_seconds: 5,
  download_help_text:
    "Open Telegram, watch the short sponsored clip (~5 seconds), then the bot sends your file.",
  visitor_param_hint:
    "Use the link from the official Telegram channel or bot so this page receives your visitor ID (user_id or telegram_user_id in the URL). Then you can start a download.",
  telegram_demo_deep_link: "https://t.me/demo_bot?start=demo-token",
};

/**
 * Public site + Telegram delivery copy (from API admin settings).
 * Never throws; returns FALLBACK_SITE_CONFIG when the API is down.
 */
export async function fetchSiteConfig(options = {}) {
  const baseUrl = options.apiBaseUrl || getStoredApiBaseUrl();
  try {
    const response = await fetchCatalogJson("/site-config", { ...options, apiBaseUrl: baseUrl });
    const data = response?.data;
    if (!data || typeof data !== "object") return { ...FALLBACK_SITE_CONFIG };
    return {
      ...FALLBACK_SITE_CONFIG,
      ...data,
      rewarded_ad_duration_seconds: Number(data.rewarded_ad_duration_seconds) || FALLBACK_SITE_CONFIG.rewarded_ad_duration_seconds,
    };
  } catch {
    return { ...FALLBACK_SITE_CONFIG };
  }
}
