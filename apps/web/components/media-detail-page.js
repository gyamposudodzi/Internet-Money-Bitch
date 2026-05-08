"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchCatalogJson, getFallbackDetail, WEB_STORAGE_KEY } from "../lib/catalog-data";
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

function extractTelegramContext() {
  if (typeof window === "undefined") {
    return {
      userId: "",
      telegramUsername: "",
      telegramLinked: false,
      pointsBalance: 0,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const queryUserId = params.get("user_id")?.trim() || "";
  const queryTelegramUsername = params.get("telegram_username")?.trim() || "";
  const queryPoints = Number(params.get("points"));

  try {
    const raw = window.localStorage.getItem(WEB_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      userId: queryUserId || parsed.userId || "",
      telegramUsername: queryTelegramUsername || parsed.telegramUsername || "",
      telegramLinked: Boolean(queryUserId || queryTelegramUsername || parsed.telegramLinked),
      pointsBalance: Number.isFinite(queryPoints)
        ? Math.max(0, queryPoints)
        : Math.max(0, parsed.pointsBalance || 0),
    };
  } catch {
    return {
      userId: queryUserId,
      telegramUsername: queryTelegramUsername,
      telegramLinked: Boolean(queryUserId || queryTelegramUsername),
      pointsBalance: Number.isFinite(queryPoints) ? Math.max(0, queryPoints) : 0,
    };
  }
}

export function MediaDetailPage({ activeKey, contentType, slug }) {
  const [item, setItem] = useState(getFallbackDetail(contentType, slug));
  const [status, setStatus] = useState("Loading title details.");
  const [usingFallback, setUsingFallback] = useState(Boolean(getFallbackDetail(contentType, slug)));
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionFeedback, setSessionFeedback] = useState("");
  const [sessionTone, setSessionTone] = useState("neutral");
  const [activeSession, setActiveSession] = useState(null);
  const [telegramContext, setTelegramContext] = useState({
    userId: "",
    telegramUsername: "",
    telegramLinked: false,
    pointsBalance: 0,
  });

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
        setStatus("Live title loaded.");
      } catch {
        if (cancelled) return;
        const fallbackItem = getFallbackDetail(contentType, slug);
        setItem(fallbackItem);
        setSelectedFileId(fallbackItem?.files?.[0]?.id || null);
        setUsingFallback(true);
        setStatus("Fallback title loaded.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [contentType, slug]);

  useEffect(() => {
    setTelegramContext(extractTelegramContext());
  }, []);

  const selectedFile = item?.files?.find((file) => file.id === selectedFileId) || item?.files?.[0] || null;

  async function createSession(consumePoints) {
    if (!selectedFile) return;

    if (!telegramContext.telegramLinked || !telegramContext.userId) {
      setSessionTone("warning");
      setSessionFeedback("Telegram details are needed before this file can be unlocked.");
      return;
    }

    setSessionBusy(true);
    setSessionTone("neutral");
    setSessionFeedback(consumePoints ? "Using points to unlock this file..." : "Starting unlock session...");

    try {
      if (usingFallback) {
        const nextSession = {
          download_session_id: "demo-session",
          session_token: "demo-token",
          ad_required: !consumePoints,
          points_cost: selectedFile.points_cost,
          points_spent: consumePoints ? selectedFile.points_cost : 0,
          telegram_deep_link: "https://t.me/demo_bot?start=demo-token",
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          status: consumePoints ? "created" : "ad_pending",
          content_file_id: selectedFile.id,
        };
        setActiveSession(nextSession);
        setTelegramContext((current) => ({
          ...current,
          pointsBalance: consumePoints
            ? Math.max(0, current.pointsBalance - selectedFile.points_cost)
            : current.pointsBalance,
        }));
        setSessionTone("success");
        setSessionFeedback(
          consumePoints
            ? "Points spent. Telegram can open the file immediately."
            : "Session created. Continue the unlock flow in Telegram."
        );
        setSessionBusy(false);
        return;
      }

      const response = await fetchCatalogJson("/download-sessions", {
        method: "POST",
        body: JSON.stringify({
          content_file_id: selectedFile.id,
          consume_points: consumePoints,
          user_id: telegramContext.userId,
        }),
      });

      setActiveSession(response.data);
      if (consumePoints && response.data.points_spent) {
        setTelegramContext((current) => ({
          ...current,
          pointsBalance: Math.max(0, current.pointsBalance - response.data.points_spent),
        }));
      }
      setSessionTone("success");
      setSessionFeedback(
        response.data.ad_required
          ? "Session created. Complete the rewarded step, then continue in Telegram."
          : "Session unlocked. Telegram can open the file immediately."
      );
    } catch (error) {
      setSessionTone("danger");
      setSessionFeedback(`Could not create a session. ${error.message}`);
    } finally {
      setSessionBusy(false);
    }
  }

  async function usePointsForSession() {
    if (!activeSession) return;

    setSessionBusy(true);
    setSessionTone("neutral");
    setSessionFeedback("Spending points to bypass the ad step...");

    try {
      if (usingFallback) {
        setActiveSession((current) => ({
          ...current,
          ad_required: false,
          status: "created",
          points_spent: current.points_cost,
        }));
        setTelegramContext((current) => ({
          ...current,
          pointsBalance: Math.max(0, current.pointsBalance - activeSession.points_cost),
        }));
        setSessionTone("success");
        setSessionFeedback("Points applied. Telegram can now open the file immediately.");
        setSessionBusy(false);
        return;
      }

      const response = await fetchCatalogJson(
        `/download-sessions/${activeSession.download_session_id}/use-points?user_id=${encodeURIComponent(telegramContext.userId)}`,
        { method: "POST" }
      );
      setActiveSession(response.data);
      setTelegramContext((current) => ({
        ...current,
        pointsBalance: Math.max(0, current.pointsBalance - response.data.points_spent),
      }));
      setSessionTone("success");
      setSessionFeedback("Points applied. The unlock step is complete.");
    } catch (error) {
      setSessionTone("danger");
      setSessionFeedback(`Could not spend points for this session. ${error.message}`);
    } finally {
      setSessionBusy(false);
    }
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
                    <span>{file.requires_ad ? "Rewarded unlock required" : "Direct unlock available"}</span>
                  </div>
                  <div className="quality-meta">
                    <span>{file.quality || "Standard"}</span>
                    <span>
                      {formatBytes(file.file_size_bytes)} | {file.points_cost} pts
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <p className="empty-state">No downloadable files have been published for this title yet.</p>
            )}
          </div>
        </section>

        <section className="page-grid-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Unlock</p>
              <h3>Telegram handoff</h3>
            </div>
            <span className="page-status-pill">
              {telegramContext.telegramLinked
                ? telegramContext.telegramUsername
                  ? `@${telegramContext.telegramUsername}`
                  : "Telegram linked"
                : "Guest visitor"}
            </span>
          </div>

          <div className="session-card">
            <p>
              {!selectedFile
                ? "No downloadable file is available for this title yet."
                : !activeSession
                  ? `${selectedFile.label || selectedFile.quality || "Selected file"} costs ${selectedFile.points_cost} points to bypass ads.`
                  : activeSession.ad_required
                    ? "Session created. Complete the rewarded step, then continue in Telegram."
                    : "Session unlocked. Telegram can open the file immediately."}
            </p>

            {sessionFeedback ? (
              <div className={`feedback-card is-${sessionTone}`}>
                <h4>Unlock feedback</h4>
                <p>{sessionFeedback}</p>
              </div>
            ) : null}

            <div className="detail-unlock-meta">
              <span className="page-status-pill">
                {telegramContext.telegramLinked ? `${telegramContext.pointsBalance} pts` : "No points yet"}
              </span>
              {activeSession?.status ? (
                <span className="page-status-pill">Session: {activeSession.status}</span>
              ) : null}
            </div>

            <div className="detail-hero-actions">
              <button
                className="primary-button"
                disabled={!selectedFile || sessionBusy || Boolean(activeSession)}
                onClick={() => createSession(false)}
                type="button"
              >
                {sessionBusy && !activeSession ? "Starting..." : "Start unlock"}
              </button>

              <button
                className="secondary-button"
                disabled={!selectedFile || sessionBusy || !telegramContext.telegramLinked}
                onClick={() => (activeSession ? usePointsForSession() : createSession(true))}
                type="button"
              >
                {sessionBusy
                  ? "Working..."
                  : activeSession
                    ? activeSession.ad_required
                      ? "Bypass with points"
                      : "Points used"
                    : "Skip with points"}
              </button>

              <a
                className={`primary-button ${activeSession?.telegram_deep_link ? "" : "disabled-link"}`}
                href={activeSession?.telegram_deep_link || "#"}
                rel="noreferrer"
                target="_blank"
              >
                Open Telegram
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
