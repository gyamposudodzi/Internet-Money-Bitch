"use client";

import { useEffect, useMemo, useState } from "react";

import { fallbackAdmin } from "../lib/fallback-admin";

const testAdminCredentials = {
  username: "imb_admin",
  email: "admin@example.com",
  password: "admin12345",
  token: "test-admin-token",
  userId: "11111111-1111-1111-1111-111111111111",
};

const topNavItems = [
  ["dashboard", "Dashboard"],
  ["analytics", "Analytics"],
  ["contents", "Contents"],
  ["users", "Users"],
  ["settings", "Settings"],
];

const profileMenuItems = [
  ["profile", "Profile"],
  ["settings", "Settings"],
];

const storageKey = "imb-admin-session";

const initialMovieForm = {
  title: "",
  slug: "",
  release_year: "",
  language: "",
  publication_status: "draft",
  duration_minutes: "",
  synopsis: "",
  genre_slugs: [],
};

const initialAudioForm = {
  title: "",
  slug: "",
  artist: "",
  album: "",
  language: "",
  publication_status: "draft",
  synopsis: "",
};

const initialSeriesForm = {
  title: "",
  slug: "",
  release_year: "",
  language: "",
  publication_status: "draft",
  synopsis: "",
  genre_slugs: [],
};

const initialFileForm = {
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
};

const initialHomepageSectionForm = {
  title: "",
  slug: "",
  sort_order: 0,
  is_active: true,
  content_type: "movie",
  sort: "featured",
  limit: 12,
  language: "",
  genre: "",
  query: "",
};

const initialPointsForm = {
  user_id: "",
  amount: "",
  reason: "",
};

