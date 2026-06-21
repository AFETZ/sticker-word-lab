const API_URL = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/stickers.json";
const STICKER_CACHE_KEY = "swl.stickers.v3";
const STICKER_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const PRESET_CACHE_KEY = "swl.presets.v1";
const CV_PROXY = "https://images.weserv.nl/?url=";
const PRICE_BATCH_SIZE = 4;
const BACKEND_TIMEOUT_MS = 1800;
const UNKNOWN_PRICE_PENALTY = 260;
const EXPENSIVE_PRICE_PENALTY = 180;
const PRICE_RERANK_LIMIT = 12;

const FALLBACK_STICKERS = [
  {
    id: "sticker-4408",
    name: "Sticker | BnTeT | Berlin 2019",
    effect: "Other",
    type: "Autograph",
    image:
      "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMikJ3ee6wQlpd67-VDgfh__ipP0s3QJ6vb2OaJvJPGWXWKSlLoitrg8TSrhwR904DiAmN6pJC6XOwQoCMBuBbld-BfSO30",
  },
  {
    id: "sticker-6676",
    name: "Sticker | FaZe Clan | Paris 2023",
    effect: "Other",
    type: "Team",
    image:
      "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNqgJ3KEtwYnp8jy60PiD0jzypW4-HAJufCqOPQ8JvSXXmOTlrsv6LM6GnGwxEx_6jzdzt-gdSiJLlh3_ka5CfA",
  },
  {
    id: "sticker-7306",
    name: "Sticker | Apeks | Copenhagen 2024",
    effect: "Other",
    type: "Team",
    image:
      "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmxPSnHtwI69Zfx8hfkEEryn8ey_3ALtvatPvJod_OWXjCWwO8jteUxTSuwkEsk4TiEn9z8bzvJOb-NpFJy",
  },
  {
    id: "sticker-8129",
    name: "Sticker | zont1x | Shanghai 2024",
    effect: "Other",
    type: "Autograph",
    image:
      "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNmpNCnHtwI6547z1UPoTwmghtjjpSEDtqCra_I4d6nAXTSSlb51suJoF3G3zEl252mAz4mvJSnCagAhFNIuEgyeXqqp",
  },
];

const CYRILLIC_TO_LATIN = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ы: "y",
  э: "e",
  ю: "yu",
  я: "ya",
};

const LEET_TO_LATIN = {
  0: "o",
  1: "i",
  2: "z",
  3: "e",
  4: "a",
  5: "s",
  6: "g",
  7: "t",
  8: "b",
};

const LONG_ORDERED_FRAGMENT_LIMIT = 6;

const LETTER_KNOWLEDGE = {
  a: ["Apeks", "Astralis", "AMKAL ESPORTS", "SAW", "Lambda"],
  b: ["Flipsid3 Tactics", "Forge Tier6", "Shifty Tactics"],
  c: ["London Conspiracy", "CT in banana", "Fast Banana"],
  d: ["Great Wave", "Outsiders"],
  e: ["ANGE1"],
  f: ["FaZe Clan"],
  g: ["Evil Geniuses", "Gambit", "LGB eSports", "Good Game"],
  h: ["Heroic", "IHC Esports"],
  i: ["Flashbang", "Ouchie", "CT in banana", "Fast Banana", "iM"],
  j: ["CR4ZY", "Hello MAC-10", "Hello M4A1-S"],
  k: ["SK Gaming"],
  l: ["Hello SG 553", "Hello MP7", "Good Luck"],
  m: ["MOUZ", "MIBR", "M80", "Monte", "Team Immunity", "Clan-Mystik"],
  n: ["Nemiga", "Team EnVyUs", "ECSTATIC"],
  o: ["compLexity Gaming", "Team EnVyUs", "OG"],
  p: ["paiN Gaming"],
  q: ["9z Team"],
  r: ["Reason Gaming"],
  s: ["compLexity Gaming", "Splyce"],
  t: ["Titan", "ESPADA"],
  u: ["Teamwork", "London Conspiracy"],
  v: ["Vitality", "Virtus.Pro"],
  w: ["INS", "Avangar"],
  x: ["Vexed Gaming", "Legendary", "Runtime"],
  y: ["Lambda", "Avangar"],
  z: ["zont1x", "Nemiga", "Team EnVyUs", "ECSTATIC"],
};

const COMBO_KNOWLEDGE = {
  zz: ["Buzz"],
  ez: ["EZ", "REZ"],
  gg: ["Good Game"],
  gl: ["Good Luck", "GamerLegion"],
  im: ["iM"],
  sim: ["s1mple"],
  simp: ["s1mple"],
  simpl: ["s1mple"],
  simple: ["s1mple"],
  og: ["OG"],
  bf: ["BF 2042"],
  et: ["BnTeT"],
};

const MANUAL_CRAFTS = {
  afetz: {
    title: "AFETZ по скриншоту",
    summary: "4 стикера, ET берется одним автографом BnTeT",
    segments: [
      {
        token: "a",
        visible: "A",
        names: ["Sticker | Apeks | Copenhagen 2024", "Sticker | Apeks | Paris 2023"],
        family: "Apeks",
        scrape: 0,
        angle: 0,
        note: "Оставить чистым: логотип читается как большая A.",
      },
      {
        token: "f",
        visible: "F",
        names: ["Sticker | FaZe Clan | Paris 2023", "Sticker | FaZe Clan | Copenhagen 2024"],
        family: "FaZe Clan",
        scrape: 0,
        angle: 0,
        note: "Оставить чистым: знак FaZe работает как F.",
      },
      {
        token: "et",
        visible: "ET",
        names: ["Sticker | BnTeT | Berlin 2019", "Sticker | BnTeT | Katowice 2019"],
        family: "BnTeT",
        scrape: 0.3,
        angle: 0,
        note: "Сместить и перекрыть левую часть BnT, оставить хвост ET.",
      },
      {
        token: "z",
        visible: "Z",
        names: ["Sticker | zont1x | Shanghai 2024", "Sticker | zont1x | Copenhagen 2024"],
        family: "zont1x",
        scrape: 0.64,
        angle: 0,
        note: "Сильно потереть и оставить первую букву Z, как на твоем варианте.",
      },
    ],
  },
};

const state = {
  stickers: [],
  crafts: [],
  selectedCraft: null,
  target: "afetz",
  candidateCache: new Map(),
  cvCache: new Map(),
  serverVisionCache: new Map(),
  priceCache: new Map(),
  pricePending: new Set(),
  priceRerankTimer: null,
  priceRerankPasses: 0,
  pricePrimeRun: 0,
  browserQuery: "",
  lastShareUrl: "",
  moneyRun: 0,
  moneyOpportunities: [],
  moneySummary: null,
  moneyLastKey: "",
  moneyInFlightKey: "",
  monetization: null,
  toastTimer: null,
  visionTimer: null,
  candidateVisionTimer: null,
  moneyTimer: null,
  checkoutPending: false,
  leadPending: false,
  sharePending: false,
  backend: {
    available: false,
    baseUrl: "",
    features: [],
  },
  visionRun: 0,
};

const els = {
  form: document.querySelector("#craftForm"),
  wordInput: document.querySelector("#wordInput"),
  effectMode: document.querySelector("#effectMode"),
  budgetMode: document.querySelector("#budgetMode"),
  maxStickers: document.querySelector("#maxStickers"),
  maxChunk: document.querySelector("#maxChunk"),
  maxStickerPrice: document.querySelector("#maxStickerPrice"),
  maxCraftPrice: document.querySelector("#maxCraftPrice"),
  preferAutographs: document.querySelector("#preferAutographs"),
  allowRotations: document.querySelector("#allowRotations"),
  requireSteamPrice: document.querySelector("#requireSteamPrice"),
  advancedSettings: document.querySelector("#advancedSettings"),
  dataStatus: document.querySelector("#dataStatus"),
  stickerCount: document.querySelector("#stickerCount"),
  candidateCount: document.querySelector("#candidateCount"),
  normalizedWord: document.querySelector("#normalizedWord"),
  craftTitle: document.querySelector("#craftTitle"),
  scorePill: document.querySelector("#scorePill"),
  previewRail: document.querySelector("#previewRail"),
  craftNotes: document.querySelector("#craftNotes"),
  resultCount: document.querySelector("#resultCount"),
  resultsList: document.querySelector("#resultsList"),
  candidateColumns: document.querySelector("#candidateColumns"),
  stickerSearch: document.querySelector("#stickerSearch"),
  stickerGrid: document.querySelector("#stickerGrid"),
  copyPreset: document.querySelector("#copyPreset"),
  sharePreset: document.querySelector("#sharePreset"),
  savePreset: document.querySelector("#savePreset"),
  loadPreset: document.querySelector("#loadPreset"),
  resetCraft: document.querySelector("#resetCraft"),
  exportBox: document.querySelector("#exportBox"),
  visionPanel: document.querySelector("#visionPanel"),
  visionStatus: document.querySelector("#visionStatus"),
  moneyPanel: document.querySelector("#moneyPanel"),
  moneyStatus: document.querySelector("#moneyStatus"),
  revenuePanel: document.querySelector("#revenuePanel"),
  revenueStatus: document.querySelector("#revenueStatus"),
  journeyWord: document.querySelector("#journeyWord"),
  journeyPrimary: document.querySelector("#journeyPrimary"),
  journeyMeta: document.querySelector("#journeyMeta"),
  journeyBar: document.querySelector("#journeyBar"),
  toast: document.querySelector("#toast"),
  operatorSurface: document.querySelector("#operatorSurface"),
  operatorPanel: document.querySelector("#operatorPanel"),
  operatorStatus: document.querySelector("#operatorStatus"),
};

const formatNumber = new Intl.NumberFormat("ru-RU");
const formatPercent = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
  style: "percent",
});
const formatUsd = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

function stripStickerPrefix(name) {
  const clean = name.replace(/^Sticker\s+\|\s+/i, "");
  const parts = clean.split(" | ");
  return (parts[0] || clean).replace(/\s+\((?:Holo|Foil|Gold|Glitter|Lenticular)\)/gi, "").trim();
}

function transliterate(value) {
  return [...value.toLowerCase()].map((char) => CYRILLIC_TO_LATIN[char] || char).join("");
}

