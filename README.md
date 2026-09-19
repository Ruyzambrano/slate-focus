# Slate Focus

A standalone Chrome extension: toggle a more readable layout and a mouse-following spotlight ruler on the current page. This used to be half of a combined "Readrail" extension — split out because the problem it solves (walls of text are hard to read) is genuinely distinct from Tab Queue's problem (too many open tabs), and each deserves its own scope.

## Try it (2 minutes)

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**, select this `readrail-focus` folder.
4. Open a long article, click the toolbar icon, click "Toggle Focus Mode," then move your mouse down the page.

## What's in here

- `manifest.json` — permissions: `activeTab`, `scripting`, `storage`. Nothing broader than that; this extension can't read any page you haven't explicitly clicked it on or used the keyboard shortcut on. Also declares a background service worker and one keyboard `command`.
- `shared.js` — the settings defaults, the hex-to-rgba color helper, and the two functions that actually get injected into pages (`toggleFocusMode`, `updateRulerSettings`). Written as an ES module so both the popup and the background worker import the exact same code rather than keeping two copies in sync by hand.
- `popup.html` / `popup.js` — the toggle button and six controls (spotlight height, dim strength, overlay color, font size, paragraph width, edge softness).
- `background.js` — a service worker that listens for the keyboard shortcut and does the same thing the popup's toggle button does, so the shortcut works without the popup ever being open.

## How it works

Clicking "Toggle Focus Mode" (or using the keyboard shortcut) runs `chrome.scripting.executeScript` to inject a function directly into the current page. That function does two things: applies CSS for line-height/font-size/paragraph-width, and adds two `fixed`-positioned overlay divs that dim everything except a band that follows your mouse — a reading ruler. It follows the *mouse*, not actual text lines, which is deliberate: measuring real line boundaries would mean reacting to font size, zoom, and page layout on every page, while a mouse-following band works identically everywhere with no per-page tuning. This is the same practical approach real accessibility tools use (e.g. Helperbird's "Line Focus").

All six controls are saved via `chrome.storage.local` (on-device only, no account, no sync) and, if the ruler is already on, pushed live into the page via a second injected function (`updateRulerSettings`) rather than requiring you to toggle off and on again.

**On the color picker specifically:** the `<input type="color">` element gives back a hex string like `#14120f`. The overlay needs an `rgba()` string so dim strength can still control opacity independently of the color itself — so `popup.js` converts hex to rgba (`hexToRgba`) *before* sending it to the page, and passes the injected functions a single ready-to-use CSS color string.

**On soft edges:** the overlay bands used to be a solid color. Now each is a `linear-gradient` that stays solid for most of its height and fades to transparent right at the edge nearest your cursor — `linear-gradient(direction, color 0%, color calc(100% - softness px), transparent 100%)`. Set edge softness to 0 and the fade collapses to nothing, which is exactly the old hard-edged look — one formula covers both, no separate code path needed.

**On the keyboard shortcut, the part worth understanding:** `popup.js` only exists and runs while the popup window is open. A global shortcut has to work regardless of whether you've ever opened the popup that session, which means the code that responds to it has to live somewhere that's always running — a background service worker (`background.js`), registered in `manifest.json` under `"background"`. It listens for `chrome.commands.onCommand`, which fires when you press the shortcut declared under `"commands"`, and then does exactly what the popup's click handler does: find the active tab, read settings from storage, inject `toggleFocusMode`. Triggering a command shortcut counts as "invoking the extension," the same as clicking the toolbar icon — so this still runs under the `activeTab` permission already declared; no broader permission was needed just to support a shortcut.

`manifest.json` suggests `Cmd/Ctrl+Shift+F` as the default binding, but Chrome only actually assigns it if that combination isn't already claimed by something else on the user's machine — if it is, the shortcut silently stays unbound with no error shown anywhere. Because of that, the popup deliberately doesn't tell users "press Cmd/Ctrl+Shift+F" as though it's guaranteed to be live; it points them to `chrome://extensions/shortcuts` to set (or confirm) their own binding instead. That page is the only place that reflects what's actually assigned on a given machine.

## Pages this can't run on

Chrome flatly refuses script injection into its own privileged pages — `chrome://` pages (like `chrome://extensions` itself), `chrome-extension://` pages, and the Chrome Web Store — no matter what permissions an extension declares. This isn't a bug to work around; it's a hard security boundary every extension runs into. The real symptom the first time you hit it: clicking "Toggle Focus Mode" (or dragging a slider, or pressing the shortcut) while a `chrome://` tab is active throws an error from deep inside `chrome.scripting.executeScript`, with a stack trace that doesn't obviously explain what happened.

The fix is `isRestrictedUrl()` in `shared.js`, a small check against known-restricted URL prefixes. It's used in three places: the popup checks the active tab on open and disables the toggle button and every slider (with a visible explanation) if the current page is restricted; the slider change-handler checks again before attempting a live update; and `background.js` checks before the keyboard shortcut tries to inject anything. Same rule, enforced everywhere something could trigger `executeScript` — this is the same reasoning as putting the shared functions in one file: one check, reused, rather than three chances to forget it in one place.

## Free

Everything is free — toggling Focus Mode and all six customization controls (spotlight height, dim strength, color, font size, paragraph width, edge softness), however you trigger it (button or shortcut). There's no license, no account, and nothing phones home. Settings live only in `chrome.storage.local`.

This used to be gated behind an ExtensionPay paywall (a one-time £5 unlock for the customization controls). That's been removed: at the install numbers this extension actually has, a paywall wasn't earning anything and was just friction for the few people who found it. The popup now has an optional "buy me a coffee" link instead, for anyone who wants to say thanks — there's no expectation attached to it.

## Going deeper

- [chrome.scripting API reference](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [chrome.storage API reference](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [chrome.commands API reference](https://developer.chrome.com/docs/extensions/reference/api/commands)
- [Background service workers — Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers)

## Published

Live on the Chrome Web Store: https://chromewebstore.google.com/detail/beelcoomgjoeichjghepcggknldobdhf

Homepage / privacy policy: https://ruyzambrano.github.io/slate-focus/

Not needed for personal use — `chrome://extensions` → Load unpacked is still a fully working install if you want to run from source. To publish an update: bump `"version"` in `manifest.json`, re-zip this folder's contents (`manifest.json` at the root of the zip, not nested in a folder), and upload it as a new package via the Chrome Web Store Developer Dashboard — this resubmits the item for the same review process as a first-time submission.

Icons are done (`icons/`, referenced from `manifest.json`'s `"icons"` and `"action.default_icon"`) — regenerate them anytime with `python3 icons/generate_icons.py` (requires Pillow). Promotional images (small tile, marquee) live in `marketing/`, generated by `marketing/generate_promo.py`.
