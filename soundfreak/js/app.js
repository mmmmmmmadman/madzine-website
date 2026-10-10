// Boot: audio engine wrapper, rack, toolbar, patch persistence.
import { MODULE_MENU } from './modules/index.js';
import { Rack } from './ui/rack.js';

const STORAGE_KEY = 'soundfreak.patch.v2';   // v2: default patch with filter + envelope
// Single-file bundle first (no `import` inside the worklet scope, works in Safari), then the ES-module source.
const WORKLET_URLS = [
  new URL('./worklet/engine.bundle.js', import.meta.url),
  new URL('./worklet/engine.js', import.meta.url),
];

// ---------- audio ----------
class Audio {
  constructor(onMessage) {
    this.ctx = null;
    this.node = null;
    this.state = 'idle';     // idle | starting | running | failed
    this.lastGraph = null;
    this.onMessage = onMessage;
    this.onState = () => {};
  }

  async start() {
    if (this.state !== 'idle') { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); return; }
    this.state = 'starting';
    this.onState(this.state);
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'interactive' });
      let loaded = null, lastErr = null;
      for (const u of WORKLET_URLS) {
        try { await this.ctx.audioWorklet.addModule(u); loaded = u; break; }
        catch (e) { lastErr = e; console.warn('Soundfreak: worklet load failed for', u.pathname, e); }
      }
      if (!loaded) throw lastErr;
      console.info('Soundfreak: worklet module loaded from', loaded.pathname);
      this.node = new AudioWorkletNode(this.ctx, 'soundfreak-engine', {
        numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2],
      });
      this.node.port.onmessage = (e) => this.onMessage(e.data);
      this.node.connect(this.ctx.destination);
      if (this.lastGraph) this.node.port.postMessage(this.lastGraph);
      this.state = 'running';
      this.onState(this.state);
      // resume() may not settle until the output device is ready; do not block on it
      this.ctx.resume().then(() => console.info('Soundfreak: context running'));
    } catch (err) {
      console.error('Audio start failed:', err);
      this.state = 'failed';
      this.error = err;
    }
    this.onState(this.state, this.error);
  }

  sendGraph(msg) {
    this.lastGraph = msg;
    if (this.node) this.node.port.postMessage(msg);
  }

  sendParam(module, id, value) {
    if (this.lastGraph) {
      const m = this.lastGraph.modules.find(x => x.id === module);
      if (m) m.params[id] = value;
    }
    if (this.node) this.node.port.postMessage({ type: 'param', module, id, value });
  }
}

// ---------- default patch ----------
// Replaced 2026-10-10 with a patch saved from the simulator (user preset).
export function defaultPatch() {
  return {
    "version": 1,
    "modules": [
      {
        "id": "triple-vco-2",
        "type": "triple-vco",
        "params": {
          "o1_freq": 3.549289772727275,
          "o1_sync": 0,
          "o1_fm": 10,
          "o1_shape": 3.341441761363636,
          "o1_lvl1": 10,
          "o1_lvl2": 10,
          "o2_freq": 3.95880681818182,
          "o2_sync": 0,
          "o2_fm": 0,
          "o2_shape": 2.9723011363636354,
          "o2_lvl1": 10,
          "o2_lvl2": 10,
          "o3_freq": 5,
          "o3_sync": 0,
          "o3_fm": 0,
          "o3_shape": 5,
          "o3_lvl1": 10,
          "o3_lvl2": 10,
          "o3_lfo": 0
        }
      },
      {
        "id": "dual-filter-3",
        "type": "dual-filter",
        "params": {
          "a_slew": 1,
          "a_fcv": 9.208274147727282,
          "a_rcv": 0,
          "a_db": 1,
          "a_freq": 6.8607954545454515,
          "a_fm": 0,
          "a_resp": 0,
          "b_slew": 0,
          "b_fcv": 5,
          "b_rcv": 0,
          "b_db": 0,
          "b_freq": 5,
          "b_fm": 0,
          "b_resp": 0
        }
      },
      {
        "id": "envelope-shaper-4",
        "type": "envelope-shaper",
        "params": {
          "time": 1,
          "attack": 0,
          "decay": 2.5806107954545463,
          "on": 0,
          "off": 0,
          "trap_lvl": 10,
          "sig_lvl": 10,
          "colour": 5,
          "noise_lvl": 5
        }
      },
      {
        "id": "output-5",
        "type": "output",
        "params": {
          "level": 0
        }
      },
      {
        "id": "sequencer-9",
        "type": "sequencer",
        "params": {
          "a1": 0,
          "a2": 2.3165838068181817,
          "a3": 7.4273792613636385,
          "a4": 0,
          "a5": 0,
          "a6": 0,
          "a7": 0,
          "a8": 1.9000000000000006,
          "b1": 0,
          "b2": 3.59765625,
          "b3": 3.654829545454546,
          "b4": 3.787109375,
          "b5": 0,
          "b6": 3.717684659090909,
          "b7": 2.4204545454545454,
          "b8": 4.8425071022727275,
          "c1": 0,
          "c2": 0,
          "c3": 0,
          "c4": 0,
          "c5": 0,
          "c6": 0,
          "c7": 0,
          "c8": 0,
          "d1": 0,
          "d2": 0,
          "d3": 0,
          "d4": 0,
          "d5": 0,
          "d6": 0,
          "d7": 0,
          "d8": 0,
          "steps": 8,
          "mode": 2,
          "btn": 0,
          "extint": 1,
          "tempo": 6.272727272727272
        }
      }
    ],
    "cables": [
      {
        "from": {
          "m": "dual-filter-3",
          "j": "a_out1"
        },
        "to": {
          "m": "envelope-shaper-4",
          "j": "in1"
        }
      },
      {
        "from": {
          "m": "envelope-shaper-4",
          "j": "sig_tj"
        },
        "to": {
          "m": "output-5",
          "j": "in_l"
        }
      },
      {
        "from": {
          "m": "envelope-shaper-4",
          "j": "sig_tj"
        },
        "to": {
          "m": "output-5",
          "j": "in_r"
        }
      },
      {
        "from": {
          "m": "sequencer-9",
          "j": "va_1"
        },
        "to": {
          "m": "triple-vco-2",
          "j": "o1_cv"
        }
      },
      {
        "from": {
          "m": "sequencer-9",
          "j": "vb_1"
        },
        "to": {
          "m": "dual-filter-3",
          "j": "a_fcvin"
        }
      },
      {
        "from": {
          "m": "triple-vco-2",
          "j": "o1_w1tj"
        },
        "to": {
          "m": "dual-filter-3",
          "j": "a_in1"
        }
      },
      {
        "from": {
          "m": "triple-vco-2",
          "j": "o2_w2tj"
        },
        "to": {
          "m": "triple-vco-2",
          "j": "o1_fmin"
        }
      },
      {
        "from": {
          "m": "sequencer-9",
          "j": "va_2"
        },
        "to": {
          "m": "triple-vco-2",
          "j": "o2_cv"
        }
      }
    ]
  };
}

