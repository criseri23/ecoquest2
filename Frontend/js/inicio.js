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

const allCapybaraFrames = new Set(
  Object.values(capybaraAnimations).flatMap((animation) => animation.frames)
);

allCapybaraFrames.forEach((src) => {
  const image = new Image();
  image.src = src;
});

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

  start() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || this.frames.length <= 1 || !this.currentImage) {
      return;
    }

    this.scheduleNextFrame(this.speed * 0.45);
  }

  scheduleNextFrame(extraRest = 0) {
    const naturalVariation = this.speed * (0.1 + Math.random() * 0.22);

    this.timer = window.setTimeout(() => {
      this.advanceFrame();
    }, this.speed + naturalVariation + extraRest);
  }

  advanceFrame() {
    this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    const nextSrc = this.frames[this.currentFrame];

    window.requestAnimationFrame(() => {
      this.currentImage.src = nextSrc;

      const completedLoop = this.currentFrame === 0;
      const loopRest = completedLoop ? this.speed * this.restRatio : 0;
      this.scheduleNextFrame(loopRest);
    });
  }
}

document
  .querySelectorAll("[data-capybara-animation]")
  .forEach((element) => new CapybaraAnimator(element).start());
