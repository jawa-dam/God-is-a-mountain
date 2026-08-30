/* ============================================================
   GEI DAM ACADEMY — CANONICAL VAULT ECONOMY ENGINE
   ------------------------------------------------------------
   ONE vault system for the Academy (Master Prompt §16).
   The player-facing vault (vault.html) is this engine.

   Business rules (Master Prompt §17–18):
     · Vault access unlocks when Level 6 is fully complete (6/6).
     · 900 XP = EXACTLY ONE vault item. 900 XP never unlocks the
       whole vault — every item is purchased individually.
     · Spend flow: item -> description -> cost -> current XP ->
       XP after purchase -> explicit CONFIRM -> deduct.
     · Certificate is EARNED free on Level 6 completion; it is
       rendered from the completion snapshot (identity is never
       rewritten by a later profile rename — §21).
     · Skins are real visual states (js/gei-skins.js).
     · The frontend never fabricates payment entitlements (§20):
       economy.entitlements is reserved for server-verified
       purchases and is never populated by client code.

   Canonical state (gei-academy-state-v1) — read -> migrate ->
   preserve -> write; unknown stored fields are kept, never dropped:
     rewards.ownedVaultItems : ['video','mountain',...]
     rewards.skins           : owned skin ids
     rewards.equippedSkin    : '' (Classic) or a skin id
     rewards.certificate     : {name,xp,date,id}  (snapshot)
     rewards.vaultAccess     : bool (set once at 6/6)
     economy.xpSpent         : lifetime XP spent in the vault
     economy.transactions    : [{id,item,cost,xpBefore,xpAfter,at}]
     economy.entitlements    : []  (server-verified only, §20)

   Public API:
     window.GEI_ECON = { ITEM_COST, CATALOG, read, write, unlocked,
       ensureCert, item(id), isOwned, buy, equip, spendableXp }
   ============================================================ */
