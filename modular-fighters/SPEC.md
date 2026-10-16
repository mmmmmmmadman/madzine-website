# Modular Fighters — shared contract (all agents build against this)

Location: madzine-website/modular-fighters/  (pure static, no build, no npm)
Files (one owner each):
- index.html        — integration shell (integrator writes last). Portrait layout: top 40% = fight scene, bottom 60% = patch panel + buttons.
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
- SEQ5   inputs: clock               outputs: cv, gate          params: steps[5] (0-1), rate (Hz, internal clock when clock not patched)
- DRAW   inputs: (none)              outputs: cv                params: shape: Float32Array/Array of 64 values 0-1, rate Hz
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
  .stopRecording() -> Promise<Blob>  audio/mpeg (MP3 128 kbps stereo at ctx.sampleRate): master PCM captured by an
     AudioWorklet (ScriptProcessor fallback), encoded in ~1 s batches with lamejs 1.2.1 (cdnjs, pinned + SRI, LGPL-3.0).
     If lamejs cannot load or the rate is not an MP3 rate: MediaRecorder fallback, audio/webm (opus) or audio/mp4.
     .recordingActive -> bool (true from init() until stopRecording())
  .previewParam(modId, key, value) — live param edit while patching: preview slot first, then "me" (no-op if neither holds the module)
  .preview(patch) — third slot "preview": hear the patch while building it. Debounced 80 ms; rebuilds (50 ms crossfade) only when the structure changes; stops the preview slot when nothing reaches OUT
  .commitPreview(patch?) -> bool — promote the playing preview graph to "me" without a rebuild (old "me" fades 50 ms); false if no preview or (with patch) its structure differs
  .slots() -> {me, foe, preview} booleans (debug); .lastError — last swallowed build error string
  stop() with no argument stops all three slots. All slots use gain 0.6 into the master compressor.

window.MFPatchUI
  .mount(containerEl, {onSubmit(patch), onAuto(), onChange(patch)})
  .setModules(modules)  — rebuild panel with fresh module set (clears cables)
  .getPatch() -> Patch
  .setPatch(patch) — wire a patch onto the current panel (takes over params of matching modules, replaces cables, fires onChange once)
  .setEnabled(bool)
  Requirements: touch + mouse cable dragging from output port to input port; tap cable to delete;
  SEQ5 = 5 vertical faders side by side, one-finger horizontal sweep sets each fader by x position (location.x picks fader, y sets value);
  DRAW = small canvas, finger draws shape -> params.shape 64 values; VCO shows mode label and a tap toggle;
  sizes: tap targets >= 16pt; non-interactive text >= 14pt; fonts Barlow Condensed Light + Noto Sans JP Light; brand accent coral (HSB H=12); dark background.
  Buttons "AUTO" and "SEND" are inside the panel footer.

window.MFFight
  .mount(containerEl)  — draws two fighters (canvas), two HP bars (100 each) with names, round timer optional
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
   While patching: onChange(patch) -> MFAudio.preview(patch). SEND promotes the preview with commitPreview(patch), else play("me").
   Incoming attack msg -> MFAudio.play("foe",patch); MFFight.attack("foe",power). CPU mode: MFFight.cpu.start does the same.
3. KO -> stop both slots, MFAudio.stopRecording() -> offer download link (filename modular-fighters-YYYYMMDD-HHMM.mp3; .webm / .mp4 and label "DOWNLOAD WEBM" / "DOWNLOAD MP4" only on the fallback path). "REMATCH" button.
Language: UI labels English only (short caps), to keep scope small.
