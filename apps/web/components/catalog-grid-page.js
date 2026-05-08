"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchCatalogJson } from "../lib/catalog-data";
import { CatalogSidebar } from "./catalog-sidebar";
import { MediaCardLink } from "./media-card-link";
import { SiteHeader } from "./site-header";

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
}) {
  const itemsPerPage = 12;
  const [items, setItems] = useState(fallbackItems);
  const [status, setStatus] = useState("Loading titles.");
  const [usingFallback, setUsingFallback] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortValue, setSortValue] = useState(defaultSort);
  const [draftQuery, setDraftQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

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
        setStatus("Fallback catalog loaded.");
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

  const generatedToolbar = sortOptions || supportsQuery ? (
    <div className="search-results-toolbar">
      {sortOptions?.length ? (
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
      ) : (
        <div />
      )}

      {supportsQuery ? (
        <form
          className="page-query-form"
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedQuery(draftQuery.trim());
            setCurrentPage(1);
          }}
        >
          <input
            className="page-query-input"
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder={queryPlaceholder}
            value={draftQuery}
          />
          <button className="secondary-button" type="submit">
            Apply
          </button>
        </form>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="page-shell">
      <SiteHeader activeKey={activeKey} />
      <main className="inner-page-shell">
        <section className="page-intro">
          <p className="eyebrow">{activeKey}</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <span className="page-status-pill">{usingFallback ? "Fallback data" : status}</span>
        </section>

        <section className="page-layout-with-sidebar">
          <section className="page-grid-panel">
            {toolbar ? <div className="results-toolbar">{toolbar}</div> : null}
            {generatedToolbar ? <div className="results-toolbar">{generatedToolbar}</div> : null}

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

            <div className="catalog-grid catalog-grid-page">
              {paginatedItems.length ? (
                paginatedItems.map((item) => (
                  <MediaCardLink item={item} key={`${item.content_type}-${item.slug}`} />
                ))
              ) : (
                <p className="empty-state">No titles are available here yet.</p>
              )}
            </div>

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
