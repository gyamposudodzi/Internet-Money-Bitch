"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { SiteHeader } from "../components/site-header";
import { fallbackCatalog } from "../lib/fallback-catalog";
import { hrefForItem } from "../lib/catalog-data";

const storageKey = "imb-web-session";

const initialState = {
  apiBaseUrl: "http://localhost:8000/api/v1",
  userId: "",
  telegramUserId: "",
  telegramUsername: "",
  telegramLinked: false,
  pointsBalance: 0,
  homeSections: [],
  featuredItems: [],
  movieItems: [],
  audioItems: [],
  featuredHeroIndex: 0,
  isHeroPaused: false,
  activeSection: "movies",
  activeView: "discover",
  activeDetailPanel: "overview",
  activeItem: null,
  activeItemRef: null,
  activeFileId: null,
  activeSession: null,
  usingFallback: false,
  searchQuery: "",
  sortFilter: "featured",
  typeFilter: "all",
  pageStatus: "Loading the catalog.",
  pageStatusTone: "neutral",
  isRefreshing: false,
  searchSuggestionsOpen: false,
  activeSuggestionIndex: -1,
  sessionBusy: false,
  sessionFeedback: "",
  sessionFeedbackTone: "neutral",
};

function formatBytes(bytes) {
  if (!bytes) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function backgroundImage(url) {
  if (!url) return undefined;
  return {
    backgroundImage: `url("${url}")`,
  };
}

function mergeUniqueItems(...groups) {
  const byKey = new Map();
  groups.flat().forEach((item) => {
    byKey.set(`${item.content_type}:${item.slug}`, item);
  });
  return [...byKey.values()];
}

async function fetchJson(baseUrl, path, options = {}) {
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

function subtitleForView(activeView) {
  switch (activeView) {
    case "unlock":
      return "Move from file selection to Telegram delivery without losing context.";
    case "wallet":
      return "Track the points that let regular users skip ad steps when they have earned enough.";
    default:
      return "Browse the catalog first, then unlock files only when the user is ready.";
  }
}

function extractTelegramContext(searchParams) {
  const userId = searchParams.get("user_id")?.trim() || "";
  const telegramUserId = searchParams.get("telegram_user_id")?.trim() || "";
  const telegramUsername = searchParams.get("telegram_username")?.trim() || "";
  const pointsRaw = searchParams.get("points");
  const pointsBalance = pointsRaw !== null ? Number(pointsRaw) : null;

  const telegramLinked = Boolean(userId || telegramUserId || telegramUsername);
  if (!telegramLinked) return null;

  return {
    userId,
    telegramUserId,
    telegramUsername,
    telegramLinked: true,
    pointsBalance: Number.isFinite(pointsBalance) ? Math.max(0, pointsBalance) : 0,
  };
}

function subtitleForSection(activeSection) {
  switch (activeSection) {
    case "series":
      return "Browse long-form stories and return to Telegram only when the user is ready to unlock.";
    case "anime":
      return "Anime can live in its own lane even before the backend has a dedicated feed for it.";
    case "cartoons":
      return "Cartoons get their own shelf so family-friendly or animated content does not feel buried.";
    default:
      return "Browse movie drops first, then unlock files only when the user is ready.";
  }
}

export default function Page() {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const discoverSections = state.usingFallback ? fallbackCatalog.home.sections : state.homeSections;
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialState.searchQuery);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(state.searchQuery);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [state.searchQuery]);

  const allItems = useMemo(
    () =>
      mergeUniqueItems(
        discoverSections.flatMap((section) => section.items || []),
        state.featuredItems,
        state.movieItems,
        state.audioItems
      ),
    [discoverSections, state.featuredItems, state.movieItems, state.audioItems]
  );

  const activeCollections = useMemo(() => {
    if (state.activeSection === "movies") return state.movieItems;
    if (state.activeSection === "series") {
      return allItems.filter((item) => item.content_type === "series");
    }
    if (state.activeSection === "anime") {
      return allItems.filter((item) => {
        const title = item.title?.toLowerCase() || "";
        return title.includes("anime");
      });
    }
    if (state.activeSection === "cartoons") {
      return allItems.filter((item) => {
        const title = item.title?.toLowerCase() || "";
        return title.includes("cartoon");
      });
    }
    return state.movieItems;
  }, [allItems, state.activeSection, state.movieItems]);

  const searchSuggestions = useMemo(() => {
    const normalized = debouncedSearchQuery.trim().toLowerCase();
    if (normalized.length < 2) return [];

    return allItems
      .filter((item) => item.title?.toLowerCase().includes(normalized))
      .slice(0, 6);
  }, [allItems, debouncedSearchQuery]);

  const hero =
    activeCollections[0] ||
    discoverSections[0]?.items?.[0] ||
    state.featuredItems[0] ||
    state.movieItems[0] ||
    state.audioItems[0] ||
    null;
  const featuredStageItems =
    discoverSections[0]?.items?.length
      ? discoverSections[0].items
      : activeCollections.length
        ? activeCollections.slice(0, 6)
        : allItems.slice(0, 6);
  const featuredHero =
    featuredStageItems.length
      ? featuredStageItems[((state.featuredHeroIndex % featuredStageItems.length) + featuredStageItems.length) % featuredStageItems.length]
      : hero;
  const selectedFiles = state.activeItem?.files || [];
  const selectedFile =
    selectedFiles.find((file) => file.id === state.activeFileId) || selectedFiles[0] || null;

  function persistState(current) {
    if (typeof window === "undefined") return;

    const payload = {
      apiBaseUrl: current.apiBaseUrl,
      userId: current.userId,
      telegramUserId: current.telegramUserId,
      telegramUsername: current.telegramUsername,
      telegramLinked: current.telegramLinked,
      pointsBalance: current.pointsBalance,
      homeSections: current.homeSections,
      featuredHeroIndex: current.featuredHeroIndex,
      isHeroPaused: current.isHeroPaused,
      activeSection: current.activeSection,
      activeView: current.activeView,
      activeDetailPanel: current.activeDetailPanel,
      activeFileId: current.activeFileId,
      activeSession: current.activeSession,
      searchQuery: current.searchQuery,
      sortFilter: current.sortFilter,
      typeFilter: current.typeFilter,
      activeItemRef: current.activeItem
        ? { slug: current.activeItem.slug, content_type: current.activeItem.content_type }
        : current.activeItemRef,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }

  function applyFallbackCollections(apiBaseUrl, savedRef = null) {
    const homeSections = fallbackCatalog.home.sections;
    const featuredItems = homeSections.flatMap((section) => section.items || []);
    const movieItems = fallbackCatalog.movies;
    const audioItems = fallbackCatalog.audio;
    const merged = mergeUniqueItems(featuredItems, movieItems, audioItems);
    const firstItem = merged[0] || null;
    const restored =
      savedRef && merged.find((item) => item.slug === savedRef.slug && item.content_type === savedRef.content_type);

    setState((current) => ({
      ...current,
      apiBaseUrl,
      usingFallback: true,
      homeSections,
      featuredItems,
      movieItems,
      audioItems,
      pageStatus: "Using fallback catalog data because the live API is unavailable.",
      pageStatusTone: "warning",
    }));

    return restored || firstItem;
  }

  async function loadItemDetails(item, options = {}) {
    const usingFallback = options.usingFallback ?? state.usingFallback;
    const apiBaseUrl = options.apiBaseUrl ?? state.apiBaseUrl;

    if (!item) return null;

    if (usingFallback) {
      if (item.content_type === "audio") return fallbackCatalog.audioDetails[item.slug];
      if (item.content_type === "movie") return fallbackCatalog.movieDetails[item.slug];
      return item;
    }

    const path =
      item.content_type === "audio"
        ? `/audio/${item.slug}`
        : item.content_type === "series"
          ? `/series/${item.slug}`
          : `/movies/${item.slug}`;

    const response = await fetchJson(apiBaseUrl, path);
    return response.data;
  }

  async function selectItem(item, options = {}) {
    if (!item) return;

    try {
      const detailedItem = await loadItemDetails(item, options);
      setState((current) => {
        const nextState = {
          ...current,
          activeItem: detailedItem,
          activeItemRef: detailedItem
            ? { slug: detailedItem.slug, content_type: detailedItem.content_type }
            : null,
          activeFileId: detailedItem.files?.[0]?.id || null,
          activeSession: null,
          activeView: "discover",
          activeDetailPanel: "overview",
          sessionFeedback: "",
          sessionFeedbackTone: "neutral",
        };
        persistState(nextState);
        return nextState;
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        pageStatus: `Could not load details for this title. ${error.message}`,
        pageStatusTone: "danger",
      }));
    }
  }

  async function loadCollections(options = {}) {
    const apiBaseUrl = (options.apiBaseUrl ?? state.apiBaseUrl).trim();
    const savedRef = options.savedRef ?? state.activeItemRef;

    setState((current) => ({
      ...current,
      isRefreshing: true,
      pageStatus: "Refreshing the catalog.",
      pageStatusTone: "neutral",
    }));

    try {
      const [homeResponse, moviesResponse, audioResponse] = await Promise.all([
        fetchJson(apiBaseUrl, "/home"),
        fetchJson(apiBaseUrl, `/movies?sort=${encodeURIComponent(options.sortFilter ?? state.sortFilter)}`),
        fetchJson(apiBaseUrl, "/audio"),
      ]);

      const homeSections = homeResponse.data.sections || [];
      const featuredItems = homeSections.flatMap((section) => section.items || []);
      const movieItems = moviesResponse.data || [];
      const audioItems = audioResponse.data || [];
      const merged = mergeUniqueItems(featuredItems, movieItems, audioItems);
      const restored =
        savedRef && merged.find((item) => item.slug === savedRef.slug && item.content_type === savedRef.content_type);
      const firstItem = restored || merged[0] || null;

      setState((current) => ({
        ...current,
        apiBaseUrl,
        userId: current.userId.trim(),
        usingFallback: false,
        homeSections,
        featuredItems,
        movieItems,
        audioItems,
        isRefreshing: false,
        pageStatus: "Catalog synced from the live API.",
        pageStatusTone: "success",
      }));

      if (firstItem) {
        await selectItem(firstItem, { usingFallback: false, apiBaseUrl });
      }
    } catch (error) {
      const firstItem = applyFallbackCollections(apiBaseUrl, savedRef);
      setState((current) => ({
        ...current,
        isRefreshing: false,
      }));

      if (firstItem) {
        await selectItem(firstItem, { usingFallback: true, apiBaseUrl });
      }
    }
  }

  function performSearch() {
    const query = state.searchQuery.trim();
    if (!query) return;
    setState((current) => ({
      ...current,
      searchSuggestionsOpen: false,
      activeSuggestionIndex: -1,
    }));
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  function handleSuggestionSelect(item) {
    setState((current) => ({
      ...current,
      searchQuery: item.title || current.searchQuery,
      searchSuggestionsOpen: false,
      activeSuggestionIndex: -1,
    }));
    router.push(hrefForItem(item));
  }

  async function createSession(consumePoints) {
    if (!selectedFile) return;

    if (!state.telegramLinked || !state.userId) {
      setState((current) => ({
        ...current,
        sessionBusy: false,
        activeView: "unlock",
        activeDetailPanel: "unlock",
        sessionFeedback:
          "This file can be unlocked after your Telegram details are available.",
        sessionFeedbackTone: "warning",
      }));
      return;
    }

    setState((current) => ({
      ...current,
      sessionBusy: true,
      sessionFeedback: consumePoints ? "Using points to unlock this file..." : "Starting unlock session...",
      sessionFeedbackTone: "neutral",
    }));

    try {
      if (state.usingFallback) {
        setState((current) => {
          const nextState = {
            ...current,
            pointsBalance: consumePoints
              ? Math.max(0, current.pointsBalance - selectedFile.points_cost)
              : current.pointsBalance,
            activeSession: {
              download_session_id: "demo-session",
              session_token: "demo-token",
              ad_required: !consumePoints,
              points_cost: selectedFile.points_cost,
              points_spent: consumePoints ? selectedFile.points_cost : 0,
              telegram_deep_link: "https://t.me/demo_bot?start=demo-token",
              expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              status: consumePoints ? "created" : "ad_pending",
              content_file_id: selectedFile.id,
            },
            activeView: "unlock",
            activeDetailPanel: "unlock",
            sessionBusy: false,
            sessionFeedback: consumePoints
              ? "Points spent. The file is ready for Telegram handoff."
              : "Demo session created. Continue the unlock flow in Telegram.",
            sessionFeedbackTone: "success",
          };
          persistState(nextState);
          return nextState;
        });
        return;
      }

      const response = await fetchJson(state.apiBaseUrl, "/download-sessions", {
        method: "POST",
        body: JSON.stringify({
          content_file_id: selectedFile.id,
          consume_points: consumePoints,
          user_id: state.userId,
        }),
      });

      setState((current) => {
        const nextState = {
          ...current,
          pointsBalance:
            consumePoints && response.data.points_spent
              ? Math.max(0, current.pointsBalance - response.data.points_spent)
              : current.pointsBalance,
          activeSession: response.data,
          activeView: "unlock",
          activeDetailPanel: "unlock",
          sessionBusy: false,
          sessionFeedback: response.data.ad_required
            ? "Session created. Complete the rewarded step, then continue in Telegram."
            : "Session unlocked. Telegram can open the file immediately.",
          sessionFeedbackTone: "success",
        };
        persistState(nextState);
        return nextState;
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        sessionBusy: false,
        sessionFeedback: `Could not create a session. ${error.message}`,
        sessionFeedbackTone: "danger",
      }));
    }
  }

  async function usePointsForSession() {
    if (!state.activeSession) return;

    setState((current) => ({
      ...current,
      sessionBusy: true,
      sessionFeedback: "Spending points to bypass the ad step...",
      sessionFeedbackTone: "neutral",
    }));

    try {
      if (state.usingFallback) {
        setState((current) => {
          const nextState = {
            ...current,
            pointsBalance: Math.max(0, current.pointsBalance - current.activeSession.points_cost),
            activeSession: {
              ...current.activeSession,
              ad_required: false,
              status: "created",
              points_spent: current.activeSession.points_cost,
            },
            sessionBusy: false,
            sessionFeedback: "Points applied. Telegram can now open the file immediately.",
            sessionFeedbackTone: "success",
          };
          persistState(nextState);
          return nextState;
        });
        return;
      }

      const response = await fetchJson(
        state.apiBaseUrl,
        `/download-sessions/${state.activeSession.download_session_id}/use-points?user_id=${encodeURIComponent(state.userId)}`,
        { method: "POST" }
      );

      setState((current) => {
        const nextState = {
          ...current,
          pointsBalance: Math.max(0, current.pointsBalance - response.data.points_spent),
          activeSession: response.data,
          sessionBusy: false,
          sessionFeedback: "Points applied. The unlock step is complete.",
          sessionFeedbackTone: "success",
        };
        persistState(nextState);
        return nextState;
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        sessionBusy: false,
        sessionFeedback: `Could not spend points for this session. ${error.message}`,
        sessionFeedbackTone: "danger",
      }));
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(storageKey);
    const telegramContext = extractTelegramContext(new URLSearchParams(window.location.search));
    if (!raw) {
      if (telegramContext) {
        setState((current) => ({
          ...current,
          ...telegramContext,
          pageStatus: `Telegram visitor detected${telegramContext.telegramUsername ? ` for @${telegramContext.telegramUsername}` : ""}.`,
          pageStatusTone: "success",
        }));
        window.history.replaceState({}, "", window.location.pathname);
      }
      loadCollections({ savedRef: null });
      return;
    }

    try {
      const saved = JSON.parse(raw);
      const mergedTelegramContext = telegramContext || {
        userId: saved.userId || "",
        telegramUserId: saved.telegramUserId || "",
        telegramUsername: saved.telegramUsername || "",
        telegramLinked: Boolean(saved.telegramLinked),
        pointsBalance: saved.telegramLinked ? saved.pointsBalance ?? 0 : 0,
      };
      setState((current) => ({
        ...current,
        apiBaseUrl: saved.apiBaseUrl || current.apiBaseUrl,
        userId: mergedTelegramContext.userId || current.userId,
        telegramUserId: mergedTelegramContext.telegramUserId || "",
        telegramUsername: mergedTelegramContext.telegramUsername || "",
        telegramLinked: Boolean(mergedTelegramContext.telegramLinked),
        pointsBalance: mergedTelegramContext.telegramLinked
          ? mergedTelegramContext.pointsBalance ?? current.pointsBalance
          : 0,
        featuredHeroIndex: Number.isFinite(saved.featuredHeroIndex)
          ? saved.featuredHeroIndex
          : current.featuredHeroIndex,
        isHeroPaused: Boolean(saved.isHeroPaused),
        activeSection: saved.activeSection || current.activeSection,
        activeView:
          saved.activeView === "wallet" && !mergedTelegramContext.telegramLinked
            ? "discover"
            : saved.activeView || current.activeView,
        activeDetailPanel: saved.activeDetailPanel || current.activeDetailPanel,
        activeFileId: saved.activeFileId || null,
        activeSession: saved.activeSession || null,
        searchQuery: saved.searchQuery || "",
        sortFilter: saved.sortFilter || current.sortFilter,
        typeFilter: saved.typeFilter || current.typeFilter,
        activeItemRef: saved.activeItemRef || null,
        pageStatus: mergedTelegramContext.telegramLinked
          ? `Restoring your Telegram-linked session${mergedTelegramContext.telegramUsername ? ` for @${mergedTelegramContext.telegramUsername}` : ""}.`
          : "Restoring your session.",
        pageStatusTone: "neutral",
      }));
      if (telegramContext) {
        window.history.replaceState({}, "", window.location.pathname);
      }
      loadCollections({
        apiBaseUrl: saved.apiBaseUrl || initialState.apiBaseUrl,
        savedRef: saved.activeItemRef || null,
        sortFilter: saved.sortFilter || initialState.sortFilter,
      });
    } catch {
      window.localStorage.removeItem(storageKey);
      if (telegramContext) {
        setState((current) => ({
          ...current,
          ...telegramContext,
          pageStatus: `Telegram visitor detected${telegramContext.telegramUsername ? ` for @${telegramContext.telegramUsername}` : ""}.`,
          pageStatusTone: "success",
        }));
        window.history.replaceState({}, "", window.location.pathname);
      }
      loadCollections();
    }
  }, []);

  useEffect(() => {
    persistState(state);
  }, [
    state.activeDetailPanel,
    state.activeFileId,
    state.activeItem,
    state.activeItemRef,
    state.featuredHeroIndex,
    state.isHeroPaused,
    state.activeSection,
    state.activeSession,
    state.activeView,
    state.apiBaseUrl,
    state.pointsBalance,
    state.searchQuery,
    state.sortFilter,
    state.telegramLinked,
    state.telegramUserId,
    state.telegramUsername,
    state.typeFilter,
    state.userId,
  ]);

  useEffect(() => {
    if (featuredStageItems.length <= 1 || state.isHeroPaused) return undefined;

    const intervalId = window.setInterval(() => {
      setState((current) => ({
        ...current,
        featuredHeroIndex:
          current.featuredHeroIndex >= featuredStageItems.length - 1
            ? 0
            : current.featuredHeroIndex + 1,
      }));
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [featuredStageItems.length, state.isHeroPaused]);

  const modeLabel = state.usingFallback ? "Fallback demo" : "Live API";
  const laneLabel = `${state.activeSection.charAt(0).toUpperCase()}${state.activeSection.slice(1)}`;
  const typeLabel = state.activeItem?.content_type
    ? `${state.activeItem.content_type.charAt(0).toUpperCase()}${state.activeItem.content_type.slice(1)}`
    : "Waiting";

  function renderCarouselSection(section) {
    const items = section.items || [];
    if (!items.length) return null;

    return (
      <section className="carousel-section" key={section.key || section.slug || section.title}>
        <div className="carousel-head">
          <div>
            <h3>{section.title}</h3>
          </div>
          <span className="carousel-count">
            {items.length} title{items.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="carousel-row">
          {items.map((item) => (
            <Link
              key={`${item.content_type}-${item.slug}`}
              className="carousel-card"
              href={hrefForItem(item)}
              style={backgroundImage(item.poster_url)}
            >
              <div className="carousel-card-copy">
                <p className="eyebrow">{item.content_type}</p>
                <h4>{item.title}</h4>
                <p>{item.release_year || "Fresh drop"}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  function renderFeaturedStage() {
    if (!featuredHero && !featuredStageItems.length) return null;

    return (
      <section
        className="featured-stage"
        onMouseEnter={() => setState((current) => ({ ...current, isHeroPaused: true }))}
        onMouseLeave={() => setState((current) => ({ ...current, isHeroPaused: false }))}
        style={backgroundImage(featuredHero?.backdrop_url || featuredHero?.poster_url)}
      >
        <div className="featured-stage-overlay" />
        <section className="search-strip search-strip-overlay">
          <div className="search-strip-copy">
            <p className="eyebrow">Search</p>
            <h2>Find a movie</h2>
          </div>
          <div className="search-strip-bar">
            <label className="field search-field search-strip-field search-suggest-shell">
              <span>Movie search</span>
              <input
                onBlur={() => {
                  window.setTimeout(() => {
                    setState((current) => ({
                      ...current,
                      searchSuggestionsOpen: false,
                      activeSuggestionIndex: -1,
                    }));
                  }, 120);
                }}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    searchQuery: event.target.value,
                    searchSuggestionsOpen: true,
                    activeSuggestionIndex: -1,
                  }))
                }
                onFocus={() =>
                  setState((current) => ({
                    ...current,
                    searchSuggestionsOpen: true,
                  }))
                }
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    if (!searchSuggestions.length) return;
                    setState((current) => ({
                      ...current,
                      searchSuggestionsOpen: true,
                      activeSuggestionIndex:
                        current.activeSuggestionIndex >= searchSuggestions.length - 1
                          ? 0
                          : current.activeSuggestionIndex + 1,
                    }));
                    return;
                  }

                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    if (!searchSuggestions.length) return;
                    setState((current) => ({
                      ...current,
                      searchSuggestionsOpen: true,
                      activeSuggestionIndex:
                        current.activeSuggestionIndex <= 0
                          ? searchSuggestions.length - 1
                          : current.activeSuggestionIndex - 1,
                    }));
                    return;
                  }

                  if (event.key === "Escape") {
                    setState((current) => ({
                      ...current,
                      searchSuggestionsOpen: false,
                      activeSuggestionIndex: -1,
                    }));
                    return;
                  }

                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (
                      state.searchSuggestionsOpen &&
                      state.activeSuggestionIndex >= 0 &&
                      searchSuggestions[state.activeSuggestionIndex]
                    ) {
                      handleSuggestionSelect(searchSuggestions[state.activeSuggestionIndex]);
                      return;
                    }
                    performSearch();
                  }
                }}
                placeholder="Search for movies"
                value={state.searchQuery}
              />
              {state.searchSuggestionsOpen && state.searchQuery.trim().length >= 2 ? (
                <div className="search-suggestions">
                  {searchSuggestions.length ? (
                    searchSuggestions.map((item) => (
                      <button
                        className={`search-suggestion-item ${
                          searchSuggestions[state.activeSuggestionIndex]?.slug === item.slug &&
                          searchSuggestions[state.activeSuggestionIndex]?.content_type === item.content_type
                            ? "is-active"
                            : ""
                        }`}
                        key={`${item.content_type}-${item.slug}`}
                        onMouseDown={() => handleSuggestionSelect(item)}
                        onMouseEnter={() =>
                          setState((current) => ({
                            ...current,
                            activeSuggestionIndex: searchSuggestions.findIndex(
                              (entry) =>
                                entry.slug === item.slug && entry.content_type === item.content_type
                            ),
                          }))
                        }
                        type="button"
                      >
                        <span
                          className="search-suggestion-thumb"
                          style={backgroundImage(item.poster_url)}
                        />
                        <span className="search-suggestion-copy">
                          <span>{item.title}</span>
                          <strong>
                            {[item.content_type, item.release_year].filter(Boolean).join(" | ") || "Title"}
                          </strong>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="search-suggestion-empty">No matching titles yet.</div>
                  )}
                </div>
              ) : null}
            </label>
            <button className="primary-button" onClick={performSearch} type="button">
              Search
            </button>
          </div>
        </section>

        <div className="featured-stage-shell">
          <div className="featured-stage-top">
            <div className="featured-stage-content">
              <Link
                className="featured-poster-card"
                href={featuredHero ? hrefForItem(featuredHero) : "#"}
                style={backgroundImage(featuredHero?.poster_url)}
              />
              <div className="featured-stage-copy">
                <h2>{featuredHero?.title || "Tonight's picks"}</h2>
                <p className="featured-stage-meta">
                  {featuredHero
                    ? [featuredHero.content_type, featuredHero.release_year]
                        .filter(Boolean)
                        .join(" | ")
                    : "Featured title"}
                </p>
                <p>
                  {featuredHero
                    ? state.activeItem?.slug === featuredHero.slug && state.activeItem?.synopsis
                      ? state.activeItem.synopsis
                      : "A bigger stage for the titles we want users to notice first."
                    : "Featured drops appear here first."}
                </p>
              </div>
            </div>

            {featuredStageItems.length > 1 ? (
              <div className="featured-stage-arrows">
                <button
                  className="hero-arrow"
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      isHeroPaused: true,
                      featuredHeroIndex:
                        current.featuredHeroIndex <= 0
                          ? featuredStageItems.length - 1
                          : current.featuredHeroIndex - 1,
                    }))
                  }
                  type="button"
                >
                  ‹
                </button>
                <button
                  className="hero-arrow"
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      isHeroPaused: true,
                      featuredHeroIndex:
                        current.featuredHeroIndex >= featuredStageItems.length - 1
                          ? 0
                          : current.featuredHeroIndex + 1,
                    }))
                  }
                  type="button"
                >
                  ›
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="page-shell">
      <SiteHeader activeKey="home" />

      <div className="app-shell">
        {renderFeaturedStage()}

        <section className="home-carousel-stack">
          {discoverSections.length ? (
            discoverSections.map((section) => renderCarouselSection(section))
          ) : (
            <section className="carousel-section">
              <p className="empty-state">Homepage rows will appear here after they are configured in admin.</p>
            </section>
          )}
        </section>

      </div>
    </div>
  );
}