const initialState = {
  apiBaseUrl: "http://localhost:8000/api/v1",
  loginIdentifier: "",
  loginPassword: "",
  adminToken: "",
  adminUserId: "11111111-1111-1111-1111-111111111111",
  isAuthenticated: false,
  isLoading: false,
  statusMessage: "Sign in with your admin username/email and password to open the dashboard.",
  loginError: "",
  fallback: false,
  activeView: "dashboard",
  identity: null,
  overview: null,
  adminUsers: [],
  genres: [],
  platformUsers: [],
  inventory: [],
  contentFiles: [],
  homepageSections: [],
  auditLogs: [],
  inventoryQuery: "",
  inventoryType: "all",
  movieFileSearch: "",
  movieFilePickerOpen: false,
  seriesFileSearch: "",
  seriesFilePickerOpen: false,
  audioFileSearch: "",
  audioFilePickerOpen: false,
  showProfileMenu: false,
  showComposer: false,
  activeComposerTab: "movie",
  composerSubmitting: false,
  composerFeedback: "",
  composerFeedbackTone: "neutral",
  movieForm: initialMovieForm,
  selectedMovieFileIds: [],
  seriesForm: initialSeriesForm,
  selectedSeriesFileIds: [],
  audioForm: initialAudioForm,
  selectedAudioFileIds: [],
  fileForm: initialFileForm,
  homepageSectionForm: initialHomepageSectionForm,
  pointsForm: initialPointsForm,
  movieEditId: null,
  seriesEditId: null,
  audioEditId: null,
  fileEditId: null,
  homepageSectionEditId: null,
};

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function matchesTestAdmin(identifier, password) {
  const normalized = identifier.trim().toLowerCase();
  return (
    password === testAdminCredentials.password &&
    (normalized === testAdminCredentials.username || normalized === testAdminCredentials.email)
  );
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

function dashboardSubtitle(activeView) {
  switch (activeView) {
    case "analytics":
      return "Tracking platform health, rewards, and delivery performance.";
    case "contents":
      return "Manage published titles, downloadable files, and release inventory.";
    case "users":
      return "Moderate users, review admins, and adjust reward balances.";
    case "settings":
      return "Review connection state and current operator access details.";
    case "profile":
      return "Your current admin identity and permission footprint.";
    default:
      return "Your operating overview for content, users, and reward activity.";
  }
}

export default function Page() {
  const [state, setState] = useState(initialState);

  const auth = {
    adminToken: state.adminToken.trim(),
    adminUserId: state.adminUserId.trim(),
  };

  const identity = state.fallback ? fallbackAdmin.identity : state.identity;
  const metrics = state.fallback ? fallbackAdmin.overview : state.overview;
  const adminUsers = state.fallback ? fallbackAdmin.adminUsers : state.adminUsers;
  const genreOptions = state.fallback ? fallbackAdmin.genres : state.genres;
  const platformUsers = state.fallback ? fallbackAdmin.platformUsers : state.platformUsers;
  const contentFiles = state.fallback ? fallbackAdmin.contentFiles : state.contentFiles;
  const homepageSections = state.fallback ? fallbackAdmin.homepageSections : state.homepageSections;
  const auditLogs = state.fallback ? fallbackAdmin.auditLogs : state.auditLogs;

  const normalizedInventory = useMemo(() => {
    const source = state.fallback ? fallbackAdmin.inventory : state.inventory;
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

  const filteredSeriesAttachableFiles = useMemo(() => {
    const query = state.seriesFileSearch.trim().toLowerCase();
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
  }, [contentFiles, state.seriesFileSearch]);

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw);
      if (!saved?.isAuthenticated) return;

      const baseState = {
        apiBaseUrl: saved.apiBaseUrl || initialState.apiBaseUrl,
        adminToken: saved.adminToken || "",
        adminUserId: saved.adminUserId || initialState.adminUserId,
        activeView: saved.activeView || "dashboard",
        isAuthenticated: true,
        fallback: Boolean(saved.fallback),
        statusMessage: saved.fallback
          ? "Restored local fallback admin session."
          : "Restored admin session.",
      };

      if (saved.fallback) {
        setState((current) => ({
          ...current,
          ...baseState,
          identity: fallbackAdmin.identity,
          overview: fallbackAdmin.overview,
          adminUsers: fallbackAdmin.adminUsers,
          genres: fallbackAdmin.genres,
          platformUsers: fallbackAdmin.platformUsers,
          inventory: fallbackAdmin.inventory,
          contentFiles: fallbackAdmin.contentFiles,
          homepageSections: fallbackAdmin.homepageSections,
          auditLogs: fallbackAdmin.auditLogs,
        }));
        return;
      }

      setState((current) => ({
        ...current,
        ...baseState,
      }));

      loadDashboard(baseState.apiBaseUrl, {
        adminToken: baseState.adminToken,
        adminUserId: baseState.adminUserId,
      }).catch(() => {
        setState((current) => ({
          ...current,
          fallback: true,
          identity: fallbackAdmin.identity,
          overview: fallbackAdmin.overview,
          adminUsers: fallbackAdmin.adminUsers,
          genres: fallbackAdmin.genres,
          platformUsers: fallbackAdmin.platformUsers,
          inventory: fallbackAdmin.inventory,
          contentFiles: fallbackAdmin.contentFiles,
          homepageSections: fallbackAdmin.homepageSections,
          auditLogs: fallbackAdmin.auditLogs,
          statusMessage: "Stored session restored in fallback mode because the live API could not be reached.",
        }));
      });
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!state.isAuthenticated) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        isAuthenticated: true,
        apiBaseUrl: state.apiBaseUrl,
        adminToken: state.adminToken,
        adminUserId: state.adminUserId,
        activeView: state.activeView,
        fallback: state.fallback,
      })
    );
  }, [
    state.activeView,
    state.adminToken,
    state.adminUserId,
    state.apiBaseUrl,
    state.fallback,
    state.isAuthenticated,
  ]);

  function setStatus(statusMessage, extras = {}) {
    setState((current) => ({
      ...current,
      statusMessage,
      ...extras,
    }));
  }

  function resetComposerState(overrides = {}) {
    setState((current) => ({
      ...current,
      showComposer: false,
      activeComposerTab: "movie",
      composerSubmitting: false,
      composerFeedback: "",
      composerFeedbackTone: "neutral",
      movieForm: initialMovieForm,
      audioForm: initialAudioForm,
      seriesForm: initialSeriesForm,
      fileForm: initialFileForm,
      selectedMovieFileIds: [],
      selectedSeriesFileIds: [],
      selectedAudioFileIds: [],
      movieFileSearch: "",
      seriesFileSearch: "",
      audioFileSearch: "",
      movieFilePickerOpen: false,
      seriesFilePickerOpen: false,
      audioFilePickerOpen: false,
      movieEditId: null,
      seriesEditId: null,
      audioEditId: null,
      fileEditId: null,
      homepageSectionForm: initialHomepageSectionForm,
      homepageSectionEditId: null,
      ...overrides,
    }));
  }

  async function loadInventory(baseUrl = state.apiBaseUrl, authData = auth) {
    try {
      const [moviesResponse, seriesResponse, audioResponse, filesResponse, genresResponse, sectionsResponse] =
        await Promise.all([
        fetchJson(baseUrl, "/admin/movies", {}, true, authData),
        fetchJson(baseUrl, "/admin/series", {}, true, authData),
        fetchJson(baseUrl, "/admin/audio", {}, true, authData),
        fetchJson(baseUrl, "/admin/content-files", {}, true, authData),
        fetchJson(baseUrl, "/admin/genres", {}, true, authData),
        fetchJson(baseUrl, "/admin/homepage-sections", {}, true, authData),
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
        genre_slugs: item.genre_slugs || [],
      }));
      const seriesItems = (seriesResponse.data || []).map((item) => ({
        id: item.id,
        title: item.title,
        content_type: "series",
        release_year: item.release_year,
        slug: item.slug,
        language: item.language,
        featured_rank: item.featured_rank,
        state: item.publication_status,
        genre_slugs: item.genre_slugs || [],
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
        inventory: [...movies, ...seriesItems, ...audio],
        contentFiles: filesResponse.data || [],
        genres: genresResponse.data || [],
        homepageSections: sectionsResponse.data || [],
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        fallback: true,
        inventory: fallbackAdmin.inventory,
        contentFiles: fallbackAdmin.contentFiles,
        genres: fallbackAdmin.genres,
        homepageSections: fallbackAdmin.homepageSections,
        statusMessage: `Inventory fallback active. ${error.message}`,
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
      setState((current) => ({
        ...current,
        fallback: true,
        platformUsers: fallbackAdmin.platformUsers,
        auditLogs: fallbackAdmin.auditLogs,
        statusMessage: `Operations fallback active. ${error.message}`,
      }));
    }
  }

  async function loadDashboard(baseUrl = state.apiBaseUrl, authData = auth) {
    const [identityResponse, overviewResponse, adminUsersResponse] = await Promise.all([
      fetchJson(baseUrl, "/admin/auth/me", {}, true, authData),
      fetchJson(baseUrl, "/admin/analytics/overview", {}, true, authData),
      fetchJson(baseUrl, "/admin/users", {}, true, authData),
    ]);

    setState((current) => ({
      ...current,
      identity: identityResponse.data,
      overview: overviewResponse.data,
      adminUsers: adminUsersResponse.data || [],
      fallback: false,
      isAuthenticated: true,
      loginError: "",
      statusMessage: "Connected to protected admin endpoints.",
    }));

    await Promise.all([loadInventory(baseUrl, authData), loadOperationsData(baseUrl, authData)]);
  }

  async function handleLogin(event) {
    event.preventDefault();
    const apiBaseUrl = state.apiBaseUrl.trim();
    const identifier = state.loginIdentifier.trim();
    const password = state.loginPassword;

    setState((current) => ({
      ...current,
      isLoading: true,
      loginError: "",
      showProfileMenu: false,
    }));

    try {
      const loginResponse = await fetchJson(apiBaseUrl, "/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier,
          password,
        }),
      });
      const authData = {
        adminToken: loginResponse.data.access_token,
        adminUserId: loginResponse.data.admin_user_id,
      };
      await loadDashboard(apiBaseUrl, authData);
      setState((current) => ({
        ...current,
        apiBaseUrl,
        adminToken: authData.adminToken,
        adminUserId: authData.adminUserId,
        loginPassword: "",
        isLoading: false,
      }));
    } catch (error) {
      if (matchesTestAdmin(identifier, password)) {
        setState((current) => ({
          ...current,
          isLoading: false,
          isAuthenticated: true,
          fallback: true,
          loginError: "",
          adminToken: testAdminCredentials.token,
          adminUserId: testAdminCredentials.userId,
          identity: fallbackAdmin.identity,
          overview: fallbackAdmin.overview,
          adminUsers: fallbackAdmin.adminUsers,
          platformUsers: fallbackAdmin.platformUsers,
          inventory: fallbackAdmin.inventory,
          contentFiles: fallbackAdmin.contentFiles,
          homepageSections: fallbackAdmin.homepageSections,
          auditLogs: fallbackAdmin.auditLogs,
          activeView: "dashboard",
          loginPassword: "",
          statusMessage: "Signed in with the local test admin profile. Backend fallback mode is active.",
        }));
        return;
      }

      setState((current) => ({
        ...current,
        isLoading: false,
        isAuthenticated: false,
        loginError: error.message,
        statusMessage: "Login failed. Check your username/email and password.",
      }));
    }
  }

  async function refreshDashboard() {
    setState((current) => ({ ...current, isLoading: true }));
    try {
      await loadDashboard(state.apiBaseUrl.trim(), auth);
    } catch (error) {
      setStatus(`Refresh failed. ${error.message}`);
    } finally {
      setState((current) => ({ ...current, isLoading: false }));
    }
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }

    setState((current) => ({
      ...initialState,
      apiBaseUrl: current.apiBaseUrl,
      statusMessage: "You have been logged out.",
    }));
  }

  async function submitMovie(event) {
    event.preventDefault();
    const payload = {
      ...state.movieForm,
      slug: state.movieForm.slug || slugify(state.movieForm.title || ""),
      release_year: state.movieForm.release_year ? Number(state.movieForm.release_year) : null,
      duration_minutes: state.movieForm.duration_minutes ? Number(state.movieForm.duration_minutes) : null,
      genre_slugs: state.movieForm.genre_slugs || [],
    };
    const selectedMovieFiles = !state.movieEditId ? state.selectedMovieFileIds : [];

    try {
      setState((current) => ({
        ...current,
        composerSubmitting: true,
        composerFeedback: "Saving movie...",
        composerFeedbackTone: "neutral",
      }));
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

      resetComposerState({
        statusMessage: state.movieEditId
          ? "Movie updated successfully."
          : selectedMovieFiles.length
            ? "Movie created and selected files attached."
            : "Movie created successfully.",
      });
      await refreshDashboard();
    } catch (error) {
      setState((current) => ({
        ...current,
        composerSubmitting: false,
        composerFeedback: `Movie save failed. ${error.message}`,
        composerFeedbackTone: "danger",
      }));
      setStatus(`Movie save failed. ${error.message}`);
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
      setState((current) => ({
        ...current,
        composerSubmitting: true,
        composerFeedback: "Saving audio...",
        composerFeedbackTone: "neutral",
      }));
      const method = state.audioEditId ? "PATCH" : "POST";
      const path = state.audioEditId ? `/admin/audio/${state.audioEditId}` : "/admin/audio";
      const response = await fetchJson(
        state.apiBaseUrl,
        path,
        { method, body: JSON.stringify(payload) },
        true,
        auth
      );

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

      resetComposerState({
        statusMessage: state.audioEditId
          ? "Audio updated successfully."
          : selectedAudioFiles.length
            ? "Audio created and selected files attached."
            : "Audio created successfully.",
      });
      await refreshDashboard();
    } catch (error) {
      setState((current) => ({
        ...current,
        composerSubmitting: false,
        composerFeedback: `Audio save failed. ${error.message}`,
        composerFeedbackTone: "danger",
      }));
      setStatus(`Audio save failed. ${error.message}`);
    }
  }

  async function submitSeries(event) {
    event.preventDefault();
    const payload = {
      ...state.seriesForm,
      slug: state.seriesForm.slug || slugify(state.seriesForm.title || ""),
      release_year: state.seriesForm.release_year ? Number(state.seriesForm.release_year) : null,
      genre_slugs: state.seriesForm.genre_slugs || [],
    };
    const selectedSeriesFiles = !state.seriesEditId ? state.selectedSeriesFileIds : [];

    try {
      setState((current) => ({
        ...current,
        composerSubmitting: true,
        composerFeedback: "Saving series...",
        composerFeedbackTone: "neutral",
      }));
      const method = state.seriesEditId ? "PATCH" : "POST";
      const path = state.seriesEditId ? `/admin/series/${state.seriesEditId}` : "/admin/series";
      const response = await fetchJson(
        state.apiBaseUrl,
        path,
        { method, body: JSON.stringify(payload) },
        true,
        auth
      );

      for (const contentFileId of selectedSeriesFiles) {
        await fetchJson(
          state.apiBaseUrl,
          `/admin/content-files/${contentFileId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              content_kind: "series",
              content_id: response.data.id,
            }),
          },
          true,
          auth
        );
      }

      resetComposerState({
        statusMessage: state.seriesEditId
          ? "Series updated successfully."
          : selectedSeriesFiles.length
            ? "Series created and selected files attached."
            : "Series created successfully.",
      });
      await refreshDashboard();
    } catch (error) {
      setState((current) => ({
        ...current,
        composerSubmitting: false,
        composerFeedback: `Series save failed. ${error.message}`,
        composerFeedbackTone: "danger",
      }));
      setStatus(`Series save failed. ${error.message}`);
    }
  }

  async function submitFile(event) {
    event.preventDefault();
    const payload = {
      ...state.fileForm,
      points_cost: Number(state.fileForm.points_cost || 0),
    };

    try {
      setState((current) => ({
        ...current,
        composerSubmitting: true,
        composerFeedback: "Saving content file...",
        composerFeedbackTone: "neutral",
      }));
      const method = state.fileEditId ? "PATCH" : "POST";
      const path = state.fileEditId ? `/admin/content-files/${state.fileEditId}` : "/admin/content-files";
      await fetchJson(state.apiBaseUrl, path, { method, body: JSON.stringify(payload) }, true, auth);
      resetComposerState({
        statusMessage: state.fileEditId
          ? "Content file updated successfully."
          : "Content file created successfully.",
      });
      await refreshDashboard();
    } catch (error) {
      setState((current) => ({
        ...current,
        composerSubmitting: false,
        composerFeedback: `Content file save failed. ${error.message}`,
        composerFeedbackTone: "danger",
      }));
      setStatus(`Content file save failed. ${error.message}`);
    }
  }

  async function submitHomepageSection(event) {
    event.preventDefault();
    const payload = {
      title: state.homepageSectionForm.title,
      slug:
        state.homepageSectionForm.slug || slugify(state.homepageSectionForm.title || ""),
      sort_order: Number(state.homepageSectionForm.sort_order || 0),
      is_active: Boolean(state.homepageSectionForm.is_active),
      config: {
        content_type: state.homepageSectionForm.content_type,
        sort: state.homepageSectionForm.sort,
        limit: Number(state.homepageSectionForm.limit || 12),
        language: state.homepageSectionForm.language || null,
        genre: state.homepageSectionForm.genre || null,
        query: state.homepageSectionForm.query || null,
      },
    };

    try {
      setState((current) => ({
        ...current,
        composerSubmitting: true,
        composerFeedback: current.homepageSectionEditId
          ? "Updating homepage carousel..."
          : "Creating homepage carousel...",
        composerFeedbackTone: "neutral",
      }));
      const method = state.homepageSectionEditId ? "PATCH" : "POST";
      const path = state.homepageSectionEditId
        ? `/admin/homepage-sections/${state.homepageSectionEditId}`
        : "/admin/homepage-sections";
      await fetchJson(state.apiBaseUrl, path, { method, body: JSON.stringify(payload) }, true, auth);
      setState((current) => ({
        ...current,
        composerSubmitting: false,
        composerFeedback: "",
        composerFeedbackTone: "neutral",
        homepageSectionForm: initialHomepageSectionForm,
        homepageSectionEditId: null,
        statusMessage: state.homepageSectionEditId
          ? "Homepage carousel updated successfully."
          : "Homepage carousel created successfully.",
      }));
      await refreshDashboard();
    } catch (error) {
      setState((current) => ({
        ...current,
        composerSubmitting: false,
        composerFeedback: `Homepage carousel save failed. ${error.message}`,
        composerFeedbackTone: "danger",
      }));
      setStatus(`Homepage carousel save failed. ${error.message}`);
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
        pointsForm: initialPointsForm,
        statusMessage: "Point adjustment applied.",
      }));
      await refreshDashboard();
    } catch (error) {
      setStatus(`Point adjustment failed. ${error.message}`);
    }
  }

  async function archiveInventoryItem(type, id) {
    try {
      const path =
        type === "movie" ? `/admin/movies/${id}` : type === "series" ? `/admin/series/${id}` : `/admin/audio/${id}`;
      await fetchJson(state.apiBaseUrl, path, { method: "DELETE" }, true, auth);
      setStatus(`${type === "movie" ? "Movie" : type === "series" ? "Series" : "Audio"} archived.`);
      await refreshDashboard();
    } catch (error) {
      setStatus(`Archive failed. ${error.message}`);
    }
  }

  async function deactivateContentFile(id) {
    try {
      await fetchJson(state.apiBaseUrl, `/admin/content-files/${id}`, { method: "DELETE" }, true, auth);
      setStatus("Content file deactivated.");
      await refreshDashboard();
    } catch (error) {
      setStatus(`Content file deactivation failed. ${error.message}`);
    }
  }

  async function updatePlatformUserBanState(userId, isBanned) {
    try {
      await fetchJson(
        state.apiBaseUrl,
        `/admin/platform-users/${userId}`,
        { method: "PATCH", body: JSON.stringify({ is_banned: isBanned }) },
        true,
        auth
      );
      setStatus(isBanned ? "User banned." : "User unbanned.");
      await refreshDashboard();
    } catch (error) {
      setStatus(`User moderation failed. ${error.message}`);
    }
  }

  function permissionPills(user) {
    const permissions = [];
    if (user.can_manage_content) permissions.push("Content");
    if (user.can_manage_users) permissions.push("Users");
    if (user.can_manage_rewards) permissions.push("Rewards");
    if (user.can_view_analytics) permissions.push("Analytics");
    return permissions.length ? permissions : ["Limited"];
  }

  function openComposer(tab = "movie") {
    setState((current) => ({
      ...current,
      showComposer: true,
      activeComposerTab: tab,
      showProfileMenu: false,
    }));
  }

  function startEditHomepageSection(section) {
    setState((current) => ({
      ...current,
      activeView: "contents",
      homepageSectionEditId: section.id,
      homepageSectionForm: {
        title: section.title || "",
        slug: section.slug || "",
        sort_order: section.sort_order ?? 0,
        is_active: section.is_active ?? true,
        content_type: section.config?.content_type || "movie",
        sort: section.config?.sort || "featured",
        limit: section.config?.limit ?? 12,
        language: section.config?.language || "",
        genre: section.config?.genre || "",
        query: section.config?.query || "",
      },
    }));
  }

  function startEditInventory(item) {
    setState((current) => ({
      ...current,
      showComposer: true,
      activeComposerTab:
        item.content_type === "movie" ? "movie" : item.content_type === "series" ? "series" : "audio",
      activeView: "contents",
      movieEditId: item.content_type === "movie" ? item.id : null,
      seriesEditId: item.content_type === "series" ? item.id : null,
      audioEditId: item.content_type === "audio" ? item.id : null,
      fileEditId: null,
      movieForm:
        item.content_type === "movie"
          ? {
              ...initialMovieForm,
              title: item.title || "",
              slug: item.slug || "",
              release_year: item.release_year || "",
              language: item.language || "",
              publication_status: item.state || "draft",
              genre_slugs: item.genre_slugs || [],
            }
          : initialMovieForm,
      seriesForm:
        item.content_type === "series"
          ? {
              ...initialSeriesForm,
              title: item.title || "",
              slug: item.slug || "",
              release_year: item.release_year || "",
              language: item.language || "",
              publication_status: item.state || "draft",
              genre_slugs: item.genre_slugs || [],
            }
          : initialSeriesForm,
      audioForm:
        item.content_type === "audio"
          ? {
              ...initialAudioForm,
              title: item.title || "",
              slug: item.slug || "",
              artist: item.artist || "",
              album: item.album || "",
              language: item.language || "",
              publication_status: item.state || "draft",
            }
          : initialAudioForm,
      selectedMovieFileIds: [],
      selectedSeriesFileIds: [],
      selectedAudioFileIds: [],
      movieFileSearch: "",
      seriesFileSearch: "",
      audioFileSearch: "",
      movieFilePickerOpen: false,
      seriesFilePickerOpen: false,
      audioFilePickerOpen: false,
    }));
  }

  function startEditFile(file) {
    setState((current) => ({
      ...current,
      showComposer: true,
      activeComposerTab: "file",
      activeView: "contents",
      movieEditId: null,
      seriesEditId: null,
      audioEditId: null,
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

  function toggleSeriesContentFile(contentFileId) {
    setState((current) => ({
      ...current,
      selectedSeriesFileIds: current.selectedSeriesFileIds.includes(contentFileId)
        ? current.selectedSeriesFileIds.filter((id) => id !== contentFileId)
        : [...current.selectedSeriesFileIds, contentFileId],
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

  function toggleMovieGenre(genreSlug) {
    setState((current) => ({
      ...current,
      movieForm: {
        ...current.movieForm,
        genre_slugs: current.movieForm.genre_slugs.includes(genreSlug)
          ? current.movieForm.genre_slugs.filter((slug) => slug !== genreSlug)
          : [...current.movieForm.genre_slugs, genreSlug],
      },
    }));
  }

  function toggleSeriesGenre(genreSlug) {
    setState((current) => ({
      ...current,
      seriesForm: {
        ...current.seriesForm,
        genre_slugs: current.seriesForm.genre_slugs.includes(genreSlug)
          ? current.seriesForm.genre_slugs.filter((slug) => slug !== genreSlug)
          : [...current.seriesForm.genre_slugs, genreSlug],
      },
    }));
  }

  function selectedMovieFilesLabel() {
    if (!state.selectedMovieFileIds.length) return "Choose downloadable files";
    if (state.selectedMovieFileIds.length === 1) {
      const selectedFile = contentFiles.find((file) => file.id === state.selectedMovieFileIds[0]);
      return selectedFile?.label || selectedFile?.storage_key || "1 file selected";
    }
    return `${state.selectedMovieFileIds.length} files selected`;
  }

  function selectedAudioFilesLabel() {
    if (!state.selectedAudioFileIds.length) return "Choose downloadable files";
    if (state.selectedAudioFileIds.length === 1) {
      const selectedFile = contentFiles.find((file) => file.id === state.selectedAudioFileIds[0]);
      return selectedFile?.label || selectedFile?.storage_key || "1 file selected";
    }
    return `${state.selectedAudioFileIds.length} files selected`;
  }

  function selectedSeriesFilesLabel() {
    if (!state.selectedSeriesFileIds.length) return "Choose downloadable files";
    if (state.selectedSeriesFileIds.length === 1) {
      const selectedFile = contentFiles.find((file) => file.id === state.selectedSeriesFileIds[0]);
      return selectedFile?.label || selectedFile?.storage_key || "1 file selected";
    }
    return `${state.selectedSeriesFileIds.length} files selected`;
  }

  function renderMovieGenres() {
    const selectedGenres = state.movieForm.genre_slugs || [];

    return (
      <section className="composer-subpanel">
        <div className="panel-intro">
          <p className="eyebrow">Genres</p>
          <h3>Tag this movie for categories and discovery lanes</h3>
        </div>

        {selectedGenres.length ? (
          <div className="selected-chip-row">
            {selectedGenres.map((slug) => {
              const genre = genreOptions.find((item) => item.slug === slug);
              return (
                <button className="selected-chip" key={slug} onClick={() => toggleMovieGenre(slug)} type="button">
                  <span>{genre?.name || slug}</span>
                  <strong>Remove</strong>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="genre-selector-grid">
          {genreOptions.length ? (
            genreOptions.map((genre) => {
              const isSelected = selectedGenres.includes(genre.slug);
              return (
                <button
                  className={`genre-option ${isSelected ? "is-selected" : ""}`}
                  key={genre.id}
                  onClick={() => toggleMovieGenre(genre.slug)}
                  type="button"
                >
                  <span>{genre.name}</span>
                  <strong>{isSelected ? "Selected" : genre.slug}</strong>
                </button>
              );
            })
          ) : (
            <p className="empty-state">No genres are available yet.</p>
          )}
        </div>
      </section>
    );
  }

  function renderSeriesGenres() {
    const selectedGenres = state.seriesForm.genre_slugs || [];

    return (
      <section className="composer-subpanel">
        <div className="panel-intro">
          <p className="eyebrow">Genres</p>
          <h3>Tag this series for categories and discovery lanes</h3>
        </div>

        {selectedGenres.length ? (
          <div className="selected-chip-row">
            {selectedGenres.map((slug) => {
              const genre = genreOptions.find((item) => item.slug === slug);
              return (
                <button className="selected-chip" key={slug} onClick={() => toggleSeriesGenre(slug)} type="button">
                  <span>{genre?.name || slug}</span>
                  <strong>Remove</strong>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="genre-selector-grid">
          {genreOptions.length ? (
            genreOptions.map((genre) => {
              const isSelected = selectedGenres.includes(genre.slug);
              return (
                <button
                  className={`genre-option ${isSelected ? "is-selected" : ""}`}
                  key={genre.id}
                  onClick={() => toggleSeriesGenre(genre.slug)}
                  type="button"
                >
                  <span>{genre.name}</span>
                  <strong>{isSelected ? "Selected" : genre.slug}</strong>
                </button>
              );
            })
          ) : (
            <p className="empty-state">No genres are available yet.</p>
          )}
        </div>
      </section>
    );
  }

  function renderAttachableFiles(kind) {
    const isMovie = kind === "movie";
    const isSeries = kind === "series";
    const searchValue = isMovie
      ? state.movieFileSearch
      : isSeries
        ? state.seriesFileSearch
        : state.audioFileSearch;
    const pickerOpen = isMovie
      ? state.movieFilePickerOpen
      : isSeries
        ? state.seriesFilePickerOpen
        : state.audioFilePickerOpen;
    const selectedIds = isMovie
      ? state.selectedMovieFileIds
      : isSeries
        ? state.selectedSeriesFileIds
        : state.selectedAudioFileIds;
    const files = isMovie
      ? filteredMovieAttachableFiles
      : isSeries
        ? filteredSeriesAttachableFiles
        : filteredAudioAttachableFiles;
    const label = isMovie ? selectedMovieFilesLabel() : isSeries ? selectedSeriesFilesLabel() : selectedAudioFilesLabel();
    const toggleItem = isMovie ? toggleMovieContentFile : isSeries ? toggleSeriesContentFile : toggleAudioContentFile;

    return (
      <section className="composer-subpanel">
        <div className="panel-intro">
          <p className="eyebrow">Downloadable files</p>
          <h3>{isMovie ? "Attach files to this movie" : isSeries ? "Attach files to this series" : "Attach files to this audio item"}</h3>
        </div>
        <div className="file-picker">
          <button
            className="file-picker-trigger"
            onClick={() =>
              setState((current) => ({
                ...current,
                [isMovie ? "movieFilePickerOpen" : isSeries ? "seriesFilePickerOpen" : "audioFilePickerOpen"]: !pickerOpen,
              }))
            }
            type="button"
          >
            <span>{label}</span>
            <strong>{pickerOpen ? "Close" : "Browse"}</strong>
          </button>

          {!!selectedIds.length && (
            <div className="selected-chip-row">
              {selectedIds.map((fileId) => {
                const selectedFile = contentFiles.find((file) => file.id === fileId);
                if (!selectedFile) return null;
                return (
                  <button
                    className="selected-chip"
                    key={fileId}
                    onClick={() => toggleItem(fileId)}
                    type="button"
                  >
                    <span>{selectedFile.label || selectedFile.storage_key}</span>
                    <strong>Remove</strong>
                  </button>
                );
              })}
            </div>
          )}

          {pickerOpen && (
            <div className="file-picker-dropdown">
              <label className="field">
                <span>Search files</span>
                <input
                  placeholder="Search by label, quality, format, or storage key"
                  value={searchValue}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      [isMovie ? "movieFileSearch" : isSeries ? "seriesFileSearch" : "audioFileSearch"]:
                        event.target.value,
                    }))
                  }
                />
              </label>

              <div className="file-picker-options">
                {files.length ? (
                  files.map((file) => (
                    <label className="download-file-card selectable-file-card" key={file.id}>
                      <div className="download-file-head">
                        <strong>{file.label || file.storage_key}</strong>
                        <input
                          checked={selectedIds.includes(file.id)}
                          type="checkbox"
                          onChange={() => toggleItem(file.id)}
                        />
                      </div>
                      <div className="download-file-meta">
                        <span>{file.quality || file.format || "Standard"}</span>
                        <span>{file.points_cost} pts</span>
                        <span>{file.delivery_mode}</span>
                        <span>{file.storage_provider}</span>
                        <span>
                          {file.assignment_state === "attached"
                            ? `Attached to ${file.assignment_label || file.content_kind}`
                            : "Unassigned"}
                        </span>
                      </div>
                      <p className="mono">{file.storage_key}</p>
                    </label>
                  ))
                ) : (
                  <p className="empty-state">
                    {contentFiles.length
                      ? "No content files matched that search."
                      : "No content files are available yet. Add them first."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderDashboardView() {
    return (
      <section className="dashboard-grid">
        <section className="panel wide-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Snapshot</p>
              <h2>Operations at a glance</h2>
            </div>
          </div>
          <section className="metrics-grid">
            <article className="metric-card">
              <span>Published movies</span>
              <strong>{metrics.published_movies}</strong>
            </article>
            <article className="metric-card">
              <span>Published audio</span>
              <strong>{metrics.published_audio}</strong>
            </article>
            <article className="metric-card">
              <span>Download sessions</span>
              <strong>{metrics.download_sessions}</strong>
            </article>
            <article className="metric-card">
              <span>Verified ads</span>
              <strong>{metrics.verified_ad_events}</strong>
            </article>
            <article className="metric-card">
              <span>Total users</span>
              <strong>{metrics.total_users}</strong>
            </article>
          </section>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Team</p>
              <h2>Admin users</h2>
            </div>
          </div>
          <div className="admin-list">
            {adminUsers.map((user) => (
              <article className="admin-row" key={user.user_id}>
                <h3>@{user.telegram_username || "unknown"}</h3>
                <p>{user.role}</p>
                <div className="permission-row">
                  {permissionPills(user).map((permission) => (
                    <span className="permission-pill" key={`${user.user_id}-${permission}`}>
                      {permission}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">State</p>
              <h2>Connection summary</h2>
            </div>
          </div>
          <div className="admin-list">
            <article className="admin-row">
              <h3>{state.fallback ? "Fallback mode" : "Live mode"}</h3>
              <p>{state.fallback ? "Using seeded admin data." : "Connected to the backend API."}</p>
            </article>
            <article className="admin-row">
              <h3>Current operator</h3>
              <p>@{identity.telegram_username || "admin"}</p>
              <p className="mono">{identity.user_id}</p>
            </article>
          </div>
        </section>

        <section className="panel wide-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Recent activity</p>
              <h2>Latest audit events</h2>
            </div>
          </div>
          <div className="audit-list">
            {auditLogs.slice(0, 4).map((log) => (
              <article className="audit-row" key={log.id}>
                <h3>{log.action}</h3>
                <p>
                  {log.entity_type}
                  {log.entity_id ? ` | ${log.entity_id}` : ""}
                </p>
                <p className="mono">
                  {log.actor_user_id || "system"} | {new Date(log.created_at).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        </section>
      </section>
    );
  }

  function renderAnalyticsView() {
    return (
      <section className="dashboard-grid">
        <section className="panel wide-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Analytics</p>
              <h2>Core platform metrics</h2>
            </div>
          </div>
          <section className="metrics-grid">
            <article className="metric-card">
              <span>Published movies</span>
              <strong>{metrics.published_movies}</strong>
            </article>
            <article className="metric-card">
              <span>Published audio</span>
              <strong>{metrics.published_audio}</strong>
            </article>
            <article className="metric-card">
              <span>Download sessions</span>
              <strong>{metrics.download_sessions}</strong>
            </article>
            <article className="metric-card">
              <span>Verified ads</span>
              <strong>{metrics.verified_ad_events}</strong>
            </article>
            <article className="metric-card">
              <span>Total users</span>
              <strong>{metrics.total_users}</strong>
            </article>
          </section>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Interpretation</p>
              <h2>What this means</h2>
            </div>
          </div>
          <div className="admin-list">
            <article className="admin-row">
              <h3>Catalog health</h3>
              <p>Published counts show how much active inventory is visible to users.</p>
            </article>
            <article className="admin-row">
              <h3>Reward activity</h3>
              <p>Verified ads indicate successful unlock completions, not just impressions.</p>
            </article>
            <article className="admin-row">
              <h3>Demand pulse</h3>
              <p>Download sessions reflect current user interest in movies and audio files.</p>
            </article>
          </div>
        </section>

        <section className="panel wide-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Audit</p>
              <h2>Analytics-linked activity trail</h2>
            </div>
          </div>
          <div className="audit-list">
            {auditLogs.map((log) => (
              <article className="audit-row" key={log.id}>
                <h3>{log.action}</h3>
                <p>
                  {log.entity_type}
                  {log.entity_id ? ` | ${log.entity_id}` : ""}
                </p>
                <p className="mono">
                  {log.actor_user_id || "system"} | {new Date(log.created_at).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        </section>
      </section>
    );
  }

  function renderContentsView() {
    return (
      <section className="dashboard-grid">
        <section className="panel wide-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Content</p>
              <h2>Published inventory</h2>
            </div>
            <div className="panel-controls">
              <label className="field inline-field">
                <span>Filter</span>
                <select
                  value={state.inventoryType}
                  onChange={(event) =>
                    setState((current) => ({ ...current, inventoryType: event.target.value }))
                  }
                >
                  <option value="all">All</option>
                  <option value="movie">Movies</option>
                  <option value="series">Series</option>
                  <option value="audio">Audio</option>
                </select>
              </label>
              <label className="field inline-field search-inline">
                <span>Search</span>
                <input
                  placeholder="Title or slug"
                  value={state.inventoryQuery}
                  onChange={(event) =>
                    setState((current) => ({ ...current, inventoryQuery: event.target.value }))
                  }
                />
              </label>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Slug</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {normalizedInventory.map((item) => (
                  <tr key={`${item.content_type}-${item.id}`}>
                    <td>{item.title}</td>
                    <td>{item.content_type}</td>
                    <td>{item.state}</td>
                    <td className="mono">{item.slug}</td>
                    <td className="action-cell">
                      <button className="mini-button" onClick={() => startEditInventory(item)} type="button">
                        Edit
                      </button>
                      <button
                        className="mini-button is-danger"
                        onClick={() => archiveInventoryItem(item.content_type, item.id)}
                        type="button"
                      >
                        Archive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel wide-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Files</p>
              <h2>Downloadable assets</h2>
            </div>
            <button className="secondary-button" onClick={() => openComposer("file")} type="button">
              Add content file
            </button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Kind</th>
                  <th>Quality</th>
                  <th>Assignment</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {contentFiles.map((file) => (
                  <tr key={file.id}>
                    <td>{file.label || file.storage_key}</td>
                    <td>{file.content_kind}</td>
                    <td>{file.quality || file.format || "Standard"}</td>
                    <td>{file.assignment_state === "attached" ? file.assignment_label || "Attached" : "Unassigned"}</td>
                    <td className="action-cell">
                      <button className="mini-button" onClick={() => startEditFile(file)} type="button">
                        Edit
                      </button>
                      <button
                        className="mini-button is-danger"
                        onClick={() => deactivateContentFile(file.id)}
                        type="button"
                      >
                        Disable
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel wide-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Homepage</p>
              <h2>Editable category carousels</h2>
            </div>
          </div>

          <div className="homepage-sections-layout">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Rule</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {homepageSections.map((section) => (
                    <tr key={section.id}>
                      <td>{section.title}</td>
                      <td>{section.config?.content_type || "movie"}</td>
                      <td className="mono">
                        {section.config?.query
                          ? `search:${section.config.query}`
                          : `${section.config?.sort || "latest"} | ${section.config?.language || "all"}`}
                      </td>
                      <td>{section.is_active ? "Active" : "Hidden"}</td>
                      <td className="action-cell">
                        <button
                          className="mini-button"
                          onClick={() => startEditHomepageSection(section)}
                          type="button"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form className="editor-form homepage-editor-form" onSubmit={submitHomepageSection}>
              <div className="panel-intro">
                <p className="eyebrow">Carousel editor</p>
                <h3>
                  {state.homepageSectionEditId ? "Update homepage row" : "Create homepage row"}
                </h3>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>Title</span>
                  <input
                    required
                    value={state.homepageSectionForm.title}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        homepageSectionForm: {
                          ...current.homepageSectionForm,
                          title: event.target.value,
                        },
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Slug</span>
                  <input
                    value={state.homepageSectionForm.slug}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        homepageSectionForm: {
                          ...current.homepageSectionForm,
                          slug: event.target.value,
                        },
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Content type</span>
                  <select
                    value={state.homepageSectionForm.content_type}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        homepageSectionForm: {
                          ...current.homepageSectionForm,
                          content_type: event.target.value,
                        },
                      }))
                    }
                  >
                    <option value="movie">Movie</option>
                    <option value="series">Series</option>
                    <option value="audio">Audio</option>
                  </select>
                </label>
                <label className="field">
                  <span>Sort</span>
                  <select
                    value={state.homepageSectionForm.sort}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        homepageSectionForm: {
                          ...current.homepageSectionForm,
                          sort: event.target.value,
                        },
                      }))
                    }
                  >
                    <option value="featured">Featured</option>
                    <option value="latest">Latest</option>
                    <option value="popular">Popular</option>
                    <option value="title">Title</option>
                  </select>
                </label>
                <label className="field">
                  <span>Limit</span>
                  <input
                    min="1"
                    type="number"
                    value={state.homepageSectionForm.limit}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        homepageSectionForm: {
                          ...current.homepageSectionForm,
                          limit: event.target.value,
                        },
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Sort order</span>
                  <input
                    type="number"
                    value={state.homepageSectionForm.sort_order}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        homepageSectionForm: {
                          ...current.homepageSectionForm,
                          sort_order: event.target.value,
                        },
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Language</span>
                  <input
                    placeholder="eg ko"
                    value={state.homepageSectionForm.language}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        homepageSectionForm: {
                          ...current.homepageSectionForm,
                          language: event.target.value,
                        },
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Genre</span>
                  <input
                    placeholder="optional genre slug"
                    value={state.homepageSectionForm.genre}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        homepageSectionForm: {
                          ...current.homepageSectionForm,
                          genre: event.target.value,
                        },
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Search rule</span>
                  <input
                    placeholder="optional query like kdrama"
                    value={state.homepageSectionForm.query}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        homepageSectionForm: {
                          ...current.homepageSectionForm,
                          query: event.target.value,
                        },
                      }))
                    }
                  />
                </label>
                <label className="field toggle-field">
                  <span>Active</span>
                  <input
                    checked={state.homepageSectionForm.is_active}
                    type="checkbox"
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        homepageSectionForm: {
                          ...current.homepageSectionForm,
                          is_active: event.target.checked,
                        },
                      }))
                    }
                  />
                </label>
              </div>
              <div className="form-actions">
                <button className="primary-button" disabled={state.composerSubmitting} type="submit">
                  {state.composerSubmitting
                    ? "Saving..."
                    : state.homepageSectionEditId
                      ? "Update carousel"
                      : "Create carousel"}
                </button>
                <button
                  className="secondary-button"
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      homepageSectionForm: initialHomepageSectionForm,
                      homepageSectionEditId: null,
                      composerFeedback: "",
                      composerFeedbackTone: "neutral",
                    }))
                  }
                  type="button"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </section>
      </section>
    );
  }

  function renderUsersView() {
    return (
      <section className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Team</p>
              <h2>Admin users</h2>
            </div>
          </div>
          <div className="admin-list">
            {adminUsers.map((user) => (
              <article className="admin-row" key={user.user_id}>
                <h3>@{user.telegram_username || "unknown"}</h3>
                <p>{user.role}</p>
                <div className="permission-row">
                  {permissionPills(user).map((permission) => (
                    <span className="permission-pill" key={`${user.user_id}-${permission}`}>
                      {permission}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Users</p>
              <h2>Moderation and points</h2>
            </div>
          </div>
          <div className="user-stack">
            {platformUsers.map((user) => (
              <article className="admin-row" key={user.user_id}>
                <h3>@{user.telegram_username || "unknown"}</h3>
                <p>{user.points_balance} points</p>
                <div className="badge-row">
                  <span className={`badge ${user.is_banned ? "is-danger" : "is-muted"}`}>
                    {user.is_banned ? "Banned" : "Active"}
                  </span>
                </div>
                <div className="action-row">
                  <button
                    className="mini-button"
                    onClick={() => updatePlatformUserBanState(user.user_id, !user.is_banned)}
                    type="button"
                  >
                    {user.is_banned ? "Unban" : "Ban"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel wide-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Rewards</p>
              <h2>Manual point adjustment</h2>
            </div>
          </div>
          <form className="compact-form" onSubmit={submitPointsAdjustment}>
            <div className="form-grid">
              <label className="field">
                <span>User id</span>
                <input
                  required
                  value={state.pointsForm.user_id}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      pointsForm: { ...current.pointsForm, user_id: event.target.value },
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Amount</span>
                <input
                  required
                  type="number"
                  value={state.pointsForm.amount}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      pointsForm: { ...current.pointsForm, amount: event.target.value },
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Reason</span>
                <input
                  required
                  value={state.pointsForm.reason}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      pointsForm: { ...current.pointsForm, reason: event.target.value },
                    }))
                  }
                />
              </label>
            </div>
            <button className="primary-button" type="submit">
              Apply points
            </button>
          </form>
        </section>
      </section>
    );
  }

  function renderSettingsView() {
    return (
      <section className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Session</p>
              <h2>Connection settings</h2>
            </div>
          </div>
          <div className="admin-list">
            <article className="admin-row">
              <h3>API base URL</h3>
              <p className="mono">{state.apiBaseUrl}</p>
            </article>
            <article className="admin-row">
              <h3>Admin user id</h3>
              <p className="mono">{state.adminUserId}</p>
            </article>
            <article className="admin-row">
              <h3>Mode</h3>
              <p>{state.fallback ? "Fallback demo mode" : "Live backend mode"}</p>
            </article>
            <article className="admin-row">
              <h3>Session persistence</h3>
              <p>Your admin session now survives page refreshes on this browser.</p>
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Permissions</p>
              <h2>Current operator scope</h2>
            </div>
          </div>
          <div className="permission-row">
            {permissionPills(identity).map((permission) => (
              <span className="permission-pill" key={permission}>
                {permission}
              </span>
            ))}
          </div>
        </section>

        <section className="panel wide-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Operator actions</p>
              <h2>Session controls</h2>
            </div>
          </div>
          <div className="action-row">
            <button className="secondary-button" onClick={refreshDashboard} type="button">
              Refresh admin data
            </button>
            <button
              className="secondary-button"
              onClick={() => setState((current) => ({ ...current, activeView: "contents" }))}
              type="button"
            >
              Go to contents
            </button>
            <button className="primary-button" onClick={handleLogout} type="button">
              Logout now
            </button>
          </div>
        </section>
      </section>
    );
  }

  function renderProfileView() {
    return (
      <section className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Profile</p>
              <h2>Admin identity</h2>
            </div>
          </div>
          <div className="admin-list">
            <article className="admin-row">
              <h3>Username</h3>
              <p>@{identity.telegram_username || "admin"}</p>
            </article>
            <article className="admin-row">
              <h3>Role</h3>
              <p>{identity.role}</p>
            </article>
            <article className="admin-row">
              <h3>User id</h3>
              <p className="mono">{identity.user_id}</p>
            </article>
            <article className="admin-row">
              <h3>Telegram id</h3>
              <p className="mono">{identity.telegram_user_id || "Not linked"}</p>
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Access</p>
              <h2>Permission breakdown</h2>
            </div>
          </div>
          <div className="permission-row">
            {permissionPills(identity).map((permission) => (
              <span className="permission-pill" key={permission}>
                {permission}
              </span>
            ))}
          </div>
        </section>

        <section className="panel wide-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Operator summary</p>
              <h2>How this account is being used</h2>
            </div>
          </div>
          <div className="admin-list">
            <article className="admin-row">
              <h3>Current mode</h3>
              <p>{state.fallback ? "Fallback demo session" : "Live backend session"}</p>
            </article>
            <article className="admin-row">
              <h3>Preferred login</h3>
              <p>Username or email with password, then the app stores the session locally.</p>
            </article>
            <article className="admin-row">
              <h3>Best next action</h3>
              <p>Use the `Add` button or jump to `Contents` to manage titles and downloadable files.</p>
            </article>
          </div>
        </section>
      </section>
    );
  }

  function renderActiveView() {
    switch (state.activeView) {
      case "analytics":
        return renderAnalyticsView();
      case "contents":
        return renderContentsView();
      case "users":
        return renderUsersView();
      case "settings":
        return renderSettingsView();
      case "profile":
        return renderProfileView();
      default:
        return renderDashboardView();
    }
  }

  if (!state.isAuthenticated) {
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <div className="auth-brand">
            <p className="eyebrow">Admin access</p>
            <h1>IMB Admin Station</h1>
            <p className="auth-copy">
              Sign in with the current admin login flow so we can open the operator dashboard.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <label className="field">
              <span>Username or email</span>
              <input
                required
                value={state.loginIdentifier}
                onChange={(event) =>
                  setState((current) => ({ ...current, loginIdentifier: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                required
                type="password"
                value={state.loginPassword}
                onChange={(event) =>
                  setState((current) => ({ ...current, loginPassword: event.target.value }))
                }
              />
            </label>

            <div className="auth-footer">
              <button className="primary-button auth-submit" disabled={state.isLoading} type="submit">
                {state.isLoading ? "Signing in..." : "Login"}
              </button>
              <p className="status-message">{state.statusMessage}</p>
              <p className="status-message">
                Test login: <span className="mono">imb_admin</span> / <span className="mono">admin12345</span>
              </p>
              {state.loginError ? <p className="error-message">{state.loginError}</p> : null}
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div className="topbar-side topbar-side-left">
          <button className="menu-trigger" type="button" aria-label="Open menu">
            <span />
            <span />
            <span />
          </button>
          <span className="topbar-divider" />
          <div className="brand-lockup">
            <div className="brand-mark">IMB</div>
            <div>
              <p className="eyebrow">Admin</p>
              <strong>Control Room</strong>
            </div>
          </div>
        </div>

        <nav className="topbar-nav" aria-label="Primary">
          {topNavItems.map(([value, label]) => (
            <button
              className={`topbar-link ${state.activeView === value ? "is-active" : ""}`}
              key={value}
              onClick={() => setState((current) => ({ ...current, activeView: value, showProfileMenu: false }))}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="topbar-side topbar-side-right">
          <button
            className="profile-button"
            onClick={() =>
              setState((current) => ({ ...current, showProfileMenu: !current.showProfileMenu }))
            }
            type="button"
          >
            <span className="profile-avatar">
              {(identity.telegram_username || "A").slice(0, 1).toUpperCase()}
            </span>
            <span className="profile-text">@{identity.telegram_username || "admin"}</span>
            <span className="profile-caret">▾</span>
          </button>

          {state.showProfileMenu && (
            <div className="profile-menu">
              {profileMenuItems.map(([value, label]) => (
                <button
                  key={value}
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      activeView: value,
                      showProfileMenu: false,
                    }))
                  }
                  type="button"
                >
                  {label}
                </button>
              ))}
              <button onClick={handleLogout} type="button">
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-intro">
          <div>
            <p className="eyebrow">{state.activeView}</p>
            <h1>Hi {identity.telegram_username || "Admin"}</h1>
            <p className="status-message">{dashboardSubtitle(state.activeView)}</p>
            <p className="status-message">{state.statusMessage}</p>
          </div>
          <div className="intro-actions">
            <button className="secondary-button" onClick={refreshDashboard} type="button">
              {state.isLoading ? "Refreshing..." : "Refresh"}
            </button>
            <button className="primary-button" onClick={() => openComposer("movie")} type="button">
              Add
            </button>
          </div>
        </section>

        {renderActiveView()}
      </main>

      {state.showComposer && (
        <div className="modal-overlay" onClick={() => resetComposerState()}>
          <section className="composer-modal" onClick={(event) => event.stopPropagation()}>
            <div className="composer-head">
              <div>
                <p className="eyebrow">Create content</p>
                <h2>
                  {state.movieEditId || state.seriesEditId || state.audioEditId || state.fileEditId
                    ? "Edit item"
                    : "Add new item"}
                </h2>
              </div>
              <button className="close-button" onClick={() => resetComposerState()} type="button">
                Close
              </button>
            </div>

            <div className="composer-tabs">
              {[
                ["movie", "Movie"],
                ["series", "Series"],
                ["audio", "Audio"],
                ["file", "Content file"],
              ].map(([value, label]) => (
                <button
                  className={`composer-tab ${state.activeComposerTab === value ? "is-active" : ""}`}
                  key={value}
                  onClick={() => setState((current) => ({ ...current, activeComposerTab: value }))}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="composer-body">
              {state.composerFeedback ? (
                <div className={`composer-feedback is-${state.composerFeedbackTone}`}>
                  {state.composerFeedback}
                </div>
              ) : null}

              {state.activeComposerTab === "movie" && (
                <form className="editor-form" onSubmit={submitMovie}>
                  <div className="form-grid">
                    <label className="field">
                      <span>Title</span>
                      <input
                        required
                        value={state.movieForm.title}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            movieForm: { ...current.movieForm, title: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Slug</span>
                      <input
                        value={state.movieForm.slug}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            movieForm: { ...current.movieForm, slug: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Year</span>
                      <input
                        type="number"
                        value={state.movieForm.release_year}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            movieForm: { ...current.movieForm, release_year: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Language</span>
                      <input
                        value={state.movieForm.language}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            movieForm: { ...current.movieForm, language: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Status</span>
                      <select
                        value={state.movieForm.publication_status}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            movieForm: { ...current.movieForm, publication_status: event.target.value },
                          }))
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Duration</span>
                      <input
                        type="number"
                        value={state.movieForm.duration_minutes}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            movieForm: { ...current.movieForm, duration_minutes: event.target.value },
                          }))
                        }
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>Synopsis</span>
                    <textarea
                      rows="4"
                      value={state.movieForm.synopsis}
                      onChange={(event) =>
                        setState((current) => ({
                          ...current,
                          movieForm: { ...current.movieForm, synopsis: event.target.value },
                        }))
                      }
                    />
                  </label>
                  {renderMovieGenres()}
                  {!state.movieEditId ? renderAttachableFiles("movie") : null}
                  <div className="form-actions">
                    <button className="primary-button" disabled={state.composerSubmitting} type="submit">
                      {state.composerSubmitting ? "Saving..." : "Save movie"}
                    </button>
                  </div>
                </form>
              )}

              {state.activeComposerTab === "series" && (
                <form className="editor-form" onSubmit={submitSeries}>
                  <div className="form-grid">
                    <label className="field">
                      <span>Title</span>
                      <input
                        required
                        value={state.seriesForm.title}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            seriesForm: { ...current.seriesForm, title: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Slug</span>
                      <input
                        value={state.seriesForm.slug}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            seriesForm: { ...current.seriesForm, slug: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Year</span>
                      <input
                        type="number"
                        value={state.seriesForm.release_year}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            seriesForm: { ...current.seriesForm, release_year: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Language</span>
                      <input
                        value={state.seriesForm.language}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            seriesForm: { ...current.seriesForm, language: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Status</span>
                      <select
                        value={state.seriesForm.publication_status}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            seriesForm: { ...current.seriesForm, publication_status: event.target.value },
                          }))
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </label>
                  </div>
                  <label className="field">
                    <span>Synopsis</span>
                    <textarea
                      rows="4"
                      value={state.seriesForm.synopsis}
                      onChange={(event) =>
                        setState((current) => ({
                          ...current,
                          seriesForm: { ...current.seriesForm, synopsis: event.target.value },
                        }))
                      }
                    />
                  </label>
                  {renderSeriesGenres()}
                  {!state.seriesEditId ? renderAttachableFiles("series") : null}
                  <div className="form-actions">
                    <button className="primary-button" disabled={state.composerSubmitting} type="submit">
                      {state.composerSubmitting ? "Saving..." : "Save series"}
                    </button>
                  </div>
                </form>
              )}

              {state.activeComposerTab === "audio" && (
                <form className="editor-form" onSubmit={submitAudio}>
                  <div className="form-grid">
                    <label className="field">
                      <span>Title</span>
                      <input
                        required
                        value={state.audioForm.title}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            audioForm: { ...current.audioForm, title: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Slug</span>
                      <input
                        value={state.audioForm.slug}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            audioForm: { ...current.audioForm, slug: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Artist</span>
                      <input
                        value={state.audioForm.artist}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            audioForm: { ...current.audioForm, artist: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Album</span>
                      <input
                        value={state.audioForm.album}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            audioForm: { ...current.audioForm, album: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Language</span>
                      <input
                        value={state.audioForm.language}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            audioForm: { ...current.audioForm, language: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Status</span>
                      <select
                        value={state.audioForm.publication_status}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            audioForm: { ...current.audioForm, publication_status: event.target.value },
                          }))
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </label>
                  </div>
                  <label className="field">
                    <span>Synopsis</span>
                    <textarea
                      rows="4"
                      value={state.audioForm.synopsis}
                      onChange={(event) =>
                        setState((current) => ({
                          ...current,
                          audioForm: { ...current.audioForm, synopsis: event.target.value },
                        }))
                      }
                    />
                  </label>
                  {!state.audioEditId ? renderAttachableFiles("audio") : null}
                  <div className="form-actions">
                    <button className="primary-button" disabled={state.composerSubmitting} type="submit">
                      {state.composerSubmitting ? "Saving..." : "Save audio"}
                    </button>
                  </div>
                </form>
              )}

              {state.activeComposerTab === "file" && (
                <form className="editor-form" onSubmit={submitFile}>
                  <div className="form-grid">
                    <label className="field">
                      <span>Content kind</span>
                      <select
                        value={state.fileForm.content_kind}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            fileForm: { ...current.fileForm, content_kind: event.target.value },
                          }))
                        }
                      >
                        <option value="movie">Movie</option>
                        <option value="audio">Audio</option>
                        <option value="series">Series</option>
                        <option value="episode">Episode</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Content UUID</span>
                      <input
                        required
                        value={state.fileForm.content_id}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            fileForm: { ...current.fileForm, content_id: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Label</span>
                      <input
                        value={state.fileForm.label}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            fileForm: { ...current.fileForm, label: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Quality</span>
                      <input
                        value={state.fileForm.quality}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            fileForm: { ...current.fileForm, quality: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Format</span>
                      <input
                        value={state.fileForm.format}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            fileForm: { ...current.fileForm, format: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Storage provider</span>
                      <select
                        value={state.fileForm.storage_provider}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            fileForm: { ...current.fileForm, storage_provider: event.target.value },
                          }))
                        }
                      >
                        <option value="r2">r2</option>
                        <option value="b2">b2</option>
                        <option value="s3">s3</option>
                        <option value="other">other</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Storage key</span>
                      <input
                        required
                        value={state.fileForm.storage_key}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            fileForm: { ...current.fileForm, storage_key: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Points cost</span>
                      <input
                        type="number"
                        value={state.fileForm.points_cost}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            fileForm: { ...current.fileForm, points_cost: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Delivery mode</span>
                      <select
                        value={state.fileForm.delivery_mode}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            fileForm: { ...current.fileForm, delivery_mode: event.target.value },
                          }))
                        }
                      >
                        <option value="telegram_bot">telegram_bot</option>
                        <option value="telegram_channel">telegram_channel</option>
                        <option value="external_link">external_link</option>
                      </select>
                    </label>
                    <label className="field toggle-field">
                      <span>Requires ad</span>
                      <input
                        checked={state.fileForm.requires_ad}
                        type="checkbox"
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            fileForm: { ...current.fileForm, requires_ad: event.target.checked },
                          }))
                        }
                      />
                    </label>
                  </div>
                  <div className="form-actions">
                    <button className="primary-button" disabled={state.composerSubmitting} type="submit">
                      {state.composerSubmitting ? "Saving..." : "Save content file"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
