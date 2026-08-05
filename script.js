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
});
