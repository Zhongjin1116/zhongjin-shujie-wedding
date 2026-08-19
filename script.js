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
      const fogTextureCanvas = document.createElement('canvas');
      const fogTextureCtx = fogTextureCanvas.getContext('2d', { alpha: true });
      if (!ctx || !maskCtx || !fogTextureCtx) {
        page1Scene.classList.add('is-fog-cleared', 'is-revealed', 'is-motion-ready');
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
      const wetSources = [];
      let dripBudget = 2;
      if (ctx && maskCtx && fogTextureCtx) document.body.classList.add('is-fog-locked');

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

      const drawMistBead = (targetCtx, x, y, radius, seed, alpha) => {
        const bead = targetCtx.createRadialGradient(
          x - radius * 0.25,
          y - radius * 0.3,
          radius * 0.08,
          x,
          y,
          radius,
        );
        bead.addColorStop(0, `rgba(255,255,255,${0.32 * alpha})`);
        bead.addColorStop(0.55, `rgba(226,235,226,${0.18 * alpha})`);
        bead.addColorStop(1, 'rgba(255,255,255,0)');

        targetCtx.save();
        targetCtx.globalAlpha = 1;
        targetCtx.fillStyle = bead;
        targetCtx.beginPath();
        targetCtx.arc(x, y, radius * (0.82 + random(seed + 5) * 0.24), 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.restore();
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

        for (let i = 0; i < 180; i++) {
          staticDrops.push({
            x: random(i + 101) * width,
            y: random(i + 131) * height,
            r: (random(i + 151) * 1.2 + 0.35) * dpr,
            seed: i + 401,
            alpha: 0.16 + random(i + 173) * 0.22,
          });
        }

        for (let i = 0; i < 28; i++) {
          staticDrops.push({
            x: random(i + 511) * width,
            y: random(i + 523) * height * 0.84,
            r: (random(i + 541) * 1.8 + 1.1) * dpr,
            seed: i + 601,
            alpha: 0.18,
          });
        }
      };

      const buildFogTexture = () => {
        if (!fogTextureCtx || !width || !height) return;

        fogTextureCtx.clearRect(0, 0, width, height);

        const gradient = fogTextureCtx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, 'rgba(227, 235, 226, 0.74)');
        gradient.addColorStop(0.38, 'rgba(195, 210, 194, 0.64)');
        gradient.addColorStop(0.72, 'rgba(222, 229, 219, 0.58)');
        gradient.addColorStop(1, 'rgba(245, 245, 236, 0.76)');
        fogTextureCtx.fillStyle = gradient;
        fogTextureCtx.fillRect(0, 0, width, height);

        fogTextureCtx.globalAlpha = 0.13;
        fogWisps.forEach((wisp) => {
          fogTextureCtx.strokeStyle = `rgba(255,255,255,${wisp.alpha})`;
          fogTextureCtx.lineWidth = 0.75 * dpr;
          fogTextureCtx.beginPath();
          fogTextureCtx.moveTo(0, wisp.y);
          fogTextureCtx.bezierCurveTo(
            width * 0.26,
            wisp.y - wisp.wave,
            width * 0.58,
            wisp.y + wisp.wave,
            width,
            wisp.y - wisp.wave * 0.25,
          );
          fogTextureCtx.stroke();
        });

        fogTextureCtx.globalAlpha = 0.2;
        fogSpecks.forEach((speck) => {
          fogTextureCtx.fillStyle = speck.light ? 'rgba(255,255,255,0.42)' : 'rgba(76,96,76,0.18)';
          fogTextureCtx.beginPath();
          fogTextureCtx.arc(speck.x, speck.y, speck.r, 0, Math.PI * 2);
          fogTextureCtx.fill();
        });

        staticDrops.forEach((drop) => drawMistBead(fogTextureCtx, drop.x, drop.y, drop.r, drop.seed, drop.alpha));
        fogTextureCtx.globalAlpha = 1;
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

      const addWetSource = (x, y, radius, seed = Math.random()) => {
        if (!width || !height) return;

        const edgeAngle = Math.PI * (0.12 + random(seed * 1000 + 17) * 0.76);
        const edgeRadius = radius * (0.82 + random(seed * 1000 + 31) * 0.16);
        const edgeX = x + Math.cos(edgeAngle) * edgeRadius;
        const edgeY = y + Math.sin(edgeAngle) * edgeRadius;

        wetSources.push({
          x: Math.min(width, Math.max(0, edgeX)),
          y: Math.min(height, Math.max(0, edgeY)),
          radius: radius * 0.45,
          age: 0,
          life: 7 + Math.random() * 4,
        });

        if (wetSources.length > 32) {
          wetSources.splice(0, wetSources.length - 32);
        }
      };

      const spawnWaterDrop = (source) => {
        if (waterDrops.length >= 2 || dripBudget <= 0 || !width || !height || !source) return;

        const seed = Math.random() * 1000;
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * source.radius * 0.2;
        const r = (1.4 + Math.random() * 3.1) * dpr;
        dripBudget -= 1;
        waterDrops.push({
          x: source.x + Math.cos(angle) * distance,
          y: source.y + Math.sin(angle) * distance * 0.25,
          r,
          vx: 0,
          vy: (0.45 + Math.random() * 2.1) * dpr,
          seed,
          age: 0,
          wobble: Math.random() * Math.PI * 2,
          stuck: 1.05 + Math.random() * 1.7,
          trail: 0,
          drift: (0.8 + Math.random() * 1.9) * dpr,
          driftRate: 1.4 + Math.random() * 1.8,
        });
      };

      const updateWaterDrops = (dt, time) => {
        if (!maskCtx || isFogCleared) return;

        for (let i = wetSources.length - 1; i >= 0; i--) {
          wetSources[i].age += dt;
          if (wetSources[i].age > wetSources[i].life) {
            wetSources.splice(i, 1);
          }
        }

        const spawnRate = isFogDissolving || !wetSources.length || dripBudget <= 0 ? 0 : Math.min(0.34, 0.08 + wetSources.length * 0.006);
        if (Math.random() < dt * spawnRate) {
          const source = wetSources[Math.floor(Math.random() * wetSources.length)];
          spawnWaterDrop(source);
        }

        for (let i = waterDrops.length - 1; i >= 0; i--) {
          const drop = waterDrops[i];
          drop.age += dt;
          drop.wobble += dt * 3.2;

          const wasStuck = drop.stuck > 0;
          if (wasStuck) {
            drop.stuck -= dt;
            drop.r += 0.04 * dpr * dt;
          } else {
            drop.vy += (3.8 + drop.r * 1.7) * dpr * dt;
            drop.vy = Math.min(drop.vy, (8.5 + drop.r * 3.2) * dpr);
          }

          drop.vx = Math.sin(drop.wobble + time * 0.001 * drop.driftRate + drop.seed) * drop.drift;

          const prevX = drop.x;
          const prevY = drop.y;
          drop.x += drop.vx * dt;
          drop.y += drop.vy * dt;

          const distance = Math.hypot(drop.x - prevX, drop.y - prevY);
          drop.trail += distance;
          const trailRadius = Math.max(0.65 * dpr, drop.r * 0.36);
          const step = Math.max(1.1 * dpr, trailRadius);

          while (drop.trail > step) {
            drop.trail -= step;
            const ratio = distance ? drop.trail / distance : 0;
            eraseMaskAt(
              drop.x - (drop.x - prevX) * ratio,
              drop.y - (drop.y - prevY) * ratio,
              trailRadius,
              0.08,
            );
          }

          drop.r -= distance * 0.0022;

          if (drop.r < 0.7 * dpr || drop.y > height + 28 * dpr || drop.x < -30 * dpr || drop.x > width + 30 * dpr) {
            waterDrops.splice(i, 1);
          }
        }
      };

      const renderFogTexture = (time = 0) => {
        if (!ctx || !maskCtx || !width || !height) return;

        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(fogTextureCanvas, 0, 0);

        ctx.globalCompositeOperation = 'destination-in';
        ctx.globalAlpha = 1;
        ctx.drawImage(maskCanvas, 0, 0);
        ctx.restore();

        waterDrops.forEach((drop) => {
          const stretch = Math.min(drop.vy / (90 * dpr), 0.45);
          drawDrop(drop.x, drop.y, drop.r, drop.seed, Math.min(0.34, 0.1 + drop.age * 0.55), stretch);
        });
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
              page1Scene.classList.add('is-fog-cleared');
              document.body.classList.remove('is-fog-locked');
              window.setTimeout(() => {
                page1Scene.classList.add('is-revealed');
              }, 500);
              window.setTimeout(() => {
                page1Scene.classList.add('is-motion-ready');
              }, 1550);
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
        if (!ctx || !maskCtx || !fogTextureCtx) return;

        const rect = fogCanvas.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = Math.max(1, Math.round(rect.width * dpr));
        height = Math.max(1, Math.round(rect.height * dpr));
        fogCanvas.width = width;
        fogCanvas.height = height;
        maskCanvas.width = width;
        maskCanvas.height = height;
        fogTextureCanvas.width = width;
        fogTextureCanvas.height = height;
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
        wetSources.length = 0;
        dripBudget = 2;
        seedFogTexture();
        buildFogTexture();
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
            const x = previous.x + (point.x - previous.x) * t;
            const y = previous.y + (point.y - previous.y) * t;
            eraseMaskAt(
              x,
              y,
              radius,
              0.22,
            );
            if (step % 4 === 0) addWetSource(x, y, radius, step + point.x * 0.01 + point.y * 0.02);
          }
        } else {
          eraseMaskAt(point.x, point.y, radius, 0.22);
          addWetSource(point.x, point.y, radius, point.x * 0.01 + point.y * 0.02);
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
