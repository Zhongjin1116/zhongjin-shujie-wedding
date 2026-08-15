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
    const triggerSticker = (sticker) => {
      if (!sticker || sticker.classList.contains('is-wiggling')) return;
      sticker.classList.add('is-wiggling');
      window.setTimeout(() => sticker.classList.remove('is-wiggling'), 760);
    };

    page1Scene.querySelectorAll('.page1-item').forEach((sticker) => {
      sticker.addEventListener('pointerdown', () => triggerSticker(sticker));
      sticker.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'mouse') return;
        triggerSticker(sticker);
      });
    });

    page1Scene.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse') return;
      const target = document.elementFromPoint(event.clientX, event.clientY);
      triggerSticker(target?.closest('.page1-item'));
    });
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
