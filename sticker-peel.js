/* Port of React Bits Sticker Peel (https://reactbits.dev/animations/sticker-peel). */
const VERTEX = "#version 300 es\nin vec2 aGrid;\nuniform vec2 uCanvas;\nuniform vec2 uMesh;\nuniform vec2 uCenter;\nuniform vec2 uDir;\nuniform float uFold;\nuniform float uRadius;\nuniform float uAngle;\nuniform float uScale;\nuniform float uLift;\nuniform int uPass;\nuniform vec2 uShadowOffset;\nuniform vec2 uShadowSlope;\nout vec2 vUv;\nout float vFold;\nout vec3 vNormal;\nout vec3 vPos;\nout float vHeight;\nout float vCurl;\nconst float PI = 3.14159265;\n\nvoid main() {\n vec2 local = (aGrid - 0.5) * uMesh;\n float s = dot(local, uDir);\n float d = uFold - s;\n vec3 normal = vec3(0.0, 0.0, 1.0);\n float z = 0.0;\n vec2 p = local;\n if (d > 0.0) {\n float theta = d / uRadius;\n float along = uFold + d - PI * uRadius;\n z = 2.0 * uRadius;\n normal = vec3(0.0, 0.0, -1.0);\n if (theta < PI) {\n along = uFold - uRadius * sin(theta);\n z = uRadius * (1.0 - cos(theta));\n normal = vec3(uDir * sin(theta), cos(theta));\n }\n p += (along - s) * uDir;\n }\n float c = cos(uAngle);\n float sn = sin(uAngle);\n vec2 turned = vec2(c * p.x - sn * p.y, sn * p.x + c * p.y) * uScale;\n vNormal = vec3(c * normal.x - sn * normal.y, sn * normal.x + c * normal.y, normal.z);\n vUv = aGrid;\n vFold = d;\n vCurl = z * uScale;\n float height = z * uScale + uLift;\n vec2 screen = uCenter + turned;\n float depth = 0.0;\n if (uPass == 0 || uPass == 2) {\n vHeight = uPass == 0 ? height : z * uScale;\n screen += uShadowOffset + uShadowSlope * vHeight;\n } else {\n vHeight = height;\n depth = clamp(-height / 1000.0, -1.0, 1.0);\n }\n vPos = vec3(uCenter + turned, height);\n gl_Position = vec4(screen.x / uCanvas.x * 2.0 - 1.0, 1.0 - screen.y / uCanvas.y * 2.0, depth, 1.0);\n}";

