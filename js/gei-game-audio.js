/* ============================================================
   GEI DAM ACADEMY — CANONICAL GAME AUDIO ENGINE
   ------------------------------------------------------------
   ONE shared audio engine for the entire Academy:
     index.html (Control Room) · level1–6.html · vault.html

   Public API (stable):
     window.sound(kind)        — play a named event
     window.GEI_AUDIO_UNLOCK() — call on first real user gesture

   Canonical kinds (Master Prompt §11):
     click          TAP
     correct        CORRECT ANSWER
     wrong          WRONG ANSWER (gentle womp)
     save           SAVE / NEXT
     level-complete LEVEL COMPLETE (standard fanfare)
     fanfare        BIG FANFARE (premium moments, e.g. purchase)
     certificate    PREMIUM CERTIFICATE FANFARE
     vault          PREMIUM VAULT FANFARE

   Mobile safety (Master Prompt §12):
     - No AudioContext is created before a real user gesture.
     - Page-side bridges call GEI_AUDIO_UNLOCK() once on
       pointerdown/touchstart/mousedown/keydown (capture, once).
     - If a sound is requested before unlock, it is silently
       skipped — never a crash, never a fake "audio works".

   Diagnostics (Master Prompt §14):
     - Unknown kinds -> console.warn() exactly once per kind.
     - Engine never throws into gameplay.

   Do NOT add a second audio engine or extra trigger layers
   (Master Prompt §10, §13).
   ============================================================ */
(function () {
  'use strict';

  if (window.__GEI_AUDIO_ENGINE__) return; // guard: one engine instance only
  window.__GEI_AUDIO_ENGINE__ = true;

  var ctx = null;
  var master = null;
  var unlocked = false;
  var warnedUnknown = {};
  var warnedNoWebAudio = false;

  /* ---------- context / master bus ---------- */

  function makeContext() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        if (!warnedNoWebAudio) {
          warnedNoWebAudio = true;
          console.warn('[GEI audio] Web Audio API not available on this device/browser — Academy will run silent.');
        }
        return false;
      }
      if (!ctx) {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.9; // headroom so stacked notes never clip
        master.connect(ctx.destination);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function resumeCtx() {
    try { if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {}); } catch (e) {}
  }

  /**
   * GEI_AUDIO_UNLOCK() — first real user gesture:
   * initialize -> resume -> confirm. Safe to call repeatedly.
   */
  function unlock() {
    if (!unlocked) {
      if (!makeContext()) return;
      unlocked = true;
    }
    resumeCtx();
  }
  window.GEI_AUDIO_UNLOCK = unlock;

  /* ---------- synth primitives ---------- */

  function tone(freq, dur, o) {
    if (!ctx || !master) return;
    try {
      o = o || {};
      var t0 = ctx.currentTime + (o.when || 0);
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = o.type || 'sine';
      if (o.glideTo) {
        osc.frequency.setValueAtTime(freq, t0);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.glideTo), t0 + dur);
      } else {
        osc.frequency.setValueAtTime(freq, t0);
      }
      var peak = o.vol || 0.12;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + (o.attack || 0.012));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch (e) { /* never break gameplay on a synth hiccup */ }
  }

  function chord(freqs, dur, o) {
    for (var i = 0; i < freqs.length; i++) tone(freqs[i], dur, o);
  }

  /* ---------- canonical event definitions ---------- */

  var KINDS = {
    click: function () {
      tone(520, 0.05, { type: 'triangle', vol: 0.06 });
    },
    correct: function () {
      tone(659.25, 0.12, { type: 'triangle', vol: 0.14 });
      tone(880, 0.16, { type: 'triangle', vol: 0.13, when: 0.09 });
      tone(1318.5, 0.20, { type: 'triangle', vol: 0.10, when: 0.18 });
    },
    wrong: function () {
      tone(196, 0.22, { type: 'sine', vol: 0.10, glideTo: 147 });
      tone(147, 0.26, { type: 'sine', vol: 0.07, when: 0.10, glideTo: 108 });
    },
    save: function () {
      tone(523.25, 0.10, { type: 'triangle', vol: 0.13 });
      tone(783.99, 0.14, { type: 'triangle', vol: 0.11, when: 0.08 });
    },
    'level-complete': function () {
      var notes = [523.25, 659.25, 783.99, 1046.5];
      for (var i = 0; i < notes.length; i++) {
        tone(notes[i], 0.16, { type: 'square', vol: 0.09, when: i * 0.11 });
      }
      tone(1046.5, 0.35, { type: 'triangle', vol: 0.10, when: 0.44 });
    },
    fanfare: function () {
      var seq = [ [523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.36], [1318.5, 0.5] ];
      for (var i = 0; i < seq.length; i++) tone(seq[i][0], 0.18, { type: 'square', vol: 0.08, when: seq[i][1] });
      chord([523.25, 659.25, 783.99, 1046.5], 0.75, { type: 'triangle', vol: 0.07, when: 0.62 });
    },
    certificate: function () {
      var run = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
      for (var i = 0; i < run.length; i++) tone(run[i], 0.22, { type: 'triangle', vol: 0.11, when: i * 0.11 });
      chord([1046.5, 1318.5, 1567.98], 0.9, { type: 'sine', vol: 0.05, when: 0.66 });
      tone(2093, 0.5, { type: 'sine', vol: 0.03, when: 0.8 });
    },
    vault: function () {
      tone(98, 0.4, { type: 'sine', vol: 0.16, glideTo: 73 });
      tone(196, 0.3, { type: 'triangle', vol: 0.10, when: 0.12, glideTo: 147 });
      var brass = [523.25, 659.25, 783.99];
      for (var i = 0; i < brass.length; i++) tone(brass[i], 0.2, { type: 'square', vol: 0.07, when: 0.3 + i * 0.1 });
      chord([523.25, 659.25, 783.99, 1046.5], 0.8, { type: 'triangle', vol: 0.08, when: 0.62 });
    }
  };

  /* ---------- public sound API ---------- */

  window.sound = function (kind) {
    if (typeof kind !== 'string') {
      console.warn('[GEI audio] sound(kind): kind must be a string, got:', typeof kind);
      return;
    }
    var fn = KINDS[kind];
    if (!fn) {
      if (!warnedUnknown[kind]) {
        warnedUnknown[kind] = true;
        console.warn('[GEI audio] unknown sound kind: "' + kind + '". Registered kinds: ' + Object.keys(KINDS).join(', '));
      }
      return;
    }
    if (!unlocked) {
      // Requested before the first gesture: try to create the context anyway
      // (harmless on desktop; on mobile it stays suspended until a gesture).
      if (!makeContext()) return;
      unlocked = true;
    }
    if (!ctx || ctx.state !== 'running') {
      // Suspended (mobile autoplay policy) — ask to resume, stay silent otherwise.
      resumeCtx();
      if (!ctx || ctx.state !== 'running') return;
    }
    try { fn(); } catch (e) { console.warn('[GEI audio] kind "' + kind + '" failed:', e); }
  };

  /* ---------- diagnostics / test hook ---------- */

  window.__GEI_AUDIO__ = {
    unlocked: function () { return unlocked; },
    state: function () { return ctx ? ctx.state : 'no-context'; },
    kinds: Object.keys(KINDS)
  };
})();
