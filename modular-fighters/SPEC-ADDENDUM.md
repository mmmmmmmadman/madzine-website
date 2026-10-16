# SPEC addendum — 2026-10-16 (to be merged into SPEC.md)

Covers three orders: patch screenshots on the KO overlay, CPU idle attack, horizontal scroll bar + multitouch panel.

## 1. Patch images on the KO overlay (index.html, mf-patch-ui.js)

### `MFPatchUI.renderPatchImage(patch, { theme, title }) → Promise<Blob>`
- Draws a patch (the `Patch` object as sent on the wire: `modules[]` with `id/type/params`, `cables[]`) on an offscreen canvas at 2x device scale and resolves a `image/png` Blob.
- Drawn from the patch data only, never from the live DOM: works for the opponent's patch and after the panel has moved on.
- `theme`: `'dark'` (default) or `'light'`; colours are read from the `.mfp` CSS tokens of that theme (a hidden probe element, the page theme attribute is toggled synchronously and restored).
- `title`: header text, left. Right of the header: local date `YYYY-MM-DD HH:MM`.
- Layout: header 48px, rail 270px (same module widths in HP as the live panel, same module interiors: jacks, labels, mode pill, knob arcs, SEQ5 faders, DRAW curve, scope line), footer 80px with the OUT module centred, cables in the same hue family as the panel. Width = max(390, sum of module widths + gaps); height 406 CSS px (812 image px).

### KO overlay buttons
- Row `#dlrow` under the result title: `DOWNLOAD MP3` (full width, unchanged), then `DOWNLOAD MY PATCH` (`#dl-me`) and `DOWNLOAD FOE PATCH` (`#dl-foe`), two per row at 390px (min-height 52, 18px); in `ja` one per row (labels would otherwise wrap mid-word).
- Strings: zh `下載我的配線` / `下載對手配線`; en `DOWNLOAD MY PATCH` / `DOWNLOAD FOE PATCH`; ja `自分のパッチを保存` / `相手のパッチを保存`.
- File names: `modular-fighters-me-YYYYMMDD-HHMM.png`, `modular-fighters-foe-YYYYMMDD-HHMM.png` (local time, same stamp helper as the MP3).
- Image title: `MODULAR FIGHTERS — YOU <power>` / `MODULAR FIGHTERS — FOE <power>`.
- Source of each image = that player's LAST SENT patch: recorded in `fire()` for me and in `incoming(patch, power)` for the foe (CPU and network both arrive there), only when `power > 0`. Reset at `startMatch`.
- Hide rules: `#dl-me` hidden if I never landed an attack, `#dl-foe` hidden if the foe never did; the row stays visible while the MP3 button is. All hidden again on rematch / home.
- Rendering happens at KO (after `showResult`) and again when the theme button is pressed while the overlay is up (the PNG follows the current theme). Object URLs are revoked with the MP3 URL. A generation counter drops late renders from a finished/previous match.

## 2. CPU idle attack (mf-fight.js)
- `IDLE_MS = { easy: 40000, normal: 30000, hard: 20000 }`.
- Armed at `cpuStart` (match start). Re-armed after every attack from either side (user attack → `cpuNotifyUserAttack`, CPU reply or idle attack → end of `cpuAttack`). Re-armed on `cpuSetDifficulty` while running.
- When it fires, the CPU attacks once through the same generator and difficulty scaling as a reply (`cpuAttack()`), then the timer restarts.
- Cleared at KO and on HOME (`cpuStop` clears reply timer and idle timer). `idleRemaining()` returns 0 when not running.
- Hidden tab policy: **skip-and-restart** — if `document.hidden` is true when the timer fires, no attack happens and a full new period is armed; so the CPU never attacks an unwatched tab, and after returning the player gets a full 40/30/20 s again. (Could not be exercised in headless Chromium: `Page.setWebLifecycleState hidden` does not flip `document.hidden` there. Unverified.)
- The reply path is unchanged (one reply per user attack).
- Public: `MFFight.cpu.idleRemaining()` → seconds (float) until the next idle attack.
- `helpCpu` text updated in zh/en/ja to describe the idle attack.

## 3. Panel: horizontal scroll bar, no touch panning, multitouch (mf-patch-ui.js / .css)
- New element between the module row and the AUTO/SEND/OUT footer: `.mfp-hbar` (24px filled track, house tokens: `--mfp-sunk` track, `--mfp-line` border, `--mfp-acc` thumb, `--mfp-acc-glow` while held; 6px margins; `::before` grows the hit area to 46px tall). Thumb width = visible/total share of the rail (min 44px). Hidden (`.mfp-off`) when the rail fits in the viewport (checked on every redraw: scroll, resize, rebuild).
- Dragging the thumb scrolls the row; pressing the track outside the thumb centres the thumb under the finger and continues as a drag. The thumb follows programmatic scrolls, wheel/trackpad scrolls and the cable auto-scroll (all route through `redraw()` → `updateHbar()`).
- `touch-action: none` on `.mfp-scroll`, `.mfp-mod` and the cable hit paths: a finger on a module never pans the row. `overflow-x: auto` is kept so mouse wheel / trackpad horizontal scrolling still works on desktop (scrollbar hidden).
- Multitouch: every interaction owns one pointerId with `setPointerCapture` on its own element and ignores other pointers' move/up — cable drag (`drag.id`), knob, SEQ5 sweep, DRAW stroke, scroll bar (`hgrab.id`). A second finger landing on a widget that is already held is ignored. One cable can be in the air at a time; other fingers are free for the bar, knobs, etc.
- Cable held while the row scrolls: `redraw()` re-aims the temporary cable from the stored finger position (`drag.cx/cy`), so the source end follows the scrolled jack (clamped to the visible case edge when off screen) and the drop target is hit-tested at the finger's current client coordinates.
- Verified headless (390x844, synthetic multi-point touch via CDP): swipe on a module keeps `scrollLeft = 0`; cable drag with finger 1 while finger 2 drags the bar to the end lands the cable on an input jack of the last module; knob drag + bar drag at once both apply; tap on the track jumps; bar hidden at 2400px width and back at 390px; wheel deltaX scrolls and the thumb follows; zero console errors. Not tested on a real touch device.
