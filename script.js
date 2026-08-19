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
      const maskCanvas = document.createElement('canvas');
      const maskCtx = maskCanvas.getContext('2d', { alpha: true });
      if (!ctx || !maskCtx) {
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
      let fogFrame = null;
      let lastFogTime = 0;
      let isFogDissolving = false;
      let dissolveStart = 0;
      let dissolveSources = [];
      const fogDissolveMs = 3300;
      const dissolveOrigins = [];
      const revealedCells = new Set();
      const fogSpecks = [];
      const fogWisps = [];
      const staticDrops = [];
      const waterDrops = [];
      if (ctx && maskCtx) document.body.classList.add('is-fog-locked');

      const random = (seed) => {
        const x = Math.sin(seed * 999) * 10000;
        return x - Math.floor(x);
      };

      const drawDrop = (x, y, radius, seed, alpha, stretchBoost = 0) => {
        const stretch = 1 + random(seed + 1) * 0.65;
        const wobble = (random(seed + 2) - 0.5) * radius * 0.35;
        const trailLength = radius * (1.2 + random(seed + 3) * 3.4);
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
        ctx.ellipse(x, y, radius * 0.82, radius * (stretch + stretchBoost), 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha * 0.55;
        ctx.strokeStyle = 'rgba(255,255,255,0.58)';
        ctx.lineWidth = Math.max(0.7, radius * 0.08);
        ctx.beginPath();
        ctx.ellipse(
          x - radius * 0.14,
          y - radius * 0.12,
          radius * 0.55,
          radius * (stretch + stretchBoost) * 0.78,
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

      const seedFogTexture = () => {
        fogSpecks.length = 0;
        fogWisps.length = 0;
        staticDrops.length = 0;

        for (let i = 0; i < 900; i++) {
          fogSpecks.push({
            x: random(i + 11) * width,
            y: random(i + 29) * height,
            r: (random(i + 47) * 1.65 + 0.28) * dpr,
            light: i % 3 === 0,
          });
        }

        for (let i = 0; i < 54; i++) {
          fogWisps.push({
            y: random(i + 75) * height,
            wave: (random(i + 83) * 42 + 16) * dpr,
            alpha: 0.08 + random(i + 91) * 0.16,
          });
        }

        for (let i = 0; i < 90; i++) {
          staticDrops.push({
            x: random(i + 101) * width,
            y: random(i + 131) * height,
            r: (random(i + 151) * 10 + 2.5) * dpr,
            seed: i + 401,
            alpha: 0.2 + random(i + 173) * 0.42,
          });
        }

        for (let i = 0; i < 24; i++) {
          staticDrops.push({
            x: random(i + 511) * width,
            y: random(i + 523) * height * 0.84,
            r: (random(i + 541) * 17 + 10) * dpr,
            seed: i + 601,
            alpha: 0.46,
          });
        }
      };

      const eraseMaskAt = (x, y, radius, softness = 0.28) => {
        if (!maskCtx) return;

        const gradient = maskCtx.createRadialGradient(x, y, radius * softness, x, y, radius);
        gradient.addColorStop(0, 'rgba(0,0,0,0.96)');
        gradient.addColorStop(0.72, 'rgba(0,0,0,0.64)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        maskCtx.save();
        maskCtx.globalCompositeOperation = 'destination-out';
        maskCtx.fillStyle = gradient;
        maskCtx.beginPath();
        maskCtx.arc(x, y, radius, 0, Math.PI * 2);
        maskCtx.fill();
        maskCtx.restore();
      };

      const spawnWaterDrop = (x = Math.random() * width, y = Math.random() * height * 0.42) => {
        if (waterDrops.length >= 120 || !width || !height) return;

        const seed = Math.random() * 1000;
        const r = (2.4 + Math.random() * 7.6) * dpr;
        waterDrops.push({
          x,
          y,
          r,
          vx: 0,
          vy: (4 + Math.random() * 18) * dpr,
          seed,
          age: 0,
          wobble: Math.random() * Math.PI * 2,
          stuck: Math.random() * 0.55,
          trail: 0,
        });
      };

      const updateWaterDrops = (dt, time) => {
        if (!maskCtx || isFogCleared) return;

        const spawnRate = isFogDissolving ? 0 : 6.8;
        if (Math.random() < dt * spawnRate) {
          spawnWaterDrop();
        }

        for (let i = waterDrops.length - 1; i >= 0; i--) {
          const drop = waterDrops[i];
          drop.age += dt;
          drop.wobble += dt * 3.2;

          const wasStuck = drop.stuck > 0;
          if (wasStuck) {
            drop.stuck -= dt;
            drop.r += 0.45 * dpr * dt;
          } else {
            drop.vy += (36 + drop.r * 9) * dpr * dt;
            drop.vy = Math.min(drop.vy, (58 + drop.r * 14) * dpr);
          }

          drop.vx = Math.sin(drop.wobble + time * 0.0018 + drop.seed) * 8 * dpr;

          const prevX = drop.x;
          const prevY = drop.y;
          drop.x += drop.vx * dt;
          drop.y += drop.vy * dt;

          const distance = Math.hypot(drop.x - prevX, drop.y - prevY);
          drop.trail += distance;
          const trailRadius = Math.max(1.2 * dpr, drop.r * 0.48);
          const step = Math.max(2 * dpr, trailRadius * 0.75);

          while (drop.trail > step) {
            drop.trail -= step;
            const ratio = distance ? drop.trail / distance : 0;
            eraseMaskAt(
              drop.x - (drop.x - prevX) * ratio,
              drop.y - (drop.y - prevY) * ratio,
              trailRadius,
              0.12,
            );
          }

          drop.r -= distance * 0.0025;

          if (drop.r < 1.1 * dpr || drop.y > height + 28 * dpr || drop.x < -30 * dpr || drop.x > width + 30 * dpr) {
            waterDrops.splice(i, 1);
          }
        }
      };

      const renderFogTexture = (time = 0) => {
        if (!ctx || !maskCtx || !width || !height) return;

        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';

        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, 'rgba(227, 235, 226, 0.74)');
        gradient.addColorStop(0.38, 'rgba(195, 210, 194, 0.64)');
        gradient.addColorStop(0.72, 'rgba(222, 229, 219, 0.58)');
        gradient.addColorStop(1, 'rgba(245, 245, 236, 0.76)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.globalAlpha = 0.13;
        fogWisps.forEach((wisp, index) => {
          const y = wisp.y + Math.sin(time * 0.00016 + index) * 6 * dpr;
          ctx.strokeStyle = `rgba(255,255,255,${wisp.alpha})`;
          ctx.lineWidth = 0.75 * dpr;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(width * 0.26, y - wisp.wave, width * 0.58, y + wisp.wave, width, y - wisp.wave * 0.25);
          ctx.stroke();
        });

        ctx.globalAlpha = 0.2;
        fogSpecks.forEach((speck) => {
          ctx.fillStyle = speck.light ? 'rgba(255,255,255,0.42)' : 'rgba(76,96,76,0.18)';
          ctx.beginPath();
          ctx.arc(speck.x, speck.y, speck.r, 0, Math.PI * 2);
          ctx.fill();
        });

        staticDrops.forEach((drop) => drawDrop(drop.x, drop.y, drop.r, drop.seed, drop.alpha));
        waterDrops.forEach((drop) => {
          const stretch = Math.min(drop.vy / (130 * dpr), 1.2);
          drawDrop(drop.x, drop.y, drop.r, drop.seed, Math.min(0.72, 0.25 + drop.age * 1.5), stretch);
        });

        ctx.globalCompositeOperation = 'destination-in';
        ctx.globalAlpha = 1;
        ctx.drawImage(maskCanvas, 0, 0);
        ctx.restore();
      };

      const startFogLoop = () => {
        if (fogFrame || !ctx || !maskCtx) return;

        const tick = (time) => {
          const dt = lastFogTime ? Math.min(0.05, (time - lastFogTime) / 1000) : 0.016;
          lastFogTime = time;

          if (isFogDissolving && dissolveStart) {
            const elapsed = Math.min(1, (time - dissolveStart) / fogDissolveMs);
            const eased = 1 - (1 - elapsed) ** 3;
            const radius = (46 * dpr) + Math.hypot(width, height) * 0.86 * eased;

            dissolveSources.forEach((origin, index) => {
              const seed = index * 17 + 9;
              const driftX = (random(seed) - 0.5) * 44 * dpr * eased;
              const driftY = (random(seed + 1) - 0.5) * 44 * dpr * eased;
              eraseMaskAt(origin.x + driftX, origin.y + driftY, radius * (0.78 + random(seed + 2) * 0.35), 0.18);
            });

            if (elapsed >= 1) {
              isFogCleared = true;
              isFogDissolving = false;
              ctx.clearRect(0, 0, width, height);
              maskCtx.clearRect(0, 0, width, height);
              page1Scene.classList.remove('is-fog-dissolving');
              page1Scene.classList.add('is-fog-cleared', 'is-revealed');
              document.body.classList.remove('is-fog-locked');
              fogFrame = null;
              return;
            }
          }

          updateWaterDrops(dt, time);
          renderFogTexture(time);

          fogFrame = window.requestAnimationFrame(tick);
        };

        fogFrame = window.requestAnimationFrame(tick);
      };

      const resizeFog = () => {
        if (!ctx || !maskCtx) return;

        const rect = fogCanvas.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = Math.max(1, Math.round(rect.width * dpr));
        height = Math.max(1, Math.round(rect.height * dpr));
        fogCanvas.width = width;
        fogCanvas.height = height;
        maskCanvas.width = width;
        maskCanvas.height = height;
        revealCols = 18;
        revealRows = 40;
        revealTotal = revealCols * revealRows;
        revealedCells.clear();
        if (isFogCleared) {
          ctx.clearRect(0, 0, width, height);
          return;
        }
        if (maskCtx) {
          maskCtx.clearRect(0, 0, width, height);
          maskCtx.fillStyle = '#fff';
          maskCtx.fillRect(0, 0, width, height);
        }
        waterDrops.length = 0;
        seedFogTexture();
        renderFogTexture();
        startFogLoop();
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
        if (!ctx || !maskCtx || isFogCleared || isFogDissolving) return;

        const radius = 42 * dpr;
        if (previous) {
          const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
          const steps = Math.max(1, Math.ceil(distance / (radius * 0.42)));
          for (let step = 0; step <= steps; step++) {
            const t = step / steps;
            eraseMaskAt(
              previous.x + (point.x - previous.x) * t,
              previous.y + (point.y - previous.y) * t,
              radius,
              0.22,
            );
          }
        } else {
          eraseMaskAt(point.x, point.y, radius, 0.22);
        }

        const lastOrigin = dissolveOrigins[dissolveOrigins.length - 1];
        const originGap = radius * 0.86;
        if (!lastOrigin || (lastOrigin.x - point.x) ** 2 + (lastOrigin.y - point.y) ** 2 > originGap * originGap) {
          dissolveOrigins.push({ x: point.x, y: point.y });
        }

        renderFogTexture(performance.now());
        markRevealed(point, radius);
      };

      const clearAllFog = () => {
        if (isFogCleared || isFogDissolving) return;

        isFogDissolving = true;
        page1Scene.classList.add('is-fog-dissolving');
        isWiping = false;
        lastPoint = null;
        dissolveStart = performance.now();
        dissolveSources = dissolveOrigins.length
          ? dissolveOrigins.slice(-46)
          : [{ x: width * 0.5, y: height * 0.45 }];
        startFogLoop();
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
