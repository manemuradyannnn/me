// Hero reel: fade in only after Reddit Sans is ready, so the text doesn't reflow
    // mid-fade (mirrors the homepage fonts-first pattern), then play the loop. It stops
    // (snapping back to rest) while the page content fully covers it: the smoke filter
    // repaints every frame, so there's no point running it out of sight.
    (function () {
      var hero = document.querySelector('.cs-hero-reel');
      if (!hero) return;
      var reel = hero.querySelector('.rd-reel');
      var body = document.querySelector('.cs-scroll-body');
      var FADE = 52;                   // the scroll body's masked top edge (.cs-scroll-body::before)
      var revealed = false, playing = false, queued = false;
      function sync() {
        queued = false;
        var covered = body && body.getBoundingClientRect().top + FADE <= hero.getBoundingClientRect().top;
        var want = revealed && !covered;
        if (!reel || want === playing) return;
        playing = want;
        reel.dispatchEvent(new Event(want ? 'rd-reel:play' : 'rd-reel:stop'));
      }
      function queue() { if (!queued) { queued = true; requestAnimationFrame(sync); } }
      window.addEventListener('scroll', queue, { passive: true });
      window.addEventListener('resize', queue);
      var reveal = function () { hero.classList.add('is-in'); revealed = true; sync(); };
      var fontsReady = document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();
      // Fallback so a slow font fetch can't hold the hero hostage
      Promise.race([
        fontsReady,
        new Promise(function (res) { setTimeout(res, 900); })
      ]).then(function () { requestAnimationFrame(reveal); });
    })();

    // Active-section highlighting for the sidenav
    (function () {
      var links = document.querySelectorAll('.cs-side-link');
      if (!links.length) return;

      var linkByTarget = {};
      links.forEach(function (l) { linkByTarget[l.dataset.target] = l; });
      var sections = Object.keys(linkByTarget).map(function (id) {
        return document.getElementById(id);
      }).filter(Boolean);

      var lockUntil = 0;

      function setActive(id) {
        links.forEach(function (l) { l.classList.remove('is-active'); });
        sections.forEach(function (s) { s.classList.remove('is-active'); });
        if (linkByTarget[id]) linkByTarget[id].classList.add('is-active');
        var section = document.getElementById(id);
        if (section) section.classList.add('is-active');
      }

      function updateActive() {
        if (Date.now() < lockUntil) return;
        var triggerY = window.innerHeight * 0.65;
        var activeId = null;
        for (var i = 0; i < sections.length; i++) {
          if (sections[i].getBoundingClientRect().top <= triggerY) {
            activeId = sections[i].id;
          }
        }
        if (!activeId && sections.length) activeId = sections[0].id;
        if (activeId) setActive(activeId);
      }

      links.forEach(function (l) {
        l.addEventListener('click', function () {
          // hold the clicked state while smooth-scroll travels
          lockUntil = Date.now() + 800;
          setActive(l.dataset.target);
        });
      });

      window.addEventListener('scroll', updateActive, { passive: true });
      window.addEventListener('resize', updateActive);
      updateActive();
    })();

    // The crowd: everyone starts orange; once the dots are well on screen the ninety lurkers
    // fade to grey, leaving the ten posters lit. On phones, where it sits below the
    // paragraph, it spans the full width: as many 7px columns as fit (the gap stretches a
    // touch so the last column lands on the edge), whole rows totalling about a hundred people,
    // and a tenth of them posters, rounded down so it always reads over 90% lurkers. Seeded,
    // so it's the same crowd on every visit. Wider screens keep the 10×10 in the markup
    (function () {
      var el = document.getElementById('crowd-stat');
      if (!el) return;
      var crowd = el.querySelector('.cs-crowd');
      var original = crowd.innerHTML, built = '', DOT = 7, GAP = 4;
      var narrow = window.matchMedia('(max-width: 680px)');
      function layout() {
        if (!narrow.matches) {
          if (built) { crowd.innerHTML = original; crowd.style.removeProperty('--crowd-cols'); crowd.style.removeProperty('--crowd-gap'); built = ''; }
          return;
        }
        var w = crowd.clientWidth;
        if (!w) return;
        var cols = Math.max(10, Math.floor((w + GAP) / (DOT + GAP)));
        var rows = Math.max(1, Math.round(100 / cols));
        crowd.style.setProperty('--crowd-cols', cols);
        crowd.style.setProperty('--crowd-gap', ((w - cols * DOT) / (cols - 1)).toFixed(3) + 'px');
        var key = cols + 'x' + rows;
        if (key === built) return;
        var total = cols * rows, posters = Math.floor(total / 10), seed = 90210;
        function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
        var on = {};
        for (var k = 0; k < posters; k++) {                 // one poster per stretch, so they scatter
          var from = k * total / posters, to = (k + 1) * total / posters;
          on[Math.floor(from + rand() * (to - from))] = true;
        }
        // clones of a markup dot, so each keeps Astro's scoping attribute and the .cs-crowd i
        // styles still reach it (a fresh <i> would render as nothing)
        var proto = crowd.firstElementChild.cloneNode(false), frag = document.createDocumentFragment();
        for (var i = 0; i < total; i++) {
          var dot = proto.cloneNode(false);
          dot.className = on[i] ? 'on' : '';
          dot.style.setProperty('--d', Math.floor(rand() * 100) * 14 + 'ms');
          frag.appendChild(dot);
        }
        crowd.replaceChildren(frag);
        built = key;
      }
      layout();
      var queued = false;
      window.addEventListener('resize', function () { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; layout(); }); } });
      function run() { el.classList.add('is-in'); }
      if (!('IntersectionObserver' in window)) { run(); return; }
      // watch the dots themselves, not the whole block: on phones the paragraph comes first,
      // so the block can be 40% in view before any dot is, and the fade would play unseen
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { run(); io.unobserve(crowd); } });
      }, { threshold: 0.75 });
      io.observe(crowd);
    })();

    // Replay: the frosted button in the centre of each walkthrough restarts its clip. On
    // touch there is no hover, so a tap on the screen shows the button for a moment first
    (function () {
      document.querySelectorAll('.cs-stage').forEach(function (stage) {
        var video = stage.querySelector('video');
        var btn = stage.querySelector('.cs-replay-btn');
        var hideTimer;
        if (!video || !btn) return;
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          video.currentTime = 0;
          var p = video.play();
          if (p && p.catch) p.catch(function () {});
          stage.classList.remove('is-shown');
          btn.blur();
        });
        stage.addEventListener('pointerdown', function (e) {
          if (e.pointerType !== 'touch' || btn.contains(e.target)) return;
          stage.classList.add('is-shown');
          clearTimeout(hideTimer);
          hideTimer = setTimeout(function () { stage.classList.remove('is-shown'); }, 2500);
        });
        // a tap anywhere outside the stage puts the dim away (as does pressing replay, above)
        document.addEventListener('pointerdown', function (e) {
          if (stage.contains(e.target)) return;
          clearTimeout(hideTimer);
          stage.classList.remove('is-shown');
        });
      });
    })();

    // Walkthrough clips: preload="none" so the page doesn't fetch four videos up front.
    // If autoplay is refused (Low Power Mode, data saver), show the controls so the clip
    // can be tapped to play.
    (function () {
      function tryPlay(v) {
        var p = v.play();
        // AbortError = the play was interrupted (the clip scrolled out before it loaded, so
        // the in-frame observer paused it), not blocked: no controls needed
        if (p && p.catch) p.catch(function (err) { if (err && err.name === 'AbortError') return; v.controls = true; });
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
    })();
