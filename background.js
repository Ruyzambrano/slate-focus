       
//          

import { DEFAULTS, hexToRgba, toggleFocusMode, isRestrictedUrl, isPremium, extpay } from './shared.js';
             extpay().startBackground();

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-focus-mode') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

    
    
  if (isRestrictedUrl(tab.url)) return;

    
    
    
    
  const premium = await isPremium();
  const settings = premium
    ? await new Promise((resolve) => chrome.storage.local.get(DEFAULTS, resolve))
    : DEFAULTS;
  const overlayColor = hexToRgba(settings.dimColor, settings.dimStrength);

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: toggleFocusMode,
    args: [settings.bandHeight, overlayColor, settings.fontSize, settings.maxWidth, settings.edgeSoftness],
  });
});
