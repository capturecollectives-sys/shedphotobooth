// Shed Photobooth, free mini booth (2026).
// Three photos from the visitor's own camera, laid out as a Shed strip: three frames, logo at the foot.
// Everything happens in this tab. Nothing is uploaded.
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var app = document.querySelector('[data-booth-app]');
  if (!app) return;
  var q = function (s) { return app.querySelector(s); };
  var video = q('[data-booth-video]'), canvas = q('[data-booth-strip]'), ctx = canvas.getContext('2d');
  var startBtn = q('[data-booth-start]'), shootBtn = q('[data-booth-shoot]'), retakeBtn = q('[data-booth-retake]'), saveBtn = q('[data-booth-download]');
  var countdown = q('[data-booth-countdown]'), status = q('[data-booth-status]'), placeholder = q('[data-booth-placeholder]'), flash = q('[data-booth-flash]');
  var styleButtons = Array.prototype.slice.call(app.querySelectorAll('[data-booth-style]'));
  var stream = null, photos = [], shooting = false, style = 'classic';

  // the brand's own logo files, never retyped
  var logos = {};
  [['classic', '/images/brand/shed-horizontal-primary.png'], ['mono', '/images/brand/shed-horizontal-mono-black.png'], ['purple', '/images/brand/shed-horizontal-reverse.png']]
    .forEach(function (l) { var img = new Image(); img.onload = draw; img.src = l[1]; logos[l[0]] = img; });

  var STYLES = {
    classic: { bg: '#FFFFFF', ink: '#320466', slot: '#D6CDE0', mono: false },
    mono: { bg: '#FFFFFF', ink: '#111111', slot: '#DDDDDD', mono: true },
    purple: { bg: '#320466', ink: '#F5F5F5', slot: '#4B2580', mono: false }
  };
  var W = canvas.width, M = 40, FW = W - 2 * M, FH = Math.round(FW * 3 / 4), GAP = 30;

  function frameRect(i) { return { x: M, y: M + i * (FH + GAP), w: FW, h: FH }; }
  function setStatus(t) { status.textContent = t; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function cover(img, r) {
    var iw = img.width || img.videoWidth, ih = img.height || img.videoHeight;
    var s = Math.max(r.w / iw, r.h / ih), dw = iw * s, dh = ih * s;
    ctx.drawImage(img, r.x + (r.w - dw) / 2, r.y + (r.h - dh) / 2, dw, dh);
  }

  function draw() {
    var st = STYLES[style];
    ctx.fillStyle = st.bg; ctx.fillRect(0, 0, W, canvas.height);
    for (var i = 0; i < 3; i++) {
      var r = frameRect(i);
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      if (photos[i]) { if (st.mono) ctx.filter = 'grayscale(1) contrast(1.08)'; cover(photos[i], r); ctx.filter = 'none'; }
      else {
        ctx.fillStyle = st.slot; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = st.ink; ctx.globalAlpha = .7; ctx.font = '600 44px Montserrat, Arial, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Photo ' + (i + 1), W / 2, r.y + r.h / 2 + 15); ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
    var top = frameRect(2).y + FH, logo = logos[style];
    if (logo && logo.complete && logo.naturalWidth) {
      var lw = 620, lh = lw * logo.naturalHeight / logo.naturalWidth;
      ctx.drawImage(logo, (W - lw) / 2, top + 150, lw, lh);
    }
    ctx.fillStyle = st.ink; ctx.textAlign = 'center';
    ctx.font = '600 36px Montserrat, Arial, sans-serif';
    ctx.fillText(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), W / 2, top + 470);
    ctx.font = '800 40px Montserrat, Arial, sans-serif';
    ctx.fillText('shedphotobooth.com', W / 2, top + 560);
  }

  function capture() {
    var c = document.createElement('canvas'); c.width = video.videoWidth || 1280; c.height = video.videoHeight || 960;
    var g = c.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(video, 0, 0, c.width, c.height);
    return c;
  }

  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setStatus('This browser has no camera access. Try Safari, Chrome or Edge.'); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then(function (s) {
        stream = s; video.srcObject = s; return video.play();
      })
      .then(function () {
        placeholder.classList.add('hidden');
        startBtn.textContent = 'Camera on'; startBtn.disabled = true; shootBtn.disabled = false;
        setStatus('Ready. Press Take 3 photos and pose for each countdown.');
      })
      .catch(function () { setStatus('The camera was not allowed. Allow it in your browser settings and try again.'); });
  }

  async function shoot() {
    if (!stream || shooting) return;
    shooting = true; photos = []; draw();
    shootBtn.disabled = retakeBtn.disabled = saveBtn.disabled = true;
    setStatus('Three photos coming up.');
    try {
      for (var i = 0; i < 3; i++) {
        for (var n = 3; n > 0; n--) { countdown.textContent = n; await wait(850); }
        countdown.textContent = '';
        photos.push(capture());
        flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
        draw(); await wait(600);
      }
      setStatus('Your strip is ready. Save it, or retake.');
      retakeBtn.disabled = saveBtn.disabled = false;
    } catch (e) {
      setStatus('Something interrupted the strip. Press Retake and try again.'); retakeBtn.disabled = false;
    } finally { countdown.textContent = ''; shooting = false; shootBtn.disabled = false; }
  }

  function retake() { photos = []; draw(); saveBtn.disabled = retakeBtn.disabled = true; setStatus(stream ? 'Ready for another strip.' : 'Allow your camera to start.'); }

  function toBlob() {
    return new Promise(function (resolve, reject) {
      if (canvas.toBlob) { canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error('blob')); }, 'image/png'); return; }
      var d = canvas.toDataURL('image/png'), bin = atob(d.split(',')[1]), a = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
      resolve(new Blob([a], { type: 'image/png' }));
    });
  }

  async function save() {
    if (photos.length !== 3) return;
    try {
      var blob = await toBlob(), name = 'shed-photobooth-strip.png';
      var file = typeof File !== 'undefined' ? new File([blob], name, { type: 'image/png' }) : null;
      if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: 'Shed Photobooth strip' });
        setStatus('Choose Save Image to keep it in your photos.'); return;
      }
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      setStatus('Saved as a PNG. On an iPhone, look in Files, or share it to Photos.');
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      setStatus('Your browser blocked the save. Press and hold the strip to save it instead.');
    }
  }

  styleButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      style = b.getAttribute('data-booth-style') || 'classic';
      styleButtons.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      draw();
    });
  });
  startBtn.addEventListener('click', startCamera);
  shootBtn.addEventListener('click', shoot);
  retakeBtn.addEventListener('click', retake);
  saveBtn.addEventListener('click', save);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  draw();
});
