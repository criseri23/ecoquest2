const capybaraAnimations = {
  idle: {
    frames: [
      "../img/carpinchos/idle-1.png",
      "../img/carpinchos/idle-2.png",
      "../img/carpinchos/idle-3.png",
      "../img/carpinchos/idle-2.png",
    ],
    restRatio: 0.9,
  },
  bolsa: {
    frames: [
      "../img/carpinchos/bolsa-1.png",
      "../img/carpinchos/bolsa-2.png",
      "../img/carpinchos/bolsa-3.png",
      "../img/carpinchos/bolsa-4.png",
      "../img/carpinchos/bolsa-3.png",
      "../img/carpinchos/bolsa-2.png",
    ],
    restRatio: 0.55,
  },
  kayak: {
    frames: [
      "../img/carpinchos/kayak-1.png",
      "../img/carpinchos/kayak-2.png",
      "../img/carpinchos/kayak-3.png",
      "../img/carpinchos/kayak-4.png",
      "../img/carpinchos/kayak-3.png",
      "../img/carpinchos/kayak-2.png",
    ],
    restRatio: 0.12,
  },
};

const assetVersionByAnimation = {
  kayak: "kayak-clean-1",
};

Object.entries(capybaraAnimations).forEach(([name, animation]) => {
  const version = assetVersionByAnimation[name];

  if (version) {
    animation.frames = animation.frames.map((src) => `${src}?v=${version}`);
  }
});

// Conservamos las imágenes precargadas; nunca mostramos un cuadro sin cargar.
const capybaraFrameCache = new Map();
function loadCapybaraFrame(src) {
  if (!capybaraFrameCache.has(src)) {
    const image = new Image();
    const loaded = new Promise(resolve => {
      const timeout = setTimeout(() => resolve(null), 15000);
      image.onload = () => { clearTimeout(timeout); resolve(image); };
      image.onerror = () => { clearTimeout(timeout); resolve(null); };
      image.src = src;
    });
    capybaraFrameCache.set(src, loaded);
  }
  return capybaraFrameCache.get(src);
}

class CapybaraAnimator {
  constructor(element) {
    const animation = capybaraAnimations[element.dataset.capybaraAnimation];

    this.element = element;
    this.body = element.querySelector(".home-capybara-body") || element;
    this.currentImage =
      element.querySelector(".home-capybara-frame-current") ||
      element.querySelector("img");
    this.frames = animation?.frames || [];
    this.restRatio = animation?.restRatio || 0;
    this.speed = Number(element.dataset.capybaraSpeed) || 900;
    this.currentFrame = 0;
    this.timer = null;
  }

  async start() {
    if (this.started || this.loading || document.hidden || !window.EcoQuestMotion.enabled) return;
    this.loading = true;
    const images = await Promise.all(this.frames.map(loadCapybaraFrame));
    this.loading = false;
    this.loadedFrames = images.filter(Boolean);
    const reduceMotion = !window.EcoQuestMotion.enabled;

    if (reduceMotion || document.hidden || this.loadedFrames.length <= 1 || !this.currentImage) {
      return;
    }

    this.started = true;
    this.scheduleNextFrame(this.speed * 0.45);
  }

  stop() {
    this.started = false;
    clearTimeout(this.timer);
  }

  scheduleNextFrame(extraRest = 0) {
    if (!this.started) return;
    const naturalVariation = this.speed * (0.1 + Math.random() * 0.22);

    this.timer = window.setTimeout(() => {
      this.advanceFrame();
    }, this.speed + naturalVariation + extraRest);
  }

  advanceFrame() {
    if (!this.started) return;
    this.currentFrame = (this.currentFrame + 1) % this.loadedFrames.length;
    const nextSrc = this.loadedFrames[this.currentFrame].src;

    window.requestAnimationFrame(() => {
      if (!this.started) return;
      this.currentImage.src = nextSrc;

      const completedLoop = this.currentFrame === 0;
      const loopRest = completedLoop ? this.speed * this.restRatio : 0;
      this.scheduleNextFrame(loopRest);
    });
  }
}

const capybaraAnimators = Array.from(document.querySelectorAll("[data-capybara-animation]"), element => new CapybaraAnimator(element));
function updateCapybaraAnimations() {
  capybaraAnimators.forEach(animator => {
    if (document.hidden || !window.EcoQuestMotion.enabled) animator.stop();
    else animator.start();
  });
}
window.addEventListener("ecoquest-motion-change", updateCapybaraAnimations);
document.addEventListener("visibilitychange", updateCapybaraAnimations);
updateCapybaraAnimations();
