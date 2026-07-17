// Shared between popup.js and background.js, loaded as an ES module by both
// (that's why manifest.json marks the background service worker "type":
// "module", and popup.html loads popup.js as <script type="module">).
// Keeping this in one place means the popup and the keyboard-shortcut path
// can never drift out of sync with each other.

export const DEFAULTS = {
  bandHeight: 110,
  dimStrength: 0.6,
  dimColor: '#14120f',
  fontSize: 1.08,
  maxWidth: 700,
  edgeSoftness: 30,
};

// Chrome refuses to inject content scripts into its own privileged pages
// (chrome://, the Web Store itself, etc.) no matter what permissions an
// extension has -- that's a hard security boundary, not something
// activeTab/scripting can ever unlock. Anything that's about to call
// chrome.scripting.executeScript needs to check this first and skip
// cleanly, rather than letting Chrome throw partway through.
export function isRestrictedUrl(url) {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('https://chrome.google.com/webstore') ||
    url.startsWith('https://chromewebstore.google.com')
  );
}

export function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- Licensing: ExtensionPay (extensionpay.com), no server of our own.
// ExtPay handles the Stripe checkout, the "paid?" check, and cross-device
// login itself -- no license key to copy-paste. REPLACE this placeholder
// once you've registered the extension at https://extensionpay.com (each
// extension gets its own id there, separate from Slate Stack's since
// they're sold independently).
import ExtPay from './vendor/extpay.js';

export const EXTPAY_EXTENSION_ID = 'slate-focus';

// A fresh ExtPay(...) instance per call rather than one shared singleton:
// this is what ExtPay's own docs recommend for service-worker contexts,
// since Chrome can kill and restart the background service worker at any
// time and a stale module-level instance wouldn't survive that. Cheap to
// construct -- it's just a small object of closures, no network call.
export function extpay() {
  return ExtPay(EXTPAY_EXTENSION_ID);
}

export async function isPremium() {
  try {
    const user = await extpay().getUser();
    return !!user.paid;
  } catch (err) {
    // Network error talking to extensionpay.com -- fail closed (treat as
    // not-premium) rather than throwing and breaking the free toggle path.
    return false;
  }
}

// --- The two functions below get injected into the PAGE via
// chrome.scripting.executeScript -- they never run here in the module's own
// context. That's why each stays fully self-contained (only its own
// parameters, `window`, and `document` -- no reference to DEFAULTS,
// hexToRgba, or anything else in this file). Being exported doesn't change
// that; Chrome just re-serializes the function's own source and runs it in
// the page, so nesting a small helper *inside* each function is fine, but
// reaching out to a sibling export in this module would not be. ---

export function toggleFocusMode(bandHeight, overlayColor, fontSize, maxWidth, edgeSoftness) {
  const styleId = 'readrail-focus-style';
  const existingStyle = document.getElementById(styleId);

  if (existingStyle) {
    existingStyle.remove();
    document.getElementById('readrail-ruler-top')?.remove();
    document.getElementById('readrail-ruler-bottom')?.remove();
    if (window.__readrailMove) {
      window.removeEventListener('mousemove', window.__readrailMove);
      delete window.__readrailMove;
    }
    return;
  }

  function readabilityCss(size, width) {
    return `
      body, body * {
        line-height: 1.7 !important;
        letter-spacing: 0.01em !important;
      }
      p, li {
        font-size: ${size}em !important;
        max-width: ${width}px !important;
      }
    `;
  }

  function bandBackground(direction, color, softness) {
    // A hard-edged band is just this gradient with a zero-width fade --
    // no separate "hard" vs "soft" code path needed.
    return `linear-gradient(${direction}, ${color} 0%, ${color} calc(100% - ${softness}px), transparent 100%)`;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = readabilityCss(fontSize, maxWidth);
  document.head.appendChild(style);

  window.__readrailBandHeight = bandHeight;

  const top = document.createElement('div');
  top.id = 'readrail-ruler-top';
  const bottom = document.createElement('div');
  bottom.id = 'readrail-ruler-bottom';

  [top, bottom].forEach((el) => {
    el.style.position = 'fixed';
    el.style.left = '0';
    el.style.right = '0';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '2147483647';
    el.style.transition = 'height 0.06s linear, top 0.06s linear, background 0.15s linear';
  });
  top.style.top = '0';
  bottom.style.bottom = '0';
  top.style.background = bandBackground('to bottom', overlayColor, edgeSoftness);
  bottom.style.background = bandBackground('to top', overlayColor, edgeSoftness);

  document.body.appendChild(top);
  document.body.appendChild(bottom);

  function positionBand(y) {
    const h = window.__readrailBandHeight;
    top.style.height = Math.max(0, y - h / 2) + 'px';
    bottom.style.top = y + h / 2 + 'px';
  }

  function onMove(e) {
    window.__readrailLastY = e.clientY;
    positionBand(e.clientY);
  }

  window.__readrailMove = onMove;
  window.addEventListener('mousemove', onMove);

  positionBand(window.innerHeight / 2);
}

export function updateRulerSettings(bandHeight, overlayColor, fontSize, maxWidth, edgeSoftness) {
  const top = document.getElementById('readrail-ruler-top');
  const bottom = document.getElementById('readrail-ruler-bottom');
  if (!top || !bottom) return;

  window.__readrailBandHeight = bandHeight;

  function bandBackground(direction, color, softness) {
    return `linear-gradient(${direction}, ${color} 0%, ${color} calc(100% - ${softness}px), transparent 100%)`;
  }

  top.style.background = bandBackground('to bottom', overlayColor, edgeSoftness);
  bottom.style.background = bandBackground('to top', overlayColor, edgeSoftness);

  const style = document.getElementById('readrail-focus-style');
  if (style) {
    style.textContent = `
      body, body * {
        line-height: 1.7 !important;
        letter-spacing: 0.01em !important;
      }
      p, li {
        font-size: ${fontSize}em !important;
        max-width: ${maxWidth}px !important;
      }
    `;
  }

  const y = window.__readrailLastY ?? window.innerHeight / 2;
  top.style.height = Math.max(0, y - bandHeight / 2) + 'px';
  bottom.style.top = y + bandHeight / 2 + 'px';
}
