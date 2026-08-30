/* ============================================================
   GEI DAM ACADEMY — CANONICAL SKIN SYSTEM
   ------------------------------------------------------------
   Skins are REAL visual game states (Master Prompt §23):
   equipping a skin visibly changes the game on every page.

   Loaded by (in <head>, before first paint — no flash):
     index.html · level1–6.html · vault.html

   Public API:
     window.GEI_SKINS.init()     — read canonical state, apply equipped skin
     window.GEI_SKINS.apply()    — re-apply current state (after equip)
     window.GEI_SKINS.equipped() — current skin id ('' = Classic)
     window.GEI_SKINS.SKINS      — catalog: {id, name, icon, desc, dark, light}
     window.GEI_SKINS.preview(id)— palette for hero previews in the Vault

   Equipped skin lives in canonical state:
     gei-academy-state-v1 → rewards.equippedSkin
   No extra localStorage keys (Master Prompt §8/§13).
   ============================================================ */
(function () {
  'use strict';

  if (window.__GEI_SKINS__) return;
  window.__GEI_SKINS__ = true;

  var KEY = 'gei-academy-state-v1';

  /* Each skin: dark + light palettes. Only brand variables are overridden,
     so theme ink/muted contrast is preserved in both modes. */
  var SKINS = [
    {
      id: 'mountain', name: 'Mountain', icon: '🏔️',
      desc: 'Moss and granite — the source above the valley.',
      dark:  { '--bg': '#0b1f14', '--frame': '#0e2619', '--panel': '#123423', '--panel2': '#17402c', '--aqua': '#7cb56d', '--brass': '#c98f4e' },
      light: { '--bg': '#eaf4ec', '--frame': '#ffffff', '--panel': '#f0f7f1', '--panel2': '#e2efe5', '--aqua': '#4c8a3f', '--brass': '#a86f33' }
    },
    {
      id: 'hotpink', name: 'Hot Pink', icon: '💖',
      desc: 'Loud, proud, unmistakable. The dam with an attitude.',
      dark:  { '--bg': '#200a18', '--frame': '#2a0e20', '--panel': '#38142c', '--panel2': '#451a37', '--aqua': '#ff5da2', '--brass': '#ffd166' },
      light: { '--bg': '#fdeef5', '--frame': '#ffffff', '--panel': '#fff0f7', '--panel2': '#ffe3ef', '--aqua': '#d63a84', '--brass': '#d9a417' }
    },
    {
      id: 'babyblue', name: 'Baby Blue', icon: '🩵',
      desc: 'Calm water colors — the reservoir at first light.',
      dark:  { '--bg': '#08182a', '--frame': '#0b1f38', '--panel': '#102a4c', '--panel2': '#15345c', '--aqua': '#6fc3ff', '--brass': '#b8a1ff' },
      light: { '--bg': '#ecf5fd', '--frame': '#ffffff', '--panel': '#f2f9ff', '--panel2': '#e4f1fc', '--aqua': '#2f8fd6', '--brass': '#8a6fd6' }
    },
    {
      id: 'academic', name: 'Academic', icon: '🎓',
      desc: 'Navy and gold — the Master Builder\u2019s study hall.',
      dark:  { '--bg': '#0a1220', '--frame': '#0e1a30', '--panel': '#14233f', '--panel2': '#1a2c4e', '--aqua': '#4f7cc7', '--brass': '#e0b83d' },
      light: { '--bg': '#edf1f8', '--frame': '#ffffff', '--panel': '#f2f5fb', '--panel2': '#e6ecf7', '--aqua': '#3a62b0', '--brass': '#b08a1e' }
    },
    {
      id: 'blueprint', name: 'Blueprint', icon: '📐',
      desc: 'Engineering lines over deep water. The plan made visible.',
      dark:  { '--bg': '#04121f', '--frame': '#061a2c', '--panel': '#0a2440', '--panel2': '#0e2f52', '--aqua': '#38d6ff', '--brass': '#7fa8ff' },
      light: { '--bg': '#e9f4fb', '--frame': '#ffffff', '--panel': '#eff8fd', '--panel2': '#e0f0fa', '--aqua': '#0f86c0', '--brass': '#4a74d0' }
    },
    {
      id: 'obsidian', name: 'Obsidian Premium', icon: '🖤',
      desc: 'Black glass and gold. The vault\u2019s quietest, richest finish.',
      dark:  { '--bg': '#0a0a0f', '--frame': '#101018', '--panel': '#16161f', '--panel2': '#1d1d29', '--aqua': '#d4af37', '--brass': '#b9c6d6' },
      light: { '--bg': '#f2f2f5', '--frame': '#ffffff', '--panel': '#f7f7fa', '--panel2': '#ececf2', '--aqua': '#8a6d1a', '--brass': '#5a6b80' }
    }
  ];

  function byId(id) {
    for (var i = 0; i < SKINS.length; i++) if (SKINS[i].id === id) return SKINS[i];
    return null;
  }

  function cssBlock(s, theme) {
    var p = s[theme];
    var sel = '[data-theme="' + theme + '"][data-skin="' + s.id + '"]{';
    var out = '';
    for (var k in p) out += k + ':' + p[k] + ';';
    return sel + out + '}';
  }

  function allCss() {
    var out = '';
    for (var i = 0; i < SKINS.length; i++) {
      out += cssBlock(SKINS[i], 'dark') + '\n' + cssBlock(SKINS[i], 'light') + '\n';
    }
    return out;
  }

  function readState() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }

  function equipped() {
    var r = readState().rewards;
    return (r && typeof r.equippedSkin === 'string') ? r.equippedSkin : '';
  }

  function ensureStyle() {
    if (document.getElementById('gei-skins-v1')) return;
    var el = document.createElement('style');
    el.id = 'gei-skins-v1';
    el.textContent = allCss();
    (document.head || document.documentElement).appendChild(el);
  }

  function apply() {
    var id = equipped();
    var valid = byId(id);
    var html = document.documentElement;
    if (valid) html.setAttribute('data-skin', id);
    else html.removeAttribute('data-skin');
    ensureStyle();
  }

  window.GEI_SKINS = {
    SKINS: SKINS,
    init: apply,
    apply: apply,
    equipped: equipped,
    byId: byId,
    preview: function (id) {
      var s = byId(id) || byId('mountain');
      return s.dark; // previews render in the signature dark palette
    }
  };

  // Head-loaded: document.head exists, so apply before first paint.
  if (document.head) apply();
  else document.addEventListener('DOMContentLoaded', apply);
})();
