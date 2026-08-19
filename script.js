document.addEventListener('DOMContentLoaded', () => {
  const page1Scene = document.querySelector('.page1-scene');
  const page2Scene = document.querySelector('.page2-scene');
  const page2Video = document.querySelector('.page2-video');
  const page3Scene = document.querySelector('.page3-scene');
  const page3Photo = document.querySelector('.page3-photo');
  const page3PhotoNext = document.querySelector('.page3-photo-next');
  const page3Count = document.querySelector('.page3-count');
  const backgroundMusic = document.getElementById('background-music');
  const musicToggle = document.querySelector('.music-toggle');

  if (backgroundMusic && musicToggle) {
    const setMusicState = (isPlaying) => {
      musicToggle.setAttribute('aria-pressed', String(isPlaying));
      musicToggle.setAttribute('aria-label', isPlaying ? 'Pause background music' : 'Play background music');
      musicToggle.textContent = isPlaying ? 'Pause' : 'Music';
    };

    const playMusic = async () => {
      try {
        await backgroundMusic.play();
        setMusicState(true);
        return true;
      } catch (_) {
        setMusicState(false);
        return false;
      }
    };

    musicToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      if (backgroundMusic.paused) {
        playMusic();
      } else {
        backgroundMusic.pause();
        setMusicState(false);
      }
    });

    const startMusicAfterInteraction = (event) => {
      if (event.target?.closest?.('.music-toggle')) return;
      playMusic();
      document.removeEventListener('pointerdown', startMusicAfterInteraction);
      document.removeEventListener('keydown', startMusicAfterInteraction);
    };

    document.addEventListener('pointerdown', startMusicAfterInteraction);
    document.addEventListener('keydown', startMusicAfterInteraction);
  }

  if (page1Scene) {
    const fogCanvas = page1Scene.querySelector('.page1-fog-canvas');

    if (fogCanvas) {
      const ctx = fogCanvas.getContext('2d', { alpha: true });
      if (!ctx) {
        page1Scene.classList.add('is-fog-cleared', 'is-revealed');
        document.body.classList.remove('is-fog-locked');
      }
      let dpr = 1;
      let width = 0;
      let height = 0;
      let isWiping = false;
      let lastPoint = null;
      let isFogCleared = false;
      let revealCols = 0;
      let revealRows = 0;
      let revealTotal = 0;
      let dissolveFrame = null;
      const fogDissolveMs = 3100;
      const dissolveOrigins = [];
      const revealedCells = new Set();
      if (ctx) document.body.classList.add('is-fog-locked');

      const random = (seed) => {
        const x = Math.sin(seed * 999) * 10000;
        return x - Math.floor(x);
      };

      const drawDrop = (x, y, radius, seed, alpha) => {
        const stretch = 1 + random(seed + 1) * 0.65;
        const wobble = (random(seed + 2) - 0.5) * radius * 0.35;
        const trailLength = radius * (1.8 + random(seed + 3) * 5.2);
        const hasTrail = radius > 7 * dpr && random(seed + 4) > 0.28;

        ctx.save();
        ctx.globalAlpha = alpha;

        if (hasTrail) {
          const trail = ctx.createLinearGradient(x, y + radius * 0.35, x + wobble, y + trailLength);
          trail.addColorStop(0, 'rgba(255,255,255,0.34)');
          trail.addColorStop(0.42, 'rgba(176,190,178,0.16)');
          trail.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = trail;
          ctx.lineWidth = Math.max(1, radius * 0.18);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x, y + radius * 0.45);
          ctx.bezierCurveTo(
            x + wobble * 0.35,
            y + trailLength * 0.34,
            x + wobble,
            y + trailLength * 0.68,
            x + wobble * 0.5,
            y + trailLength,
          );
          ctx.stroke();
        }

        const drop = ctx.createRadialGradient(
          x - radius * 0.33,
          y - radius * 0.42,
          radius * 0.08,
          x,
          y + radius * 0.12,
          radius * 1.24,
        );
        drop.addColorStop(0, 'rgba(255,255,255,0.72)');
        drop.addColorStop(0.2, 'rgba(240,247,244,0.42)');
        drop.addColorStop(0.62, 'rgba(124,144,132,0.22)');
        drop.addColorStop(0.82, 'rgba(42,66,45,0.18)');
        drop.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = drop;
        ctx.beginPath();
        ctx.ellipse(x, y, radius * 0.82, radius * stretch, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha * 0.55;
        ctx.strokeStyle = 'rgba(255,255,255,0.58)';
        ctx.lineWidth = Math.max(0.7, radius * 0.08);
        ctx.beginPath();
        ctx.ellipse(
          x - radius * 0.14,
          y - radius * 0.12,
          radius * 0.55,
          radius * stretch * 0.78,
          -0.08,
          Math.PI * 1.05,
          Math.PI * 1.8,
        );
        ctx.stroke();

        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = 'rgba(255,255,255,0.62)';
        ctx.beginPath();
        ctx.ellipse(
          x - radius * 0.28,
          y - radius * 0.42,
          Math.max(0.9, radius * 0.13),
          Math.max(0.7, radius * 0.08),
          -0.45,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.restore();
      };

      const drawFogTexture = (alpha = 1) => {
        if (!ctx || !width || !height) return;

        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha;

        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, 'rgba(220, 229, 218, 0.68)');
        gradient.addColorStop(0.42, 'rgba(198, 211, 194, 0.58)');
        gradient.addColorStop(1, 'rgba(236, 238, 227, 0.74)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.globalAlpha = alpha * 0.16;
        for (let i = 0; i < 760; i++) {
          const x = random(i + 11) * width;
          const y = random(i + 29) * height;
          const r = (random(i + 47) * 1.7 + 0.35) * dpr;
          ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(95,112,95,0.18)';
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = alpha * 0.18;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 0.7 * dpr;
        for (let i = 0; i < 44; i++) {
          const y = random(i + 75) * height;
          const wave = (random(i + 83) * 38 + 18) * dpr;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(width * 0.24, y - wave, width * 0.58, y + wave, width, y - wave * 0.25);
          ctx.stroke();
        }

        for (let i = 0; i < 62; i++) {
          const x = random(i + 101) * width;
          const y = random(i + 131) * height;
          const r = (random(i + 151) * 10 + 3.5) * dpr;
          drawDrop(x, y, r, i + 401, alpha * (0.28 + random(i + 173) * 0.48));
        }

        for (let i = 0; i < 18; i++) {
          const x = random(i + 511) * width;
          const y = random(i + 523) * height * 0.82;
          const r = (random(i + 541) * 17 + 12) * dpr;
          drawDrop(x, y, r, i + 601, alpha * 0.62);
        }

        ctx.globalAlpha = alpha * 0.18;
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.1 * dpr;
        for (let i = 0; i < 26; i++) {
          const x = random(i + 211) * width;
          const y = random(i + 233) * height * 0.72;
          const len = (random(i + 257) * 160 + 46) * dpr;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.bezierCurveTo(
            x + (random(i + 281) - 0.5) * 9 * dpr,
            y + len * 0.28,
            x + (random(i + 307) - 0.5) * 11 * dpr,
            y + len * 0.62,
            x + (random(i + 331) - 0.5) * 7 * dpr,
            y + len,
          );
          ctx.stroke();
        }

        ctx.restore();
      };

      const resizeFog = () => {
        const rect = fogCanvas.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = Math.max(1, Math.round(rect.width * dpr));
        height = Math.max(1, Math.round(rect.height * dpr));
        fogCanvas.width = width;
        fogCanvas.height = height;
        revealCols = 18;
        revealRows = 40;
        revealTotal = revealCols * revealRows;
        revealedCells.clear();
        if (isFogCleared) {
          ctx.clearRect(0, 0, width, height);
          return;
        }
        drawFogTexture(1);
      };

      const canvasPoint = (event) => {
        const rect = fogCanvas.getBoundingClientRect();
        return {
          x: (event.clientX - rect.left) * dpr,
          y: (event.clientY - rect.top) * dpr,
        };
      };

      const touchPoint = (touch) => {
        const rect = fogCanvas.getBoundingClientRect();
        return {
          x: (touch.clientX - rect.left) * dpr,
          y: (touch.clientY - rect.top) * dpr,
        };
      };

      const wipeAt = (point, previous = null) => {
        if (!ctx || isFogCleared) return;

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(0,0,0,0.88)';
        ctx.fillStyle = 'rgba(0,0,0,0.88)';
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 18 * dpr;

        const radius = 42 * dpr;
        if (previous) {
          ctx.lineWidth = radius * 1.35;
          ctx.beginPath();
          ctx.moveTo(previous.x, previous.y);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const lastOrigin = dissolveOrigins[dissolveOrigins.length - 1];
        const originGap = radius * 0.86;
        if (!lastOrigin || (lastOrigin.x - point.x) ** 2 + (lastOrigin.y - point.y) ** 2 > originGap * originGap) {
          dissolveOrigins.push({ x: point.x, y: point.y });
        }

        markRevealed(point, radius);
      };

      const clearAllFog = () => {
        if (isFogCleared) return;
        isFogCleared = true;

        page1Scene.classList.add('is-fog-dissolving');
        isWiping = false;
        lastPoint = null;

        const startTime = performance.now();
        const originPoints = dissolveOrigins.length
          ? dissolveOrigins.slice(-46)
          : [{ x: width * 0.5, y: height * 0.45 }];
        const maxRadius = Math.hypot(width, height) * 0.78;

        const dissolve = (time) => {
          if (!ctx) return;

          const elapsed = Math.min(1, (time - startTime) / fogDissolveMs);
          const eased = 1 - (1 - elapsed) ** 3;
          const radius = (54 * dpr) + maxRadius * eased;

          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = 'rgba(0,0,0,0.34)';
          ctx.shadowBlur = (18 + 22 * eased) * dpr;
          ctx.fillStyle = 'rgba(0,0,0,0.86)';

          originPoints.forEach((origin, index) => {
            const seed = index * 17 + 9;
            const driftX = (random(seed) - 0.5) * 42 * dpr * eased;
            const driftY = (random(seed + 1) - 0.5) * 42 * dpr * eased;
            const ripple = radius * (0.72 + random(seed + 2) * 0.36);

            ctx.beginPath();
            ctx.arc(origin.x + driftX, origin.y + driftY, ripple, 0, Math.PI * 2);
            ctx.fill();

            for (let dot = 0; dot < 4; dot++) {
              const angle = random(seed + dot + 3) * Math.PI * 2;
              const distance = ripple * (0.76 + random(seed + dot + 7) * 0.32);
              const dotRadius = ripple * (0.08 + random(seed + dot + 11) * 0.1);
              ctx.beginPath();
              ctx.arc(
                origin.x + driftX + Math.cos(angle) * distance,
                origin.y + driftY + Math.sin(angle) * distance,
                dotRadius,
                0,
                Math.PI * 2,
              );
              ctx.fill();
            }
          });

          ctx.restore();

          if (elapsed < 1) {
            dissolveFrame = window.requestAnimationFrame(dissolve);
            return;
          }

          ctx?.clearRect(0, 0, width, height);
          page1Scene.classList.remove('is-fog-dissolving');
          page1Scene.classList.add('is-fog-cleared', 'is-revealed');
          document.body.classList.remove('is-fog-locked');
        };

        dissolveFrame = window.requestAnimationFrame(dissolve);
      };

      const markRevealed = (point, radius) => {
        if (!revealTotal) return;

        const cellW = width / revealCols;
        const cellH = height / revealRows;
        const minCol = Math.max(0, Math.floor((point.x - radius) / cellW));
        const maxCol = Math.min(revealCols - 1, Math.ceil((point.x + radius) / cellW));
        const minRow = Math.max(0, Math.floor((point.y - radius) / cellH));
        const maxRow = Math.min(revealRows - 1, Math.ceil((point.y + radius) / cellH));
        const radiusSq = radius * radius;

        for (let row = minRow; row <= maxRow; row++) {
          const cy = (row + 0.5) * cellH;
          for (let col = minCol; col <= maxCol; col++) {
            const cx = (col + 0.5) * cellW;
            const dx = cx - point.x;
            const dy = cy - point.y;
            if (dx * dx + dy * dy <= radiusSq) {
              revealedCells.add(`${col}:${row}`);
            }
          }
        }

        if (revealedCells.size / revealTotal >= 0.1) {
          clearAllFog();
        }
      };

      fogCanvas.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        isWiping = true;
        fogCanvas.setPointerCapture?.(event.pointerId);
        lastPoint = canvasPoint(event);
        wipeAt(lastPoint);
      });

      fogCanvas.addEventListener('pointermove', (event) => {
        if (!isWiping) return;
        event.preventDefault();
        const point = canvasPoint(event);
        wipeAt(point, lastPoint);
        lastPoint = point;
      });

      fogCanvas.addEventListener('touchmove', (event) => {
        event.preventDefault();
        const touch = event.touches[0];
        if (!touch) return;
        const point = touchPoint(touch);
        wipeAt(point, lastPoint);
        lastPoint = point;
      }, { passive: false });

      const stopWiping = () => {
        isWiping = false;
        lastPoint = null;
      };

      fogCanvas.addEventListener('pointerup', stopWiping);
      fogCanvas.addEventListener('pointercancel', stopWiping);
      fogCanvas.addEventListener('touchend', stopWiping);
      fogCanvas.addEventListener('touchcancel', stopWiping);
      window.addEventListener('resize', resizeFog);
      resizeFog();
    }
  }

  if (page2Scene && page2Video) {
    const loadPage2Video = async () => {
      if (page2Video.dataset.ready === 'true') return true;
      if (page2Video.dataset.ready === 'false') return false;

      const videoSrc = page2Video.dataset.src;
      if (!videoSrc) return false;

      try {
        const response = await fetch(videoSrc, { method: 'HEAD' });
        if (!response.ok) {
          page2Video.dataset.ready = 'false';
          return false;
        }
      } catch (_) {
        page2Video.dataset.ready = 'false';
        return false;
      }

      const source = document.createElement('source');
      source.src = videoSrc;
      source.type = 'video/mp4';
      page2Video.append(source);
      page2Video.load();
      page2Video.dataset.ready = 'true';
      return true;
    };

    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadPage2Video().then((isReady) => {
            if (isReady) page2Video.play().catch(() => {});
          });
        } else {
          page2Video.pause();
        }
      });
    }, { threshold: 0.55 });

    videoObserver.observe(page2Scene);
  }

  if (page3Scene && page3Photo && page3PhotoNext && page3Count) {
    const page3Images = Array.from({ length: 8 }, (_, index) => `assets/figma/page3/image${index + 1}.jpg`);
    let page3Index = 0;
    let slideshowTimer = null;
    let isTransitioning = false;

    const preloaders = page3Images.map((src) => {
      const image = new Image();
      image.src = src;
      return image;
    });

    const waitForImage = async (image) => {
      if (image.complete && image.naturalWidth > 0) return;
      if (image.decode) {
        try {
          await image.decode();
          return;
        } catch (_) {}
      }

      await new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    };

    const renderSlide = async (nextIndex) => {
      if (isTransitioning) return;
      isTransitioning = true;

      const nextImage = preloaders[nextIndex];
      await waitForImage(nextImage);
      if (!nextImage.naturalWidth) {
        isTransitioning = false;
        return;
      }

      page3PhotoNext.src = page3Images[nextIndex];
      page3PhotoNext.classList.remove('is-visible');
      page3PhotoNext.offsetHeight;
      page3Count.classList.add('is-changing');
      page3Photo.classList.add('is-fading');
      page3PhotoNext.classList.add('is-visible');

      window.setTimeout(() => {
        page3Index = nextIndex;
        page3Photo.src = page3Images[page3Index];
        page3Count.textContent = `${page3Index + 1}/8`;
        page3Photo.classList.remove('is-fading');
        page3PhotoNext.classList.remove('is-visible');
        page3Count.classList.remove('is-changing');
        isTransitioning = false;
      }, 950);
    };

    const startSlideshow = () => {
      if (slideshowTimer) return;
      slideshowTimer = window.setInterval(() => {
        renderSlide((page3Index + 1) % page3Images.length);
      }, 5200);
    };

    const stopSlideshow = () => {
      if (!slideshowTimer) return;
      window.clearInterval(slideshowTimer);
      slideshowTimer = null;
    };

    const slideshowObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          startSlideshow();
        } else {
          stopSlideshow();
        }
      });
    }, { threshold: 0.55 });

    slideshowObserver.observe(page3Scene);
  }

});
