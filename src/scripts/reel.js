export function initReels(root = document) {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.querySelectorAll('.rd-reel').forEach((reel) => {
    const vis = reel.querySelector('.rd-typed-vis');
    const rest = reel.querySelector('.rd-typed-rest');
    if (!vis || !rest) return;
    const msg = rest.textContent || '';
    const CYCLE = 5900;
    const START = 312;
    const END = 1480;
    const RESET = 5400;
    const raw = [];
    let total = 0;
    for (let i = 0; i < msg.length; i++) {
      const prev = i ? msg[i - 1] : '';
      let d = 1;
      if (/[,.!?]/.test(prev)) d += 6.5;
      else if (prev === ' ') d += 0.8;
      d += ((i * 7919) % 11) / 20 - 0.25;
      raw.push(d);
      total += d;
    }
    const times = [];
    let t = START;
    raw.forEach((d) => {
      t += (d / total) * (END - START);
      times.push(t);
    });
    const show = (n) => {
      vis.textContent = msg.slice(0, n);
      rest.textContent = msg.slice(n);
    };
    let raf = 0;
    let t0 = -1;
    let shown = 0;
    const frame = (now) => {
      if (t0 < 0) t0 = now;
      const elapsed = (now - t0) % CYCLE;
      let n = 0;
      if (elapsed < RESET) while (n < times.length && times[n] <= elapsed) n++;
      if (n !== shown) {
        shown = n;
        show(n);
      }
      raf = requestAnimationFrame(frame);
    };
    const skySvg = reel.querySelector('.rd-sky svg');
    if (skySvg && skySvg.pauseAnimations) skySvg.pauseAnimations();
    const play = () => {
      if (raf || still.matches) return;
      reel.classList.add('is-playing');
      t0 = -1;
      raf = requestAnimationFrame(frame);
      if (skySvg && skySvg.unpauseAnimations) skySvg.unpauseAnimations();
    };
    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
      reel.classList.remove('is-playing');
      shown = 0;
      show(0);
      if (skySvg && skySvg.pauseAnimations) skySvg.pauseAnimations();
    };
    if (reel.dataset.trigger === 'manual') {
      reel.addEventListener('rd-reel:play', play);
      reel.addEventListener('rd-reel:stop', stop);
    } else {
      const host = reel.closest('.work-card') || reel;
      host.addEventListener('mouseenter', play);
      host.addEventListener('mouseleave', stop);
    }
    const slot = reel.querySelector('.rd-post-slot');
    const pill = reel.querySelector('.rd-post');
    const measure = () => {
      if (slot && pill) slot.style.setProperty('--rd-pill-w', `${pill.offsetWidth}px`);
    };
    measure();
    document.fonts?.ready.then(measure);
  });
}
