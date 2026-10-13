// Auto-toggle expand/collapse demo
    (function () {
      var toggle = document.querySelector('.cs-demo-toggle');
      if (!toggle || !('IntersectionObserver' in window)) return;
      var collapsed = toggle.querySelector('.cs-demo-frame--collapsed');
      var expanded = toggle.querySelector('.cs-demo-frame--expanded');
      if (!collapsed || !expanded) return;

      function setHeight() {
        var isExp = toggle.classList.contains('is-expanded');
        var target = isExp ? expanded : collapsed;
        toggle.style.height = target.naturalHeight * (toggle.offsetWidth / target.naturalWidth) + 'px';
      }

      // Set initial height once images load
      var loaded = 0;
      function onLoad() {
        loaded++;
        if (loaded >= 2) setHeight();
      }
      if (collapsed.complete) onLoad(); else collapsed.addEventListener('load', onLoad);
      if (expanded.complete) onLoad(); else expanded.addEventListener('load', onLoad);

      toggle.addEventListener('click', function () {
        toggle.classList.toggle('is-expanded');
        setHeight();
      });

      // Auto-expand on first scroll into view
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setTimeout(function () {
              toggle.classList.add('is-expanded');
              setHeight();
            }, 400);
            io.unobserve(toggle);
          }
        });
      }, { threshold: 0.3 });
      io.observe(toggle);
    })();

    // Hierarchy card — scanner + marker dynamically snap to each region/item while in view
    (function () {
      var el = document.querySelector('.cs-hier');
      if (!el) return;
      var regions = el.querySelectorAll('.cs-hier-region');
      var items = el.querySelectorAll('.cs-hier-item');
      var scanner = el.querySelector('.cs-hier-scanner');
      var marker = el.querySelector('.cs-hier-marker');
      if (!regions.length || !scanner || !marker) return;

      var idx = 0;
      var timer = null;
      var isHovered = false;
      var CYCLE_MS = 3800;

      function snap(i) {
        idx = i;
        regions.forEach(function (r, j) { r.classList.toggle('is-active', j === i); });
        items.forEach(function (it, j) { it.classList.toggle('is-active', j === i); });
        var r = regions[i];
        var it = items[i];
        if (r) {
          scanner.style.top = r.offsetTop + 'px';
          scanner.style.height = r.offsetHeight + 'px';
          scanner.style.opacity = '1';
        }
        if (it) {
          marker.style.top = it.offsetTop + 'px';
          marker.style.height = it.offsetHeight + 'px';
          marker.style.opacity = '1';
        }
      }

      function tick() {
        if (isHovered) return;
        snap((idx + 1) % regions.length);
      }

      function start() {
        if (timer) return;
        snap(idx);
        timer = setInterval(tick, CYCLE_MS);
      }
      function stop() {
        if (timer) { clearInterval(timer); timer = null; }
      }

      // Hover: pause auto-cycle and snap to the hovered layer
      el.addEventListener('mouseenter', function () { isHovered = true; });
      el.addEventListener('mouseleave', function () { isHovered = false; });
      regions.forEach(function (r, j) {
        r.addEventListener('mouseenter', function () { snap(j); });
      });
      items.forEach(function (it, j) {
        it.addEventListener('mouseenter', function () { snap(j); });
      });

      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) { snap(0); return; }

      if (!('IntersectionObserver' in window)) { snap(0); return; }

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) start(); else stop();
        });
      }, { threshold: 0.3 });
      io.observe(el);

      window.addEventListener('resize', function () {
        if (timer !== null) snap(idx);
      });
    })();

    // Before/After tab toggle
    (function () {
      document.querySelectorAll('.cs-ba-frame').forEach(function (frame) {
        var tabs = frame.querySelectorAll('.cs-ba-tab');
        tabs.forEach(function (tab) {
          tab.addEventListener('click', function () {
            // Query at click time: the video may have been swapped for its
            // animated-image fallback after load
            var after = frame.querySelector('.cs-ba-media--after');
            var before = frame.querySelector('.cs-ba-media--before');
            tabs.forEach(function (t) { t.classList.remove('is-active'); });
            tab.classList.add('is-active');
            var which = tab.dataset.ba;
            if (which === 'after') {
              after.classList.add('is-active');
              before.classList.remove('is-active');
              if (after.play) after.play();
            } else {
              before.classList.add('is-active');
              after.classList.remove('is-active');
              if (after.pause) after.pause();
            }
          });
        });
      });
    })();

    // Background timeline: left-to-right progression, single active node
    (function () {
      var el = document.querySelector('.cs-timeline');
      if (!el) return;
      var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (reduceMotion.matches) { el.classList.add('is-running'); return; }
      if (!('IntersectionObserver' in window)) { el.classList.add('is-running'); return; }

      var nodes = el.querySelectorAll('.cs-timeline-node');
      // Fire 300ms early so 0.4s dot transition completes right as the line arrives
      var nodeTimings = [0, 400, 1200, 1800];
      // Brief glow on last node before settling to solid blue finished state
      var lastPassTime = 2300;

      var isRunning = false;
      var timeouts = [];

      function clearAll() {
        timeouts.forEach(function (t) { clearTimeout(t); });
        timeouts = [];
      }

      function runCycle() {
        if (!isRunning) return;
        nodes.forEach(function (n) { n.removeAttribute('data-state'); });

        nodeTimings.forEach(function (t, i) {
          timeouts.push(setTimeout(function () {
            if (i > 0) nodes[i - 1].dataset.state = 'passed';
            nodes[i].dataset.state = 'current';
          }, t));
        });

        timeouts.push(setTimeout(function () {
          nodes[nodes.length - 1].dataset.state = 'passed';
        }, lastPassTime));
      }

      function start() {
        if (isRunning) return;
        isRunning = true;
        el.classList.add('is-running');
        runCycle();
      }
      function stop() {
        isRunning = false;
        clearAll();
        el.classList.remove('is-running');
        nodes.forEach(function (n) { n.removeAttribute('data-state'); });
      }

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) start();
          else stop();
        });
      }, { threshold: 0.3 });
      io.observe(el);
    })();

    // Count-up animation for stat numbers on scroll-in
    (function () {
      var els = document.querySelectorAll('[data-count-to]');
      if (!els.length || !('IntersectionObserver' in window)) return;
      function format(n) { return Math.round(n).toLocaleString('en-US'); }
      function animate(el) {
        var target = parseInt(el.dataset.countTo, 10) || 0;
        var suffix = el.dataset.countSuffix || '';
        var prefix = el.dataset.countPrefix || '';
        var duration = 900;
        var start = null;
        function tick(ts) {
          if (start === null) start = ts;
          var progress = Math.min((ts - start) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = prefix + format(target * eased) + suffix;
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { animate(entry.target); io.unobserve(entry.target); }
        });
      }, { threshold: 0.3 });
      els.forEach(function (el) {
        var prefix = el.dataset.countPrefix || '';
        var suffix = el.dataset.countSuffix || '';
        el.textContent = prefix + '0' + suffix;
        io.observe(el);
      });
    })();

    // Audit image swap: hover previews, click locks selection
    (function () {
      var items = document.querySelectorAll('.cs-audit-item');
      var images = document.querySelectorAll('.cs-audit-img[data-audit]');
      if (!items.length) return;

      var locked = '1';

      showImage('1');
      updateSelected();

      function showImage(id) {
        images.forEach(function (img) {
          img.classList.toggle('is-visible', img.dataset.audit === id);
        });
      }

      function updateSelected() {
        items.forEach(function (item) {
          item.classList.toggle('is-active', item.dataset.audit === locked);
        });
      }

      items.forEach(function (item) {
        item.addEventListener('mouseenter', function () {
          showImage(item.dataset.audit);
          item.classList.add('is-hovered');
        });
        item.addEventListener('mouseleave', function () {
          showImage(locked);
          item.classList.remove('is-hovered');
        });
        item.addEventListener('click', function () {
          locked = item.dataset.audit;
          showImage(locked);
          updateSelected();
        });
      });

      // Start with first card selected
      showImage(locked);
      updateSelected();
    })();

    // Checkmark draw-in animation on scroll-in
    (function () {
      var checks = document.querySelectorAll('.cs-stat-check');
      if (!checks.length || !('IntersectionObserver' in window)) return;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-drawn');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      checks.forEach(function (el) { io.observe(el); });
    })();

    // Active-section highlighting for sidenav
    (function () {
      var links = document.querySelectorAll('.cs-side-link');
      if (!links.length || !('IntersectionObserver' in window)) return;

      var linkByTarget = {};
      links.forEach(function (l) { linkByTarget[l.dataset.target] = l; });

      var allSections = Object.keys(linkByTarget).map(function (id) {
        return document.getElementById(id);
      }).filter(Boolean);

      var lockUntil = 0;

      function setActive(targetId) {
        links.forEach(function (l) { l.classList.remove('is-active'); });
        allSections.forEach(function (s) { s.classList.remove('is-active'); });
        var link = linkByTarget[targetId];
        var section = document.getElementById(targetId);
        if (link) link.classList.add('is-active');
        if (section) section.classList.add('is-active');
      }

      function updateActive() {
        if (Date.now() < lockUntil) return;
        var triggerY = window.innerHeight * 0.65;
        var activeId = null;
        for (var i = 0; i < allSections.length; i++) {
          if (allSections[i].getBoundingClientRect().top <= triggerY) {
            activeId = allSections[i].id;
          }
        }
        if (!activeId && allSections.length) activeId = allSections[0].id;
        if (activeId) setActive(activeId);
      }
      window.addEventListener('scroll', updateActive, { passive: true });
      window.addEventListener('resize', updateActive);
      updateActive();

      function releaseLock() {
        lockUntil = 0;
        window.removeEventListener('wheel', releaseLock);
        window.removeEventListener('touchmove', releaseLock);
        window.removeEventListener('keydown', releaseLock);
      }

      links.forEach(function (link) {
        link.addEventListener('click', function () {
          var targetId = link.dataset.target;
          setActive(targetId);
          lockUntil = Date.now() + 1200;
          window.addEventListener('wheel', releaseLock, { passive: true });
          window.addEventListener('touchmove', releaseLock, { passive: true });
          window.addEventListener('keydown', releaseLock);
        });
      });

    })();

    // Breakpoint devices: auto-preview scroll on first view to signal affordance
    (function () {
      var container = document.querySelector('.cs-breakpoints');
      if (!container || !('IntersectionObserver' in window)) return;
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) return;
      var screens = container.querySelectorAll('.cs-bp-screen');
      if (!screens.length) return;

      // Continuous peek: scrollTop follows sin(π·t), giving a smooth 0 → peak → 0 arc
      // with no turnaround snap. Slow easing at start and end via sine.
      function animatePeek(el, distance, duration) {
        el.classList.add('is-previewing');
        var start = null;
        function step(ts) {
          if (start === null) start = ts;
          var progress = Math.min((ts - start) / duration, 1);
          // Ease the time itself (easeInOutCubic) then map through sine wave
          // for extra smoothness at both ends and around the peak.
          var eased = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
          el.scrollTop = distance * Math.sin(eased * Math.PI);
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            el.classList.remove('is-previewing');
          }
        }
        requestAnimationFrame(step);
      }

      var DURATION = 3400;

      function firePeek() {
        screens.forEach(function (screen) {
          // Dynamic peak: 45% of the visible screen height, capped for taste.
          var distance = Math.max(70, Math.min(160, screen.clientHeight * 0.45));
          animatePeek(screen, distance, DURATION);
        });
      }

      function whenReady(cb) {
        var imgs = container.querySelectorAll('img');
        var pending = 0;
        imgs.forEach(function (img) {
          if (!img.complete) {
            pending++;
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          }
        });
        if (pending === 0) { cb(); return; }
        function done() {
          pending--;
          if (pending === 0) cb();
        }
      }

      // Refire every time devices re-enter view; guard against restacking while animating
      var animating = false;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || animating) return;
          animating = true;
          whenReady(function () {
            firePeek();
            setTimeout(function () { animating = false; }, DURATION + 200);
          });
        });
      }, { threshold: 0.25 });
      io.observe(container);
    })();

    // Breakpoint devices: click-and-drag to scroll (mouse only; touch uses native)
    (function () {
      var screens = document.querySelectorAll('.cs-bp-screen');
      if (!screens.length) return;

      screens.forEach(function (screen) {
        var dragging = false;
        var startY = 0;
        var startTop = 0;
        var pointerId = null;

        screen.addEventListener('pointerdown', function (e) {
          if (e.pointerType !== 'mouse') return;
          dragging = true;
          startY = e.clientY;
          startTop = screen.scrollTop;
          pointerId = e.pointerId;
          try { screen.setPointerCapture(pointerId); } catch (err) {}
          screen.classList.add('is-dragging');
        });

        screen.addEventListener('pointermove', function (e) {
          if (!dragging || e.pointerId !== pointerId) return;
          screen.scrollTop = startTop - (e.clientY - startY);
        });

        function end(e) {
          if (!dragging) return;
          dragging = false;
          if (pointerId !== null) {
            try { screen.releasePointerCapture(pointerId); } catch (err) {}
          }
          pointerId = null;
          screen.classList.remove('is-dragging');
        }

        screen.addEventListener('pointerup', end);
        screen.addEventListener('pointercancel', end);
      });
    })();