const FRAGMENT = "#version 300 es\nprecision highp float;\nprecision highp int;\nuniform sampler2D uImage;\nuniform int uPass;\nuniform int uFinish;\nuniform vec3 uBack;\nuniform vec3 uLight;\nuniform float uShine;\nuniform float uShadow;\nuniform float uTexel;\nuniform float uLod;\nuniform float uRadius;\nuniform vec2 uGlint;\nin vec2 vUv;\nin float vFold;\nin vec3 vNormal;\nin vec3 vPos;\nin float vHeight;\nin float vCurl;\nout vec4 outColor;\n\nfloat hash(vec2 p) {\n vec3 q = fract(vec3(p.xyx) * 0.1031);\n q += dot(q, q.yzx + 33.33);\n return fract((q.x + q.y) * q.z);\n}\n\nvec3 spectrum(float t) {\n t = fract(t) * 6.0;\n vec3 a = vec3(1.0, 0.478, 0.46);\n vec3 b = vec3(1.0, 0.928, 0.38);\n vec3 c = vec3(0.659, 1.0, 0.38);\n vec3 d = vec3(0.52, 1.0, 0.968);\n vec3 e = vec3(0.48, 0.584, 1.0);\n vec3 f = vec3(0.68, 0.52, 1.0);\n if (t < 1.0) return mix(a, b, t);\n if (t < 2.0) return mix(b, c, t - 1.0);\n if (t < 3.0) return mix(c, d, t - 2.0);\n if (t < 4.0) return mix(d, e, t - 3.0);\n if (t < 5.0) return mix(e, f, t - 4.0);\n return mix(f, a, t - 5.0);\n}\n\nfloat bars(float t) {\n t = fract(t) * 12.0;\n if (t < 3.8) return mix(0.08, 0.6, t / 3.8);\n if (t < 4.5) return mix(0.6, 0.72, (t - 3.8) / 0.7);\n if (t < 5.2) return mix(0.72, 0.6, (t - 4.5) / 0.7);\n if (t < 10.0) return mix(0.6, 0.08, (t - 5.2) / 4.8);\n return 0.08;\n}\n\nvoid main() {\n if (uPass == 0) {\n float alpha;\n if (vFold > 0.0) {\n alpha = textureLod(uImage, vUv, log2(max(1.5 * uTexel, 1.0))).a * (1.0 - smoothstep(0.0, uRadius, vCurl));\n } else {\n alpha = textureLod(uImage, vUv, log2(max((1.2 + vHeight * 0.55) * uTexel, 1.0))).a;\n }\n outColor = vec4(0.0, 0.0, 0.0, alpha * uShadow / (1.0 + vHeight * 0.03));\n return;\n }\n if (uPass == 2) {\n if (vFold <= 0.0) discard;\n float alpha = textureLod(uImage, vUv, log2(max(uTexel, 1.0))).a * smoothstep(0.0, uRadius, vCurl);\n outColor = vec4(alpha);\n return;\n }\n if (uPass == 1 && vFold > 0.0) discard;\n if (uPass == 3 && vFold <= 0.0) discard;\n vec4 art = textureLod(uImage, vUv, uLod);\n if (art.a < 0.004) discard;\n bool front = vNormal.z >= 0.0;\n vec3 n = normalize(front ? vNormal : -vNormal);\n vec3 toLight = normalize(uLight - vPos);\n vec3 halfway = normalize(toLight + vec3(0.0, 0.0, 1.0));\n float diffuse = max(dot(n, toLight), 0.0);\n float nh = max(dot(n, halfway), 0.0);\n vec3 key = normalize(vec3(-0.45, -0.6, 0.66));\n float shade = clamp(0.5 + 0.25 * dot(n, key) / key.z + 0.25 * n.z, 0.5, front ? 1.0 : 1.08);\n if (uPass == 1) shade = 1.0;\n vec3 color;\n if (!front) {\n float grain = hash(floor(vUv * 700.0)) * 0.06 - 0.03;\n color = uBack * (0.7 + 0.3 * diffuse + grain) * art.a + vec3(pow(nh, 24.0) * 0.2 * uShine) * art.a;\n } else if (uFinish == 1) {\n color = art.rgb * (0.8 + 0.22 * diffuse) + vec3(pow(nh, 8.0) * 0.08 * uShine) * art.a;\n } else if (uFinish == 2) {\n vec3 albedo = art.rgb / art.a;\n float lum = dot(albedo, vec3(0.299, 0.587, 0.114));\n float foil = smoothstep(0.5, 0.92, lum);\n vec2 q = vUv - uGlint;\n float near = exp(-dot(q, q) * 3.0);\n float tilt = dot(n.xy, vec2(0.6, 0.8)) * 1.6;\n vec3 rainbow = spectrum((vUv.x + vUv.y) * 0.85 - (uGlint.x + uGlint.y) * 1.2 + tilt);\n float streak = bars((vUv.x - vUv.y) * 2.6 + uGlint.x * 1.8 - uGlint.y * 0.6 + tilt * 0.5);\n float band = smoothstep(0.32, 0.7, streak);\n vec3 silver = vec3(0.8, 0.82, 0.86) * (0.88 + 0.16 * diffuse);\n vec3 film = mix(silver, rainbow * 1.08, clamp(band * (0.55 + 0.45 * near) + 0.18 * near, 0.0, 1.0));\n vec3 ink = albedo * (0.86 + 0.14 * diffuse) + rainbow * band * 0.22 * (0.4 + 0.6 * near);\n vec3 base = mix(albedo * (0.86 + 0.14 * diffuse), mix(ink, film, foil), uShine * 0.6 + 0.4);\n vec2 cell = floor(vUv * 180.0);\n vec2 jitter = vec2(hash(cell), hash(cell + 7.3)) * 0.6 + 0.2;\n float dist = length(fract(vUv * 180.0) - jitter);\n vec3 facet = normalize(vec3(vec2(hash(cell + 2.1), hash(cell + 5.7)) * 2.0 - 1.0, 1.6));\n float glint = pow(max(dot(facet, halfway), 0.0), 60.0) * smoothstep(0.32, 0.05, dist) * step(0.55, hash(cell + 3.1)) * (0.15 + 0.85 * foil);\n color = (base + spectrum(hash(cell) + uGlint.x) * glint * 1.6 * uShine + vec3(pow(nh, 140.0) * 0.4 * uShine)) * art.a;\n } else {\n color = art.rgb * (0.86 + 0.16 * diffuse) + vec3(pow(nh, 220.0) * 0.4 + pow(nh, 24.0) * 0.03) * uShine * art.a;\n }\n float bend = uPass == 3 ? smoothstep(0.0, uRadius * 0.6, vCurl) : 0.0;\n float glare = pow(max(dot(n, normalize(key + vec3(0.0, 0.0, 1.0))), 0.0), 28.0) * bend * (0.18 + 0.3 * uShine);\n outColor = vec4(min(color * shade + vec3(glare) * art.a, vec3(art.a)), art.a);\n}";

