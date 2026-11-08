/* Shed Photobooth — free mini booth.
   Three photos, one 2x6 strip, drawn on a canvas on this device. Nothing is uploaded. */
(function () {
  'use strict';
  var root = document.getElementById('booth');
  if (!root) return;

  var video = document.getElementById('booth-video');
  var canvas = document.getElementById('booth-strip');
  var ctx = canvas.getContext('2d');
  var idle = root.querySelector('[data-idle]');
  var statusEl = root.querySelector('[data-status]');
  var countEl = root.querySelector('[data-count]');
  var dots = Array.prototype.slice.call(root.querySelectorAll('.shot-dots i'));
  var flash = document.querySelector('.flash');
  var btn = {
    allow: root.querySelector('[data-act="allow"]'),
    shoot: root.querySelector('[data-act="shoot"]'),
    retake: root.querySelector('[data-act="retake"]'),
    save: root.querySelector('[data-act="save"]')
  };
  var styleBtns = Array.prototype.slice.call(root.querySelectorAll('[data-booth-style]'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var stream = null, photos = [], shooting = false, style = 'classic', generation = 0;
  function assertActive(run) { if (run !== generation) throw new Error('Capture cancelled'); }

  var STYLES = {
    classic: { bg: '#F5F5F5', ink: '#320466', accent: '#e62a4a', slot: '#e4dcea', mono: false, logo: '/images/brand/shed-horizontal-primary.svg' },
    mono:    { bg: '#ffffff', ink: '#111111', accent: '#111111', slot: '#dddddd', mono: true,  logo: '/images/brand/shed-horizontal-mono-black.svg' },
    purple:  { bg: '#320466', ink: '#F5F5F5', accent: '#e62a4a', slot: '#4b2580', mono: false, logo: '/images/brand/shed-horizontal-reverse.svg' }
  };
  var logos = {};
  Object.keys(STYLES).forEach(function (k) {
    var im = new Image(); im.onload = draw; im.src = STYLES[k].logo; logos[k] = im;
  });

  var W = canvas.width, H = canvas.height, M = 36, FW = W - 2 * M, FH = Math.round(FW * 3 / 4), GAP = 22, TOP = 36;
  function frameY(i) { return TOP + i * (FH + GAP); }

  function say(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('is-error', !!isError);
  }
  function show(name, on) { btn[name].hidden = !on; }

  function cover(g, src, x, y, w, h) {
    var iw = src.width, ih = src.height, s = Math.max(w / iw, h / ih);
    var sw = w / s, sh = h / s;
    g.drawImage(src, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
  }
  function toMono(x, y, w, h) {
    var d = ctx.getImageData(x, y, w, h), p = d.data;
    for (var i = 0; i < p.length; i += 4) {
      var l = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
      l = Math.max(0, Math.min(255, (l - 128) * 1.12 + 128));
      p[i] = p[i + 1] = p[i + 2] = l;
    }
    ctx.putImageData(d, x, y);
  }

  function draw() {
    var st = STYLES[style];
    ctx.save();
    ctx.fillStyle = st.bg; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < 3; i++) {
      var y = frameY(i);
      if (photos[i]) {
        cover(ctx, photos[i], M, y, FW, FH);
        if (st.mono) toMono(M, y, FW, FH);
      } else {
        ctx.fillStyle = st.slot; ctx.fillRect(M, y, FW, FH);
        ctx.fillStyle = st.ink; ctx.globalAlpha = 1;
        ctx.font = '800 120px "Montserrat", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), W / 2, y + FH / 2 + 6);
        ctx.globalAlpha = 1;
      }
    }
    var top = frameY(2) + FH + 40;
    // fuchsia rule
    ctx.fillStyle = st.accent; ctx.fillRect(M, top, FW, 6);
    // headline
    ctx.fillStyle = st.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = '800 72px "Montserrat", sans-serif';
    ctx.fillText('STEP IN.', W / 2, top + 110);
    ctx.fillStyle = style === 'mono' ? st.ink : st.accent;
    ctx.fillText('KEEP THIS.', W / 2, top + 192);
    // logo
    var logo = logos[style];
    if (logo && logo.complete && logo.naturalWidth) {
      var lw = 340, lh = lw * logo.naturalHeight / logo.naturalWidth;
      ctx.drawImage(logo, (W - lw) / 2, top + 232, lw, lh);
    }
    ctx.fillStyle = st.ink;
    ctx.font = '500 26px "Montserrat", sans-serif';
    var date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    ctx.fillText(date, W / 2, H - 110);
    ctx.font = '500 24px "Montserrat", sans-serif';
    ctx.globalAlpha = 1;
    ctx.fillText('SHEDPHOTOBOOTH.COM', W / 2, H - 66);
    ctx.restore();
    canvas.classList.toggle('is-empty', photos.length === 0);
  }

  function grab() {
    var c = document.createElement('canvas');
    c.width = video.videoWidth || 1280; c.height = video.videoHeight || 960;
    var g = c.getContext('2d');
    g.translate(c.width, 0); g.scale(-1, 1); // match the mirrored preview
    g.drawImage(video, 0, 0, c.width, c.height);
    return c;
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function explain(err) {
    var n = err && err.name;
    if (n === 'NotAllowedError' || n === 'SecurityError' || n === 'PermissionDeniedError')
      return 'Camera blocked. To use the booth, allow camera access for this page in your browser settings, then press Allow camera again.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError' || n === 'DevicesNotFoundError')
      return 'We couldn\u2019t find a camera on this device. Try another device with a front camera.';
    if (n === 'NotReadableError' || n === 'TrackStartError')
      return 'Your camera is busy in another app. Close it there, then press Allow camera again.';
    return 'The camera didn\u2019t start. Please try again, or try another browser.';
  }

  function start() {
    if (!window.isSecureContext) {
      say('The camera only works on a secure page (https or localhost). Open this page over https to use the booth.', true);
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      say('This browser can\u2019t open the camera. Try an up-to-date Safari, Chrome or Firefox.', true);
      return;
    }
    var request = ++generation;
    btn.allow.disabled = true;
    say('Waiting for your camera\u2026');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then(function (s) {
        if (request !== generation) { s.getTracks().forEach(function (t) { t.stop(); }); throw new Error('Camera request cancelled'); }
        stream = s;
        video.srcObject = s;
        video.hidden = false; idle.hidden = true;
        root.classList.add('is-live');
        return video.play();
      })
      .then(function () {
        assertActive(request);
        show('allow', false); show('shoot', true);
        btn.shoot.focus({ preventScroll: true });
        say('You\u2019re in the booth. Pick a style, then take 3 photos.');
      })
      .catch(function (err) {
        if (request !== generation) return;
        stop();
        resetCamera();
        say(explain(err), true);
      });
  }

  function countdown(n, run) {
    return new Promise(function (resolve, reject) {
      var k = n;
      (function tick() {
        if (run !== generation) { reject(new Error('Capture cancelled')); return; }
        if (k === 0) { countEl.textContent = ''; resolve(); return; }
        countEl.innerHTML = '<span class="tick">' + k + '</span>';
        k--; setTimeout(tick, 900);
      })();
    });
  }

  function shoot() {
    if (shooting || !stream) return;
    var run = generation;
    shooting = true;
    photos = []; draw();
    dots.forEach(function (d) { d.classList.remove('on'); });
    show('shoot', false); show('retake', false); show('save', false);
    styleBtns.forEach(function (b) { b.disabled = true; });
    canvas.classList.remove('dropping');

    var seq = Promise.resolve();
    [0, 1, 2].forEach(function (i) {
      seq = seq.then(function () {
        assertActive(run);
        say('Photo ' + (i + 1) + ' of 3. Look at the camera.');
        return countdown(3, run);
      }).then(function () {
        assertActive(run);
        if (flash) { flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); }
        photos[i] = grab();
        dots[i].classList.add('on');
        return wait(i < 2 ? 900 : 300);
      });
    });
    seq.then(function () {
      assertActive(run);
      draw();
      if (!reduce) { void canvas.offsetWidth; canvas.classList.add('dropping'); }
      shooting = false;
      styleBtns.forEach(function (b) { b.disabled = false; });
      show('retake', true); show('save', true);
      btn.save.focus({ preventScroll: true });
      var printer = root.querySelector('.printer');
      var r = printer.getBoundingClientRect();
      if (r.top < 60 || r.bottom > window.innerHeight) printer.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      say('Your strip has dropped. Save it, change the style, or retake.');
    }).catch(function () {
      if (run !== generation) return;
      shooting = false;
      countEl.textContent = '';
      styleBtns.forEach(function (b) { b.disabled = false; });
      show('shoot', !!stream); show('retake', false); show('save', false);
      say('That capture stopped. Please try taking your photos again.', true);
    });
  }

  function save() {
    var name = 'shed-strip-' + new Date().toISOString().slice(0, 10) + '.png';
    canvas.toBlob(function (blob) {
      if (!blob) { say('That didn\u2019t save. Please try again.', true); return; }
      var file;
      try { file = new File([blob], name, { type: 'image/png' }); } catch (e) { file = null; }
      var touch = window.matchMedia('(pointer: coarse)').matches;
      if (touch && file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'My Shed strip' }).then(function () {
          say('Saved. Enjoy your strip.');
        }).catch(function (e) { if (e && e.name !== 'AbortError') download(blob, name); });
        return;
      }
      download(blob, name);
    }, 'image/png');
  }
  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    say('Downloaded ' + name + '.');
  }

  function setStyle(s) {
    style = s;
    styleBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-booth-style') === s ? 'true' : 'false'); });
    video.classList.toggle('mono', s === 'mono');
    video.classList.toggle('purple', s === 'purple');
    draw();
  }

  btn.allow.addEventListener('click', start);
  btn.shoot.addEventListener('click', shoot);
  btn.retake.addEventListener('click', shoot);
  btn.save.addEventListener('click', save);
  styleBtns.forEach(function (b) { b.addEventListener('click', function () { setStyle(b.getAttribute('data-booth-style')); }); });

  function stop() { generation++; countEl.textContent = ''; if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } }
  function resetCamera() {
    video.srcObject = null;
    video.hidden = true; idle.hidden = false;
    root.classList.remove('is-live');
    shooting = false;
    btn.allow.disabled = false;
    show('allow', true); show('shoot', false); show('retake', false);
    // A finished strip stays available to save after returning to this page.
    show('save', photos.length === 3);
    styleBtns.forEach(function (b) { b.disabled = false; });
    countEl.textContent = '';
  }
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && !stream) {
      resetCamera();
      say('Allow your camera to start again. Any finished strip is still here.');
    }
  });

  draw();
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('800 72px "Montserrat"'),
      document.fonts.load('500 26px "Montserrat"')
    ]).then(draw, draw);
  }
})();
