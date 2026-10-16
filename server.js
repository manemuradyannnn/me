const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = 4173;
const HOST = "127.0.0.1";
const MAX = 200;

function loadEnv(file) {
  let text = "";
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (error) {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv(path.join(ROOT, ".env"));

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "";

const STICKERS = {
  matcha: "assets/matcha_sticker.png",
  kitty: "assets/kitty_sticker.png",
  nigiri: "assets/nigiri_sticker.png",
  cn: "assets/cn_sticker.png",
  bow: "assets/bow_sticker.png",
  fish: "assets/goldfish.png",
  heart: "assets/heart_sticker.png",
  guitar: "assets/guitar_sticker.png",
  cat: "assets/cat_sticker.png",
  flower: "assets/flower_sticker.png",
  wand: "assets/wand_sticker.png",
  frisk: "assets/frisk_sticker.png",
  pacman: "assets/pacman_sticker.png",
  link: "assets/link_sticker.png",
  shark: "assets/shark_sticker.png",
  bunny: "assets/bunny_sticker.png",
  pinkkitty: "assets/pinkkitty_sticker.png",
};

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
};

const reloaders = new Set();

function validStored(item) {
  return item && STICKERS[item.key] && clientOf(item.by) && Number.isFinite(item.ax) && Number.isFinite(item.ay);
}

function toClient(row) {
  return {
    id: row.id,
    key: row.key,
    src: STICKERS[row.key],
    by: row.placed_by,
    ax: Number(row.ax),
    ay: Number(row.ay),
    rot: Number(row.rot),
    anchor: "paper",
  };
}

function bearerToken(req) {
  const header = String(req.headers.authorization || "");
  const match = header.match(/^Bearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/);
  return match ? match[1] : null;
}

function subjectOf(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return clientOf(payload.sub);
  } catch (error) {
    return null;
  }
}

function requireUser(req) {
  const token = bearerToken(req);
  const id = token && subjectOf(token);
  if (!token || !id) return null;
  return { token, id };
}

async function supabase(pathname, { method = "GET", body, prefer, accessToken } = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    const error = new Error("missing supabase env");
    error.status = 503;
    throw error;
  }
  const headers = {
    apikey: SUPABASE_KEY,
    Accept: "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = { message: text };
    }
  }
  if (!response.ok) {
    const error = new Error(data?.message || data?.error || "supabase request failed");
    error.status = response.status;
    throw error;
  }
  return data;
}

async function readBoard() {
  const [rows, state] = await Promise.all([
    supabase("stickers?select=id,key,placed_by,ax,ay,rot,anchor&order=created_at.asc"),
    supabase("board_state?select=version&id=eq.1"),
  ]);
  if (!Array.isArray(state) || !state[0] || !Number.isFinite(Number(state[0].version))) {
    const error = new Error("board_state missing");
    error.status = 502;
    throw error;
  }
  return {
    version: Number(state[0].version),
    stickers: (Array.isArray(rows) ? rows : []).map(toClient).filter(validStored),
  };
}

function failBoard(res, error) {
  const status = error.status === 503 || error.status === 401 || error.status === 403 ? error.status : 502;
  console.error("stickers:", error.message);
  const message = status === 503 ? "stickers are not configured" : status === 401 ? "sign in required" : "board unavailable";
  send(res, status, { error: message });
}

function clientOf(value) {
  const by = String(value || "");
  return /^[0-9a-f-]{8,80}$/i.test(by) ? by : null;
}

