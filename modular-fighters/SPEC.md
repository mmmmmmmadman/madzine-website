# Modular Fighters — shared contract (all agents build against this)

Location: madzine-website/modular-fighters/  (pure static, no build, no npm)
Files (one owner each):
- index.html        — integration shell (integrator writes last). Portrait layout: patch panel at the bottom = ONE horizontal row of all modules (row height clamp(240px, 32dvh, 400px): 270 px at 390x844; 240 px is the least that shows every knob) + footer (AUTO / SEND / OUT); the row scrolls horizontally, the footer stays fixed. The fight scene takes all remaining height above (status bar 28 px between).
                      Short landscape (orientation landscape and height <= 620 px, i.e. a phone held sideways): the module row
                      across the full width at 240 px with AUTO / SEND / OUT in a 92 px column at its right end (OUT L over R),
                      the fight canvas filling the whole screen and the panel (284 px) laid OVER its lower part with translucent
                      surfaces (alpha tokens at the end of mf-patch-ui.css; text, jacks, knobs, cables and SEND stay opaque).
                      index.html feeds the panel's top edge to MFFight.setBand(px): the HP bars, the status line and the K.O.
                      text keep the uncovered strip (91 px at 812x375: compact mode, bars at the far sides; under 72 px bars
                      only, in the middle, name + hp inside), the figures stand on the screen floor behind the modules. When
                      row + bar + a 32 px strip do not fit the height (Safari toolbar up, page zoomed): index.html calls
                      MFPatchUI.setScale(0.5..1) from innerHeight; the row and the side column scale down with a transform
                      (never CSS zoom: iPhone Safari's hit testing drifted with it).
                      Home / setup / KO become two columns, every centred screen scrolls when it does not fit. Taller landscape
                      (iPad, desktop) keeps the portrait stack. START requests full screen (Fullscreen API, prefixed fallback),
                      HOME exits; manifest.webmanifest + apple-mobile-web-app-capable for Add to Home Screen.
- mf-audio.js       — audio engine (owner: audio agent)
- mf-patch-ui.js + mf-patch-ui.css — module panel UI (owner: ui agent)
- mf-fight.js       — fight scene + game rules + CPU opponent (owner: fight agent)
- mf-net.js         — PeerJS room networking (owner: net agent)
- mf-online.js      — Firebase Realtime Database: random-match queue + leaderboard (owner: online agent)
- mf-firebase-config.js — window.MF_FIREBASE_CONFIG (paste from the Firebase console; databaseURL empty = online off)
- firebase.rules.json   — the database rules to paste into the Firebase console
All scripts are plain ES5/ES2017 browser globals (no modules), each exposes ONE global object named below.

## Patch data model (JSON, serialisable, sent over network)
Patch = {
  modules: [ {id:"m1", type:"VCO", params:{...}} ... ],   // ~10 modules
  cables:  [ {from:{mod:"m1", port:"out"}, to:{mod:"m3", port:"in"}} ... ],
  // special target: {mod:"OUT", port:"L"} / {mod:"OUT", port:"R"}   (the output module, always present, not counted in the 10)
}
Module types and ports (port names are fixed strings):
- VCO    inputs: fm, sync, mode_trig   outputs: saw, sqr, tri   params: freq (20-2000, in LFO mode 0.05-20), mode:"vco"|"lfo", fmAmt 0-1
         mode_trig: any rising edge toggles vco<->lfo mode
         Sound (2026-10-16, Soundfreak measurements): the three waves are PeriodicWaves built from measured hardware cycles
         (tri = Osc3 triangle Shape 5, saw = Osc3 triangle Shape 10, sqr = pulse Shape 5), each scaled to the RMS of the
         browser wave it replaced. LFO mode maps each wave's exact min..max onto 0..1. fm is DC coupled and exponential:
         fm * fmAmt * 2130 cents (fm +1 at fmAmt 1 = +1.775 oct), so slow LFOs move the pitch.
- MIXVCA (title "MIX VCA")  inputs: in1..in4, cv1..cv4  outputs: out  params: lvl1..lvl4 (0-1)
         per channel inN -> level lvlN -> VCA -> out. cvN patched: gain = lvlN * clamp(cvN, 0, 1)
         (negative cv = silent, cv above 1 held at 1); cvN not patched: gain = lvlN. (Replaced MIX4, 2026-10-16.)
- LPF    inputs: in, cutoff_cv       outputs: out               params: cutoff 20-20000, res 0-1, cvAmt 0-1
         Sound (2026-10-16, Soundfreak measurements): asymmetric soft clip (a 1.0 sine gives h2 -25 dB) -> two cascaded
         lowpass biquads, -3 dB at cutoff and about -13 dB/oct over the next 3 octaves at res 0. res 0..0.45 raises the
         -3 dB point with no peak, 0.475 = 2.4 dB peak, 0.5 = 18 dB, 0.6..1 = 24 dB; the peak sits at 3.77 x cutoff.
         Overall gain falls from 1 (res 0) to 0.7 (res 1). cutoff_cv is exponential: cv * cvAmt * 6000 cents (+-5 oct).
         Above about 3 kHz the corner drifts up and above about 6.4 kHz the resonance fades (Nyquist at 48 kHz).
- FOLD   inputs: in, fold_cv         outputs: out               params: fold 0-1, cvAmt 0-1
- DELAY  inputs: in, time_cv         outputs: outL, outR        params: time 0.05-1.5 s, fb 0-0.9, mix 0-1
- ADSR   inputs: gate                outputs: env               params: a,d,s,r
- AR     inputs: trig                outputs: env               params: a, r
- SEQ5   inputs: clock               outputs: cv, gate          params: steps[5] (0-1), rate (Hz, internal clock when clock not patched; a patched clock takes over and the internal clock stops)
- DRAW   inputs: (none)              outputs: cv                params: shape: Float32Array/Array of 64 values 0-1, rate Hz (internal clock, always running; rate / shape edits re-time the cycle in flight)
Every CV input accepts audio-rate or LFO-rate signal (Web Audio AudioParam or GainNode input).

## Global APIs
window.MFAudio
  .init() -> Promise  (creates AudioContext on user gesture; starts recording the master output if no take is active)
  .play(slot, patch) — slot: "me" | "foe". Builds the Web Audio graph, loops forever, replaces any previous graph in that slot (fade 50 ms).
  .stop(slot)
  .score(patch) -> integer attack power 0..100. Rule: 0 if nothing reaches OUT. Else
     reachable modules*6 + cables reaching OUT*4 + modulation cables (into *_cv/cv1..cv4/fm/gate/trig/clock/mode_trig)*8, capped 100.
  .autoPatch(modules) -> Patch  — a trivial VCO->OUT (or VCO->LPF->OUT) patch, score should land 10..20.
  .randomModules(n=10) -> modules array (each has random params), always includes >=1 VCO.
  .stopRecording() -> Promise<Blob>  audio/mpeg (MP3 128 kbps stereo): master PCM captured by an
     AudioWorklet (ScriptProcessor fallback), encoded in ~1 s batches with lamejs 1.2.1 (cdnjs, pinned + SRI, LGPL-3.0).
     Encoded at ctx.sampleRate when it is an MP3 rate (8k..48k); any other rate (88.2k, 96k, 176.4k, 192k ...) is
     resampled to 48 kHz first (linear interpolation, fractional position and last sample per channel carried across
     batches, so no seams). While lamejs is still loading a MediaRecorder backup runs; the take switches to MP3 as soon
     as the encoder arrives before stop (stopRecording waits up to 5 s for it). A failed lamejs load is retried on the next take.
     Only if lamejs cannot load at all: MediaRecorder fallback, audio/webm (opus) or audio/mp4.
     .recordingActive -> bool (true from init() until stopRecording())
  .previewParam(modId, key, value) — live param edit while patching: preview slot first, then "me" (no-op if neither holds the module)
  .preview(patch) — third slot "preview": hear the patch while building it. Debounced 80 ms; rebuilds (50 ms crossfade) only when the structure changes.
     The preview graph is always built while the panel has modules, also when nothing reaches OUT: then it runs SILENT
     (so SEQ5 / DRAW clocks and envelopes run from the moment the panel appears). Only an empty module list stops it.
     A rebuild carries SEQ5 step + beat and DRAW phase over from the old preview graph (no reset to step 1).
  .commitPreview(patch?) -> bool — promote the playing preview graph to "me" without a rebuild (old "me" fades 50 ms); false if no preview, the preview is silent (nothing reaches OUT), or (with patch) its structure differs
  .slots() -> {me, foe, preview} booleans (debug; preview = an AUDIBLE preview graph); .lastError — last swallowed build error string
  .getModuleState(modId) -> object | null — live state of a module for UI animation (cheap, main thread, no allocation in the audio path).
     Looks in the preview graph first, then "me". null when no graph holds the module. Always has {type, slot}; plus
       SEQ5: {step 0..4 (step heard now, -1 before the first), gate bool, external bool (clock patched), rate}
       DRAW: {phase 0..1, value 0..1, rate}
       ADSR / AR: {level 0..1} (peak of the envelope output over the last ~43 ms, AnalyserNode tap)
     "Now" = the time being heard (getOutputTimestamp, else currentTime minus output latency).
     The panel UI only uses states with slot "preview" and a matching type.
  stop() with no argument stops all three slots. All slots use gain 0.6 into the master compressor.

window.MFPatchUI
  .mount(containerEl, {onSubmit(patch), onAuto(), onChange(patch)})
  .setModules(modules)  — rebuild panel with fresh module set (clears cables). Starts the AUTO lockout (non-empty set) and fires
     onChange once on the next tick (after the caller's own follow-up calls) so the silent preview graph is built.
  .getPatch() -> Patch
  .setPatch(patch) — wire a patch onto the current panel (takes over params of matching modules, replaces cables, fires onChange once)
  .setEnabled(bool)
  .setScale(s) — 0.4..1: scales the module rail and the footer with a transform (layout compensated); 1 = normal
  .autoLockRemaining() -> seconds (float) left of the AUTO lockout, 0 when AUTO is usable.
     AUTO lockout: every new module set (setModules: first panel, after SEND, after rematch) disables AUTO for 10 s.
     The button shows the whole seconds left next to the AUTO label and an accent-dim bar that drains left to right;
     taps during the lockout do nothing (class mfp-locked, aria-disabled). prefers-reduced-motion: the bar moves in whole-second steps.
  Animation (one requestAnimationFrame loop, paused while document.hidden, the panel is off screen or nothing animates):
     SEQ5 current step = accent fill + outline, step number on an accent pill. DRAW = vertical playhead + accent dot at the current value.
     ADSR / AR = oscilloscope strip under the jacks (full module width, 48 px; 64 px when the viewport is >= 1000 px tall):
     envelope output (getModuleState level) scrolling right to left over 2 s, newest at the right; a flat line when idle.
     Without an engine state (no graph yet) SEQ5 / DRAW run a UI-side clock at RATE (SEQ5 holds when its clock input is cabled).
  Module widths (HP, 1 HP = 19 px): VCO 9, MIXVCA 14, MIX4 14, LPF 12, FOLD 9, DELAY 11, ADSR 12, AR 7, SEQ5 12, DRAW 10.
  Jacks (module inputs/outputs and the footer OUT L/R; labelled L / R since 2026-10-22): 33 px disc, 48 px touch target, port labels 16 px
     (user rule 2026-10-16: jacks 50% larger than the old 22 px for iPhone/iPad). Widths were raised so every
     label fits and no knob dial is smaller than before the change at 390x844.
  Cable colours: HSB family around the accent hue (window.MFHue.state.hue, else the hue of --mfp-acc); recoloured on 'mf-hue' / 'mf-theme'.
  Requirements: touch + mouse cable dragging from output port to input port; tap cable to delete;
  SEQ5 = 5 vertical faders side by side, one-finger horizontal sweep sets each fader by x position (location.x picks fader, y sets value);
  DRAW = small canvas, finger draws shape -> params.shape 64 values; VCO shows mode label and a tap toggle;
  sizes: tap targets >= 16pt; non-interactive text >= 14pt; fonts Barlow Condensed Light + Noto Sans JP Light; brand accent coral (HSB H=12); dark background.
  Buttons "AUTO" and "SEND" are inside the panel footer.

window.MFFight
  .setNames({me, foe}) — names drawn on the HP bars instead of YOU / FOE (online matches); null = YOU / FOE
  .setBand(px) — px > 0: only the top px of the canvas are uncovered (the panel lies over the rest); bars, status
     and K.O. lay out in that strip, the figures stand on the canvas floor below it. 0 = whole canvas (default).
  .mount(containerEl)  — draws two fighters (canvas), two HP bars (100 each) with names, round timer optional.
     The osc fighter (left), its HP bar and lunge use the page --acc token (HUE wheel); refreshed on 'mf-hue' / 'mf-theme'.
  .attack(who:"me"|"foe", power)  — plays attack animation, reduces other side HP by round(power × 0.5) (DAMAGE_SCALE; displayed power, speed and score unchanged)
  .getHP() -> {me, foe}
  .reset()
  .onKO(callback(winner))
  .cpu: {start(onAttack(patch)), stop()} — CPU opponent: every 6-12 s builds a random patch via MFAudio.randomModules + a random-cable generator (score 5..60) and calls onAttack(patch)

window.MFOnline  (Firebase compat SDK 10.14.1 loaded from gstatic on first use; nothing else touches it)
  .configured() -> bool; .init() -> Promise
  .enqueue({name, char, room}, onEvent) -> Promise<qid>   room = the 4-char PeerJS room this player already hosts
  .dequeue(); .accept(); .decline()
  .reportResult({name, won}) -> Promise      one call per finished online match, each side reports itself
  .leaderboard(limit) -> Promise<[{name, wins, losses}]>  wins desc, then win rate
  onEvent(type, data): "matched" {foeName, foeChar, host} | "start" {room, host, foeName, foeChar}
     | "match_cancelled" {byMe, foeGone} | "error" "online_off" | "online_load" | "online_net"
  Data under mf/: queue/<qid> {name, char, room, t, match?} (removed on disconnect), matches/<mid>
     {a, b, aName, bName, aChar, bChar, room, t, accept:{qid:true}, declined?}, leaderboard/<key> {name, wins, losses, t}.
  Matchmaking: the OLDEST waiting entry writes the match record FIRST, then pairs itself with the next one
  (transaction on that entry's `match`; a lost race deletes the record; one pair() in flight at a time), both
  answer within 20 s; two accepts -> "start" (a hosts the PeerJS room, b joins). The other side reads the record
  the moment its `match` lands, so the record must already exist (v1.2.0 fix; retries 4x1.5 s before giving up).
  A decline / timeout sends the decliner to the end of the queue; the other stays where it is.

window.MFNet  (copy architecture from ../sessionguide-app.html: PeerJS 1.5.4 from unpkg, host = state authority, 4-char room code, PREFIX namespacing, reconnect handling)
  .create(onEvent) -> Promise<code>
  .join(code, onEvent) -> Promise
  .send(msg)  — msg: {t:"attack", patch, power} | {t:"hp", me, foe} | {t:"ko", winner} | {t:"hello", name}
  .leave()
  onEvent(type, data): "peer_joined" | "peer_left" | "msg" | "error"

## Game flow (index.html integrator)
1. Home: title, "VS CPU", "RANDOM MATCH" + "LEADERBOARD", "CREATE ROOM", "JOIN ROOM (code)". Any click -> MFAudio.init() (starts recording).
   RANDOM MATCH (2026-10-26): asks for a player name EVERY time (v1.2.0; prefilled from localStorage mf_name, 12 chars,
   also editable in the help sheet; a different name = a fresh leaderboard record since the key is the name), then the usual setup, then a CPU match starts AND the player enters the queue (MFNet.create hosts a room,
   MFOnline.enqueue registers it; status line shows IN QUEUE). "matched" -> prompt "Opponent found: NAME, leave this
   match?" FIGHT = accept, KEEP PLAYING CPU = decline (back of the queue). "start" -> the CPU match is dropped, the
   room screen shows WITHOUT a code (v1.2.1: "OPPONENT" + the foe name + a stage line CONNECTING / OPPONENT CONNECTED /
   OPPONENT READY), the host waits for the guest (who joins the room, up to 3 attempts); the whole handshake has a 40 s
   limit, after which both go home with err_online_peer. hello carries {char, name}; names go on the
   HP bars (MFFight.setNames) and the status line. KO in an online match -> MFOnline.reportResult (each side its own)
   and a LEADERBOARD button on the overlay. HOME leaves the queue. CPU matches never count.
2. Match: MFPatchUI shows randomModules(10). SEND -> patch=getPatch(); power=score(patch); if power>0: MFAudio.play("me",patch); MFFight.attack("me",power); MFNet.send(attack). Always: setModules(randomModules(10)).
   AUTO -> MFPatchUI.setPatch(autoPatch(panel modules)): only wires the panel; the player presses SEND (user rule 2026-10-16).
   AUTO is locked for 10 s after each new module set, with a countdown on the button (user rule 2026-10-16).
   While patching: onChange(patch) -> MFAudio.preview(patch). SEND promotes the preview with commitPreview(patch), else play("me").
   Incoming attack msg -> MFAudio.play("foe",patch); MFFight.attack("foe",power). CPU mode: MFFight.cpu.start does the same.
3. KO -> stop both slots, MFAudio.stopRecording() -> offer download link (filename modular-fighters-YYYYMMDD-HHMM.mp3; .webm / .mp4 and label "DOWNLOAD WEBM" / "DOWNLOAD MP4" only on the fallback path). "REMATCH" button.
Language: UI labels English only (short caps), to keep scope small.

## Round 4 additions (2026-10-16)


### 1. Patch images on the KO overlay (index.html, mf-patch-ui.js)

#### `MFPatchUI.renderPatchImage(patch, { theme, title }) → Promise<Blob>`
- Draws a patch (the `Patch` object as sent on the wire: `modules[]` with `id/type/params`, `cables[]`) on an offscreen canvas at 2x device scale and resolves a `image/png` Blob.
- Drawn from the patch data only, never from the live DOM: works for the opponent's patch and after the panel has moved on.
- `theme`: `'dark'` (default) or `'light'`; colours are read from the `.mfp` CSS tokens of that theme (a hidden probe element, the page theme attribute is toggled synchronously and restored).
- `title`: header text, left. Right of the header: local date `YYYY-MM-DD HH:MM`.
- Layout: header 48px, rail 270px (same module widths in HP as the live panel, same module interiors: jacks, labels, mode pill, knob arcs, SEQ5 faders, DRAW curve, scope line), footer 80px with the OUT module centred, cables in the same hue family as the panel. Width = max(390, sum of module widths + gaps); height 406 CSS px (812 image px).

#### KO overlay buttons
- Row `#dlrow` under the result title: `DOWNLOAD MP3` (full width, unchanged), then `DOWNLOAD MY PATCH` (`#dl-me`) and `DOWNLOAD FOE PATCH` (`#dl-foe`), two per row at 390px (min-height 52, 18px); in `ja` one per row (labels would otherwise wrap mid-word).
- Strings: zh `下載我的配線` / `下載對手配線`; en `DOWNLOAD MY PATCH` / `DOWNLOAD FOE PATCH`; ja `自分のパッチを保存` / `相手のパッチを保存`.
- File names: `modular-fighters-me-YYYYMMDD-HHMM.png`, `modular-fighters-foe-YYYYMMDD-HHMM.png` (local time, same stamp helper as the MP3).
- Image title: `MODULAR FIGHTERS — YOU <power>` / `MODULAR FIGHTERS — FOE <power>`.
- Source of each image = that player's LAST SENT patch: recorded in `fire()` for me and in `incoming(patch, power)` for the foe (CPU and network both arrive there), only when `power > 0`. Reset at `startMatch`.
- Hide rules: `#dl-me` hidden if I never landed an attack, `#dl-foe` hidden if the foe never did; the row stays visible while the MP3 button is. All hidden again on rematch / home.
- Rendering happens at KO (after `showResult`) and again when the theme button is pressed while the overlay is up (the PNG follows the current theme). Object URLs are revoked with the MP3 URL. A generation counter drops late renders from a finished/previous match.

### 2. CPU idle attack (mf-fight.js)
- `IDLE_MS = { easy: 40000, normal: 30000, hard: 20000 }`.
- Armed at `cpuStart` (match start). Re-armed after every attack from either side (user attack → `cpuNotifyUserAttack`, CPU reply or idle attack → end of `cpuAttack`). Re-armed on `cpuSetDifficulty` while running.
- When it fires, the CPU attacks once through the same generator and difficulty scaling as a reply (`cpuAttack()`), then the timer restarts.
- Cleared at KO and on HOME (`cpuStop` clears reply timer and idle timer). `idleRemaining()` returns 0 when not running.
- Hidden tab policy: **skip-and-restart** — if `document.hidden` is true when the timer fires, no attack happens and a full new period is armed; so the CPU never attacks an unwatched tab, and after returning the player gets a full 40/30/20 s again. (Could not be exercised in headless Chromium: `Page.setWebLifecycleState hidden` does not flip `document.hidden` there. Unverified.)
- The reply path is unchanged (one reply per user attack).
- Public: `MFFight.cpu.idleRemaining()` → seconds (float) until the next idle attack.
- `helpCpu` text updated in zh/en/ja to describe the idle attack.

### 3. Panel: horizontal scroll bar, no touch panning, multitouch (mf-patch-ui.js / .css)
- New element between the module row and the AUTO/SEND/OUT footer: `.mfp-hbar` (24px filled track, house tokens: `--mfp-sunk` track, `--mfp-line` border, `--mfp-acc` thumb, `--mfp-acc-glow` while held; 6px margins; `::before` grows the hit area to 46px tall). Thumb width = visible/total share of the rail (min 44px). Hidden (`.mfp-off`) when the rail fits in the viewport (checked on every redraw: scroll, resize, rebuild).
- Dragging the thumb scrolls the row; pressing the track outside the thumb centres the thumb under the finger and continues as a drag. The thumb follows programmatic scrolls, wheel/trackpad scrolls and the cable auto-scroll (all route through `redraw()` → `updateHbar()`).
- `touch-action: none` on `.mfp-scroll`, `.mfp-mod` and the cable hit paths: a finger on a module never pans the row. `overflow-x: auto` is kept so mouse wheel / trackpad horizontal scrolling still works on desktop (scrollbar hidden).
- Multitouch: every interaction owns one pointerId with `setPointerCapture` on its own element and ignores other pointers' move/up — cable drag (`drag.id`), knob, SEQ5 sweep, DRAW stroke, scroll bar (`hgrab.id`). A second finger landing on a widget that is already held is ignored. One cable can be in the air at a time; other fingers are free for the bar, knobs, etc.
- Cable held while the row scrolls: `redraw()` re-aims the temporary cable from the stored finger position (`drag.cx/cy`), so the source end follows the scrolled jack (clamped to the visible case edge when off screen) and the drop target is hit-tested at the finger's current client coordinates.
- Verified headless (390x844, synthetic multi-point touch via CDP): swipe on a module keeps `scrollLeft = 0`; cable drag with finger 1 while finger 2 drags the bar to the end lands the cable on an input jack of the last module; knob drag + bar drag at once both apply; tap on the track jumps; bar hidden at 2400px width and back at 390px; wheel deltaX scrolls and the thumb follows; zero console errors. Not tested on a real touch device.

## Characters, favourites, specials, registration (v1.2.3, 2026-10-28)
- Roster = `mf-characters.js` (`window.MF_CHARACTERS`, data not code): {id, name, src (.mp4 loop or .png still),
  facing, by, favorites[<=3 module types], special (MF_SPECIALS key | null), module (signature module | null)}.
  index.html builds the setup tiles from it (caption line = special + favourites, in the current language);
  mf-fight.js builds CHARS from it (fallback: the original six). A .png source is keyed once and bobs like a video.
- Favourites: `MFAudio.randomModules(n, guarantee)` places the guaranteed types at random slots, then applies the
  VCO / LPF-or-MIXVCA rules to the remaining slots. The CPU gets its own character's favourites (`cpu.start(cb, {guarantee})`).
- Specials (MF_SPECIAL_RULES): power = attack x1.3 (was the hidden HATAKEN rule; now a data field and SHOWN on the tile,
  user decision 2026-10-28); fav2 = each favourite twice; hp120 = MFFight.setMaxHp per side (set in applySetup before
  reset); auto6 = MFPatchUI.setAutoLockMs(6000); deal11 = 11 modules after the first SEND of the match (`sentThisMatch`).
  A network foe applies its own special on its side (power is multiplied before sending; HP is read from its char in hello).
- invite.html: `?char=<id>` = invite for an existing character (hero + favourites + special + optional signature-module
  design with sketch); no param = new-character registration (name, credit, facing; artwork sent to MADZINE off-line).
  Japanese first, zh / en switch. Writes one record to `mf/submissions` (append-only; sketch = JPEG data URL <= ~380 KB).
- review.html: lists submissions newest first (latest per character by default), copy button -> one mf-characters.js line.
- INVITE_LINKS.md: the per-character links + the hand-off steps.

