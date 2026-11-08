/* Shed Photobooth — shared behaviour. No dependencies. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- header: solid once we leave the hero ---------- */
  var header = document.querySelector('.site-header');
  function onScrollHeader() {
    if (!header) return;
    header.classList.toggle('is-solid', window.scrollY > 40);
  }
  onScrollHeader();
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  /* ---------- mobile menu ---------- */
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('menu');
  var closeBtn = menu && menu.querySelector('.menu__close');
  var lastFocus = null;
  var menuBackground = Array.prototype.slice.call(document.querySelectorAll('body > header, body > main, body > footer'));
  function lockBackground(on) {
    menuBackground.forEach(function (el) { el.inert = on; });
  }
  function focusables() {
    return Array.prototype.slice.call(menu.querySelectorAll('a[href], button:not([disabled])'));
  }
  function openMenu() {
    lastFocus = document.activeElement;
    menu.removeAttribute('aria-hidden');
    lockBackground(true);
    menu.classList.add('is-open');
    document.body.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    setTimeout(function () { closeBtn.focus(); }, 30);
  }
  function closeMenu(restore) {
    menu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    lockBackground(false);
    if (restore !== false && lastFocus) lastFocus.focus();
  }
  if (toggle && menu) {
    menu.setAttribute('aria-hidden', 'true');
    toggle.addEventListener('click', function () { menu.removeAttribute('aria-hidden'); openMenu(); });
    closeBtn.addEventListener('click', function () { closeMenu(); menu.setAttribute('aria-hidden', 'true'); });
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeMenu(); menu.setAttribute('aria-hidden', 'true'); }
      if (e.key === 'Tab') {
        var f = focusables(), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    menu.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (!link) return;
      var dest = new URL(link.href, window.location.href);
      var samePage = dest.origin === window.location.origin && dest.pathname === window.location.pathname;
      closeMenu(false);
      if (samePage && dest.hash) {
        var target = document.getElementById(decodeURIComponent(dest.hash.slice(1)));
        if (target) {
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }
      } else if (samePage) {
        document.querySelector('.site-header .brand').focus({ preventScroll: true });
      }
      menu.setAttribute('aria-hidden', 'true');
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1250 && menu.classList.contains('is-open')) { closeMenu(false); document.querySelector('.site-header .brand').focus({ preventScroll: true }); menu.setAttribute('aria-hidden', 'true'); }
    });
  }

  /* ---------- parallax: a few layers only ---------- */
  var layers = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var ticking = false;
  function parallax() {
    ticking = false;
    var vh = window.innerHeight;
    layers.forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0;
      var offset = (r.top + r.height / 2 - vh / 2) * speed;
      el.style.transform = 'translate3d(0,' + (-offset).toFixed(1) + 'px,0)';
    });
  }
  if (layers.length && !reduce.matches) {
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
    parallax();
  }

  /* ---------- prints peel onto the table once ---------- */
  var peels = document.querySelectorAll('[data-peel]');
  if ('IntersectionObserver' in window) {
    var po = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); po.unobserve(en.target); } });
    }, { threshold: 0.15 });
    Array.prototype.forEach.call(peels, function (p) { po.observe(p); });
  } else {
    Array.prototype.forEach.call(peels, function (p) { p.classList.add('is-in'); });
  }

  /* ---------- clips: play only while on screen, never with reduced motion ---------- */
  var vids = Array.prototype.slice.call(document.querySelectorAll('video[data-autoplay]'));
  if (reduce.matches) {
    vids.forEach(function (v) { v.removeAttribute('loop'); v.setAttribute('controls', ''); });
  } else if ('IntersectionObserver' in window) {
    var vo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    }, { threshold: 0.25 });
    vids.forEach(function (v) { vo.observe(v); });
  }

  /* ---------- film strip arrows ---------- */
  var track = document.querySelector('[data-strip]');
  if (track) {
    var prev = document.querySelector('[data-strip-prev]');
    var next = document.querySelector('[data-strip-next]');
    function step() { var f = track.querySelector('.frame'); return f ? f.getBoundingClientRect().width + 14 : 300; }
    function sync() {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
    }
    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: reduce.matches ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: reduce.matches ? 'auto' : 'smooth' }); });
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  /* ---------- horizontal rails: drag with a mouse ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.print-table__rail, .desk__rail, .filmstrip__track'), function (rail) {
    var down = false, startX = 0, startL = 0, moved = false;
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; startX = e.clientX; startL = rail.scrollLeft;
      rail.style.scrollSnapType = 'none';
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      rail.scrollLeft = startL - dx;
    });
    function endDrag(e) {
      if (e.type !== 'pointerup') moved = false;
      if (!down) return;
      down = false; rail.style.scrollSnapType = '';
    }
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    window.addEventListener('blur', endDrag);
    rail.addEventListener('click', function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
    rail.addEventListener('dragstart', function (e) { e.preventDefault(); });
  });

  /* ---------- day / night filter ---------- */
  var filterBtns = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
  if (filterBtns.length) {
    var items = Array.prototype.slice.call(document.querySelectorAll('.sheet-grid li'));
    var status = document.querySelector('[data-filter-status]');
    filterBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-filter'), shown = 0;
        filterBtns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        items.forEach(function (li) {
          var show = f === 'all' || li.getAttribute('data-time') === f;
          li.hidden = !show; if (show) shown++;
        });
        if (status) status.textContent = 'Showing ' + shown + ' photos.';
      });
    });
  }

  /* ---------- our work: highlight current event in the programme ---------- */
  var progLinks = Array.prototype.slice.call(document.querySelectorAll('.programme a'));
  if (progLinks.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        progLinks.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + en.target.id;
          a.classList.toggle('is-active', on);
          if (on) { a.setAttribute('aria-current', 'location'); if (a.scrollIntoView && !reduce.matches) a.parentElement.parentElement.scrollTo({ left: a.offsetLeft - 20, behavior: 'smooth' }); }
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    progLinks.forEach(function (a) { var t = document.querySelector(a.getAttribute('href')); if (t) io.observe(t); });
  }

  /* ---------- enquiry form: Formspree (same form as before), then the thank-you page ---------- */
  var form = document.getElementById('enquiry');
  if (form) {
    var st = form.querySelector('[data-form-status]');
    var btn = form.querySelector('button[type="submit"]');
    var TO = 'photo@shedphotobooth.com';
    var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    function val(n) { var el = form.elements[n]; return el ? el.value.trim() : ''; }
    function setErr(id, msg) {
      var input = document.getElementById(id), err = document.getElementById(id + '-err');
      if (msg) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', id + '-err'); err.textContent = msg; err.hidden = false; }
      else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); err.hidden = true; }
      return !msg;
    }
    function say(html) { st.hidden = false; st.innerHTML = html; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      ok = setErr('f-name', val('name') ? '' : 'Please tell us your name.') && ok;
      ok = setErr('f-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email')) ? '' : 'Please add an email address we can reply to.') && ok;
      ok = setErr('f-type', val('event-type') ? '' : 'Please choose an event type.') && ok;
      if (!ok) { var bad = form.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
      if (local) { form.setAttribute('data-blocked', '1'); say('Test copy on this computer: the enquiry was not sent.'); return; }
      var label = btn.innerHTML;
      btn.disabled = true; btn.textContent = 'Sending\u2026';
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) { if (!res.ok) throw new Error('send'); window.location.href = '/thank-you'; })
        .catch(function () {
          btn.disabled = false; btn.innerHTML = label;
          say('That did not send. Please try again, or email <a href="mailto:' + TO + '">' + TO + '</a>.');
        });
    });
  }
})();