function normalizeText(value) {
  return transliterate(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .toLowerCase();
}

function normalizeLeetText(value) {
  return normalizeText(value).replace(/[0-8]/g, (char) => LEET_TO_LATIN[char] || char);
}

function normalizedVariants(value) {
  return [...new Set([normalizeText(value), normalizeLeetText(value)].filter(Boolean))];
}

function cleanTarget(value) {
  return normalizeText(value).slice(0, 16);
}

function enrichSticker(item) {
  const core = stripStickerPrefix(item.name || "");
  const normalizedCore = normalizeText(core);
  const searchable = normalizeText(`${item.name || ""} ${item.effect || ""} ${item.type || ""} ${core}`);
  return {
    ...item,
    core,
    normalizedCore,
    leetCore: normalizeLeetText(core),
    searchable,
    leetSearchable: normalizeLeetText(`${item.name || ""} ${item.effect || ""} ${item.type || ""} ${core}`),
  };
}

function steamMarketUrl(sticker) {
  const marketName = sticker.market_hash_name || sticker.name;
  return `https://steamcommunity.com/market/listings/730/${encodeURIComponent(marketName)}`;
}

function stickerMarketName(sticker) {
  return sticker.market_hash_name || sticker.name;
}

function stickerDisplayName(stickerOrName) {
  const raw = typeof stickerOrName === "string" ? stickerOrName : stickerOrName?.name || stickerOrName?.core || "";
  return stripStickerPrefix(raw).replace(/\s+\|\s+/g, " · ").trim() || "Стикер";
}

function renderPriceChip(sticker) {
  if (!state.backend.available) return "";
  return `<span class="price-chip price-chip--loading" data-price-name="${escapeHtml(stickerMarketName(sticker))}">проверяю цену</span>`;
}

function isTemporaryPriceError(price) {
  if (!price || price.success) return false;
  const error = String(price.error || "").toLowerCase();
  return Boolean(
    price.temporary
      || price.retryable
      || /429|too many requests|rate.?limit|timeout|temporar|network|fetch/.test(error),
  );
}

function priceLabel(price) {
  if (!price) return "проверяю цену";
  if (isTemporaryPriceError(price)) return "Steam занят";
  if (price.success && (price.lowest_price || price.median_price)) {
    return price.lowest_price || price.median_price;
  }
  return "нет на Steam";
}

function priceTitle(price) {
  if (!price) return "Проверяю Steam Market. Если цена не появится, стикер будет считаться недоступным на ТП.";
  const fetchedAt = price.fetched_at ? new Date(Number(price.fetched_at) * 1000).toLocaleString("ru-RU") : "";
  const suffix = fetchedAt ? ` · обновлено ${fetchedAt}` : "";
  if (price.success && priceAmount(price) !== null) {
    const parts = [price.lowest_price && `минимум ${price.lowest_price}`, price.median_price && `медиана ${price.median_price}`, price.volume && `объём ${price.volume}`].filter(Boolean);
    return `Оценка Steam Market: ${parts.join(" · ") || "цена без деталей"}${suffix}`;
  }
  if (isTemporaryPriceError(price)) {
    return `Steam временно не отдал цену. Крафт оставлен как предварительный, цену нужно перепроверить${suffix}.`;
  }
  return `Steam не вернул цену. В автоподборе считаем, что стикера нет на торговой площадке${suffix}.`;
}

function markPricesUnavailable(names, reason) {
  const fetchedAt = Math.floor(Date.now() / 1000);
  names.forEach((name) => {
    if (!state.priceCache.has(name)) {
      state.priceCache.set(name, {
        success: false,
        error: reason || "price request failed",
        temporary: true,
        fetched_at: fetchedAt,
      });
    }
  });
}

function isLocalHost() {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function backendCandidates() {
  const configured = window.STICKER_WORD_BACKEND;
  if (configured) return [configured.replace(/\/$/, "")];
  if (window.location.hostname.endsWith("github.io")) return [];
  const candidates = [];
  candidates.push("");
  if (isLocalHost() && window.location.port !== "8000") {
    candidates.push("http://127.0.0.1:8000", "http://localhost:8000");
  }
  return [...new Set(candidates.map((item) => item.replace(/\/$/, "")))];
}

function apiUrl(path, baseUrl = state.backend.baseUrl) {
  return `${baseUrl}${path}`;
}

function fetchWithTimeout(url, options = {}, timeoutMs = BACKEND_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

async function detectBackend() {
  for (const baseUrl of backendCandidates()) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/health`, { cache: "no-store" });
      if (!response.ok) continue;
      const payload = await response.json();
      if (!payload?.data?.ok) continue;
      state.backend = {
        available: true,
        baseUrl,
        features: payload.data.features || [],
      };
      return state.backend;
    } catch {
      // Static hosting is expected to miss backend endpoints.
    }
  }

  state.backend = { available: false, baseUrl: "", features: [] };
  return state.backend;
}

async function apiRequest(path, options = {}) {
  if (!state.backend.available) throw new Error("Backend is unavailable");
  const response = await fetch(apiUrl(path), {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || `HTTP ${response.status}`);
  }
  return payload;
}

function readStickerCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(STICKER_CACHE_KEY) || "null");
    if (!cached || !Array.isArray(cached.items) || Date.now() - cached.savedAt > STICKER_CACHE_TTL_MS) {
      return null;
    }
    return cached.items;
  } catch {
    return null;
  }
}

function writeStickerCache(items) {
  try {
    localStorage.setItem(STICKER_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items }));
  } catch {
    // The app still works without localStorage cache.
  }
}

async function loadStickers() {
  const cached = readStickerCache();
  if (cached) {
    state.stickers = cached.map(enrichSticker);
    els.dataStatus.textContent = `Кеш: ${formatNumber.format(state.stickers.length)} стикеров`;
    setStatusMode(els.dataStatus, "warn");
    renderBrowser();
    runGenerator();
  }

  try {
    const data = state.backend.available
      ? (await apiRequest("/api/stickers?limit=20000")).data
      : await fetchDirectStickers();
    const items = data.filter((item) => item.name && item.image);
    state.stickers = items.map(enrichSticker);
    writeStickerCache(items);
    els.dataStatus.textContent = state.backend.available
      ? `Backend: ${formatNumber.format(state.stickers.length)} стикеров, цены и визуальная оценка включены`
      : `Live API: ${formatNumber.format(state.stickers.length)} стикеров`;
    setStatusMode(els.dataStatus, state.backend.available ? "ok" : "warn");
  } catch (error) {
    if (!state.stickers.length) {
      state.stickers = FALLBACK_STICKERS.map(enrichSticker);
      els.dataStatus.textContent = "Offline fallback: базовый AFETZ набор";
      setStatusMode(els.dataStatus, "warn");
    }
    console.warn("Sticker API failed, using available data", error);
  }

  renderBrowser();
  runGenerator();
}

async function fetchDirectStickers() {
  const response = await fetch(API_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function setStatusMode(element, mode) {
  if (!element) return;
  if (mode) element.dataset.mode = mode;
  else delete element.dataset.mode;
}

function showToast(message) {
  if (!els.toast) return;
  clearTimeout(state.toastTimer);
  els.toast.textContent = message;
  els.toast.hidden = false;
  state.toastTimer = setTimeout(() => {
    els.toast.hidden = true;
  }, 2600);
}

function scrollToSelector(selector) {
  const target = document.querySelector(selector);
  if (!target) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}

function renderJourneyBar() {
  const craft = state.selectedCraft;
  const summary = state.moneySummary;
  const word = (state.target || els.wordInput.value || "craft").toUpperCase();
  els.journeyWord.textContent = word;

  if (!craft) {
    els.journeyPrimary.textContent = "Введи ник и собери варианты";
    els.journeyMeta.textContent = `${formatNumber.format(state.stickers.length)} стикеров в базе`;
    return;
  }

  const cost = summary && Number.isFinite(summary.total_cost)
    ? `${summary.unknown_prices ? "от " : ""}${formatUsd.format(summary.total_cost)}`
    : "считаю цену";
  const potential = summary?.resale_score ? `оценка ${moneyGrade(summary.resale_score)}` : `${craft.score}% совпадение`;
  const scraped = craft.segments.filter((segment) => segment.scrape >= 0.25).length;
  els.journeyPrimary.textContent = `${craft.title} · ${potential} · ${cost}`;
  els.journeyMeta.textContent = `${craft.segments.length} стикера · ${scraped} требуют износа · ${state.crafts.length} вариантов`;
}

function readOptions() {
  return {
    effectMode: els.effectMode.value,
    budgetMode: els.budgetMode.value,
    maxStickers: Number(els.maxStickers.value),
    maxChunk: Number(els.maxChunk.value),
    maxStickerPrice: Number(els.maxStickerPrice.value),
    maxCraftPrice: Number(els.maxCraftPrice.value),
    preferAutographs: els.preferAutographs.checked,
    allowRotations: els.allowRotations.checked,
    requireSteamPrice: els.requireSteamPrice.checked,
  };
}

function parseMarketAmount(value) {
  if (value === null || value === undefined) return null;
  let normalized = String(value)
    .replace(/\s/g, "")
    .replace(/[^0-9.,]/g, "");
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = normalized
      .replace(new RegExp(`\\${thousandsSeparator}`, "g"), "")
      .replace(decimalSeparator, ".");
  } else if (lastComma >= 0) {
    const decimals = normalized.length - lastComma - 1;
    normalized = decimals === 3
      ? normalized.replace(/,/g, "")
      : normalized.replace(",", ".");
  } else if (lastDot >= 0 && normalized.length - lastDot - 1 === 3) {
    normalized = normalized.replace(/\./g, "");
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function priceAmount(price) {
  if (!price || !price.success) return null;
  return parseMarketAmount(price.lowest_price) ?? parseMarketAmount(price.median_price);
}

function marketStatus(sticker, options = readOptions()) {
  if (!state.backend.available) return { state: "offline", amount: null, penalty: 0 };

  const price = state.priceCache.get(stickerMarketName(sticker));
  if (!price) {
    return {
      state: "pending",
      amount: null,
      penalty: options.requireSteamPrice ? 12 : 0,
    };
  }

  const amount = priceAmount(price);
  if (isTemporaryPriceError(price)) {
    return {
      state: "temporary",
      amount: null,
      penalty: options.requireSteamPrice ? 18 : 0,
    };
  }

  if (amount === null) {
    return {
      state: "missing",
      amount: null,
      penalty: options.requireSteamPrice ? UNKNOWN_PRICE_PENALTY : 80,
    };
  }

  const maxPrice = Number.isFinite(options.maxStickerPrice) ? options.maxStickerPrice : 3;
  if (amount > maxPrice) {
    const over = Math.min(260, Math.round((amount - maxPrice) * 18));
    return {
      state: "expensive",
      amount,
      penalty: EXPENSIVE_PRICE_PENALTY + over,
    };
  }

  return {
    state: "ok",
    amount,
    penalty: Math.round((amount / Math.max(0.5, maxPrice)) * 10),
  };
}

function marketPenalty(sticker, options = readOptions()) {
  return marketStatus(sticker, options).penalty;
}

function craftBudgetLimit(options = readOptions()) {
  return Number.isFinite(options.maxCraftPrice) ? options.maxCraftPrice : 5;
}

function isCraftBudgetEnabled(options = readOptions()) {
  return craftBudgetLimit(options) < 999;
}

function candidateMarketAmount(candidate, options = readOptions()) {
  const status = marketStatus(candidate.sticker, options);
  return status.state === "ok" && Number.isFinite(status.amount) ? status.amount : null;
}

function craftKnownCost(craft, options = readOptions()) {
  return (craft?.segments || []).reduce((sum, segment) => sum + (candidateMarketAmount(segment, options) || 0), 0);
}

function craftExceedsBudget(craft, options = readOptions()) {
  return isCraftBudgetEnabled(options) && craftKnownCost(craft, options) > craftBudgetLimit(options);
}

function isMarketBlocked(candidate, options = readOptions()) {
  const status = marketStatus(candidate.sticker, options);
  return options.requireSteamPrice && (status.state === "missing" || status.state === "expensive");
}

function isMarketUntrusted(candidate, options = readOptions()) {
  const status = marketStatus(candidate.sticker, options);
  return options.requireSteamPrice && (status.state === "pending" || status.state === "temporary" || status.state === "missing" || status.state === "expensive");
}

function effectPenalty(sticker, mode, budgetMode = "balanced") {
  const effect = (sticker.effect || "Other").toLowerCase();
  let penalty = 0;
  if (mode === "flashy") penalty += effect === "other" ? 4 : 0;
  if (mode === "paper") {
    if (["holo", "gold", "foil", "lenticular"].includes(effect)) penalty += 22;
    if (effect === "glitter") penalty += 10;
  }
  if (mode === "balanced" && effect === "gold") penalty += 10;
  if (budgetMode === "budget") {
    if (["holo", "foil", "lenticular"].includes(effect)) penalty += 12;
    if (effect === "gold") penalty += 28;
    if (effect === "glitter") penalty += 7;
  }
  if (budgetMode === "premium" && effect === "other") penalty += 5;
  return penalty;
}

function matchTokenInSticker(sticker, token) {
  const tokenNorm = normalizeText(token);
  if (!tokenNorm) return null;

  const allowLeet = tokenNorm.length >= 3 || /\d/.test(tokenNorm);
  const tokenVariants = allowLeet ? normalizedVariants(tokenNorm) : [tokenNorm];
  const coreVariants = [
    { core: sticker.normalizedCore, leet: false },
    { core: allowLeet ? sticker.leetCore : "", leet: true },
  ].filter((item, index, all) => item.core && all.findIndex((other) => other.core === item.core) === index);

  let best = null;
  for (const variant of tokenVariants) {
    for (const coreVariant of coreVariants) {
      const start = coreVariant.core.indexOf(variant);
      if (start < 0) continue;

      const end = start + variant.length;
      const extras = coreVariant.core.length - variant.length;
      const quality =
        variant.length * 100
        - extras * 8
        + (start === 0 ? 18 : 0)
        + (end === coreVariant.core.length ? 14 : 0)
        + (extras === 0 ? 24 : 0)
        - (coreVariant.leet ? 5 : 0);

      if (!best || quality > best.quality) {
        best = {
          core: coreVariant.core,
          token: variant,
          start,
          end,
          extras,
          leet: coreVariant.leet,
          quality,
        };
      }
    }
  }

  return best;
}

function estimateScrape(sticker, token) {
  const match = matchTokenInSticker(sticker, token);
  if (!match) return 0.42;

  const core = match.core;
  const start = match.start;
  const end = match.end;
  const extraLeft = Math.max(0, start);
  const extraRight = Math.max(0, core.length - end);
  const extras = extraLeft + extraRight;

  if (extras === 0) return 0.05;
  if (token.length >= 2 && extraLeft > 0 && extraRight === 0) return 0.3;
  if (extraLeft === 0 && extraRight > 0) return Math.min(0.48, 0.18 + extraRight * 0.04);
  if (extraLeft > 0 && extraRight > 0) return Math.min(0.76, 0.38 + extras * 0.03);
  return 0.42;
}

function placementNote(sticker, token, scrape) {
  const match = matchTokenInSticker(sticker, token);
  if (!match) return "Проверить вручную: фрагмент найден через альтернативное написание.";

  const core = match.core;
  const start = match.start;
  const end = match.end;
  const left = start > 0;
  const right = end < core.length;

  if (scrape <= 0.08) return "Почти без scrape, использовать форму логотипа или короткую надпись.";
  if (match.leet && token.length >= 4) return "Длинное совпадение через 1/I: оставить цельный фрагмент, лишний хвост спрятать scrape.";
  if (left && right) return "Лишние буквы с двух сторон: нужен scrape и плотное перекрытие соседями.";
  if (left) return "Лишнее слева: заводить под предыдущий стикер или сильнее тереть край.";
  if (right) return "Лишнее справа: заводить под следующий стикер или тереть хвост.";
  return "Проверить в превью CS2: scrape влияет на конкретный PNG по-разному.";
}

function buildCandidate(sticker, token, source, baseScore, override = {}) {
  const scrape = override.scrape ?? estimateScrape(sticker, token);
  const angle = override.angle ?? 0;
  const visible = override.visible || token.toUpperCase();
  const options = readOptions();
  return {
    id: `${source}-${sticker.id}-${token}-${override.family || sticker.core}`,
    token,
    visible,
    sticker,
    source,
    score: Math.round(baseScore - effectPenalty(sticker, options.effectMode, options.budgetMode) - marketPenalty(sticker, options)),
    scrape,
    angle,
    note: override.note || placementNote(sticker, token, scrape),
  };
}

function findByPreferredNames(names, family) {
  for (const exactName of names || []) {
    const found = state.stickers.find((sticker) => sticker.name === exactName);
    if (found) return found;
  }

  const familyVariants = normalizedVariants(family || "");
  return state.stickers.find((sticker) => familyVariants.some((familyNorm) => sticker.normalizedCore === familyNorm || sticker.leetCore === familyNorm))
    || state.stickers.find((sticker) => familyVariants.some((familyNorm) => sticker.normalizedCore.includes(familyNorm) || sticker.leetCore.includes(familyNorm)));
}

function manualCraftFor(target) {
  const recipe = MANUAL_CRAFTS[target];
  if (!recipe) return null;

  const segments = recipe.segments
    .map((segment) => {
      const sticker = findByPreferredNames(segment.names, segment.family);
      if (!sticker) return null;
      return buildCandidate(sticker, segment.token, "calibrated", 112, segment);
    })
    .filter(Boolean);

  if (segments.length !== recipe.segments.length) return null;
  return {
    id: `manual-${target}`,
    title: recipe.title,
    summary: recipe.summary,
    segments,
    score: 98,
    source: "calibrated",
  };
}

function knowledgeMatches(token, options) {
  const families = [...(LETTER_KNOWLEDGE[token] || []), ...(COMBO_KNOWLEDGE[token] || [])];
  const matches = [];

  for (const family of families) {
    const familyVariants = normalizedVariants(family);
    const stickers = state.stickers
      .filter((sticker) => familyVariants.some((familyNorm) => (
        sticker.normalizedCore === familyNorm
        || sticker.normalizedCore.includes(familyNorm)
        || sticker.leetCore === familyNorm
        || sticker.leetCore.includes(familyNorm)
      )))
      .sort((a, b) => {
        const aPenalty = effectPenalty(a, options.effectMode, options.budgetMode);
        const bPenalty = effectPenalty(b, options.effectMode, options.budgetMode);
        const aMarketPenalty = marketPenalty(a, options);
        const bMarketPenalty = marketPenalty(b, options);
        return (aPenalty + aMarketPenalty) - (bPenalty + bMarketPenalty) || a.name.length - b.name.length;
      })
      .slice(0, 4);

    for (const sticker of stickers) {
      const rotateZ = token === "z" && ["nemiga", "teamenvyus", "ecstatic"].some((name) => sticker.normalizedCore.includes(name));
      const rotateY = token === "y" && sticker.normalizedCore.includes("lambda");
      matches.push(
        buildCandidate(sticker, token, "alphabet", 94 + token.length * (token.length >= 3 ? 12 : 7), {
          family,
          angle: options.allowRotations && (rotateZ || rotateY) ? 90 : 0,
          scrape: token.length === 1 ? 0.08 : undefined,
          note:
            rotateZ && options.allowRotations
              ? "Повернуть N-форму на 90 градусов, чтобы получить Z."
              : rotateY && options.allowRotations
                ? "Перевернуть Lambda для Y-формы."
                : token.length === 1
                  ? "Использовать форму логотипа как букву; scrape минимальный."
                  : undefined,
        }),
      );
    }
  }

  return matches;
}

function dynamicMatches(token, options) {
  const matches = [];
  if (!token) return matches;

  for (const sticker of state.stickers) {
    const match = matchTokenInSticker(sticker, token);
    if (!match) continue;
    if (!options.preferAutographs && sticker.type === "Autograph" && match.core.length > token.length + 1) continue;

    const extras = match.extras;
    const exactBonus = extras === 0 ? 18 : 0;
    const prefixBonus = match.start === 0 ? 8 : 0;
    const suffixBonus = match.end === match.core.length ? 8 : 0;
    const longOrderedBonus = token.length >= 4 ? token.length * 8 : 0;
    const autographBonus = sticker.type === "Autograph" ? 7 : 0;
    const leetPenalty = match.leet ? 2 : 0;
    const baseScore =
      70
      + token.length * 12
      + exactBonus
      + prefixBonus
      + suffixBonus
      + longOrderedBonus
      + autographBonus
      - leetPenalty
      - Math.min(30, extras * 2.2);
    matches.push(buildCandidate(sticker, token, "name", baseScore));
  }

  return matches;
}

function candidatesFor(token, options) {
  const cacheKey = `${token}-${JSON.stringify(options)}`;
  if (state.candidateCache.has(cacheKey)) return state.candidateCache.get(cacheKey);

  const seen = new Set();
  const candidates = [...knowledgeMatches(token, options), ...dynamicMatches(token, options)]
    .filter((candidate) => {
      const key = `${candidate.sticker.id}-${candidate.token}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score || a.sticker.name.localeCompare(b.sticker.name));

  const marketReady = options.requireSteamPrice
    ? candidates.filter((candidate) => !isMarketBlocked(candidate, options))
    : candidates;
  const merged = marketReady
    .slice(0, options.requireSteamPrice ? 28 : 14);

  state.candidateCache.set(cacheKey, merged);
  return merged;
}

function buildCrafts(target, options) {
  state.candidateCache.clear();
  if (!target) return [];

  const dp = Array.from({ length: target.length + 1 }, () => []);
  dp[0] = [{ segments: [], score: 0, source: "generated", knownCost: 0 }];

  for (let index = 0; index < target.length; index += 1) {
    if (!dp[index].length) continue;
    const maxLen = Math.min(Math.max(options.maxChunk, LONG_ORDERED_FRAGMENT_LIMIT), target.length - index);

    for (let len = maxLen; len >= 1; len -= 1) {
      const token = target.slice(index, index + len);
      const candidates = candidatesFor(token, options).slice(0, 8);
      for (const partial of dp[index]) {
        if (partial.segments.length >= options.maxStickers) continue;
        for (const candidate of candidates) {
          const amount = candidateMarketAmount(candidate, options);
          const knownCost = partial.knownCost + (amount || 0);
          if (isCraftBudgetEnabled(options) && knownCost > craftBudgetLimit(options)) continue;
          dp[index + len].push({
            segments: [...partial.segments, candidate],
            score: partial.score + candidate.score + orderedFragmentBonus(len, candidate),
            source: "generated",
            knownCost,
          });
        }
      }
    }

    for (let cursor = index + 1; cursor <= target.length; cursor += 1) {
      dp[cursor] = topCrafts(dp[cursor], 48);
    }
  }

  let crafts = dp[target.length]
    .filter((craft) => craft.segments.length <= options.maxStickers)
    .filter((craft) => !craftExceedsBudget(craft, options))
    .map((craft, index) => finalizeCraft(craft, target, index))
    .sort((a, b) => b.score - a.score || a.segments.length - b.segments.length || a.knownCost - b.knownCost)
    .slice(0, 10);

  const manual = manualCraftFor(target);
  if (manual) crafts = [manual, ...crafts.filter((craft) => craft.id !== manual.id)].slice(0, 10);
  return crafts;
}

function orderedFragmentBonus(length, candidate) {
  const longBonus = length >= 4 ? 20 : 0;
  const suffixBonus = length >= 5 ? 24 : 0;
  const scrapePenalty = candidate.scrape >= 0.65 ? 12 : 0;
  return length * length * 12 - 34 + longBonus + suffixBonus - scrapePenalty;
}

function topCrafts(crafts, limit) {
  const unique = crafts
    .sort((a, b) => b.score - a.score)
    .filter((craft, index, all) => {
      const signature = craft.segments.map((segment) => `${segment.sticker.id}:${segment.token}`).join("|");
      return all.findIndex((item) => item.segments.map((segment) => `${segment.sticker.id}:${segment.token}`).join("|") === signature) === index;
    });

  const balanced = [];
  const perSlotCount = Math.max(4, Math.floor(limit / 6));
  for (let segmentCount = 0; segmentCount <= 5; segmentCount += 1) {
    balanced.push(...unique.filter((craft) => craft.segments.length === segmentCount).slice(0, perSlotCount));
  }

  const seen = new Set();
  return [...balanced, ...unique]
    .filter((craft) => {
      const signature = craft.segments.map((segment) => `${segment.sticker.id}:${segment.token}`).join("|");
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    })
    .slice(0, limit);
}

function finalizeCraft(craft, target, index) {
  const maxScore = Math.max(1, target.length * 116);
  const compactBonus = Math.max(0, 5 - craft.segments.length) * 12;
  const percent = Math.min(96, Math.max(42, Math.round((craft.score / maxScore) * 100 + compactBonus)));
  const segments = isRepeatedTarget(target)
    ? [...craft.segments].sort((a, b) => b.token.length - a.token.length || b.score - a.score)
    : craft.segments;
  return {
    ...craft,
    segments,
    id: `generated-${index}-${segments.map((segment) => segment.sticker.id).join("-")}`,
    title: segments.map((segment) => segment.visible).join(""),
    summary: summarizeSegments(segments),
    score: percent,
  };
}

function isRepeatedTarget(target) {
  return Boolean(target && /^([a-z0-9])\1+$/i.test(target));
}

function summarizeSegments(segments) {
  return `${segments.length} стикера, ${segments.filter((segment) => segment.scrape >= 0.25).length} с заметным scrape`;
}

function customCraftFromSegments(segments) {
  const avgScore = segments.reduce((sum, segment) => sum + segment.score, 0) / Math.max(1, segments.length);
  const compactBonus = Math.max(0, 5 - segments.length) * 4;
  const score = Math.min(99, Math.max(45, Math.round(avgScore * 0.78 + compactBonus)));
  return {
    id: `custom-${Date.now()}`,
    title: segments.map((segment) => segment.visible).join(""),
    summary: `${summarizeSegments(segments)} · ручной выбор`,
    segments,
    score,
    source: "custom",
  };
}

function runGenerator() {
  const options = readOptions();
  const target = cleanTarget(els.wordInput.value);
  state.target = target;
  state.priceRerankPasses = 0;
  state.crafts = buildCrafts(target, options);
  state.selectedCraft = state.crafts[0] || null;
  state.lastShareUrl = "";
  renderGenerator(target);
}

function craftSignature(craft) {
  return craft?.segments?.map((segment) => `${segment.sticker.id}:${segment.token}:${segment.visible}`).join("|") || "";
}

function craftHasBlockedMarket(craft, options = readOptions()) {
  return Boolean(craft?.segments?.some((segment) => isMarketBlocked(segment, options)));
}

function craftHasPendingMarket(craft, options = readOptions()) {
  return Boolean(craft?.segments?.some((segment) => {
    const status = marketStatus(segment.sticker, options);
    return status.state === "pending" || status.state === "temporary";
  }));
}

function craftHasUntrustedMarket(craft, options = readOptions()) {
  return Boolean(craft?.segments?.some((segment) => isMarketUntrusted(segment, options)) || craftExceedsBudget(craft, options));
}

function clearBlockedMarketCraft(target = state.target) {
  const options = readOptions();
  state.crafts = state.crafts.filter((craft) => !craftHasUntrustedMarket(craft, options));
  state.selectedCraft = state.crafts[0] || null;
  state.lastShareUrl = "";
  renderGenerator(target);
}

function handlePriceUpdate({ rerank = false } = {}) {
  if (!rerank) return;
  state.candidateCache.clear();
  if (state.selectedCraft?.source === "generated") {
    schedulePriceAwareRerank();
    return;
  }
  if (state.selectedCraft && (craftHasBlockedMarket(state.selectedCraft) || craftExceedsBudget(state.selectedCraft))) {
    clearBlockedMarketCraft();
    return;
  }
  renderSelectedCraft();
  renderResults();
  renderCandidateColumns();
}

function schedulePriceAwareRerank() {
  if (!state.backend.available || !state.selectedCraft || state.selectedCraft.source !== "generated") return;
  if (state.priceRerankPasses >= PRICE_RERANK_LIMIT) {
    if (craftHasBlockedMarket(state.selectedCraft) || craftExceedsBudget(state.selectedCraft)) clearBlockedMarketCraft();
    return;
  }

  clearTimeout(state.priceRerankTimer);
  state.priceRerankTimer = setTimeout(() => {
    state.priceRerankTimer = null;
    if (!state.selectedCraft || state.selectedCraft.source !== "generated") return;
    const target = state.target;
    if (state.priceRerankPasses >= PRICE_RERANK_LIMIT) {
      if (craftHasBlockedMarket(state.selectedCraft) || craftExceedsBudget(state.selectedCraft)) clearBlockedMarketCraft(target);
      return;
    }

    const before = craftSignature(state.selectedCraft);
    const nextCrafts = buildCrafts(target, readOptions());
    const nextCraft = nextCrafts[0] || null;
    state.priceRerankPasses += 1;
    if (!nextCraft) {
      state.crafts = [];
      state.selectedCraft = null;
      state.lastShareUrl = "";
      renderGenerator(target);
      return;
    }

    state.crafts = nextCrafts;
    state.selectedCraft = nextCraft;
    if (craftSignature(nextCraft) !== before) {
      state.lastShareUrl = "";
    }
    renderGenerator(target);
  }, 140);
}

function renderGenerator(target) {
  els.stickerCount.textContent = formatNumber.format(state.stickers.length);
  els.normalizedWord.textContent = target || "—";
  els.resultCount.textContent = String(state.crafts.length);

  const candidateTotal = [...state.candidateCache.values()].reduce((sum, candidates) => sum + candidates.length, 0);
  els.candidateCount.textContent = formatNumber.format(candidateTotal);

  renderSelectedCraft();
  renderResults();
  renderCandidateColumns();
  renderJourneyBar();
  if (state.selectedCraft) primeCandidatePrices();
}

function noCraftMessage() {
  const options = readOptions();
  if (state.backend.available && options.requireSteamPrice) {
    const stickerLimit = options.maxStickerPrice >= 999 ? "без лимита за наклейку" : `до ${formatUsd.format(options.maxStickerPrice)} за наклейку`;
    const craftLimit = options.maxCraftPrice >= 999 ? "без общего бюджета" : `до ${formatUsd.format(options.maxCraftPrice)} за крафт`;
    return `Нет доступной комбинации с ценой Steam: ${stickerLimit}, ${craftLimit}. Подними бюджет или отключи фильтр “только с ценой Steam”.`;
  }
  return "Для этого слова пока нет достаточно хороших совпадений.";
}

function renderSelectedCraft() {
  const craft = state.selectedCraft;
  if (!craft) {
    els.craftTitle.textContent = "Нет комбинации";
    els.scorePill.textContent = "0%";
    els.previewRail.innerHTML = `<div class="empty">${escapeHtml(noCraftMessage())}</div>`;
    els.craftNotes.innerHTML = "";
    els.exportBox.value = "";
    clearTimeout(state.visionTimer);
    clearTimeout(state.candidateVisionTimer);
    clearTimeout(state.moneyTimer);
    renderVisionPanel();
    renderMoneyPanel();
    renderJourneyBar();
    return;
  }

  els.craftTitle.textContent = craft.title;
  els.scorePill.textContent = `${craft.score}%`;
  els.previewRail.style.setProperty("--slot-count", craft.segments.length);
  els.previewRail.innerHTML = craft.segments.map(renderSlot).join("");
  hydratePrices(els.previewRail, { limit: PRICE_BATCH_SIZE, rerank: true });
  const knownCost = craftKnownCost(craft);
  const budgetNote = state.backend.available && knownCost > 0
    ? `Известная цена: ${formatUsd.format(knownCost)} из ${readOptions().maxCraftPrice >= 999 ? "безлимитного бюджета" : formatUsd.format(readOptions().maxCraftPrice)}. Цены без Steam не допускаются.`
    : "";
  const marketNote = craftHasPendingMarket(craft)
    ? "Часть цен Steam временно не подтверждена из-за ответа торговой площадки. Крафт предварительный: перед покупкой открой Steam Market."
    : "";
  els.craftNotes.innerHTML = [
    `Порядок: ${craft.segments.map((segment) => segment.visible).join(" + ")}`,
    craft.summary,
    budgetNote,
    marketNote,
    craft.source === "calibrated"
      ? "Калиброванный рецепт: scrape взят из твоего примера и округлен до процентов."
      : craft.source === "custom"
        ? "Ручной выбор: замены из блока ниже уже применены к верхнему крафту."
        : "Сгенерировано из базы названий: финальный вид нужно проверить в CS2 preview.",
  ]
    .filter(Boolean)
    .map((note) => `<div class="note">${escapeHtml(note)}</div>`)
    .join("");

  renderExportBox();
  scheduleVisionPanel();
  scheduleMoneyPanel();
  renderJourneyBar();
}

function renderSlot(segment) {
  const name = segment.sticker.name.replace(/^Sticker\s+\|\s+/i, "");
  return `
    <article class="slot">
      <div class="slot-art" style="--scrape:${segment.scrape}; --angle:${segment.angle}deg">
        <img src="${segment.sticker.image}" alt="${escapeHtml(name)}" loading="eager" />
        <span class="visible-token">${escapeHtml(segment.visible)}</span>
      </div>
      <div class="slot-meta">
        <p class="slot-name" title="${escapeHtml(name)}">${escapeHtml(name)}</p>
        <p class="slot-instructions">scrape ${formatPercent.format(segment.scrape)} · ${escapeHtml(segment.note)}</p>
        <div class="slot-links">
          ${renderPriceChip(segment.sticker)}
          <a class="slot-link" href="${steamMarketUrl(segment.sticker)}" target="_blank" rel="noreferrer">Steam Market</a>
        </div>
      </div>
    </article>
  `;
}

function renderResults() {
  if (!state.crafts.length) {
    els.resultsList.innerHTML = `<div class="empty">${escapeHtml(noCraftMessage())}</div>`;
    return;
  }

  els.resultsList.innerHTML = state.crafts
    .map((craft) => {
      const active = craft.id === state.selectedCraft?.id ? " active" : "";
      const selected = craft.id === state.selectedCraft?.id ? "true" : "false";
      return `
        <article class="result-card${active}" role="button" tabindex="0" aria-selected="${selected}" data-craft-id="${craft.id}">
          <div>
            <p class="result-title">${escapeHtml(craft.title)} · ${craft.score}%</p>
            <p class="result-subtitle">${escapeHtml(craft.summary)}</p>
          </div>
          <div class="mini-strip">
            ${craft.segments
              .map((segment) => `<img src="${segment.sticker.image}" alt="${escapeHtml(segment.sticker.core)}" loading="lazy" />`)
              .join("")}
          </div>
        </article>
      `;
    })
    .join("");

  els.resultsList.querySelectorAll(".result-card").forEach((card) => {
    const select = () => {
      state.selectedCraft = state.crafts.find((craft) => craft.id === card.dataset.craftId);
      state.lastShareUrl = "";
      renderSelectedCraft();
      renderResults();
      renderCandidateColumns();
    };
    card.addEventListener("click", select);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select();
      }
    });
  });
}

