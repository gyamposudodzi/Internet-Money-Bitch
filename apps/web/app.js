const state = {
  apiBaseUrl: "http://localhost:8000/api/v1",
  userId: "22222222-2222-2222-2222-222222222222",
  pointsBalance: 30,
  featuredItems: [],
  movieItems: [],
  audioItems: [],
  activeSection: "featured",
  activeItem: null,
  activeFileId: null,
  activeSession: null,
  usingFallback: false,
};

const fallbackCatalog = {
  home: {
    sections: [
      {
        key: "featured-movies",
        title: "Featured Movies",
        items: [
          {
            id: "44444444-4444-4444-4444-444444444441",
            title: "Heatline",
            slug: "heatline",
            poster_url:
              "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=80",
            release_year: 2026,
            content_type: "movie",
          },
        ],
      },
      {
        key: "featured-audio",
        title: "Featured Audio",
        items: [
          {
            id: "55555555-5555-5555-5555-555555555551",
            title: "Night Drive",
            slug: "night-drive",
            poster_url:
              "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80",
            release_year: null,
            content_type: "audio",
          },
        ],
      },
    ],
    ad_slots: [],
  },
  movies: [
    {
      id: "44444444-4444-4444-4444-444444444441",
      title: "Heatline",
      slug: "heatline",
      poster_url:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=80",
      release_year: 2026,
      content_type: "movie",
    },
  ],
  movieDetails: {
    heatline: {
      id: "44444444-4444-4444-4444-444444444441",
      title: "Heatline",
      slug: "heatline",
      poster_url:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=80",
      backdrop_url:
        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80",
      synopsis:
        "A courier outruns a citywide blackout while carrying evidence that could collapse a syndicate.",
      release_year: 2026,
      language: "en",
      content_type: "movie",
      files: [
        {
          id: "66666666-6666-6666-6666-666666666661",
          label: "Heatline 720p",
          quality: "720p",
          format: "mp4",
          file_size_bytes: 1572864000,
          requires_ad: true,
          points_cost: 10,
        },
        {
          id: "66666666-6666-6666-6666-666666666662",
          label: "Heatline 1080p",
          quality: "1080p",
          format: "mp4",
          file_size_bytes: 2147483648,
          requires_ad: true,
          points_cost: 15,
        },
      ],
    },
  },
  audio: [
    {
      id: "55555555-5555-5555-5555-555555555551",
      title: "Night Drive",
      slug: "night-drive",
      poster_url:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80",
      release_year: null,
      content_type: "audio",
    },
  ],
  audioDetails: {
    "night-drive": {
      id: "55555555-5555-5555-5555-555555555551",
      title: "Night Drive",
      slug: "night-drive",
      poster_url:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80",
      backdrop_url:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1600&q=80",
      synopsis: "A synth-heavy track used to test the audio unlock flow.",
      release_year: null,
      language: "en",
      content_type: "audio",
      files: [
        {
          id: "66666666-6666-6666-6666-666666666663",
          label: "Night Drive MP3",
          quality: "320kbps",
          format: "mp3",
          file_size_bytes: 10485760,
          requires_ad: true,
          points_cost: 5,
        },
      ],
    },
  },
};

const el = {
  apiBaseUrl: document.querySelector("#apiBaseUrl"),
  userId: document.querySelector("#userId"),
  pointsBalance: document.querySelector("#pointsBalance"),
  heroTitle: document.querySelector("#heroTitle"),
  heroSynopsis: document.querySelector("#heroSynopsis"),
  heroPoster: document.querySelector("#heroPoster"),
  heroPrimaryAction: document.querySelector("#heroPrimaryAction"),
  reloadButton: document.querySelector("#reloadButton"),
  searchInput: document.querySelector("#searchInput"),
  typeFilter: document.querySelector("#typeFilter"),
  sortFilter: document.querySelector("#sortFilter"),
  searchButton: document.querySelector("#searchButton"),
  sectionTabs: document.querySelector("#sectionTabs"),
  catalogGrid: document.querySelector("#catalogGrid"),
  detailBackdrop: document.querySelector("#detailBackdrop"),
  detailType: document.querySelector("#detailType"),
  detailTitle: document.querySelector("#detailTitle"),
  detailMeta: document.querySelector("#detailMeta"),
  detailSynopsis: document.querySelector("#detailSynopsis"),
  detailSource: document.querySelector("#detailSource"),
  qualityList: document.querySelector("#qualityList"),
  sessionStatus: document.querySelector("#sessionStatus"),
  sessionMessage: document.querySelector("#sessionMessage"),
  startSessionButton: document.querySelector("#startSessionButton"),
  consumePointsButton: document.querySelector("#consumePointsButton"),
  telegramLink: document.querySelector("#telegramLink"),
};

