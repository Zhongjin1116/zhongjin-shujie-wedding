// Fade-in sections as they scroll into view
document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.media-section, .details-section, .rsvp-section');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  sections.forEach((section) => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(24px)';
    section.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
    observer.observe(section);
  });

  // Smooth scroll hint on hero click
  const hint = document.querySelector('.scroll-hint');
  if (hint) {
    hint.style.cursor = 'pointer';
    hint.addEventListener('click', () => {
      document.querySelector('.media-section')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Hero background video parallax depth effect (pointer-driven, desktop only)
  const hero = document.querySelector('.hero');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (hero && canHover && !reducedMotion) {
    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width - 0.5;
      const my = (e.clientY - rect.top) / rect.height - 0.5;
      hero.style.setProperty('--mx', (mx * 2).toFixed(3));
      hero.style.setProperty('--my', (my * 2).toFixed(3));
    });
    hero.addEventListener('mouseleave', () => {
      hero.style.setProperty('--mx', 0);
      hero.style.setProperty('--my', 0);
    });
  }

  // Background music toggle
  const bgm = document.getElementById('bgm');
  const bgmToggle = document.getElementById('bgm-toggle');
  if (bgm && bgmToggle) {
    bgm.volume = 0.5;

    bgmToggle.addEventListener('click', () => {
      if (bgm.paused) {
        bgm.play().catch(() => {});
      } else {
        bgm.pause();
      }
    });

    bgm.addEventListener('play', () => {
      bgmToggle.classList.add('is-playing');
      bgmToggle.setAttribute('aria-pressed', 'true');
      bgmToggle.setAttribute('aria-label', '暂停背景音乐');
    });

    bgm.addEventListener('pause', () => {
      bgmToggle.classList.remove('is-playing');
      bgmToggle.setAttribute('aria-pressed', 'false');
      bgmToggle.setAttribute('aria-label', '播放背景音乐');
    });
  }
});
