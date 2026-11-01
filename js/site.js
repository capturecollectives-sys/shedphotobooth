// Shed Photobooth, site script (2026). No libraries.
(function () {
  'use strict';
  window.__shed = true;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---- menu (phones) ----
  var menu = $('#menu'), opener = $('.nav__menu'), closer = $('.menu__close');
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (opener) opener.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) { var first = $('nav a', menu); if (first) first.focus(); } else if (opener) opener.focus();
  }
  if (opener) opener.addEventListener('click', function () { setMenu(true); });
  if (closer) closer.addEventListener('click', function () { setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu && menu.classList.contains('open')) setMenu(false); });
  $$('#menu a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });

  // ---- reveal each part of a section as it arrives ----
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // ---- clip posters load only when the clip is near the screen ----
  var postered = $$('video[data-poster]');
  var setPoster = function (v) { if (v.dataset.poster) { v.poster = v.dataset.poster; v.removeAttribute('data-poster'); } };
  if ('IntersectionObserver' in window) {
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { setPoster(e.target); pio.unobserve(e.target); } });
    }, { rootMargin: '800px 0px' });
    postered.forEach(function (v) { pio.observe(v); });
  } else postered.forEach(setPoster);

  // ---- clips play only while on screen ----
  var clips = $$('video[data-autoplay]');
  if ('IntersectionObserver' in window && !reduce) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { v.preload = 'auto'; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    }, { threshold: 0.3 });
    clips.forEach(function (v) { vio.observe(v); });
  }
  if (reduce) $$('video[autoplay]').forEach(function (v) { v.pause(); v.removeAttribute('autoplay'); });

  // ---- home: put yourself in the strip ----
  var me = $('#me'), strip = $('#strip');
  if (me && strip) {
    var frames = $$('.frame', strip);
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    me.addEventListener('click', function () {
      if (me.dataset.done) { location.href = '/free-photobooth'; return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { me.textContent = 'Your browser has no camera access'; return; }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
        .then(async function (stream) {
          me.disabled = true; me.textContent = 'Smile';
          strip.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
          for (var i = 0; i < frames.length; i++) {
            var old = $('img, video', frames[i]); var v = document.createElement('video');
            v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.srcObject = stream; v.style.transform = 'scaleX(-1)';
            old.replaceWith(v); try { await v.play(); } catch (e) {}
          }
          for (var j = 0; j < frames.length; j++) {
            var f = frames[j], vid = $('video', f), count = $('.count', f);
            for (var n = 3; n > 0; n--) { count.textContent = n; await sleep(800); }
            count.textContent = '';
            var c = document.createElement('canvas'); c.width = vid.videoWidth || 1280; c.height = vid.videoHeight || 960;
            var g = c.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(vid, 0, 0, c.width, c.height);
            c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'Your photo ' + (j + 1));
            $('.flash', f).classList.add('go'); vid.replaceWith(c);
            await sleep(450);
          }
          stream.getTracks().forEach(function (t) { t.stop(); });
          var foot = $('#foot-line');
          if (foot) foot.textContent = 'You, ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
          me.disabled = false; me.dataset.done = '1'; me.textContent = 'Make a strip you can keep';
          var note = $('#me-note'); if (note) note.textContent = 'That was you on a Shed strip. The mini booth lets you save one.';
        })
        .catch(function () { me.textContent = 'Camera not allowed. Try the mini booth'; me.dataset.done = '1'; });
    });
  }

  // ---- home: how a session goes, drag row with progress ----
  var row = $('#moments'), bar = $('#moments-progress');
  if (row) {
    var update = function () {
      var max = row.scrollWidth - row.clientWidth;
      var share = row.clientWidth / row.scrollWidth;
      var pos = max > 0 ? row.scrollLeft / max : 0;
      if (bar) { bar.style.width = (share * 100) + '%'; bar.style.transform = 'translateX(' + (pos * (1 / share - 1) * 100) + '%)'; }
    };
    row.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    $$('[data-step]').forEach(function (b) {
      b.addEventListener('click', function () {
        var item = $('.moment', row); var step = item ? item.getBoundingClientRect().width + 32 : 300;
        row.scrollBy({ left: Number(b.dataset.step) * step, behavior: reduce ? 'auto' : 'smooth' });
      });
    });
    // drag with a mouse
    var down = false, startX = 0, startLeft = 0, moved = false;
    row.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; startX = e.clientX; startLeft = row.scrollLeft; row.style.scrollSnapType = 'none'; row.style.cursor = 'grabbing'; });
    window.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - startX; if (Math.abs(dx) > 4) moved = true; row.scrollLeft = startLeft - dx; });
    window.addEventListener('pointerup', function () { if (!down) return; down = false; row.style.scrollSnapType = ''; row.style.cursor = ''; });
    row.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    row.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  // ---- first-look designs: no right-click, drag or long-press save (the watermark is in the file itself) ----
  document.addEventListener('contextmenu', function (e) { if (e.target.closest && e.target.closest('[data-protect]')) e.preventDefault(); });
  document.addEventListener('dragstart', function (e) { if (e.target.closest && e.target.closest('[data-protect]')) e.preventDefault(); });

  // ---- enquiry form: Formspree, then the thank-you page ----
  var form = $('#contact-form');
  if (form) {
    var btn = $('#submit-btn', form), err = $('#form-error'), label = btn ? btn.textContent : '';
    var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (err) err.hidden = true;
      if (local) { // never email Pete from a test copy
        if (err) { err.textContent = 'Test copy on this computer: the enquiry was not sent.'; err.hidden = false; }
        form.dataset.blocked = '1';
        return;
      }
      if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) { if (!res.ok) throw new Error('send'); location.href = '/thank-you'; })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = label; }
          if (err) { err.textContent = "That didn't send. Please try again, or email photo@shedphotobooth.com."; err.hidden = false; }
        });
    });
  }
})();
