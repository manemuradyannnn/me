(() => {
  const PERSPECTIVE = 1100;
  const TILT_MAX = 14;
  const HOVER_SCALE = 1.04;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const spring = (value, velocity, target, stiffness, damping, dt) => {
    const next = velocity + ((target - value) * stiffness - velocity * damping) * dt;
    return [value + next * dt, next];
  };

  function mountCard(root) {
    const rotor = root.querySelector(".holo-card__rotor");
    const shadow = root.querySelector(".holo-card__shadow");
    if (!rotor) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const pointer = { x: 0.5, y: 0.5, inside: false };
    const state = {
      tiltX: 0,
      tiltY: 0,
      tiltVX: 0,
      tiltVY: 0,
      lift: 1,
      liftV: 0,
      clock: Math.random() * 40,
    };
    let raf = 0;
    let last = 0;
    let visible = true;
    let calm = 0;

    const tick = (now) => {
      raf = 0;
      const dt = Math.min(1 / 30, Math.max(1 / 240, (now - last) / 1000));
      last = now;
      let targetX = 0;
      let targetY = 0;
      let lift = 1;
      const drifting = !reduce && !pointer.inside;
      if (pointer.inside && !reduce) {
        targetX = (0.5 - pointer.y) * 2 * TILT_MAX;
        targetY = (pointer.x - 0.5) * 2 * TILT_MAX;
        lift = HOVER_SCALE;
      } else if (drifting) {
        state.clock += dt;
        const t = state.clock;
        targetX = Math.sin(t * 0.7) * TILT_MAX * 0.28;
        targetY = Math.sin(t * 0.53 + 1.2) * TILT_MAX * 0.4;
      }
      const steps = Math.ceil(dt / (1 / 240));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        [state.tiltX, state.tiltVX] = spring(state.tiltX, state.tiltVX, targetX, 150, 16, h);
        [state.tiltY, state.tiltVY] = spring(state.tiltY, state.tiltVY, targetY, 150, 16, h);
        [state.lift, state.liftV] = spring(state.lift, state.liftV, lift, 320, 30, h);
      }
      rotor.style.transform = `perspective(${PERSPECTIVE}px) scale(${state.lift}) rotateX(${state.tiltX}deg) rotateY(${state.tiltY}deg)`;
      if (shadow) {
        shadow.style.transform = `translate(${-state.tiltY * 0.7}px, ${state.tiltX * 0.7}px) scale(${0.9 + (state.lift - 1) * 1.5})`;
      }
      const motion =
        Math.abs(state.tiltVX) +
        Math.abs(state.tiltVY) +
        Math.abs(state.liftV) * 40 +
        Math.abs(state.tiltX - targetX) +
        Math.abs(state.tiltY - targetY);
      calm = motion > 0.02 ? 0 : calm + dt;
      if (!visible || (!drifting && !pointer.inside && calm > 0.3)) return;
      raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (raf) return;
      calm = 0;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const track = (event) => {
      if (event.pointerType === "touch" && event.type === "pointermove" && !event.buttons) return;
      const rect = root.getBoundingClientRect();
      pointer.x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      pointer.y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      pointer.inside = true;
      wake();
    };

    const leave = () => {
      pointer.inside = false;
      wake();
    };

    root.addEventListener("pointerenter", track);
    root.addEventListener("pointermove", track);
    root.addEventListener("pointerdown", track);
    root.addEventListener("pointerleave", leave);
    root.addEventListener("pointercancel", leave);

    const visibility = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) wake();
    });
    visibility.observe(root);
    wake();
  }

  const card = document.querySelector("#sticker-photo");
  if (card) mountCard(card);
})();
