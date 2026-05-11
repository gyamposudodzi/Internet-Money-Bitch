"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { SiteHeader } from "../components/site-header";
import { fallbackCatalog } from "../lib/fallback-catalog";
import { hrefForItem, WEB_STORAGE_KEY } from "../lib/catalog-data";
import { ingestTelegramFromCurrentUrl } from "../lib/telegram-session";

const initialState = {
  apiBaseUrl: "http://localhost:8000/api/v1",
  userId: "",
  telegramUserId: "",
  telegramUsername: "",
  telegramLinked: false,
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
  liveSearchSuggestions: [],
};

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

  const localSearchSuggestions = useMemo(() => {
    const normalized = debouncedSearchQuery.trim().toLowerCase();
    if (normalized.length < 2) return [];

    return allItems
      .filter((item) => item.title?.toLowerCase().includes(normalized))
      .slice(0, 6);
  }, [allItems, debouncedSearchQuery]);

  const searchSuggestions = state.liveSearchSuggestions.length
    ? state.liveSearchSuggestions
    : localSearchSuggestions;

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

    window.localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(payload));
  }

  useEffect(() => {
    let cancelled = false;
    const normalized = debouncedSearchQuery.trim();

    async function loadSearchSuggestions() {
      if (normalized.length < 2) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            liveSearchSuggestions: [],
            activeSuggestionIndex: -1,
          }));
        }
        return;
      }

      try {
        const response = await fetchJson(
          state.apiBaseUrl,
          `/search?q=${encodeURIComponent(normalized)}&limit=6`
        );
        if (cancelled) return;
        setState((current) => ({
          ...current,
          liveSearchSuggestions: response.data || [],
          activeSuggestionIndex: -1,
        }));
      } catch {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          liveSearchSuggestions: [],
          activeSuggestionIndex: -1,
        }));
      }
    }

    loadSearchSuggestions();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearchQuery, state.apiBaseUrl]);

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    ingestTelegramFromCurrentUrl();
    const raw = window.localStorage.getItem(WEB_STORAGE_KEY);

    if (!raw) {
      loadCollections({ savedRef: null });
      return;
    }

    try {
      const saved = JSON.parse(raw);
      if (saved.pointsBalance !== undefined) {
        delete saved.pointsBalance;
        window.localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(saved));
      }
      const telegramLinked = Boolean(
        saved.telegramLinked && (saved.userId || saved.telegramUserId || saved.telegramUsername)
      );
      setState((current) => ({
        ...current,
        apiBaseUrl: saved.apiBaseUrl || current.apiBaseUrl,
        userId: (saved.userId || "").trim() || current.userId,
        telegramUserId: (saved.telegramUserId || "").trim(),
        telegramUsername: (saved.telegramUsername || "").trim(),
        telegramLinked,
        featuredHeroIndex: Number.isFinite(saved.featuredHeroIndex)
          ? saved.featuredHeroIndex
          : current.featuredHeroIndex,
        isHeroPaused: Boolean(saved.isHeroPaused),
        activeSection: saved.activeSection || current.activeSection,
        activeView: saved.activeView === "wallet" ? "discover" : saved.activeView || current.activeView,
        activeDetailPanel: saved.activeDetailPanel || current.activeDetailPanel,
        activeFileId: saved.activeFileId || null,
        activeSession: saved.activeSession || null,
        searchQuery: saved.searchQuery || "",
        sortFilter: saved.sortFilter || current.sortFilter,
        typeFilter: saved.typeFilter || current.typeFilter,
        activeItemRef: saved.activeItemRef || null,
        pageStatus: telegramLinked
          ? `Telegram visitor${saved.telegramUsername ? ` @${saved.telegramUsername.replace(/^@/, "")}` : ""} — pick a title, then use Download on the title page.`
          : "Restoring your session.",
        pageStatusTone: telegramLinked ? "success" : "neutral",
      }));
      loadCollections({
        apiBaseUrl: saved.apiBaseUrl || initialState.apiBaseUrl,
        savedRef: saved.activeItemRef || null,
        sortFilter: saved.sortFilter || initialState.sortFilter,
      });
    } catch {
      window.localStorage.removeItem(WEB_STORAGE_KEY);
      ingestTelegramFromCurrentUrl();
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
        <section
          aria-labelledby="home-search-heading"
          className="search-strip search-strip-overlay"
        >
          <div className="search-strip-copy">
            <p className="eyebrow">Search</p>
            <h2 id="home-search-heading">Find something to watch</h2>
            <p className="search-strip-lede">Titles, years, and genres from the catalog.</p>
          </div>
          <div className="search-strip-bar">
            <label className="field search-field search-strip-field search-suggest-shell">
              <span>Catalog search</span>
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
                placeholder="Search movies, series, audio…"
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
                <p className="featured-stage-synopsis clamp-lines-4">
                  {featuredHero
                    ? state.activeItem?.slug === featuredHero.slug && state.activeItem?.synopsis
                      ? state.activeItem.synopsis
                      : "A bigger stage for the titles we want users to notice first."
                    : "Featured drops appear here first."}
                </p>
                {featuredHero ? (
                  <div className="featured-stage-actions">
                    <Link className="primary-button" href={hrefForItem(featuredHero)}>
                      View details
                    </Link>
                    <Link className="secondary-button hero-ghost-cta" href="/movies">
                      Browse catalog
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>

            {featuredStageItems.length > 1 ? (
              <div className="featured-stage-arrows">
                <button
                  aria-label="Previous featured title"
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
                  aria-label="Next featured title"
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
