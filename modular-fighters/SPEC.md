# Modular Fighters — shared contract (all agents build against this)

Location: madzine-website/modular-fighters/  (pure static, no build, no npm)
Files (one owner each):
- index.html        — integration shell (integrator writes last). Portrait layout: patch panel at the bottom = ONE horizontal row of all modules (row height clamp(200px, 32dvh, 400px): 270 px at 390x844) + footer (AUTO / SEND / OUT); the row scrolls horizontally, the footer stays fixed. The fight scene takes all remaining height above (status bar 28 px between).
- mf-audio.js       — audio engine (owner: audio agent)
- mf-patch-ui.js + mf-patch-ui.css — module panel UI (owner: ui agent)
- mf-fight.js       — fight scene + game rules + CPU opponent (owner: fight agent)
- mf-net.js         — PeerJS room networking (owner: net agent)
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
- MIXVCA (title "MIX VCA")  inputs: in1..in4, cv1..cv4  outputs: out  params: lvl1..lvl4 (0-1)
         per channel inN -> level lvlN -> VCA -> out. cvN patched: gain = lvlN * clamp(cvN, 0, 1)
         (negative cv = silent, cv above 1 held at 1); cvN not patched: gain = lvlN. (Replaced MIX4, 2026-10-16.)
- LPF    inputs: in, cutoff_cv       outputs: out               params: cutoff 20-20000, res 0-1, cvAmt 0-1
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
  Jacks (module inputs/outputs and the footer OUT LEFT/RIGHT): 33 px disc, 48 px touch target, port labels 16 px
     (user rule 2026-10-16: jacks 50% larger than the old 22 px for iPhone/iPad). Widths were raised so every
     label fits and no knob dial is smaller than before the change at 390x844.
  Cable colours: HSB family around the accent hue (window.MFHue.state.hue, else the hue of --mfp-acc); recoloured on 'mf-hue' / 'mf-theme'.
  Requirements: touch + mouse cable dragging from output port to input port; tap cable to delete;
  SEQ5 = 5 vertical faders side by side, one-finger horizontal sweep sets each fader by x position (location.x picks fader, y sets value);
  DRAW = small canvas, finger draws shape -> params.shape 64 values; VCO shows mode label and a tap toggle;
  sizes: tap targets >= 16pt; non-interactive text >= 14pt; fonts Barlow Condensed Light + Noto Sans JP Light; brand accent coral (HSB H=12); dark background.
  Buttons "AUTO" and "SEND" are inside the panel footer.

window.MFFight
  .mount(containerEl)  — draws two fighters (canvas), two HP bars (100 each) with names, round timer optional.
     The osc fighter (left), its HP bar and lunge use the page --acc token (HUE wheel); refreshed on 'mf-hue' / 'mf-theme'.
  .attack(who:"me"|"foe", power)  — plays attack animation, reduces other side HP by power
  .getHP() -> {me, foe}
  .reset()
  .onKO(callback(winner))
  .cpu: {start(onAttack(patch)), stop()} — CPU opponent: every 6-12 s builds a random patch via MFAudio.randomModules + a random-cable generator (score 5..60) and calls onAttack(patch)

window.MFNet  (copy architecture from ../sessionguide-app.html: PeerJS 1.5.4 from unpkg, host = state authority, 4-char room code, PREFIX namespacing, reconnect handling)
  .create(onEvent) -> Promise<code>
  .join(code, onEvent) -> Promise
  .send(msg)  — msg: {t:"attack", patch, power} | {t:"hp", me, foe} | {t:"ko", winner} | {t:"hello", name}
  .leave()
  onEvent(type, data): "peer_joined" | "peer_left" | "msg" | "error"

## Game flow (index.html integrator)
1. Home: title, "VS CPU", "CREATE ROOM", "JOIN ROOM (code)". Any click -> MFAudio.init() (starts recording).
2. Match: MFPatchUI shows randomModules(10). SEND -> patch=getPatch(); power=score(patch); if power>0: MFAudio.play("me",patch); MFFight.attack("me",power); MFNet.send(attack). Always: setModules(randomModules(10)).
   AUTO -> MFPatchUI.setPatch(autoPatch(panel modules)): only wires the panel; the player presses SEND (user rule 2026-10-16).
   AUTO is locked for 10 s after each new module set, with a countdown on the button (user rule 2026-10-16).
   While patching: onChange(patch) -> MFAudio.preview(patch). SEND promotes the preview with commitPreview(patch), else play("me").
   Incoming attack msg -> MFAudio.play("foe",patch); MFFight.attack("foe",power). CPU mode: MFFight.cpu.start does the same.
3. KO -> stop both slots, MFAudio.stopRecording() -> offer download link (filename modular-fighters-YYYYMMDD-HHMM.mp3; .webm / .mp4 and label "DOWNLOAD WEBM" / "DOWNLOAD MP4" only on the fallback path). "REMATCH" button.
Language: UI labels English only (short caps), to keep scope small.
