const headline = document.querySelector(".headline");

function prepareBlurText(root) {
  if (!root || root.dataset.blurReady) return;
  const pieces = [...root.childNodes];
  root.replaceChildren();
  let index = 0;

  pieces.forEach((node) => {
    const words = (node.textContent || "").trim().split(/\s+/).filter(Boolean);
    const italic = node.nodeName === "EM";
    words.forEach((word) => {
      const el = document.createElement(italic ? "em" : "span");
      el.className = "blur-word";
      el.style.animationDelay = `${index * 200}ms`;
      el.textContent = word;
      root.append(el, "\u00A0");
      index += 1;
    });
  });

  root.dataset.blurReady = "true";
}

function playBlurText() {
  if (!headline) return;
  headline.classList.remove("is-playing");
  void headline.offsetWidth;
  headline.classList.add("is-playing");
}

prepareBlurText(headline);

const panels = [...document.querySelectorAll(".panel")];
const dockItems = [...document.querySelectorAll(".dock-item")];
const folder = document.querySelector(".dock-glyph[data-open]");

function show(id) {
  const next = panels.find((panel) => panel.dataset.panelId === id) || panels[0];
  const view = next.dataset.panelId;

  panels.forEach((panel) => {
    const active = panel === next;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });

  document.body.dataset.view = view;
  window.scrollTo(0, 0);
  setDock(view);

  const hash = view === "welcome" ? "#welcome" : `#${view}`;
  if (location.hash !== hash) {
    history.replaceState(null, "", hash);
  }

  if (view === "welcome") playBlurText();
  if (view === "quests") {
    requestAnimationFrame(() => {
      packQuests();
      measureTech();
    });
  }
}

