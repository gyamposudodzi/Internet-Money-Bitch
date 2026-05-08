"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchCatalogJson, getFallbackDetail } from "../lib/catalog-data";
import { SiteHeader } from "./site-header";

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

export function MediaDetailPage({ activeKey, contentType, slug }) {
  const [item, setItem] = useState(getFallbackDetail(contentType, slug));
  const [status, setStatus] = useState("Loading title details.");
  const [usingFallback, setUsingFallback] = useState(Boolean(getFallbackDetail(contentType, slug)));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const endpoint =
        contentType === "audio"
          ? `/audio/${slug}`
          : contentType === "series"
            ? `/series/${slug}`
            : `/movies/${slug}`;

      try {
        const response = await fetchCatalogJson(endpoint);
        if (cancelled) return;
        setItem(response.data || null);
        setUsingFallback(false);
        setStatus("Live title loaded.");
      } catch {
        if (cancelled) return;
        const fallbackItem = getFallbackDetail(contentType, slug);
        setItem(fallbackItem);
        setUsingFallback(true);
        setStatus("Fallback title loaded.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [contentType, slug]);

  if (!item) {
    return (
      <div className="page-shell">
        <SiteHeader activeKey={activeKey} />
        <main className="inner-page-shell">
          <section className="page-intro">
            <p className="eyebrow">{contentType}</p>
            <h1>Title not found</h1>
            <p>We could not find this title yet.</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <SiteHeader activeKey={activeKey} />
      <main className="inner-page-shell">
        <section
          className="detail-hero-panel"
          style={item.backdrop_url ? { backgroundImage: `url("${item.backdrop_url}")` } : undefined}
        >
          <div className="detail-hero-overlay" />
          <div className="detail-hero-content">
            <div
              className="detail-hero-poster"
              style={item.poster_url ? { backgroundImage: `url("${item.poster_url}")` } : undefined}
            />
            <div className="detail-hero-copy">
              <p className="eyebrow">{item.content_type}</p>
              <h1>{item.title}</h1>
              <p className="detail-hero-meta">
                {[item.release_year, item.language?.toUpperCase()].filter(Boolean).join(" | ") || "Published title"}
              </p>
              <p>{item.synopsis || "Details for this title will appear here."}</p>
              <div className="detail-hero-actions">
                <Link className="primary-button" href="/">
                  Back home
                </Link>
                <span className="page-status-pill">{usingFallback ? "Fallback data" : status}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="page-grid-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Files</p>
              <h3>Available versions</h3>
            </div>
          </div>
          <div className="quality-list">
            {item.files?.length ? (
              item.files.map((file) => (
                <div className="quality-button" key={file.id}>
                  <div className="quality-main">
                    <strong>{file.label || `${file.quality || "File"} ${file.format || ""}`.trim()}</strong>
                    <span>{file.requires_ad ? "Rewarded unlock required" : "Direct unlock available"}</span>
                  </div>
                  <div className="quality-meta">
                    <span>{file.quality || "Standard"}</span>
                    <span>
                      {formatBytes(file.file_size_bytes)} | {file.points_cost} pts
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">No downloadable files have been published for this title yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