const POST_VERTEX = "#version 300 es\nout vec2 vUv;\nvoid main() {\n vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));\n vUv = p;\n gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);\n}";

const POST_FRAGMENT = "#version 300 es\nprecision highp float;\nuniform sampler2D uSource;\nuniform vec2 uStep;\nuniform float uSigma;\nuniform float uStrength;\nuniform int uMode;\nin vec2 vUv;\nout vec4 outColor;\n\nvoid main() {\n if (uMode == 1) {\n outColor = vec4(0.0, 0.0, 0.0, texture(uSource, vUv).a * uStrength);\n return;\n }\n vec4 sum = vec4(0.0);\n float total = 0.0;\n for (int i = -8; i <= 8; i++) {\n float offset = float(i);\n float weight = exp(-0.5 * offset * offset / (uSigma * uSigma));\n sum += texture(uSource, vUv + uStep * offset) * weight;\n total += weight;\n }\n outColor = sum / total;\n}";

const GRID = 96;
const PAD = 0.18;
const MAX_TEXTURE = 1024;
const MASK_SIZE = 96;
const LIGHT_HEIGHT = 260;
const FINISHES = { gloss: 0, matte: 1, holo: 2 };
let stack = 1;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrapAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
const toRadians = (degrees) => (degrees * Math.PI) / 180;

const spring = (state, key, target, frequency, damping, dt) => {
  const omega = 2 * Math.PI * frequency;
  const velocity = key + "V";
  state[velocity] += (omega * omega * (target - state[key]) - 2 * damping * omega * state[velocity]) * dt;
  state[key] += state[velocity] * dt;
};

const compile = (gl, type, source) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.warn(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
};

const link = (gl, vertexSource, fragmentSource) => {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, "aGrid");
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  const uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
};

const convexHull = (points) => {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  sorted.forEach((point) => {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  });
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const point = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
};

