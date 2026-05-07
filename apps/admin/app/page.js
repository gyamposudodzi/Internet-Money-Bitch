"use client";

import { useEffect, useMemo, useState } from "react";

import { fallbackAdmin } from "../lib/fallback-admin";

const initialState = {
  apiBaseUrl: "http://localhost:8000/api/v1",
  adminToken: "",
  adminUserId: "11111111-1111-1111-1111-111111111111",
  mode: "booting",
  fallback: false,
  activeScreen: "overview",
  activeForm: "movie",
  identity: null,
  overview: null,
  adminUsers: [],
  platformUsers: [],
  inventory: [],
  contentFiles: [],
  auditLogs: [],
  inventoryQuery: "",
  inventoryType: "all",
  movieFileSearch: "",
  movieFilePickerOpen: false,
  audioFileSearch: "",
  audioFilePickerOpen: false,
  movieForm: {
    title: "",
    slug: "",
    release_year: "",
    language: "",
    publication_status: "draft",
    duration_minutes: "",
    synopsis: "",
  },
  selectedMovieFileIds: [],
  audioForm: {
    title: "",
    slug: "",
    artist: "",
    album: "",
    language: "",
    publication_status: "draft",
    synopsis: "",
  },
  selectedAudioFileIds: [],
  fileForm: {
    content_kind: "movie",
    content_id: "",
    label: "",
    quality: "",
    format: "",
    storage_provider: "r2",
    storage_key: "",
    points_cost: 0,
    delivery_mode: "telegram_bot",
    requires_ad: true,
  },
  pointsForm: {
    user_id: "",
    amount: "",
    reason: "",
  },
  movieEditId: null,
  audioEditId: null,
  fileEditId: null,
};

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchJson(baseUrl, path, options = {}, admin = false, auth = {}) {
  const headers = {
    "Content-Type": "application/json",
    "X-Client-Platform": "web",
    "X-App-Version": "0.1.0",
    ...(options.headers || {}),
  };

  if (admin) {
    headers.Authorization = `Bearer ${auth.adminToken}`;
    headers["X-Admin-User-Id"] = auth.adminUserId;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

export default function Page() {
  const [state, setState] = useState(initialState);

  const auth = {
    adminToken: state.adminToken,
    adminUserId: state.adminUserId,
  };

  const normalizedInventory = useMemo(() => {
    const source = state.inventory.length ? state.inventory : fallbackAdmin.inventory;
    const query = state.inventoryQuery.trim().toLowerCase();
    return source.filter((item) => {
      const matchesQuery =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.slug.toLowerCase().includes(query);
      const matchesType = state.inventoryType === "all" || item.content_type === state.inventoryType;
      return matchesQuery && matchesType;
    });
  }, [state.inventory, state.inventoryQuery, state.inventoryType]);

  const metrics = state.overview || fallbackAdmin.overview;
  const identity = state.identity || fallbackAdmin.identity;
  const adminUsers = state.adminUsers.length ? state.adminUsers : fallbackAdmin.adminUsers;
  const platformUsers = state.platformUsers.length ? state.platformUsers : fallbackAdmin.platformUsers;
  const contentFiles = state.contentFiles.length ? state.contentFiles : fallbackAdmin.contentFiles;
  const auditLogs = state.auditLogs.length ? state.auditLogs : fallbackAdmin.auditLogs;
  const filteredMovieAttachableFiles = useMemo(() => {
    const query = state.movieFileSearch.trim().toLowerCase();
    if (!query) return contentFiles;
    return contentFiles.filter((file) => {
      const haystack = [
        file.label,
        file.quality,
        file.format,
        file.storage_key,
        file.content_kind,
        file.assignment_label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [contentFiles, state.movieFileSearch]);
  const filteredAudioAttachableFiles = useMemo(() => {
    const query = state.audioFileSearch.trim().toLowerCase();
    if (!query) return contentFiles;
    return contentFiles.filter((file) => {
      const haystack = [
        file.label,
        file.quality,
        file.format,
        file.storage_key,
        file.content_kind,
        file.assignment_label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [contentFiles, state.audioFileSearch]);

  function setMode(mode, message) {
    setState((current) => ({ ...current, mode, statusMessage: message }));
  }

  async function loadInventory(baseUrl = state.apiBaseUrl, authData = auth) {
    try {
      const [moviesResponse, audioResponse, filesResponse] = await Promise.all([
        fetchJson(baseUrl, "/admin/movies", {}, true, authData),
        fetchJson(baseUrl, "/admin/audio", {}, true, authData),
        fetchJson(baseUrl, "/admin/content-files", {}, true, authData),
      ]);

      const movies = (moviesResponse.data || []).map((item) => ({
        id: item.id,
        title: item.title,
        content_type: "movie",
        release_year: item.release_year,
        slug: item.slug,
        language: item.language,
        featured_rank: item.featured_rank,
        state: item.publication_status,
      }));
      const audio = (audioResponse.data || []).map((item) => ({
        id: item.id,
        title: item.title,
        content_type: "audio",
        release_year: item.release_year,
        slug: item.slug,
        artist: item.artist,
        album: item.album,
        language: item.language,
        featured_rank: item.featured_rank,
        state: item.publication_status,
      }));

      setState((current) => ({
        ...current,
        inventory: [...movies, ...audio],
        contentFiles: filesResponse.data || [],
      }));
    } catch (error) {
      console.warn("Inventory fallback engaged.", error);
      setState((current) => ({
        ...current,
        inventory: fallbackAdmin.inventory,
        contentFiles: fallbackAdmin.contentFiles,
      }));
    }
  }

  async function loadOperationsData(baseUrl = state.apiBaseUrl, authData = auth) {
    try {
      const [platformUsersResponse, auditLogsResponse] = await Promise.all([
        fetchJson(baseUrl, "/admin/platform-users", {}, true, authData),
        fetchJson(baseUrl, "/admin/audit-logs", {}, true, authData),
      ]);
      setState((current) => ({
        ...current,
        platformUsers: platformUsersResponse.data || [],
        auditLogs: auditLogsResponse.data || [],
      }));
    } catch (error) {
      console.warn("Operations fallback engaged.", error);
      setState((current) => ({
        ...current,
        platformUsers: fallbackAdmin.platformUsers,
        auditLogs: fallbackAdmin.auditLogs,
      }));
    }
  }

  async function loadDashboard() {
    const apiBaseUrl = state.apiBaseUrl.trim();
    const authData = {
      adminToken: state.adminToken.trim(),
      adminUserId: state.adminUserId.trim(),
    };

    try {
      const [identityResponse, overviewResponse, adminUsersResponse] = await Promise.all([
        fetchJson(apiBaseUrl, "/admin/auth/me", {}, true, authData),
        fetchJson(apiBaseUrl, "/admin/analytics/overview", {}, true, authData),
        fetchJson(apiBaseUrl, "/admin/users", {}, true, authData),
      ]);

      setState((current) => ({
        ...current,
        apiBaseUrl,
        adminToken: authData.adminToken,
        adminUserId: authData.adminUserId,
        identity: identityResponse.data,
        overview: overviewResponse.data,
        adminUsers: adminUsersResponse.data || [],
        fallback: false,
        mode: "live",
        statusMessage: "Connected to protected admin endpoints.",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        apiBaseUrl,
        adminToken: authData.adminToken,
        adminUserId: authData.adminUserId,
        identity: fallbackAdmin.identity,
        overview: fallbackAdmin.overview,
        adminUsers: fallbackAdmin.adminUsers,
        fallback: true,
        mode: "fallback",
        statusMessage: `Using seeded demo data. ${error.message}`,
      }));
    }

    await loadInventory(apiBaseUrl, authData);
    await loadOperationsData(apiBaseUrl, authData);
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitMovie(event) {
    event.preventDefault();
    const payload = {
      ...state.movieForm,
      slug: state.movieForm.slug || slugify(state.movieForm.title || ""),
      release_year: state.movieForm.release_year ? Number(state.movieForm.release_year) : null,
      duration_minutes: state.movieForm.duration_minutes ? Number(state.movieForm.duration_minutes) : null,
    };
    const selectedMovieFiles = !state.movieEditId ? state.selectedMovieFileIds : [];

    try {
      const method = state.movieEditId ? "PATCH" : "POST";
      const path = state.movieEditId ? `/admin/movies/${state.movieEditId}` : "/admin/movies";
      const response = await fetchJson(
        state.apiBaseUrl,
        path,
        { method, body: JSON.stringify(payload) },
        true,
        auth
      );

      for (const contentFileId of selectedMovieFiles) {
        await fetchJson(
          state.apiBaseUrl,
          `/admin/content-files/${contentFileId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              content_kind: "movie",
              content_id: response.data.id,
            }),
          },
          true,
          auth
        );
      }

      setState((current) => ({
        ...current,
        movieForm: initialState.movieForm,
        selectedMovieFileIds: initialState.selectedMovieFileIds,
        movieFileSearch: initialState.movieFileSearch,
        movieFilePickerOpen: false,
        movieEditId: null,
        audioFileSearch: initialState.audioFileSearch,
        audioFilePickerOpen: false,
        mode: "live",
        statusMessage: state.movieEditId
          ? "Movie updated successfully."
          : selectedMovieFiles.length
            ? "Movie created and existing content files attached successfully."
            : "Movie created successfully.",
      }));
      await loadDashboard();
    } catch (error) {
      setMode(state.fallback ? "fallback" : "live", `Movie save failed. ${error.message}`);
    }
  }

  async function submitAudio(event) {
    event.preventDefault();
    const payload = {
      ...state.audioForm,
      slug: state.audioForm.slug || slugify(state.audioForm.title || ""),
    };
    const selectedAudioFiles = !state.audioEditId ? state.selectedAudioFileIds : [];

    try {
      const method = state.audioEditId ? "PATCH" : "POST";
      const path = state.audioEditId ? `/admin/audio/${state.audioEditId}` : "/admin/audio";
      const response = await fetchJson(state.apiBaseUrl, path, { method, body: JSON.stringify(payload) }, true, auth);
      for (const contentFileId of selectedAudioFiles) {
        await fetchJson(
          state.apiBaseUrl,
          `/admin/content-files/${contentFileId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              content_kind: "audio",
              content_id: response.data.id,
            }),
          },
          true,
          auth
        );
      }
      setState((current) => ({
        ...current,
        audioForm: initialState.audioForm,
        selectedAudioFileIds: initialState.selectedAudioFileIds,
        audioFileSearch: initialState.audioFileSearch,
        audioFilePickerOpen: false,
        audioEditId: null,
        mode: "live",
        statusMessage: state.audioEditId
          ? "Audio item updated successfully."
          : selectedAudioFiles.length
            ? "Audio item created and existing content files attached successfully."
            : "Audio item created successfully.",
      }));
      await loadDashboard();
    } catch (error) {
      setMode(state.fallback ? "fallback" : "live", `Audio save failed. ${error.message}`);
    }
  }

  async function submitFile(event) {
    event.preventDefault();
    const payload = {
      ...state.fileForm,
      points_cost: Number(state.fileForm.points_cost || 0),
    };

    try {
      const method = state.fileEditId ? "PATCH" : "POST";
      const path = state.fileEditId ? `/admin/content-files/${state.fileEditId}` : "/admin/content-files";
      await fetchJson(state.apiBaseUrl, path, { method, body: JSON.stringify(payload) }, true, auth);
      setState((current) => ({
        ...current,
        fileForm: initialState.fileForm,
        fileEditId: null,
        mode: "live",
        statusMessage: state.fileEditId ? "Content file updated successfully." : "Content file attached successfully.",
      }));
      await loadDashboard();
    } catch (error) {
      setMode(state.fallback ? "fallback" : "live", `Content file save failed. ${error.message}`);
    }
  }

  async function submitPointsAdjustment(event) {
    event.preventDefault();
    try {
      await fetchJson(
        state.apiBaseUrl,
        `/admin/platform-users/${state.pointsForm.user_id}/points-adjustments`,
        {
          method: "POST",
          body: JSON.stringify({
            amount: Number(state.pointsForm.amount),
            reason: state.pointsForm.reason,
          }),
        },
        true,
        auth
      );
      setState((current) => ({
        ...current,
        pointsForm: initialState.pointsForm,
        mode: "live",
        statusMessage: "Point adjustment applied.",
      }));
      await loadDashboard();
    } catch (error) {
      setMode(state.fallback ? "fallback" : "live", `Point adjustment failed. ${error.message}`);
    }
  }

  async function archiveInventoryItem(type, id) {
    const path = type === "movie" ? `/admin/movies/${id}` : `/admin/audio/${id}`;
    await fetchJson(state.apiBaseUrl, path, { method: "DELETE" }, true, auth);
    await loadDashboard();
  }

  async function deactivateContentFile(id) {
    await fetchJson(state.apiBaseUrl, `/admin/content-files/${id}`, { method: "DELETE" }, true, auth);
    await loadDashboard();
  }

  async function updatePlatformUserBanState(userId, isBanned) {
    await fetchJson(
      state.apiBaseUrl,
      `/admin/platform-users/${userId}`,
      { method: "PATCH", body: JSON.stringify({ is_banned: isBanned }) },
      true,
      auth
    );
    await loadDashboard();
  }

  function permissionPills(user) {
    const permissions = [];
    if (user.can_manage_content) permissions.push("Content");
    if (user.can_manage_users) permissions.push("Users");
    if (user.can_manage_rewards) permissions.push("Rewards");
    if (user.can_view_analytics) permissions.push("Analytics");
    return permissions.length ? permissions : ["Limited"];
  }

  function startEditInventory(item) {
    setState((current) => ({
      ...current,
      activeScreen: "publishing",
      activeForm: item.content_type === "movie" ? "movie" : "audio",
      movieEditId: item.content_type === "movie" ? item.id : current.movieEditId,
      audioEditId: item.content_type === "audio" ? item.id : current.audioEditId,
      movieForm:
        item.content_type === "movie"
          ? {
              ...current.movieForm,
              title: item.title || "",
              slug: item.slug || "",
              release_year: item.release_year || "",
              language: item.language || "",
              publication_status: item.state || "draft",
            }
          : current.movieForm,
      selectedMovieFileIds:
        item.content_type === "movie" ? initialState.selectedMovieFileIds : current.selectedMovieFileIds,
      movieFileSearch:
        item.content_type === "movie" ? initialState.movieFileSearch : current.movieFileSearch,
      movieFilePickerOpen:
        item.content_type === "movie" ? initialState.movieFilePickerOpen : current.movieFilePickerOpen,
      audioForm:
        item.content_type === "audio"
          ? {
              ...current.audioForm,
              title: item.title || "",
              slug: item.slug || "",
              artist: item.artist || "",
              album: item.album || "",
              language: item.language || "",
              publication_status: item.state || "draft",
            }
          : current.audioForm,
      selectedAudioFileIds:
        item.content_type === "audio" ? initialState.selectedAudioFileIds : current.selectedAudioFileIds,
      audioFileSearch:
        item.content_type === "audio" ? initialState.audioFileSearch : current.audioFileSearch,
      audioFilePickerOpen:
        item.content_type === "audio" ? initialState.audioFilePickerOpen : current.audioFilePickerOpen,
    }));
  }

  function startEditFile(file) {
    setState((current) => ({
      ...current,
      activeScreen: "publishing",
      activeForm: "file",
      fileEditId: file.id,
      fileForm: {
        content_kind: file.content_kind || "movie",
        content_id: file.content_id || "",
        label: file.label || "",
        quality: file.quality || "",
        format: file.format || "",
        storage_provider: file.storage_provider || "r2",
        storage_key: file.storage_key || "",
        points_cost: file.points_cost || 0,
        delivery_mode: file.delivery_mode || "telegram_bot",
        requires_ad: Boolean(file.requires_ad),
      },
    }));
  }

  function toggleMovieContentFile(contentFileId) {
    setState((current) => ({
      ...current,
      selectedMovieFileIds: current.selectedMovieFileIds.includes(contentFileId)
        ? current.selectedMovieFileIds.filter((id) => id !== contentFileId)
        : [...current.selectedMovieFileIds, contentFileId],
    }));
  }

  function toggleAudioContentFile(contentFileId) {
    setState((current) => ({
      ...current,
      selectedAudioFileIds: current.selectedAudioFileIds.includes(contentFileId)
        ? current.selectedAudioFileIds.filter((id) => id !== contentFileId)
        : [...current.selectedAudioFileIds, contentFileId],
    }));
  }

  function selectedMovieFilesLabel() {
    if (!state.selectedMovieFileIds.length) {
      return "Choose downloadable files";
    }

    if (state.selectedMovieFileIds.length === 1) {
      const selectedFile = contentFiles.find((file) => file.id === state.selectedMovieFileIds[0]);
      return selectedFile?.label || selectedFile?.storage_key || "1 file selected";
    }

    return `${state.selectedMovieFileIds.length} files selected`;
  }

  function selectedAudioFilesLabel() {
    if (!state.selectedAudioFileIds.length) {
      return "Choose downloadable files";
    }

    if (state.selectedAudioFileIds.length === 1) {
      const selectedFile = contentFiles.find((file) => file.id === state.selectedAudioFileIds[0]);
      return selectedFile?.label || selectedFile?.storage_key || "1 file selected";
    }

    return `${state.selectedAudioFileIds.length} files selected`;
  }

  return (
    <div className="admin-shell">
      <header className="masthead">
        <div className="masthead-copy">
          <p className="eyebrow">Operations console</p>
          <h1>IMB Admin</h1>
          <p className="masthead-text">
            Publishing, moderation, rewards, and visibility in clearer operational lanes.
          </p>
        </div>
        <div className="masthead-status">
          <div className="status-chip">
            <span className="status-dot" />
            <strong>{state.mode === "fallback" ? "Fallback mode" : state.mode === "live" ? "Live API" : "Booting"}</strong>
          </div>
          <p className="status-message">{state.statusMessage || "Checking API reachability and loading admin context."}</p>
        </div>
      </header>

      <section className="auth-band">
        <label className="field wide">
          <span>API base</span>
          <input value={state.apiBaseUrl} onChange={(e) => setState((c) => ({ ...c, apiBaseUrl: e.target.value }))} />
        </label>
        <label className="field">
          <span>Admin token</span>
          <input
            placeholder="Bearer token"
            type="password"
            value={state.adminToken}
            onChange={(e) => setState((c) => ({ ...c, adminToken: e.target.value }))}
          />
        </label>
        <label className="field">
          <span>Admin user UUID</span>
          <input value={state.adminUserId} onChange={(e) => setState((c) => ({ ...c, adminUserId: e.target.value }))} />
        </label>
        <div className="auth-actions">
          <button className="primary-button" onClick={loadDashboard} type="button">
            Connect
          </button>
          <button className="secondary-button" onClick={loadDashboard} type="button">
            Refresh
          </button>
        </div>
      </section>

      <main className="admin-grid">
        <aside className="sidebar">
          <section className="panel sidebar-panel">
            <div className="identity-card">
              <div className="identity-panel">
                <p className="eyebrow">Signed in</p>
                <h3>{identity.telegram_username || "Unknown admin"}</h3>
                <p className="mono">{identity.user_id}</p>
                <div className="badge-row">
                  <span className="badge">{identity.role}</span>
                  <span className="badge is-muted">{identity.telegram_user_id || "No Telegram ID"}</span>
                </div>
                <div className="permission-row">
                  {permissionPills(identity).map((permission) => (
                    <span className="permission-pill" key={permission}>
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <nav className="sidebar-nav panel" aria-label="Admin sections">
            {[
              ["overview", "Overview"],
              ["catalog", "Catalog"],
              ["users", "Users"],
              ["publishing", "Publishing"],
              ["audit", "Audit"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={`sidebar-link ${state.activeScreen === value ? "is-active" : ""}`}
                onClick={() => setState((current) => ({ ...current, activeScreen: value }))}
                type="button"
              >
                {label}
              </button>
            ))}
          </nav>

          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Team access</p>
                <h2>Admin roles</h2>
              </div>
            </div>
            <div className="admin-list">
              {adminUsers.map((user) => (
                <article className="admin-row" key={user.user_id}>
                  <h3>{user.telegram_username || "Unnamed admin"}</h3>
                  <p className="mono">{user.user_id}</p>
                  <div className="permission-row">
                    {permissionPills(user).map((permission) => (
                      <span className="permission-pill" key={permission}>
                        {permission}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>

        <section className="workspace">
          {state.activeScreen === "overview" && (
            <section className="workspace-screen is-active">
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Overview</p>
                    <h2>Operational snapshot</h2>
                  </div>
                  <p className="meta-line">Updated {new Date().toLocaleString()}</p>
                </div>
                <div className="metrics-grid">
                  {[
                    ["Published movies", metrics.published_movies],
                    ["Published audio", metrics.published_audio],
                    ["Download sessions", metrics.download_sessions],
                    ["Verified ads", metrics.verified_ad_events],
                    ["Total users", metrics.total_users],
                  ].map(([label, value]) => (
                    <article className="metric-tile" key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Recent activity</p>
                    <h2>Audit stream</h2>
                  </div>
                </div>
                <div className="audit-list">
                  {auditLogs.map((log) => (
                    <article className="audit-row" key={log.id}>
                      <h3>{log.action}</h3>
                      <p>{log.entity_type}{log.entity_id ? ` | ${log.entity_id}` : ""}</p>
                      <p className="mono">{log.actor_user_id || "system"} | {new Date(log.created_at).toLocaleString()}</p>
                    </article>
                  ))}
                </div>
              </section>
            </section>
          )}

          {state.activeScreen === "catalog" && (
            <section className="workspace-screen is-active">
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Catalog</p>
                    <h2>Published inventory</h2>
                  </div>
                  <div className="panel-controls">
                    <label className="field compact-field">
                      <span>Filter</span>
                      <input
                        placeholder="Search titles"
                        value={state.inventoryQuery}
                        onChange={(e) => setState((c) => ({ ...c, inventoryQuery: e.target.value }))}
                      />
                    </label>
                    <label className="field compact-field">
                      <span>Type</span>
                      <select
                        value={state.inventoryType}
                        onChange={(e) => setState((c) => ({ ...c, inventoryType: e.target.value }))}
                      >
                        <option value="all">All</option>
                        <option value="movie">Movies</option>
                        <option value="audio">Audio</option>
                      </select>
                    </label>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Year</th>
                        <th>Slug</th>
                        <th>State</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalizedInventory.map((item) => (
                        <tr key={`${item.content_type}-${item.id}`}>
                          <td>{item.title}</td>
                          <td><span className="badge is-muted">{item.content_type}</span></td>
                          <td>{item.release_year || "Audio"}</td>
                          <td className="mono">{item.slug}</td>
                          <td><span className="badge">{item.state || "published"}</span></td>
                          <td>
                            <div className="action-row">
                              <button className="mini-button" onClick={() => startEditInventory(item)} type="button">Edit</button>
                              <button className="mini-button is-danger" onClick={() => archiveInventoryItem(item.content_type, item.id)} type="button">Archive</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Delivery</p>
                    <h2>Content files</h2>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Label</th>
                        <th>Kind</th>
                        <th>Assigned</th>
                        <th>Quality</th>
                        <th>Points</th>
                        <th>State</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contentFiles.map((item) => (
                        <tr key={item.id}>
                          <td>{item.label || "Untitled file"}</td>
                          <td><span className="badge is-muted">{item.content_kind}</span></td>
                          <td>{item.assignment_state === "attached" ? item.assignment_label || "Attached" : "Unassigned"}</td>
                          <td>{item.quality || item.format || "Standard"}</td>
                          <td>{item.points_cost}</td>
                          <td><span className={`badge ${item.is_active === false ? "is-muted" : ""}`}>{item.is_active === false ? "inactive" : "active"}</span></td>
                          <td>
                            <div className="action-row">
                              <button className="mini-button" onClick={() => startEditFile(item)} type="button">Edit</button>
                              <button className="mini-button is-danger" onClick={() => deactivateContentFile(item.id)} type="button">Disable</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </section>
          )}

          {state.activeScreen === "users" && (
            <section className="workspace-screen is-active">
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Users</p>
                    <h2>Platform users</h2>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Telegram</th>
                        <th>Role</th>
                        <th>Points</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platformUsers.map((user) => (
                        <tr key={user.user_id}>
                          <td>
                            <strong>{user.telegram_username || "Unknown user"}</strong>
                            <div className="mono">{user.user_id}</div>
                          </td>
                          <td><span className="badge is-muted">{user.role}</span></td>
                          <td>{user.points_balance}</td>
                          <td><span className={`badge ${user.is_banned ? "is-muted" : ""}`}>{user.is_banned ? "banned" : "active"}</span></td>
                          <td>
                            <div className="action-row">
                              <button
                                className="mini-button"
                                onClick={() =>
                                  setState((current) => ({
                                    ...current,
                                    pointsForm: { ...current.pointsForm, user_id: user.user_id },
                                  }))
                                }
                                type="button"
                              >
                                Adjust points
                              </button>
                              <button
                                className={`mini-button ${user.is_banned ? "" : "is-danger"}`}
                                onClick={() => updatePlatformUserBanState(user.user_id, !user.is_banned)}
                                type="button"
                              >
                                {user.is_banned ? "Unban" : "Ban"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="panel accent-panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Rewards</p>
                    <h2>Manual point adjustment</h2>
                  </div>
                </div>
                <form className="editor-form is-active compact-form" onSubmit={submitPointsAdjustment}>
                  <label className="field">
                    <span>User UUID</span>
                    <input
                      required
                      value={state.pointsForm.user_id}
                      onChange={(e) => setState((c) => ({ ...c, pointsForm: { ...c.pointsForm, user_id: e.target.value } }))}
                    />
                  </label>
                  <label className="field">
                    <span>Amount</span>
                    <input
                      required
                      type="number"
                      value={state.pointsForm.amount}
                      onChange={(e) => setState((c) => ({ ...c, pointsForm: { ...c.pointsForm, amount: e.target.value } }))}
                    />
                  </label>
                  <label className="field">
                    <span>Reason</span>
                    <input
                      required
                      value={state.pointsForm.reason}
                      onChange={(e) => setState((c) => ({ ...c, pointsForm: { ...c.pointsForm, reason: e.target.value } }))}
                    />
                  </label>
                  <div className="form-actions">
                    <button className="primary-button" type="submit">Apply adjustment</button>
                  </div>
                </form>
              </section>
            </section>
          )}

          {state.activeScreen === "publishing" && (
            <section className="workspace-screen is-active">
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Publishing</p>
                    <h2>Create or update content</h2>
                  </div>
                  <div className="panel-controls">
                    {[
                      ["movie", "Movie"],
                      ["audio", "Audio"],
                      ["file", "Content file"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        className={`segment ${state.activeForm === value ? "is-active" : ""}`}
                        onClick={() => setState((current) => ({ ...current, activeForm: value }))}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="forms-stack">
                  {state.activeForm === "movie" && (
                    <form className="editor-form is-active" onSubmit={submitMovie}>
                      <div className="form-grid">
                        <label className="field"><span>Title</span><input required value={state.movieForm.title} onChange={(e) => setState((c) => ({ ...c, movieForm: { ...c.movieForm, title: e.target.value } }))} /></label>
                        <label className="field"><span>Slug</span><input value={state.movieForm.slug} onChange={(e) => setState((c) => ({ ...c, movieForm: { ...c.movieForm, slug: e.target.value } }))} /></label>
                        <label className="field"><span>Year</span><input type="number" value={state.movieForm.release_year} onChange={(e) => setState((c) => ({ ...c, movieForm: { ...c.movieForm, release_year: e.target.value } }))} /></label>
                        <label className="field"><span>Language</span><input value={state.movieForm.language} onChange={(e) => setState((c) => ({ ...c, movieForm: { ...c.movieForm, language: e.target.value } }))} /></label>
                        <label className="field"><span>Status</span><select value={state.movieForm.publication_status} onChange={(e) => setState((c) => ({ ...c, movieForm: { ...c.movieForm, publication_status: e.target.value } }))}><option value="draft">Draft</option><option value="published">Published</option></select></label>
                        <label className="field"><span>Duration</span><input type="number" value={state.movieForm.duration_minutes} onChange={(e) => setState((c) => ({ ...c, movieForm: { ...c.movieForm, duration_minutes: e.target.value } }))} /></label>
                      </div>
                      <label className="field"><span>Synopsis</span><textarea rows="4" value={state.movieForm.synopsis} onChange={(e) => setState((c) => ({ ...c, movieForm: { ...c.movieForm, synopsis: e.target.value } }))} /></label>
                      {!state.movieEditId && (
                        <section className="panel accent-panel nested-panel">
                          <div className="panel-head">
                            <div>
                              <p className="eyebrow">Downloadable files</p>
                              <h2>Choose existing files for this movie</h2>
                            </div>
                          </div>
                          <div className="file-picker">
                            <button
                              className="file-picker-trigger"
                              onClick={() =>
                                setState((current) => ({
                                  ...current,
                                  movieFilePickerOpen: !current.movieFilePickerOpen,
                                }))
                              }
                              type="button"
                            >
                              <span>{selectedMovieFilesLabel()}</span>
                              <strong>{state.movieFilePickerOpen ? "Close" : "Browse"}</strong>
                            </button>

                            {!!state.selectedMovieFileIds.length && (
                              <div className="selected-chip-row">
                                {state.selectedMovieFileIds.map((fileId) => {
                                  const selectedFile = contentFiles.find((file) => file.id === fileId);
                                  if (!selectedFile) return null;
                                  return (
                                    <button
                                      className="selected-chip"
                                      key={fileId}
                                      onClick={() => toggleMovieContentFile(fileId)}
                                      type="button"
                                    >
                                      <span>{selectedFile.label || selectedFile.storage_key}</span>
                                      <strong>Remove</strong>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {state.movieFilePickerOpen && (
                              <div className="file-picker-dropdown">
                                <label className="field">
                                  <span>Search files</span>
                                  <input
                                    placeholder="Search by label, quality, format, or storage key"
                                    value={state.movieFileSearch}
                                    onChange={(e) =>
                                      setState((c) => ({ ...c, movieFileSearch: e.target.value }))
                                    }
                                  />
                                </label>

                                <div className="file-picker-options">
                                  {filteredMovieAttachableFiles.length ? (
                                    filteredMovieAttachableFiles.map((file) => (
                                      <label className="download-file-card selectable-file-card" key={file.id}>
                                        <div className="download-file-head">
                                          <strong>{file.label || file.storage_key}</strong>
                                          <input
                                            checked={state.selectedMovieFileIds.includes(file.id)}
                                            type="checkbox"
                                            onChange={() => toggleMovieContentFile(file.id)}
                                          />
                                        </div>
                                        <div className="download-file-meta">
                                          <span>{file.quality || file.format || "Standard"}</span>
                                          <span>{file.points_cost} pts</span>
                                          <span>{file.delivery_mode}</span>
                                          <span>{file.storage_provider}</span>
                                          <span>{file.assignment_state === "attached" ? `Attached to ${file.assignment_label || file.content_kind}` : "Unassigned"}</span>
                                        </div>
                                        <p className="mono">{file.storage_key}</p>
                                      </label>
                                    ))
                                  ) : (
                                    <p className="empty-state">
                                      {contentFiles.length
                                        ? "No content files matched that search."
                                        : "No content files are available yet. Add them in the content files section first."}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </section>
                      )}
                      <div className="form-actions"><button className="primary-button" type="submit">Save movie</button></div>
                    </form>
                  )}

                  {state.activeForm === "audio" && (
                    <form className="editor-form is-active" onSubmit={submitAudio}>
                      <div className="form-grid">
                        <label className="field"><span>Title</span><input required value={state.audioForm.title} onChange={(e) => setState((c) => ({ ...c, audioForm: { ...c.audioForm, title: e.target.value } }))} /></label>
                        <label className="field"><span>Slug</span><input value={state.audioForm.slug} onChange={(e) => setState((c) => ({ ...c, audioForm: { ...c.audioForm, slug: e.target.value } }))} /></label>
                        <label className="field"><span>Artist</span><input value={state.audioForm.artist} onChange={(e) => setState((c) => ({ ...c, audioForm: { ...c.audioForm, artist: e.target.value } }))} /></label>
                        <label className="field"><span>Album</span><input value={state.audioForm.album} onChange={(e) => setState((c) => ({ ...c, audioForm: { ...c.audioForm, album: e.target.value } }))} /></label>
                        <label className="field"><span>Language</span><input value={state.audioForm.language} onChange={(e) => setState((c) => ({ ...c, audioForm: { ...c.audioForm, language: e.target.value } }))} /></label>
                        <label className="field"><span>Status</span><select value={state.audioForm.publication_status} onChange={(e) => setState((c) => ({ ...c, audioForm: { ...c.audioForm, publication_status: e.target.value } }))}><option value="draft">Draft</option><option value="published">Published</option></select></label>
                      </div>
                      <label className="field"><span>Synopsis</span><textarea rows="4" value={state.audioForm.synopsis} onChange={(e) => setState((c) => ({ ...c, audioForm: { ...c.audioForm, synopsis: e.target.value } }))} /></label>
                      {!state.audioEditId && (
                        <section className="panel accent-panel nested-panel">
                          <div className="panel-head">
                            <div>
                              <p className="eyebrow">Downloadable files</p>
                              <h2>Choose existing files for this audio item</h2>
                            </div>
                          </div>
                          <div className="file-picker">
                            <button
                              className="file-picker-trigger"
                              onClick={() =>
                                setState((current) => ({
                                  ...current,
                                  audioFilePickerOpen: !current.audioFilePickerOpen,
                                }))
                              }
                              type="button"
                            >
                              <span>{selectedAudioFilesLabel()}</span>
                              <strong>{state.audioFilePickerOpen ? "Close" : "Browse"}</strong>
                            </button>

                            {!!state.selectedAudioFileIds.length && (
                              <div className="selected-chip-row">
                                {state.selectedAudioFileIds.map((fileId) => {
                                  const selectedFile = contentFiles.find((file) => file.id === fileId);
                                  if (!selectedFile) return null;
                                  return (
                                    <button
                                      className="selected-chip"
                                      key={fileId}
                                      onClick={() => toggleAudioContentFile(fileId)}
                                      type="button"
                                    >
                                      <span>{selectedFile.label || selectedFile.storage_key}</span>
                                      <strong>Remove</strong>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {state.audioFilePickerOpen && (
                              <div className="file-picker-dropdown">
                                <label className="field">
                                  <span>Search files</span>
                                  <input
                                    placeholder="Search by label, quality, format, or storage key"
                                    value={state.audioFileSearch}
                                    onChange={(e) =>
                                      setState((c) => ({ ...c, audioFileSearch: e.target.value }))
                                    }
                                  />
                                </label>

                                <div className="file-picker-options">
                                  {filteredAudioAttachableFiles.length ? (
                                    filteredAudioAttachableFiles.map((file) => (
                                      <label className="download-file-card selectable-file-card" key={file.id}>
                                        <div className="download-file-head">
                                          <strong>{file.label || file.storage_key}</strong>
                                          <input
                                            checked={state.selectedAudioFileIds.includes(file.id)}
                                            type="checkbox"
                                            onChange={() => toggleAudioContentFile(file.id)}
                                          />
                                        </div>
                                        <div className="download-file-meta">
                                          <span>{file.quality || file.format || "Standard"}</span>
                                          <span>{file.points_cost} pts</span>
                                          <span>{file.delivery_mode}</span>
                                          <span>{file.storage_provider}</span>
                                          <span>{file.assignment_state === "attached" ? `Attached to ${file.assignment_label || file.content_kind}` : "Unassigned"}</span>
                                        </div>
                                        <p className="mono">{file.storage_key}</p>
                                      </label>
                                    ))
                                  ) : (
                                    <p className="empty-state">
                                      {contentFiles.length
                                        ? "No content files matched that search."
                                        : "No content files are available yet. Add them in the content files section first."}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </section>
                      )}
                      <div className="form-actions"><button className="primary-button" type="submit">Save audio</button></div>
                    </form>
                  )}

                  {state.activeForm === "file" && (
                    <form className="editor-form is-active" onSubmit={submitFile}>
                      <div className="form-grid">
                        <label className="field"><span>Content kind</span><select value={state.fileForm.content_kind} onChange={(e) => setState((c) => ({ ...c, fileForm: { ...c.fileForm, content_kind: e.target.value } }))}><option value="movie">Movie</option><option value="audio">Audio</option><option value="series">Series</option><option value="episode">Episode</option></select></label>
                        <label className="field"><span>Content UUID</span><input required value={state.fileForm.content_id} onChange={(e) => setState((c) => ({ ...c, fileForm: { ...c.fileForm, content_id: e.target.value } }))} /></label>
                        <label className="field"><span>Label</span><input value={state.fileForm.label} onChange={(e) => setState((c) => ({ ...c, fileForm: { ...c.fileForm, label: e.target.value } }))} /></label>
                        <label className="field"><span>Quality</span><input value={state.fileForm.quality} onChange={(e) => setState((c) => ({ ...c, fileForm: { ...c.fileForm, quality: e.target.value } }))} /></label>
                        <label className="field"><span>Format</span><input value={state.fileForm.format} onChange={(e) => setState((c) => ({ ...c, fileForm: { ...c.fileForm, format: e.target.value } }))} /></label>
                        <label className="field"><span>Storage provider</span><select value={state.fileForm.storage_provider} onChange={(e) => setState((c) => ({ ...c, fileForm: { ...c.fileForm, storage_provider: e.target.value } }))}><option value="r2">r2</option><option value="b2">b2</option><option value="s3">s3</option><option value="other">other</option></select></label>
                        <label className="field"><span>Storage key</span><input required value={state.fileForm.storage_key} onChange={(e) => setState((c) => ({ ...c, fileForm: { ...c.fileForm, storage_key: e.target.value } }))} /></label>
                        <label className="field"><span>Points cost</span><input type="number" value={state.fileForm.points_cost} onChange={(e) => setState((c) => ({ ...c, fileForm: { ...c.fileForm, points_cost: e.target.value } }))} /></label>
                        <label className="field"><span>Delivery mode</span><select value={state.fileForm.delivery_mode} onChange={(e) => setState((c) => ({ ...c, fileForm: { ...c.fileForm, delivery_mode: e.target.value } }))}><option value="telegram_bot">telegram_bot</option><option value="telegram_channel">telegram_channel</option><option value="external_link">external_link</option></select></label>
                        <label className="field toggle-field"><span>Requires ad</span><input checked={state.fileForm.requires_ad} type="checkbox" onChange={(e) => setState((c) => ({ ...c, fileForm: { ...c.fileForm, requires_ad: e.target.checked } }))} /></label>
                      </div>
                      <div className="form-actions"><button className="primary-button" type="submit">Save content file</button></div>
                    </form>
                  )}
                </div>
              </section>
            </section>
          )}

          {state.activeScreen === "audit" && (
            <section className="workspace-screen is-active">
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Audit</p>
                    <h2>Operational event trail</h2>
                  </div>
                </div>
                <div className="audit-list">
                  {auditLogs.map((log) => (
                    <article className="audit-row" key={log.id}>
                      <h3>{log.action}</h3>
                      <p>{log.entity_type}{log.entity_id ? ` | ${log.entity_id}` : ""}</p>
                      <p className="mono">{log.actor_user_id || "system"} | {new Date(log.created_at).toLocaleString()}</p>
                    </article>
                  ))}
                </div>
              </section>
            </section>
          )}
        </section>
      </main>
    </div>
  );
}
