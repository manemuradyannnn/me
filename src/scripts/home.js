import { initReels } from './reel.js';

const PANELS = ['welcome', 'works', 'profile', 'sidequests'];

function showPanel(name, { updateHash = true } = {}) {
  if (!PANELS.includes(name)) name = 'welcome';
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.panelId === name);
  });
  document.querySelectorAll('.folder-item, .dock-item[data-panel]').forEach((item) => {
    item.classList.toggle('active', item.dataset.panel === name);
  });
  const folderIcon = document.querySelector('.folder-icon--works');
  const dockIcon = document.querySelector('.dock-item[data-panel="works"] .dock-icon--img');
  [folderIcon, dockIcon].forEach((icon) => {
    if (!icon) return;
    const next = name === 'works' ? icon.dataset.iconOpen : icon.dataset.iconClosed;
    if (next) icon.setAttribute('src', next);
  });
  if (updateHash) {
    const next = name === 'welcome' ? ' ' : `#${name}`;
    if (name === 'welcome') history.replaceState(null, '', location.pathname);
    else if (location.hash !== `#${name}`) history.replaceState(null, '', next.trim());
  }
  window.scrollTo(0, 0);
  if (name === 'sidequests') layoutQuests();
  document.querySelectorAll('#panel-sidequests video').forEach((video) => {
    if (name === 'sidequests') video.play().catch(() => {});
    else video.pause();
  });
}

function initPanels() {
  document.querySelectorAll('[data-panel]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!button.dataset.panel) return;
      showPanel(button.dataset.panel);
    });
  });
  document.querySelectorAll('[data-panel-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      showPanel(link.dataset.panelLink);
    });
  });
  const fromHash = () => {
    const name = location.hash.replace('#', '');
    if (PANELS.includes(name)) showPanel(name, { updateHash: false });
  };
  window.addEventListener('hashchange', fromHash);
  fromHash();

  const works = document.querySelector('.folder-item[data-panel="works"]');
  if (works && !sessionStorage.getItem('hero-animated-bounce')) {
    sessionStorage.setItem('hero-animated-bounce', '1');
    setTimeout(() => works.classList.add('bouncing'), 1200);
    works.addEventListener('animationend', () => works.classList.remove('bouncing'), { once: true });
  }

  const tray = document.querySelector('.folder-nav-inner');
  tray?.addEventListener('pointermove', (event) => {
    const rect = tray.getBoundingClientRect();
    tray.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
    tray.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
  });

  const popup = document.getElementById('dock-links-popup');
  document.getElementById('dock-links')?.addEventListener('click', (event) => {
    event.stopPropagation();
    popup?.classList.toggle('is-open');
  });
  document.addEventListener('click', () => popup?.classList.remove('is-open'));

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  window.addEventListener('wheel', (event) => {
    if (reduced.matches || window.innerWidth < 900) return;
    const welcome = document.getElementById('panel-welcome')?.classList.contains('active');
    const onWorks = document.getElementById('panel-works')?.classList.contains('active');
    if (welcome && event.deltaY > 30) showPanel('works');
    if (onWorks && window.scrollY <= 0 && event.deltaY < -40) showPanel('welcome');
  }, { passive: true });
}

function initVideos() {
  document.querySelectorAll('.work-card').forEach((card) => {
    const video = card.querySelector('video');
    if (!video) return;
    card.addEventListener('mouseenter', () => video.play().catch(() => {}));
    card.addEventListener('mouseleave', () => {
      video.pause();
      video.currentTime = 0;
    });
  });
}