function numberIn(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 4096) {
        reject(new Error("too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

async function addSticker(body, user) {
  const key = String(body.key || "");
  const ax = numberIn(body.ax, 0, 1);
  const ay = numberIn(body.ay, 0, 1);
  const rot = numberIn(body.rot, -180, 180);
  if (!STICKERS[key] || ax === null || ay === null || rot === null) return null;
  const existing = await supabase("stickers?select=id", { accessToken: user.token });
  if (!Array.isArray(existing) || existing.length >= MAX) return null;
  await supabase("stickers", {
    method: "POST",
    prefer: "return=minimal",
    accessToken: user.token,
    body: {
      key,
      src: STICKERS[key],
      placed_by: user.id,
      ax,
      ay,
      rot,
      anchor: "paper",
    },
  });
  return true;
}

async function moveSticker(id, body, user) {
  const ax = numberIn(body.ax, 0, 1);
  const ay = numberIn(body.ay, 0, 1);
  const rot = numberIn(body.rot, -180, 180);
  if (ax === null || ay === null || rot === null) return false;
  const updated = await supabase(`stickers?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    prefer: "return=representation",
    accessToken: user.token,
    body: { ax, ay, rot },
  });
  return Array.isArray(updated) && updated.length > 0;
}

async function removeSticker(id, user) {
  const removed = await supabase(`stickers?id=eq.${encodeURIComponent(id)}&placed_by=eq.${encodeURIComponent(user.id)}`, {
    method: "DELETE",
    prefer: "return=representation",
    accessToken: user.token,
  });
  return Array.isArray(removed) && removed.length > 0;
}

async function resetStickers(user) {
  await supabase(`stickers?placed_by=eq.${encodeURIComponent(user.id)}`, {
    method: "DELETE",
    prefer: "return=minimal",
    accessToken: user.token,
  });
  return true;
}

function serveFile(req, res, url) {
  const clean = decodeURIComponent(url.split("?")[0]);
  const rel = clean === "/" ? "index.html" : clean.replace(/^\/+/, "");
  const file = path.normalize(path.join(ROOT, rel));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep) || rel.startsWith("data/") || rel === "data" || rel === "server.js" || rel === ".env" || rel.startsWith(".env")) {
    res.writeHead(404);
    res.end();
    return;
  }
  fs.readFile(file, (error, buf) => {
    if (error) {
      res.writeHead(404);
      res.end();
      return;
    }
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    if (file.endsWith(`${path.sep}index.html`) || file.endsWith("/index.html")) {
      const html = buf.toString("utf8").replace(
        "</body>",
        '<script>new EventSource("/livereload").onmessage=function(){location.reload()}</script></body>'
      );
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
      res.end(html);
      return;
    }
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  const url = (req.url || "/").split("?")[0];

  if (url === "/livereload") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(": ok\n\n");
    reloaders.add(res);
    req.on("close", () => reloaders.delete(res));
    return;
  }

  if (url === "/api/stickers" && req.method === "GET") {
    try {
      send(res, 200, await readBoard());
    } catch (error) {
      failBoard(res, error);
    }
    return;
  }

  if (url === "/api/config" && req.method === "GET") {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      send(res, 503, { error: "stickers are not configured" });
      return;
    }
    send(res, 200, { url: SUPABASE_URL, publishableKey: SUPABASE_KEY });
    return;
  }

  if (url === "/api/stickers" && req.method === "POST") {
    const user = requireUser(req);
    if (!user) {
      send(res, 401, { error: "sign in required" });
      return;
    }
    try {
      const body = await readBody(req);
      const sticker = await addSticker(body, user);
      if (!sticker) {
        send(res, 400, { error: "invalid sticker" });
        return;
      }
      send(res, 201, await readBoard());
    } catch (error) {
      if (error instanceof SyntaxError) {
        send(res, 400, { error: "bad request" });
        return;
      }
      failBoard(res, error);
    }
    return;
  }

  if (url === "/api/stickers/reset" && req.method === "POST") {
    const user = requireUser(req);
    if (!user) {
      send(res, 401, { error: "sign in required" });
      return;
    }
    try {
      await readBody(req);
      if (!(await resetStickers(user))) {
        send(res, 400, { error: "invalid reset" });
        return;
      }
      send(res, 200, await readBoard());
    } catch (error) {
      if (error instanceof SyntaxError) {
        send(res, 400, { error: "bad request" });
        return;
      }
      failBoard(res, error);
    }
    return;
  }

  const match = url.match(/^\/api\/stickers\/([0-9a-f-]{36})$/i);
  if (match && req.method === "PATCH") {
    const user = requireUser(req);
    if (!user) {
      send(res, 401, { error: "sign in required" });
      return;
    }
    try {
      const body = await readBody(req);
      if (!(await moveSticker(match[1], body, user))) {
        send(res, 404, { error: "not found" });
        return;
      }
      send(res, 200, await readBoard());
    } catch (error) {
      if (error instanceof SyntaxError) {
        send(res, 400, { error: "bad request" });
        return;
      }
      failBoard(res, error);
    }
    return;
  }

  if (match && req.method === "DELETE") {
    const user = requireUser(req);
    if (!user) {
      send(res, 401, { error: "sign in required" });
      return;
    }
    try {
      if (!(await removeSticker(match[1], user))) {
        send(res, 404, { error: "not found" });
        return;
      }
      send(res, 200, await readBoard());
    } catch (error) {
      failBoard(res, error);
    }
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    serveFile(req, res, url);
    return;
  }

  res.writeHead(405);
  res.end();
});

let reloadTimer = 0;
function watch() {
  fs.watch(ROOT, { recursive: true }, (event, filename) => {
    if (!filename) return;
    const name = String(filename);
    if (name.startsWith("data") || !/\.(html|css|js)$/.test(name) || name === "server.js") return;
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      for (const client of reloaders) client.write("data: reload\n\n");
    }, 80);
  });
}

server.listen(PORT, HOST, () => {
  console.log(`site http://${HOST}:${PORT}`);
  watch();
});