function renderCandidateColumns() {
  const craft = state.selectedCraft;
  if (!craft) {
    clearTimeout(state.candidateVisionTimer);
    els.candidateColumns.innerHTML = `<div class="empty">${escapeHtml(noCraftMessage())}</div>`;
    return;
  }

  const options = readOptions();
  const groups = craft.segments.map((segment, segmentIndex) => {
    const candidates = candidatesFor(segment.token, options).slice(0, 3);
    return `
      <div class="candidate-group">
        <h3>${escapeHtml(segment.visible)}</h3>
        ${candidates.map((candidate, candidateIndex) => renderCandidateItem(candidate, segment, segmentIndex, candidateIndex)).join("") || `<div class="empty">Нет замен</div>`}
      </div>
    `;
  });

  els.candidateColumns.innerHTML = groups.join("");
  bindCandidateInteractions();
  hydratePrices(els.candidateColumns, { limit: PRICE_BATCH_SIZE, rerank: true });
  scheduleCandidateVision();
}

function candidateFitLabel(candidate) {
  const status = marketStatus(candidate.sticker);
  if (status.state === "missing") return "нет цены Steam";
  if (status.state === "temporary") return "Steam временно занят";
  if (status.state === "expensive") return `дороже лимита ${formatUsd.format(status.amount)}`;
  if (candidate.source === "calibrated") return "проверенный рецепт";
  if (candidate.source === "alphabet") return candidate.scrape <= 0.12 ? "чистая буква" : "буквенная база";
  if (candidate.token.length >= 4) return "длинный фрагмент";
  if (candidate.scrape <= 0.1) return "почти без износа";
  if (candidate.scrape <= 0.35) return "умеренный scrape";
  if (candidate.scrape <= 0.6) return "нужен overlap";
  return "сложный scrape";
}

