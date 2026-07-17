// Loaded as an ES module (see the <script type="module"> tag in popup.html)
// so it can import the shared functions instead of duplicating them --
// those same functions are also used by background.js for the keyboard
// shortcut, so there's exactly one copy of the real logic.
import {
  DEFAULTS,
  hexToRgba,
  toggleFocusMode,
  updateRulerSettings,
  isRestrictedUrl,
  isPremium,
  extpay,
} from './shared.js';

const toggleBtn = document.getElementById('toggleBtn');
const restrictedNote = document.getElementById('restrictedNote');

const bandHeightInput = document.getElementById('bandHeight');
const dimStrengthInput = document.getElementById('dimStrength');
const dimColorInput = document.getElementById('dimColor');
const fontSizeInput = document.getElementById('fontSize');
const maxWidthInput = document.getElementById('maxWidth');
const edgeSoftnessInput = document.getElementById('edgeSoftness');

const bandHeightVal = document.getElementById('bandHeightVal');
const dimStrengthVal = document.getElementById('dimStrengthVal');
const fontSizeVal = document.getElementById('fontSizeVal');
const maxWidthVal = document.getElementById('maxWidthVal');
const edgeSoftnessVal = document.getElementById('edgeSoftnessVal');

const allInputs = [
  bandHeightInput,
  dimStrengthInput,
  dimColorInput,
  fontSizeInput,
  maxWidthInput,
  edgeSoftnessInput,
];

// --- Premium / licensing UI ---
const premiumLocked = document.getElementById('premiumLocked');
const premiumActive = document.getElementById('premiumActive');
const buyBtn = document.getElementById('buyBtn');
const loginBtn = document.getElementById('loginBtn');

let premium = false;
let restrictedPage = false;

// Inputs end up disabled if EITHER condition applies: not premium (nothing
// to unlock yet) or the current tab is one Chrome won't let us touch at
// all. Computing this in one place, from both flags together, avoids the
// two checks racing and clobbering each other's disabled state.
function applyInputsDisabledState() {
  allInputs.forEach((input) => (input.disabled = !premium || restrictedPage));
}

async function refreshPremiumUI() {
  premium = await isPremium();
  premiumLocked.style.display = premium ? 'none' : 'block';
  premiumActive.style.display = premium ? 'block' : 'none';
  // The free tier still toggles Focus Mode -- it just always uses the
  // default look rather than whatever's in these controls, so disabling
  // them here is honest: changing them genuinely does nothing until unlocked.
  applyInputsDisabledState();
}

// Opens ExtensionPay's hosted checkout in a new tab. The popup closes as
// soon as that tab gets focus (normal Chrome popup behavior), so the next
// time the popup is opened, refreshPremiumUI() below re-checks paid status
// fresh from ExtensionPay's servers -- no manual "activate" step needed.
buyBtn.addEventListener('click', () => {
  extpay().openPaymentPage();
});

// For someone who already paid but is on a new browser/device/profile:
// ExtensionPay's own login page (email magic link), not a license key to
// copy-paste -- this is the direct replacement for "Activate" + "Restore
// purchase" in the old Gumroad flow.
loginBtn.addEventListener('click', () => {
  extpay().openLoginPage();
});

function updateDisplayedValues() {
  bandHeightVal.textContent = bandHeightInput.value;
  dimStrengthVal.textContent = Number(dimStrengthInput.value).toFixed(2);
  fontSizeVal.textContent = Number(fontSizeInput.value).toFixed(2);
  maxWidthVal.textContent = maxWidthInput.value;
  edgeSoftnessVal.textContent = edgeSoftnessInput.value;
}

function readValues() {
  return {
    bandHeight: Number(bandHeightInput.value),
    dimStrength: Number(dimStrengthInput.value),
    dimColor: dimColorInput.value,
    fontSize: Number(fontSizeInput.value),
    maxWidth: Number(maxWidthInput.value),
    edgeSoftness: Number(edgeSoftnessInput.value),
  };
}

chrome.storage.local.get(DEFAULTS, (settings) => {
  bandHeightInput.value = settings.bandHeight;
  dimStrengthInput.value = settings.dimStrength;
  dimColorInput.value = settings.dimColor;
  fontSizeInput.value = settings.fontSize;
  maxWidthInput.value = settings.maxWidth;
  edgeSoftnessInput.value = settings.edgeSoftness;
  updateDisplayedValues();
});

refreshPremiumUI();

async function currentSettings() {
  const stored = await new Promise((resolve) => chrome.storage.local.get(DEFAULTS, resolve));
  // Free tier always gets the default look, regardless of what's sitting in
  // storage -- this is what makes disabling the inputs more than cosmetic,
  // since even a manually-edited storage value can't take effect unlocked.
  return premium ? stored : DEFAULTS;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// If the current tab is a page Chrome won't allow script injection into
// (chrome://, the Web Store, etc.), disable everything and say so plainly,
// instead of letting a click or slider drag fail silently into the console.
async function applyRestrictedState() {
  const tab = await activeTab();
  restrictedPage = isRestrictedUrl(tab?.url);

  toggleBtn.disabled = restrictedPage;
  restrictedNote.style.display = restrictedPage ? 'block' : 'none';
  applyInputsDisabledState();
}
applyRestrictedState();

// Any control changing: save immediately, and if Focus Mode is already on
// for this page, update it live without needing another click of the
// toggle button (or the keyboard shortcut). Inputs are disabled entirely
// while not premium, so in practice this only fires for unlocked users.
allInputs.forEach((input) => {
  input.addEventListener('input', async () => {
    updateDisplayedValues();

    const settings = readValues();
    chrome.storage.local.set(settings);

    const tab = await activeTab();
    if (isRestrictedUrl(tab?.url)) return; // nothing to update live on this page

    const overlayColor = hexToRgba(settings.dimColor, settings.dimStrength);
    chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        func: updateRulerSettings,
        args: [settings.bandHeight, overlayColor, settings.fontSize, settings.maxWidth, settings.edgeSoftness],
      })
      .catch((err) => console.error('Slate Focus: live update failed', err));
  });
});

// --- Toggle button --- always works, free or premium; it's WHICH settings
// get applied that differs (see currentSettings above).

toggleBtn.addEventListener('click', async () => {
  const tab = await activeTab();
  if (isRestrictedUrl(tab?.url)) return; // button should already be disabled, but don't rely on that alone

  const settings = await currentSettings();
  const overlayColor = hexToRgba(settings.dimColor, settings.dimStrength);

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: toggleFocusMode,
    args: [settings.bandHeight, overlayColor, settings.fontSize, settings.maxWidth, settings.edgeSoftness],
  });
});
