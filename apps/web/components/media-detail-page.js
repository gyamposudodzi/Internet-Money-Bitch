"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { fetchCatalogJson, getFallbackDetail } from "../lib/catalog-data";
import { fetchSiteConfig, FALLBACK_SITE_CONFIG } from "../lib/site-config";
import { ingestTelegramFromCurrentUrl } from "../lib/telegram-session";
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

function formatCountdown(isoDate) {
  if (!isoDate) return null;
  const target = new Date(isoDate).getTime();
  if (Number.isNaN(target)) return null;
  const ms = Math.max(0, target - Date.now());
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function UnlockStepper({ selectedFile, activeSession }) {
  const step1Done = Boolean(selectedFile);
  const step2Done = Boolean(activeSession);
  const step3Ready = Boolean(activeSession?.telegram_deep_link);

  return (
    <ol className="unlock-stepper" aria-label="Download progress">
      <li className={`unlock-step ${step1Done ? "is-done" : "is-active"}`}>
        <span className="unlock-step-index">1</span>
        <span className="unlock-step-label">Choose file</span>
      </li>
      <li
        className={`unlock-step ${step2Done ? "is-done" : step1Done ? "is-active" : "is-pending"}`}
      >
        <span className="unlock-step-index">2</span>
        <span className="unlock-step-label">Get link</span>
      </li>
      <li
        className={`unlock-step ${step3Ready ? "is-done" : step2Done ? "is-active" : "is-pending"}`}
      >
        <span className="unlock-step-index">3</span>
        <span className="unlock-step-label">Telegram</span>
      </li>
    </ol>
  );
}

export function MediaDetailPage({ activeKey, contentType, slug }) {
  const [item, setItem] = useState(getFallbackDetail(contentType, slug));
  const [usingFallback, setUsingFallback] = useState(Boolean(getFallbackDetail(contentType, slug)));
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionFeedback, setSessionFeedback] = useState("");
  const [sessionTone, setSessionTone] = useState("neutral");
  const [activeSession, setActiveSession] = useState(null);
  const [telegramContext, setTelegramContext] = useState({
    userId: "",
    telegramUserId: "",
    telegramUsername: "",
    telegramLinked: false,
  });
  const [miniBarVisible, setMiniBarVisible] = useState(false);
  const [tick, setTick] = useState(0);
  const [siteConfig, setSiteConfig] = useState(FALLBACK_SITE_CONFIG);

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
        setSelectedFileId(response.data?.files?.[0]?.id || null);
        setUsingFallback(false);
      } catch {
        if (cancelled) return;
        const fallbackItem = getFallbackDetail(contentType, slug);
        setItem(fallbackItem);
        setSelectedFileId(fallbackItem?.files?.[0]?.id || null);
        setUsingFallback(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [contentType, slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = await fetchSiteConfig();
      if (!cancelled) setSiteConfig(cfg);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setTelegramContext(ingestTelegramFromCurrentUrl());
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setMiniBarVisible(window.scrollY > 320);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!activeSession?.expires_at) return undefined;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [activeSession?.expires_at]);

  const selectedFile = item?.files?.find((file) => file.id === selectedFileId) || item?.files?.[0] || null;

  const adSeconds = useMemo(() => {
    const n = Number(siteConfig.rewarded_ad_duration_seconds);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 5;
  }, [siteConfig.rewarded_ad_duration_seconds]);

  const countdownLabel = useMemo(
    () => formatCountdown(activeSession?.expires_at),
    [activeSession?.expires_at, tick]
  );

  const apiUserId = telegramContext.userId || telegramContext.telegramUserId;

  async function createDownloadSession() {
    if (!selectedFile) return;

    if (!telegramContext.telegramLinked || !apiUserId) {
      setSessionTone("warning");
      setSessionFeedback(
        "Open this page from your Telegram bot or channel link so we can attach your account, then try again."
      );
      return;
    }

    setSessionBusy(true);
    setSessionTone("neutral");
    setSessionFeedback("Creating your Telegram download link…");

    try {
      if (usingFallback) {
        const nextSession = {
          download_session_id: "demo-session",
          session_token: "demo-token",
          ad_required: true,
          telegram_deep_link: siteConfig.telegram_demo_deep_link || FALLBACK_SITE_CONFIG.telegram_demo_deep_link,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          status: "ad_pending",
          content_file_id: selectedFile.id,
        };
        setActiveSession(nextSession);
        setSessionTone("success");
        setSessionFeedback(siteConfig.download_help_text || FALLBACK_SITE_CONFIG.download_help_text);
        setSessionBusy(false);
        return;
      }

      const response = await fetchCatalogJson("/download-sessions", {
        method: "POST",
        body: JSON.stringify({
          content_file_id: selectedFile.id,
          consume_points: false,
          user_id: apiUserId,
        }),
      });

      setActiveSession(response.data);
      setSessionTone("success");
      setSessionFeedback(siteConfig.download_help_text || FALLBACK_SITE_CONFIG.download_help_text);
    } catch (error) {
      setSessionTone("danger");
      setSessionFeedback(`Could not create a download session. ${error.message}`);
    } finally {
      setSessionBusy(false);
    }
  }

  function copyTelegramLink() {
    const url = activeSession?.telegram_deep_link;
    if (!url || typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(url).catch(() => {});
  }

  if (!item) {
    return (
      <div className="page-shell">
        <SiteHeader activeKey={activeKey} />
        <main className="inner-page-shell">
          <section className="page-intro">
            <p className="eyebrow">{contentType}</p>
            <h1>Title not found</h1>
            <p>We could not find this title yet.</p>
            <Link className="primary-button" href="/movies">
              Browse movies
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const telegramLinkReady = Boolean(activeSession?.telegram_deep_link);

  return (
    <div className="page-shell page-shell-detail">
      <SiteHeader activeKey={activeKey} />

      <div
        aria-hidden={!miniBarVisible}
        className={`detail-sticky-mini ${miniBarVisible ? "is-visible" : ""}`}
      >
        <div className="detail-sticky-mini-inner">
          <p className="detail-sticky-mini-title">{item.title}</p>
          <a
            className={`primary-button detail-sticky-mini-cta ${telegramLinkReady ? "" : "disabled-link"}`}
            href={activeSession?.telegram_deep_link || "#"}
            rel="noreferrer"
            target="_blank"
          >
            Open Telegram
          </a>
        </div>
      </div>

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
              <p className="detail-hero-synopsis clamp-lines-4">{item.synopsis || "Details for this title will appear here."}</p>
              <div className="detail-hero-actions">
                <Link className="secondary-button" href="/">
                  Home
                </Link>
                <span
                  className={`data-source-pill ${usingFallback ? "is-demo" : "is-live"}`}
                  title={usingFallback ? "Demo payload while the API is unavailable." : undefined}
                >
                  {usingFallback ? "Demo title" : "Live title"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="detail-page-grid">
          <div className="detail-main-column">
            <section className="page-grid-panel detail-about-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">About</p>
                  <h3>Synopsis</h3>
                </div>
              </div>
              <p className="detail-synopsis-body">{item.synopsis || "Synopsis will appear when the editorial team publishes it."}</p>
              <p className="detail-flow-note">
                Downloads run in Telegram: you request a link here, open the bot, watch a brief sponsored clip (~
                {adSeconds} seconds), then the bot sends the file in chat.
              </p>
            </section>
          </div>

          <aside className="detail-rail-column">
            <section className="page-grid-panel detail-rail-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Quality</p>
                  <h3>Pick a file</h3>
                </div>
              </div>
              <div className="quality-list">
                {item.files?.length ? (
                  item.files.map((file) => (
                    <button
                      className={`quality-button ${selectedFileId === file.id ? "is-active" : ""}`}
                      key={file.id}
                      onClick={() => {
                        setSelectedFileId(file.id);
                        setActiveSession(null);
                        setSessionFeedback("");
                        setSessionTone("neutral");
                      }}
                      type="button"
                    >
                      <div className="quality-main">
                        <strong>{file.label || `${file.quality || "File"} ${file.format || ""}`.trim()}</strong>
                        <span>Delivered in Telegram after a short ad (~{adSeconds}s)</span>
                      </div>
                      <div className="quality-meta">
                        <span>{file.quality || "Standard"}</span>
                        <span>{formatBytes(file.file_size_bytes)}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="empty-state">No downloadable files have been published for this title yet.</p>
                )}
              </div>
            </section>

            <section className="page-grid-panel detail-rail-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Download</p>
                  <h3>Telegram</h3>
                </div>
                <span className="data-source-pill is-muted">
                  {telegramContext.telegramLinked
                    ? telegramContext.telegramUsername
                      ? `@${telegramContext.telegramUsername}`
                      : apiUserId
                        ? `Visitor ${apiUserId}`
                        : "Linked"
                    : "Not linked"}
                </span>
              </div>

              <UnlockStepper activeSession={activeSession} selectedFile={selectedFile} />

              <div className="session-card detail-session-card">
                <p className="detail-session-lede">
                  {!selectedFile
                    ? "No downloadable file is available for this title yet."
                    : !activeSession
                      ? `Choose a version, then create your personal Telegram link. The ad plays inside Telegram before delivery (about ${adSeconds}s).`
                      : "Use Open Telegram below. Complete the short ad in Telegram, then the bot sends the file."}
                </p>

                {activeSession?.expires_at && countdownLabel ? (
                  <p className="session-countdown" role="status">
                    Link expires in <strong>{countdownLabel}</strong>
                  </p>
                ) : null}

                {sessionFeedback ? (
                  <div className={`feedback-card is-${sessionTone}`}>
                    <h4>Status</h4>
                    <p>{sessionFeedback}</p>
                  </div>
                ) : null}

                <div className="detail-unlock-meta">
                  {activeSession?.status ? (
                    <span className="data-source-pill is-muted">State: {activeSession.status}</span>
                  ) : null}
                </div>

                <div className="detail-hero-actions detail-unlock-actions">
                  <button
                    className="primary-button"
                    disabled={!selectedFile || sessionBusy || Boolean(activeSession)}
                    onClick={() => createDownloadSession()}
                    type="button"
                  >
                    {sessionBusy && !activeSession ? "Creating link…" : "Get Telegram link"}
                  </button>

                  <a
                    className={`primary-button ${telegramLinkReady ? "" : "disabled-link"}`}
                    href={activeSession?.telegram_deep_link || "#"}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open Telegram
                  </a>

                  {activeSession?.telegram_deep_link ? (
                    <button className="secondary-button" onClick={copyTelegramLink} type="button">
                      Copy link
                    </button>
                  ) : null}
                </div>

                {!telegramContext.telegramLinked || !apiUserId ? (
                  <p className="detail-telegram-hint">{siteConfig.visitor_param_hint || FALLBACK_SITE_CONFIG.visitor_param_hint}</p>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
