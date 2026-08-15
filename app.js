(() => {
  const canvas = document.getElementById("planeCanvas");
  const wrap = document.getElementById("planeWrap");
  const segmentAnnotations = document.getElementById("segmentAnnotations");
  const ctx = canvas.getContext("2d");

  const xEditor = document.getElementById("xSegmentEditor");
  const yEditor = document.getElementById("ySegmentEditor");
  const avatarSizeSlider = document.getElementById("avatarSizeSlider");
  const avatarSizeValue = document.getElementById("avatarSizeValue");
  const toggleNamesBtn = document.getElementById("toggleNamesBtn");
  const saveBtn = document.getElementById("saveBtn");
  const importStateBtn = document.getElementById("importStateBtn");
  const importStateInput = document.getElementById("importStateInput");
  const exportBtn = document.getElementById("exportBtn");
  const xReportBtn = document.getElementById("xReportBtn");
  const yReportBtn = document.getElementById("yReportBtn");

  const axisReportModal = document.getElementById("axisReportModal");
  const axisReportTitle = document.getElementById("axisReportTitle");
  const axisReportKicker = document.getElementById("axisReportKicker");
  const axisReportSummary = document.getElementById("axisReportSummary");
  const axisReportRows = document.getElementById("axisReportRows");
  const exportAxisReportBtn = document.getElementById("exportAxisReportBtn");
  const operatorCardModal = document.getElementById("operatorCardModal");
  const operatorCardAvatar = document.getElementById("operatorCardAvatar");
  const operatorCardName = document.getElementById("operatorCardName");
  const operatorCardStableId = document.getElementById("operatorCardStableId");
  const operatorCardPrefix = document.getElementById("operatorCardPrefix");
  const operatorCardNote = document.getElementById("operatorCardNote");
  const operatorCardSaveStatus = document.getElementById("operatorCardSaveStatus");
  const operatorSensitivityScore = document.getElementById("operatorSensitivityScore");
  const operatorToleranceScore = document.getElementById("operatorToleranceScore");
  const openInterrogationBtn = document.getElementById("openInterrogationBtn");

  const interrogationModal = document.getElementById("interrogationModal");
  const interrogationWarning = document.getElementById("interrogationWarning");
  const interrogationEditor = document.getElementById("interrogationEditor");
  const confirmInterrogationBtn = document.getElementById("confirmInterrogationBtn");
  const interrogationOperatorName = document.getElementById("interrogationOperatorName");
  const laughTimeInput = document.getElementById("laughTimeInput");
  const confessTimeInput = document.getElementById("confessTimeInput");
  const interrogationSaveStatus = document.getElementById("interrogationSaveStatus");
  const saveInterrogationBtn = document.getElementById("saveInterrogationBtn");
  const rankingBtn = document.getElementById("rankingBtn");
  const rankingModal = document.getElementById("rankingModal");
  const rankingRows = document.getElementById("rankingRows");
  const rankingSummary = document.getElementById("rankingSummary");

  const searchInput = document.getElementById("searchInput");
  const searchSuggestions = document.getElementById("searchSuggestions");
  const operatorList = document.getElementById("operatorList");
  const operatorCount = document.getElementById("operatorCount");
  const scrollSlider = document.getElementById("scrollSlider");

  const paletteX = ["#3ed6c4", "#32bfb9", "#2fa7b5", "#348da9", "#397394", "#3d5d7d"];
  const paletteY = ["#ffd093", "#f5b86f", "#e99d53", "#d98345", "#bd6b3e", "#9d583b"];
  const colorCtx = document.createElement("canvas").getContext("2d");
  const baseBoardAvatarRadius = 26;
  const maxSuggestionItems = 200;
  const operatorNoteMaxLength = 20000;
  const xSegmentPrefix = "\u6a2a\u8f74\u533a\u6bb5";
  const ySegmentPrefix = "\u7eb5\u8f74\u533a\u6bb5";
  const storageKey = "arknights_tk_board_state_v1";
  const publicPageUrl = "https://arktickle.github.io/arktickle.github.io-tiermaker/";
  const rhodesLogoPath = "assets/branding/rhodes-island.png";
  const arknightsLogoPath = "assets/branding/arknights-logo.png";

  const state = {
    xNodes: [],
    yNodes: [],
    xSegments: [],
    ySegments: [],
    operators: Array.isArray(window.OPERATORS_DATA) ? window.OPERATORS_DATA : [],
    searchTerm: "",
    placements: new Map(),
    operatorNotes: new Map(),
    interrogationData: new Map(),
    images: new Map(),
    blobUrls: [],
    avatarScale: 1,
    showPlacementNames: true,
    draggingPlacementId: null,
    pointerDownPlacementId: null,
    placementDragged: false,
    dragStartPointer: null,
    hoveredSegment: null,
    segmentHoverProgress: 0,
    segmentHoverTarget: 0,
    activeCardId: null,
    activeReportAxis: null,
    activeRankingKey: "sensitivity"
  };

  let noteSaveTimer = 0;
  let segmentHoverAnimationFrame = 0;
  let segmentHoverAnimationTime = 0;
  const view = {
    width: 1200,
    height: 760,
    pad: 72
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeText(text) {
    return String(text || "").trim().toLowerCase();
  }

  function sanitizeNodes(raw) {
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    const out = [];
    for (const v of raw) {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      if (Math.abs(n) < 0.02 || n <= -0.98 || n >= 0.98) continue;
      const c = clamp(n, -0.95, 0.95);
      const key = Math.round(c * 10000);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    out.sort((a, b) => a - b);
    return out;
  }

  function getBoardAvatarRadius() {
    return baseBoardAvatarRadius * state.avatarScale;
  }

  function updateAvatarScaleUI() {
    if (avatarSizeSlider) {
      avatarSizeSlider.value = String(Math.round(state.avatarScale * 100));
    }
    if (avatarSizeValue) {
      avatarSizeValue.textContent = `${state.avatarScale.toFixed(2)}x`;
    }
  }

  function applyAvatarScaleFromSlider() {
    if (!avatarSizeSlider) return;
    const scale = clamp(Number(avatarSizeSlider.value) / 100, 0.5, 1.5);
    state.avatarScale = scale;
    updateAvatarScaleUI();
    render();
  }

  function applyLoadedSegments(axis, loaded) {
    const target = axis === "x" ? state.xSegments : state.ySegments;
    if (!Array.isArray(loaded) || loaded.length !== target.length) return;
    for (let i = 0; i < target.length; i++) {
      const src = loaded[i];
      if (!src || typeof src !== "object") continue;
      const label = typeof src.label === "string" ? src.label.trim() : "";
      if (label) target[i].label = label;
      target[i].description = typeof src.description === "string" ? src.description.trim() : "";
      if (typeof src.color === "string" && src.color.trim()) {
        target[i].color = normalizeColor(src.color.trim());
      }
    }
  }

  function buildOperatorLookup() {
    const byId = new Map();
    const byName = new Map();
    for (const op of state.operators) {
      byId.set(op.id, op);
      if (!byName.has(op.name)) byName.set(op.name, op);
    }
    return { byId, byName };
  }

  function getOperatorById(id) {
    return state.operators.find((item) => item.id === id) || null;
  }

  function resolvePlacementOperatorId(item, lookup) {
    const savedName = typeof item.name === "string" ? item.name.trim() : "";
    const savedId = typeof item.id === "string" ? item.id : "";
    const byName = lookup.byName;
    const byId = lookup.byId;

    if (savedName) {
      const opByName = byName.get(savedName);
      if (opByName) {
        const opById = byId.get(savedId);
        if (!opById || opById.name !== savedName) {
          return opByName.id;
        }
      }
    }

    if (savedId && byId.has(savedId)) {
      return savedId;
    }

    if (savedName) {
      const fallback = byName.get(savedName);
      if (fallback) return fallback.id;
    }

    return "";
  }

  function applyLoadedOperatorNotes(raw, lookup) {
    state.operatorNotes.clear();
    if (!raw) return;

    const entries = Array.isArray(raw)
      ? raw
      : Object.entries(raw).map(([id, content]) => ({ id, content }));

    for (const item of entries) {
      if (!item || typeof item !== "object") continue;
      const id = resolvePlacementOperatorId(item, lookup);
      const content = typeof item.content === "string"
        ? item.content
        : typeof item.note === "string" ? item.note : "";
      if (!id || !content) continue;
      state.operatorNotes.set(id, content.slice(0, operatorNoteMaxLength));
    }
  }

  function parseClockTime(value) {
    const match = String(value || "").trim().match(/^(\d{2}):([0-5]\d):([0-5]\d)(?:\.(\d{1,3}))?$/);
    if (!match) return null;
    const milliseconds = Number((match[4] || "0").padEnd(3, "0"));
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + milliseconds / 1000;
  }

  function formatClockTime(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "";
    const totalMilliseconds = Math.min(359999999, Math.round(totalSeconds * 1000));
    const hours = Math.floor(totalMilliseconds / 3600000);
    const minutes = Math.floor((totalMilliseconds % 3600000) / 60000);
    const seconds = Math.floor((totalMilliseconds % 60000) / 1000);
    const milliseconds = totalMilliseconds % 1000;
    return `${[hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":")}.${String(milliseconds).padStart(3, "0")}`;
  }

  function applyLoadedInterrogationData(raw, lookup) {
    state.interrogationData.clear();
    if (!raw) return;

    const entries = Array.isArray(raw)
      ? raw
      : Object.entries(raw).map(([id, values]) => ({ id, ...(values || {}) }));
    for (const item of entries) {
      if (!item || typeof item !== "object") continue;
      const id = resolvePlacementOperatorId(item, lookup);
      if (!id) continue;

      const hasLaughSeconds = item.laughSeconds !== null && item.laughSeconds !== "" && item.laughSeconds !== undefined;
      const hasConfessSeconds = item.confessSeconds !== null && item.confessSeconds !== "" && item.confessSeconds !== undefined;
      const rawLaugh = hasLaughSeconds && Number.isFinite(Number(item.laughSeconds))
        ? Number(item.laughSeconds)
        : parseClockTime(item.laughTime);
      const rawConfess = hasConfessSeconds && Number.isFinite(Number(item.confessSeconds))
        ? Number(item.confessSeconds)
        : parseClockTime(item.confessTime);
      const laughSeconds = Number.isFinite(rawLaugh) ? clamp(Math.round(rawLaugh * 1000) / 1000, 0, 359999.999) : null;
      const confessSeconds = Number.isFinite(rawConfess) ? clamp(Math.round(rawConfess * 1000) / 1000, 0, 359999.999) : null;
      if (laughSeconds === null && confessSeconds === null) continue;
      state.interrogationData.set(id, { laughSeconds, confessSeconds });
    }
  }

  function buildBoardStatePayload() {
    return {
      version: 4,
      savedAt: new Date().toISOString(),
      avatarScale: state.avatarScale,
      showPlacementNames: state.showPlacementNames,
      xNodes: state.xNodes.slice(),
      yNodes: state.yNodes.slice(),
      xSegments: state.xSegments.map((s) => ({ label: s.label, description: s.description || "", color: s.color })),
      ySegments: state.ySegments.map((s) => ({ label: s.label, description: s.description || "", color: s.color })),
      placements: Array.from(state.placements.values()).map((p) => {
        const op = getOperatorById(p.id);
        return { id: p.id, name: op ? op.name : "", x: p.x, y: p.y };
      }),
      operatorNotes: Array.from(state.operatorNotes.entries()).map(([id, content]) => {
        const op = getOperatorById(id);
        return { id, name: op ? op.name : "", content };
      }),
      interrogationData: Array.from(state.interrogationData.entries()).map(([id, values]) => {
        const op = getOperatorById(id);
        return {
          id,
          name: op ? op.name : "",
          laughSeconds: values.laughSeconds,
          confessSeconds: values.confessSeconds
        };
      })
    };
  }

  function buildAiArchiveContext() {
    const payload = buildBoardStatePayload();
    return {
      ...payload,
      placements: payload.placements.map((placement) => ({
        ...placement,
        scores: getOperatorScores(placement.id)
      })),
      archiveDescription: "当前浏览器中的完整矩阵存档；坐标范围为 -1 至 1，分数由坐标自动换算。"
    };
  }

  function saveBoardState() {
    const payload = buildBoardStatePayload();
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
      return true;
    } catch (err) {
      console.error("Save failed", err);
      return false;
    }
  }

  function applyBoardState(parsed) {
    if (!parsed || typeof parsed !== "object") return false;

    try {
      state.xNodes = sanitizeNodes(parsed.xNodes);
      state.yNodes = sanitizeNodes(parsed.yNodes);
      rebuildSegments("x");
      rebuildSegments("y");
      applyLoadedSegments("x", parsed.xSegments);
      applyLoadedSegments("y", parsed.ySegments);

      const loadedScale = Number(parsed.avatarScale);
      state.avatarScale = Number.isFinite(loadedScale) ? clamp(loadedScale, 0.5, 1.5) : 1;
      updateAvatarScaleUI();

      state.showPlacementNames = parsed.showPlacementNames !== false;
      if (toggleNamesBtn) {
        toggleNamesBtn.setAttribute("aria-pressed", state.showPlacementNames ? "true" : "false");
      }

      state.placements.clear();
      const lookup = buildOperatorLookup();
      if (Array.isArray(parsed.placements)) {
        for (const item of parsed.placements) {
          if (!item || typeof item !== "object") continue;
          const x = Number(item.x);
          const y = Number(item.y);
          if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

          const id = resolvePlacementOperatorId(item, lookup);
          if (!id) continue;
          state.placements.set(id, { id, x: clamp(x, -1, 1), y: clamp(y, -1, 1) });
        }
      }
      applyLoadedOperatorNotes(parsed.operatorNotes, lookup);
      applyLoadedInterrogationData(parsed.interrogationData, lookup);
      return true;
    } catch (err) {
      console.error("Apply state failed", err);
      return false;
    }
  }

  function loadBoardState() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return applyBoardState(parsed);
    } catch (err) {
      console.error("Load failed", err);
      return false;
    }
  }

  function getFileStamp() {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("") + "-" + [
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0")
    ].join("");
  }

  function downloadBoardStateFile() {
    const payload = buildBoardStatePayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `arknights-tk-save-${getFileStamp()}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 800);
  }

  function readBoardStateFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        if (!applyBoardState(parsed)) throw new Error("bad format");
        updateSegmentEditors();
        render();
        if (saveBoardState()) {
          flashLoadedState(true);
        } else {
          flashLoadedState(false);
        }
      } catch (err) {
        console.error("Import state failed", err);
        alert("读取失败：请选择正确的存档 JSON 文件。");
      }
    };
    reader.onerror = () => {
      alert("读取失败：无法读取该文件。");
    };
    reader.readAsText(file, "utf-8");
  }

  function flashSavedState(ok) {
    if (!saveBtn) return;
    if (ok) {
      const originText = saveBtn.textContent || "保存";
      saveBtn.textContent = "已保存";
      saveBtn.dataset.saved = "true";
      window.setTimeout(() => {
        saveBtn.textContent = originText;
        delete saveBtn.dataset.saved;
      }, 1200);
    } else {
      alert("保存失败：当前浏览器可能禁用了本地存储。");
    }
  }

  function flashLoadedState(ok) {
    if (!importStateBtn) return;
    if (ok) {
      const originText = importStateBtn.textContent || "读取存档";
      importStateBtn.textContent = "已加载";
      importStateBtn.dataset.loaded = "true";
      window.setTimeout(() => {
        importStateBtn.textContent = originText;
        delete importStateBtn.dataset.loaded;
      }, 1200);
    } else {
      alert("读取成功，但无法写入本地缓存。");
    }
  }

  function getMetrics(width, height, pad) {
    const left = pad;
    const right = width - pad;
    const top = pad;
    const bottom = height - pad;
    const usableW = right - left;
    const usableH = bottom - top;

    return {
      width,
      height,
      left,
      right,
      top,
      bottom,
      usableW,
      usableH,
      toX: (v) => left + ((v + 1) / 2) * usableW,
      toY: (v) => bottom - ((v + 1) / 2) * usableH,
      toValueX: (px) => clamp(((px - left) / usableW) * 2 - 1, -1, 1),
      toValueY: (py) => clamp(((bottom - py) / usableH) * 2 - 1, -1, 1)
    };
  }

  function ensureCanvasSize() {
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    const cssWidth = Math.max(320, Math.round(rect.width));
    const cssHeight = Math.round(cssWidth / 1.6);

    view.width = cssWidth;
    view.height = cssHeight;
    view.pad = Math.max(52, Math.round(Math.min(cssWidth, cssHeight) * 0.085));

    const targetW = Math.round(cssWidth * dpr);
    const targetH = Math.round(cssHeight * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeBounds(nodes) {
    return [-1, ...nodes.slice().sort((a, b) => a - b), 1];
  }

  function segmentSource(oldSegments, center) {
    for (const seg of oldSegments) {
      if (center >= seg.start && center <= seg.end) return seg;
    }
    return oldSegments[oldSegments.length - 1] || null;
  }

  function rebuildSegments(axis) {
    const nodes = axis === "x" ? state.xNodes : state.yNodes;
    const oldSegments = axis === "x" ? state.xSegments : state.ySegments;
    const palette = axis === "x" ? paletteX : paletteY;
    const labelPrefix = axis === "x" ? xSegmentPrefix : ySegmentPrefix;

    const bounds = makeBounds(nodes);
    const isSplit = bounds.length - 1 > oldSegments.length;
    const reusedLabelCount = new Map();
    const next = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      const start = bounds[i];
      const end = bounds[i + 1];
      const source = segmentSource(oldSegments, (start + end) / 2);
      let nextLabel = source?.label || `${labelPrefix}${i + 1}`;

      // When one old segment is split into multiple new ones, keep the old label
      // for the first piece and auto-number subsequent pieces.
      if (isSplit && source?.label) {
        const key = source.label;
        const used = reusedLabelCount.get(key) || 0;
        reusedLabelCount.set(key, used + 1);
        if (used > 0) {
          nextLabel = `${labelPrefix}${i + 1}`;
        }
      }

      next.push({
        start,
        end,
        label: nextLabel,
        description: source?.description || "",
        color: source?.color || palette[i % palette.length]
      });
    }

    if (axis === "x") state.xSegments = next;
    else state.ySegments = next;
  }

  function initSegments() {
    state.xSegments = [{ start: -1, end: 1, label: `${xSegmentPrefix}1`, description: "", color: paletteX[0] }];
    state.ySegments = [{ start: -1, end: 1, label: `${ySegmentPrefix}1`, description: "", color: paletteY[0] }];
  }

  function normalizeColor(color) {
    if (/^#[\da-fA-F]{6}$/.test(color)) return color;
    colorCtx.fillStyle = color;
    return colorCtx.fillStyle;
  }

  function loadImageSafely(img, src) {
    if (!src) return;
    if (src.startsWith("data:") || src.startsWith("blob:")) {
      img.src = src;
      return;
    }

    const encoded = encodeURI(src);
    const isWeb = location.protocol === "http:" || location.protocol === "https:";
    if (!isWeb) {
      img.src = encoded;
      return;
    }

    // For shared online pages, convert to Blob URL first to keep canvas export safe.
    fetch(encoded, { cache: "force-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        state.blobUrls.push(blobUrl);
        img.src = blobUrl;
      })
      .catch(() => {
        // Fallback for display; export may still fail if the source is cross-origin without CORS.
        img.src = encoded;
      });
  }

  function getImage(src) {
    if (!state.images.has(src)) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => render();
      img.onerror = () => render();
      loadImageSafely(img, src);
      state.images.set(src, img);
    }
    return state.images.get(src);
  }

  function wrapTextByWidth(target, text, maxWidth) {
    const chars = [...String(text || "")];
    if (!chars.length) return [""];

    const lines = [];
    let current = "";
    for (const ch of chars) {
      const test = current + ch;
      if (current && target.measureText(test).width > maxWidth) {
        lines.push(current);
        current = ch;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  }

  function drawWrappedHorizontalLabel(target, text, x, centerY, maxWidth, lineHeight) {
    const lines = wrapTextByWidth(target, text, maxWidth);
    const totalHeight = lines.length * lineHeight;
    let y = centerY - totalHeight / 2 + lineHeight * 0.8;
    for (const line of lines) {
      target.fillText(line, x, y);
      y += lineHeight;
    }
  }

  function drawArrow(target, x1, y1, x2, y2, x3, y3) {
    target.beginPath();
    target.moveTo(x1, y1);
    target.lineTo(x2, y2);
    target.lineTo(x3, y3);
    target.closePath();
    target.fill();
  }

  function getPlacementHighlightColor(placement) {
    if (!state.hoveredSegment) return null;

    const { axis, index } = state.hoveredSegment;
    const segments = axis === "x" ? state.xSegments : state.ySegments;
    if (getSegmentIndex(segments, placement[axis]) !== index) return null;

    return normalizeColor(segments[index]?.color || "#7ce4d7");
  }

  function animateSegmentHighlight(timestamp) {
    if (!segmentHoverAnimationTime) segmentHoverAnimationTime = timestamp;
    const elapsed = Math.min(40, timestamp - segmentHoverAnimationTime);
    segmentHoverAnimationTime = timestamp;

    const target = state.segmentHoverTarget;
    const duration = target > state.segmentHoverProgress ? 220 : 170;
    const distance = elapsed / duration;
    if (target > state.segmentHoverProgress) {
      state.segmentHoverProgress = Math.min(target, state.segmentHoverProgress + distance);
    } else {
      state.segmentHoverProgress = Math.max(target, state.segmentHoverProgress - distance);
    }

    drawScene(ctx, getMetrics(view.width, view.height, view.pad));
    if (Math.abs(state.segmentHoverProgress - target) > 0.001) {
      segmentHoverAnimationFrame = window.requestAnimationFrame(animateSegmentHighlight);
      return;
    }

    state.segmentHoverProgress = target;
    segmentHoverAnimationFrame = 0;
    segmentHoverAnimationTime = 0;
    if (target === 0) state.hoveredSegment = null;
  }

  function setHoveredSegment(segment) {
    const changed = segment && (
      state.hoveredSegment?.axis !== segment.axis
      || state.hoveredSegment?.index !== segment.index
    );
    if (segment) {
      state.hoveredSegment = segment;
      if (changed) state.segmentHoverProgress = 0;
    }
    state.segmentHoverTarget = segment ? 1 : 0;

    if (!segmentHoverAnimationFrame) {
      segmentHoverAnimationFrame = window.requestAnimationFrame(animateSegmentHighlight);
    }
  }

  function drawScene(target, metrics) {
    const { width, height, left, right, top, bottom, toX, toY } = metrics;
    const axisX = left;
    const axisY = bottom;

    const bg = target.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#0a2026");
    bg.addColorStop(0.55, "#07191e");
    bg.addColorStop(1, "#051217");
    target.fillStyle = bg;
    target.fillRect(0, 0, width, height);

    for (const seg of state.xSegments) {
      const x0 = toX(seg.start);
      const x1 = toX(seg.end);
      target.fillStyle = `${seg.color}1f`;
      target.fillRect(x0, top, x1 - x0, bottom - top);
    }

    for (const seg of state.ySegments) {
      const y1 = toY(seg.start);
      const y0 = toY(seg.end);
      target.fillStyle = `${seg.color}18`;
      target.fillRect(left, y0, right - left, y1 - y0);
    }

    if (state.hoveredSegment && state.segmentHoverProgress > 0) {
      const activeSegments = state.hoveredSegment.axis === "x" ? state.xSegments : state.ySegments;
      const active = activeSegments[state.hoveredSegment.index];
      if (active) {
        target.save();
        target.globalAlpha = state.segmentHoverProgress;
        target.fillStyle = `${active.color}42`;
        target.strokeStyle = `${active.color}cc`;
        target.lineWidth = 1 + state.segmentHoverProgress;
        if (state.hoveredSegment.axis === "x") {
          const x0 = toX(active.start);
          const x1 = toX(active.end);
          target.fillRect(x0, top, x1 - x0, bottom - top);
          target.strokeRect(x0 + 1, top + 1, Math.max(0, x1 - x0 - 2), Math.max(0, bottom - top - 2));
        } else {
          const y0 = toY(active.end);
          const y1 = toY(active.start);
          target.fillRect(left, y0, right - left, y1 - y0);
          target.strokeRect(left + 1, y0 + 1, Math.max(0, right - left - 2), Math.max(0, y1 - y0 - 2));
        }
        target.restore();
      }
    }

    target.shadowColor = "rgba(124, 228, 215, 0.28)";
    target.shadowBlur = 7;
    target.strokeStyle = "#8ce9de";
    target.lineWidth = 2;
    target.beginPath();
    target.moveTo(left, axisY);
    target.lineTo(right, axisY);
    target.moveTo(axisX, top);
    target.lineTo(axisX, bottom);
    target.stroke();

    target.fillStyle = "#8ce9de";
    drawArrow(target, right, axisY, right - 11, axisY - 6, right - 11, axisY + 6);
    drawArrow(target, axisX, top, axisX - 6, top + 11, axisX + 6, top + 11);

    target.shadowBlur = 0;
    target.fillStyle = "#8ba7a6";
    target.font = '13px "SFMono-Regular", "PingFang SC", monospace';

    for (const node of state.xNodes) {
      const x = toX(node);
      target.beginPath();
      target.fillStyle = "#58e4d3";
      target.arc(x, axisY, 5.5, 0, Math.PI * 2);
      target.fill();
      target.lineWidth = 2;
      target.strokeStyle = "#07191e";
      target.stroke();
    }

    for (const node of state.yNodes) {
      const y = toY(node);
      target.beginPath();
      target.fillStyle = "#ffb865";
      target.arc(axisX, y, 5.5, 0, Math.PI * 2);
      target.fill();
      target.lineWidth = 2;
      target.strokeStyle = "#07191e";
      target.stroke();
    }

    target.fillStyle = "#a8bfbd";
    target.font = '11px "SFMono-Regular", "PingFang SC", monospace';
    target.textAlign = "center";
    target.textBaseline = "middle";
    for (const seg of state.xSegments) {
      const x0 = toX(seg.start);
      const x1 = toX(seg.end);
      target.fillText(seg.label, (x0 + x1) / 2, bottom + 24, Math.max(24, x1 - x0 - 8));
    }

    target.textAlign = "left";
    target.textBaseline = "alphabetic";
    for (const seg of state.ySegments) {
      const y0 = toY(seg.end);
      const y1 = toY(seg.start);
      const labelWidth = Math.max(34, left - 18);
      const labelLines = wrapTextByWidth(target, seg.label, labelWidth);
      const availableHeight = Math.max(10, y1 - y0 - 6);
      const lineHeight = Math.min(13, Math.max(9, availableHeight / labelLines.length));

      target.save();
      target.beginPath();
      target.rect(2, y0 + 2, Math.max(1, left - 8), Math.max(1, y1 - y0 - 4));
      target.clip();
      drawWrappedHorizontalLabel(target, seg.label, 8, (y0 + y1) / 2, labelWidth, lineHeight);
      target.restore();
    }
    target.textAlign = "center";
    target.textBaseline = "alphabetic";

    for (const placement of state.placements.values()) {
      const op = state.operators.find((item) => item.id === placement.id);
      if (!op) continue;

      const x = toX(placement.x);
      const y = toY(placement.y);
      const r = getBoardAvatarRadius();
      const img = getImage(op.imageData || op.image);
      const highlightColor = getPlacementHighlightColor(placement);

      target.save();
      target.beginPath();
      target.arc(x, y, r, 0, Math.PI * 2);
      target.closePath();
      target.clip();
      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        target.drawImage(img, x - r, y - r, r * 2, r * 2);
      }
      else {
        target.fillStyle = "#17343a";
        target.fillRect(x - r, y - r, r * 2, r * 2);
      }
      target.restore();

      target.save();
      target.beginPath();
      target.arc(x, y, r, 0, Math.PI * 2);
      target.lineWidth = 2;
      target.shadowColor = "rgba(124, 228, 215, 0.5)";
      target.shadowBlur = 9;
      target.strokeStyle = "#b2f1e9";
      target.stroke();

      if (highlightColor) {
        const progress = state.segmentHoverProgress;
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        target.globalAlpha = easedProgress;
        target.beginPath();
        target.arc(x, y, r + 1 + 3 * easedProgress, 0, Math.PI * 2);
        target.lineWidth = 1.5 + 1.5 * easedProgress;
        target.shadowColor = highlightColor;
        target.shadowBlur = 6 + 12 * easedProgress;
        target.strokeStyle = `${highlightColor}b8`;
        target.stroke();

        target.beginPath();
        target.arc(x, y, r, 0, Math.PI * 2);
        target.lineWidth = 2 + 1.5 * easedProgress;
        target.shadowBlur = 5 + 9 * easedProgress;
        target.strokeStyle = highlightColor;
        target.stroke();
      }
      target.restore();

      target.shadowBlur = 0;
      target.fillStyle = "#d5e7e4";
      target.font = '12px "Avenir Next", "PingFang SC", sans-serif';
      target.textAlign = "center";
      if (state.showPlacementNames) {
        target.fillText(op.name, x, y + r + 14);
      }
    }
  }

  function render() {
    ensureCanvasSize();
    const metrics = getMetrics(view.width, view.height, view.pad);
    drawScene(ctx, metrics);
    renderSegmentAnnotations(metrics);
  }

  function renderSegmentAnnotations(metrics) {
    if (!segmentAnnotations) return;
    const signature = JSON.stringify({
      width: view.width,
      height: view.height,
      x: state.xSegments.map((s) => [s.start, s.end, s.label, s.description]),
      y: state.ySegments.map((s) => [s.start, s.end, s.label, s.description])
    });
    if (segmentAnnotations.dataset.signature === signature) return;

    segmentAnnotations.dataset.signature = signature;
    segmentAnnotations.innerHTML = "";

    const addAnnotation = (segment, index, axis) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `segment-annotation segment-annotation-${axis}`;
      button.setAttribute("aria-label", `${segment.label}${segment.description ? `：${segment.description}` : ""}`);

      if (axis === "x") {
        const x0 = metrics.toX(segment.start);
        const x1 = metrics.toX(segment.end);
        const center = (x0 + x1) / 2;
        button.style.left = `${x0}px`;
        button.style.top = `${metrics.bottom + 5}px`;
        button.style.width = `${Math.max(1, x1 - x0)}px`;
        button.style.height = `${Math.max(28, view.height - metrics.bottom - 8)}px`;
        if (center - 140 < 8) button.classList.add("is-edge-left");
        else if (center + 140 > view.width - 8) button.classList.add("is-edge-right");
      } else {
        const y0 = metrics.toY(segment.end);
        const y1 = metrics.toY(segment.start);
        button.style.left = "4px";
        button.style.top = `${y0}px`;
        button.style.width = `${Math.max(28, metrics.left - 8)}px`;
        button.style.height = `${Math.max(1, y1 - y0)}px`;
      }

      const note = document.createElement("span");
      note.className = "segment-annotation-note";
      note.textContent = segment.description || "尚未填写区段说明";
      button.appendChild(note);

      const activate = () => {
        setHoveredSegment({ axis, index });
      };
      const deactivate = () => {
        if (state.hoveredSegment?.axis === axis && state.hoveredSegment?.index === index) {
          setHoveredSegment(null);
        }
      };
      button.addEventListener("mouseenter", activate);
      button.addEventListener("mouseleave", deactivate);
      button.addEventListener("focus", activate);
      button.addEventListener("blur", deactivate);
      segmentAnnotations.appendChild(button);
    };

    state.xSegments.forEach((segment, index) => addAnnotation(segment, index, "x"));
    state.ySegments.forEach((segment, index) => addAnnotation(segment, index, "y"));
  }

  function getLocalPointer(ev) {
    const rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }

  function findNodeAt(x, y, metrics) {
    const axisX = metrics.left;
    const axisY = metrics.bottom;
    const r2 = 8 * 8;

    for (let i = 0; i < state.xNodes.length; i++) {
      const nx = metrics.toX(state.xNodes[i]);
      if ((x - nx) ** 2 + (y - axisY) ** 2 <= r2) return { axis: "x", index: i };
    }

    for (let i = 0; i < state.yNodes.length; i++) {
      const ny = metrics.toY(state.yNodes[i]);
      if ((x - axisX) ** 2 + (y - ny) ** 2 <= r2) return { axis: "y", index: i };
    }

    return null;
  }

  function findPlacementAt(x, y, metrics) {
    const hitRadius = getBoardAvatarRadius() + 4;
    for (const placement of state.placements.values()) {
      const px = metrics.toX(placement.x);
      const py = metrics.toY(placement.y);
      if ((x - px) ** 2 + (y - py) ** 2 <= hitRadius ** 2) return placement;
    }
    return null;
  }

  function addNode(axis, value) {
    const arr = axis === "x" ? state.xNodes : state.yNodes;
    if (Math.abs(value) < 0.02 || value <= -0.98 || value >= 0.98) return;
    if (arr.some((n) => Math.abs(n - value) < 0.024)) return;

    arr.push(clamp(value, -0.95, 0.95));
    arr.sort((a, b) => a - b);
    rebuildSegments(axis);
    updateSegmentEditors();
    render();
  }

  function removeNode(axis, index) {
    const arr = axis === "x" ? state.xNodes : state.yNodes;
    arr.splice(index, 1);
    rebuildSegments(axis);
    updateSegmentEditors();
    render();
  }

  function upsertPlacement(id, x, y) {
    state.placements.set(id, { id, x: clamp(x, -1, 1), y: clamp(y, -1, 1) });
    render();
  }

  function deletePlacement(id) {
    state.placements.delete(id);
    render();
  }

  function updateSegmentEditors() {
    xEditor.innerHTML = "";
    yEditor.innerHTML = "";

    state.xSegments.forEach((seg, index) => xEditor.appendChild(buildSegmentRow(seg, index, "x")));
    state.ySegments.forEach((seg, index) => yEditor.appendChild(buildSegmentRow(seg, index, "y")));
  }

  function buildSegmentRow(segment, index, axis) {
    const item = document.createElement("div");
    item.className = "segment-item";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = normalizeColor(segment.color);
    colorInput.addEventListener("input", () => {
      if (axis === "x") state.xSegments[index].color = colorInput.value;
      else state.ySegments[index].color = colorInput.value;
      render();
    });

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.maxLength = 16;
    labelInput.value = segment.label;
    labelInput.addEventListener("input", () => {
      const fallback = `${axis === "x" ? xSegmentPrefix : ySegmentPrefix}${index + 1}`;
      if (axis === "x") state.xSegments[index].label = labelInput.value || fallback;
      else state.ySegments[index].label = labelInput.value || fallback;
      render();
    });

    const descriptionInput = document.createElement("textarea");
    descriptionInput.className = "segment-description-input";
    descriptionInput.maxLength = 160;
    descriptionInput.rows = 2;
    descriptionInput.placeholder = "输入区段说明...";
    descriptionInput.value = segment.description || "";
    descriptionInput.addEventListener("input", () => {
      if (axis === "x") state.xSegments[index].description = descriptionInput.value;
      else state.ySegments[index].description = descriptionInput.value;
      render();
    });

    const fields = document.createElement("div");
    fields.className = "segment-fields";
    fields.append(labelInput, descriptionInput);
    item.append(colorInput, fields);
    return item;
  }

  function getSearchMatches(term) {
    const keyword = normalizeText(term);
    if (!keyword) {
      return state.operators.slice();
    }

    const matched = [];
    for (const op of state.operators) {
      const nameNorm = normalizeText(op.name);
      const idx = nameNorm.indexOf(keyword);
      if (idx === -1) continue;
      matched.push({ op, idx, prefix: idx === 0 ? 0 : 1 });
    }

    matched.sort((a, b) => {
      if (a.prefix !== b.prefix) return a.prefix - b.prefix;
      if (a.idx !== b.idx) return a.idx - b.idx;
      return a.op.name.localeCompare(b.op.name, "zh-Hans-CN");
    });

    return matched.map((item) => item.op);
  }

  function renderSuggestions() {
    const keyword = state.searchTerm.trim();
    if (!keyword) {
      searchSuggestions.hidden = true;
      searchSuggestions.innerHTML = "";
      return;
    }

    const matches = getSearchMatches(keyword);
    searchSuggestions.innerHTML = "";

    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "suggestion-item";
      empty.textContent = "未找到匹配角色";
      empty.style.cursor = "default";
      searchSuggestions.appendChild(empty);
      searchSuggestions.hidden = false;
      return;
    }

    for (const op of matches.slice(0, maxSuggestionItems)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "suggestion-item";
      btn.textContent = op.name;
      btn.addEventListener("click", () => {
        state.searchTerm = op.name;
        searchInput.value = op.name;
        renderOperatorList();
        renderSuggestions();
      });
      searchSuggestions.appendChild(btn);
    }

    searchSuggestions.hidden = false;
  }

  function renderOperatorList() {
    operatorList.innerHTML = "";
    const list = getSearchMatches(state.searchTerm);

    for (const op of list) {
      const card = document.createElement("article");
      card.className = "operator-card";
      card.draggable = true;
      card.dataset.id = op.id;

      const img = document.createElement("img");
      img.className = "operator-avatar";
      img.src = op.imageData || encodeURI(op.image);
      img.alt = op.name;
      img.loading = "lazy";

      const name = document.createElement("div");
      name.className = "operator-name";
      name.textContent = op.name;

      card.append(img, name);
      card.addEventListener("dragstart", (ev) => {
        ev.dataTransfer.setData("text/plain", op.id);
      });
      operatorList.appendChild(card);
    }

    syncSlider();
  }

  function syncModalBodyState() {
    const hasOpenModal = (axisReportModal && !axisReportModal.hidden)
      || (operatorCardModal && !operatorCardModal.hidden)
      || (interrogationModal && !interrogationModal.hidden)
      || (rankingModal && !rankingModal.hidden);
    document.body.classList.toggle("modal-open", Boolean(hasOpenModal));
  }

  function getOperatorScores(id) {
    const placement = state.placements.get(id);
    if (!placement) return { sensitivity: null, tolerance: null };
    return {
      sensitivity: Math.round(50 + ((placement.x + 1) / 2) * 50),
      tolerance: Math.round(((placement.y + 1) / 2) * 100)
    };
  }

  function updateOperatorCardScores(id) {
    const scores = getOperatorScores(id);
    if (operatorSensitivityScore) operatorSensitivityScore.textContent = scores.sensitivity ?? "--";
    if (operatorToleranceScore) operatorToleranceScore.textContent = scores.tolerance ?? "--";
  }

  function openOperatorCard(id) {
    const op = getOperatorById(id);
    if (!op || !operatorCardModal) return;

    state.activeCardId = id;
    operatorCardAvatar.src = op.imageData || encodeURI(op.image);
    operatorCardAvatar.alt = `${op.name}头像`;
    operatorCardName.textContent = op.name;
    operatorCardStableId.textContent = op.id;
    operatorCardPrefix.textContent = `干员${op.name}，`;
    operatorCardNote.value = state.operatorNotes.get(id) || "";
    updateOperatorCardScores(id);
    resizeOperatorCardNote();
    operatorCardSaveStatus.textContent = "内容将自动记忆并写入存档";
    operatorCardModal.hidden = false;
    syncModalBodyState();

    window.requestAnimationFrame(() => {
      resizeOperatorCardNote();
      operatorCardNote.focus();
      const end = operatorCardNote.value.length;
      operatorCardNote.setSelectionRange(end, end);
    });
  }

  function resizeOperatorCardNote() {
    if (!operatorCardNote) return;
    const editor = operatorCardNote.parentElement;
    if (editor && operatorCardPrefix) {
      editor.style.setProperty("--operator-prefix-width", `${operatorCardPrefix.scrollWidth}px`);
    }
    operatorCardNote.style.height = "auto";
    operatorCardNote.style.height = `${Math.max(118, operatorCardNote.scrollHeight)}px`;
  }

  function closeOperatorCard() {
    if (!operatorCardModal || operatorCardModal.hidden) return;
    saveBoardState();
    operatorCardModal.hidden = true;
    state.activeCardId = null;
    syncModalBodyState();
  }

  function openInterrogation() {
    const op = getOperatorById(state.activeCardId);
    if (!op || !interrogationModal) return;
    interrogationOperatorName.textContent = `干员 ${op.name}`;
    interrogationWarning.hidden = false;
    interrogationEditor.hidden = true;
    interrogationSaveStatus.textContent = "时间格式：HH:MM:SS.mmm";
    interrogationModal.hidden = false;
    syncModalBodyState();
  }

  function revealInterrogationEditor() {
    if (!state.activeCardId) return;
    const values = state.interrogationData.get(state.activeCardId) || {};
    laughTimeInput.value = formatClockTime(values.laughSeconds);
    confessTimeInput.value = formatClockTime(values.confessSeconds);
    laughTimeInput.classList.remove("is-invalid");
    confessTimeInput.classList.remove("is-invalid");
    interrogationWarning.hidden = true;
    interrogationEditor.hidden = false;
    window.requestAnimationFrame(() => laughTimeInput.focus());
  }

  function closeInterrogation() {
    if (!interrogationModal || interrogationModal.hidden) return;
    if (interrogationEditor && !interrogationEditor.hidden) saveInterrogationRecord();
    interrogationModal.hidden = true;
    syncModalBodyState();
  }

  function formatClockInputValue(input) {
    const digits = input.value.replace(/\D/g, "").slice(0, 9);
    let formatted = digits.slice(0, 2);
    if (digits.length > 2) formatted += `:${digits.slice(2, 4)}`;
    if (digits.length > 4) formatted += `:${digits.slice(4, 6)}`;
    if (digits.length > 6) formatted += `.${digits.slice(6, 9)}`;
    input.value = formatted;
    input.classList.remove("is-invalid");
    interrogationSaveStatus.textContent = "时间格式：HH:MM:SS.mmm";
  }

  function saveInterrogationRecord() {
    if (!state.activeCardId) return false;
    const laughText = laughTimeInput.value.trim();
    const confessText = confessTimeInput.value.trim();
    const laughSeconds = laughText ? parseClockTime(laughText) : null;
    const confessSeconds = confessText ? parseClockTime(confessText) : null;
    const laughInvalid = Boolean(laughText) && laughSeconds === null;
    const confessInvalid = Boolean(confessText) && confessSeconds === null;
    laughTimeInput.classList.toggle("is-invalid", laughInvalid);
    confessTimeInput.classList.toggle("is-invalid", confessInvalid);

    if (laughInvalid || confessInvalid) {
      interrogationSaveStatus.textContent = "格式错误，请输入 HH:MM:SS.mmm（分钟和秒为 00–59）";
      return false;
    }

    if (laughSeconds === null && confessSeconds === null) {
      state.interrogationData.delete(state.activeCardId);
    } else {
      state.interrogationData.set(state.activeCardId, { laughSeconds, confessSeconds });
    }
    saveBoardState();
    interrogationSaveStatus.textContent = "已加密保存至当前存档";
    return true;
  }

  function getRankingEntries(key) {
    if (key === "sensitivity") {
      return Array.from(state.placements.values())
        .map((placement) => {
          const op = getOperatorById(placement.id);
          return op ? { op, value: getOperatorScores(placement.id).sensitivity } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.value - a.value || a.op.name.localeCompare(b.op.name, "zh-Hans-CN"));
    }

    const field = key === "laugh" ? "laughSeconds" : "confessSeconds";
    return Array.from(state.interrogationData.entries())
      .map(([id, values]) => {
        const op = getOperatorById(id);
        const value = values[field];
        return op && Number.isFinite(value) ? { op, value } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.value - b.value || a.op.name.localeCompare(b.op.name, "zh-Hans-CN"));
  }

  function renderRanking(key) {
    if (!rankingRows) return;
    state.activeRankingKey = key;
    const entries = getRankingEntries(key);
    const labels = {
      sensitivity: ["生理敏感度", "由高到低"],
      laugh: ["爆笑用时", "由短到长"],
      confess: ["招供用时", "由短到长"]
    };
    rankingSummary.textContent = `${labels[key][0]} · ${labels[key][1]} · ${entries.length} 名有效干员`;
    document.querySelectorAll("[data-ranking-key]").forEach((button) => {
      button.setAttribute("aria-selected", String(button.dataset.rankingKey === key));
    });
    rankingRows.innerHTML = "";

    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "ranking-empty";
      empty.textContent = "暂无可用于该排名的数据";
      rankingRows.appendChild(empty);
      return;
    }

    entries.forEach((entry, index) => {
      const row = document.createElement("div");
      row.className = "ranking-row";
      const rank = document.createElement("strong");
      rank.className = "ranking-position";
      rank.textContent = String(index + 1).padStart(2, "0");
      const img = document.createElement("img");
      img.src = entry.op.imageData || encodeURI(entry.op.image);
      img.alt = "";
      const name = document.createElement("span");
      name.className = "ranking-name";
      name.textContent = entry.op.name;
      const value = document.createElement("b");
      value.className = "ranking-value";
      value.textContent = key === "sensitivity" ? String(entry.value) : formatClockTime(entry.value);
      row.append(rank, img, name, value);
      rankingRows.appendChild(row);
    });
  }

  function openRanking() {
    if (!rankingModal) return;
    if (!saveInterrogationRecord()) return;
    renderRanking(state.activeRankingKey || "sensitivity");
    rankingModal.hidden = false;
    syncModalBodyState();
  }

  function closeRanking() {
    if (!rankingModal || rankingModal.hidden) return;
    rankingModal.hidden = true;
    syncModalBodyState();
  }

  function getSegmentIndex(segments, value) {
    if (!segments.length) return -1;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;
      if (value >= segment.start && (value < segment.end || (isLast && value <= segment.end))) {
        return i;
      }
    }
    return value < segments[0].start ? 0 : segments.length - 1;
  }

  function buildReportAvatar(placement) {
    const op = getOperatorById(placement.id);
    if (!op) return null;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "report-avatar-card";
    button.title = `打开${op.name}的干员名片`;

    const img = document.createElement("img");
    img.src = op.imageData || encodeURI(op.image);
    img.alt = op.name;

    const name = document.createElement("span");
    name.textContent = op.name;

    button.append(img, name);
    button.addEventListener("click", () => openOperatorCard(op.id));
    return button;
  }

  function getAxisReportData(axis) {
    const segments = axis === "x" ? state.xSegments : state.ySegments;
    const otherAxis = axis === "x" ? "y" : "x";
    const grouped = segments.map(() => []);

    for (const placement of state.placements.values()) {
      const index = getSegmentIndex(segments, placement[axis]);
      if (grouped[index]) grouped[index].push(placement);
    }

    for (const group of grouped) {
      group.sort((a, b) => {
        const primary = b[axis] - a[axis];
        if (primary) return primary;
        const secondary = b[otherAxis] - a[otherAxis];
        if (secondary) return secondary;
        const aName = getOperatorById(a.id)?.name || "";
        const bName = getOperatorById(b.id)?.name || "";
        return aName.localeCompare(bName, "zh-Hans-CN");
      });
    }

    return { segments, grouped };
  }

  function renderAxisReport(axis) {
    if (!axisReportRows) return;
    const { segments, grouped } = getAxisReportData(axis);

    axisReportKicker.textContent = axis === "x"
      ? "PHYSICAL SENSITIVITY / X AXIS"
      : "MENTAL ENDURANCE / Y AXIS";
    axisReportTitle.textContent = axis === "x" ? "生理敏感度单轴报告" : "心理忍耐力单轴报告";
    axisReportSummary.textContent = `${state.placements.size} 名已定位干员 · ${segments.length} 个区段 · 从高位区段向低位区段排列`;
    axisReportRows.innerHTML = "";

    for (let index = segments.length - 1; index >= 0; index--) {
      const segment = segments[index];
      const row = document.createElement("article");
      row.className = "report-row";
      row.style.setProperty("--tier-color", normalizeColor(segment.color));

      const label = document.createElement("div");
      label.className = "report-tier-label";
      label.title = segment.description || "尚未填写区段说明";

      const rank = document.createElement("small");
      rank.textContent = `TIER ${String(segments.length - index).padStart(2, "0")}`;
      const title = document.createElement("h3");
      title.textContent = segment.label;
      const description = document.createElement("p");
      description.textContent = segment.description || "尚未填写区段说明";
      label.append(rank, title, description);

      const avatars = document.createElement("div");
      avatars.className = "report-tier-avatars";
      if (!grouped[index].length) {
        const empty = document.createElement("span");
        empty.className = "report-empty";
        empty.textContent = "NO OPERATOR DATA";
        avatars.appendChild(empty);
      } else {
        for (const placement of grouped[index]) {
          const avatar = buildReportAvatar(placement);
          if (avatar) avatars.appendChild(avatar);
        }
      }

      row.append(label, avatars);
      axisReportRows.appendChild(row);
    }
  }

  function waitForCanvasImage(src) {
    const img = getImage(src);
    if (img.complete && img.naturalWidth > 0) {
      return Promise.resolve(img);
    }

    return new Promise((resolve) => {
      let settled = false;
      let timer = 0;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        img.removeEventListener("load", onLoad);
        img.removeEventListener("error", onError);
        resolve(value);
      };
      const onLoad = () => finish(img.naturalWidth > 0 ? img : null);
      const onError = () => finish(null);
      img.addEventListener("load", onLoad);
      img.addEventListener("error", onError);
      timer = window.setTimeout(() => finish(null), 6000);
    });
  }

  function waitForReportImage(op) {
    return waitForCanvasImage(op.imageData || op.image);
  }

  async function loadAxisReportImages(grouped) {
    const unique = new Map();
    for (const group of grouped) {
      for (const placement of group) {
        const op = getOperatorById(placement.id);
        if (op) unique.set(op.id, op);
      }
    }

    const images = new Map();
    await Promise.all(Array.from(unique.values()).map(async (op) => {
      images.set(op.id, await waitForReportImage(op));
    }));
    return images;
  }

  function drawReportAvatarOnCanvas(target, op, img, x, y) {
    const cardWidth = 98;
    const cardHeight = 104;
    const radius = 33;
    const centerX = x + cardWidth / 2;
    const centerY = y + 38;

    target.fillStyle = "rgba(12, 38, 44, 0.88)";
    target.fillRect(x, y, cardWidth, cardHeight);
    target.strokeStyle = "rgba(124, 228, 215, 0.18)";
    target.lineWidth = 1;
    target.strokeRect(x + 0.5, y + 0.5, cardWidth - 1, cardHeight - 1);

    target.save();
    target.beginPath();
    target.arc(centerX, centerY, radius, 0, Math.PI * 2);
    target.clip();
    target.fillStyle = "#0a2025";
    target.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    if (img) {
      target.drawImage(img, centerX - radius, centerY - radius, radius * 2, radius * 2);
    }
    target.restore();

    target.beginPath();
    target.arc(centerX, centerY, radius, 0, Math.PI * 2);
    target.strokeStyle = "rgba(124, 228, 215, 0.58)";
    target.stroke();

    target.fillStyle = "#c8dcda";
    target.font = '15px "Avenir Next", "PingFang SC", sans-serif';
    target.textAlign = "center";
    target.textBaseline = "middle";
    target.fillText(op.name, centerX, y + 88, cardWidth - 10);
  }

  function getExportRenderScale(width, height, preferredScale) {
    const maxSide = 6000;
    const maxPixels = 16000000;
    return Math.max(1, Math.min(
      preferredScale,
      maxSide / Math.max(width, height),
      Math.sqrt(maxPixels / Math.max(1, width * height))
    ));
  }

  async function createAxisReportCanvas(axis) {
    const { segments, grouped } = getAxisReportData(axis);
    const images = await loadAxisReportImages(grouped);
    const width = 1600;
    const pagePad = 56;
    const headerHeight = 196;
    const labelWidth = 292;
    const rowGap = 10;
    const avatarCellWidth = 110;
    const avatarCellHeight = 116;
    const avatarAreaWidth = width - pagePad * 2 - labelWidth - 30;
    const columns = Math.max(1, Math.floor(avatarAreaWidth / avatarCellWidth));

    const measureCanvas = document.createElement("canvas");
    const measure = measureCanvas.getContext("2d");
    measure.font = '17px "Avenir Next", "PingFang SC", sans-serif';

    const rows = [];
    for (let index = segments.length - 1; index >= 0; index--) {
      const segment = segments[index];
      const description = segment.description || "尚未填写区段说明";
      const descriptionLines = wrapTextByWidth(measure, description, labelWidth - 42);
      const avatarLines = Math.max(1, Math.ceil(grouped[index].length / columns));
      const avatarHeight = 28 + avatarLines * avatarCellHeight;
      const labelHeight = 92 + descriptionLines.length * 23;
      rows.push({
        index,
        segment,
        descriptionLines,
        height: Math.max(156, avatarHeight, labelHeight)
      });
    }

    const height = headerHeight + rows.reduce((sum, row) => sum + row.height, 0)
      + Math.max(0, rows.length - 1) * rowGap + pagePad;
    const renderScale = getExportRenderScale(width, height, 2);
    const out = document.createElement("canvas");
    out.width = Math.round(width * renderScale);
    out.height = Math.round(height * renderScale);
    const target = out.getContext("2d");
    target.setTransform(renderScale, 0, 0, renderScale, 0, 0);

    const bg = target.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#0a2026");
    bg.addColorStop(0.55, "#06171c");
    bg.addColorStop(1, "#030c10");
    target.fillStyle = bg;
    target.fillRect(0, 0, width, height);

    target.strokeStyle = "rgba(124, 228, 215, 0.045)";
    target.lineWidth = 1;
    for (let x = 0; x <= width; x += 32) {
      target.beginPath();
      target.moveTo(x, 0);
      target.lineTo(x, height);
      target.stroke();
    }
    for (let y = 0; y <= height; y += 32) {
      target.beginPath();
      target.moveTo(0, y);
      target.lineTo(width, y);
      target.stroke();
    }

    target.fillStyle = "#7ce4d7";
    target.fillRect(pagePad, 34, 150, 4);
    target.fillStyle = "#7ce4d7";
    target.font = '15px "SFMono-Regular", "Roboto Mono", monospace';
    target.textAlign = "left";
    target.textBaseline = "alphabetic";
    target.fillText(axis === "x" ? "PHYSICAL SENSITIVITY / X AXIS" : "MENTAL ENDURANCE / Y AXIS", pagePad, 74);

    target.fillStyle = "#edf8f5";
    target.font = '600 48px "Avenir Next", "PingFang SC", sans-serif';
    target.fillText(axis === "x" ? "生理敏感度单轴报告" : "心理忍耐力单轴报告", pagePad, 128);

    target.fillStyle = "#829b99";
    target.font = '17px "Avenir Next", "PingFang SC", sans-serif';
    target.fillText(`${state.placements.size} 名已定位干员 · ${segments.length} 个区段 · 从高位区段向低位区段排列`, pagePad, 161);

    target.fillStyle = "#9eb7b4";
    target.font = '14px "SFMono-Regular", "Roboto Mono", monospace';
    target.textAlign = "right";
    target.fillText("HIGH  →  LOW", width - pagePad, 161);

    let rowY = headerHeight;
    rows.forEach((row, rowIndex) => {
      const { segment, index, descriptionLines } = row;
      const tierColor = normalizeColor(segment.color);
      target.fillStyle = "rgba(2, 11, 14, 0.82)";
      target.fillRect(pagePad, rowY, width - pagePad * 2, row.height);
      target.strokeStyle = "rgba(124, 228, 215, 0.18)";
      target.strokeRect(pagePad + 0.5, rowY + 0.5, width - pagePad * 2 - 1, row.height - 1);

      target.globalAlpha = 0.1;
      target.fillStyle = tierColor;
      target.fillRect(pagePad, rowY, labelWidth, row.height);
      target.globalAlpha = 1;
      target.fillStyle = tierColor;
      target.fillRect(pagePad, rowY, 5, row.height);

      const labelX = pagePad + 24;
      target.textAlign = "left";
      target.fillStyle = tierColor;
      target.font = '13px "SFMono-Regular", "Roboto Mono", monospace';
      target.fillText(`TIER ${String(rowIndex + 1).padStart(2, "0")}`, labelX, rowY + 38);

      target.fillStyle = "#edf8f5";
      target.font = '600 23px "Avenir Next", "PingFang SC", sans-serif';
      target.fillText(segment.label, labelX, rowY + 72, labelWidth - 44);

      target.fillStyle = "#829b99";
      target.font = '17px "Avenir Next", "PingFang SC", sans-serif';
      descriptionLines.forEach((line, lineIndex) => {
        target.fillText(line, labelX, rowY + 104 + lineIndex * 23, labelWidth - 44);
      });

      const avatarStartX = pagePad + labelWidth + 18;
      const avatarStartY = rowY + 18;
      if (!grouped[index].length) {
        target.fillStyle = "#506765";
        target.font = '13px "SFMono-Regular", "Roboto Mono", monospace';
        target.fillText("NO OPERATOR DATA", avatarStartX, rowY + row.height / 2);
      } else {
        grouped[index].forEach((placement, avatarIndex) => {
          const op = getOperatorById(placement.id);
          if (!op) return;
          const column = avatarIndex % columns;
          const line = Math.floor(avatarIndex / columns);
          drawReportAvatarOnCanvas(
            target,
            op,
            images.get(op.id),
            avatarStartX + column * avatarCellWidth,
            avatarStartY + line * avatarCellHeight
          );
        });
      }

      rowY += row.height + rowGap;
    });

    target.fillStyle = "rgba(124, 228, 215, 0.42)";
    target.font = '12px "SFMono-Regular", "Roboto Mono", monospace';
    target.textAlign = "right";
    target.fillText("ARKNIGHTS // TK ANALYSIS MATRIX", width - pagePad, height - 24);
    return out;
  }

  function downloadCanvasAsPng(canvas, filename) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("无法生成 PNG 文件"));
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      }, "image/png");
    });
  }

  function drawMatrixAxisTag(target, text, x, y, align, scale) {
    const fontSize = clamp(Math.round(12 * scale), 12, 24);
    const padX = clamp(Math.round(9 * scale), 8, 18);
    const padY = clamp(Math.round(6 * scale), 5, 12);
    target.font = `${fontSize}px "SFMono-Regular", "Roboto Mono", "PingFang SC", monospace`;
    const textWidth = target.measureText(text).width;
    const boxWidth = textWidth + padX * 2;
    const boxHeight = fontSize + padY * 2;
    const boxX = align === "right" ? x - boxWidth : x;

    target.fillStyle = "rgba(4, 17, 21, 0.94)";
    target.fillRect(boxX, y, boxWidth, boxHeight);
    target.strokeStyle = "rgba(124, 228, 215, 0.48)";
    target.lineWidth = Math.max(1, Math.round(scale));
    target.strokeRect(boxX + 0.5, y + 0.5, boxWidth - 1, boxHeight - 1);
    target.fillStyle = "#7ce4d7";
    target.textAlign = "left";
    target.textBaseline = "top";
    target.fillText(text, boxX + padX, y + padY);
  }

  function createMatrixReportCanvas(source, rhodesLogo, arknightsLogo) {
    const width = source.width;
    const compact = width < 760;
    const headerHeight = compact
      ? clamp(Math.round(width * 0.55), 176, 250)
      : clamp(Math.round(width * 0.17), 180, 270);
    const pad = clamp(Math.round(width * 0.04), 18, 64);
    const out = document.createElement("canvas");
    out.width = width;
    out.height = headerHeight + source.height;
    const target = out.getContext("2d");

    const header = target.createLinearGradient(0, 0, width, headerHeight);
    header.addColorStop(0, "#041014");
    header.addColorStop(0.62, "#07191d");
    header.addColorStop(1, "#030b0e");
    target.fillStyle = header;
    target.fillRect(0, 0, width, headerHeight);

    target.strokeStyle = "rgba(124, 228, 215, 0.055)";
    target.lineWidth = 1;
    const gridSize = clamp(Math.round(width / 32), 24, 52);
    for (let x = 0; x <= width; x += gridSize) {
      target.beginPath();
      target.moveTo(x, 0);
      target.lineTo(x, headerHeight);
      target.stroke();
    }

    const iconHeight = compact ? headerHeight * 0.3 : headerHeight * 0.44;
    const iconWidth = iconHeight * 1.176;
    const wordmarkWidth = compact
      ? clamp(width * 0.46, 130, 300)
      : clamp(width * 0.25, 190, 390);
    const wordmarkHeight = wordmarkWidth / 3.56;
    const logoGap = clamp(Math.round(width * 0.015), 10, 24);
    const lockupWidth = iconWidth + logoGap + wordmarkWidth;
    const lockupX = compact ? (width - lockupWidth) / 2 : pad;
    const lockupY = compact
      ? clamp(Math.round(headerHeight * 0.12), 18, 34)
      : (headerHeight - Math.max(iconHeight, wordmarkHeight)) / 2;

    if (rhodesLogo) {
      target.drawImage(rhodesLogo, lockupX, lockupY, iconWidth, iconHeight);
    }
    if (arknightsLogo) {
      target.drawImage(
        arknightsLogo,
        lockupX + iconWidth + logoGap,
        lockupY + (iconHeight - wordmarkHeight) / 2,
        wordmarkWidth,
        wordmarkHeight
      );
    } else {
      target.fillStyle = "#edf8f5";
      target.font = `600 ${clamp(Math.round(width * 0.04), 22, 56)}px "Avenir Next", sans-serif`;
      target.textAlign = "left";
      target.textBaseline = "middle";
      target.fillText("ARKNIGHTS", lockupX + iconWidth + logoGap, lockupY + iconHeight / 2);
    }

    const titleFont = compact
      ? clamp(Math.round(width * 0.065), 22, 38)
      : clamp(Math.round(width * 0.034), 30, 54);
    target.textAlign = compact ? "center" : "right";
    target.textBaseline = "alphabetic";
    target.fillStyle = "#7ce4d7";
    target.font = `${clamp(Math.round(titleFont * 0.34), 10, 16)}px "SFMono-Regular", "Roboto Mono", monospace`;
    target.fillText(
      "ANALYSIS MATRIX / TK-01",
      compact ? width / 2 : width - pad,
      compact ? headerHeight * 0.68 : headerHeight * 0.39
    );
    target.fillStyle = "#edf8f5";
    target.font = `600 ${titleFont}px "Avenir Next", "PingFang SC", sans-serif`;
    target.fillText(
      "干员 TK 分析矩阵",
      compact ? width / 2 : width - pad,
      compact ? headerHeight * 0.86 : headerHeight * 0.65
    );

    target.fillStyle = "#7ce4d7";
    target.fillRect(0, headerHeight - Math.max(2, Math.round(width / 900)), width, Math.max(2, Math.round(width / 900)));
    target.drawImage(source, 0, headerHeight);

    const scale = source.width / view.width;
    const metrics = getMetrics(view.width, view.height, view.pad);
    drawMatrixAxisTag(
      target,
      "心理忍耐力",
      (metrics.left + 14) * scale,
      headerHeight + (metrics.top + 14) * scale,
      "left",
      scale
    );
    drawMatrixAxisTag(
      target,
      "生理敏感度",
      (metrics.right - 14) * scale,
      headerHeight + (metrics.bottom - 48) * scale,
      "right",
      scale
    );
    return out;
  }

  function appendPublicLinkFooter(source) {
    const footerHeight = clamp(Math.round(source.width * 0.055), 64, 112);
    const pad = clamp(Math.round(source.width * 0.035), 30, 58);
    const out = document.createElement("canvas");
    out.width = source.width;
    out.height = source.height + footerHeight;
    const target = out.getContext("2d");

    target.drawImage(source, 0, 0);

    const footer = target.createLinearGradient(0, source.height, source.width, source.height);
    footer.addColorStop(0, "#041014");
    footer.addColorStop(0.55, "#07191d");
    footer.addColorStop(1, "#041014");
    target.fillStyle = footer;
    target.fillRect(0, source.height, source.width, footerHeight);

    target.fillStyle = "rgba(124, 228, 215, 0.62)";
    target.fillRect(0, source.height, source.width, Math.max(2, Math.round(source.width / 900)));

    let fontSize = clamp(Math.round(source.width * 0.014), 15, 24);
    const baseline = source.height + footerHeight / 2 + fontSize * 0.34;
    target.textBaseline = "alphabetic";
    target.font = `${fontSize}px "SFMono-Regular", "Roboto Mono", monospace`;
    const label = "CREATE YOUR OWN MATRIX";
    const hasRoomForLabel = target.measureText(label).width
      + target.measureText(publicPageUrl).width + pad * 3 <= source.width;

    if (hasRoomForLabel) {
      target.textAlign = "left";
      target.fillStyle = "rgba(124, 228, 215, 0.66)";
      target.fillText(label, pad, baseline);
      target.textAlign = "right";
      target.fillStyle = "#c8dcda";
      target.fillText(publicPageUrl, source.width - pad, baseline);
    } else {
      const availableWidth = source.width - pad * 2;
      const measuredUrlWidth = target.measureText(publicPageUrl).width;
      if (measuredUrlWidth > availableWidth) {
        fontSize = Math.max(10, Math.floor(fontSize * availableWidth / measuredUrlWidth));
        target.font = `${fontSize}px "SFMono-Regular", "Roboto Mono", monospace`;
      }
      target.textAlign = "center";
      target.fillStyle = "#c8dcda";
      target.fillText(publicPageUrl, source.width / 2, baseline);
    }
    return out;
  }

  async function exportAxisReportAsPNG() {
    const axis = state.activeReportAxis;
    if (!axis || !exportAxisReportBtn) return;
    const originalLabel = exportAxisReportBtn.querySelector("span")?.textContent || "导出报告";
    const label = exportAxisReportBtn.querySelector("span");
    exportAxisReportBtn.disabled = true;
    if (label) label.textContent = "生成中...";

    try {
      const reportCanvas = await createAxisReportCanvas(axis);
      const exportCanvas = appendPublicLinkFooter(reportCanvas);
      await downloadCanvasAsPng(
        exportCanvas,
        `arknights-tk-${axis}-axis-report-${getFileStamp()}.png`
      );
      if (label) label.textContent = "已导出";
      window.setTimeout(() => {
        if (label) label.textContent = originalLabel;
      }, 1200);
    } catch (err) {
      console.error("Report PNG export failed", err);
      const reason = err && err.message ? err.message : "未知错误";
      alert(`报告导出失败：${reason}`);
      if (label) label.textContent = originalLabel;
    } finally {
      exportAxisReportBtn.disabled = false;
    }
  }

  function openAxisReport(axis) {
    if (!axisReportModal) return;
    state.activeReportAxis = axis;
    renderAxisReport(axis);
    axisReportModal.hidden = false;
    syncModalBodyState();
  }

  function closeAxisReport() {
    if (!axisReportModal || axisReportModal.hidden) return;
    axisReportModal.hidden = true;
    state.activeReportAxis = null;
    syncModalBodyState();
  }

  function bindModalEvents() {
    xReportBtn?.addEventListener("click", () => openAxisReport("x"));
    yReportBtn?.addEventListener("click", () => openAxisReport("y"));
    exportAxisReportBtn?.addEventListener("click", exportAxisReportAsPNG);

    document.querySelectorAll('[data-close-modal="report"]').forEach((button) => {
      button.addEventListener("click", closeAxisReport);
    });
    document.querySelectorAll('[data-close-modal="card"]').forEach((button) => {
      button.addEventListener("click", closeOperatorCard);
    });
    document.querySelectorAll('[data-close-modal="interrogation"]').forEach((button) => {
      button.addEventListener("click", closeInterrogation);
    });
    document.querySelectorAll('[data-close-modal="ranking"]').forEach((button) => {
      button.addEventListener("click", closeRanking);
    });

    openInterrogationBtn?.addEventListener("click", openInterrogation);
    confirmInterrogationBtn?.addEventListener("click", revealInterrogationEditor);
    saveInterrogationBtn?.addEventListener("click", saveInterrogationRecord);
    rankingBtn?.addEventListener("click", openRanking);
    [laughTimeInput, confessTimeInput].forEach((input) => {
      input?.addEventListener("input", () => formatClockInputValue(input));
      input?.addEventListener("change", saveInterrogationRecord);
    });
    document.querySelectorAll("[data-ranking-key]").forEach((button) => {
      button.addEventListener("click", () => renderRanking(button.dataset.rankingKey));
    });

    operatorCardNote?.addEventListener("input", () => {
      if (!state.activeCardId) return;
      resizeOperatorCardNote();
      const content = operatorCardNote.value.slice(0, operatorNoteMaxLength);
      if (content) state.operatorNotes.set(state.activeCardId, content);
      else state.operatorNotes.delete(state.activeCardId);

      saveBoardState();
      operatorCardSaveStatus.textContent = "已自动保存";
      window.clearTimeout(noteSaveTimer);
      noteSaveTimer = window.setTimeout(() => {
        operatorCardSaveStatus.textContent = "内容将自动记忆并写入存档";
      }, 1200);
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape") return;
      if (rankingModal && !rankingModal.hidden) closeRanking();
      else if (interrogationModal && !interrogationModal.hidden) closeInterrogation();
      else if (operatorCardModal && !operatorCardModal.hidden) closeOperatorCard();
      else if (axisReportModal && !axisReportModal.hidden) closeAxisReport();
    });
  }

  function syncSlider() {
    if (!scrollSlider) return;
    const max = Math.max(0, Math.round(operatorList.scrollWidth - operatorList.clientWidth));
    scrollSlider.max = String(max);
    scrollSlider.value = String(clamp(Math.round(operatorList.scrollLeft), 0, max));
  }

  function bindOperatorEvents() {
    searchInput.addEventListener("input", () => {
      state.searchTerm = searchInput.value;
      renderOperatorList();
      renderSuggestions();
    });

    searchInput.addEventListener("focus", () => {
      renderSuggestions();
    });

    document.addEventListener("click", (ev) => {
      if (!searchSuggestions.contains(ev.target) && ev.target !== searchInput) {
        searchSuggestions.hidden = true;
      }
    });

    operatorList.addEventListener("scroll", syncSlider);
    operatorList.addEventListener(
      "wheel",
      (ev) => {
        ev.preventDefault();
        operatorList.scrollLeft += ev.deltaY + ev.deltaX;
        syncSlider();
      },
      { passive: false }
    );

    if (scrollSlider) {
      scrollSlider.addEventListener("input", () => {
        operatorList.scrollLeft = Number(scrollSlider.value);
        syncSlider();
      });
    }
  }

  function bindCanvasEvents() {
    canvas.addEventListener("mousedown", (ev) => {
      if (ev.button !== 0) return;
      const metrics = getMetrics(view.width, view.height, view.pad);
      const p = getLocalPointer(ev);
      const placed = findPlacementAt(p.x, p.y, metrics);
      if (placed) {
        state.draggingPlacementId = placed.id;
        state.pointerDownPlacementId = placed.id;
        state.placementDragged = false;
        state.dragStartPointer = p;
      } else {
        state.pointerDownPlacementId = null;
        state.placementDragged = false;
        state.dragStartPointer = null;
      }
    });

    window.addEventListener("mousemove", (ev) => {
      if (!state.draggingPlacementId) return;
      const rect = canvas.getBoundingClientRect();
      if (ev.clientX < rect.left || ev.clientX > rect.right || ev.clientY < rect.top || ev.clientY > rect.bottom) return;

      const metrics = getMetrics(view.width, view.height, view.pad);
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;

      if (state.dragStartPointer) {
        const moved = Math.hypot(x - state.dragStartPointer.x, y - state.dragStartPointer.y);
        if (moved > 2) state.placementDragged = true;
      } else {
        state.placementDragged = true;
      }
      upsertPlacement(state.draggingPlacementId, metrics.toValueX(x), metrics.toValueY(y));
    });

    window.addEventListener("mouseup", () => {
      state.draggingPlacementId = null;
      state.dragStartPointer = null;
    });

    canvas.addEventListener("mousemove", (ev) => {
      if (state.draggingPlacementId) return;
      const metrics = getMetrics(view.width, view.height, view.pad);
      const p = getLocalPointer(ev);
      const axisX = metrics.left;
      const axisY = metrics.bottom;

      if (p.x >= metrics.left && p.x <= metrics.right && Math.abs(p.y - axisY) <= 10) canvas.style.cursor = "ew-resize";
      else if (p.y >= metrics.top && p.y <= metrics.bottom && Math.abs(p.x - axisX) <= 10) canvas.style.cursor = "ns-resize";
      else canvas.style.cursor = "crosshair";
    });

    canvas.addEventListener("click", (ev) => {
      if (state.draggingPlacementId) return;

      const metrics = getMetrics(view.width, view.height, view.pad);
      const p = getLocalPointer(ev);
      const placement = findPlacementAt(p.x, p.y, metrics);
      if (placement) {
        const shouldDelete = state.pointerDownPlacementId === placement.id && !state.placementDragged;
        state.pointerDownPlacementId = null;
        state.placementDragged = false;
        if (shouldDelete) deletePlacement(placement.id);
        return;
      }

      state.pointerDownPlacementId = null;
      state.placementDragged = false;

      const node = findNodeAt(p.x, p.y, metrics);
      if (node) {
        removeNode(node.axis, node.index);
        return;
      }

      const axisX = metrics.left;
      const axisY = metrics.bottom;
      if (p.x >= metrics.left && p.x <= metrics.right && Math.abs(p.y - axisY) <= 10) addNode("x", metrics.toValueX(p.x));
      else if (p.y >= metrics.top && p.y <= metrics.bottom && Math.abs(p.x - axisX) <= 10) addNode("y", metrics.toValueY(p.y));
    });

    canvas.addEventListener("dblclick", (ev) => {
      const metrics = getMetrics(view.width, view.height, view.pad);
      const p = getLocalPointer(ev);
      const placement = findPlacementAt(p.x, p.y, metrics);
      if (placement) deletePlacement(placement.id);
    });

    canvas.addEventListener("contextmenu", (ev) => {
      const metrics = getMetrics(view.width, view.height, view.pad);
      const p = getLocalPointer(ev);
      const placement = findPlacementAt(p.x, p.y, metrics);
      if (!placement) return;
      ev.preventDefault();
      openOperatorCard(placement.id);
    });

    canvas.addEventListener("dragover", (ev) => ev.preventDefault());
    canvas.addEventListener("drop", (ev) => {
      ev.preventDefault();
      const id = ev.dataTransfer.getData("text/plain");
      if (!id) return;
      const metrics = getMetrics(view.width, view.height, view.pad);
      const p = getLocalPointer(ev);
      upsertPlacement(id, metrics.toValueX(p.x), metrics.toValueY(p.y));
    });
  }

  async function exportAsPNG() {
    render();

    try {
      const [rhodesLogo, arknightsLogo] = await Promise.all([
        waitForCanvasImage(rhodesLogoPath),
        waitForCanvasImage(arknightsLogoPath)
      ]);
      const renderScale = getExportRenderScale(view.width, view.height, 3);
      const matrixCanvas = document.createElement("canvas");
      matrixCanvas.width = Math.round(view.width * renderScale);
      matrixCanvas.height = Math.round(view.height * renderScale);
      const matrixTarget = matrixCanvas.getContext("2d");
      matrixTarget.setTransform(renderScale, 0, 0, renderScale, 0, 0);
      drawScene(matrixTarget, getMetrics(view.width, view.height, view.pad));

      const reportCanvas = createMatrixReportCanvas(matrixCanvas, rhodesLogo, arknightsLogo);
      const out = appendPublicLinkFooter(reportCanvas);
      await downloadCanvasAsPng(out, `arknights-tk-map-${getFileStamp()}.png`);
    } catch (err) {
      console.error("PNG export failed", err);
      const reason = err && err.message ? err.message : "未知错误";
      alert(`导出失败：${reason}\n建议使用 http/https 链接访问页面，或使用内嵌头像数据后重试。`);
    }
  }

  function bindExportEvent() {
    if (avatarSizeSlider) {
      avatarSizeSlider.addEventListener("input", applyAvatarScaleFromSlider);
      avatarSizeSlider.addEventListener("change", applyAvatarScaleFromSlider);
      updateAvatarScaleUI();
    }

    if (toggleNamesBtn) {
      toggleNamesBtn.addEventListener("click", () => {
        state.showPlacementNames = !state.showPlacementNames;
        toggleNamesBtn.setAttribute("aria-pressed", state.showPlacementNames ? "true" : "false");
        render();
      });
      toggleNamesBtn.setAttribute("aria-pressed", state.showPlacementNames ? "true" : "false");
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const ok = saveBoardState();
        flashSavedState(ok);
        if (ok) downloadBoardStateFile();
      });
    }

    if (importStateBtn && importStateInput) {
      importStateBtn.addEventListener("click", () => {
        importStateInput.click();
      });
      importStateInput.addEventListener("change", () => {
        const file = importStateInput.files && importStateInput.files[0];
        if (file) readBoardStateFile(file);
        importStateInput.value = "";
      });
    }

    exportBtn.addEventListener("click", exportAsPNG);
  }

  function init() {
    if (operatorCount) operatorCount.textContent = String(state.operators.length);
    initSegments();
    loadBoardState();
    updateSegmentEditors();
    bindOperatorEvents();
    bindCanvasEvents();
    bindExportEvent();
    bindModalEvents();

    renderOperatorList();
    render();

    window.addEventListener("resize", () => {
      render();
      syncSlider();
    });

    window.addEventListener("beforeunload", () => {
      for (const u of state.blobUrls) {
        URL.revokeObjectURL(u);
      }
      state.blobUrls = [];
    });
  }

  window.getArknightsTkAiContext = buildAiArchiveContext;
  init();
})();
