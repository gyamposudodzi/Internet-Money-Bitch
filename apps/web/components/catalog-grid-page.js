"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchCatalogJson } from "../lib/catalog-data";
import { MediaCardLink } from "./media-card-link";
import { SiteHeader } from "./site-header";

export function CatalogGridPage({
  activeKey,
  title,
  subtitle,
  endpoint,
  fallbackItems,
  transformItems,
}) {
  const itemsPerPage = 12;
  const [items, setItems] = useState(fallbackItems);
  const [status, setStatus] = useState("Loading titles.");
  const [usingFallback, setUsingFallback] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, items]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetchCatalogJson(endpoint);
        const nextItems = transformItems ? transformItems(response.data || []) : response.data || [];
        if (cancelled) return;
        setItems(nextItems);
        setCurrentPage(1);
        setUsingFallback(false);
        setStatus("Live catalog loaded.");
      } catch {
        if (cancelled) return;
        setItems(fallbackItems);
        setCurrentPage(1);
        setUsingFallback(true);
        setStatus("Fallback catalog loaded.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [endpoint, fallbackItems, transformItems]);

  useEffect(() => {
    if (currentPage <= totalPages) return;
    setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

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

        <section className="page-grid-panel">
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
      </main>
    </div>
  );
}
