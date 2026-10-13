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
        var duration = 900;
        var start = null;
        function tick(ts) {
          if (start === null) start = ts;
          var progress = Math.min((ts - start) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = format(target * eased) + suffix;
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
        var suffix = el.dataset.countSuffix || '';
        el.textContent = '0' + suffix;
        io.observe(el);
      });
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
