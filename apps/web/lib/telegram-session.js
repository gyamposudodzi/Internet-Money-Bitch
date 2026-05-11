import { WEB_STORAGE_KEY } from "./catalog-data";

function safeParseStorage() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(WEB_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Reads Telegram visitor params when the user is sent from the Telegram channel / bot to the site.
 * Supports: user_id, telegram_user_id, telegram_username (or username).
 */
export function parseTelegramParams(searchParams) {
  const user_id = searchParams.get("user_id")?.trim() || "";
  const telegram_user_id = searchParams.get("telegram_user_id")?.trim() || "";
  const telegram_username_raw =
    searchParams.get("telegram_username")?.trim() ||
    searchParams.get("username")?.trim() ||
    "";
  const telegram_username = telegram_username_raw.replace(/^@/, "");
  const resolvedUserId = user_id || telegram_user_id;
  const linked = Boolean(resolvedUserId || telegram_username);
  if (!linked) return null;
  return {
    userId: resolvedUserId,
    telegramUserId: telegram_user_id || user_id || "",
    telegramUsername: telegram_username,
    telegramLinked: true,
  };
}

/**
 * Merges query-string identity into the shared web session blob and strips sensitive params from the URL.
 * Call on the homepage and on any route that should recognize Telegram deep links (e.g. title pages).
 */
export function ingestTelegramFromCurrentUrl() {
  if (typeof window === "undefined") {
    return { userId: "", telegramUserId: "", telegramUsername: "", telegramLinked: false };
  }

  const fromUrl = parseTelegramParams(new URLSearchParams(window.location.search));
  const stored = safeParseStorage();

  if (fromUrl) {
    const merged = {
      ...stored,
      userId: fromUrl.userId || stored.userId || "",
      telegramUserId: fromUrl.telegramUserId || stored.telegramUserId || "",
      telegramUsername: fromUrl.telegramUsername || stored.telegramUsername || "",
      telegramLinked: true,
    };
    delete merged.pointsBalance;
    window.localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(merged));
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
  }

  const next = safeParseStorage();
  const userId = (next.userId || "").trim();
  const telegramUserId = (next.telegramUserId || "").trim();
  const telegramUsername = (next.telegramUsername || "").trim();
  const telegramLinked = Boolean(
    next.telegramLinked && (userId || telegramUserId || telegramUsername)
  );

  return { userId, telegramUserId, telegramUsername, telegramLinked };
}