function initProfile() {
  const prints = document.getElementById('profile-prints');
  if (!prints) return;
  const which = (target) => target?.closest?.('.is-front') ? 'front' : target?.closest?.('.is-back') ? 'back' : null;
  const fine = window.matchMedia('(hover: hover)').matches;
  if (fine) {
    prints.addEventListener('mouseover', (event) => {
      const side = which(event.target);
      if (side) prints.dataset.front = side;
    });
    prints.addEventListener('mouseleave', () => { delete prints.dataset.front; });
  } else {
    prints.addEventListener('click', (event) => {
      const side = which(event.target);
      if (!side) return;
      if (prints.dataset.front === side) delete prints.dataset.front;
      else prints.dataset.front = side;
    });
  }
  document.querySelectorAll('.fact-wave').forEach((wave) => {
    const text = wave.textContent || '';
    wave.textContent = '';
    [...text].forEach((char) => {
      const span = document.createElement('span');
      span.className = 'fact-wave-letter';
      span.textContent = char === ' ' ? '\u00a0' : char;
      wave.append(span);
    });
  });
}

function layoutQuests() {
  const grid = document.getElementById('sq-gallery-grid');
  if (!grid) return;
  const tiles = [...grid.children];
  if (window.innerWidth <= 900) {
    tiles.forEach((tile) => { tile.style.gridRowEnd = ''; });
    return;
  }
  tiles.forEach((tile) => {
    tile.style.gridRowEnd = 'auto';
    const height = tile.getBoundingClientRect().height;
    if (height > 0) tile.style.gridRowEnd = `span ${Math.ceil(height) + 16}`;
  });
}

function initQuests() {
  const dataEl = document.getElementById('quest-data');
  const overlay = document.getElementById('sq-overlay');
  if (!dataEl || !overlay) return;
  const quests = JSON.parse(dataEl.textContent || '{}');
  const img = document.getElementById('sq-preview-img');
  const video = document.getElementById('sq-preview-video');
  const title = document.getElementById('sq-window-title');
  const name = document.getElementById('sq-info-name');
  const tools = document.getElementById('sq-info-tools');
  const desc = document.getElementById('sq-info-desc');
  const strip = document.getElementById('sq-gallery-strip');

  const close = () => {
    overlay.hidden = true;
    video.pause();
    video.removeAttribute('src');
  };

  const showSrc = (src) => {
    const isVideo = src.endsWith('.mp4');
    img.hidden = isVideo;
    video.hidden = !isVideo;
    if (isVideo) {
      video.src = src;
      video.play().catch(() => {});
    } else {
      video.pause();
      img.src = src;
    }
  };

  const open = (id) => {
    const quest = quests[id];
    if (!quest) return;
    title.textContent = quest.title;
    name.textContent = quest.name;
    tools.textContent = quest.tools || '';
    desc.innerHTML = quest.desc || '';
    showSrc(quest.src);
    strip.innerHTML = '';
    strip.hidden = !quest.gallery;
    (quest.gallery || []).forEach((src, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      if (index === 0) button.classList.add('is-on');
      const thumb = document.createElement('img');
      thumb.src = src;
      thumb.alt = '';
      button.append(thumb);
      button.addEventListener('click', () => {
        strip.querySelectorAll('button').forEach((item) => item.classList.remove('is-on'));
        button.classList.add('is-on');
        showSrc(src);
      });
      strip.append(button);
    });
    overlay.hidden = false;
  };

  document.querySelectorAll('.sq-tile[data-preview]').forEach((tile) => {
    tile.addEventListener('click', () => open(tile.dataset.preview));
  });
  document.getElementById('sq-close')?.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.hidden) close();
  });

  const grid = document.getElementById('sq-gallery-grid');
  if (grid) {
    layoutQuests();
    window.addEventListener('resize', layoutQuests);
    grid.querySelectorAll('img').forEach((image) => {
      if (!image.complete) image.addEventListener('load', layoutQuests, { once: true });
    });
    grid.querySelectorAll('video').forEach((videoEl) => {
      videoEl.addEventListener('loadedmetadata', layoutQuests, { once: true });
    });
  }
}

