document.addEventListener('DOMContentLoaded', () => {
  let viewportFrame = null;
  const setAppViewportHeight = () => {
    if (viewportFrame) window.cancelAnimationFrame(viewportFrame);
    viewportFrame = window.requestAnimationFrame(() => {
      const visualViewport = window.visualViewport;
      const viewportHeight = visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${viewportHeight}px`);
      window.dispatchEvent(new Event('appviewportchange'));
      viewportFrame = null;
    });
  };

  setAppViewportHeight();
  window.addEventListener('resize', setAppViewportHeight);
  window.visualViewport?.addEventListener('resize', setAppViewportHeight);
  window.visualViewport?.addEventListener('scroll', setAppViewportHeight);

  const page1Scene = document.querySelector('.page1-scene');
  const page2Scene = document.querySelector('.page2-scene');
  const page2Video = document.querySelector('.page2-video');
  const page3Scene = document.querySelector('.page3-scene');
  const page3Photo = document.querySelector('.page3-photo');
  const page3PhotoNext = document.querySelector('.page3-photo-next');
  const page3Count = document.querySelector('.page3-count');
  const backgroundMusic = document.getElementById('background-music');
  const musicToggles = document.querySelectorAll('.music-toggle');
  const pageControlButtons = document.querySelectorAll('[data-control-action]');
  let resetPageOneFog = null;
  let activatePage2 = null;
  let musicWasManuallyPaused = false;

  const setMusicState = (isPlaying) => {
    musicToggles.forEach((toggle) => {
      toggle.setAttribute('aria-pressed', String(isPlaying));
      toggle.setAttribute('aria-label', isPlaying ? 'Pause background music' : 'Play background music');
      toggle.classList.toggle('is-user-paused', !isPlaying && musicWasManuallyPaused);
    });
  };

  const playBackgroundMusic = async ({ userInitiated = false } = {}) => {
    if (!backgroundMusic || !musicToggles.length) return false;
    if (musicWasManuallyPaused && !userInitiated) return false;

    try {
      await backgroundMusic.play();
      setMusicState(true);
      return true;
    } catch (_) {
      setMusicState(false);
      return false;
    }
  };

  const pauseBackgroundMusic = ({ userInitiated = false } = {}) => {
    if (!backgroundMusic) return;
    if (userInitiated) musicWasManuallyPaused = true;
    backgroundMusic.pause();
    setMusicState(false);
  };

  if (backgroundMusic && musicToggles.length) {
    musicToggles.forEach((toggle) => toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      if (backgroundMusic.paused) {
        musicWasManuallyPaused = false;
        playBackgroundMusic({ userInitiated: true });
      } else {
        pauseBackgroundMusic({ userInitiated: true });
      }
    }));
  }

  pageControlButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const action = button.dataset.controlAction;

      if (action === 'fog') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.body.classList.add('page-one-only');
        pauseBackgroundMusic();
        musicWasManuallyPaused = false;
        setMusicState(false);
        resetPageOneFog?.();
        return;
      }

      if (action === 'next') {
        const target = button.dataset.target ? document.querySelector(button.dataset.target) : null;
        const isPageOneNext = target?.id === 'page2' && page1Scene;

        if (isPageOneNext) {
          page1Scene.classList.add('is-exiting-to-page2');
          window.setTimeout(() => {
            document.body.classList.remove('page-one-only', 'is-fog-locked');
            activatePage2?.();
            window.requestAnimationFrame(() => {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          }, 620);
          return;
        }

        document.body.classList.remove('page-one-only', 'is-fog-locked');
        window.requestAnimationFrame(() => {
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    });
  });

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
      let isFogDissolving = false;
      let dissolveStart = 0;
      let dissolveSources = [];
      let hasStartedReveal = false;
      const fogDissolveMs = 3300;
      const dissolveOrigins = [];
      const revealedCells = new Set();
      const fogSpecks = [];
      const fogWisps = [];
      const staticDrops = [];
      if (ctx && maskCtx && fogTextureCtx) document.body.classList.add('is-fog-locked');

      const random = (seed) => {
        const x = Math.sin(seed * 999) * 10000;
        return x - Math.floor(x);
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
      };

      const startFogLoop = () => {
        if (fogFrame || !ctx || !maskCtx) return;

        const startReveal = () => {
          if (hasStartedReveal) return;
          hasStartedReveal = true;
          isFogCleared = true;
          isFogDissolving = false;
          ctx.clearRect(0, 0, width, height);
          maskCtx.clearRect(0, 0, width, height);
          page1Scene.classList.remove('is-fog-dissolving');
          page1Scene.classList.add('is-fog-cleared', 'is-revealed');
          document.body.classList.remove('is-fog-locked');
          window.setTimeout(() => {
            page1Scene.classList.add('is-motion-ready');
            playBackgroundMusic();
          }, 1250);
        };

        const isVisibleFogCleared = (radius, eased) => {
          if (eased > 0.9) return true;

          const rect = fogCanvas.getBoundingClientRect();
          const left = Math.max(0, -rect.left) * dpr;
          const top = Math.max(0, -rect.top) * dpr;
          const right = Math.min(rect.width, window.innerWidth - rect.left) * dpr;
          const bottom = Math.min(rect.height, window.innerHeight - rect.top) * dpr;

          if (right <= left || bottom <= top) return eased > 0.68;

          const samplePoints = [
            { x: left, y: top },
            { x: right, y: top },
            { x: left, y: bottom },
            { x: right, y: bottom },
            { x: (left + right) / 2, y: (top + bottom) / 2 },
          ];

          return samplePoints.every((point) => (
            dissolveSources.some((origin, index) => {
              const seed = index * 17 + 9;
              const driftX = (random(seed) - 0.5) * 44 * dpr * eased;
              const driftY = (random(seed + 1) - 0.5) * 44 * dpr * eased;
              const clearRadius = radius * (0.78 + random(seed + 2) * 0.35);
              return Math.hypot(point.x - origin.x - driftX, point.y - origin.y - driftY) <= clearRadius;
            })
          ));
        };

        const tick = (time) => {
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

            if (!hasStartedReveal && isVisibleFogCleared(radius, eased)) {
              startReveal();
              fogFrame = null;
              return;
            }

            if (elapsed >= 1) {
              startReveal();
              fogFrame = null;
              return;
            }
          }

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
        seedFogTexture();
        buildFogTexture();
        renderFogTexture();
      };

      resetPageOneFog = () => {
        if (fogFrame) {
          window.cancelAnimationFrame(fogFrame);
          fogFrame = null;
        }

        isWiping = false;
        lastPoint = null;
        isFogCleared = false;
        isFogDissolving = false;
        dissolveStart = 0;
        dissolveSources = [];
        hasStartedReveal = false;
        dissolveOrigins.length = 0;
        revealedCells.clear();
        page1Scene.classList.remove('is-fog-dissolving', 'is-fog-cleared', 'is-revealed', 'is-motion-ready', 'is-exiting-to-page2');
        document.body.classList.add('is-fog-locked');
        resizeFog();
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
      window.addEventListener('appviewportchange', resizeFog);
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

    activatePage2 = () => {
      page2Scene.classList.remove('is-motion-ready');
      page2Scene.classList.add('is-active');
      loadPage2Video().then((isReady) => {
        if (isReady) page2Video.play().catch(() => {});
      });
      window.setTimeout(() => {
        page2Scene.classList.add('is-motion-ready');
      }, 950);
    };

    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          activatePage2?.();
        } else {
          page2Video.pause();
          page2Scene.classList.remove('is-active', 'is-motion-ready');
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
