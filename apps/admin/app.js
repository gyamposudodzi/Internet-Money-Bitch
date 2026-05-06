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
  activeScreen: "overviewScreen",
  identity: null,
  overview: null,
  adminUsers: [],
  platformUsers: [],
  inventory: [],
  contentFiles: [],
  auditLogs: [],
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
  platformUsers: [
    {
      user_id: "22222222-2222-2222-2222-222222222222",
      telegram_user_id: 900000002,
      telegram_username: "moviefan",
      role: "user",
      points_balance: 14,
      is_banned: false,
      last_seen_at: "2026-05-06T10:00:00+00:00",
    },
  ],
  inventory: [
    {
      id: "44444444-4444-4444-4444-444444444441",
      title: "Heatline",
      content_type: "movie",
      release_year: 2026,
      slug: "heatline",
      state: "published",
    },
    {
      id: "55555555-5555-5555-5555-555555555551",
      title: "Night Drive",
      content_type: "audio",
      release_year: null,
      slug: "night-drive",
      state: "published",
    },
  ],
  contentFiles: [
    {
      id: "66666666-6666-6666-6666-666666666662",
      content_kind: "movie",
      content_id: "44444444-4444-4444-4444-444444444441",
      label: "Heatline 1080p",
      quality: "1080p",
      format: "mp4",
      storage_key: "heatline/heatline-1080p.mp4",
      points_cost: 15,
      delivery_mode: "telegram_bot",
      storage_provider: "r2",
      requires_ad: true,
      is_active: true,
    },
  ],
  auditLogs: [
    {
      id: "dddd1111-1111-1111-1111-111111111111",
      actor_user_id: "11111111-1111-1111-1111-111111111111",
      action: "points.adjusted",
      entity_type: "user",
      entity_id: "22222222-2222-2222-2222-222222222222",
      metadata: { amount: 5, reason: "manual bonus" },
      created_at: "2026-05-06T10:05:00+00:00",
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
  platformUsersTable: document.querySelector("#platformUsersTable"),
  inventorySearch: document.querySelector("#inventorySearch"),
  inventoryType: document.querySelector("#inventoryType"),
  inventoryTable: document.querySelector("#inventoryTable"),
  contentFilesTable: document.querySelector("#contentFilesTable"),
  auditLogList: document.querySelector("#auditLogList"),
  auditLogListMirror: document.querySelector("#auditLogListMirror"),
  screenLinks: document.querySelectorAll(".sidebar-link"),
  screens: document.querySelectorAll(".workspace-screen"),
  formTabs: document.querySelectorAll("[data-form-target]"),
  movieForm: document.querySelector("#movieForm"),
  audioForm: document.querySelector("#audioForm"),
  fileForm: document.querySelector("#fileForm"),
  pointsAdjustmentForm: document.querySelector("#pointsAdjustmentForm"),
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

function syncActiveScreen() {
  el.screenLinks.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.screenTarget === state.activeScreen);
  });
  el.screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.id === state.activeScreen);
  });
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
      <p class="eyebrow">Signed in</p>
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