function renderCandidateItem(candidate, selectedSegment, segmentIndex, candidateIndex) {
  const scrape = formatPercent.format(candidate.scrape);
  const active = candidate.sticker.id === selectedSegment.sticker.id && candidate.token === selectedSegment.token ? " active" : "";
  const displayName = stickerDisplayName(candidate.sticker);
  return `
    <div class="candidate-item${active}" data-segment-index="${segmentIndex}" data-candidate-index="${candidateIndex}">
      <img src="${candidate.sticker.image}" alt="${escapeHtml(candidate.sticker.core)}" loading="lazy" />
      <div class="candidate-body">
        <strong title="${escapeHtml(candidate.sticker.name)}">${escapeHtml(displayName)}</strong>
        <div class="candidate-meta">
          <span>${escapeHtml(candidateFitLabel(candidate))}</span>
          <span>scrape ${scrape}</span>
          <span>матч ${candidate.score}</span>
        </div>
        <em data-cv>Читаемость: проверяю</em>
        <div class="candidate-actions">
          ${renderPriceChip(candidate.sticker)}
          <a class="market-link" href="${steamMarketUrl(candidate.sticker)}" target="_blank" rel="noreferrer" aria-label="Открыть ${escapeHtml(displayName)} в Steam Market">Steam</a>
          <button type="button" class="candidate-apply" aria-label="Выбрать ${escapeHtml(displayName)} для фрагмента ${escapeHtml(selectedSegment.visible)}">Выбрать</button>
        </div>
      </div>
    </div>
  `;
}

function bindCandidateInteractions() {
  els.candidateColumns.querySelectorAll(".candidate-item").forEach((item) => {
    const apply = () => {
      const candidate = candidateFromElement(item);
      const segmentIndex = Number(item.dataset.segmentIndex);
      if (candidate) replaceSegment(segmentIndex, candidate);
    };
    item.addEventListener("click", (event) => {
      if (event.target.closest("a")) return;
      apply();
    });
    item.querySelector(".candidate-apply")?.addEventListener("click", (event) => {
      event.stopPropagation();
      apply();
    });
  });
}

function candidateFromElement(item) {
  const craft = state.selectedCraft;
  if (!craft) return null;
  const segment = craft.segments[Number(item.dataset.segmentIndex)];
  if (!segment) return null;
  return candidatesFor(segment.token, readOptions())[Number(item.dataset.candidateIndex)] || null;
}

function replaceSegment(segmentIndex, candidate) {
  if (!state.selectedCraft) return;
  const segments = state.selectedCraft.segments.map((segment, index) => (index === segmentIndex ? { ...candidate } : segment));
  state.selectedCraft = customCraftFromSegments(segments);
  state.crafts = [state.selectedCraft, ...state.crafts.filter((craft) => craft.source !== "custom")].slice(0, 10);
  state.lastShareUrl = "";
  renderSelectedCraft();
  renderResults();
  renderCandidateColumns();
}