// Replay: the frosted button in the centre of each demo restarts its clip. On touch
    // there is no hover, so a tap on the media shows the button for a moment first
    (function () {
      document.querySelectorAll('.cs-ba-content').forEach(function (scope) {
        var btn = scope.querySelector('.cs-replay-btn');
        var hideTimer;
        if (!btn) return;
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var video = scope.querySelector('video');   // at click time: it may have been swapped for its fallback image
          if (!video) return;
          video.currentTime = 0;
          var p = video.play();
          if (p && p.catch) p.catch(function () {});
          scope.classList.remove('is-shown');
          btn.blur();
        });
        scope.addEventListener('pointerdown', function (e) {
          if (e.pointerType !== 'touch' || btn.contains(e.target)) return;
          scope.classList.add('is-shown');
          clearTimeout(hideTimer);
          hideTimer = setTimeout(function () { scope.classList.remove('is-shown'); }, 2500);
        });
        // a tap anywhere outside the clip puts the dim away (as does pressing replay, above)
        document.addEventListener('pointerdown', function (e) {
          if (scope.contains(e.target)) return;
          clearTimeout(hideTimer);
          scope.classList.remove('is-shown');
        });
      });
    })();

    // Demo videos play only while in frame and fetch only as they near the viewport.
    // If playback is blocked (Low Power Mode, Data Saver), swap in an animated
    // WebP of the same clip — animated images are exempt from autoplay policies.
    (function () {
      function swapToFallback(v) {
        var src = v.getAttribute('data-fallback');
        // wide screens get the 960px encode where provided — the 720px
        // fallback reads fuzzy stretched across a desktop-width hero
        if (window.innerWidth >= 768 && v.getAttribute('data-fallback-lg')) {
          src = v.getAttribute('data-fallback-lg');
        }
        if (!src) return;
        var img = document.createElement('img');
        img.alt = '';
        img.className = v.className;
        if (v.getAttribute('style')) img.setAttribute('style', v.getAttribute('style'));
        // Astro scopes styles via data-astro-cid-* attributes; without them the
        // img matches no CSS and renders at natural size
        for (var i = 0; i < v.attributes.length; i++) {
          var a = v.attributes[i];
          if (a.name.indexOf('data-astro-') === 0) img.setAttribute(a.name, a.value);
        }
        // Download fully before swapping: an animated image set as src mid-download
        // plays its first loop at whatever pace the network delivers frames.
        // A data-poster still swaps in immediately so the box isn't blank meanwhile.
        var swapped = false;
        var poster = v.getAttribute('data-poster');
        if (poster) {
          img.src = poster;
          v.replaceWith(img);
          swapped = true;
        }
        fetch(src)
          .then(function (res) { return res.blob(); })
          .then(function (blob) {
            img.src = URL.createObjectURL(blob);
            if (!swapped) v.replaceWith(img);
          })
          .catch(function () {
            img.src = src;
            if (!swapped) v.replaceWith(img);
          });
      }
      function tryPlay(v) {
        if (v.dataset.hoverPaused) return; /* held by the pointer (see below): stays paused */
        var p = v.play();
        // AbortError = the play was interrupted (the clip scrolled out before it loaded, so
        // the in-frame observer paused it), not blocked: leave the video in place
        if (p && p.catch) p.catch(function (err) { if (err && err.name === 'AbortError') return; swapToFallback(v); });
      }
      // Play only while in frame: a clip starts once a quarter of it is visible and pauses
      // the moment it leaves, so nothing runs off-screen. A second, wider observer warms
      // each lazy file 400px ahead so it doesn't stall on entry.
      var lazy = document.querySelectorAll('video[data-lazy]');
      var vids = document.querySelectorAll('video[data-lazy], video[autoplay]');
      if (!vids.length) return;
      if (!('IntersectionObserver' in window)) { lazy.forEach(tryPlay); return; }
      var warm = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var v = entry.target;
          if (!entry.isIntersecting) return;
          warm.unobserve(v);
          if (!v.paused) return;               // already playing: don't reset it
          v.preload = 'auto';
          v.load();
        });
      }, { rootMargin: '400px 0px' });
      lazy.forEach(function (v) { warm.observe(v); });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var v = entry.target;
          if (entry.isIntersecting) tryPlay(v);
          else if (!v.paused) v.pause();
        });
      }, { threshold: 0.25 });
      vids.forEach(function (v) { io.observe(v); });
      // the old-interfaces strip (Background) holds still under the pointer so
      // a screen can be read; it picks up again when the pointer leaves, if
      // it's still in frame (hers). Hover devices only
      var strip = document.querySelector('.cs-oldui-video');
      if (strip && matchMedia('(hover: hover)').matches) {
        strip.addEventListener('mouseenter', function () { strip.dataset.hoverPaused = '1'; strip.pause(); });
        strip.addEventListener('mouseleave', function () {
          delete strip.dataset.hoverPaused;
          var r = strip.getBoundingClientRect();
          if (r.bottom > 0 && r.top < innerHeight) tryPlay(strip);
        });
      }
    })();