function renderPlatformUsers() {
  const users = state.platformUsers.length ? state.platformUsers : fallbackData.platformUsers;
  el.platformUsersTable.innerHTML = "";

  users.forEach((user) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <strong>${user.telegram_username || "Unknown user"}</strong>
        <div class="mono">${user.user_id}</div>
      </td>
      <td><span class="badge is-muted">${user.role}</span></td>
      <td>${user.points_balance}</td>
      <td><span class="badge ${user.is_banned ? "is-muted" : ""}">${user.is_banned ? "banned" : "active"}</span></td>
      <td>
        <div class="action-row">
          <button class="mini-button" type="button" data-user-fill="${user.user_id}">Adjust points</button>
          <button class="mini-button ${user.is_banned ? "" : "is-danger"}" type="button" data-user-ban="${user.user_id}" data-next-ban="${user.is_banned ? "false" : "true"}">${user.is_banned ? "Unban" : "Ban"}</button>
        </div>
      </td>
    `;
    el.platformUsersTable.appendChild(row);
  });
}

function renderAuditLogs() {
  const logs = state.auditLogs.length ? state.auditLogs : fallbackData.auditLogs;
  const markup = logs
    .map(
      (log) => `
        <article class="audit-row">
          <h3>${log.action}</h3>
          <p>${log.entity_type}${log.entity_id ? ` | ${log.entity_id}` : ""}</p>
          <p class="mono">${log.actor_user_id || "system"} | ${new Date(log.created_at).toLocaleString()}</p>
        </article>
      `
    )
    .join("");

  el.auditLogList.innerHTML = markup;
  el.auditLogListMirror.innerHTML = markup;
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
    el.inventoryTable.innerHTML = `<tr><td colspan="6" class="empty-state">No inventory matches that filter.</td></tr>`;
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
      <td>
        <div class="action-row">
          <button class="mini-button" type="button" data-edit-type="${item.content_type}" data-edit-slug="${item.slug}">Edit</button>
          <button class="mini-button is-danger" type="button" data-archive-type="${item.content_type}" data-archive-id="${item.id || ""}" data-archive-slug="${item.slug}">Archive</button>
        </div>
      </td>
    `;
    el.inventoryTable.appendChild(row);
  });
}

