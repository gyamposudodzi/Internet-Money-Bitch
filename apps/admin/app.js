const storageKeys = {
  apiBaseUrl: "imb_admin_api_base_url",
  adminToken: "imb_admin_token",
  adminUserId: "imb_admin_user_id",
};

const state = {
  apiBaseUrl: localStorage.getItem(storageKeys.apiBaseUrl) || "http://localhost:8000/api/v1",
  adminToken: localStorage.getItem(storageKeys.adminToken) || "",
  adminUserId:
    localStorage.getItem(storageKeys.adminUserId) || "11111111-1111-1111-1111-111111111111",
  mode: "booting",
  fallback: false,
  identity: null,
  overview: null,
  adminUsers: [],
  inventory: [],
};

const fallbackData = {
  identity: {
    user_id: "11111111-1111-1111-1111-111111111111",
    telegram_user_id: 900000001,
    telegram_username: "imb_admin",
    role: "admin",
    can_manage_content: true,
    can_manage_users: true,
    can_manage_rewards: true,
    can_view_analytics: true,
  },
  overview: {
    published_movies: 1,
    published_audio: 1,
    download_sessions: 12,
    verified_ad_events: 7,
    total_users: 2,
  },
  adminUsers: [
    {
      user_id: "11111111-1111-1111-1111-111111111111",
      telegram_username: "imb_admin",
      role: "admin",
      can_manage_content: true,
      can_manage_users: true,
      can_manage_rewards: true,
      can_view_analytics: true,
    },
  ],
  inventory: [
    {
      title: "Heatline",
      content_type: "movie",
      release_year: 2026,
      slug: "heatline",
      state: "published",
    },
    {
      title: "Night Drive",
      content_type: "audio",
      release_year: null,
      slug: "night-drive",
      state: "published",
    },
  ],
};

const el = {
  apiBaseUrl: document.querySelector("#apiBaseUrl"),
  adminToken: document.querySelector("#adminToken"),
  adminUserId: document.querySelector("#adminUserId"),
  connectButton: document.querySelector("#connectButton"),
  refreshButton: document.querySelector("#refreshButton"),
  modeLabel: document.querySelector("#modeLabel"),
  statusMessage: document.querySelector("#statusMessage"),
  overviewTimestamp: document.querySelector("#overviewTimestamp"),
  metricsGrid: document.querySelector("#metricsGrid"),
  identityCard: document.querySelector("#identityCard"),
  adminUsersList: document.querySelector("#adminUsersList"),
  inventorySearch: document.querySelector("#inventorySearch"),
  inventoryType: document.querySelector("#inventoryType"),
  inventoryTable: document.querySelector("#inventoryTable"),
};

function syncInputs() {
  el.apiBaseUrl.value = state.apiBaseUrl;
  el.adminToken.value = state.adminToken;
  el.adminUserId.value = state.adminUserId;
}

function persistSettings() {
  localStorage.setItem(storageKeys.apiBaseUrl, state.apiBaseUrl);
  localStorage.setItem(storageKeys.adminToken, state.adminToken);
  localStorage.setItem(storageKeys.adminUserId, state.adminUserId);
}