function initStickers() {
  const stage = document.getElementById('sq-board-stage');
  const sheet = document.getElementById('sq-board-sheet');
  const board = document.querySelector('.sq-board');
  if (!stage || !sheet || !board) return;
  const key = 'cindy-stickers';
  const defaults = [
    { key: 'bow', src: '/assets/stickers/bow_sticker.png', x: 0.62, y: 0.28, rot: 12 },
    { key: 'fish', src: '/assets/images/goldfish.png', x: 0.78, y: 0.62, rot: -8 },
  ];

  const read = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (Array.isArray(saved)) return saved;
    } catch { /* keep defaults */ }
    return defaults.map((item) => ({ ...item }));
  };

  let placed = read();
  const paint = () => {
    stage.innerHTML = '';
    placed.forEach((item, index) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'placed-sticker';
      node.style.left = `${item.x * 100}%`;
      node.style.top = `${item.y * 100}%`;
      node.style.transform = `rotate(${item.rot || 0}deg)`;
      const image = document.createElement('img');
      image.src = item.src;
      image.alt = '';
      image.draggable = false;
      node.append(image);
      node.addEventListener('pointerdown', (event) => startDrag(event, index, node));
      stage.append(node);
    });
  };

  const save = () => localStorage.setItem(key, JSON.stringify(placed));

  const startDrag = (event, index, node) => {
    event.preventDefault();
    node.setPointerCapture(event.pointerId);
    const move = (ev) => {
      const rect = stage.getBoundingClientRect();
      placed[index].x = Math.min(0.92, Math.max(0, (ev.clientX - rect.left) / rect.width));
      placed[index].y = Math.min(0.92, Math.max(0, (ev.clientY - rect.top) / rect.height));
      node.style.left = `${placed[index].x * 100}%`;
      node.style.top = `${placed[index].y * 100}%`;
    };
    const up = (ev) => {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      const sheetRect = sheet.getBoundingClientRect();
      const overSheet = ev.clientX >= sheetRect.left && ev.clientX <= sheetRect.right && ev.clientY >= sheetRect.top && ev.clientY <= sheetRect.bottom;
      if (overSheet) placed.splice(index, 1);
      save();
      paint();
    };
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', up);
  };

  sheet.querySelectorAll('.sq-board-choice').forEach((choice) => {
    choice.addEventListener('click', () => {
      placed.push({
        key: choice.dataset.key,
        src: choice.dataset.src,
        x: 0.42 + Math.random() * 0.2,
        y: 0.35 + Math.random() * 0.2,
        rot: Math.round((Math.random() - 0.5) * 24),
      });
      save();
      paint();
    });
  });

  document.getElementById('sq-board-reset')?.addEventListener('click', () => {
    placed = defaults.map((item) => ({ ...item }));
    save();
    paint();
    document.querySelectorAll('#sq-board-todo li').forEach((item, index) => {
      const done = index === 0;
      item.classList.toggle('is-done', done);
      item.setAttribute('aria-checked', done ? 'true' : 'false');
    });
    localStorage.removeItem('cindy-todos');
  });

  const todoKey = 'cindy-todos';
  const todoState = JSON.parse(localStorage.getItem(todoKey) || 'null');
  document.querySelectorAll('#sq-board-todo li').forEach((item, index) => {
    if (Array.isArray(todoState)) {
      const done = !!todoState[index];
      item.classList.toggle('is-done', done);
      item.setAttribute('aria-checked', done ? 'true' : 'false');
    }
    const toggle = () => {
      const done = item.getAttribute('aria-checked') !== 'true';
      item.classList.toggle('is-done', done);
      item.setAttribute('aria-checked', done ? 'true' : 'false');
      const next = [...document.querySelectorAll('#sq-board-todo li')].map((row) => row.classList.contains('is-done'));
      localStorage.setItem(todoKey, JSON.stringify(next));
    };
    item.addEventListener('click', toggle);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    });
  });

  paint();
}

initReels();
initPanels();
initVideos();
initProfile();
initQuests();
initStickers();
