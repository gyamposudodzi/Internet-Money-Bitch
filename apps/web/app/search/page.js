"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { CatalogGridPage } from "../../components/catalog-grid-page";
import { fetchCatalogJson, hrefForItem, searchFallbackItems } from "../../lib/catalog-data";

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") || "").trim();
  const [draftQuery, setDraftQuery] = useState(query);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [typeFilter, setTypeFilter] = useState("all");
  const [orderFilter, setOrderFilter] = useState("newest");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  useEffect(() => {
    setDraftQuery(query);
    setDebouncedQuery(query);
  }, [query]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(draftQuery);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [draftQuery]);

  useEffect(() => {
    let cancelled = false;
    const normalized = debouncedQuery.trim();

    async function loadSuggestions() {
      if (normalized.length < 2) {
        if (!cancelled) {
          setSuggestions([]);
          setActiveSuggestionIndex(-1);
        }
        return;
      }

      try {
        const response = await fetchCatalogJson(`/search?q=${encodeURIComponent(normalized)}&limit=6`);
        if (cancelled) return;
        setSuggestions(response.data || []);
        setActiveSuggestionIndex(-1);
      } catch {
        if (cancelled) return;
        setSuggestions(searchFallbackItems(normalized).slice(0, 6));
        setActiveSuggestionIndex(-1);
      }
    }

    loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  function performSearch(nextQuery = draftQuery) {
    const normalized = nextQuery.trim();
    if (!normalized) return;
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    router.push(`/search?q=${encodeURIComponent(normalized)}`);
  }

  function handleSuggestionSelect(item) {
    setDraftQuery(item.title || draftQuery);
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    router.push(hrefForItem(item));
  }

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (typeFilter !== "all") params.set("type", typeFilter);
    return `/search?${params.toString()}`;
  }, [query, typeFilter]);

  const fallbackItems = useMemo(() => {
    const items = searchFallbackItems(query);
    if (typeFilter === "all") return items;
    return items.filter((item) => item.content_type === typeFilter);
  }, [query, typeFilter]);

  const transformItems = useMemo(
    () => (items) => {
      const nextItems = [...items];
      if (orderFilter === "title") {
        return nextItems.sort((a, b) => a.title.localeCompare(b.title));
      }
      return nextItems.sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
    },
    [orderFilter]
  );

  const toolbar = (
    <div className="search-results-toolbar">
      <form
        className="page-query-form"
        onSubmit={(event) => {
          event.preventDefault();
          performSearch();
        }}
      >
        <label className="field search-suggest-shell">
          <span>Search again</span>
          <input
            className="page-query-input"
            onBlur={() => {
              window.setTimeout(() => {
                setSuggestionsOpen(false);
                setActiveSuggestionIndex(-1);
              }, 120);
            }}
            onChange={(event) => {
              setDraftQuery(event.target.value);
              setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                if (!suggestions.length) return;
                setSuggestionsOpen(true);
                setActiveSuggestionIndex((current) => (current >= suggestions.length - 1 ? 0 : current + 1));
                return;
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                if (!suggestions.length) return;
                setSuggestionsOpen(true);
                setActiveSuggestionIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
                return;
              }

              if (event.key === "Escape") {
                setSuggestionsOpen(false);
                setActiveSuggestionIndex(-1);
                return;
              }

              if (
                event.key === "Enter" &&
                suggestionsOpen &&
                activeSuggestionIndex >= 0 &&
                suggestions[activeSuggestionIndex]
              ) {
                event.preventDefault();
                handleSuggestionSelect(suggestions[activeSuggestionIndex]);
              }
            }}
            placeholder="Search for movies, series, or audio"
            value={draftQuery}
          />
          {suggestionsOpen && draftQuery.trim().length >= 2 ? (
            <div className="search-suggestions">
              {suggestions.length ? (
                suggestions.map((item, index) => (
                  <button
                    className={`search-suggestion-item ${activeSuggestionIndex === index ? "is-active" : ""}`}
                    key={`${item.content_type}-${item.slug}`}
                    onMouseDown={() => handleSuggestionSelect(item)}
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                    type="button"
                  >
                    <span
                      className="search-suggestion-thumb"
                      style={{ backgroundImage: `url("${item.poster_url || ""}")` }}
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
        <button className="secondary-button" type="submit">
          Search
        </button>
      </form>

      <div className="filter-chip-group">
        {[
          ["all", "All"],
          ["movie", "Movies"],
          ["series", "Series"],
          ["audio", "Audio"],
        ].map(([value, label]) => (
          <button
            className={`filter-chip ${typeFilter === value ? "is-active" : ""}`}
            key={value}
            onClick={() => setTypeFilter(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="filter-chip-group">
        {[
          ["newest", "Newest"],
          ["title", "A-Z"],
        ].map(([value, label]) => (
          <button
            className={`filter-chip ${orderFilter === value ? "is-active" : ""}`}
            key={value}
            onClick={() => setOrderFilter(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <CatalogGridPage
      activeKey=""
      title={query ? `Search results for "${query}"` : "Search"}
      subtitle={
        query
          ? "Browse the titles that matched your search."
          : "Type a movie, series, or audio title from the homepage search bar."
      }
      endpoint={endpoint}
      fallbackItems={fallbackItems}
      transformItems={transformItems}
      toolbar={toolbar}
    />
  );
}
