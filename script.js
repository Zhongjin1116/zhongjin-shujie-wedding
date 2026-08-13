// Fade-in sections as they scroll into view
document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.media-section, .details-section, .rsvp-section');
  const page1Scene = document.querySelector('.page1-scene');

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

});
