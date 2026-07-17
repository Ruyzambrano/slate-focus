// A background service worker is the piece that can react to things when
// the popup isn't even open -- like a keyboard shortcut. It has no window,
// no DOM of its own; it just listens for events and reacts.
//
// Triggering a chrome.commands shortcut counts as "invoking the extension,"
// exactly like clicking the toolbar icon does -- so this still runs under
// the activeTab permission already declared in manifest.json. No broader
// permission was needed just to support a shortcut.

import { DEFAULTS, hexToRgba, toggleFocusMode, isRestrictedUrl, isPremium, extpay } from './shared.js';

// Required once, at the top level of the background script -- ExtPay uses
// this to listen for its own internal messages (e.g. the payment-success
// page nudging a re-check). Must not be called from inside a callback, per
// ExtPay's own docs, since it should only ever run once per service worker
// wake.
extpay().startBackground();

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-focus-mode') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  // Same rule as the popup: Chrome won't allow injection into its own
  // pages no matter what, so just do nothing rather than let this throw.
  if (isRestrictedUrl(tab.url)) return;

  // The shortcut toggles Focus Mode either way -- free or premium -- same
  // as the popup button. Which LOOK it applies is what's gated: only a
  // premium account's customized settings get used here, otherwise it's
  // always the default appearance, matching currentSettings() in popup.js.
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
