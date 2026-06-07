/**
 * BlurSplitText — Reusable GSAP Blur Reveal Animation
 *
 * Usage:
 *   new BlurSplitText({
 *     el: document.querySelector('.my-title'),
 *     splitType: 'chars',         // 'chars' | 'words' | 'lines'
 *     blurColor: '#00b4d8',       // blur glow color
 *     textColor: '#c8cee0',       // final text color (optional = inherit)
 *     blurAmount: 18,             // blur intensity in px
 *     stagger: 0.12,              // stagger between elements
 *     duration: 0.3,              // focus phase duration
 *     delay: 0,                   // delay before start
 *     randomOrder: true,          // randomize reveal order
 *     isDisableRevert: false,     // keep split DOM after animation
 *   });
 */

class BlurSplitText {
  constructor({ el, delay = 0, splitType = 'chars', blurColor = '#00b4d8', textColor, blurAmount = 18, stagger = 0.12, duration = 0.3, randomOrder = true, isDisableRevert = false, ...props }) {
    if (!el || el.textContent.trim() === '') return;

    this.DOM = { el };
    this.delay = delay;
    this.splitType = splitType;
    this.blurColor = blurColor;
    this.textColor = textColor;
    this.blurAmount = blurAmount;
    this.stagger = stagger;
    this.duration = duration;
    this.randomOrder = randomOrder;
    this.isDisableRevert = isDisableRevert;
    this.extraProps = props;
    this.textSplit = null;
    this.animation = null;

    document.fonts.ready.then(() => {
      this._init();
    });
  }

  // ── Helpers ──────────────────────────────────────────
  static _hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }

  static _lighten(hex, amount = 40) {
    const { r, g, b } = BlurSplitText._hexToRgb(hex);
    return `rgb(${Math.min(255, r + amount)}, ${Math.min(255, g + amount)}, ${Math.min(255, b + amount)})`;
  }

  static _darken(hex, amount = 40) {
    const { r, g, b } = BlurSplitText._hexToRgb(hex);
    return `rgb(${Math.max(0, r - amount)}, ${Math.max(0, g - amount)}, ${Math.max(0, b - amount)})`;
  }

  static _shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // ── Core ─────────────────────────────────────────────
  _init() {
    gsap.set(this.DOM.el, { width: this.DOM.el.offsetWidth + 5 });

    if (typeof SplitText !== 'undefined') {
      let splitConfig;
      switch (this.splitType) {
        case 'chars':
          splitConfig = { type: 'lines words chars', mask: 'lines' };
          break;
        case 'words':
          splitConfig = { type: 'lines words', mask: 'lines' };
          break;
        case 'lines':
        default:
          splitConfig = { type: 'lines', mask: 'lines' };
          break;
      }

      this.textSplit = SplitText.create(this.DOM.el, {
        ...splitConfig,
        onSplit: (self) => {
          this._animate(self);
        },
      });
    } else {
      this._initFallback();
    }
  }

  _initFallback() {
    const text = this.DOM.el.textContent.trim();
    this.DOM.el.innerHTML = '';
    const elements = [];

    if (this.splitType === 'chars') {
      for (const char of text) {
        const span = document.createElement('span');
        span.style.display = 'inline-block';
        if (char === ' ') {
          span.innerHTML = '&nbsp;';
          span.dataset.space = 'true';
        } else {
          span.textContent = char;
        }
        this.DOM.el.appendChild(span);
        elements.push(span);
      }
    } else if (this.splitType === 'words') {
      text.split(/\s+/).forEach((word, i, arr) => {
        const span = document.createElement('span');
        span.style.display = 'inline-block';
        span.textContent = word;
        this.DOM.el.appendChild(span);
        elements.push(span);
        if (i < arr.length - 1) {
          const space = document.createTextNode('\u00A0');
          this.DOM.el.appendChild(space);
        }
      });
    } else {
      elements.push(this.DOM.el);
    }

    const targets = elements.filter((el) => !el.dataset?.space);
    elements.filter((el) => el.dataset?.space).forEach((el) => {
      el.style.opacity = '1';
    });

    const mockSplit = {
      [this.splitType]: targets,
      elements: [this.DOM.el],
      revert: () => { this.DOM.el.textContent = text; },
    };

    this._animate(mockSplit);
  }

  _animate(splitInstance) {
    const targets = splitInstance[this.splitType];
    if (!targets || targets.length === 0) return;

    const { r, g, b } = BlurSplitText._hexToRgb(this.blurColor);
    const glowColor = BlurSplitText._lighten(this.blurColor, 40);
    const darkColor = BlurSplitText._darken(this.blurColor, 40);
    const halfBlur = Math.round(this.blurAmount / 2);

    gsap.set(targets, {
      autoAlpha: 0,
      filter: `blur(${this.blurAmount + 4}px) brightness(1.5)`,
      color: darkColor,
      yPercent: 20,
      scale: 0.92,
    });

    const ordered = this.randomOrder
      ? BlurSplitText._shuffle(Array.from(targets))
      : Array.from(targets);

    const tl = gsap.timeline({
      delay: this.delay,
      onComplete: () => {
        if (!this.isDisableRevert) {
          splitInstance.revert();
        }
      },
      onStart: () => {
        setTimeout(() => {
          this.DOM.el.querySelectorAll('.txt-strike').forEach((el) => el.classList.add('active'));
          this.DOM.el.querySelectorAll('.heading-decor').forEach((el) => el.classList.add('active'));
        }, 450);
      },
    });

    ordered.forEach((target, order) => {
      const offset = order * this.stagger;

      // Step 1: Blurry glow appear
      tl.to(target, {
        autoAlpha: 0.5,
        filter: `blur(${this.blurAmount}px) brightness(2)`,
        color: this.blurColor,
        yPercent: 10,
        scale: 0.95,
        textShadow: `0 0 40px rgba(${r},${g},${b},0.7), 0 0 80px rgba(${r},${g},${b},0.3)`,
        duration: 0.15,
        ease: 'power1.out',
      }, `start+=${offset}`);

      // Step 2: Intensify glow
      tl.to(target, {
        autoAlpha: 0.95,
        filter: `blur(${halfBlur}px) brightness(2.5)`,
        color: glowColor,
        yPercent: 5,
        scale: 1.02,
        textShadow: `0 0 50px rgba(${r},${g},${b},0.9), 0 0 100px rgba(${r},${g},${b},0.5)`,
        duration: 0.15,
        ease: 'power2.in',
      }, `start+=${offset + 0.12}`);

      // Step 3: Snap to focus
      tl.to(target, {
        autoAlpha: 1,
        filter: 'blur(0px) brightness(1)',
        color: this.textColor || '',
        yPercent: 0,
        scale: 1,
        textShadow: `0 0 20px rgba(${r},${g},${b},0.1)`,
        duration: this.duration,
        ease: 'power3.out',
        willChange: 'transform, opacity, filter',
        ...this.extraProps,
      }, `start+=${offset + 0.22}`);
    });

    this.animation = tl;
  }
}


