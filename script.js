// Fade-in sections as they scroll into view
document.addEventListener('DOMContentLoaded', () => {
  const heroVideo = document.querySelector('.hero-video');

  if (heroVideo) {
    let reversing = false;
    let reverseFrame = null;

    const playForward = () => {
      reversing = false;
      if (reverseFrame) cancelAnimationFrame(reverseFrame);
      heroVideo.currentTime = 0;
      heroVideo.play().catch(() => {});
    };

    const playReverse = () => {
      if (!Number.isFinite(heroVideo.duration) || heroVideo.duration <= 0) {
        playForward();
        return;
      }

      reversing = true;
      heroVideo.pause();
      const startTime = performance.now();
      const duration = heroVideo.duration;
      const reverseDuration = duration * 1000;

      const step = (now) => {
        const elapsed = now - startTime;
        const nextTime = Math.max(duration - (elapsed / reverseDuration) * duration, 0);
        heroVideo.currentTime = nextTime;

        if (nextTime > 0 && reversing) {
          reverseFrame = requestAnimationFrame(step);
          return;
        }

        playForward();
      };

      reverseFrame = requestAnimationFrame(step);
    };

    heroVideo.addEventListener('ended', playReverse);
    heroVideo.addEventListener('loadedmetadata', playForward, { once: true });
  }

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
});
