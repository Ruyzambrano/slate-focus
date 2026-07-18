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
   const premiumLocked = document.getElementById('premiumLocked');
const premiumActive = document.getElementById('premiumActive');
const buyBtn = document.getElementById('buyBtn');
const loginBtn = document.getElementById('loginBtn');

let premium = false;
let restrictedPage = false;
          
function applyInputsDisabledState() {
  allInputs.forEach((input) => (input.disabled = !premium || restrictedPage));
}

async function refreshPremiumUI() {
  premium = await isPremium();
  premiumLocked.style.display = premium ? 'none' : 'block';
  premiumActive.style.display = premium ? 'block' : 'none';
    
    
    
  applyInputsDisabledState();
}
          
buyBtn.addEventListener('click', () => {
  extpay().openPaymentPage();
});
          
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
    
    
    
  return premium ? stored : DEFAULTS;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}
        async function applyRestrictedState() {
  const tab = await activeTab();
  restrictedPage = isRestrictedUrl(tab?.url);

  toggleBtn.disabled = restrictedPage;
  restrictedNote.style.display = restrictedPage ? 'block' : 'none';
  applyInputsDisabledState();
}
applyRestrictedState();
          
allInputs.forEach((input) => {
  input.addEventListener('input', async () => {
    updateDisplayedValues();

    const settings = readValues();
    chrome.storage.local.set(settings);

    const tab = await activeTab();
    if (isRestrictedUrl(tab?.url)) return;   

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
     

toggleBtn.addEventListener('click', async () => {
  const tab = await activeTab();
  if (isRestrictedUrl(tab?.url)) return;   

  const settings = await currentSettings();
  const overlayColor = hexToRgba(settings.dimColor, settings.dimStrength);

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: toggleFocusMode,
    args: [settings.bandHeight, overlayColor, settings.fontSize, settings.maxWidth, settings.edgeSoftness],
  });
});
