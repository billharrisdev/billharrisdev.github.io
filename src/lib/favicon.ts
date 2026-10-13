// GIF favicons are static in Chromium. Cycle PNG frames explicitly instead.
export function animateFavicon() {
  const icon = document.querySelector<HTMLLinkElement>('#favicon');
  if (!icon) return;
  const original = { href: icon.href, type: icon.type, sizes: icon.sizes.value };
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const image = new Image();
  let frames: string[] = [];
  let frame = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let disposed = false;

  function stop() {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
    icon!.href = original.href;
    icon!.type = original.type;
    icon!.sizes.value = original.sizes;
  }

  function update() {
    stop();
    if (disposed || media.matches || document.hidden) return;
    if (!frames.length) {
      if (!image.src) image.src = `${import.meta.env.BASE_URL}favicon-frames.png`;
      return;
    }
    icon!.type = 'image/png';
    icon!.sizes.value = '32x32';
    icon!.href = frames[frame];
    timer = setInterval(() => {
      frame = (frame + 1) % frames.length;
      icon!.href = frames[frame];
    }, 120);
  }

  image.onload = () => {
    if (disposed) return;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const context = canvas.getContext('2d');
    if (!context || image.height !== 32 || image.width !== 32 * 24) return;
    try {
      frames = Array.from({ length: 24 }, (_, index) => {
        context.clearRect(0, 0, 32, 32);
        context.drawImage(image, index * 32, 0, 32, 32, 0, 0, 32, 32);
        return canvas.toDataURL('image/png');
      });
      update();
    } catch {
      // Keep the static SVG if canvas export is unavailable.
      stop();
    }
  };
  media.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  update();
  return () => {
    disposed = true;
    image.onload = null;
    media.removeEventListener('change', update);
    document.removeEventListener('visibilitychange', update);
    stop();
  };
}