function createStickerPeel(parent, options) {
  const settings = {
    imageSrc: options.imageSrc,
    width: Math.max(16, options.width || 72),
    rotate: toRadians(options.rotate || 0),
    peelDirection: toRadians(options.peelDirection || 0),
    hoverPeel: clamp(options.peelBackHoverPct ?? 28, 0, 100) / 100,
    activePeel: clamp(options.peelBackActivePct ?? 62, 0, 100) / 100,
    curlRadius: Math.max(2, options.curlRadius ?? 8),
    finish: FINISHES[options.finish || "gloss"] ?? 0,
    backColor: options.backColor || "#ececea",
    lighting: clamp(options.lightingIntensity ?? 0.45, 0, 1),
    shadow: clamp(options.shadowIntensity ?? 0.55, 0, 1),
    followPointer: options.followPointer !== false,
    draggable: options.draggable !== false,
    contain: options.contain === true,
    swing: clamp(options.swing ?? 1, 0, 3),
    friction: clamp(options.friction ?? 0.6, 0, 1),
    bounce: clamp(options.bounce ?? 0.2, 0, 1),
    intro: options.intro === true,
    pixelated: options.pixelated !== false,
    onRelease: options.onRelease || null,
  };

  const root = document.createElement("div");
  root.className = "sticker-peel";
  const canvas = document.createElement("canvas");
  canvas.className = "sticker-peel-canvas";
  const hit = document.createElement("div");
  hit.className = "sticker-peel-hit";
  root.append(canvas, hit);
  parent.append(root);

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    depth: true,
    stencil: false,
  });

  if (!gl) {
    const img = document.createElement("img");
    img.src = settings.imageSrc;
    img.alt = "";
    img.className = "peel-fallback";
    parent.append(img);
    root.remove();
    return { setWidth() {}, destroy() { img.remove(); } };
  }

  const program = link(gl, VERTEX, FRAGMENT);
  const post = link(gl, POST_VERTEX, POST_FRAGMENT);
  if (!program || !post) {
    root.remove();
    return { setWidth() {}, destroy() {} };
  }

  const u = program.uniforms;
  const pu = post.uniforms;
  const targets = [0, 1].map(() => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const buffer = gl.createFramebuffer();
    return { texture, buffer, width: 0, height: 0 };
  });

  const vertices = new Float32Array((GRID + 1) * (GRID + 1) * 2);
  for (let y = 0; y <= GRID; y++) {
    for (let x = 0; x <= GRID; x++) {
      const i = (y * (GRID + 1) + x) * 2;
      vertices[i] = x / GRID;
      vertices[i + 1] = y / GRID;
    }
  }
  const indices = new Uint16Array(GRID * GRID * 6);
  let cursor = 0;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const a = y * (GRID + 1) + x;
      const b = a + 1;
      const c = a + GRID + 1;
      const d = c + 1;
      indices.set([a, b, d, a, d, c], cursor);
      cursor += 6;
    }
  }
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  const texture = gl.createTexture();
  const scratch = document.createElement("canvas");
  const scratchContext = scratch.getContext("2d", { willReadFrequently: true });
  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const colorCache = new Map();
  const parse = (value) => {
    const key = String(value);
    const cached = colorCache.get(key);
    if (cached) return cached;
    let rgb = [0.83, 0.83, 0.85];
    if (probe) {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = "#ececea";
      probe.fillStyle = key;
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
      rgb = [r / 255, g / 255, b / 255];
    }
    colorCache.set(key, rgb);
    return rgb;
  };

  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const sticker = {
    ready: false,
    aspect: 1,
    meshX: 1,
    meshY: 1,
    texel: 1,
    mask: null,
    maskW: 1,
    maskH: 1,
    hull: [],
  };
  const view = { ratio: 1, size: 1, density: 0 };
  const bounds = { width: 1, height: 1 };
  const state = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    placed: false,
    swing: 0,
    swingV: 0,
    peel: 0,
    peelV: 0,
    lift: 0,
    liftV: 0,
    dir: settings.peelDirection,
    hover: false,
    local: { x: 0, y: 0 },
    press: null,
    pivotV: { x: 0, y: 0 },
    light: { x: 0, y: 0, z: LIGHT_HEIGHT },
    pointer: { x: 0, y: 0, inside: false },
    intro: settings.intro && !reduce ? 0 : 1,
  };

  let raf = 0;
  let last = 0;
  let visible = true;
  let loadedSrc = null;
  let alive = true;

  const height = () => settings.width * sticker.aspect;

  const extentAlong = (dx, dy) => {
    const w = settings.width;
    const h = height();
    if (!sticker.hull.length) {
      const half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
      return [-half, half];
    }
    let min = Infinity;
    let max = -Infinity;
    sticker.hull.forEach(([px, py]) => {
      const value = px * w * dx + py * h * dy;
      if (value < min) min = value;
      if (value > max) max = value;
    });
    return [min, max];
  };

  const sizeTargets = () => {
    const width = Math.max(1, Math.round(view.size / 2));
    targets.forEach((target) => {
      if (target.width === width && target.height === width) return;
      target.width = width;
      target.height = width;
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, width, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.buffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0);
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const load = (src) => {
    loadedSrc = src;
    sticker.ready = false;
    if (!src) return;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (!alive || loadedSrc !== src || !scratchContext) return;
      const iw = image.naturalWidth || 1;
      const ih = image.naturalHeight || 1;
      const fit = Math.min(1, MAX_TEXTURE / (Math.max(iw, ih) * (1 + 2 * PAD)));
      const w = Math.max(1, Math.round(iw * fit));
      const h = Math.max(1, Math.round(ih * fit));
      const padX = Math.round(w * PAD);
      const padY = Math.round(h * PAD);
      scratch.width = w + padX * 2;
      scratch.height = h + padY * 2;
      scratchContext.imageSmoothingEnabled = !settings.pixelated;
      scratchContext.clearRect(0, 0, scratch.width, scratch.height);
      scratchContext.drawImage(image, padX, padY, w, h);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scratch);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.generateMipmap(gl.TEXTURE_2D);
      if (settings.pixelated) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      sticker.aspect = ih / iw;
      sticker.meshX = scratch.width / w;
      sticker.meshY = scratch.height / h;
      sticker.texel = scratch.width;
      const maskW = Math.max(8, Math.round(MASK_SIZE * Math.min(1, iw / ih)));
      const maskH = Math.max(8, Math.round(MASK_SIZE * Math.min(1, ih / iw)));
      scratch.width = maskW;
      scratch.height = maskH;
      scratchContext.clearRect(0, 0, maskW, maskH);
      scratchContext.drawImage(image, 0, 0, maskW, maskH);
      const pixels = scratchContext.getImageData(0, 0, maskW, maskH).data;
      const mask = new Uint8Array(maskW * maskH).fill(255);
      const queue = [];
      const visit = (x, y) => {
        const i = y * maskW + x;
        if (mask[i] === 0 || pixels[i * 4 + 3] > 100) return;
        mask[i] = 0;
        queue.push(i);
      };
      for (let x = 0; x < maskW; x++) {
        visit(x, 0);
        visit(x, maskH - 1);
      }
      for (let y = 0; y < maskH; y++) {
        visit(0, y);
        visit(maskW - 1, y);
      }
      while (queue.length) {
        const i = queue.pop();
        const x = i % maskW;
        const y = (i - x) / maskW;
        if (x > 0) visit(x - 1, y);
        if (x < maskW - 1) visit(x + 1, y);
        if (y > 0) visit(x, y - 1);
        if (y < maskH - 1) visit(x, y + 1);
      }
      const points = [];
      for (let y = 0; y < maskH; y++) {
        for (let x = 0; x < maskW; x++) {
          if (pixels[(y * maskW + x) * 4 + 3] > 127) points.push([(x + 0.5) / maskW - 0.5, (y + 0.5) / maskH - 0.5]);
        }
      }
      sticker.mask = mask;
      sticker.maskW = maskW;
      sticker.maskH = maskH;
      sticker.hull = convexHull(points);
      sticker.ready = true;
      layout();
      wake();
    };
    image.src = src;
  };

  const layout = () => {
    view.ratio = Math.min(window.devicePixelRatio || 1, 2);
    bounds.width = Math.max(1, parent.clientWidth);
    bounds.height = Math.max(1, parent.clientHeight);
    const h = height();
    const size = Math.ceil(Math.hypot(settings.width, h) * 1.16 + 2 * (36 + settings.curlRadius));
    if (size !== view.size || view.ratio !== view.density) {
      view.size = size;
      view.density = view.ratio;
      root.style.width = size + "px";
      root.style.height = size + "px";
      canvas.width = Math.round(size * view.ratio);
      canvas.height = Math.round(size * view.ratio);
    }
    hit.style.width = settings.width + "px";
    hit.style.height = h + "px";
    if (!state.placed && !(state.press && state.press.floating) && parent.clientWidth > 0) {
      state.x = bounds.width / 2;
      state.y = bounds.height / 2;
      state.light = { x: state.x - settings.width * 0.45, y: state.y - h * 0.9, z: LIGHT_HEIGHT * 1.6 };
      state.placed = true;
    }
    if (!state.press || !state.press.floating) confine();
  };

  const reach = () => {
    const angle = settings.rotate + state.swing;
    const grow = 1 + 0.07 * Math.max(0, state.lift);
    const w = (settings.width / 2) * grow;
    const h = (height() / 2) * grow;
    const c = Math.abs(Math.cos(angle));
    const sn = Math.abs(Math.sin(angle));
    return { x: w * c + h * sn, y: w * sn + h * c };
  };

  const confine = () => {
    if (!settings.contain) return;
    const half = reach();
    const minX = Math.min(half.x, bounds.width / 2);
    const maxX = Math.max(bounds.width - half.x, bounds.width / 2);
    const minY = Math.min(half.y, bounds.height / 2);
    const maxY = Math.max(bounds.height - half.y, bounds.height / 2);
    if (state.x < minX) {
      state.x = minX;
      if (state.vx < 0) state.vx = -state.vx * settings.bounce;
    } else if (state.x > maxX) {
      state.x = maxX;
      if (state.vx > 0) state.vx = -state.vx * settings.bounce;
    }
    if (state.y < minY) {
      state.y = minY;
      if (state.vy < 0) state.vy = -state.vy * settings.bounce;
    } else if (state.y > maxY) {
      state.y = maxY;
      if (state.vy > 0) state.vy = -state.vy * settings.bounce;
    }
  };

  const toParent = (event) => {
    if (state.press && state.press.floating) return { x: event.clientX, y: event.clientY };
    const rect = parent.getBoundingClientRect();
    return {
      x: event.clientX - rect.left - parent.clientLeft,
      y: event.clientY - rect.top - parent.clientTop,
    };
  };

  const toLocal = (point) => {
    const angle = -(settings.rotate + state.swing);
    const scale = 1 + 0.07 * Math.max(0, state.lift);
    const dx = point.x - state.x;
    const dy = point.y - state.y;
    return {
      x: (Math.cos(angle) * dx - Math.sin(angle) * dy) / scale,
      y: (Math.sin(angle) * dx + Math.cos(angle) * dy) / scale,
    };
  };

  const solid = (local) => {
    if (!sticker.mask) return false;
    const mx = Math.floor((local.x / settings.width + 0.5) * sticker.maskW);
    const my = Math.floor((local.y / height() + 0.5) * sticker.maskH);
    if (mx < 0 || my < 0 || mx >= sticker.maskW || my >= sticker.maskH) return false;
    return sticker.mask[my * sticker.maskW + mx] > 100;
  };

  const draw = () => {
    const size = view.size;
    root.style.transform = "translate3d(" + (state.x - size / 2) + "px, " + (state.y - size / 2) + "px, 0)";
    const angle = settings.rotate + state.swing;
    const scale = 1 + 0.07 * Math.max(0, state.lift);
    hit.style.transform = "translate(-50%, -50%) rotate(" + angle + "rad) scale(" + scale + ")";
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!sticker.ready) return;
    const w = settings.width;
    const h = height();
    const dx = -Math.sin(state.dir);
    const dy = Math.cos(state.dir);
    const [start, end] = extentAlong(dx, dy);
    const peel = clamp(state.peel, 0, 1);
    const fold = start + peel * (end - start);
    const lift = Math.max(0, state.lift);
    const center = size / 2;
    const count = GRID * GRID * 6;
    const peeled = peel > 0.001;
    gl.useProgram(program.program);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(u.uImage, 0);
    gl.uniform2f(u.uCanvas, size, size);
    gl.uniform2f(u.uMesh, w * sticker.meshX, h * sticker.meshY);
    gl.uniform2f(u.uCenter, center, center);
    gl.uniform2f(u.uDir, dx, dy);
    gl.uniform1f(u.uFold, fold);
    gl.uniform1f(u.uRadius, settings.curlRadius);
    gl.uniform1f(u.uAngle, angle);
    gl.uniform1f(u.uScale, scale);
    gl.uniform1f(u.uLift, lift * 26);
    gl.uniform2f(u.uShadowOffset, 1.2, 2.4);
    gl.uniform2f(u.uShadowSlope, 0.28, 0.55);
    gl.uniform1i(u.uFinish, settings.finish);
    gl.uniform3fv(u.uBack, parse(settings.backColor));
    gl.uniform3f(u.uLight, state.light.x - (state.x - center), state.light.y - (state.y - center), state.light.z);
    gl.uniform1f(u.uShine, settings.lighting);
    gl.uniform1f(u.uShadow, settings.shadow * 0.55);
    const lodBase = settings.pixelated ? 1 : sticker.texel / (w * sticker.meshX);
    gl.uniform1f(u.uTexel, settings.pixelated ? 1 : sticker.texel / (w * sticker.meshX));
    gl.uniform1f(u.uLod, settings.pixelated ? 0 : Math.max(0, Math.log2(lodBase / (scale * view.ratio))));
    const glint = toLocal(state.light);
    gl.uniform2f(u.uGlint, glint.x / (w * sticker.meshX) + 0.5, glint.y / (h * sticker.meshY) + 0.5);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1i(u.uPass, 1);
    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
    if (peeled) {
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.uniform1i(u.uPass, 3);
      gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
      gl.disable(gl.DEPTH_TEST);
    }
  };

  const frame = (now) => {
    raf = 0;
    if (document.hidden) return;
    if (!visible && !state.press) return;
    const dt = last ? clamp((now - last) / 1000, 0.001, 1 / 30) : 1 / 60;
    last = now;
    if (settings.imageSrc !== loadedSrc) load(settings.imageSrc);
    const h = height();
    if (state.intro < 1 && sticker.ready) state.intro = Math.min(1, state.intro + dt / 1.1);
    const press = state.press;
    const drag = press && press.moving ? press : null;
    if (drag) {
      const target = drag.pointer;
      const prev = drag.pivot;
      const smoothing = 1 - Math.exp(-dt / 0.045);
      const vx = state.pivotV.x + ((target.x - prev.x) / dt - state.pivotV.x) * smoothing;
      const vy = state.pivotV.y + ((target.y - prev.y) / dt - state.pivotV.y) * smoothing;
      const ax = (vx - state.pivotV.x) / dt;
      const ay = (vy - state.pivotV.y) / dt;
      state.pivotV.x = vx;
      state.pivotV.y = vy;
      drag.pivot = { x: target.x, y: target.y };
      const angle = settings.rotate + state.swing;
      const rx = -(Math.cos(angle) * drag.grab.x - Math.sin(angle) * drag.grab.y);
      const ry = -(Math.sin(angle) * drag.grab.x + Math.cos(angle) * drag.grab.y);
      const inertia = (settings.width * settings.width + h * h) / 12 + rx * rx + ry * ry;
      const torque = (rx * -clamp(ay, -24000, 24000) - ry * -clamp(ax, -24000, 24000)) / inertia;
      const omega = 2 * Math.PI * 1.5;
      state.swingV += (torque * 1.1 * settings.swing - omega * omega * state.swing - 2 * 0.45 * omega * state.swingV) * dt;
      state.swing = clamp(state.swing + state.swingV * dt, -1.2, 1.2);
      const turned = settings.rotate + state.swing;
      const grip = 1 + 0.07 * Math.max(0, state.lift);
      state.x = target.x - (Math.cos(turned) * drag.grab.x - Math.sin(turned) * drag.grab.y) * grip;
      state.y = target.y - (Math.sin(turned) * drag.grab.x + Math.cos(turned) * drag.grab.y) * grip;
      if (settings.contain) confine();
    } else {
      spring(state, "swing", 0, 1.4, 0.32, dt);
      const decay = Math.exp(-dt * (1.5 + 9 * settings.friction));
      state.vx *= decay;
      state.vy *= decay;
      if (Math.hypot(state.vx, state.vy) < 4) {
        state.vx = 0;
        state.vy = 0;
      }
      state.x += state.vx * dt;
      state.y += state.vy * dt;
      if (settings.contain) confine();
    }
    const introHold = state.intro < 0.2;
    const peelTarget = introHold ? 0.3 : press ? settings.activePeel : state.hover ? settings.hoverPeel : 0;
    spring(state, "peel", peelTarget, press || state.hover ? 3 : 3.6, press || state.hover ? 0.7 : 0.62, dt);
    spring(state, "lift", drag ? 1 : 0, 3.2, 0.55, dt);
    let dirTarget = settings.peelDirection;
    if (press && Math.hypot(press.grab.x, press.grab.y) > Math.min(settings.width, h) * 0.12) {
      dirTarget = Math.atan2(press.grab.x, -press.grab.y);
    } else if (settings.followPointer && state.hover && Math.hypot(state.local.x, state.local.y) > Math.min(settings.width, h) * 0.12) {
      dirTarget = Math.atan2(state.local.x, -state.local.y);
    }
    if (!introHold) state.dir += wrapAngle(dirTarget - state.dir) * (1 - Math.exp(-dt / 0.12));
    const lightTarget = state.pointer.inside
      ? { x: state.pointer.x, y: state.pointer.y, z: LIGHT_HEIGHT }
      : { x: state.x - settings.width * 0.45, y: state.y - h * 0.9, z: LIGHT_HEIGHT * 1.6 };
    const follow = 1 - Math.exp(-dt / 0.08);
    state.light.x += (lightTarget.x - state.light.x) * follow;
    state.light.y += (lightTarget.y - state.light.y) * follow;
    state.light.z += (lightTarget.z - state.light.z) * follow;
    canvas.style.opacity = String(clamp(state.intro / 0.12, 0, 1));
    draw();
    const moving =
      (state.intro < 1 && sticker.ready) ||
      press ||
      Math.abs(state.peel - peelTarget) > 0.0005 ||
      Math.abs(state.peelV) > 0.0005 ||
      Math.abs(state.lift - (drag ? 1 : 0)) > 0.0005 ||
      Math.abs(state.liftV) > 0.0005 ||
      Math.abs(state.swing) > 0.0005 ||
      Math.abs(state.swingV) > 0.0005 ||
      state.vx !== 0 ||
      state.vy !== 0 ||
      Math.abs(wrapAngle(dirTarget - state.dir)) > 0.002 ||
      Math.hypot(lightTarget.x - state.light.x, lightTarget.y - state.light.y, lightTarget.z - state.light.z) > 0.5;
    if (moving) raf = requestAnimationFrame(frame);
    else last = 0;
  };

  function wake() {
    if (!raf && !document.hidden && (visible || state.press)) raf = requestAnimationFrame(frame);
  }

  const dock = () => {
    if (parent.isConnected && root.parentElement !== parent) parent.append(root);
    root.style.position = "";
    root.style.zIndex = "";
    root.style.left = "";
    root.style.top = "";
    state.vx = 0;
    state.vy = 0;
    state.swing = 0;
    state.swingV = 0;
    state.placed = false;
    layout();
    wake();
  };

  const liftOff = (press) => {
    if (press.floating || settings.contain) return;
    const rect = parent.getBoundingClientRect();
    const dx = rect.left + parent.clientLeft;
    const dy = rect.top + parent.clientTop;
    state.x += dx;
    state.y += dy;
    state.light.x += dx;
    state.light.y += dy;
    press.pointer = { x: press.pointer.x + dx, y: press.pointer.y + dy };
    press.pivot = { x: press.pivot.x + dx, y: press.pivot.y + dy };
    press.origin = { x: press.origin.x + dx, y: press.origin.y + dy };
    press.samples.forEach((sample) => {
      sample.x += dx;
      sample.y += dy;
    });
    press.floating = true;
    document.body.append(root);
    root.style.position = "fixed";
    root.style.left = "0";
    root.style.top = "0";
    stack += 1;
    root.style.zIndex = String(1000 + stack);
  };

  const updateHover = (event) => {
    const point = toParent(event);
    state.local = toLocal(point);
    const over = solid(state.local);
    if (over !== state.hover) state.hover = over;
    hit.style.cursor = over && settings.draggable ? (state.press ? "grabbing" : "grab") : "";
  };

  const onPointerMove = (event) => {
    const point = toParent(event);
    state.pointer.x = point.x;
    state.pointer.y = point.y;
    state.pointer.inside = true;
    wake();
  };

  const followPress = (press, event) => {
    const point = toParent(event);
    press.pointer = point;
    if (!press.moving && Math.hypot(point.x - press.origin.x, point.y - press.origin.y) > 3) {
      press.moving = settings.draggable;
      if (press.moving) liftOff(press);
    }
    press.samples.push({ x: point.x, y: point.y, t: performance.now() });
    if (press.samples.length > 8) press.samples.shift();
  };

  const endPress = (event) => {
    const press = state.press;
    if (!press || press.id !== event.pointerId) return;
    const floating = press.floating;
    const distance = Math.hypot(event.clientX - press.clientX, event.clientY - press.clientY);
    state.press = null;
    untrack();
    if (hit.hasPointerCapture?.(event.pointerId)) hit.releasePointerCapture(event.pointerId);
    state.hover = false;
    hit.style.cursor = "";
    if (floating) {
      settings.onRelease?.({ clientX: event.clientX, clientY: event.clientY, distance });
      dock();
    }
    wake();
  };

  let tracking = false;
  const onDragMove = (event) => {
    const press = state.press;
    if (!press || press.id !== event.pointerId) return;
    followPress(press, event);
    wake();
  };
  const track = () => {
    if (tracking) return;
    tracking = true;
    window.addEventListener("pointermove", onDragMove, true);
    window.addEventListener("pointerup", endPress, true);
    window.addEventListener("pointercancel", endPress, true);
  };
  const untrack = () => {
    if (!tracking) return;
    tracking = false;
    window.removeEventListener("pointermove", onDragMove, true);
    window.removeEventListener("pointerup", endPress, true);
    window.removeEventListener("pointercancel", endPress, true);
  };

  const onHitMove = (event) => {
    if (state.press) return;
    updateHover(event);
    wake();
  };

  const onHitLeave = () => {
    if (state.press) return;
    state.hover = false;
    hit.style.cursor = "";
    wake();
  };

  const onHitDown = (event) => {
    if (event.button !== 0 || !sticker.ready) return;
    updateHover(event);
    if (!state.hover) return;
    const point = toParent(event);
    state.press = {
      id: event.pointerId,
      grab: toLocal(point),
      origin: point,
      pointer: point,
      pivot: point,
      moving: false,
      floating: false,
      samples: [],
      clientX: event.clientX,
      clientY: event.clientY,
    };
    state.pivotV = { x: 0, y: 0 };
    state.vx = 0;
    state.vy = 0;
    hit.setPointerCapture?.(event.pointerId);
    if (settings.draggable) hit.style.cursor = "grabbing";
    track();
    event.preventDefault();
    wake();
  };

  const onHitUp = (event) => {
    endPress(event);
  };

  const onLeaveWindow = () => {
    state.pointer.inside = false;
    wake();
  };

  const onVisibility = () => {
    last = 0;
    wake();
  };

  const resizeObserver = new ResizeObserver(() => {
    layout();
    wake();
  });
  resizeObserver.observe(parent);
  const intersection = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) {
      last = 0;
      wake();
    }
  });
  intersection.observe(parent);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeaveWindow);
  document.addEventListener("visibilitychange", onVisibility);
  hit.addEventListener("pointermove", onHitMove);
  hit.addEventListener("pointerleave", onHitLeave);
  hit.addEventListener("pointerdown", onHitDown);
  hit.addEventListener("pointerup", onHitUp);
  hit.addEventListener("pointercancel", onHitUp);
  load(settings.imageSrc);
  layout();
  wake();

  return {
    setWidth(width) {
      settings.width = Math.max(16, width);
      if (!state.press || !state.press.floating) state.placed = false;
      layout();
      wake();
    },
    isDragging() {
      return Boolean(state.press);
    },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersection.disconnect();
      untrack();
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
      document.removeEventListener("visibilitychange", onVisibility);
      root.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

window.createStickerPeel = createStickerPeel;
