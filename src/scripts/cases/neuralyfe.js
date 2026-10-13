// Count-up animation for stat numbers on scroll-in
    (function () {
      var els = document.querySelectorAll('[data-count-to]');
      if (!els.length || !('IntersectionObserver' in window)) return;

      function format(n) {
        return Math.round(n).toLocaleString('en-US');
      }
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
          if (entry.isIntersecting) {
            animate(entry.target);
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });

      els.forEach(function (el) {
        var prefix = el.dataset.countPrefix || '';
        var suffix = el.dataset.countSuffix || '';
        el.textContent = prefix + '0' + suffix;
        io.observe(el);
      });
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

// Lightbox for images with .cs-expandable
    (function () {
      // Inject styles directly to avoid Astro scoping issues
      var style = document.createElement('style');
      style.textContent = '.cs-expandable{cursor:zoom-in}.cs-lightbox{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;cursor:zoom-out;opacity:0;transition:opacity 0.2s ease;padding:40px}.cs-lightbox.is-visible{opacity:1}.cs-lightbox img{max-width:100%;max-height:100%;object-fit:contain;border-radius:8px}';
      document.head.appendChild(style);

      var overlay = null;

      function open(src, alt) {
        overlay = document.createElement('div');
        overlay.className = 'cs-lightbox';
        var img = document.createElement('img');
        img.src = src;
        img.alt = alt || '';
        overlay.appendChild(img);
        document.body.appendChild(overlay);
        requestAnimationFrame(function () {
          overlay.classList.add('is-visible');
        });
        overlay.addEventListener('click', close);
      }

      function close() {
        if (!overlay) return;
        overlay.classList.remove('is-visible');
        overlay.addEventListener('transitionend', function () {
          if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
          overlay = null;
        });
      }

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
      });

      document.addEventListener('click', function (e) {
        var img = e.target.closest('.cs-expandable');
        if (img) {
          e.preventDefault();
          open(img.src, img.alt);
        }
      });
    })();

// Replay: the frosted button in the centre of each demo restarts its clip. On touch
    // there is no hover, so a tap on the media shows the button for a moment first
    (function () {
      document.querySelectorAll('.cs-media').forEach(function (scope) {
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
        var p = v.play();
        // AbortError = the play was interrupted (the clip scrolled out before it loaded, so
        // the in-frame observer paused it), not blocked: leave the video in place
        if (p && p.catch) p.catch(function (err) { if (err && err.name === 'AbortError') return; swapToFallback(v); });
      }
      document.querySelectorAll('video[autoplay][data-fallback]').forEach(tryPlay);
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
      var reel = document.querySelector('.cs-hero-visual video');
      vids.forEach(function (v) { if (v !== reel) io.observe(v); });
      // The hero reel is fixed behind the page, so it always intersects the viewport and the
      // scroll body simply covers it. Watch the hero header instead: once it has scrolled
      // above the reel's top edge (60px), the body has covered the reel, so pause it
      var reelRef = document.querySelector('.cs-scroll-body .cs-hero');
      if (reel && reelRef) {
        var reelIo = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) tryPlay(reel);
            else if (!reel.paused) reel.pause();
          });
        }, { rootMargin: '-60px 0px 0px 0px' });
        reelIo.observe(reelRef);
      }
    })();
