"use client";

import { useEffect, useState } from "react";

import { fallbackCatalog } from "../lib/fallback-catalog";

const initialState = {
  apiBaseUrl: "http://localhost:8000/api/v1",
  userId: "22222222-2222-2222-2222-222222222222",
  pointsBalance: 30,
  featuredItems: [],
  movieItems: [],
  audioItems: [],
  activeSection: "featured",
  activeView: "discover",
  activeDetailPanel: "overview",
  activeItem: null,
  activeFileId: null,
  activeSession: null,
  usingFallback: false,
  searchQuery: "",
  sortFilter: "featured",
  typeFilter: "all",
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
    backgroundImage: `linear-gradient(180deg, rgba(12,18,20,0.08), rgba(12,18,20,0.82)), url("${url}")`,
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
  const [state, setState] = useState(initialState);

  const activeCollections =
    state.activeSection === "movies"
      ? state.movieItems
      : state.activeSection === "audio"
        ? state.audioItems
        : state.featuredItems;

  const allItems = mergeUniqueItems(state.featuredItems, state.movieItems, state.audioItems);
  const hero = state.featuredItems[0] || state.movieItems[0] || state.audioItems[0] || null;
  const selectedFiles = state.activeItem?.files || [];
  const selectedFile =
    selectedFiles.find((file) => file.id === state.activeFileId) || selectedFiles[0] || null;

  async function loadCollections() {
    const apiBaseUrl = state.apiBaseUrl.trim();
    try {
      const [homeResponse, moviesResponse, audioResponse] = await Promise.all([
        fetchJson(apiBaseUrl, "/home"),
        fetchJson(apiBaseUrl, `/movies?sort=${encodeURIComponent(state.sortFilter)}`),
        fetchJson(apiBaseUrl, "/audio"),
      ]);

      const featuredItems = (homeResponse.data.sections || []).flatMap((section) => section.items || []);
      const movieItems = moviesResponse.data || [];
      const audioItems = audioResponse.data || [];

      const firstItem =
        state.activeItem ||
        mergeUniqueItems(featuredItems, movieItems, audioItems)[0] ||
        null;

      setState((current) => ({
        ...current,
        apiBaseUrl,
        userId: current.userId.trim(),
        usingFallback: false,
        featuredItems,
        movieItems,
        audioItems,
      }));

      if (!state.activeItem && firstItem) {
        await selectItem(firstItem, { usingFallback: false, apiBaseUrl });
      }
    } catch (error) {
      const featuredItems = fallbackCatalog.home.sections.flatMap((section) => section.items || []);
      const movieItems = fallbackCatalog.movies;
      const audioItems = fallbackCatalog.audio;
      const firstItem =
        state.activeItem ||
        mergeUniqueItems(featuredItems, movieItems, audioItems)[0] ||
        null;

      setState((current) => ({
        ...current,
        apiBaseUrl,
        userId: current.userId.trim(),
        usingFallback: true,
        featuredItems,
        movieItems,
        audioItems,
      }));

      if (!state.activeItem && firstItem) {
        await selectItem(firstItem, { usingFallback: true, apiBaseUrl });
      }
    }
  }

  async function loadItemDetails(item, options = {}) {
    const usingFallback = options.usingFallback ?? state.usingFallback;
    const apiBaseUrl = options.apiBaseUrl ?? state.apiBaseUrl;

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
    const detailedItem = await loadItemDetails(item, options);
    setState((current) => ({
      ...current,
      activeItem: detailedItem,
      activeFileId: detailedItem.files?.[0]?.id || null,
      activeSession: null,
      activeView: "discover",
      activeDetailPanel: "overview",
    }));
  }

  async function performSearch() {
    const query = state.searchQuery.trim();
    if (!query) {
      await loadCollections();
      return;
    }

    if (state.usingFallback) {
      const items = allItems.filter((item) => {
        const matchesType = state.typeFilter === "all" || item.content_type === state.typeFilter;
        return matchesType && item.title.toLowerCase().includes(query.toLowerCase());
      });
      setState((current) => ({
        ...current,
        activeSection: "featured",
        featuredItems: items,
      }));
      return;
    }

    try {
      const params = new URLSearchParams({ q: query });
      if (state.typeFilter !== "all") params.set("type", state.typeFilter);
      const response = await fetchJson(state.apiBaseUrl, `/search?${params.toString()}`);
      setState((current) => ({
        ...current,
        activeSection: "featured",
        featuredItems: response.data || [],
      }));
    } catch (error) {
      console.warn("Search failed.", error);
    }
  }

  async function createSession(consumePoints) {
    if (!selectedFile) return;

    try {
      if (state.usingFallback) {
        setState((current) => ({
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
        }));
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

      setState((current) => ({
        ...current,
        pointsBalance:
          consumePoints && response.data.points_spent
            ? Math.max(0, current.pointsBalance - response.data.points_spent)
            : current.pointsBalance,
        activeSession: response.data,
        activeView: "unlock",
        activeDetailPanel: "unlock",
      }));
    } catch (error) {
      console.warn("Session failed.", error);
    }
  }

  async function usePointsForSession() {
    if (!state.activeSession) return;

    try {
      if (state.usingFallback) {
        setState((current) => ({
          ...current,
          pointsBalance: Math.max(0, current.pointsBalance - current.activeSession.points_cost),
          activeSession: {
            ...current.activeSession,
            ad_required: false,
            status: "created",
            points_spent: current.activeSession.points_cost,
          },
        }));
        return;
      }

      const response = await fetchJson(
        state.apiBaseUrl,
        `/download-sessions/${state.activeSession.download_session_id}/use-points?user_id=${encodeURIComponent(state.userId)}`,
        { method: "POST" }
      );

      setState((current) => ({
        ...current,
        pointsBalance: Math.max(0, current.pointsBalance - response.data.points_spent),
        activeSession: response.data,
      }));
    } catch (error) {
      console.warn("Point bypass failed.", error);
    }
  }

  useEffect(() => {
    loadCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modeLabel = state.usingFallback ? "Fallback demo" : "Live API";
  const laneLabel = `${state.activeSection.charAt(0).toUpperCase()}${state.activeSection.slice(1)}`;
  const typeLabel = state.activeItem?.content_type
    ? `${state.activeItem.content_type.charAt(0).toUpperCase()}${state.activeItem.content_type.slice(1)}`
    : "Waiting";

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand-cluster">
          <p className="eyebrow">Internet Money Bitch</p>
          <h1>IMB</h1>
          <p className="brand-summary">Movies, series, and audio with a calmer unlock flow.</p>
        </div>

        <nav className="main-nav" aria-label="Primary">
          {[
            ["discover", "Discover"],
            ["unlock", "Unlock"],
            ["wallet", "Wallet"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={`nav-chip ${state.activeView === value ? "is-active" : ""}`}
              onClick={() => setState((current) => ({ ...current, activeView: value }))}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="wallet-card">
          <span className="wallet-label">Points</span>
          <strong>{state.pointsBalance}</strong>
        </div>
      </header>

      <section className="control-bar">
        <label className="field compact-field">
          <span>API</span>
          <input
            onChange={(event) => setState((current) => ({ ...current, apiBaseUrl: event.target.value }))}
            value={state.apiBaseUrl}
          />
        </label>
        <label className="field compact-field">
          <span>User UUID</span>
          <input
            onChange={(event) => setState((current) => ({ ...current, userId: event.target.value }))}
            value={state.userId}
          />
        </label>
        <label className="field search-field">
          <span>Search</span>
          <input
            onChange={(event) => setState((current) => ({ ...current, searchQuery: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === "Enter") performSearch();
            }}
            placeholder="Search movies, series, and audio"
            value={state.searchQuery}
          />
        </label>
        <button className="secondary-button" onClick={performSearch} type="button">
          Search
        </button>
        <button className="secondary-button" onClick={loadCollections} type="button">
          Refresh
        </button>
      </section>

      <main className="page-grid">
        <section className="content-column">
          {state.activeView === "discover" && (
            <section className="page-view is-active">
              <section className="hero-band">
                <div className="hero-copy">
                  <p className="eyebrow">Featured tonight</p>
                  <h2>{hero?.title || "Loading tonight's drop"}</h2>
                  <p>
                    {hero
                      ? state.activeItem?.slug === hero.slug && state.activeItem?.synopsis
                        ? state.activeItem.synopsis
                        : "Browse first, unlock second. The catalog stays clean while Telegram handles delivery."
                      : "Pulling featured content and keeping the download flow clear."}
                  </p>
                  <div className="hero-actions">
                    <button
                      className="primary-button"
                      onClick={() => hero && selectItem(hero)}
                      type="button"
                    >
                      Open title
                    </button>
                  </div>
                </div>
                <div className="hero-poster" style={backgroundImage(hero?.poster_url)} />
              </section>

              <section className="metric-row">
                <article className="stat-card">
                  <span>Mode</span>
                  <strong>{modeLabel}</strong>
                </article>
                <article className="stat-card">
                  <span>Catalog lane</span>
                  <strong>{laneLabel}</strong>
                </article>
                <article className="stat-card">
                  <span>Selected type</span>
                  <strong>{typeLabel}</strong>
                </article>
              </section>

              <section className="library-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Browse</p>
                    <h3>Catalog lanes</h3>
                  </div>
                  <div className="filters-inline">
                    <label className="field compact-field">
                      <span>Type</span>
                      <select
                        onChange={(event) =>
                          setState((current) => ({ ...current, typeFilter: event.target.value }))
                        }
                        value={state.typeFilter}
                      >
                        <option value="all">All</option>
                        <option value="movie">Movies</option>
                        <option value="series">Series</option>
                        <option value="audio">Audio</option>
                      </select>
                    </label>
                    <label className="field compact-field">
                      <span>Sort</span>
                      <select
                        onChange={(event) =>
                          setState((current) => ({ ...current, sortFilter: event.target.value }))
                        }
                        value={state.sortFilter}
                      >
                        <option value="featured">Featured</option>
                        <option value="latest">Latest</option>
                        <option value="popular">Popular</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="segment-control" role="tablist">
                  {[
                    ["featured", "Featured"],
                    ["movies", "Movies"],
                    ["audio", "Audio"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      className={`segment ${state.activeSection === value ? "is-active" : ""}`}
                      onClick={() => setState((current) => ({ ...current, activeSection: value }))}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="catalog-grid">
                  {!activeCollections.length && <p className="empty-state">No items matched this filter.</p>}
                  {activeCollections.map((item) => (
                    <button
                      key={`${item.content_type}-${item.slug}`}
                      className="media-card"
                      onClick={() => selectItem(item)}
                      style={backgroundImage(item.poster_url)}
                      type="button"
                    >
                      <div className="media-card-copy">
                        <p className="eyebrow">{item.content_type}</p>
                        <h4>{item.title}</h4>
                        <p>{item.release_year || "Audio release"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </section>
          )}

          {state.activeView === "unlock" && (
            <section className="page-view is-active">
              <section className="stack-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Unlock flow</p>
                    <h3>How download handoff works</h3>
                  </div>
                </div>
                <div className="flow-grid">
                  <article className="flow-card">
                    <span>1</span>
                    <h4>Pick a file</h4>
                    <p>Choose quality or format from the selected movie or audio item.</p>
                  </article>
                  <article className="flow-card">
                    <span>2</span>
                    <h4>Unlock by ad or points</h4>
                    <p>Watch the short rewarded step or spend saved points to skip it.</p>
                  </article>
                  <article className="flow-card">
                    <span>3</span>
                    <h4>Continue in Telegram</h4>
                    <p>Your session deep link opens the delivery flow without cluttering the site.</p>
                  </article>
                </div>
              </section>
            </section>
          )}

          {state.activeView === "wallet" && (
            <section className="page-view is-active">
              <section className="stack-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Wallet</p>
                    <h3>Points and account context</h3>
                  </div>
                </div>
                <div className="wallet-layout">
                  <article className="wallet-large">
                    <span>Current points</span>
                    <strong>{state.pointsBalance}</strong>
                    <p>Points let repeat users bypass ads when they have earned enough.</p>
                  </article>
                  <article className="wallet-note">
                    <h4>Why this matters</h4>
                    <p>
                      The goal is to keep ads present but intentional, so regular users feel rewarded
                      instead of punished.
                    </p>
                  </article>
                </div>
              </section>
            </section>
          )}
        </section>

        <aside className="detail-rail">
          <section className="detail-shell">
            <div className="detail-backdrop" style={backgroundImage(state.activeItem?.backdrop_url || state.activeItem?.poster_url)} />
            <div className="detail-body">
              <div className="detail-header">
                <p className="eyebrow">{state.activeItem?.content_type || "Movie"}</p>
                <h2>{state.activeItem?.title || "Select a title"}</h2>
                <p className="detail-meta">
                  {state.activeItem
                    ? [state.activeItem.release_year, state.activeItem.language?.toUpperCase()]
                        .filter(Boolean)
                        .join(" | ") || "Telegram unlock flow"
                    : "Details, files, and unlock controls appear here."}
                </p>
              </div>

              <div className="detail-nav" role="tablist">
                {[
                  ["overview", "Overview"],
                  ["files", "Files"],
                  ["unlock", "Unlock"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={`detail-tab ${state.activeDetailPanel === value ? "is-active" : ""}`}
                    onClick={() => setState((current) => ({ ...current, activeDetailPanel: value }))}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {state.activeDetailPanel === "overview" && (
                <section className="detail-panel-view is-active">
                  <p className="detail-synopsis">
                    {state.activeItem?.synopsis ||
                      "Pick something from the catalog to preview files and open a download session."}
                  </p>
                  <div className="notice-band">
                    <p className="eyebrow">Experience rule</p>
                    <p>Ads stay near intent, not scattered all over browsing, so discovery stays clean.</p>
                  </div>
                </section>
              )}

              {state.activeDetailPanel === "files" && (
                <section className="detail-panel-view is-active">
                  <div className="section-heading inline-heading">
                    <h3>Available files</h3>
                    <span className="source-pill">{state.usingFallback ? "Fallback demo" : "Live API"}</span>
                  </div>
                  <div className="quality-list">
                    {!selectedFiles.length && <p className="empty-state">No files published yet.</p>}
                    {selectedFiles.map((file) => (
                      <button
                        key={file.id}
                        className={`quality-button ${state.activeFileId === file.id ? "is-active" : ""}`}
                        onClick={() =>
                          setState((current) => ({
                            ...current,
                            activeFileId: file.id,
                            activeSession: null,
                            activeDetailPanel: "unlock",
                          }))
                        }
                        type="button"
                      >
                        <div className="quality-main">
                          <strong>{file.label || `${file.quality || "File"} ${file.format || ""}`.trim()}</strong>
                          <span>{file.requires_ad ? "Rewarded unlock required" : "Direct unlock available"}</span>
                        </div>
                        <div className="quality-meta">
                          <span>{file.quality || "Standard"}</span>
                          <span>{formatBytes(file.file_size_bytes)} | {file.points_cost} pts</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {state.activeDetailPanel === "unlock" && (
                <section className="detail-panel-view is-active">
                  <div className="section-heading inline-heading">
                    <h3>Download session</h3>
                    <span className="status-pill">{state.activeSession?.status || "Idle"}</span>
                  </div>
                  <div className="session-card">
                    <p>
                      {!selectedFile
                        ? "Choose a title with a published file to continue."
                        : !state.activeSession
                          ? `${selectedFile.label || selectedFile.quality || "Selected file"} costs ${selectedFile.points_cost} points to bypass ads.`
                          : state.activeSession.ad_required
                            ? "Session created. Complete the rewarded step, then continue in Telegram."
                            : "Session unlocked. Telegram can open the file immediately."}
                    </p>
                    <div className="session-actions">
                      <button
                        className="primary-button"
                        disabled={!selectedFile || Boolean(state.activeSession)}
                        onClick={() => createSession(false)}
                        type="button"
                      >
                        {state.activeSession ? "Session active" : "Start unlock"}
                      </button>
                      <button
                        className="secondary-button"
                        disabled={!selectedFile || (!state.activeSession && false)}
                        onClick={() => (state.activeSession ? usePointsForSession() : createSession(true))}
                        type="button"
                      >
                        {state.activeSession
                          ? state.activeSession.ad_required
                            ? "Bypass with points"
                            : "Points used"
                          : "Skip with points"}
                      </button>
                      <a
                        className={`primary-button ${state.activeSession?.telegram_deep_link ? "" : "disabled-link"}`}
                        href={state.activeSession?.telegram_deep_link || "#"}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open Telegram
                      </a>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
