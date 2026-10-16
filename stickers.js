(function () {
  const board = document.getElementById("sticker-board");
  const sheet = document.getElementById("sticker-sheet");
  const paper = document.getElementById("sticker-paper");
  const layer = document.getElementById("sticker-layer");
  const reset = document.getElementById("sticker-reset");
  if (!board || !sheet || !paper || !layer || !reset) return;

  const choices = [...sheet.querySelectorAll(".sticker-choice")];

  let clientId = "";
  let authConfig = null;
  let session = null;

  function storageKey(url) {
    const ref = new URL(url).hostname.split(".")[0];
    return `sb-${ref}-auth-token`;
  }

  function readSession(url) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(url)) || "null");
      if (saved && saved.access_token && saved.refresh_token && saved.user && saved.user.id) return saved;
    } catch (error) {
      /* ignore a broken saved session */
    }
    return null;
  }

  function writeSession(url, next) {
    localStorage.setItem(storageKey(url), JSON.stringify(next));
    session = next;
    clientId = next.user.id;
  }

  async function authRequest(path, body) {
    const response = await fetch(`${authConfig.url}/auth/v1${path}`, {
      method: "POST",
      headers: {
        apikey: authConfig.publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.msg || data.error_description || data.message || "auth");
    return data;
  }

  function remember(url, data) {
    const next = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
      token_type: data.token_type || "bearer",
      user: data.user,
    };
    writeSession(url, next);
    return next;
  }

  async function refreshSession() {
    const data = await authRequest("/token?grant_type=refresh_token", {
      refresh_token: session.refresh_token,
    });
    return remember(authConfig.url, data);
  }

  async function ensureSession() {
    if (!authConfig) {
      const response = await fetch("/api/config", { cache: "no-store" });
      if (!response.ok) throw new Error("config");
      authConfig = await response.json();
    }
    session = readSession(authConfig.url);
    if (!session) {
      const created = await authRequest("/signup", { data: {} });
      remember(authConfig.url, created);
    } else if (session.expires_at * 1000 < Date.now() + 20000) {
      await refreshSession();
    } else {
      clientId = session.user.id;
    }
    render();
    return session;
  }

  const authReady = ensureSession().catch(() => {
    clientId = "";
  });

  let placed = [];
  let version = -1;
  let busy = false;
  let lifting = false;
  let renderPending = false;

  function measure() {
    const choice = sheet.querySelector(".sticker-choice");
    if (!choice || !choice.clientWidth) return;
    document.documentElement.style.setProperty("--sticker-size", choice.clientWidth + "px");
  }

  new ResizeObserver(measure).observe(sheet);
  measure();

  function choiceFor(key) {
    return choices.find((choice) => choice.dataset.key === key);
  }

  function overSheet(x, y) {
    const box = sheet.getBoundingClientRect();
    const pad = 16;
    return x >= box.left - pad && x <= box.right + pad && y >= box.top - pad && y <= box.bottom + pad;
  }

  function overPaper(x, y) {
    const box = paper.getBoundingClientRect();
    return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
  }

  function pointFor(sticker) {
    const boardBox = board.getBoundingClientRect();
    const box = paper.getBoundingClientRect();
    return {
      x: box.left - boardBox.left + sticker.ax * box.width,
      y: box.top - boardBox.top + sticker.ay * box.height,
    };
  }

  function applyTransform(el, sticker) {
    const point = pointFor(sticker);
    el.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%) rotate(${sticker.rot}deg)`;
  }

  function anchorOnPaper(sticker, clientX, clientY) {
    const box = paper.getBoundingClientRect();
    const insetX = Math.min(24, box.width * 0.06);
    const insetY = Math.min(24, box.height * 0.1);
    const x = Math.min(box.right - insetX, Math.max(box.left + insetX, clientX));
    const y = Math.min(box.bottom - insetY, Math.max(box.top + insetY, clientY));
    sticker.anchor = "paper";
    sticker.ax = (x - box.left) / box.width;
    sticker.ay = (y - box.top) / box.height;
  }

  function render() {
    if (lifting) {
      renderPending = true;
      return;
    }
    renderPending = false;
    layer.replaceChildren();
    placed.forEach((sticker) => layer.append(createPlaced(sticker)));
    reset.classList.toggle("is-live", placed.some((sticker) => sticker.by === clientId));
  }

  async function readBoard() {
    const response = await fetch("/api/stickers", { cache: "no-store" });
    if (!response.ok) throw new Error("board");
    return response.json();
  }

  async function writeBoard(method, url, body) {
    await authReady;
    if (!session) throw new Error("auth");
    if (session.expires_at * 1000 < Date.now() + 20000) await refreshSession();
    const send = () => fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: body ? JSON.stringify(body) : "{}",
    });
    let response = await send();
    if (response.status === 401) {
      await refreshSession();
      response = await send();
    }
    if (!response.ok) throw new Error("board");
    return response.json();
  }

  function show(list, nextVersion) {
    version = nextVersion;
    placed = (Array.isArray(list) ? list : []).filter((item) => item && choiceFor(item.key));
    render();
  }

  async function pull() {
    if (busy || lifting) return;
    try {
      const data = await readBoard();
      if (busy || data.version <= version) return;
      show(data.stickers, data.version);
    } catch (error) {
      /* the board server is not up yet */
    }
  }

  function createPlaced(sticker) {
    const el = document.createElement("span");
    el.className = "placed-sticker";
    const img = document.createElement("img");
    img.src = sticker.src;
    img.alt = "";
    img.draggable = false;
    el.append(img);
    applyTransform(el, sticker);
    if (sticker.by !== clientId) return el;

    el.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      lifting = true;
      el.setPointerCapture(event.pointerId);
      el.classList.add("is-lifted");
      const start = { ax: sticker.ax, ay: sticker.ay, rot: sticker.rot };
      sticker.rot = Math.random() * 30 - 15;

      function follow(next) {
        const boardBox = board.getBoundingClientRect();
        el.style.transform = `translate(${next.clientX - boardBox.left}px, ${next.clientY - boardBox.top}px) translate(-50%, -50%) rotate(${sticker.rot}deg)`;
      }

      function up(next) {
        el.removeEventListener("pointermove", follow);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
        el.classList.remove("is-lifted");
        lifting = false;
        if (renderPending) render();
        if (overSheet(next.clientX, next.clientY) && !overPaper(next.clientX, next.clientY)) {
          const id = sticker.id;
          placed = placed.filter((item) => item !== sticker);
          el.remove();
          render();
          if (!id) return;
          busy = true;
          writeBoard("DELETE", "/api/stickers/" + id)
            .then((data) => show(data.stickers, data.version))
            .catch(() => {
              version = -1;
              return pull();
            })
            .finally(() => {
              busy = false;
            });
          return;
        }
        if (overPaper(next.clientX, next.clientY)) {
          anchorOnPaper(sticker, next.clientX, next.clientY);
          applyTransform(el, sticker);
          if (!sticker.id) return;
          busy = true;
          writeBoard("PATCH", "/api/stickers/" + sticker.id, {
            ax: sticker.ax,
            ay: sticker.ay,
            rot: sticker.rot,
          })
            .then((data) => show(data.stickers, data.version))
            .catch(() => {
              version = -1;
              return pull();
            })
            .finally(() => {
              busy = false;
            });
          return;
        }
        sticker.ax = start.ax;
        sticker.ay = start.ay;
        sticker.rot = start.rot;
        applyTransform(el, sticker);
      }

      el.addEventListener("pointermove", follow);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    });

    return el;
  }

  async function placeCopy(choice, clientX, clientY, rot) {
    await authReady;
    if (!clientId) return;
    const sticker = {
      key: choice.dataset.key,
      src: choice.dataset.src,
      rot,
      anchor: "paper",
      ax: 0.5,
      ay: 0.5,
      by: clientId,
    };
    anchorOnPaper(sticker, clientX, clientY);
    busy = true;
    placed.push(sticker);
    layer.append(createPlaced(sticker));
    reset.classList.add("is-live");
    writeBoard("POST", "/api/stickers", {
      key: sticker.key,
      ax: sticker.ax,
      ay: sticker.ay,
      rot: sticker.rot,
      by: clientId,
    })
      .then((data) => show(data.stickers, data.version))
      .catch(() => {
        placed = placed.filter((item) => item !== sticker);
        render();
      })
      .finally(() => {
        busy = false;
      });
  }

  let dragChoice = null;

  function sizePeel(choice) {
    const host = choice.querySelector(".peel-host");
    if (!choice.peel || !host || !host.clientWidth) return;
    const k = Number(choice.dataset.k || 1);
    choice.peel.setWidth(host.clientWidth * 0.7 * k);
  }

  function unmount(choice) {
    if (!choice.peel || choice === dragChoice) return;
    choice.peel.destroy();
    choice.peel = null;
    const still = choice.querySelector(".sticker-still");
    if (still) still.hidden = false;
  }

  function mountPeel(choice) {
    if (choice.peel || typeof createStickerPeel !== "function") return;
    choices.forEach((other) => {
      if (other !== choice) unmount(other);
    });
    const host = choice.querySelector(".peel-host");
    const still = choice.querySelector(".sticker-still");
    if (!host) return;
    choice.peel = createStickerPeel(host, {
      imageSrc: choice.dataset.src,
      width: 72,
      curlRadius: 7,
      peelBackHoverPct: 30,
      peelBackActivePct: 64,
      shadowIntensity: 0.28,
      finish: "gloss",
      swing: 1.15,
      pixelated: true,
      onRelease({ clientX, clientY, distance }) {
        if (distance < 48) return;
        if (overPaper(clientX, clientY)) {
          placeCopy(choice, clientX, clientY, Math.random() * 30 - 15);
        }
      },
    });
    if (still) still.hidden = true;
    sizePeel(choice);
  }

  choices.forEach((choice) => {
    const host = choice.querySelector(".peel-host");
    if (!host) return;
    const still = document.createElement("img");
    still.className = "sticker-still";
    still.src = choice.dataset.src;
    still.alt = "";
    still.draggable = false;
    host.append(still);
    choice.addEventListener("pointerenter", () => {
      if (dragChoice && dragChoice !== choice) return;
      mountPeel(choice);
    });
    choice.addEventListener("pointerdown", (event) => {
      dragChoice = choice;
      mountPeel(choice);
      const start = () => Boolean(choice.peel && choice.peel.grab && choice.peel.grab(event));
      if (start()) return;
      let tries = 0;
      let waiting = true;
      const stop = () => {
        waiting = false;
      };
      window.addEventListener("pointerup", stop, true);
      window.addEventListener("pointercancel", stop, true);
      const retry = () => {
        if (!waiting || !choice.peel || tries++ > 30) {
          window.removeEventListener("pointerup", stop, true);
          window.removeEventListener("pointercancel", stop, true);
          return;
        }
        if (start()) {
          window.removeEventListener("pointerup", stop, true);
          window.removeEventListener("pointercancel", stop, true);
          return;
        }
        requestAnimationFrame(retry);
      };
      requestAnimationFrame(retry);
    });
  });

  window.addEventListener("pointerup", () => {
    const done = dragChoice;
    dragChoice = null;
    window.setTimeout(() => {
      if (!done || (done.peel && done.peel.isDragging())) return;
      if (!done.matches(":hover")) unmount(done);
    }, 0);
  });

  new ResizeObserver(() => {
    measure();
    choices.forEach(sizePeel);
  }).observe(sheet);

  reset.addEventListener("click", () => {
    if (!clientId) return;
    busy = true;
    writeBoard("POST", "/api/stickers/reset", { by: clientId })
      .then((data) => show(data.stickers, data.version))
      .finally(() => {
        busy = false;
      });
  });

  new ResizeObserver(() => {
    layer.querySelectorAll(".placed-sticker").forEach((el, index) => {
      if (placed[index]) applyTransform(el, placed[index]);
    });
  }).observe(board);

  pull();
  setInterval(pull, 2000);
})();
