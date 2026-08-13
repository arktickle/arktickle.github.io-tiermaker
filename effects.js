(() => {
  const rippleSelector = [
    "#toggleNamesBtn",
    "#saveBtn",
    "#importStateBtn",
    "#exportBtn",
    ".axis-report-trigger",
    ".report-export-btn",
    ".interrogation-trigger",
    ".danger-confirm",
    ".ranking-open-btn",
    ".ranking-tabs button",
    ".modal-close"
  ].join(",");

  const modalTimers = new WeakMap();
  let cardTimer = 0;

  function indexReportItems(modal) {
    modal.querySelectorAll(".report-row").forEach((row, index) => {
      row.style.setProperty("--fx-index", String(Math.min(index, 12)));
    });

    modal.querySelectorAll(".report-avatar-card").forEach((card, index) => {
      card.style.setProperty("--fx-index", String(Math.min(index, 20)));
    });
  }

  function replayModal(modal) {
    if (modal.hidden) return;
    indexReportItems(modal);
    modal.classList.remove("fx-entering");
    void modal.offsetWidth;
    modal.classList.add("fx-entering");

    window.clearTimeout(modalTimers.get(modal));
    const timer = window.setTimeout(() => {
      modal.classList.remove("fx-entering");
    }, 1450);
    modalTimers.set(modal, timer);
  }

  function setupModalEffects() {
    const modals = document.querySelectorAll(".app-modal");
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes" && record.attributeName === "hidden") {
          replayModal(record.target);
        }
      }
    });

    modals.forEach((modal) => {
      observer.observe(modal, { attributes: true, attributeFilter: ["hidden"] });
      if (!modal.hidden) replayModal(modal);
    });
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
    }, 1200);
  }

  function setupOperatorEffects() {
    const operatorList = document.getElementById("operatorList");
    if (!operatorList) return;

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => animateOperatorCards(operatorList));
    });
    observer.observe(operatorList, { childList: true });

    if (operatorList.children.length) {
      animateOperatorCards(operatorList);
    }
  }

  function setupPlaneScan() {
    const planeWrap = document.getElementById("planeWrap");
    if (!planeWrap || planeWrap.querySelector(".fx-plane-scan")) return;

    const scan = document.createElement("div");
    scan.className = "fx-plane-scan";
    scan.setAttribute("aria-hidden", "true");
    planeWrap.appendChild(scan);
  }

  function setupRippleEffects() {
    document.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
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

  function initEffects() {
    document.body.classList.add("fx-enabled");
    setupPlaneScan();
    setupModalEffects();
    setupOperatorEffects();
    setupRippleEffects();

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.body.classList.add("fx-ready");
      });
    });
  }

  if (document.body) initEffects();
  else document.addEventListener("DOMContentLoaded", initEffects, { once: true });
})();
