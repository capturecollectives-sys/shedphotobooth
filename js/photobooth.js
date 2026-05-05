// -- Shed Photobooth - free mini booth ----------------------

document.addEventListener('DOMContentLoaded', function() {
  var app = document.querySelector('[data-booth-app]');
  if (!app) return;

  var video = app.querySelector('[data-booth-video]');
  var canvas = app.querySelector('[data-booth-strip]');
  var ctx = canvas.getContext('2d');
  var startBtn = app.querySelector('[data-booth-start]');
  var shootBtn = app.querySelector('[data-booth-shoot]');
  var retakeBtn = app.querySelector('[data-booth-retake]');
  var downloadBtn = app.querySelector('[data-booth-download]');
  var countdown = app.querySelector('[data-booth-countdown]');
  var status = app.querySelector('[data-booth-status]');
  var placeholder = app.querySelector('[data-booth-placeholder]');
  var styleButtons = app.querySelectorAll('[data-booth-style]');
  var stream = null;
  var photos = [];
  var isShooting = false;
  var stripStyle = 'amber';
  var lastStyleTap = 0;
  var scrollLink = document.querySelector('[data-scroll-target="mini-booth"]');
  var brandLogo = new Image();
  brandLogo.src = 'images/logo-brand-white.png';

  function setStatus(message) {
    status.textContent = message;
  }

  function wait(ms) {
    return new Promise(function(resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function drawPlaceholderStrip() {
    drawStripBase();

    for (var i = 0; i < 3; i += 1) {
      drawEmptyPhotoSlot(i);
    }

    drawStripFooter();
  }

  function drawStripBase() {
    var mono = stripStyle === 'mono';
    var ink = mono ? '#F5F5F0' : '#1A1B26';
    var accent = mono ? '#111217' : '#FFB800';

    ctx.fillStyle = ink;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.globalAlpha = mono ? 0.05 : 0.18;
    var glow = ctx.createRadialGradient(canvas.width / 2, canvas.height - 430, 60, canvas.width / 2, canvas.height - 430, 520);
    glow.addColorStop(0, accent);
    glow.addColorStop(1, mono ? 'rgba(17,18,23,0)' : 'rgba(255,184,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    drawCornerMarks();
  }

  function drawCornerMarks() {
    var mono = stripStyle === 'mono';
    var accent = mono ? '#111217' : '#FFB800';
    var marks = [
      [38, 34, 1, 1],
      [canvas.width - 38, 34, -1, 1],
      [46, canvas.height - 46, 1, -1],
      [canvas.width - 46, canvas.height - 46, -1, -1]
    ];
    ctx.strokeStyle = accent;
    ctx.lineWidth = 8;
    marks.forEach(function(mark) {
      var x = mark[0];
      var y = mark[1];
      var sx = mark[2];
      var sy = mark[3];
      ctx.beginPath();
      ctx.moveTo(x, y + sy * 58);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * 58, y);
      ctx.stroke();
    });
  }

  function drawPhotoFrame(index) {
    var size = 760;
    var x = (canvas.width - size) / 2;
    var y = 48 + index * 780;
    return { x: x, y: y, width: size, height: size };
  }

  function drawCapturedPhoto(photo, frame) {
    var mono = stripStyle === 'mono';

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.34)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#F7F7F2';
    roundRect(frame.x, frame.y, frame.width, frame.height, 20);
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundRect(frame.x, frame.y, frame.width, frame.height, 20);
    ctx.clip();
    if (mono) ctx.filter = 'grayscale(1) contrast(1.08)';
    drawCover(photo, frame.x, frame.y, frame.width, frame.height);
    ctx.filter = 'none';
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.72)';
    ctx.lineWidth = 10;
    roundRect(frame.x + 14, frame.y + 14, frame.width - 28, frame.height - 28, 14);
    ctx.stroke();
    ctx.restore();
  }

  function drawEmptyPhotoSlot(index) {
    var frame = drawPhotoFrame(index);
    ctx.fillStyle = '#F7F7F2';
    roundRect(frame.x, frame.y, frame.width, frame.height, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(26,27,38,0.18)';
    ctx.lineWidth = 3;
    roundRect(frame.x + 20, frame.y + 20, frame.width - 40, frame.height - 40, 16);
    ctx.stroke();
    ctx.fillStyle = '#A0A0A0';
    ctx.globalAlpha = 0.56;
    ctx.font = '500 44px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Your Photo Here', canvas.width / 2, frame.y + frame.height / 2 + 15);
    ctx.globalAlpha = 1;
  }

  function drawStripFooter() {
    var mono = stripStyle === 'mono';
    var logoWidth = 455;
    var logoHeight = brandLogo.complete && brandLogo.naturalWidth
      ? logoWidth * (brandLogo.naturalHeight / brandLogo.naturalWidth)
      : 360;
    var logoY = 2390;

    if (!mono && brandLogo.complete && brandLogo.naturalWidth) {
      ctx.save();
      ctx.drawImage(brandLogo, (canvas.width - logoWidth) / 2, logoY, logoWidth, logoHeight);
      ctx.restore();
    } else {
      ctx.fillStyle = mono ? '#111217' : '#F5F5F5';
      ctx.textAlign = 'center';
      ctx.font = '900 120px Montserrat, Arial, sans-serif';
      ctx.fillText('SHED', canvas.width / 2, logoY + 160);
      ctx.fillStyle = mono ? '#111217' : '#FFB800';
      ctx.font = '600 52px Montserrat, Arial, sans-serif';
      ctx.fillText('PHOTOBOOTH', canvas.width / 2, logoY + 220);
      ctx.font = '500 22px Montserrat, Arial, sans-serif';
      ctx.fillText('Custom Installations for Immersive Events', canvas.width / 2, logoY + 260);
    }

    ctx.fillStyle = mono ? '#111217' : '#F5F5F5';
    ctx.textAlign = 'center';
    ctx.font = '800 30px Montserrat, Arial, sans-serif';
    ctx.fillText('www.shedphotobooth.com', canvas.width / 2, 2800);
    ctx.font = '700 23px Montserrat, Arial, sans-serif';
    ctx.fillText('@shedphotobooth  |  TikTok @shedphotobooth', canvas.width / 2, 2840);
  }

  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawCover(image, x, y, width, height) {
    var ratio = Math.max(width / image.width, height / image.height);
    var drawWidth = image.width * ratio;
    var drawHeight = image.height * ratio;
    var drawX = x + (width - drawWidth) / 2;
    var drawY = y + (height - drawHeight) / 2;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }

  function drawStrip() {
    drawStripBase();

    photos.forEach(function(photo, index) {
      var frame = drawPhotoFrame(index);
      drawCapturedPhoto(photo, frame);
    });

    for (var i = photos.length; i < 3; i += 1) {
      drawEmptyPhotoSlot(i);
    }

    drawStripFooter();
  }

  function capturePhoto() {
    var photoCanvas = document.createElement('canvas');
    photoCanvas.width = video.videoWidth || 1280;
    photoCanvas.height = video.videoHeight || 720;
    var photoCtx = photoCanvas.getContext('2d');
    photoCtx.translate(photoCanvas.width, 0);
    photoCtx.scale(-1, 1);
    photoCtx.drawImage(video, 0, 0, photoCanvas.width, photoCanvas.height);
    var image = new Image();
    image.src = photoCanvas.toDataURL('image/jpeg', 0.92);
    return new Promise(function(resolve, reject) {
      image.onload = function() {
        resolve(image);
      };
      image.onerror = function() {
        reject(new Error('Could not prepare captured photo'));
      };
    });
  }

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('This browser does not support camera access. Try Safari, Chrome or Edge on a secure connection.');
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      video.srcObject = stream;
      await video.play();
      placeholder.classList.add('hidden');
      startBtn.textContent = 'Camera Ready';
      startBtn.disabled = true;
      shootBtn.disabled = false;
      setStatus('Ready. Press Take 3 Photos and pose for each countdown.');
    } catch (err) {
      setStatus('Camera permission was not allowed. Enable camera access and try again.');
    }
  }

  async function shootStrip() {
    if (!stream || isShooting) return;
    isShooting = true;
    photos = [];
    shootBtn.disabled = true;
    retakeBtn.disabled = true;
    downloadBtn.disabled = true;
    setStatus('Shooting three photos. Keep the Shed energy going.');

    try {
      for (var i = 0; i < 3; i += 1) {
        for (var count = 3; count > 0; count -= 1) {
          countdown.textContent = count;
          await wait(850);
        }
        countdown.textContent = 'Snap';
        photos.push(await capturePhoto());
        drawStrip();
        await wait(500);
        countdown.textContent = '';
      }

      setStatus('Strip ready. Download it or retake the three photos.');
      retakeBtn.disabled = false;
      downloadBtn.disabled = false;
    } catch (err) {
      setStatus('Something interrupted the photo strip. Press Retake and try again.');
      retakeBtn.disabled = false;
    } finally {
      countdown.textContent = '';
      isShooting = false;
      shootBtn.disabled = false;
    }
  }

  function retake() {
    photos = [];
    drawPlaceholderStrip();
    downloadBtn.disabled = true;
    retakeBtn.disabled = true;
    setStatus(stream ? 'Ready for another strip.' : 'Allow camera access to start.');
  }

  function canvasToBlob() {
    return new Promise(function(resolve, reject) {
      if (canvas.toBlob) {
        canvas.toBlob(function(blob) {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Could not prepare PNG image'));
          }
        }, 'image/png');
        return;
      }

      var dataUrl = canvas.toDataURL('image/png');
      var byteString = atob(dataUrl.split(',')[1]);
      var mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
      var bytes = new Uint8Array(byteString.length);
      for (var i = 0; i < byteString.length; i += 1) {
        bytes[i] = byteString.charCodeAt(i);
      }
      resolve(new Blob([bytes], { type: mimeString }));
    });
  }

  async function downloadStrip() {
    if (photos.length !== 3) return;

    try {
      var blob = await canvasToBlob();
      var fileName = 'shed-photobooth-strip.png';
      var file = typeof File !== 'undefined'
        ? new File([blob], fileName, { type: 'image/png' })
        : null;

      if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Shed Photobooth Strip',
          text: 'Your Shed Photobooth strip'
        });
        setStatus('Use Save Image or share your strip from the sheet.');
        return;
      }

      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.type = 'image/png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function() {
        URL.revokeObjectURL(url);
      }, 1000);
      setStatus('PNG image downloaded. If you are on iPhone, check Files or share it to Photos.');
    } catch (err) {
      setStatus('Your browser blocked the download. Press and hold the strip image or try sharing from Safari.');
    }
  }

  drawPlaceholderStrip();
  if (brandLogo.addEventListener) brandLogo.addEventListener('load', function() {
    if (photos.length) {
      drawStrip();
    } else {
      drawPlaceholderStrip();
    }
  });
  if (scrollLink) {
    scrollLink.addEventListener('click', function(event) {
      event.preventDefault();
      app.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  startBtn.addEventListener('click', startCamera);
  shootBtn.addEventListener('click', shootStrip);
  retakeBtn.addEventListener('click', retake);
  downloadBtn.addEventListener('click', downloadStrip);
  function selectStripStyle(button) {
    if (!button) return;
    stripStyle = button.getAttribute('data-booth-style') || 'amber';
    styleButtons.forEach(function(item) {
      item.classList.toggle('active', item === button);
    });
    if (photos.length) {
      drawStrip();
    } else {
      drawPlaceholderStrip();
    }
  }

  styleButtons.forEach(function(button) {
    button.addEventListener('pointerup', function(event) {
      lastStyleTap = Date.now();
      event.preventDefault();
      selectStripStyle(button);
    });
    button.addEventListener('click', function() {
      if (Date.now() - lastStyleTap < 450) return;
      stripStyle = button.getAttribute('data-booth-style') || 'amber';
      selectStripStyle(button);
    });
  });
});