function renderBrowser() {
  const query = normalizeText(state.browserQuery);
  const items = state.stickers
    .filter((sticker) => !query || sticker.searchable.includes(query) || sticker.leetSearchable.includes(normalizeLeetText(query)))
    .slice(0, 96);

  if (!items.length) {
    els.stickerGrid.innerHTML = `<div class="empty">Ничего не найдено. Попробуй название команды, игрока или турнир: Apeks, FaZe, Paris.</div>`;
    return;
  }

  els.stickerGrid.innerHTML = items
    .map(
      (sticker) => `
        <div class="sticker-item">
          <img src="${sticker.image}" alt="${escapeHtml(sticker.core)}" loading="lazy" />
          <div>
            <strong title="${escapeHtml(sticker.name)}">${escapeHtml(sticker.core)}</strong>
            <span>${escapeHtml(sticker.effect || "Other")} · ${escapeHtml(sticker.type || "Sticker")}</span>
            ${renderPriceChip(sticker)}
            <a class="market-link" href="${steamMarketUrl(sticker)}" target="_blank" rel="noreferrer">Steam Market</a>
          </div>
        </div>
      `,
    )
    .join("");
  hydratePrices(els.stickerGrid, { limit: PRICE_BATCH_SIZE, rerank: false });
}

async function hydratePrices(root = document, { limit = PRICE_BATCH_SIZE, rerank = false } = {}) {
  if (!state.backend.available) return;
  const chips = [...root.querySelectorAll("[data-price-name]")];
  if (!chips.length) return;

  for (const chip of chips) {
    const cached = state.priceCache.get(chip.dataset.priceName);
    if (cached) {
      chip.textContent = priceLabel(cached);
      chip.title = priceTitle(cached);
      chip.classList.toggle("price-chip--missing", priceAmount(cached) === null && !isTemporaryPriceError(cached));
      chip.classList.toggle("price-chip--temporary", isTemporaryPriceError(cached));
      chip.classList.toggle("price-chip--loading", false);
    }
  }

  const names = [...new Set(chips.map((chip) => chip.dataset.priceName))]
    .filter((name) => !state.priceCache.has(name) && !state.pricePending.has(name))
    .slice(0, limit);
  if (!names.length) return;
  names.forEach((name) => state.pricePending.add(name));

  try {
    const payload = await apiRequest("/api/prices", {
      method: "POST",
      body: JSON.stringify({ names, currency: "1" }),
    });
    for (const [name, price] of Object.entries(payload.data || {})) {
      state.priceCache.set(name, price);
    }
    handlePriceUpdate({ rerank });
  } catch (error) {
    console.warn("Price hydration failed", error);
    markPricesUnavailable(names, error.message);
    handlePriceUpdate({ rerank });
  } finally {
    names.forEach((name) => state.pricePending.delete(name));
  }

  for (const chip of document.querySelectorAll("[data-price-name]")) {
    const cached = state.priceCache.get(chip.dataset.priceName);
    if (!cached) continue;
    chip.textContent = priceLabel(cached);
    chip.title = priceTitle(cached);
    chip.classList.toggle("price-chip--missing", priceAmount(cached) === null && !isTemporaryPriceError(cached));
    chip.classList.toggle("price-chip--temporary", isTemporaryPriceError(cached));
    chip.classList.toggle("price-chip--loading", false);
  }
}

async function primeCandidatePrices(limit = PRICE_BATCH_SIZE) {
  if (!state.backend.available) return;

  const names = [...new Set(
    [...state.candidateCache.values()]
      .flat()
      .map((candidate) => stickerMarketName(candidate.sticker)),
  )]
    .filter((name) => !state.priceCache.has(name) && !state.pricePending.has(name))
    .slice(0, limit);

  if (!names.length) return;
  names.forEach((name) => state.pricePending.add(name));

  try {
    const payload = await apiRequest("/api/prices", {
      method: "POST",
      body: JSON.stringify({ names, currency: "1" }),
    });
    for (const [name, price] of Object.entries(payload.data || {})) {
      state.priceCache.set(name, price);
    }
    handlePriceUpdate({ rerank: true });
  } catch (error) {
    console.warn("Candidate price prefetch failed", error);
    markPricesUnavailable(names, error.message);
    handlePriceUpdate({ rerank: true });
  } finally {
    names.forEach((name) => state.pricePending.delete(name));
  }
}

function cvImageUrl(url) {
  if (!/^https?:\/\//i.test(url)) return url;
  return `${CV_PROXY}${encodeURIComponent(url.replace(/^https?:\/\//i, ""))}`;
}

function loadImageForVision(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image load failed"));
    image.src = cvImageUrl(url);
  });
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

async function analyzeStickerVisual(sticker) {
  if (state.cvCache.has(sticker.id)) return state.cvCache.get(sticker.id);

  const promise = (async () => {
    const image = await loadImageForVision(sticker.image);
    const size = 96;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(image, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let count = 0;
    let minX = size;
    let minY = size;
    let maxX = 0;
    let maxY = 0;
    let luminanceSum = 0;
    let luminanceSq = 0;
    let leftAlpha = 0;
    let rightAlpha = 0;
    let topAlpha = 0;
    let bottomAlpha = 0;

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const offset = (y * size + x) * 4;
        const alpha = data[offset + 3];
        if (alpha <= 12) continue;
        const lum = 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
        count += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        luminanceSum += lum;
        luminanceSq += lum * lum;
        if (x < size / 2) leftAlpha += alpha;
        else rightAlpha += alpha;
        if (y < size / 2) topAlpha += alpha;
        else bottomAlpha += alpha;
      }
    }

    if (!count) throw new Error("empty alpha mask");

    const density = count / (size * size);
    const bboxWidth = (maxX - minX + 1) / size;
    const bboxHeight = (maxY - minY + 1) / size;
    const aspect = bboxWidth / Math.max(0.01, bboxHeight);
    const avgLum = luminanceSum / count;
    const contrast = clamp(Math.sqrt(Math.max(0, luminanceSq / count - avgLum * avgLum)) / 96);
    const horizontalBalance = 1 - Math.abs(leftAlpha - rightAlpha) / Math.max(1, leftAlpha + rightAlpha);
    const verticalBalance = 1 - Math.abs(topAlpha - bottomAlpha) / Math.max(1, topAlpha + bottomAlpha);
    const scrapeTolerance = clamp(0.24 + (1 - density) * 0.22 + contrast * 0.34 + horizontalBalance * 0.12);

    return {
      ok: true,
      density,
      bboxWidth,
      bboxHeight,
      aspect,
      contrast,
      horizontalBalance,
      verticalBalance,
      scrapeTolerance,
    };
  })().catch((error) => ({
    ok: false,
    error: error.message,
    density: 0,
    bboxWidth: 0,
    bboxHeight: 0,
    aspect: 1,
    contrast: 0,
    horizontalBalance: 0,
    verticalBalance: 0,
    scrapeTolerance: 0,
  }));

  state.cvCache.set(sticker.id, promise);
  return promise;
}

function serverVisionKey(segment) {
  return `${segment.sticker.id}:${segment.token}:${Number(segment.scrape || 0).toFixed(3)}:${Number(segment.angle || 0)}`;
}

function segmentVisionPayload(segment) {
  return {
    token: segment.token,
    visible: segment.visible,
    scrape: Number(segment.scrape || 0),
    angle: Number(segment.angle || 0),
    sticker: {
      id: segment.sticker.id,
      name: segment.sticker.name,
      image: segment.sticker.image,
      effect: segment.sticker.effect,
      type: segment.sticker.type,
      market_hash_name: segment.sticker.market_hash_name || segment.sticker.name,
    },
  };
}

function serverVisionRow(segment, result) {
  if (result?.ok && result.fit) {
    return { segment, metrics: result.metrics, fit: result.fit };
  }
  return {
    segment,
    metrics: null,
    fit: {
      score: 0,
      note: result?.error || "Визуальная оценка недоступна для этого изображения",
    },
  };
}

async function analyzeSegmentsVisual(segments) {
  if (!state.backend.available) {
    return Promise.all(
      segments.map(async (segment) => {
        const metrics = await analyzeStickerVisual(segment.sticker);
        return { segment, metrics, fit: visionFitForSegment(segment, metrics) };
      }),
    );
  }

  const keyed = segments.map((segment) => ({ segment, key: serverVisionKey(segment) }));
  const missing = keyed.filter(({ key }) => !state.serverVisionCache.has(key));

  if (missing.length) {
    const batch = apiRequest("/api/vision", {
      method: "POST",
      body: JSON.stringify({ segments: missing.map(({ segment }) => segmentVisionPayload(segment)) }),
    })
      .then((payload) => payload.data || [])
      .catch((error) => {
        console.warn("Server vision failed", error);
        return missing.map(({ segment }) => ({ ok: false, error: error.message, token: segment.token }));
      });

    missing.forEach(({ key, segment }, index) => {
      state.serverVisionCache.set(
        key,
        batch.then((rows) => serverVisionRow(segment, rows[index])),
      );
    });
  }

  return Promise.all(keyed.map(({ key }) => state.serverVisionCache.get(key)));
}

function visionFitForSegment(segment, metrics) {
  if (!metrics.ok) {
    return {
      score: 0,
      note: "Визуальная оценка недоступна для этого изображения",
    };
  }

  const desiredAspect = segment.token.length >= 2 ? clamp(segment.token.length * 0.72, 1.15, 2.8) : 1;
  const aspectScore = clamp(1 - Math.abs(metrics.aspect - desiredAspect) / Math.max(desiredAspect, 1));
  const densityScore = clamp(1 - Math.abs(metrics.density - 0.28) / 0.36);
  const contrastScore = metrics.contrast;
  const balanceScore = segment.token.length === 1 ? metrics.horizontalBalance : (metrics.horizontalBalance + metrics.verticalBalance) / 2;
  const scrapeScore = clamp(metrics.scrapeTolerance - Math.max(0, segment.scrape - 0.15) * 0.45);
  const score = Math.round((aspectScore * 0.28 + densityScore * 0.2 + contrastScore * 0.24 + balanceScore * 0.12 + scrapeScore * 0.16) * 100);

  return {
    score,
    note: `bbox ${Math.round(metrics.bboxWidth * 100)}×${Math.round(metrics.bboxHeight * 100)} · плотн. ${Math.round(metrics.density * 100)}% · контраст ${Math.round(metrics.contrast * 100)}%`,
  };
}

function readabilityComment(score) {
  if (score <= 0) return "Автооценка не сработала. Проверь вручную в CS2 inspect.";
  if (score >= 78) return "Хорошо читается по форме PNG.";
  if (score >= 62) return "Выглядит рабочим, но проверь в CS2 inspect.";
  if (score >= 45) return "Средняя читаемость: может зависеть от позиции на оружии.";
  return "Слабая форма для буквы, лучше поискать замену.";
}

function readabilityLabel(fit) {
  const score = Number(fit?.score || 0);
  return score > 0 ? `Читаемость ${score}%` : "Читаемость: проверить вручную";
}

function scheduleVisionPanel() {
  clearTimeout(state.visionTimer);
  state.visionTimer = setTimeout(() => {
    renderVisionPanel();
  }, 900);
}

async function renderVisionPanel() {
  const craft = state.selectedCraft;
  const run = ++state.visionRun;
  if (!craft) {
    els.visionStatus.textContent = "нет крафта";
    els.visionPanel.removeAttribute("aria-busy");
    els.visionPanel.innerHTML = "";
    return;
  }

  els.visionStatus.textContent = "проверяю PNG...";
  els.visionPanel.setAttribute("aria-busy", "true");
  els.visionPanel.innerHTML = craft.segments
    .map((segment) => `<div class="vision-card loading-skeleton"><h3>${escapeHtml(segment.visible)}</h3><p>Считаю контраст, плотность и форму.</p></div>`)
    .join("");

  const rows = await analyzeSegmentsVisual(craft.segments);

  if (run !== state.visionRun) return;
  const avg = Math.round(rows.reduce((sum, row) => sum + row.fit.score, 0) / Math.max(1, rows.length));
  els.visionStatus.textContent = `читаемость ${avg}%`;
  els.visionPanel.removeAttribute("aria-busy");
  els.visionPanel.innerHTML = rows
    .map(
      ({ segment, fit }) => `
        <div class="vision-card">
          <h3>${escapeHtml(segment.visible)} · ${fit.score > 0 ? `${fit.score}%` : "ручная проверка"}</h3>
          <div class="vision-meter" style="--value:${fit.score}%"><span></span></div>
          <p>${escapeHtml(segment.sticker.core)}</p>
          <p>${escapeHtml(readabilityComment(fit.score))}</p>
        </div>
      `,
    )
    .join("");
}

