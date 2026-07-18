            

export const DEFAULTS = {
  bandHeight: 110,
  dimStrength: 0.6,
  dimColor: '#14120f',
  fontSize: 1.08,
  maxWidth: 700,
  edgeSoftness: 30,
};
               
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
               
import ExtPay from './vendor/extpay.js';

export const EXTPAY_EXTENSION_ID = 'slate-focus';
             export function extpay() {
  return ExtPay(EXTPAY_EXTENSION_ID);
}

export async function isPremium() {
  try {
    const user = await extpay().getUser();
    return !!user.paid;
  } catch (err) {
      
      
    return false;
  }
}
                    

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
