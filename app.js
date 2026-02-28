(() => {
  const canvas = document.getElementById("planeCanvas");
  const wrap = document.getElementById("planeWrap");
  const ctx = canvas.getContext("2d");

  const xEditor = document.getElementById("xSegmentEditor");
  const yEditor = document.getElementById("ySegmentEditor");
  const avatarSizeSlider = document.getElementById("avatarSizeSlider");
  const avatarSizeValue = document.getElementById("avatarSizeValue");
  const toggleNamesBtn = document.getElementById("toggleNamesBtn");
  const saveBtn = document.getElementById("saveBtn");
  const exportBtn = document.getElementById("exportBtn");

  const searchInput = document.getElementById("searchInput");
  const searchSuggestions = document.getElementById("searchSuggestions");
  const operatorList = document.getElementById("operatorList");
  const scrollSlider = document.getElementById("scrollSlider");

  const paletteX = ["#bbd7ff", "#9ac5ff", "#7eb2ff", "#5d9dff", "#3f87fa", "#2f6fe0"];
  const paletteY = ["#ffe4bd", "#ffd49f", "#ffc37d", "#ffb05f", "#f89639", "#e57b1f"];
  const colorCtx = document.createElement("canvas").getContext("2d");
  const baseBoardAvatarRadius = 26;
  const maxSuggestionItems = 200;
  const xSegmentPrefix = "\u6a2a\u8f74\u533a\u6bb5";
  const ySegmentPrefix = "\u7eb5\u8f74\u533a\u6bb5";
  const storageKey = "arknights_tk_board_state_v1";

  const state = {
    xNodes: [],
    yNodes: [],
    xSegments: [],
    ySegments: [],
    operators: Array.isArray(window.OPERATORS_DATA) ? window.OPERATORS_DATA : [],
    searchTerm: "",
    placements: new Map(),
    images: new Map(),
    blobUrls: [],
    avatarScale: 1,
    showPlacementNames: true,
    draggingPlacementId: null,
    pointerDownPlacementId: null,
    placementDragged: false,
    dragStartPointer: null
  };

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

  function saveBoardState() {
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      avatarScale: state.avatarScale,
      showPlacementNames: state.showPlacementNames,
      xNodes: state.xNodes.slice(),
      yNodes: state.yNodes.slice(),
      xSegments: state.xSegments.map((s) => ({ label: s.label, color: s.color })),
      ySegments: state.ySegments.map((s) => ({ label: s.label, color: s.color })),
      placements: Array.from(state.placements.values()).map((p) => {
        const op = state.operators.find((item) => item.id === p.id);
        return { id: p.id, name: op ? op.name : "", x: p.x, y: p.y };
      })
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
      return true;
    } catch (err) {
      console.error("Save failed", err);
      return false;
    }
  }

  function loadBoardState() {
    let parsed;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("Load failed", err);
      return false;
    }
    if (!parsed || typeof parsed !== "object") return false;

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
    const { byId, byName } = buildOperatorLookup();
    if (Array.isArray(parsed.placements)) {
      for (const item of parsed.placements) {
        if (!item || typeof item !== "object") continue;
        const x = Number(item.x);
        const y = Number(item.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

        let id = typeof item.id === "string" ? item.id : "";
        if (!byId.has(id)) {
          const fallbackName = typeof item.name === "string" ? item.name : "";
          const op = byName.get(fallbackName);
          if (!op) continue;
          id = op.id;
        }
        state.placements.set(id, { id, x: clamp(x, -1, 1), y: clamp(y, -1, 1) });
      }
    }

    return true;
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
        color: source?.color || palette[i % palette.length]
      });
    }

    if (axis === "x") state.xSegments = next;
    else state.ySegments = next;
  }

  function initSegments() {
    state.xSegments = [{ start: -1, end: 1, label: `${xSegmentPrefix}1`, color: paletteX[0] }];
    state.ySegments = [{ start: -1, end: 1, label: `${ySegmentPrefix}1`, color: paletteY[0] }];
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

  function drawScene(target, metrics) {
    const { width, height, left, right, top, bottom, toX, toY } = metrics;
    const axisX = toX(0);
    const axisY = toY(0);

    const bg = target.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#fcfdff");
    bg.addColorStop(1, "#eff3f9");
    target.fillStyle = bg;
    target.fillRect(0, 0, width, height);

    for (const seg of state.xSegments) {
      const x0 = toX(seg.start);
      const x1 = toX(seg.end);
      target.fillStyle = `${seg.color}33`;
      target.fillRect(x0, top, x1 - x0, bottom - top);
    }

    for (const seg of state.ySegments) {
      const y1 = toY(seg.start);
      const y0 = toY(seg.end);
      target.fillStyle = `${seg.color}2a`;
      target.fillRect(left, y0, right - left, y1 - y0);
    }

    target.strokeStyle = "#d5dce7";
    target.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const vx = left + (right - left) * t;
      const hy = top + (bottom - top) * t;
      target.beginPath();
      target.moveTo(vx, top);
      target.lineTo(vx, bottom);
      target.stroke();
      target.beginPath();
      target.moveTo(left, hy);
      target.lineTo(right, hy);
      target.stroke();
    }

    target.strokeStyle = "#1f2a38";
    target.lineWidth = 2;
    target.beginPath();
    target.moveTo(left, axisY);
    target.lineTo(right, axisY);
    target.moveTo(axisX, top);
    target.lineTo(axisX, bottom);
    target.stroke();

    target.fillStyle = "#1f2a38";
    drawArrow(target, right, axisY, right - 11, axisY - 6, right - 11, axisY + 6);
    drawArrow(target, axisX, top, axisX - 6, top + 11, axisX + 6, top + 11);

    target.fillStyle = "#46576e";
    target.font = '13px "SF Pro Text", "PingFang SC", sans-serif';

    for (const node of state.xNodes) {
      const x = toX(node);
      target.beginPath();
      target.fillStyle = "#146ee6";
      target.arc(x, axisY, 5.5, 0, Math.PI * 2);
      target.fill();
      target.lineWidth = 2;
      target.strokeStyle = "#fff";
      target.stroke();
    }

    for (const node of state.yNodes) {
      const y = toY(node);
      target.beginPath();
      target.fillStyle = "#de7c1d";
      target.arc(axisX, y, 5.5, 0, Math.PI * 2);
      target.fill();
      target.lineWidth = 2;
      target.strokeStyle = "#fff";
      target.stroke();
    }

    target.fillStyle = "#2e3c4f";
    target.font = '12px "SF Pro Text", "PingFang SC", sans-serif';
    target.textAlign = "center";
    if (state.xSegments.length === 1) {
      target.fillText(state.xSegments[0].label, toX(0.72), axisY + 26);
    } else {
      for (const seg of state.xSegments) {
        target.fillText(seg.label, (toX(seg.start) + toX(seg.end)) / 2, axisY + 26);
      }
    }

    // Y-axis segment labels: right side of Y-axis, horizontal, wrapped to <= 1/5 chart width.
    target.textAlign = "left";
    const yLabelMaxWidth = Math.max(72, (right - left) / 5);
    const yLabelX = axisX + 10;
    const yLabelLineHeight = 12;
    for (let i = 0; i < state.ySegments.length; i++) {
      const seg = state.ySegments[i];
      const cy = state.ySegments.length === 1 ? toY(0.72) : (toY(seg.start) + toY(seg.end)) / 2;
      drawWrappedHorizontalLabel(target, seg.label, yLabelX, cy, yLabelMaxWidth, yLabelLineHeight);
    }
    target.textAlign = "center";

    for (const placement of state.placements.values()) {
      const op = state.operators.find((item) => item.id === placement.id);
      if (!op) continue;

      const x = toX(placement.x);
      const y = toY(placement.y);
      const r = getBoardAvatarRadius();
      const img = getImage(op.imageData || op.image);

      target.save();
      target.beginPath();
      target.arc(x, y, r, 0, Math.PI * 2);
      target.closePath();
      target.clip();
      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        target.drawImage(img, x - r, y - r, r * 2, r * 2);
      }
      else {
        target.fillStyle = "#d6deeb";
        target.fillRect(x - r, y - r, r * 2, r * 2);
      }
      target.restore();

      target.beginPath();
      target.arc(x, y, r, 0, Math.PI * 2);
      target.lineWidth = 2;
      target.strokeStyle = "#fff";
      target.stroke();

      target.fillStyle = "#1e3044";
      target.font = '12px "SF Pro Text", "PingFang SC", sans-serif';
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
  }

  function getLocalPointer(ev) {
    const rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }

  function findNodeAt(x, y, metrics) {
    const axisX = metrics.toX(0);
    const axisY = metrics.toY(0);
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

    item.append(colorInput, labelInput);
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
      empty.textContent = "æœªæ‰¾åˆ°åŒ¹é…è§’è‰²";
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
      const axisX = metrics.toX(0);
      const axisY = metrics.toY(0);

      if (Math.abs(p.y - axisY) <= 10) canvas.style.cursor = "ew-resize";
      else if (Math.abs(p.x - axisX) <= 10) canvas.style.cursor = "ns-resize";
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

      const axisX = metrics.toX(0);
      const axisY = metrics.toY(0);
      if (Math.abs(p.y - axisY) <= 10) addNode("x", metrics.toValueX(p.x));
      else if (Math.abs(p.x - axisX) <= 10) addNode("y", metrics.toValueY(p.y));
    });

    canvas.addEventListener("dblclick", (ev) => {
      const metrics = getMetrics(view.width, view.height, view.pad);
      const p = getLocalPointer(ev);
      const placement = findPlacementAt(p.x, p.y, metrics);
      if (placement) deletePlacement(placement.id);
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

  function exportAsPNG() {
    render();

    // Export the already-rendered main canvas synchronously to preserve user gesture.
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const outCtx = out.getContext("2d");
    outCtx.drawImage(canvas, 0, 0);

    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("") + "-" + [
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0")
    ].join("");

    try {
      const dataUrl = out.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `arknights-tk-map-${stamp}.png`;
      link.click();
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
        flashSavedState(saveBoardState());
      });
    }

    exportBtn.addEventListener("click", exportAsPNG);
  }

  function init() {
    initSegments();
    loadBoardState();
    updateSegmentEditors();
    bindOperatorEvents();
    bindCanvasEvents();
    bindExportEvent();

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

  init();
})();


