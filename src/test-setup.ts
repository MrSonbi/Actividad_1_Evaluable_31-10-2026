// Polyfills for running unit tests under jsdom (the default Vitest environment).

// jsdom implements `CSSStyleSheet` but does not fully support
// `adoptedStyleSheets`, which Stencil (Ionic's web-component compiler) reads as
// an array while initialising components. Some jsdom versions expose the
// property returning `undefined`, so checking for `in` is not enough.
function ensureAdoptedStyleSheets(target: object): void {
  const current = (target as { adoptedStyleSheets?: unknown }).adoptedStyleSheets;
  if (Array.isArray(current)) return;

  Object.defineProperty(target, 'adoptedStyleSheets', {
    configurable: true,
    writable: true,
    value: [],
  });
}

ensureAdoptedStyleSheets(document);
if (typeof ShadowRoot !== 'undefined') {
  ensureAdoptedStyleSheets(ShadowRoot.prototype);
}

// Ionic components such as ion-menu and ion-split-pane query `window.matchMedia`,
// which jsdom does not implement.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// Minimal ResizeObserver stub for Ionic components
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Prevent IntersectionObserver issues
if (typeof (globalThis as any).IntersectionObserver === 'undefined') {
  (globalThis as any).IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}