async function fetchJson(path, options = {}) {
  const response = await fetch(`${state.apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Client-Platform": "web",
      "X-App-Version": "0.1.0",
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function setBackground(element, url) {
  if (!url) {
    element.style.backgroundImage = "";
    return;
  }
  element.style.backgroundImage = `linear-gradient(180deg, rgba(14,20,23,0.08), rgba(14,20,23,0.82)), url("${url}")`;
}

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

function sectionItems() {
  if (state.activeSection === "movies") return state.movieItems;
  if (state.activeSection === "audio") return state.audioItems;
  return state.featuredItems;
}

function allItems() {
  const byId = new Map();
  [...state.featuredItems, ...state.movieItems, ...state.audioItems].forEach((item) => {
    byId.set(`${item.content_type}:${item.slug}`, item);
  });
  return [...byId.values()];
}

function renderHero() {
  const hero = state.featuredItems[0] || state.movieItems[0] || state.audioItems[0];
  if (!hero) return;
  el.heroTitle.textContent = hero.title;
  el.heroSynopsis.textContent =
    state.activeItem?.slug === hero.slug && state.activeItem?.synopsis
      ? state.activeItem.synopsis
      : "Quick picks, clean layouts, and Telegram handoff without turning the whole screen into an ad carnival.";
  setBackground(el.heroPoster, hero.poster_url);
  el.heroPrimaryAction.onclick = () => selectItem(hero);
}

function renderCatalog() {
  const items = sectionItems();
  el.catalogGrid.innerHTML = "";

  if (!items.length) {
    el.catalogGrid.innerHTML = `<p class="empty-state">No items matched this filter.</p>`;
    return;
  }

  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "media-card";
    setBackground(button, item.poster_url);
    button.innerHTML = `
      <div class="media-card-copy">
        <p class="eyebrow">${item.content_type}</p>
        <h4>${item.title}</h4>
        <p>${item.release_year || "Audio"} </p>
      </div>
    `;
    button.addEventListener("click", () => selectItem(item));
    el.catalogGrid.appendChild(button);
  });
}

function renderQualityList(files = []) {
  el.qualityList.innerHTML = "";
  if (!files.length) {
    el.qualityList.innerHTML = `<p class="empty-state">No files published yet.</p>`;
    return;
  }

  files.forEach((file, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `quality-button ${state.activeFileId === file.id || (!state.activeFileId && index === 0) ? "is-active" : ""}`;
    button.innerHTML = `
      <div class="quality-main">
        <strong>${file.label || `${file.quality || "File"} ${file.format || ""}`.trim()}</strong>
        <span>${file.requires_ad ? "Rewarded unlock required" : "Direct unlock available"}</span>
      </div>
      <div class="quality-meta">
        <span>${file.quality || "Standard"}</span>
        <span>${formatBytes(file.file_size_bytes)} | ${file.points_cost} pts</span>
      </div>
    `;
    button.addEventListener("click", () => {
      state.activeFileId = file.id;
      state.activeSession = null;
      renderQualityList(files);
      renderSession();
    });
    el.qualityList.appendChild(button);
  });

  if (!state.activeFileId && files[0]) {
    state.activeFileId = files[0].id;
  }
}

function renderDetail() {
  const item = state.activeItem;
  if (!item) return;
  el.detailType.textContent = item.content_type;
  el.detailTitle.textContent = item.title;
  el.detailMeta.textContent = [item.release_year, item.language ? item.language.toUpperCase() : null]
    .filter(Boolean)
    .join(" | ") || "Telegram unlock flow";
  el.detailSynopsis.textContent = item.synopsis || "Select a file quality below to start a download session.";
  el.detailSource.textContent = state.usingFallback ? "Fallback demo" : "Live API";
  setBackground(el.detailBackdrop, item.backdrop_url || item.poster_url);
  renderQualityList(item.files || []);
  renderSession();
}

function renderSession() {
  const selectedFile = (state.activeItem?.files || []).find((file) => file.id === state.activeFileId)
    || (state.activeItem?.files || [])[0];

  if (!selectedFile) {
    el.sessionStatus.textContent = "No file";
    el.sessionMessage.textContent = "Choose a title with a published file to continue.";
    el.startSessionButton.disabled = true;
    el.telegramLink.classList.add("disabled-link");
    el.telegramLink.href = "#";
    return;
  }

  if (!state.activeSession) {
    el.sessionStatus.textContent = "Ready";
    el.sessionMessage.textContent = `${selectedFile.label || selectedFile.quality || "Selected file"} costs ${selectedFile.points_cost} points to bypass ads.`;
    el.startSessionButton.disabled = false;
    el.startSessionButton.textContent = "Start unlock";
    el.startSessionButton.onclick = () => createSession(false);
    el.telegramLink.classList.add("disabled-link");
    el.telegramLink.href = "#";
    el.consumePointsButton.textContent = "Skip with points";
    el.consumePointsButton.onclick = () => createSession(true);
    return;
  }

  el.sessionStatus.textContent = state.activeSession.status;
  el.sessionMessage.textContent = state.activeSession.ad_required
    ? `Session created. Watch the rewarded step, then continue in Telegram.`
    : `Session unlocked. Telegram can open the file immediately.`;
  el.startSessionButton.disabled = true;
  el.startSessionButton.textContent = "Session active";
  el.startSessionButton.onclick = null;
  if (state.activeSession.telegram_deep_link) {
    el.telegramLink.href = state.activeSession.telegram_deep_link;
    el.telegramLink.classList.remove("disabled-link");
  } else {
    el.telegramLink.classList.add("disabled-link");
    el.telegramLink.href = "#";
  }
  el.consumePointsButton.textContent = state.activeSession.ad_required ? "Bypass with points" : "Points used";
  el.consumePointsButton.onclick = state.activeSession.ad_required
    ? () => usePointsForSession()
    : null;
}

async function loadCollections() {
  state.apiBaseUrl = el.apiBaseUrl.value.trim();
  state.userId = el.userId.value.trim();

  try {
    const [homeResponse, moviesResponse, audioResponse] = await Promise.all([
      fetchJson("/home"),
      fetchJson(`/movies?sort=${encodeURIComponent(el.sortFilter.value)}`),
      fetchJson("/audio"),
    ]);

    state.usingFallback = false;
    state.featuredItems = (homeResponse.data.sections || []).flatMap((section) => section.items || []);
    state.movieItems = moviesResponse.data || [];
    state.audioItems = audioResponse.data || [];
  } catch (error) {
    console.warn("Using fallback catalog data.", error);
    state.usingFallback = true;
    state.featuredItems = fallbackCatalog.home.sections.flatMap((section) => section.items || []);
    state.movieItems = fallbackCatalog.movies;
    state.audioItems = fallbackCatalog.audio;
  }

  renderHero();
  renderCatalog();

  if (!state.activeItem) {
    const first = allItems()[0];
    if (first) {
      await selectItem(first);
    }
  }
}

async function loadItemDetails(item) {
  if (state.usingFallback) {
    if (item.content_type === "audio") {
      return fallbackCatalog.audioDetails[item.slug];
    }
    if (item.content_type === "movie") {
      return fallbackCatalog.movieDetails[item.slug];
    }
    return item;
  }

  const path =
    item.content_type === "audio"
      ? `/audio/${item.slug}`
      : item.content_type === "series"
        ? `/series/${item.slug}`
        : `/movies/${item.slug}`;

  const response = await fetchJson(path);
  return response.data;
}

async function selectItem(item) {
  const detailedItem = await loadItemDetails(item);
  state.activeItem = detailedItem;
  state.activeFileId = detailedItem.files?.[0]?.id || null;
  state.activeSession = null;
  renderHero();
  renderCatalog();
  renderDetail();
}

async function createSession(consumePoints) {
  const selectedFile = (state.activeItem?.files || []).find((file) => file.id === state.activeFileId)
    || (state.activeItem?.files || [])[0];
  if (!selectedFile) return;

  try {
    if (state.usingFallback) {
      state.activeSession = {
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
      if (consumePoints) {
        state.pointsBalance = Math.max(0, state.pointsBalance - selectedFile.points_cost);
      }
    } else {
      const response = await fetchJson("/download-sessions", {
        method: "POST",
        body: JSON.stringify({
          content_file_id: selectedFile.id,
          consume_points: consumePoints,
          user_id: state.userId,
        }),
      });
      state.activeSession = response.data;
      if (consumePoints && response.data.points_spent) {
        state.pointsBalance = Math.max(0, state.pointsBalance - response.data.points_spent);
      }
    }
  } catch (error) {
    el.sessionMessage.textContent = `Session failed: ${error.message}`;
  }

  syncWallet();
  renderSession();
}

async function usePointsForSession() {
  if (!state.activeSession) return;
  try {
    if (state.usingFallback) {
      state.activeSession.ad_required = false;
      state.activeSession.status = "created";
      state.activeSession.points_spent = state.activeSession.points_cost;
      state.pointsBalance = Math.max(0, state.pointsBalance - state.activeSession.points_cost);
    } else {
      const response = await fetchJson(
        `/download-sessions/${state.activeSession.download_session_id}/use-points?user_id=${encodeURIComponent(state.userId)}`,
        {
          method: "POST",
        }
      );
      state.activeSession = response.data;
      state.pointsBalance = Math.max(0, state.pointsBalance - response.data.points_spent);
    }
  } catch (error) {
    el.sessionMessage.textContent = `Point bypass failed: ${error.message}`;
  }
  syncWallet();
  renderSession();
}

async function performSearch() {
  const query = el.searchInput.value.trim();
  const selectedType = el.typeFilter.value;
  if (!query) {
    await loadCollections();
    return;
  }

  try {
    if (state.usingFallback) {
      const items = allItems().filter((item) => {
        const matchesType = selectedType === "all" || item.content_type === selectedType;
        return matchesType && item.title.toLowerCase().includes(query.toLowerCase());
      });
      state.activeSection = "featured";
      state.featuredItems = items;
    } else {
      const params = new URLSearchParams({ q: query });
      if (selectedType !== "all") {
        params.set("type", selectedType);
      }
      const response = await fetchJson(`/search?${params.toString()}`);
      state.activeSection = "featured";
      state.featuredItems = response.data || [];
    }
    renderCatalog();
  } catch (error) {
    console.warn("Search failed.", error);
  }
}

function syncWallet() {
  el.pointsBalance.textContent = String(state.pointsBalance);
}

function attachEvents() {
  el.reloadButton.addEventListener("click", loadCollections);
  el.searchButton.addEventListener("click", performSearch);
  el.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      performSearch();
    }
  });
  el.sectionTabs.addEventListener("click", (event) => {
    const button = event.target.closest(".segment");
    if (!button) return;
    state.activeSection = button.dataset.section;
    document.querySelectorAll(".segment").forEach((segment) => {
      segment.classList.toggle("is-active", segment === button);
    });
    renderCatalog();
  });
}

attachEvents();
syncWallet();
loadCollections();