(function () {
  'use strict';

  if (window.__GEI_ECON__) return;
  window.__GEI_ECON__ = true;

  var KEY = 'gei-academy-state-v1';
  var ITEM_COST = 900; // permanent business rule: 900 XP = one vault item

  function defaultRewards() {
    return { badges: [], achievements: [], certificate: null, vaultAccess: false, ownedVaultItems: [], skins: [], equippedSkin: '' };
  }
  function defaultEconomy() {
    return { xpSpent: 0, transactions: [], entitlements: [] };
  }

  /* READ -> MIGRATE -> PRESERVE -> WRITE (never drop unknown fields). */
  function read() {
    var d = {
      name: '', xp: 0, completed: [], avatar: '', theme: 'dark',
      level1Tasks: [], level2Tasks: [], level3Tasks: [],
      level4Tasks: [], level5Tasks: [], level6Tasks: [],
      rewards: defaultRewards(), economy: defaultEconomy()
    };
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o === 'object') Object.assign(d, o);
    } catch (e) {}
    if (!Array.isArray(d.completed)) d.completed = [];
    d.xp = Number(d.xp || 0);
    var r = (d.rewards && typeof d.rewards === 'object') ? d.rewards : defaultRewards();
    ['badges', 'achievements', 'ownedVaultItems', 'skins'].forEach(function (k) {
      if (!Array.isArray(r[k])) r[k] = [];
    });
    if (typeof r.equippedSkin !== 'string') r.equippedSkin = '';
    if (typeof r.vaultAccess !== 'boolean') r.vaultAccess = false;
    d.rewards = r;
    var e = (d.economy && typeof d.economy === 'object') ? d.economy : defaultEconomy();
    if (!Array.isArray(e.transactions)) e.transactions = [];
    if (!Array.isArray(e.entitlements)) e.entitlements = [];
    e.xpSpent = Number(e.xpSpent || 0);
    d.economy = e;
    return d;
  }

  function write(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  function unlocked() { return read().completed.length >= 6; }

  function item(id) {
    for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].id === id) return CATALOG[i];
    return null;
  }

  function isOwned(s, id) { return s.rewards.ownedVaultItems.indexOf(id) !== -1; }

  function spendableXp(s) { return Math.max(0, Number(s.xp) - 0); } // one pool: canonical XP

  /* First-issuance of the certificate snapshot for players who completed
     Level 6 before snapshots existed (legacy migration). A snapshot, once
     written, is NEVER rewritten by profile edits (§21). */
  function ensureCert(s) {
    var changed = false;
    if (s.completed.length >= 6) {
      if (!s.rewards.vaultAccess) { s.rewards.vaultAccess = true; changed = true; }
      if (!s.rewards.certificate || typeof s.rewards.certificate !== 'object') {
        s.rewards.certificate = {
          name: s.name || 'Explorer',
          xp: Number(s.xp || 0),
          date: new Date().toISOString(),
          id: 'GEI-MB-' + Date.now().toString(36).toUpperCase()
        };
        changed = true;
      }
    }
    if (changed) write(s);
    return s.rewards.certificate;
  }

  /* Permanent catalog. 900 XP per item — never a bulk unlock. */
  var CATALOG = [
    { id: 'video', kind: 'video', icon: '🎬', cost: ITEM_COST,
      name: "A'Dam Video Vault",
      desc: 'The exclusive GEI video — the whole water-control build, told in motion.' },
    { id: 'mountain', kind: 'skin', icon: '🏔️', cost: ITEM_COST, name: 'Mountain Skin',
      desc: 'Moss and granite — the source above the valley.' },
    { id: 'hotpink', kind: 'skin', icon: '💖', cost: ITEM_COST, name: 'Hot Pink Skin',
      desc: 'Loud, proud, unmistakable. The dam with an attitude.' },
    { id: 'babyblue', kind: 'skin', icon: '🩵', cost: ITEM_COST, name: 'Baby Blue Skin',
      desc: 'Calm water colors — the reservoir at first light.' },
    { id: 'academic', kind: 'skin', icon: '🎓', cost: ITEM_COST, name: 'Academic Skin',
      desc: 'Navy and gold — the Master Builder\u2019s study hall.' },
    { id: 'blueprint', kind: 'skin', icon: '📐', cost: ITEM_COST, name: 'Blueprint Skin',
      desc: 'Engineering lines over deep water. The plan made visible.' },
    { id: 'obsidian', kind: 'skin', icon: '🖤', cost: ITEM_COST, name: 'Obsidian Premium',
      desc: 'Black glass and gold. The vault\u2019s quietest, richest finish.' }
  ];

  /* Explicit confirmation required: only deducts after CONFIRM (§18). */
  function buy(s, idOrItem) {
    var it = (typeof idOrItem === 'string') ? item(idOrItem) : idOrItem;
    if (!it) return { ok: false, error: 'unknown-item' };
    if (isOwned(s, it.id)) return { ok: false, error: 'already-owned' };
    if (Number(s.xp) < it.cost) return { ok: false, error: 'insufficient-xp' };
    var before = Number(s.xp);
    s.xp = before - it.cost;
    s.rewards.ownedVaultItems.push(it.id);
    if (it.kind === 'skin') s.rewards.skins.push(it.id);
    s.economy.xpSpent += it.cost;
    s.economy.transactions.push({
      id: 'TX-' + Date.now().toString(36).toUpperCase(),
      item: it.id, cost: it.cost,
      xpBefore: before, xpAfter: s.xp,
      at: new Date().toISOString()
    });
    write(s);
    return { ok: true, xpAfter: s.xp };
  }

  function equip(s, skinId) {
    var fresh = read();
    if (skinId && fresh.rewards.skins.indexOf(skinId) === -1) {
      return { ok: false, error: 'not-owned' };
    }
    fresh.rewards.equippedSkin = skinId || '';
    write(fresh);
    try { if (window.GEI_SKINS) window.GEI_SKINS.apply(); } catch (e) {}
    return { ok: true };
  }

  window.GEI_ECON = {
    KEY: KEY,
    ITEM_COST: ITEM_COST,
    CATALOG: CATALOG,
    read: read,
    write: write,
    unlocked: unlocked,
    ensureCert: ensureCert,
    item: item,
    isOwned: isOwned,
    spendableXp: spendableXp,
    buy: buy,
    equip: equip
  };
})();
