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
      const revealedCells = new Set();
      if (ctx) document.body.classList.add('is-fog-locked');

      const random = (seed) => {
        const x = Math.sin(seed * 999) * 10000;
        return x - Math.floor(x);
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

        ctx.globalAlpha = alpha * 0.2;
        for (let i = 0; i < 520; i++) {
          const x = random(i + 11) * width;
          const y = random(i + 29) * height;
          const r = (random(i + 47) * 1.8 + 0.5) * dpr;
          ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(95,112,95,0.18)';
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }

        for (let i = 0; i < 34; i++) {
          const x = random(i + 101) * width;
          const y = random(i + 131) * height;
          const r = (random(i + 151) * 13 + 8) * dpr;
          const drop = ctx.createRadialGradient(x - r * 0.25, y - r * 0.28, r * 0.05, x, y, r);
          drop.addColorStop(0, 'rgba(255,255,255,0.55)');
          drop.addColorStop(0.35, 'rgba(224,235,235,0.28)');
          drop.addColorStop(0.75, 'rgba(150,165,150,0.16)');
          drop.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = drop;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = alpha * 0.24;
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

        markRevealed(point, radius);
      };

      const clearAllFog = () => {
        if (isFogCleared) return;
        isFogCleared = true;
        ctx?.clearRect(0, 0, width, height);
        page1Scene.classList.add('is-fog-cleared', 'is-revealed');
        document.body.classList.remove('is-fog-locked');
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

        if (revealedCells.size / revealTotal >= 0.2) {
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
