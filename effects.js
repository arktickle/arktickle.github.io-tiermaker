(() => {
  const reduceMotion = Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const bootStorageKey = "arknights_tk_boot_seen_v1";
  const scrambleGlyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#<>/_";
  const panelSelector = ".board-panel, .segment-panel, .operator-panel";
  const rippleSelector = [
    ".tk-btn",
    ".axis-report-trigger",
    ".report-export-btn",
    ".interrogation-trigger",
    ".danger-confirm",
    ".ranking-open-btn",
    ".ranking-tabs button",
    ".modal-close"
  ].join(",");
  const colors = {
    accent: "47, 196, 242",
    yellow: "255, 210, 31",
    danger: "255, 74, 85",
    white: "242, 242, 239"
  };
  const fontTech = '"Rajdhani", "PingFang SC", "Microsoft YaHei", sans-serif';
  const fontSans = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

  const modalTimers = new WeakMap();
  const textRuns = new WeakMap();
  let cardTimer = 0;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  /* ------------------------------------------------------------------------
     Text effects: decode / count-up
     ------------------------------------------------------------------------ */

  function runText(element, duration, renderFrame) {
    if (!element || reduceMotion) return;
    const previous = textRuns.get(element);
    let finalText = element.textContent;
    if (previous) {
      window.cancelAnimationFrame(previous.frame);
      if (finalText === previous.lastOutput) finalText = previous.finalText;
    }

    const run = { finalText, lastOutput: finalText, frame: 0 };
    textRuns.set(element, run);
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min(1, Math.max(0, (now - start) / duration));
      const output = progress < 1 ? renderFrame(progress, finalText) : finalText;
      if (output !== null) {
        element.textContent = output;
        run.lastOutput = output;
      }
      if (progress < 1) {
        run.frame = window.requestAnimationFrame(step);
      } else {
        textRuns.delete(element);
      }
    };
    run.frame = window.requestAnimationFrame(step);
  }

  function scrambleText(element, duration = 560) {
    if (!element || element.children.length) return;
    runText(element, duration, (progress, finalText) => {
      const chars = Array.from(finalText);
      const resolved = Math.floor(easeOutCubic(progress) * chars.length);
      return chars.map((char, index) => {
        if (index < resolved || /[\s/·:.\-]/.test(char) || /[^\x00-\x7f]/.test(char)) return char;
        return scrambleGlyphs[(Math.random() * scrambleGlyphs.length) | 0];
      }).join("");
    });
  }

  function countUp(element, duration = 1100) {
    if (!element) return;
    const target = Number(String(element.textContent).trim());
    if (!Number.isFinite(target) || target <= 0) return;
    runText(element, duration, (progress, finalText) => {
      const value = Number(finalText);
      return Number.isFinite(value) ? String(Math.round(value * easeOutCubic(progress))) : null;
    });
  }

  /* ------------------------------------------------------------------------
     PRTS boot sequence
     ------------------------------------------------------------------------ */

  function runBootSequence(onDone) {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(bootStorageKey) === "1";
      window.sessionStorage.setItem(bootStorageKey, "1");
    } catch (err) {
      seen = false;
    }

    if (seen || reduceMotion) {
      onDone();
      return;
    }

    const total = Array.isArray(window.OPERATORS_DATA) ? window.OPERATORS_DATA.length : 0;
    const boot = document.createElement("div");
    boot.className = "fx-boot";
    boot.setAttribute("aria-hidden", "true");
    boot.innerHTML = `
      <div class="fx-boot-hazard"></div>
      <div class="fx-boot-corner fx-boot-corner-tl"></div>
      <div class="fx-boot-corner fx-boot-corner-br"></div>
      <div class="fx-boot-core">
        <div class="fx-boot-logo"><img src="assets/branding/rhodes-island.png" alt="" /></div>
        <p class="fx-boot-title">PRTS</p>
        <p class="fx-boot-sub">PRIMITIVE RHODES ISLAND TERMINAL SERVICE</p>
        <div class="fx-boot-progress"><i></i></div>
        <div class="fx-boot-meta">
          <span class="fx-boot-status">CONNECTING</span>
          <span class="fx-boot-pct">000%</span>
        </div>
        <ol class="fx-boot-log"></ol>
      </div>
      <p class="fx-boot-foot"><span>RHODES ISLAND PHARMACEUTICAL INC.</span><span>CLICK TO SKIP</span></p>
    `;
    document.body.appendChild(boot);
    document.body.classList.add("fx-booting");

    const bar = boot.querySelector(".fx-boot-progress i");
    const pct = boot.querySelector(".fx-boot-pct");
    const status = boot.querySelector(".fx-boot-status");
    const log = boot.querySelector(".fx-boot-log");
    const steps = [
      { at: 0.06, text: "建立神经链接", value: "OK", status: "LINKING" },
      { at: 0.3, text: "同步干员档案", value: `${total}/${total}`, status: "SYNCING" },
      { at: 0.56, text: "初始化坐标矩阵", value: "TK-01", status: "CALIBRATING" },
      { at: 0.8, text: "接入医疗部加密通道", value: "SECURE", status: "ENCRYPTING" }
    ];
    const duration = 1500;
    const start = performance.now();
    let stepIndex = 0;
    let frame = 0;
    let finished = false;
    let leaveTimer = 0;

    const appendLine = (text, value, highlight) => {
      const item = document.createElement("li");
      if (highlight) item.className = "is-highlight";
      const label = document.createElement("span");
      label.textContent = text;
      const result = document.createElement("b");
      result.textContent = value;
      item.append(label, result);
      log.appendChild(item);
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(leaveTimer);
      window.removeEventListener("pointerdown", finish, true);
      window.removeEventListener("keydown", finish, true);
      boot.classList.add("is-leaving");
      document.body.classList.remove("fx-booting");
      onDone();
      window.setTimeout(() => boot.remove(), 900);
    };

    const complete = () => {
      bar.style.transform = "scaleX(1)";
      pct.textContent = "100%";
      status.textContent = "ONLINE";
      while (stepIndex < steps.length) {
        appendLine(steps[stepIndex].text, steps[stepIndex].value);
        stepIndex += 1;
      }
      appendLine("欢迎回来，博士。", "", true);
      boot.classList.add("is-complete");
      leaveTimer = window.setTimeout(finish, 520);
    };

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const shown = Math.min(1, easeOutCubic(progress) + (Math.random() - 0.5) * 0.01);
      bar.style.transform = `scaleX(${Math.max(0, shown)})`;
      pct.textContent = `${String(Math.round(Math.max(0, shown) * 100)).padStart(3, "0")}%`;
      while (stepIndex < steps.length && progress >= steps[stepIndex].at) {
        const step = steps[stepIndex];
        appendLine(step.text, step.value);
        status.textContent = step.status;
        stepIndex += 1;
      }
      if (progress < 1) frame = window.requestAnimationFrame(tick);
      else complete();
    };

    window.addEventListener("pointerdown", finish, true);
    window.addEventListener("keydown", finish, true);
    frame = window.requestAnimationFrame(tick);
    window.setTimeout(finish, 6000);
  }

  /* ------------------------------------------------------------------------
     Ambient particle field
     ------------------------------------------------------------------------ */

  function setupParticles() {
    if (reduceMotion) return;
    const canvas = document.createElement("canvas");
    canvas.className = "fx-particles";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles = [];
    let width = 0;
    let height = 0;
    let lastTime = 0;
    let lastDraw = 0;

    const spawn = (particle, initial) => {
      particle.x = Math.random() * width;
      particle.y = initial ? Math.random() * height : height + 12;
      particle.size = Math.random() < 0.82 ? 1 + Math.random() * 1.4 : 2.4 + Math.random() * 1.8;
      particle.speed = 6 + Math.random() * 18;
      particle.drift = (Math.random() - 0.5) * 8;
      particle.phase = Math.random() * Math.PI * 2;
      particle.alpha = 0.12 + Math.random() * 0.42;
      const roll = Math.random();
      particle.color = roll < 0.12 ? colors.yellow : roll < 0.72 ? colors.accent : colors.white;
      particle.square = Math.random() < 0.55;
    };

    const resize = () => {
      const ratio = Math.min(1.5, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = width < 760 ? 22 : 48;
      while (particles.length < count) {
        const particle = {};
        spawn(particle, true);
        particles.push(particle);
      }
      particles.length = count;
    };

    const draw = (now) => {
      window.requestAnimationFrame(draw);
      if (now - lastDraw < 32) return;
      lastDraw = now;
      const dt = Math.min(0.08, (now - lastTime) / 1000 || 0.016);
      lastTime = now;
      ctx.clearRect(0, 0, width, height);
      for (const particle of particles) {
        particle.y -= particle.speed * dt;
        particle.x += (particle.drift + Math.sin(now / 1100 + particle.phase) * 5) * dt;
        if (particle.y < -12 || particle.x < -12 || particle.x > width + 12) spawn(particle, false);
        const fade = Math.min(1, particle.y / (height * 0.3));
        const twinkle = 0.7 + 0.3 * Math.sin(now / 520 + particle.phase * 3);
        ctx.globalAlpha = Math.max(0, particle.alpha * fade * twinkle);
        ctx.fillStyle = `rgb(${particle.color})`;
        if (particle.square) {
          ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        } else {
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    resize();
    window.addEventListener("resize", resize);
    window.requestAnimationFrame(draw);
  }

  /* ------------------------------------------------------------------------
     Matrix overlay: crosshair, target ring, deploy / retreat bursts, HUD
     ------------------------------------------------------------------------ */

  function setupPlaneScan() {
    const planeWrap = document.getElementById("planeWrap");
    if (!planeWrap || planeWrap.querySelector(".fx-plane-scan")) return;
    const scan = document.createElement("div");
    scan.className = "fx-plane-scan";
    scan.setAttribute("aria-hidden", "true");
    planeWrap.appendChild(scan);
  }

  function setupPlaneEffects() {
    const board = window.ArknightsTkBoard;
    const wrap = document.getElementById("planeWrap");
    const baseCanvas = document.getElementById("planeCanvas");
    if (!board || !wrap || !baseCanvas) return;

    const overlay = document.createElement("canvas");
    overlay.className = "fx-plane-overlay";
    overlay.setAttribute("aria-hidden", "true");
    wrap.appendChild(overlay);
    const octx = overlay.getContext("2d");
    if (!octx) return;

    const zone = document.createElement("div");
    zone.className = "fx-deploy-zone";
    zone.setAttribute("aria-hidden", "true");
    zone.innerHTML = "<span>DEPLOY ZONE</span><small>释放以部署干员</small>";
    wrap.appendChild(zone);

    const hud = document.createElement("div");
    hud.className = "fx-plane-hud";
    hud.setAttribute("aria-hidden", "true");
    hud.innerHTML = `
      <span class="fx-hud-code">TK-01 // TACTICAL FIELD</span>
      <span class="fx-hud-stat"><small>DEPLOYED</small><b data-hud="placed">00</b></span>
      <span class="fx-hud-stat"><small>NODE-X</small><b data-hud="x">00</b></span>
      <span class="fx-hud-stat"><small>NODE-Y</small><b data-hud="y">00</b></span>
    `;
    wrap.appendChild(hud);
    const hudFields = {
      placed: hud.querySelector('[data-hud="placed"]'),
      x: hud.querySelector('[data-hud="x"]'),
      y: hud.querySelector('[data-hud="y"]')
    };

    const pointer = { inside: false, x: 0, y: 0 };
    const bursts = [];
    let width = 0;
    let height = 0;
    let ratio = 1;
    let frame = 0;
    let hudFrame = 0;

    const setHudValue = (field, value) => {
      const text = pad2(value);
      if (field.textContent === text) return;
      field.textContent = text;
      field.classList.remove("is-bump");
      void field.offsetWidth;
      field.classList.add("is-bump");
    };

    const updateHud = () => {
      hudFrame = 0;
      const snap = board.getSnapshot();
      setHudValue(hudFields.placed, snap.placements.length);
      setHudValue(hudFields.x, snap.xNodes);
      setHudValue(hudFields.y, snap.yNodes);
    };

    const syncSize = () => {
      const nextWidth = baseCanvas.clientWidth;
      const nextHeight = baseCanvas.clientHeight;
      const nextRatio = Math.min(2, window.devicePixelRatio || 1);
      if (nextWidth !== width || nextHeight !== height || nextRatio !== ratio) {
        width = nextWidth;
        height = nextHeight;
        ratio = nextRatio;
        overlay.width = Math.round(width * ratio);
        overlay.height = Math.round(height * ratio);
      }
      octx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const request = () => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    const line = (x1, y1, x2, y2) => {
      octx.beginPath();
      octx.moveTo(x1, y1);
      octx.lineTo(x2, y2);
      octx.stroke();
    };

    const findHovered = (snap) => {
      if (!pointer.inside) return null;
      if (snap.dragging) return snap.placements.find((item) => item.id === snap.dragging) || null;
      const reach = snap.avatarRadius + 4;
      return snap.placements.find((item) => (item.x - pointer.x) ** 2 + (item.y - pointer.y) ** 2 <= reach * reach) || null;
    };

    const drawReadout = (snap, x, y, title) => {
      const scores = board.scoreAt(x, y);
      const valueText = `敏感 ${scores.sensitivity}   忍耐 ${scores.tolerance}`;
      octx.font = `600 12px ${fontSans}`;
      const valueWidth = octx.measureText(valueText).width;
      octx.font = `700 10px ${fontTech}`;
      const titleWidth = octx.measureText(title).width;
      const boxWidth = Math.max(valueWidth, titleWidth) + 20;
      const boxHeight = 38;
      let boxX = x + 18;
      let boxY = y - boxHeight - 14;
      if (boxX + boxWidth > width - 6) boxX = x - boxWidth - 18;
      if (boxY < 6) boxY = y + 18;

      octx.fillStyle = "rgba(10, 11, 13, 0.9)";
      octx.fillRect(boxX, boxY, boxWidth, boxHeight);
      octx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      octx.lineWidth = 1;
      octx.strokeRect(boxX + 0.5, boxY + 0.5, boxWidth - 1, boxHeight - 1);
      octx.fillStyle = `rgb(${colors.accent})`;
      octx.fillRect(boxX, boxY, 2, boxHeight);

      octx.textAlign = "left";
      octx.textBaseline = "top";
      octx.fillStyle = `rgb(${colors.accent})`;
      octx.font = `700 10px ${fontTech}`;
      octx.fillText(title, boxX + 10, boxY + 6);
      octx.fillStyle = `rgb(${colors.white})`;
      octx.font = `600 12px ${fontSans}`;
      octx.fillText(valueText, boxX + 10, boxY + 19);
    };

    const drawCrosshair = (snap, hovered) => {
      const x = hovered ? hovered.x : pointer.x;
      const y = hovered ? hovered.y : pointer.y;
      octx.save();
      octx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      octx.lineWidth = 1;
      octx.setLineDash([3, 5]);
      line(snap.left, Math.round(y) + 0.5, snap.right, Math.round(y) + 0.5);
      line(Math.round(x) + 0.5, snap.top, Math.round(x) + 0.5, snap.bottom);
      octx.setLineDash([]);

      octx.fillStyle = `rgb(${colors.accent})`;
      octx.beginPath();
      octx.moveTo(x, snap.bottom + 3);
      octx.lineTo(x - 5, snap.bottom + 11);
      octx.lineTo(x + 5, snap.bottom + 11);
      octx.closePath();
      octx.fill();

      octx.fillStyle = `rgb(${colors.yellow})`;
      octx.beginPath();
      octx.moveTo(snap.left - 3, y);
      octx.lineTo(snap.left - 11, y - 5);
      octx.lineTo(snap.left - 11, y + 5);
      octx.closePath();
      octx.fill();

      if (!hovered) {
        octx.strokeStyle = `rgba(${colors.white}, 0.85)`;
        octx.lineWidth = 1.5;
        line(x - 9, y, x - 3, y);
        line(x + 3, y, x + 9, y);
        line(x, y - 9, x, y - 3);
        line(x, y + 3, x, y + 9);
      }

      drawReadout(snap, x, y, hovered ? `OPERATOR // ${hovered.name}` : "COORD // 坐标");
      octx.restore();
    };

    const drawTargetRing = (item, radius, now) => {
      const t = now / 1000;
      octx.save();
      octx.translate(item.x, item.y);

      octx.strokeStyle = `rgb(${colors.accent})`;
      octx.lineWidth = 2;
      octx.shadowColor = `rgba(${colors.accent}, 0.8)`;
      octx.shadowBlur = 8;
      for (let i = 0; i < 3; i += 1) {
        const angle = t * 1.8 + i * ((Math.PI * 2) / 3);
        octx.beginPath();
        octx.arc(0, 0, radius + 7, angle, angle + 1.05);
        octx.stroke();
      }
      octx.shadowBlur = 0;

      octx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      octx.lineWidth = 1;
      octx.setLineDash([2, 5]);
      octx.lineDashOffset = t * 18;
      octx.beginPath();
      octx.arc(0, 0, radius + 12, 0, Math.PI * 2);
      octx.stroke();
      octx.setLineDash([]);

      const size = radius + 17;
      const arm = 7;
      octx.strokeStyle = `rgb(${colors.yellow})`;
      octx.lineWidth = 2;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        octx.beginPath();
        octx.moveTo(sx * size, sy * (size - arm));
        octx.lineTo(sx * size, sy * size);
        octx.lineTo(sx * (size - arm), sy * size);
        octx.stroke();
      }
      octx.restore();
    };

    const drawLabel = (text, x, y, color, alpha) => {
      octx.save();
      octx.globalAlpha = alpha;
      octx.font = `700 11px ${fontTech}`;
      const textWidth = octx.measureText(text).width;
      const boxWidth = textWidth + 14;
      octx.fillStyle = `rgb(${color})`;
      octx.fillRect(x - boxWidth / 2, y - 9, boxWidth, 17);
      octx.fillStyle = "#0b0c0e";
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillText(text, x, y + 0.5);
      octx.restore();
    };

    const drawDeploy = (burst, progress) => {
      const eased = easeOutCubic(progress);
      const radius = burst.radius;
      octx.save();

      if (progress < 0.32) {
        const drop = easeOutCubic(progress / 0.32);
        const beamY = burst.y * drop;
        const gradient = octx.createLinearGradient(0, beamY - 140, 0, beamY);
        gradient.addColorStop(0, `rgba(${colors.accent}, 0)`);
        gradient.addColorStop(1, `rgba(${colors.accent}, 0.9)`);
        octx.strokeStyle = gradient;
        octx.lineWidth = 2;
        line(burst.x, Math.max(0, beamY - 140), burst.x, beamY);
      }

      octx.globalAlpha = 1 - progress;
      octx.strokeStyle = `rgb(${colors.accent})`;
      octx.lineWidth = 2.5 * (1 - progress) + 0.5;
      octx.shadowColor = `rgba(${colors.accent}, 0.9)`;
      octx.shadowBlur = 12;
      octx.beginPath();
      octx.arc(burst.x, burst.y, radius + 4 + eased * 38, 0, Math.PI * 2);
      octx.stroke();

      octx.shadowBlur = 0;
      octx.strokeStyle = `rgba(${colors.white}, 0.8)`;
      octx.lineWidth = 1;
      const square = radius + 10 + eased * 22;
      octx.translate(burst.x, burst.y);
      octx.rotate(Math.PI / 4 + eased * 0.6);
      octx.strokeRect(-square, -square, square * 2, square * 2);
      octx.restore();

      const labelAlpha = progress < 0.75 ? 1 : 1 - (progress - 0.75) / 0.25;
      drawLabel(burst.isNew ? "DEPLOY" : "REPOSITION", burst.x, burst.y - radius - 22 - eased * 6, colors.yellow, labelAlpha);
    };

    const drawRetreat = (burst, progress) => {
      const eased = easeOutCubic(progress);
      const radius = burst.radius;
      octx.save();
      octx.globalAlpha = 1 - progress;
      octx.strokeStyle = `rgb(${colors.danger})`;
      octx.lineWidth = 2;
      octx.shadowColor = `rgba(${colors.danger}, 0.8)`;
      octx.shadowBlur = 10;
      octx.beginPath();
      octx.arc(burst.x, burst.y, Math.max(2, (radius + 18) * (1 - eased)), 0, Math.PI * 2);
      octx.stroke();
      octx.shadowBlur = 0;
      const arm = radius * 0.6 * (1 - eased * 0.4);
      line(burst.x - arm, burst.y - arm, burst.x + arm, burst.y + arm);
      line(burst.x + arm, burst.y - arm, burst.x - arm, burst.y + arm);
      octx.restore();
      drawLabel("RETREAT", burst.x, burst.y - radius - 18, colors.danger, 1 - progress);
    };

    const drawNodeBurst = (burst, progress) => {
      const eased = easeOutCubic(progress);
      const color = burst.axis === "x" ? colors.accent : colors.yellow;
      const size = burst.action === "add" ? 6 + eased * 20 : 22 - eased * 16;
      octx.save();
      octx.globalAlpha = 1 - progress;
      octx.strokeStyle = `rgb(${color})`;
      octx.lineWidth = 1.5;
      octx.translate(burst.x, burst.y);
      octx.rotate(Math.PI / 4);
      octx.strokeRect(-size / 1.414, -size / 1.414, size * 1.414, size * 1.414);
      octx.restore();
    };

    const drawBursts = (now) => {
      for (let index = bursts.length - 1; index >= 0; index -= 1) {
        const burst = bursts[index];
        const progress = Math.max(0, (now - burst.start) / burst.duration);
        if (progress >= 1) {
          bursts.splice(index, 1);
          continue;
        }
        if (burst.type === "deploy") drawDeploy(burst, progress);
        else if (burst.type === "retreat") drawRetreat(burst, progress);
        else drawNodeBurst(burst, progress);
      }
      return bursts.length > 0;
    };

    function draw(now) {
      frame = 0;
      syncSize();
      octx.clearRect(0, 0, width, height);
      const snap = board.getSnapshot();
      const hovered = findHovered(snap);
      const insidePlot = pointer.inside
        && pointer.x >= snap.left && pointer.x <= snap.right
        && pointer.y >= snap.top && pointer.y <= snap.bottom;
      let animating = false;

      if (insidePlot || hovered) drawCrosshair(snap, hovered);
      if (hovered) {
        drawTargetRing(hovered, snap.avatarRadius, now);
        animating = !reduceMotion;
      }
      if (drawBursts(now)) animating = true;
      if (animating) request();
    }

    const addBurst = (type, detail, duration) => {
      if (reduceMotion || !detail) return;
      bursts.push({
        ...detail,
        type,
        duration,
        radius: board.getSnapshot().avatarRadius,
        start: performance.now()
      });
      request();
    };

    const setPointer = (event) => {
      const rect = baseCanvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.inside = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= rect.width && pointer.y <= rect.height;
      request();
    };

    wrap.addEventListener("pointermove", setPointer);
    wrap.addEventListener("pointerleave", () => {
      pointer.inside = false;
      request();
    });
    wrap.addEventListener("dragover", (event) => {
      setPointer(event);
      wrap.classList.add("is-deploy-target");
    });
    wrap.addEventListener("dragleave", (event) => {
      if (event.relatedTarget && wrap.contains(event.relatedTarget)) return;
      wrap.classList.remove("is-deploy-target");
      pointer.inside = false;
      request();
    });
    wrap.addEventListener("drop", () => {
      wrap.classList.remove("is-deploy-target");
    });
    document.addEventListener("dragend", () => {
      wrap.classList.remove("is-deploy-target");
    });

    wrap.addEventListener("tk:render", () => {
      request();
      if (!hudFrame) hudFrame = window.requestAnimationFrame(updateHud);
    });
    wrap.addEventListener("tk:deploy", (event) => addBurst("deploy", event.detail, 900));
    wrap.addEventListener("tk:retreat", (event) => addBurst("retreat", event.detail, 650));
    wrap.addEventListener("tk:node", (event) => addBurst("node", event.detail, 620));

    updateHud();
  }

  /* ------------------------------------------------------------------------
     Panels, operator cards, modals
     ------------------------------------------------------------------------ */

  function setupSpotlight() {
    let pending = null;
    let frame = 0;
    const apply = () => {
      frame = 0;
      const event = pending;
      if (!event || !(event.target instanceof Element)) return;
      const panel = event.target.closest(panelSelector);
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      panel.style.setProperty("--mx", `${Math.round(event.clientX - rect.left)}px`);
      panel.style.setProperty("--my", `${Math.round(event.clientY - rect.top)}px`);
    };
    document.addEventListener("pointermove", (event) => {
      pending = event;
      if (!frame) frame = window.requestAnimationFrame(apply);
    }, { passive: true });
  }

  function setupClock() {
    const clock = document.getElementById("systemClock");
    if (!clock) return;
    const update = () => {
      const now = new Date();
      clock.textContent = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
    };
    update();
    window.setInterval(update, 1000);
  }

  function indexItems(container, selector, limit) {
    container.querySelectorAll(selector).forEach((item, index) => {
      item.style.setProperty("--fx-index", String(Math.min(index, limit)));
    });
  }

  function replayModal(modal) {
    if (modal.hidden) return;
    indexItems(modal, ".report-row", 12);
    indexItems(modal, ".report-avatar-card", 20);
    indexItems(modal, ".ranking-row", 14);
    modal.classList.remove("fx-entering");
    void modal.offsetWidth;
    modal.classList.add("fx-entering");

    modal.querySelectorAll(".section-kicker, .danger-kicker, .profile-id small").forEach((element, index) => {
      window.setTimeout(() => scrambleText(element, 520), 120 + index * 60);
    });
    if (modal.id === "operatorCardModal") {
      countUp(document.getElementById("operatorSensitivityScore"), 760);
      countUp(document.getElementById("operatorToleranceScore"), 760);
    }

    window.clearTimeout(modalTimers.get(modal));
    modalTimers.set(modal, window.setTimeout(() => {
      modal.classList.remove("fx-entering");
    }, 1500));
  }

  function setupModalEffects() {
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes" && record.attributeName === "hidden") {
          replayModal(record.target);
        }
      }
    });
    document.querySelectorAll(".app-modal").forEach((modal) => {
      observer.observe(modal, { attributes: true, attributeFilter: ["hidden"] });
      if (!modal.hidden) replayModal(modal);
    });

    const editor = document.getElementById("interrogationEditor");
    if (editor) {
      new MutationObserver(() => {
        if (editor.hidden) return;
        editor.classList.remove("fx-swap-in");
        void editor.offsetWidth;
        editor.classList.add("fx-swap-in");
        editor.querySelectorAll(".danger-kicker").forEach((element) => scrambleText(element, 520));
      }).observe(editor, { attributes: true, attributeFilter: ["hidden"] });
    }

    const rankingRows = document.getElementById("rankingRows");
    if (rankingRows) {
      new MutationObserver(() => {
        indexItems(rankingRows, ".ranking-row", 14);
        rankingRows.classList.remove("fx-rows-enter");
        void rankingRows.offsetWidth;
        rankingRows.classList.add("fx-rows-enter");
      }).observe(rankingRows, { childList: true });
    }
  }

  function animateOperatorCards(container) {
    const cards = Array.from(container.querySelectorAll(".operator-card")).slice(0, 28);
    cards.forEach((card, index) => {
      card.style.setProperty("--fx-index", String(index));
      card.classList.remove("fx-card-enter");
    });

    void container.offsetWidth;
    cards.forEach((card) => card.classList.add("fx-card-enter"));
    window.clearTimeout(cardTimer);
    cardTimer = window.setTimeout(() => {
      cards.forEach((card) => card.classList.remove("fx-card-enter"));
    }, 1300);
  }

  function setupOperatorEffects() {
    const operatorList = document.getElementById("operatorList");
    if (!operatorList) return;

    new MutationObserver(() => {
      window.requestAnimationFrame(() => animateOperatorCards(operatorList));
    }).observe(operatorList, { childList: true });

    if (operatorList.children.length) animateOperatorCards(operatorList);

    let deployingCard = null;
    operatorList.addEventListener("dragstart", (event) => {
      const card = event.target instanceof Element ? event.target.closest(".operator-card") : null;
      if (!card) return;
      deployingCard = card;
      card.classList.add("is-deploying");
      document.body.classList.add("fx-deploying");
    });
    document.addEventListener("dragend", () => {
      deployingCard?.classList.remove("is-deploying");
      deployingCard = null;
      document.body.classList.remove("fx-deploying");
    });
  }

  function setupRippleEffects() {
    document.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !(event.target instanceof Element)) return;
      const button = event.target.closest(rippleSelector);
      if (!button || button.disabled) return;

      button.classList.add("fx-ripple-host");
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "fx-signal-ripple";
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      ripple.setAttribute("aria-hidden", "true");
      ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
      button.appendChild(ripple);
    });
  }

  function playIntro() {
    countUp(document.getElementById("operatorCount"), 1300);
    const targets = Array.from(document.querySelectorAll(
      ".eyebrow span, .section-kicker, .panel-index, .system-status small, .hero-rule-tag, .status-line span:not(.status-dot)"
    )).filter((element) => !element.closest(".app-modal, .comms-panel"));
    targets.forEach((element, index) => {
      window.setTimeout(() => scrambleText(element, 560), 160 + index * 70);
    });
  }

  function initEffects() {
    document.body.classList.add("fx-enabled");
    if (reduceMotion) document.body.classList.add("fx-reduced");
    setupParticles();
    setupPlaneScan();
    setupPlaneEffects();
    setupModalEffects();
    setupOperatorEffects();
    setupRippleEffects();
    setupSpotlight();
    setupClock();

    runBootSequence(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          document.body.classList.add("fx-ready");
          playIntro();
        });
      });
    });
  }

  if (document.body) initEffects();
  else document.addEventListener("DOMContentLoaded", initEffects, { once: true });
})();
