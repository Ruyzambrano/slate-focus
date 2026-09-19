import { DEFAULTS, hexToRgba, toggleFocusMode, isRestrictedUrl } from './shared.js';

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-focus-mode') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (isRestrictedUrl(tab.url)) return;

  const settings = await new Promise((resolve) => chrome.storage.local.get(DEFAULTS, resolve));
  const overlayColor = hexToRgba(settings.dimColor, settings.dimStrength);

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: toggleFocusMode,
    args: [settings.bandHeight, overlayColor, settings.fontSize, settings.maxWidth, settings.edgeSoftness],
  });
});