function scheduleCandidateVision() {
  clearTimeout(state.candidateVisionTimer);
  state.candidateVisionTimer = setTimeout(() => {
    hydrateCandidateVision();
  }, 900);
}

async function hydrateCandidateVision() {
  const items = [...els.candidateColumns.querySelectorAll(".candidate-item")];
  const entries = items
    .map((item) => ({ item, candidate: candidateFromElement(item), marker: item.querySelector("[data-cv]") }))
    .filter((entry) => entry.candidate && entry.marker);
  const rows = await analyzeSegmentsVisual(entries.map((entry) => entry.candidate));
  rows.forEach((row, index) => {
    const entry = entries[index];
    if (entry?.item.isConnected) {
      entry.marker.textContent = readabilityLabel(row.fit);
      entry.marker.title = row.fit.note || "";
    }
  });
}

function buildMoneyPayload(craft) {
  const options = readOptions();
  const alternatives = craft.segments.flatMap((segment, segmentIndex) =>
    candidatesFor(segment.token, options)
      .slice(0, 12)
      .map((candidate) => ({
        ...segmentVisionPayload(candidate),
        segment_index: segmentIndex,
      })),
  );

  return {
    word: state.target,
    craft: {
      title: craft.title,
      summary: craft.summary,
      score: craft.score,
      source: craft.source,
    },
    segments: craft.segments.map((segment, segmentIndex) => ({
      ...segmentVisionPayload(segment),
      segment_index: segmentIndex,
    })),
    alternatives,
    currency: "1",
  };
}

function moneyGrade(score) {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
}

function moneyValue(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "нет данных";
  return `${Math.round(Number(value))}${suffix}`;
}

function renderKpi(label, value, hint) {
  return `
    <div class="money-kpi">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <em>${escapeHtml(hint)}</em>
    </div>
  `;
}

function publicOpportunityLabel(kind) {
  const labels = {
    margin: "Дешевле",
    readability: "Читаемее",
    liquidity: "Легче купить",
    premium: "Интереснее визуально",
  market_check: "Проверить цену",
  };
  return labels[kind] || "Альтернатива";
}

function publicOpportunityReason(item) {
  if (item.price === null || item.price === undefined || item.price_label === "n/a") {
    return "Steam не отдал цену: считаем, что стикера нет на торговой площадке.";
  }
  if (item.kind === "margin") return "Похожа по читаемости и может снизить бюджет.";
  if (item.kind === "readability") return "Буква должна читаться заметнее.";
  if (item.kind === "liquidity") return "У стикера выше объём на Steam Market.";
  if (item.kind === "premium") return "Редкий визуальный tier, но финальную цену нужно проверить.";
  return "Есть смысл сравнить с текущим вариантом.";
}

function publicOpportunityPrice(item) {
  if (item.price === null || item.price === undefined || item.price_label === "n/a") return "Нет цены Steam";
  const label = item.price_label || formatUsd.format(item.price);
  if (item.price_delta === null || item.price_delta === undefined) return `Цена: ${label}`;
  if (item.price_delta < 0) return `Цена: ${label} · дешевле на ${formatUsd.format(Math.abs(item.price_delta))}`;
  if (item.price_delta > 0) return `Цена: ${label} · дороже на ${formatUsd.format(item.price_delta)}`;
  return `Цена: ${label} · без изменения`;
}

