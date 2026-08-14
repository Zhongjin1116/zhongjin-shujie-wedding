document.addEventListener('DOMContentLoaded', () => {
  const page1Scene = document.querySelector('.page1-scene');

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
