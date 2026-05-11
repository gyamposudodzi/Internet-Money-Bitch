"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { fetchCatalogJson } from "../lib/catalog-data";
import { CatalogSidebar } from "./catalog-sidebar";
import { MediaCardLink } from "./media-card-link";
import { SiteHeader } from "./site-header";

const QUERY_DEBOUNCE_MS = 420;

function CatalogSkeletonGrid() {
  return (
    <div className="catalog-skeleton-grid" aria-hidden>
      {Array.from({ length: 12 }, (_, i) => (
        <div className="catalog-skeleton-card" key={`sk-${i}`} />
      ))}
    </div>
  );
}

export function CatalogGridPage({
  activeKey,
  title,
  subtitle,
  endpoint,
  buildEndpoint,
  fallbackItems,
  transformItems,
  toolbar,
  sortOptions,
  defaultSort = "",
  supportsQuery = false,
  queryPlaceholder = "Filter titles",
  fallbackTransform,
  themeClass = "",
  laneNotice = null,
  stickyToolbar = false,
}) {
  const itemsPerPage = 12;
  const [items, setItems] = useState(fallbackItems);
  const [status, setStatus] = useState("Loading titles.");
  const [usingFallback, setUsingFallback] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortValue, setSortValue] = useState(defaultSort);
  const [draftQuery, setDraftQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const queryDebounceRef = useRef(null);

  useEffect(() => {
    if (!supportsQuery) return undefined;

    if (queryDebounceRef.current) {
      window.clearTimeout(queryDebounceRef.current);
    }

    queryDebounceRef.current = window.setTimeout(() => {
      const next = draftQuery.trim();
      setAppliedQuery((prev) => (prev === next ? prev : next));
    }, QUERY_DEBOUNCE_MS);

    return () => {
      if (queryDebounceRef.current) {
        window.clearTimeout(queryDebounceRef.current);
      }
    };
  }, [draftQuery, supportsQuery]);

  useEffect(() => {
    if (!supportsQuery) return;
    setCurrentPage(1);
  }, [appliedQuery, supportsQuery]);

  const resolvedEndpoint = useMemo(() => {
    if (buildEndpoint) {
      return buildEndpoint({ sort: sortValue, query: appliedQuery });
    }
    return endpoint;
  }, [appliedQuery, buildEndpoint, endpoint, sortValue]);

  const resolvedFallbackItems = useMemo(() => {
    const baseItems = [...fallbackItems];
    if (fallbackTransform) {
      return fallbackTransform(baseItems, { sort: sortValue, query: appliedQuery });
    }

    let nextItems = baseItems;
    if (appliedQuery.trim()) {
      const normalized = appliedQuery.trim().toLowerCase();
      nextItems = nextItems.filter((item) => item.title?.toLowerCase().includes(normalized));
    }

    if (sortValue === "title") {
      return [...nextItems].sort((a, b) => a.title.localeCompare(b.title));
    }
    return [...nextItems].sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
  }, [appliedQuery, fallbackItems, fallbackTransform, sortValue]);

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, items]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsFetching(true);
      try {
        const response = await fetchCatalogJson(resolvedEndpoint);
        const nextItems = transformItems ? transformItems(response.data || []) : response.data || [];
        if (cancelled) return;
        setItems(nextItems);
        setCurrentPage(1);
        setUsingFallback(false);
        setStatus("Live catalog loaded.");
      } catch {
        if (cancelled) return;
        setItems(resolvedFallbackItems);
        setCurrentPage(1);
        setUsingFallback(true);
        setStatus("Demo catalog in use.");
      } finally {
        if (!cancelled) {
          setIsFetching(false);
          setFirstLoadDone(true);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [resolvedEndpoint, resolvedFallbackItems, transformItems]);

  useEffect(() => {
    if (currentPage <= totalPages) return;
    setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function flushQueryNow() {
    if (queryDebounceRef.current) {
      window.clearTimeout(queryDebounceRef.current);
    }
    const next = draftQuery.trim();
    setAppliedQuery((prev) => (prev === next ? prev : next));
  }

  const sortChipRow = sortOptions?.length ? (
    <div className="filter-chip-group">
      {sortOptions.map((option) => (
        <button
          className={`filter-chip ${sortValue === option.value ? "is-active" : ""}`}
          key={option.value}
          onClick={() => setSortValue(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  ) : null;

  const queryRow = supportsQuery ? (
    <div className="catalog-query-row">
      <label className="field catalog-query-field">
        <span>Filter</span>
        <input
          className="page-query-input"
          onChange={(event) => setDraftQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              flushQueryNow();
            }
          }}
          placeholder={queryPlaceholder}
          value={draftQuery}
        />
      </label>
      <p className="catalog-query-hint">Filters apply as you type. Press Enter to search immediately.</p>
    </div>
  ) : null;

  const generatedToolbar =
    sortOptions?.length || supportsQuery ? (
      <div className="search-results-toolbar catalog-toolbar-inner">
        {sortChipRow || <div />}
        {queryRow}
      </div>
    ) : null;

  const combinedToolbar = (
    <>
      {toolbar ? <div className="catalog-toolbar-inner">{toolbar}</div> : null}
      {generatedToolbar}
    </>
  );

  const hasToolbarContent = Boolean(toolbar || generatedToolbar);
  const showStickyToolbar = Boolean(stickyToolbar && hasToolbarContent);

  const shellClass = ["page-shell", themeClass].filter(Boolean).join(" ");

  return (
    <div className={shellClass}>
      <SiteHeader activeKey={activeKey} />

      <main className="inner-page-shell">
        {showStickyToolbar ? (
          <div className="catalog-sticky-toolbar-wrap">{combinedToolbar}</div>
        ) : null}

        <section className="page-intro">
          <p className="eyebrow">{activeKey || "Discover"}</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <span
            className={`data-source-pill ${usingFallback ? "is-demo" : "is-live"}`}
            title={usingFallback ? "The API is offline or unreachable; showing bundled demo titles." : undefined}
          >
            {usingFallback ? "Demo catalog" : "Live catalog"}
          </span>
        </section>

        {laneNotice ? (
          <aside className="lane-notice-band" role="note">
            <p>{laneNotice}</p>
          </aside>
        ) : null}

        <section className="page-layout-with-sidebar">
          <section
            className={`page-grid-panel catalog-main-panel ${isFetching && firstLoadDone ? "is-syncing" : ""}`}
          >
            {!showStickyToolbar && hasToolbarContent ? (
              <div className="catalog-toolbar-frost">{combinedToolbar}</div>
            ) : null}

            <div className="page-grid-head">
              <span className="page-count">
                {items.length} title{items.length === 1 ? "" : "s"}
              </span>
              {totalPages > 1 ? (
                <span className="page-count">
                  Page {currentPage} of {totalPages}
                </span>
              ) : null}
            </div>

            {!firstLoadDone ? (
              <CatalogSkeletonGrid />
            ) : (
              <div className="catalog-grid catalog-grid-page">
                {paginatedItems.length ? (
                  paginatedItems.map((item) => (
                    <MediaCardLink item={item} key={`${item.content_type}-${item.slug}`} />
                  ))
                ) : (
                  <div className="empty-state-block">
                    <p className="empty-state">No titles match this view yet.</p>
                    <Link className="secondary-button" href="/movies">
                      Browse movies
                    </Link>
                  </div>
                )}
              </div>
            )}

            {totalPages > 1 ? (
              <div className="pagination-row">
                <button
                  className="secondary-button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  type="button"
                >
                  Previous
                </button>

                <div className="pagination-pages">
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <button
                      className={`pagination-button ${currentPage === page ? "is-active" : ""}`}
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      type="button"
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  className="secondary-button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  type="button"
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>

          <CatalogSidebar activeKey={activeKey} />
        </section>
      </main>
    </div>
  );
}