// ---------- boot ----------
function boot() {
  const rackEl = document.getElementById('rack');
  const status = document.getElementById('audio-status');
  const hint = document.getElementById('hint');

  const audio = new Audio((m) => {
    if (m.type === 'meter') rack.setMeter(m.module, m.l, m.r);
    else if (m.type === 'state') rack.setState(m.module, m.state);
  });
  audio.onState = (s, err) => {
    status.dataset.state = s;
    if (s === 'idle') status.textContent = 'Audio: click anywhere to start';
    else if (s === 'starting') status.textContent = 'Audio: starting';
    else if (s === 'running') status.textContent = `Audio: running (${audio.ctx.sampleRate} Hz)`;
    else {
      status.textContent = 'Audio: failed to load the worklet';
      hint.textContent = (location.protocol === 'file:')
        ? 'Module scripts cannot be loaded from file:// in this browser. Serve the folder instead:  python3 -m http.server 8765  then open http://localhost:8765/'
        : 'The audio worklet could not be loaded: ' + (err && err.message ? err.message : err);
      hint.hidden = false;
    }
  };
  audio.onState('idle');

  const rack = new Rack(rackEl, {
    onGraph: (msg) => audio.sendGraph(msg),
    onParam: (m, id, v) => audio.sendParam(m, id, v),
  });
  rack.onSave = (patch) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(patch)); } catch (e) {}
  };

  // toolbar
  const sel = document.getElementById('module-select');
  for (const m of MODULE_MENU) {
    const o = document.createElement('option');
    if (m.separator) { o.disabled = true; o.textContent = '----------'; }
    else { o.value = m.type; o.textContent = m.label; }
    sel.appendChild(o);
  }
  // a focused <select> would swallow computer-keyboard notes; drop focus once a choice is made
  sel.addEventListener('change', () => sel.blur());
  document.getElementById('add-module').addEventListener('click', () => rack.addModule(sel.value));
  document.getElementById('save-patch').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(rack.serialize(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'soundfreak-patch.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  const fileIn = document.getElementById('load-file');
  document.getElementById('load-patch').addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', () => {
    const f = fileIn.files[0];
    if (!f) return;
    f.text().then((t) => {
      try { rack.load(JSON.parse(t)); } catch (e) { alert('Not a valid patch file.'); }
      fileIn.value = '';
    });
  });
  document.getElementById('default-patch').addEventListener('click', () => rack.load(defaultPatch()));
  document.getElementById('clear-patch').addEventListener('click', () => rack.clear());

  // restore
  let restored = false;
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) restored = rack.load(JSON.parse(s)) && rack.modules.length > 0;
  } catch (e) { restored = false; }
  if (!restored) rack.load(defaultPatch());

  // Pressing on the rack must take keyboard focus away from the toolbar.
  // Knobs, keys and jacks cancel pointerdown, so the browser never moves focus
  // itself; a focused <select> would then swallow the computer-keyboard notes
  // (keyboard-ui ignores key events whose target is a form control).
  const releaseToolbarFocus = (ev) => {
    const a = document.activeElement;
    if (a && a !== document.body && typeof a.blur === 'function' && !a.contains(ev.target)) a.blur();
  };
  window.addEventListener('pointerdown', releaseToolbarFocus, { capture: true });

  // audio starts on first gesture
  const startOnce = () => { audio.start(); };
  window.addEventListener('pointerdown', startOnce, { capture: true });
  window.addEventListener('keydown', startOnce, { capture: true });
  if (new URLSearchParams(location.search).has('autostart')) audio.start();

  window.soundfreak = { rack, audio };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