function visibleOpportunities(opportunities) {
  const seen = new Set();
  const output = [];
  for (const item of opportunities || []) {
    const key = `${item.segment_index}-${item.sticker_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
    if (output.length >= 4) break;
  }
  return output;
}

function renderOpportunityCard(item) {
  const cvDelta = item.cv_delta >= 0 ? `+${item.cv_delta} к читаемости` : `${item.cv_delta} к читаемости`;
  const displayName = stickerDisplayName(item.sticker);
  return `
    <article class="opportunity-card">
      <img src="${item.image}" alt="${escapeHtml(item.sticker)}" loading="lazy" />
      <div>
        <strong title="${escapeHtml(item.sticker)}">${escapeHtml(displayName)}</strong>
        <span class="opportunity-tag">${escapeHtml(publicOpportunityLabel(item.kind))}</span>
        <span>${escapeHtml(publicOpportunityReason(item))}</span>
        <span>${escapeHtml(publicOpportunityPrice(item))}</span>
        <span>${escapeHtml(cvDelta)}</span>
      </div>
      <button type="button" data-money-replace="${item.segment_index}" data-sticker-id="${escapeHtml(item.sticker_id)}">Применить</button>
    </article>
  `;
}

function renderMoneyInsights(data) {
  const summary = data.summary || {};
  const opportunities = visibleOpportunities(data.opportunities || []);
  state.moneyOpportunities = opportunities;
  state.moneySummary = summary;

  for (const [name, price] of Object.entries(data.prices || {})) {
    state.priceCache.set(name, price);
  }
  hydratePrices(document);

  const totalCost = Number.isFinite(summary.total_cost)
    ? `${summary.unknown_prices ? "от " : ""}${formatUsd.format(summary.total_cost)}`
    : "цена не найдена";
  const unknownPriceText = summary.unknown_prices ? `${summary.unknown_prices} цен не найдены автоматически` : "цены найдены";
  const publicRisks = [
    summary.unknown_prices ? `${summary.unknown_prices} стикер(а) нужно открыть в Steam вручную: API не всегда отдаёт цену.` : "",
    summary.scrape_risk >= 50 ? "Высокий scrape может ухудшить вид и цену крафта." : "Scrape выглядит умеренным, но финальный вид всё равно проверь в CS2 inspect.",
    summary.liquidity < 35 ? "Низкий объём Steam: покупка или перепродажа может занять время." : "Цена и объём Steam меняются, это не гарантия прибыли.",
  ].filter(Boolean);
  els.moneyStatus.textContent = "оценка готова";
  setStatusMode(els.moneyStatus, "ok");
  els.moneyPanel.innerHTML = `
    <div class="money-kpis">
      ${renderKpi("Цена стикеров", totalCost, unknownPriceText)}
      ${renderKpi("Читаемость", moneyValue(summary.avg_cv, "/100"), "визуальная оценка PNG")}
      ${renderKpi("Ликвидность", moneyValue(summary.liquidity, "/100"), "по объёму Steam")}
      ${renderKpi("Риск износа", moneyValue(summary.scrape_risk, "%"), "чем ниже, тем безопаснее")}
    </div>
    <div class="money-split">
      <div>
        <div class="section-head">
          <div>
            <p class="eyebrow">проверка крафта</p>
            <h2>Что можно улучшить</h2>
          </div>
        </div>
        <div class="opportunity-list">
          ${opportunities.map(renderOpportunityCard).join("") || `<div class="empty">Явных улучшений не найдено. Текущий вариант выглядит сбалансированным, но цену всё равно проверь перед покупкой.</div>`}
        </div>
      </div>
      <aside class="pitch-box money-guide">
        <strong>Перед покупкой</strong>
        <p>Это оценка крафта, а не инвестиционный совет. Цена ниже — это только цена стикеров, без стоимости платного подбора.</p>
        <strong>Что проверить</strong>
        <ul class="risk-list">
          ${publicRisks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}
        </ul>
        ${shouldShowOperator() && data.pitch ? `<details class="operator-note"><summary>Операторское описание</summary><p>${escapeHtml(data.pitch)}</p><button type="button" data-copy-pitch>Скопировать описание</button></details>` : ""}
      </aside>
    </div>
  `;
  renderJourneyBar();

  els.moneyPanel.querySelectorAll("[data-money-replace]").forEach((button) => {
    button.addEventListener("click", () => {
      const segmentIndex = Number(button.dataset.moneyReplace);
      const segment = state.selectedCraft?.segments[segmentIndex];
      const candidate = segment
        ? candidatesFor(segment.token, readOptions()).find((item) => String(item.sticker.id) === button.dataset.stickerId)
        : null;
      if (candidate) replaceSegment(segmentIndex, candidate);
    });
  });

  const pitchButton = els.moneyPanel.querySelector("[data-copy-pitch]");
  pitchButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(data.pitch || "");
      pitchButton.textContent = "Описание скопировано";
      setTimeout(() => {
        pitchButton.textContent = "Скопировать описание";
      }, 1200);
    } catch {
      pitchButton.textContent = "Скопируй из блока";
    }
  });
}

function scheduleMoneyPanel() {
  clearTimeout(state.moneyTimer);
  state.moneyTimer = setTimeout(() => {
    renderMoneyPanel();
  }, 1200);
}

function moneyRequestKey(craft) {
  const options = readOptions();
  const prices = (craft?.segments || []).map((segment) => {
    const name = stickerMarketName(segment.sticker);
    const price = state.priceCache.get(name);
    return `${name}:${priceLabel(price)}`;
  });
  return JSON.stringify({
    craft: craftSignature(craft),
    maxStickerPrice: options.maxStickerPrice,
    maxCraftPrice: options.maxCraftPrice,
    requireSteamPrice: options.requireSteamPrice,
    prices,
  });
}

async function renderMoneyPanel() {
  const craft = state.selectedCraft;
  const run = ++state.moneyRun;
  state.moneyOpportunities = [];
  state.moneySummary = null;

  if (!craft) {
    els.moneyStatus.textContent = "нет крафта";
    setStatusMode(els.moneyStatus, "warn");
    els.moneyPanel.removeAttribute("aria-busy");
    els.moneyPanel.innerHTML = "";
    return;
  }

  if (!state.backend.available) {
    els.moneyStatus.textContent = "нужен backend";
    setStatusMode(els.moneyStatus, "warn");
    els.moneyPanel.removeAttribute("aria-busy");
    els.moneyPanel.innerHTML = `<div class="empty">Оценка цены и читаемости включается через backend. Сам подбор стикеров уже работает в браузере.</div>`;
    return;
  }

  const requestKey = moneyRequestKey(craft);
  if (state.moneyLastKey === requestKey || state.moneyInFlightKey === requestKey) return;
  state.moneyInFlightKey = requestKey;
  els.moneyStatus.textContent = "считаю цену и риски...";
  setStatusMode(els.moneyStatus, "warn");
  els.moneyPanel.setAttribute("aria-busy", "true");
  els.moneyPanel.innerHTML = `<div class="empty loading-skeleton">Сканирую цену, читаемость, ликвидность и лучшие замены...</div>`;

  try {
    const payload = await apiRequest("/api/craft-insights", {
      method: "POST",
      body: JSON.stringify(buildMoneyPayload(craft)),
    });
    if (run !== state.moneyRun) return;
    state.moneyLastKey = requestKey;
    els.moneyPanel.removeAttribute("aria-busy");
    renderMoneyInsights(payload.data || {});
  } catch (error) {
    if (run !== state.moneyRun) return;
    console.warn("Craft valuation failed", error);
    els.moneyStatus.textContent = "ошибка";
    setStatusMode(els.moneyStatus, "warn");
    els.moneyPanel.removeAttribute("aria-busy");
    els.moneyPanel.innerHTML = `<div class="empty">Не удалось посчитать цену стикеров и риски: ${escapeHtml(error.message)}</div>`;
  } finally {
    if (state.moneyInFlightKey === requestKey) state.moneyInFlightKey = "";
  }
}

function checkoutStatusFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const checkout = params.get("checkout");
  if (checkout === "success") return "Оплата прошла. Я скоро вернусь с подбором.";
  if (checkout === "cancel") return "Оплата отменена. Можно оставить заявку и продолжить вручную.";
  return "";
}

function fallbackMonetization() {
  return {
    owner: "AFETZ",
    payment_ready: false,
    lead_capture_ready: false,
    affiliate_disclosure: "Цена пакета — стоимость услуги по подбору. Стикеры покупаются отдельно по актуальным ценам Steam. Расчёты ориентировочные и не гарантируют прибыль. Контакт нужен только для ответа по заявке.",
    plans: [
      {
        id: "pro",
        name: "Быстрый разбор",
        price: "$9",
        interval: "за услугу",
        tagline: "Готовый порядок стикеров, scrape, цена и список замен под один ник.",
        features: ["Порядок нанесения", "Steam buy-list", "Лучшие замены"],
        payment_url: "",
      },
      {
        id: "audit",
        name: "Ручной аудит ника",
        price: "$19",
        interval: "за услугу",
        tagline: "Ручная проверка ника с тремя бюджетами и рисками по читаемости.",
        features: ["3 бюджета", "Риски scrape", "Ручная проверка"],
        payment_url: "",
      },
      {
        id: "creator",
        name: "Пак для автора",
        price: "$49",
        interval: "за услугу",
        tagline: "10 крафтов для контента, тексты продажи и buy-list по маркету.",
        features: ["10 share-ссылок", "Тексты продажи", "Контент-пак"],
        payment_url: "",
      },
    ],
    affiliate_links: [],
  };
}

async function loadMonetization() {
  if (!state.backend.available) {
    state.monetization = fallbackMonetization();
    renderRevenuePanel();
    return;
  }

  try {
    const payload = await apiRequest("/api/monetization");
    state.monetization = payload.data || fallbackMonetization();
  } catch (error) {
    console.warn("Monetization config failed", error);
    state.monetization = fallbackMonetization();
  }
  renderRevenuePanel();
}

function selectedPlanId() {
  return state.monetization?.plans?.[0]?.id || "pro";
}

const PLAN_DISPLAY_COPY = {
  pro: {
    name: "Быстрый разбор",
    interval: "за услугу",
    tagline: "Готовый порядок стикеров, scrape, найденные Steam-цены и список замен под один ник.",
    features: ["Порядок нанесения", "Scrape и риски", "Steam-цены и замены"],
  },
  audit: {
    name: "Ручной аудит ника",
    interval: "за услугу",
    tagline: "Ручная проверка ника с несколькими бюджетами и понятным списком покупок.",
    features: ["3 бюджета", "Проверка читаемости", "Список покупок"],
  },
  creator: {
    name: "Пак для автора",
    interval: "за услугу",
    tagline: "Подборка из 10 крафтов для контента с share-ссылками и покупочным списком.",
    features: ["10 крафтов", "Share-ссылки", "Buy-list"],
  },
};

function planForDisplay(plan) {
  const copy = PLAN_DISPLAY_COPY[plan.id] || {};
  return {
    ...plan,
    ...copy,
    price: plan.price || copy.price || "",
    payment_url: plan.payment_url,
    checkout_ready: plan.checkout_ready,
  };
}

function leadPayload(planId) {
  const form = els.revenuePanel.querySelector("[data-lead-form]");
  const formData = form ? new FormData(form) : new FormData();
  return {
    plan: planId || formData.get("plan") || selectedPlanId(),
    word: state.target,
    contact: formData.get("contact") || "",
    email: formData.get("email") || "",
    discord: formData.get("discord") || "",
    steam: formData.get("steam") || "",
    budget: formData.get("budget") || "",
    website: formData.get("website") || "",
    message: formData.get("message") || "",
    craft: state.selectedCraft
      ? {
          title: state.selectedCraft.title,
          score: state.selectedCraft.score,
          source: state.selectedCraft.source,
        }
      : null,
  };
}

function leadHasContact(payload) {
  return Boolean([payload.contact, payload.email, payload.discord, payload.steam].some((value) => String(value || "").trim()));
}

function focusLeadContact(message) {
  const result = els.revenuePanel.querySelector("[data-lead-result]");
  if (result) result.textContent = message;
  els.revenuePanel.querySelector('[name="contact"]')?.focus();
}

function setRevenueBusy(isBusy) {
  els.revenuePanel.toggleAttribute("aria-busy", isBusy);
  els.revenuePanel.querySelectorAll("[data-checkout-plan], [data-lead-form] button[type='submit']").forEach((button) => {
    button.disabled = isBusy;
  });
}

function renderPlanCard(plan) {
  const hasPayment = Boolean(plan.payment_url || plan.checkout_ready);
  const features = (plan.features?.length ? plan.features : ["Порядок стикеров", "Scrape и цены", "Список замен"]).slice(0, 4);
  return `
    <article class="plan-card">
      <strong>${escapeHtml(plan.name)}</strong>
      <div class="plan-price"><small>Стоимость услуги</small>${escapeHtml(plan.price)} <small>${escapeHtml(plan.interval || "")}</small></div>
      <p>${escapeHtml(plan.tagline)}</p>
      <ul class="plan-features">
        ${features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}
      </ul>
      <button type="button" data-checkout-plan="${escapeHtml(plan.id)}" data-payment-missing="${hasPayment ? "false" : "true"}">
        ${hasPayment ? "Купить сейчас" : "Оставить заявку"}
      </button>
    </article>
  `;
}

function trackedAffiliateUrl(link) {
  const params = new URLSearchParams({
    word: state.target || "",
    craft: state.selectedCraft?.title || "",
  });
  return apiUrl(`/out/${encodeURIComponent(link.id)}?${params.toString()}`);
}

function renderRevenuePanel() {
  const config = state.monetization || fallbackMonetization();
  const publicDisclosure = fallbackMonetization().affiliate_disclosure;
  const status = checkoutStatusFromUrl();
  els.revenueStatus.textContent = config.payment_ready ? "оплата включена" : "заявки открыты";
  setStatusMode(els.revenueStatus, config.payment_ready ? "ok" : "warn");
  const plans = (config.plans?.length ? config.plans : fallbackMonetization().plans).map(planForDisplay);
  const affiliateLinks = (config.affiliate_links || []).filter((link) => link.id);
  const ownerAlert = config.payment_ready
    ? ""
    : shouldShowOperator()
      ? `
        <div class="owner-alert">
          <strong>Owner setup required</strong>
          <p>Вставь Stripe Payment Links или Stripe price_id в <code>backend/monetization.local.json</code>. До этого кнопки собирают лиды, но не принимают деньги.</p>
        </div>
      `
    : `
      <div class="owner-alert">
        <strong>Можно заказать готовый подбор</strong>
        <p>Оставь контакт, ник и бюджет. Я вернусь с готовым порядком стикеров, scrape и списком покупок.</p>
      </div>
    `;

  els.revenuePanel.innerHTML = `
    <div>
      ${status ? `<div class="owner-alert"><strong>Статус оплаты</strong><p>${escapeHtml(status)}</p></div>` : ""}
      <div class="pricing-grid">
        ${plans.map(renderPlanCard).join("")}
      </div>
      ${
        affiliateLinks.length
          ? `<div class="owner-alert"><strong>Полезные ссылки</strong><p>${affiliateLinks
              .map((link) => `<a class="market-link" href="${trackedAffiliateUrl(link)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`)
              .join(" · ")}</p></div>`
          : ""
      }
      ${ownerAlert}
    </div>
    <form class="lead-card" data-lead-form>
      <strong>Заявка на ручной подбор</strong>
      <p>Минимум полей: контакт, ник, бюджет и стиль. Этого достаточно для первого подбора.</p>
      <label>
        Пакет
        <select name="plan">
          ${plans.map((plan) => `<option value="${escapeHtml(plan.id)}">${escapeHtml(plan.name)} · ${escapeHtml(plan.price)} за услугу</option>`).join("")}
        </select>
      </label>
      <label>
        Контакт
        <input name="contact" placeholder="Telegram / Discord" autocomplete="off" />
      </label>
      <label>
        Бюджет
        <input name="budget" placeholder="Бюджет на стикеры, например $10-50" autocomplete="off" />
      </label>
      <label>
        Задача
        <textarea name="message" placeholder="Ник, бюджет, стиль, дедлайн"></textarea>
      </label>
      <label class="hp-field" aria-hidden="true">
        Website
        <input name="website" tabindex="-1" autocomplete="off" />
      </label>
      <details>
        <summary>Дополнительно</summary>
        <label>
          Email
          <input name="email" placeholder="buyer@example.com" autocomplete="email" />
        </label>
        <label>
          Steam
          <input name="steam" placeholder="Steam profile / trade link" autocomplete="off" />
        </label>
      </details>
      <button type="submit">Отправить заявку</button>
      <p data-lead-result>${escapeHtml(publicDisclosure)}</p>
    </form>
  `;

  els.revenuePanel.querySelectorAll("[data-checkout-plan]").forEach((button) => {
    button.addEventListener("click", () => checkoutPlan(button.dataset.checkoutPlan));
  });
  els.revenuePanel.querySelector("[data-lead-form]")?.addEventListener("submit", submitLead);
}

async function checkoutPlan(planId) {
  if (state.checkoutPending) return;
  if (!state.backend.available) {
    const result = els.revenuePanel.querySelector("[data-lead-result]");
    if (result) result.textContent = "Нужен backend, чтобы сохранить лид или открыть оплату.";
    return;
  }

  const requestBody = leadPayload(planId);
  if (!leadHasContact(requestBody)) {
    focusLeadContact("Укажи Telegram, Discord, email или Steam, чтобы я мог ответить по заявке.");
    return;
  }

  const result = els.revenuePanel.querySelector("[data-lead-result]");
  if (result) result.textContent = "Отправляю заявку...";
  state.checkoutPending = true;
  setRevenueBusy(true);

  try {
    const payload = await apiRequest("/api/checkout", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
    const checkout = payload.data?.checkout || {};
    if (checkout.redirect_url) {
      showToast("Открываю оплату");
      window.location.href = checkout.redirect_url;
      return;
    }
    const lead = payload.data?.lead;
    const checkoutMessage = lead
      ? `Заявка сохранена: ${lead.id}. Я вернусь с подбором и ссылкой на оплату.`
      : "Заявка не отправлена. Проверь контакт и отправь форму справа.";
    if (result) result.textContent = checkoutMessage;
    showToast(lead ? "Заявка сохранена" : "Нужен контакт");
  } catch (error) {
    if (result) result.textContent = `Ошибка оплаты: ${error.message}`;
  } finally {
    state.checkoutPending = false;
    setRevenueBusy(false);
  }
}

async function submitLead(event) {
  event.preventDefault();
  if (state.leadPending) return;
  const result = els.revenuePanel.querySelector("[data-lead-result]");
  if (!state.backend.available) {
    if (result) result.textContent = "Нужен backend, чтобы сохранить лид.";
    return;
  }

  const requestBody = leadPayload();
  if (!leadHasContact(requestBody)) {
    focusLeadContact("Укажи Telegram, Discord, email или Steam, чтобы я мог ответить по заявке.");
    return;
  }

  try {
    state.leadPending = true;
    setRevenueBusy(true);
    if (result) result.textContent = "Отправляю заявку...";
    const payload = await apiRequest("/api/leads", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
    if (result) result.textContent = `Заявка сохранена: ${payload.data.id}. Я вернусь с подбором по этому контакту.`;
    showToast("Заявка сохранена");
  } catch (error) {
    if (result) result.textContent = `Ошибка заявки: ${error.message}`;
  } finally {
    state.leadPending = false;
    setRevenueBusy(false);
  }
}

function shouldShowOperator() {
  const params = new URLSearchParams(window.location.search);
  return params.get("operator") === "1";
}

function renderOperatorShell(autoLoad = true) {
  const research = document.querySelector(".research-surface");
  const operatorMode = shouldShowOperator();
  if (research) research.hidden = !operatorMode;
  if (!operatorMode) {
    els.operatorSurface.hidden = true;
    return;
  }
  els.operatorSurface.hidden = false;
  els.operatorPanel.innerHTML = `
    <div class="operator-controls">
      <label>
        Admin token
        <input id="adminTokenInput" placeholder="если задан SWL_ADMIN_TOKEN" autocomplete="off" />
      </label>
      <button type="button" id="loadOperatorDashboard">Обновить EBITDA</button>
    </div>
    <div class="empty">Нажми обновить, чтобы посчитать лиды, клики, pipeline и EBITDA.</div>
  `;
  document.querySelector("#loadOperatorDashboard")?.addEventListener("click", loadOperatorDashboard);
  if (autoLoad) loadOperatorDashboard();
}

function operatorKpi(label, value, hint) {
  return `
    <div class="operator-kpi">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(hint || "")}</span>
    </div>
  `;
}

function renderOperatorDashboard(data) {
  const summary = data.summary || {};
  const assumptions = data.assumptions || {};
  const planCounts = data.plan_counts || {};
  const topLeads = data.top_leads || [];
  els.operatorStatus.textContent = `${summary.ebitda_margin || 0}% margin`;
  els.operatorPanel.innerHTML = `
    <div class="operator-controls">
      <label>
        Admin token
        <input id="adminTokenInput" placeholder="если задан SWL_ADMIN_TOKEN" autocomplete="off" />
      </label>
      <button type="button" id="loadOperatorDashboard">Обновить EBITDA</button>
    </div>
    <div class="operator-kpis">
      ${operatorKpi("EBITDA", formatUsd.format(summary.ebitda || 0), `${summary.ebitda_margin || 0}% margin`)}
      ${operatorKpi("Gross revenue", formatUsd.format(summary.gross_revenue || 0), "expected")}
      ${operatorKpi("Pipeline", formatUsd.format(summary.weighted_pipeline || 0), `${summary.expected_paid_orders || 0} paid orders`)}
      ${operatorKpi("Affiliate", formatUsd.format(summary.affiliate_revenue || 0), `${summary.affiliate_clicks || 0} clicks`)}
      ${operatorKpi("COGS + fees", formatUsd.format((summary.expected_cogs || 0) + (summary.payment_fees || 0) + (summary.refund_reserve || 0)), `fixed ${formatUsd.format(summary.fixed_cost || 0)}`)}
    </div>
    <div class="operator-grid">
      <div class="plan-list">
        <div class="plan-mix">
          <strong>Plan mix</strong>
          <span>close ${(assumptions.lead_to_paid_rate || 0) * 100}% · fee ${(assumptions.payment_fee_rate || 0) * 100}%</span>
        </div>
        ${
          Object.entries(planCounts)
            .map(([plan, count]) => `<div class="plan-mix"><strong>${escapeHtml(plan)}</strong><span>${count} leads</span></div>`)
            .join("") || `<div class="empty">Лидов пока нет.</div>`
        }
      </div>
      <div class="lead-list">
        ${
          topLeads
            .map(
              (lead) => `
                <article class="lead-row">
                  <span>${escapeHtml(lead.plan || "unknown")} · score ${escapeHtml(lead.score || 0)} · ${escapeHtml(lead.created_at || "")}</span>
                  <strong>${escapeHtml(lead.word || "no word")} · ${escapeHtml(lead.contact || "no contact")}</strong>
                  <p>${escapeHtml(lead.message || "")}</p>
                </article>
              `,
            )
            .join("") || `<div class="empty">Приоритетных лидов пока нет.</div>`
        }
      </div>
    </div>
  `;
  document.querySelector("#loadOperatorDashboard")?.addEventListener("click", loadOperatorDashboard);
}

async function loadOperatorDashboard() {
  if (!state.backend.available || !shouldShowOperator()) return;
  const token = document.querySelector("#adminTokenInput")?.value || "";
  els.operatorStatus.textContent = "loading...";
  try {
    const payload = await apiRequest("/api/admin/revenue", {
      headers: token ? { "X-Admin-Token": token } : {},
    });
    renderOperatorDashboard(payload.data || {});
  } catch (error) {
    els.operatorStatus.textContent = "locked";
    const current = els.operatorPanel.innerHTML;
    if (!current.includes("Admin token")) renderOperatorShell(false);
    els.operatorPanel.querySelector(".empty")?.replaceChildren(document.createTextNode(`Admin error: ${error.message}`));
  }
}

function buildPreset() {
  const craft = state.selectedCraft;
  if (!craft) return null;
  return {
    app: "Sticker Word Lab",
    version: 2,
    word: state.target,
    title: craft.title,
    summary: craft.summary,
    score: craft.score,
    source: craft.source,
    options: readOptions(),
    createdAt: new Date().toISOString(),
    segments: craft.segments.map((segment, index) => ({
      index,
      token: segment.token,
      visible: segment.visible,
      stickerId: segment.sticker.id,
      sticker: segment.sticker.name,
      marketHashName: segment.sticker.market_hash_name || segment.sticker.name,
      stickerData: {
        id: segment.sticker.id,
        name: segment.sticker.name,
        image: segment.sticker.image,
        effect: segment.sticker.effect,
        type: segment.sticker.type,
        market_hash_name: segment.sticker.market_hash_name,
      },
      scrape: Number(segment.scrape.toFixed(3)),
      scrapePercent: Math.round(segment.scrape * 100),
      angle: segment.angle,
      note: segment.note,
      marketUrl: steamMarketUrl(segment.sticker),
    })),
  };
}

function renderExportBox() {
  const preset = buildPreset();
  if (!preset) {
    els.exportBox.value = "";
    return;
  }
  const json = JSON.stringify(preset, null, 2);
  const lines = [
    state.lastShareUrl ? `Share: ${state.lastShareUrl}` : "",
    `${preset.title} · ${preset.score}%`,
    `Word: ${preset.word.toUpperCase()}`,
    "",
    "Apply order:",
    ...preset.segments.map((segment) => {
      const price = state.priceCache.get(segment.marketHashName);
      return `${segment.index + 1}. ${segment.visible} -> ${segment.sticker} · scrape ${segment.scrapePercent}% · ${priceLabel(price)} · ${segment.marketUrl}`;
    }),
    "",
    preset.summary,
    "",
    "Advanced JSON:",
    json,
  ].filter((line, index) => line || index > 0);
  els.exportBox.value = lines.join("\n");
}

async function copyPreset() {
  renderExportBox();
  if (!els.exportBox.value) return;
  try {
    await navigator.clipboard.writeText(els.exportBox.value);
    showToast("Пресет скопирован");
    els.copyPreset.textContent = "Скопировано";
    setTimeout(() => {
      els.copyPreset.textContent = "Скопировать пресет";
    }, 1200);
  } catch {
    els.exportBox.select();
    showToast("Не удалось скопировать автоматически");
  }
}

function readSavedPresets() {
  try {
    return JSON.parse(localStorage.getItem(PRESET_CACHE_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePreset() {
  const preset = buildPreset();
  if (!preset) return;
  const presets = [preset, ...readSavedPresets().filter((item) => item.title !== preset.title || item.word !== preset.word)].slice(0, 12);
  localStorage.setItem(PRESET_CACHE_KEY, JSON.stringify(presets));
  showToast("Крафт сохранён локально");
  els.savePreset.textContent = "Сохранено";
  setTimeout(() => {
    els.savePreset.textContent = "Сохранить";
  }, 1200);
}

function applyPreset(preset, source = "saved") {
  if (!preset || !Array.isArray(preset.segments) || !preset.segments.length) {
    showToast("Пресет не найден");
    return;
  }
  const segments = preset.segments
    .map((segment) => {
      const sticker = state.stickers.find((item) => item.id === segment.stickerId || item.name === segment.sticker)
        || (segment.stickerData?.name && segment.stickerData?.image ? enrichSticker(segment.stickerData) : null);
      if (!sticker) return null;
      return buildCandidate(sticker, segment.token, source, 100, {
        visible: segment.visible,
        scrape: segment.scrape,
        angle: segment.angle,
        note: segment.note,
      });
    })
    .filter(Boolean);
  if (segments.length !== preset.segments.length) {
    showToast("Не удалось загрузить часть стикеров из пресета");
    return;
  }
  if (preset.options && typeof preset.options === "object") {
    if (Number.isFinite(Number(preset.options.maxStickerPrice))) els.maxStickerPrice.value = String(preset.options.maxStickerPrice);
    if (Number.isFinite(Number(preset.options.maxCraftPrice))) els.maxCraftPrice.value = String(preset.options.maxCraftPrice);
    if (Number.isFinite(Number(preset.options.maxStickers))) els.maxStickers.value = String(preset.options.maxStickers);
    if (Number.isFinite(Number(preset.options.maxChunk))) els.maxChunk.value = String(preset.options.maxChunk);
    if (typeof preset.options.requireSteamPrice === "boolean") els.requireSteamPrice.checked = preset.options.requireSteamPrice;
  }
  els.wordInput.value = preset.word || state.target;
  state.target = cleanTarget(els.wordInput.value);
  state.selectedCraft = customCraftFromSegments(segments);
  state.selectedCraft.title = preset.title || state.selectedCraft.title;
  state.selectedCraft.summary = preset.summary || state.selectedCraft.summary;
  state.selectedCraft.score = Number.isFinite(preset.score) ? preset.score : state.selectedCraft.score;
  state.selectedCraft.source = preset.source || state.selectedCraft.source;
  state.crafts = [state.selectedCraft, ...state.crafts.filter((craft) => craft.source !== "custom")].slice(0, 10);
  state.lastShareUrl = "";
  renderGenerator(state.target);
}

function loadLastPreset() {
  const [preset] = readSavedPresets();
  if (!preset) {
    showToast("Сохранённых крафтов пока нет");
    return;
  }
  applyPreset(preset, "saved");
}

function shareUrlFromResponse(data) {
  const path = data.short_url || data.url || `/?preset=${data.id}`;
  const base = state.backend.baseUrl || window.location.origin;
  return new URL(path, base || window.location.origin).toString();
}

async function sharePreset() {
  if (state.sharePending) return;
  const preset = buildPreset();
  if (!preset) return;

  if (!state.backend.available) {
    state.lastShareUrl = "";
    renderExportBox();
    els.sharePreset.textContent = "Нужен backend";
    setTimeout(() => {
      els.sharePreset.textContent = "Поделиться ссылкой";
    }, 1400);
    return;
  }

  state.sharePending = true;
  els.sharePreset.disabled = true;
  els.sharePreset.textContent = "Создаю ссылку...";

  try {
    const payload = await apiRequest("/api/presets", {
      method: "POST",
      body: JSON.stringify({ preset }),
    });
    state.lastShareUrl = shareUrlFromResponse(payload.data || {});
    renderExportBox();
  } catch (error) {
    console.warn("Preset share failed", error);
    showToast("Не удалось создать ссылку");
    els.sharePreset.textContent = "Ошибка ссылки";
    return;
  } finally {
    state.sharePending = false;
    els.sharePreset.disabled = false;
  }

  try {
    await navigator.clipboard.writeText(state.lastShareUrl);
    showToast("Ссылка на крафт скопирована");
    els.sharePreset.textContent = "Ссылка скопирована";
  } catch (error) {
    console.warn("Clipboard failed", error);
    els.exportBox.hidden = false;
    els.exportBox.value = state.lastShareUrl;
    els.exportBox.select();
    showToast("Ссылка создана, скопируй из поля");
    els.sharePreset.textContent = "Ссылка создана";
  } finally {
    setTimeout(() => {
      els.sharePreset.textContent = "Поделиться ссылкой";
    }, 1400);
  }
}

function presetIdFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const queryId = params.get("preset");
  if (queryId) return queryId;
  const match = window.location.pathname.match(/\/p\/([a-f0-9]{8,64})$/i);
  return match?.[1] || "";
}

async function loadSharedPresetFromUrl() {
  const presetId = presetIdFromLocation();
  if (!presetId || !state.backend.available) return;
  try {
    const payload = await apiRequest(`/api/presets/${presetId}`);
    applyPreset(payload.data?.preset, "shared");
    state.lastShareUrl = new URL(`/p/${presetId}`, state.backend.baseUrl || window.location.origin).toString();
    renderExportBox();
  } catch (error) {
    console.warn("Shared preset failed", error);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function applyResponsiveDefaults() {
  if (!els.advancedSettings) return;
  const compact = window.matchMedia("(max-width: 980px)").matches;
  if (compact) els.advancedSettings.removeAttribute("open");
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  runGenerator();
});

[els.effectMode, els.budgetMode, els.maxStickers, els.maxChunk, els.maxStickerPrice, els.maxCraftPrice, els.preferAutographs, els.allowRotations, els.requireSteamPrice].forEach((control) => {
  control.addEventListener("change", runGenerator);
});

els.wordInput.addEventListener("input", runGenerator);
document.querySelectorAll("[data-example-word]").forEach((button) => {
  button.addEventListener("click", () => {
    els.wordInput.value = button.dataset.exampleWord || "";
    runGenerator();
    showToast(`Собрал ${els.wordInput.value.toUpperCase()}`);
  });
});
els.stickerSearch.addEventListener("input", (event) => {
  state.browserQuery = event.target.value;
  renderBrowser();
});
els.copyPreset.addEventListener("click", copyPreset);
els.sharePreset.addEventListener("click", sharePreset);
els.savePreset.addEventListener("click", savePreset);
els.loadPreset.addEventListener("click", loadLastPreset);
els.resetCraft.addEventListener("click", runGenerator);
document.addEventListener("click", (event) => {
  const jump = event.target.closest("[data-jump]");
  if (jump) {
    event.preventDefault();
    scrollToSelector(jump.dataset.jump);
    return;
  }
  const action = event.target.closest("[data-action]");
  if (action?.dataset.action === "share") {
    event.preventDefault();
    sharePreset();
  }
});

async function init() {
  applyResponsiveDefaults();
  els.dataStatus.textContent = "Проверяю backend...";
  await detectBackend();
  await loadMonetization();
  renderOperatorShell();
  await loadStickers();
  await loadSharedPresetFromUrl();
}

init();