async function fetchJson(path, options = {}, admin = false) {
  const headers = {
    "Content-Type": "application/json",
    "X-Client-Platform": "web",
    "X-App-Version": "0.1.0",
    ...(options.headers || {}),
  };

  if (admin) {
    headers.Authorization = `Bearer ${state.adminToken}`;
    headers["X-Admin-User-Id"] = state.adminUserId;
  }

  const response = await fetch(`${state.apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.error?.message || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

function setMode(mode, message) {
  state.mode = mode;
  el.modeLabel.textContent = mode === "fallback" ? "Fallback mode" : mode === "live" ? "Live API" : "Booting";
  el.statusMessage.textContent = message;
}

function metricTiles() {
  const overview = state.overview || fallbackData.overview;
  return [
    { label: "Published movies", value: overview.published_movies },
    { label: "Published audio", value: overview.published_audio },
    { label: "Download sessions", value: overview.download_sessions },
    { label: "Verified ads", value: overview.verified_ad_events },
    { label: "Total users", value: overview.total_users },
  ];
}

function renderMetrics() {
  el.metricsGrid.innerHTML = "";
  metricTiles().forEach((metric) => {
    const tile = document.createElement("article");
    tile.className = "metric-tile";
    tile.innerHTML = `
      <span>${metric.label}</span>
      <strong>${metric.value}</strong>
    `;
    el.metricsGrid.appendChild(tile);
  });
  el.overviewTimestamp.textContent = `Updated ${new Date().toLocaleString()}`;
}

function permissionPills(user) {
  const permissions = [];
  if (user.can_manage_content) permissions.push("Content");
  if (user.can_manage_users) permissions.push("Users");
  if (user.can_manage_rewards) permissions.push("Rewards");
  if (user.can_view_analytics) permissions.push("Analytics");
  return permissions.length ? permissions : ["Limited"];
}

function renderIdentity() {
  const identity = state.identity || fallbackData.identity;
  el.identityCard.innerHTML = `
    <div class="identity-panel">
      <h3>${identity.telegram_username || "Unknown admin"}</h3>
      <p class="mono">${identity.user_id}</p>
      <div class="badge-row">
        <span class="badge">${identity.role}</span>
        <span class="badge is-muted">${identity.telegram_user_id || "No Telegram ID"}</span>
      </div>
      <div class="permission-row">
        ${permissionPills(identity)
          .map((permission) => `<span class="permission-pill">${permission}</span>`)
          .join("")}
      </div>
    </div>
  `;
}

function renderAdminUsers() {
  const users = state.adminUsers.length ? state.adminUsers : fallbackData.adminUsers;
  el.adminUsersList.innerHTML = "";
  users.forEach((user) => {
    const row = document.createElement("article");
    row.className = "admin-row";
    row.innerHTML = `
      <h3>${user.telegram_username || "Unnamed admin"}</h3>
      <p class="mono">${user.user_id}</p>
      <div class="permission-row">
        ${permissionPills(user)
          .map((permission) => `<span class="permission-pill">${permission}</span>`)
          .join("")}
      </div>
    `;
    el.adminUsersList.appendChild(row);
  });
}

function normalizedInventory() {
  const source = state.inventory.length ? state.inventory : fallbackData.inventory;
  const query = el.inventorySearch.value.trim().toLowerCase();
  const type = el.inventoryType.value;

  return source.filter((item) => {
    const matchesQuery =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.slug.toLowerCase().includes(query);
    const matchesType = type === "all" || item.content_type === type;
    return matchesQuery && matchesType;
  });
}

function renderInventory() {
  const rows = normalizedInventory();
  el.inventoryTable.innerHTML = "";

  if (!rows.length) {
    el.inventoryTable.innerHTML = `<tr><td colspan="5" class="empty-state">No inventory matches that filter.</td></tr>`;
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.title}</td>
      <td><span class="badge is-muted">${item.content_type}</span></td>
      <td>${item.release_year || "Audio"}</td>
      <td class="mono">${item.slug}</td>
      <td><span class="badge">${item.state || "published"}</span></td>
    `;
    el.inventoryTable.appendChild(row);
  });
}

async function loadInventory() {
  try {
    const [moviesResponse, audioResponse] = await Promise.all([
      fetchJson("/movies"),
      fetchJson("/audio"),
    ]);

    const movies = (moviesResponse.data || []).map((item) => ({
      title: item.title,
      content_type: "movie",
      release_year: item.release_year,
      slug: item.slug,
      state: "published",
    }));
    const audio = (audioResponse.data || []).map((item) => ({
      title: item.title,
      content_type: "audio",
      release_year: item.release_year,
      slug: item.slug,
      state: "published",
    }));

    state.inventory = [...movies, ...audio];
  } catch (error) {
    console.warn("Inventory fallback engaged.", error);
    state.inventory = fallbackData.inventory;
  }
}

async function loadDashboard() {
  state.apiBaseUrl = el.apiBaseUrl.value.trim();
  state.adminToken = el.adminToken.value.trim();
  state.adminUserId = el.adminUserId.value.trim();
  persistSettings();

  try {
    const [identityResponse, overviewResponse, adminUsersResponse] = await Promise.all([
      fetchJson("/admin/auth/me", {}, true),
      fetchJson("/admin/analytics/overview", {}, true),
      fetchJson("/admin/users", {}, true),
    ]);

    state.identity = identityResponse.data;
    state.overview = overviewResponse.data;
    state.adminUsers = adminUsersResponse.data || [];
    state.fallback = false;
    setMode("live", "Connected to protected admin endpoints.");
  } catch (error) {
    state.identity = fallbackData.identity;
    state.overview = fallbackData.overview;
    state.adminUsers = fallbackData.adminUsers;
    state.fallback = true;
    setMode("fallback", `Using seeded demo data. ${error.message}`);
  }

  await loadInventory();
  renderMetrics();
  renderIdentity();
  renderAdminUsers();
  renderInventory();
}

function attachEvents() {
  el.connectButton.addEventListener("click", loadDashboard);
  el.refreshButton.addEventListener("click", loadDashboard);
  el.inventorySearch.addEventListener("input", renderInventory);
  el.inventoryType.addEventListener("change", renderInventory);
}

syncInputs();
attachEvents();
loadDashboard();
