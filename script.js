document.addEventListener('DOMContentLoaded', () => {
  const PAGE_TRANSITION_MS = 780;
  const PAGE2_START_DELAY_MS = 620;
  const CAMERA_ENTER_MS = 950;
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
  const page2Camera = document.querySelector('.page2-camera');
  const page2Locations = document.querySelector('.page2-locations');
  const page2Video = document.querySelector('.page2-video');
  const page3Scene = document.querySelector('.page3-scene');
  const page3Track = document.querySelector('.page3-track');
  const backgroundMusic = document.getElementById('background-music');
  const musicToggles = document.querySelectorAll('.music-toggle');
  const pageControlButtons = document.querySelectorAll('[data-control-action]');
  const page1Controls = document.querySelector('.page1-controls');
  const rsvpLinks = document.querySelectorAll('[data-rsvp-link]');
  let resetPageOneFog = null;
  let activatePage2 = null;
  let returnToPageOne = null;
  let clearPage2State = null;
  let activatePage3 = null;
  let returnToPageTwoFromPageThree = null;
  let showNextPage3Slide = null;
  let showPreviousPage3Slide = null;
  let isMusicPrimed = false;
  let musicWasManuallyPaused = false;

  const setMusicState = (isPlaying) => {
    musicToggles.forEach((toggle) => {
      toggle.setAttribute('aria-pressed', String(isPlaying));
      toggle.setAttribute('aria-label', isPlaying ? 'Pause background music' : 'Play background music');
      toggle.classList.toggle('is-user-paused', !isPlaying && musicWasManuallyPaused);
    });
  };

  const updatePage2LocationsPosition = () => {
    if (!page2Scene || !page2Camera || !page2Locations || !page1Controls) return;

    const cameraBodyBottom = page2Camera.offsetTop + page2Camera.offsetHeight * 0.72;
    const controlsTop = page1Controls.offsetTop;
    if (!cameraBodyBottom || !controlsTop || controlsTop <= cameraBodyBottom) return;

    page2Scene.style.setProperty('--page2-locations-top', `${(cameraBodyBottom + controlsTop) / 2}px`);
  };

  window.addEventListener('appviewportchange', updatePage2LocationsPosition);
  window.addEventListener('resize', updatePage2LocationsPosition);

  const primeBackgroundMusic = async () => {
    if (!backgroundMusic || isMusicPrimed || musicWasManuallyPaused) return false;

    try {
      backgroundMusic.muted = true;
      backgroundMusic.volume = 0;
      await backgroundMusic.play();
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
      isMusicPrimed = true;
      setMusicState(false);
      return true;
    } catch (_) {
      backgroundMusic.muted = false;
      backgroundMusic.volume = 1;
      return false;
    }
  };

  const playBackgroundMusic = async ({ userInitiated = false, restart = false } = {}) => {
    if (!backgroundMusic || !musicToggles.length) return false;
    if (musicWasManuallyPaused && !userInitiated) return false;

    try {
      backgroundMusic.muted = false;
      backgroundMusic.volume = 1;
      if (restart) backgroundMusic.currentTime = 0;
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
    backgroundMusic.muted = false;
    backgroundMusic.volume = 1;
    backgroundMusic.pause();
    setMusicState(false);
  };

  const resetStartPageAudio = () => {
    pauseBackgroundMusic();
    if (backgroundMusic) backgroundMusic.currentTime = 0;
    isMusicPrimed = false;
    musicWasManuallyPaused = false;
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

  const getRsvpHref = (target) => {
    if (!target) return '';
    if (target.href) return target.href;
    if (target.dataset?.rsvpHref) return target.dataset.rsvpHref;
    return target.querySelector?.('a[href]')?.href || 'rsvp.html?from=page3';
  };

  const openRsvpFromPage3 = (target, event) => {
    const rsvpLink = target.closest?.('[data-rsvp-link]');
    if (!rsvpLink) return false;

    event?.preventDefault();
    event?.stopPropagation();
    window.sessionStorage?.setItem('weddingReturnState', 'page3-rsvp');
    window.location.href = getRsvpHref(rsvpLink);
    return true;
  };

  rsvpLinks.forEach((link) => {
    link.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });

    link.addEventListener('pointerup', (event) => {
      openRsvpFromPage3(link, event);
    });

    link.addEventListener('click', (event) => {
      openRsvpFromPage3(link, event);
    });

    link.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      openRsvpFromPage3(link, event);
    });
  });

  document.addEventListener('pointerup', (event) => {
    openRsvpFromPage3(event.target, event);
  }, true);

  document.addEventListener('click', (event) => {
    openRsvpFromPage3(event.target, event);
  }, true);

  pageControlButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const action = button.dataset.controlAction;

      if (action === 'fog') {
        if (page1Scene?.classList.contains('is-page3')) {
          showPreviousPage3Slide?.();
          return;
        }

        if (page1Scene?.classList.contains('is-page2')) {
          returnToPageOne?.();
          return;
        }

        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.body.classList.add('page-one-only');
        resetStartPageAudio();
        resetPageOneFog?.();
        return;
      }

      if (action === 'next') {
        const target = button.dataset.target ? document.querySelector(button.dataset.target) : null;
        const isPageOneNext = target?.id === 'page2-inline' && page1Scene;

        if (isPageOneNext) {
          if (page1Scene.classList.contains('is-page3')) {
            showNextPage3Slide?.();
            return;
          }

          if (page1Scene.classList.contains('is-page2')) {
            activatePage3?.();
            return;
          }

          page1Scene.classList.add('is-exiting-to-page2');
          window.setTimeout(() => {
            page1Scene.classList.add('is-page2');
            activatePage2?.();
          }, PAGE2_START_DELAY_MS);
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
        page1Scene.classList.add('is-fog-cleared', 'is-revealed', 'is-motion-ready', 'is-page1-settled');
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

        staticDrops.forEach((drop) => drawMistBead(
          fogTextureCtx,
          drop.x,
          drop.y,
          drop.r,
          drop.seed,
          drop.alpha,
        ));
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
            page1Scene.classList.add('is-motion-ready', 'is-page1-settled');
            playBackgroundMusic({ restart: true });
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
        page1Scene.classList.remove('is-fog-dissolving', 'is-fog-cleared', 'is-revealed', 'is-motion-ready', 'is-page1-settled', 'is-exiting-to-page2', 'is-page2', 'is-entering-page3', 'is-page3', 'is-returning-to-page1');
        page3Scene?.classList.remove('is-active', 'is-leaving');
        if (page3Scene) {
          page3Scene.setAttribute('aria-hidden', 'true');
          page3Scene.style.setProperty('--page3-index', '0');
        }
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
        primeBackgroundMusic();
        isWiping = true;
        fogCanvas.setPointerCapture?.(event.pointerId);
        lastPoint = canvasPoint(event);
        wipeAt(lastPoint);
      });

      fogCanvas.addEventListener('touchstart', () => {
        primeBackgroundMusic();
      }, { passive: true });

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
    clearPage2State = () => {
      page2Video.pause();
      page2Video.currentTime = 0;
      page2Scene.classList.remove('is-active', 'is-motion-ready', 'is-leaving');
      page2Scene.setAttribute('aria-hidden', 'true');
    };

    const loadPage2Video = async () => {
      if (page2Video.dataset.ready === 'true') return true;
      if (page2Video.dataset.ready === 'false') return false;

      const videoSrc = page2Video.dataset.src;
      if (!videoSrc) return false;

      const source = document.createElement('source');
      source.src = videoSrc;
      source.type = 'video/mp4';
      page2Video.append(source);
      page2Video.load();
      page2Video.dataset.ready = 'true';
      return true;
    };

    activatePage2 = () => {
      page1Scene?.classList.remove('is-returning-to-page1');
      page2Scene.classList.remove('is-motion-ready');
      page2Scene.classList.add('is-active');
      page2Scene.setAttribute('aria-hidden', 'false');
      window.requestAnimationFrame(updatePage2LocationsPosition);
      loadPage2Video().then((isReady) => {
        if (isReady) page2Video.play().catch(() => {});
      });
      window.setTimeout(() => {
        updatePage2LocationsPosition();
        page2Scene.classList.add('is-motion-ready');
      }, CAMERA_ENTER_MS);
    };

    returnToPageOne = () => {
      if (!page1Scene || page2Scene.classList.contains('is-leaving')) return;

      page2Scene.classList.remove('is-motion-ready');
      page2Scene.classList.add('is-leaving');
      page1Scene.classList.remove('is-exiting-to-page2', 'is-page2', 'is-page3', 'is-entering-page3');
      page1Scene.classList.add('is-returning-to-page1');

      window.setTimeout(() => {
        clearPage2State();
        page1Scene.classList.remove('is-returning-to-page1');
      }, PAGE_TRANSITION_MS);
    };
  }

  if (page1Scene && page3Scene && page3Track) {
    const page3SlideCount = page3Track.querySelectorAll('.page3-polaroid').length;
    let page3Index = 0;
    let page3TouchStartX = 0;
    let page3TouchStartY = 0;
    let page3PointerId = null;
    let isPage3Transitioning = false;

    const setPage3Index = (nextIndex) => {
      page3Index = Math.max(0, Math.min(page3SlideCount - 1, nextIndex));
      page3Scene.style.setProperty('--page3-index', String(page3Index));
    };

    showNextPage3Slide = () => {
      if (page3Index >= page3SlideCount - 1) {
        window.sessionStorage?.setItem('weddingReturnState', 'page3-rsvp');
        window.location.href = 'rsvp.html?from=page3';
        return;
      }

      setPage3Index(page3Index + 1);
    };

    showPreviousPage3Slide = () => {
      if (page3Index > 0) {
        setPage3Index(page3Index - 1);
        return;
      }

      returnToPageTwoFromPageThree?.();
    };

    activatePage3 = () => {
      if (!page2Scene || page3Scene.classList.contains('is-active') || isPage3Transitioning) return;

      isPage3Transitioning = true;
      page2Scene.classList.remove('is-motion-ready');
      page2Scene.classList.add('is-leaving');
      page1Scene.classList.remove('is-page2', 'is-exiting-to-page2', 'is-returning-to-page1');
      page1Scene.classList.add('is-entering-page3');
      page3Scene.classList.add('is-active');
      page3Scene.classList.remove('is-leaving');
      page3Scene.setAttribute('aria-hidden', 'false');
      setPage3Index(0);
      page3Track.offsetHeight;

      window.setTimeout(() => {
        clearPage2State?.();
        page1Scene.classList.remove('is-entering-page3');
        page1Scene.classList.add('is-page3');
        isPage3Transitioning = false;
      }, PAGE_TRANSITION_MS);
    };

    returnToPageTwoFromPageThree = () => {
      if (!page2Scene || page3Scene.classList.contains('is-leaving') || isPage3Transitioning) return;

      isPage3Transitioning = true;
      page3Scene.classList.add('is-leaving');
      page1Scene.classList.remove('is-page3');
      page1Scene.classList.add('is-page2');
      activatePage2?.();

      window.setTimeout(() => {
        page3Scene.classList.remove('is-active', 'is-leaving');
        page3Scene.setAttribute('aria-hidden', 'true');
        setPage3Index(0);
        isPage3Transitioning = false;
      }, PAGE_TRANSITION_MS);
    };

    page3Scene.addEventListener('pointerdown', (event) => {
      if (!page3Scene.classList.contains('is-active')) return;
      page3PointerId = event.pointerId;
      page3TouchStartX = event.clientX;
      page3TouchStartY = event.clientY;
      page3Scene.setPointerCapture?.(event.pointerId);
    });

    page3Scene.addEventListener('pointerup', (event) => {
      if (page3PointerId !== event.pointerId) return;

      const deltaX = event.clientX - page3TouchStartX;
      const deltaY = event.clientY - page3TouchStartY;
      page3PointerId = null;

      if (Math.abs(deltaX) < 36 || Math.abs(deltaX) < Math.abs(deltaY) * 1.15) return;
      setPage3Index(page3Index + (deltaX < 0 ? 1 : -1));
    });

    page3Scene.addEventListener('pointercancel', () => {
      page3PointerId = null;
    });

    setPage3Index(0);

    const shouldRestoreRsvpState = () => {
      const params = new URLSearchParams(window.location.search);
      return params.get('state') === 'page3-rsvp'
        || window.sessionStorage?.getItem('weddingReturnState') === 'page3-rsvp';
    };

    if (shouldRestoreRsvpState()) {
      window.sessionStorage?.removeItem('weddingReturnState');
      document.body.classList.add('page-one-only');
      document.body.classList.remove('is-fog-locked');
      page1Scene.classList.add('is-fog-cleared', 'is-revealed', 'is-motion-ready', 'is-page1-settled', 'is-page3');
      page1Scene.classList.remove('is-exiting-to-page2', 'is-page2', 'is-entering-page3', 'is-returning-to-page1');
      page3Scene.classList.add('is-active', 'is-restoring');
      page3Scene.classList.remove('is-leaving');
      page3Scene.setAttribute('aria-hidden', 'false');
      setPage3Index(page3SlideCount - 1);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          page3Scene.classList.remove('is-restoring');
        });
      });
      if (window.location.search) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }

});