function renderContentFiles() {
  const rows = state.contentFiles.length ? state.contentFiles : fallbackData.contentFiles;
  el.contentFilesTable.innerHTML = "";

  rows.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.label || "Untitled file"}</td>
      <td><span class="badge is-muted">${item.content_kind}</span></td>
      <td>${item.quality || item.format || "Standard"}</td>
      <td>${item.points_cost}</td>
      <td><span class="badge ${item.is_active === false ? "is-muted" : ""}">${item.is_active === false ? "inactive" : "active"}</span></td>
      <td>
        <div class="action-row">
          <button class="mini-button" type="button" data-file-edit="${item.id}">Edit</button>
          <button class="mini-button is-danger" type="button" data-file-deactivate="${item.id}">Disable</button>
        </div>
      </td>
    `;
    el.contentFilesTable.appendChild(row);
  });
}

async function loadInventory() {
  try {
    const [moviesResponse, audioResponse, filesResponse] = await Promise.all([
      fetchJson("/admin/movies", {}, true),
      fetchJson("/admin/audio", {}, true),
      fetchJson("/admin/content-files", {}, true),
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
    state.contentFiles = filesResponse.data || [];
    state.inventory = [...movies, ...audio];
  } catch (error) {
    console.warn("Inventory fallback engaged.", error);
    state.inventory = fallbackData.inventory;
    state.contentFiles = fallbackData.contentFiles;
  }
}

async function loadOperationsData() {
  try {
    const [platformUsersResponse, auditLogsResponse] = await Promise.all([
      fetchJson("/admin/platform-users", {}, true),
      fetchJson("/admin/audit-logs", {}, true),
    ]);
    state.platformUsers = platformUsersResponse.data || [];
    state.auditLogs = auditLogsResponse.data || [];
  } catch (error) {
    console.warn("Operations fallback engaged.", error);
    state.platformUsers = fallbackData.platformUsers;
    state.auditLogs = fallbackData.auditLogs;
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function activateForm(targetId) {
  document.querySelectorAll(".editor-form").forEach((form) => {
    const isPointsForm = form.id === "pointsAdjustmentForm";
    form.classList.toggle("is-active", isPointsForm || form.id === targetId);
  });
  el.formTabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.formTarget === targetId);
  });
}

function fillForm(form, values) {
  Object.entries(values).forEach(([key, value]) => {
    const field = form.querySelector(`[name="${key}"]`);
    if (!field) return;
    if (field.type === "checkbox") {
      field.checked = Boolean(value);
    } else {
      field.value = value ?? "";
    }
  });
}

function formDataToObject(form) {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  Object.keys(data).forEach((key) => {
    if (data[key] === "") data[key] = null;
  });

  if ("release_year" in data && data.release_year) data.release_year = Number(data.release_year);
  if ("duration_minutes" in data && data.duration_minutes) data.duration_minutes = Number(data.duration_minutes);
  if ("duration_seconds" in data && data.duration_seconds) data.duration_seconds = Number(data.duration_seconds);
  if ("points_cost" in data && data.points_cost !== null) data.points_cost = Number(data.points_cost);
  if ("amount" in data && data.amount !== null) data.amount = Number(data.amount);

  data.requires_ad = form.querySelector('[name="requires_ad"]')
    ? form.querySelector('[name="requires_ad"]').checked
    : data.requires_ad;

  return data;
}

async function submitMovieForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = formDataToObject(form);
  payload.slug = payload.slug || slugify(payload.title || "");

  try {
    const method = form.dataset.editId ? "PATCH" : "POST";
    const path = form.dataset.editId ? `/admin/movies/${form.dataset.editId}` : "/admin/movies";
    await fetchJson(path, { method, body: JSON.stringify(payload) }, true);
    setMode("live", form.dataset.editId ? "Movie updated successfully." : "Movie created successfully.");
    form.reset();
    delete form.dataset.editId;
    await loadDashboard();
  } catch (error) {
    setMode(state.fallback ? "fallback" : "live", `Movie save failed. ${error.message}`);
  }
}

async function submitAudioForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = formDataToObject(form);
  payload.slug = payload.slug || slugify(payload.title || "");

  try {
    const method = form.dataset.editId ? "PATCH" : "POST";
    const path = form.dataset.editId ? `/admin/audio/${form.dataset.editId}` : "/admin/audio";
    await fetchJson(path, { method, body: JSON.stringify(payload) }, true);
    setMode("live", form.dataset.editId ? "Audio item updated successfully." : "Audio item created successfully.");
    form.reset();
    delete form.dataset.editId;
    await loadDashboard();
  } catch (error) {
    setMode(state.fallback ? "fallback" : "live", `Audio save failed. ${error.message}`);
  }
}

async function submitContentFileForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = formDataToObject(form);

  try {
    const method = form.dataset.editId ? "PATCH" : "POST";
    const path = form.dataset.editId ? `/admin/content-files/${form.dataset.editId}` : "/admin/content-files";
    await fetchJson(path, { method, body: JSON.stringify(payload) }, true);
    setMode("live", form.dataset.editId ? "Content file updated successfully." : "Content file attached successfully.");
    form.reset();
    form.querySelector('[name="requires_ad"]').checked = true;
    delete form.dataset.editId;
    await loadDashboard();
  } catch (error) {
    setMode(state.fallback ? "fallback" : "live", `Content file save failed. ${error.message}`);
  }
}

async function archiveInventoryItem(type, id) {
  const path = type === "movie" ? `/admin/movies/${id}` : `/admin/audio/${id}`;
  await fetchJson(path, { method: "DELETE" }, true);
  setMode("live", `${type === "movie" ? "Movie" : "Audio"} archived.`);
  await loadDashboard();
}

async function deactivateContentFile(id) {
  await fetchJson(`/admin/content-files/${id}`, { method: "DELETE" }, true);
  setMode("live", "Content file disabled.");
  await loadDashboard();
}

async function updatePlatformUserBanState(userId, isBanned) {
  await fetchJson(
    `/admin/platform-users/${userId}`,
    { method: "PATCH", body: JSON.stringify({ is_banned: isBanned }) },
    true
  );
  setMode("live", isBanned ? "User banned." : "User unbanned.");
  await loadDashboard();
}

async function submitPointsAdjustmentForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = formDataToObject(form);
  const userId = payload.user_id;
  delete payload.user_id;

  try {
    await fetchJson(
      `/admin/platform-users/${userId}/points-adjustments`,
      { method: "POST", body: JSON.stringify(payload) },
      true
    );
    setMode("live", "Point adjustment applied.");
    form.reset();
    await loadDashboard();
  } catch (error) {
    setMode(state.fallback ? "fallback" : "live", `Point adjustment failed. ${error.message}`);
  }
}

function handleInventoryActions(event) {
  const editButton = event.target.closest("[data-edit-type]");
  const archiveButton = event.target.closest("[data-archive-type]");
  const fileEditButton = event.target.closest("[data-file-edit]");
  const fileDeactivateButton = event.target.closest("[data-file-deactivate]");
  const fillUserButton = event.target.closest("[data-user-fill]");
  const banUserButton = event.target.closest("[data-user-ban]");

  if (editButton) {
    const item = state.inventory.find(
      (row) => row.content_type === editButton.dataset.editType && row.slug === editButton.dataset.editSlug
    );
    if (!item) return;
    state.activeScreen = "publishingScreen";
    syncActiveScreen();
    if (item.content_type === "movie") {
      activateForm("movieForm");
      el.movieForm.dataset.editId = item.id;
      fillForm(el.movieForm, item);
    } else if (item.content_type === "audio") {
      activateForm("audioForm");
      el.audioForm.dataset.editId = item.id;
      fillForm(el.audioForm, item);
    }
    return;
  }

  if (archiveButton) {
    const id = archiveButton.dataset.archiveId;
    const type = archiveButton.dataset.archiveType;
    if (!id) return;
    archiveInventoryItem(type, id).catch((error) => {
      setMode(state.fallback ? "fallback" : "live", `Archive failed. ${error.message}`);
    });
    return;
  }

  if (fileEditButton) {
    const file = state.contentFiles.find((row) => row.id === fileEditButton.dataset.fileEdit);
    if (!file) return;
    state.activeScreen = "publishingScreen";
    syncActiveScreen();
    activateForm("fileForm");
    el.fileForm.dataset.editId = file.id;
    fillForm(el.fileForm, file);
    return;
  }

  if (fileDeactivateButton) {
    deactivateContentFile(fileDeactivateButton.dataset.fileDeactivate).catch((error) => {
      setMode(state.fallback ? "fallback" : "live", `Disable failed. ${error.message}`);
    });
    return;
  }

  if (fillUserButton) {
    state.activeScreen = "usersScreen";
    syncActiveScreen();
    el.pointsAdjustmentForm.querySelector('[name="user_id"]').value = fillUserButton.dataset.userFill;
    return;
  }

  if (banUserButton) {
    updatePlatformUserBanState(
      banUserButton.dataset.userBan,
      banUserButton.dataset.nextBan === "true"
    ).catch((error) => {
      setMode(state.fallback ? "fallback" : "live", `User update failed. ${error.message}`);
    });
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
  await loadOperationsData();
  renderMetrics();
  renderIdentity();
  renderAdminUsers();
  renderPlatformUsers();
  renderInventory();
  renderContentFiles();
  renderAuditLogs();
  syncActiveScreen();
}

function attachEvents() {
  el.connectButton.addEventListener("click", loadDashboard);
  el.refreshButton.addEventListener("click", loadDashboard);
  el.inventorySearch.addEventListener("input", renderInventory);
  el.inventoryType.addEventListener("change", renderInventory);
  el.inventoryTable.addEventListener("click", handleInventoryActions);
  el.contentFilesTable.addEventListener("click", handleInventoryActions);
  el.platformUsersTable.addEventListener("click", handleInventoryActions);
  el.screenLinks.forEach((button) => {
    button.addEventListener("click", () => {
      state.activeScreen = button.dataset.screenTarget;
      syncActiveScreen();
    });
  });
  el.formTabs.forEach((button) => {
    button.addEventListener("click", () => activateForm(button.dataset.formTarget));
  });
  el.movieForm.addEventListener("submit", submitMovieForm);
  el.audioForm.addEventListener("submit", submitAudioForm);
  el.fileForm.addEventListener("submit", submitContentFileForm);
  el.pointsAdjustmentForm.addEventListener("submit", submitPointsAdjustmentForm);
}

syncInputs();
attachEvents();
syncActiveScreen();
loadDashboard();