function setDock(view) {
  dockItems.forEach((item) => {
    const active = item.dataset.panel === view;
    item.classList.toggle("is-active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });

  if (folder) {
    folder.src = view === "works" ? folder.dataset.open : folder.dataset.closed;
  }
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let busy = false;
let motionTimer = 0;
const welcome = document.getElementById("welcome");
const works = document.getElementById("works");

function clearMotionClasses() {
  clearTimeout(motionTimer);
  welcome?.classList.remove("leaving", "arriving");
  works?.classList.remove("arming", "stacking", "emerge", "leaving-cards");
  document.body.classList.remove("is-transitioning");
}

function dealCards() {
  const cards = [...works.querySelectorAll(".work-card")];
  works.classList.remove("settled", "emerge", "stacking");
  works.classList.add("arming");

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight * 0.44;
  cards.forEach((card, index) => {
    const rect = card.getBoundingClientRect();
    const spread = index - (cards.length - 1) / 2;
    card.style.setProperty("--sx", `${centerX - (rect.left + rect.width / 2) + spread * 9}px`);
    card.style.setProperty("--sy", `${centerY - (rect.top + rect.height / 2) - Math.abs(spread) * 3}px`);
    card.style.setProperty("--srot", `${spread * 1.4}deg`);
    card.style.setProperty("--sscale", "0.62");
    card.style.animationDelay = `${index * 45}ms`;
    card.style.zIndex = String(10 + index);
  });

  works.classList.remove("arming");
  void works.offsetWidth;
  works.classList.add("stacking");

  const stackMs = (cards.length - 1) * 45 + 620;
  motionTimer = window.setTimeout(() => {
    cards.forEach((card, index) => {
      card.style.animationDelay = `${index * 55}ms`;
    });
    works.classList.remove("stacking");
    void works.offsetWidth;
    works.classList.add("emerge");
    motionTimer = window.setTimeout(() => {
      works.classList.remove("emerge");
      works.classList.add("settled");
      document.body.classList.remove("is-transitioning");
      busy = false;
    }, 1150 + (cards.length - 1) * 55);
  }, stackMs);
}

function enterWorks() {
  if (busy || document.body.dataset.view === "works") return;
  if (reduceMotion) {
    show("works");
    works.classList.add("settled");
    return;
  }

  busy = true;
  document.body.classList.add("is-transitioning");
  setDock("works");
  welcome.classList.add("leaving");
  works.hidden = false;
  dealCards();

  motionTimer = window.setTimeout(() => {
    welcome.classList.remove("leaving");
    welcome.hidden = true;
    welcome.classList.remove("is-active");
    works.classList.add("is-active");
    document.body.dataset.view = "works";
    if (location.hash !== "#works") history.replaceState(null, "", "#works");
    window.scrollTo(0, 0);
  }, 900);
}

function leaveWorks() {
  if (busy || document.body.dataset.view !== "works") return;
  if (reduceMotion) {
    works.classList.remove("settled");
    show("welcome");
    return;
  }

  busy = true;
  document.body.classList.add("is-transitioning");
  works.classList.add("leaving-cards");
  motionTimer = window.setTimeout(() => {
    works.classList.remove("leaving-cards", "settled", "emerge", "stacking");
    show("welcome");
    welcome.classList.add("arriving");
    motionTimer = window.setTimeout(() => {
      welcome.classList.remove("arriving");
      document.body.classList.remove("is-transitioning");
      busy = false;
    }, 800);
  }, 750);
}

function navigate(id) {
  const current = document.body.dataset.view;
  if (busy || id === current) return;
  if (current === "welcome" && id === "works") {
    enterWorks();
    return;
  }
  if (current === "works" && id === "welcome") {
    leaveWorks();
    return;
  }
  clearMotionClasses();
  works?.classList.remove("settled");
  show(id);
  if (id === "works") works.classList.add("settled");
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-panel]");
  if (!trigger || trigger.closest(".panel")) return;
  event.preventDefault();
  navigate(trigger.dataset.panel);
});

let wheelDown = 0;
let wheelUp = 0;
window.addEventListener(
  "wheel",
  (event) => {
    if (busy) return;
    const view = document.body.dataset.view;
    if (view === "welcome") {
      if (event.deltaY > 0) {
        wheelDown += event.deltaY;
        wheelUp = 0;
        if (wheelDown >= 40) {
          wheelDown = 0;
          enterWorks();
        }
      } else {
        wheelDown = 0;
      }
      return;
    }

    if (view === "works" && window.scrollY <= 1 && event.deltaY < 0) {
      wheelUp += Math.abs(event.deltaY);
      if (wheelUp >= 70) {
        wheelUp = 0;
        leaveWorks();
      }
    } else {
      wheelUp = 0;
    }
  },
  { passive: true }
);

const questGrid = document.querySelector(".quest-grid");
let questPack = 0;

function packQuests() {
  if (!questGrid || questGrid.closest(".panel")?.hidden) return;
  const items = [...questGrid.children];
  const stacked = window.matchMedia("(max-width: 768px)").matches;
  if (stacked) {
    items.forEach((item) => {
      item.style.gridRowEnd = "";
      const stage = item.querySelector(".window-stage");
      if (stage) {
        stage.style.height = "";
        stage.style.aspectRatio = "";
      }
    });
    return;
  }
  items.forEach((item) => {
    item.style.gridRowEnd = "auto";
    const height = item.getBoundingClientRect().height;
    if (height > 0) item.style.gridRowEnd = `span ${Math.ceil(height) + 16}`;
  });
  alignQuestBottoms();
}

function alignQuestBottoms() {
  if (!questGrid || window.matchMedia("(max-width: 768px)").matches) {
    questGrid?.querySelectorAll(".window-stage").forEach((stage) => {
      stage.style.height = "";
      stage.style.aspectRatio = "";
    });
    return;
  }
  const columns = new Map();
  [...questGrid.children].forEach((item) => {
    const col = getComputedStyle(item).gridColumn.trim();
    if (col.includes("span") || col.includes("/")) return;
    const bottom = item.getBoundingClientRect().bottom;
    const current = columns.get(col);
    if (!current || bottom > current.bottom) columns.set(col, { item, bottom });
  });
  const ends = [...columns.values()];
  if (ends.length < 2) return;
  const target = Math.min(...ends.map((entry) => entry.bottom));
  ends.forEach(({ item, bottom }) => {
    const delta = target - bottom;
    if (Math.abs(delta) < 2) return;
    const stage = item.querySelector(".window-stage");
    if (!stage) return;
    const next = stage.getBoundingClientRect().height + delta;
    if (next < 120) return;
    stage.style.height = `${next}px`;
    stage.style.aspectRatio = "auto";
  });
}

function scheduleQuestPack() {
  cancelAnimationFrame(questPack);
  questPack = requestAnimationFrame(packQuests);
}

if (questGrid) {
  questGrid.querySelectorAll("img").forEach((img) => {
    if (!img.complete) img.addEventListener("load", scheduleQuestPack, { once: true });
  });
  window.addEventListener("resize", scheduleQuestPack);
  new ResizeObserver(scheduleQuestPack).observe(questGrid);
}

const prints = document.querySelector(".prints");
if (prints) {
  const printSide = (target) =>
    target?.closest?.(".print-me") ? "front" : target?.closest?.(".print-seattle") ? "back" : null;
  if (matchMedia("(hover: hover)").matches) {
    prints.addEventListener("mouseover", (event) => {
      const side = printSide(event.target);
      if (side && prints.dataset.front !== side) prints.dataset.front = side;
    });
    prints.addEventListener("mouseleave", () => {
      delete prints.dataset.front;
    });
  } else {
    prints.addEventListener("click", (event) => {
      const side = printSide(event.target);
      if (!side) return;
      if (prints.dataset.front === side) delete prints.dataset.front;
      else prints.dataset.front = side;
    });
  }
}

const techStack = document.querySelector(".tech-stack");
let techArmed = false;
function measureTech() {
  if (!techStack || techStack.closest("[hidden]") || techStack.classList.contains("scattered")) return;
  const scatter = techStack.querySelector(".tech-scatter");
  const chips = [...techStack.querySelectorAll(".tech-chip")];
  techStack.classList.remove("ready");
  const box = scatter.getBoundingClientRect();
  if (box.width < 10) return;
  const centerX = box.left + box.width / 2;
  const centerY = box.top + 56;
  chips.forEach((chip, index) => {
    const rect = chip.getBoundingClientRect();
    const jitterX = ((index * 17) % 11 - 5) * 14;
    const jitterY = ((index * 13) % 9 - 4) * 6;
    chip.style.setProperty("--sx", `${centerX - (rect.left + rect.width / 2) + jitterX}px`);
    chip.style.setProperty("--sy", `${centerY - (rect.top + rect.height / 2) + jitterY}px`);
    chip.style.setProperty("--srot", `${(index * 19) % 21 - 10}deg`);
    chip.style.zIndex = String(index + 1);
  });
  techStack.classList.add("ready");
  if (reduceMotion) {
    techStack.classList.add("scattered");
    return;
  }
  if (techArmed) return;
  techArmed = true;
  const watcher = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    watcher.disconnect();
    window.setTimeout(() => techStack.classList.add("scattered"), 450);
  }, { threshold: 0.35 });
  watcher.observe(techStack);
}
window.addEventListener("resize", () => measureTech());

const initial = location.hash.replace("#", "");
show(["works", "quests", "profile"].includes(initial) ? initial : "welcome");
if (document.body.dataset.view === "works") works.classList.add("settled");
