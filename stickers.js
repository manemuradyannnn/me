(function () {
  const board = document.getElementById("sticker-board");
  const sheet = document.getElementById("sticker-sheet");
  const paper = document.getElementById("sticker-paper");
  const layer = document.getElementById("sticker-layer");
  const reset = document.getElementById("sticker-reset");
  if (!board || !sheet || !paper || !layer || !reset) return;

  const choices = [...sheet.querySelectorAll(".sticker-choice")];

  const SUPABASE_URL = "https://glioegnsfbhpwsxyqeew.supabase.co";
  const SUPABASE_KEY = "sb_publishable_VXVKNUAuinG7NolB-m5OQA_pYo0n4QQ";

  let clientId = "";
  let authConfig = { url: SUPABASE_URL, publishableKey: SUPABASE_KEY };
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

  function safeDetail(data) {
    if (!data || typeof data !== "object") return { error: "auth" };
    const detail = {};
    for (const key of ["error", "error_code", "code", "msg", "message", "error_description", "hint"]) {
      if (data[key]) detail[key] = data[key];
    }
    return Object.keys(detail).length ? detail : { error: "auth" };
  }

  function noteFor(error) {
    const code = String(error.code || error.message || "").toLowerCase();
    if (error.status === 429 || code.includes("rate") || code.includes("over_request")) {
      return "Couldn't sign in to leave a sticker. Try again in a minute.";
    }
    if (code.includes("captcha")) {
      return "Couldn't sign in to leave a sticker. The sign-in check was blocked.";
    }
    return "Couldn't sign in to leave a sticker.";
  }

  function showAuthNote(text) {
    let note = board.querySelector(".sticker-auth-note");
    if (!text) {
      if (note) note.remove();
      return;
    }
    if (!note) {
      note = document.createElement("p");
      note.className = "sticker-auth-note";
      note.setAttribute("role", "status");
      board.append(note);
    }
    note.textContent = text;
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
    if (!response.ok) {
      const error = new Error(data.msg || data.error_description || data.message || data.error || "auth");
      error.status = response.status;
      error.code = data.error_code || data.code || data.error || null;
      error.detail = safeDetail(data);
      throw error;
    }
    if (!data.access_token || !data.user || !data.user.id) {
      const error = new Error("anonymous sign-in returned no session");
      error.status = response.status;
      error.code = "missing_session";
      error.detail = { error: "missing_session" };
      throw error;
    }
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

  async function createAnonymous() {
    const created = await authRequest("/signup", { data: {} });
    remember(authConfig.url, created);
  }

  let placed = [];
  let version = -1;
  let busy = false;
  let lifting = false;
  let renderPending = false;

  async function ensureSession() {
    session = readSession(authConfig.url);
    if (!session) {
      await createAnonymous();
    } else if (session.expires_at * 1000 < Date.now() + 20000) {
      try {
        await refreshSession();
      } catch (error) {
        console.error("sticker session refresh failed", {
          status: error.status || null,
          body: error.detail || { error: error.message },
        });
        localStorage.removeItem(storageKey(authConfig.url));
        session = null;
        clientId = "";
        await createAnonymous();
      }
    } else {
      clientId = session.user.id;
    }
    showAuthNote("");
    render();
    return session;
  }

  const authReady = ensureSession().catch((error) => {
    clientId = "";
    session = null;
    console.error("sticker sign-in failed", {
      status: error.status || null,
      body: error.detail || { error: error.message },
    });
    if (error.status || error.code) showAuthNote(noteFor(error));
  });

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

  async function rest(pathname, { method = "GET", body, prefer, withUser = false } = {}) {
    const headers = {
      apikey: SUPABASE_KEY,
      Accept: "application/json",
    };
    if (withUser) {
      if (!session) throw new Error("auth");
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (prefer) headers.Prefer = prefer;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    if (response.status === 401 && withUser) {
      await refreshSession();
      headers.Authorization = `Bearer ${session.access_token}`;
      const retry = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
      });
      if (!retry.ok) await failWrite(retry, method);
      const retryText = await retry.text();
      return retryText ? JSON.parse(retryText) : null;
    }
    if (!response.ok) await failWrite(response, method);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async function failWrite(response, method) {
    const text = await response.text();
    let body = { message: text.slice(0, 300) };
    try {
      body = safeDetail(JSON.parse(text));
    } catch (error) {
      /* keep the short text body */
    }
    if (method !== "GET") console.error("sticker write failed", { status: response.status, body });
    const error = new Error("board");
    error.status = response.status;
    throw error;
  }

  function toClient(row) {
    const choice = choiceFor(row.key);
    if (!choice) return null;
    return {
      id: row.id,
      key: row.key,
      src: choice.dataset.src,
      by: row.placed_by,
      ax: Number(row.ax),
      ay: Number(row.ay),
      rot: Number(row.rot),
      anchor: "paper",
    };
  }

  async function readBoard() {
    const [rows, state] = await Promise.all([
      rest("stickers?select=id,key,placed_by,ax,ay,rot,anchor&order=created_at.asc"),
      rest("board_state?select=version&id=eq.1"),
    ]);
    const versionRow = Array.isArray(state) ? state[0] : null;
    if (!versionRow || !Number.isFinite(Number(versionRow.version))) throw new Error("board");
    return {
      version: Number(versionRow.version),
      stickers: (Array.isArray(rows) ? rows : []).map(toClient).filter(Boolean),
    };
  }

  async function writeBoard(action, payload) {
    await authReady;
    if (!session || !clientId) throw new Error("auth");
    if (session.expires_at * 1000 < Date.now() + 20000) await refreshSession();
    if (action === "add") {
      await rest("stickers", {
        method: "POST",
        prefer: "return=minimal",
        withUser: true,
        body: {
          key: payload.key,
          src: payload.src,
          placed_by: clientId,
          ax: payload.ax,
          ay: payload.ay,
          rot: payload.rot,
          anchor: "paper",
        },
      });
    } else if (action === "move") {
      const updated = await rest(`stickers?id=eq.${encodeURIComponent(payload.id)}`, {
        method: "PATCH",
        prefer: "return=representation",
        withUser: true,
        body: { ax: payload.ax, ay: payload.ay, rot: payload.rot },
      });
      if (!Array.isArray(updated) || !updated.length) throw new Error("board");
    } else if (action === "remove") {
      await rest(`stickers?id=eq.${encodeURIComponent(payload.id)}&placed_by=eq.${encodeURIComponent(clientId)}`, {
        method: "DELETE",
        prefer: "return=minimal",
        withUser: true,
      });
    } else if (action === "reset") {
      await rest(`stickers?placed_by=eq.${encodeURIComponent(clientId)}`, {
        method: "DELETE",
        prefer: "return=minimal",
        withUser: true,
      });
    }
    return readBoard();
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
          writeBoard("remove", { id })
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
          writeBoard("move", {
            id: sticker.id,
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
    writeBoard("add", {
      key: sticker.key,
      src: sticker.src,
      ax: sticker.ax,
      ay: sticker.ay,
      rot: sticker.rot,
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
    writeBoard("reset")
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