// ═══════════════════════════════════════════════════════
// ScrollTrigger: Auto-init all [data-blur-reveal] elements
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  // Collect all elements with data-blur-reveal
  const revealElements = document.querySelectorAll('[data-blur-reveal]');

  revealElements.forEach((el) => {
    const splitType = el.dataset.split || 'words';
    const blurColor = el.dataset.color || '#00b4d8';
    const stagger = parseFloat(el.dataset.stagger) || (splitType === 'chars' ? 0.08 : 0.06);
    const blurAmount = parseInt(el.dataset.blur) || 16;
    const randomOrder = el.dataset.random !== 'false'; // default true

    // Determine if this is the hero section (animate immediately)
    const isHero = el.closest('.section--hero') !== null;

    if (isHero) {
      // Hero: animate on page load with staggered delay
      const heroDelay = parseFloat(el.dataset.delay) || 0;
      new BlurSplitText({
        el,
        splitType,
        blurColor,
        blurAmount,
        stagger,
        randomOrder,
        isDisableRevert: true,
        delay: 0.3 + heroDelay,
      });
    } else {
      // Other sections: trigger at 80% viewport with ScrollTrigger
      ScrollTrigger.create({
        trigger: el,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          new BlurSplitText({
            el,
            splitType,
            blurColor,
            blurAmount,
            stagger,
            randomOrder,
            isDisableRevert: true,
          });
        },
      });

      // Pre-hide element until ScrollTrigger fires
      gsap.set(el, { autoAlpha: 0 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          gsap.set(el, { autoAlpha: 1 });
        },
      });
    }
  });
})();
