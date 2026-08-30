# GEI Dam Academy — Release Notes
## Foundation Pass · 2026-08-30

Built from the approved full audit (`Claude audit.txt`) and the Master
Production Build Prompt. Every change below was applied in controlled,
anchored passes and verified with automated DOM tests.

---

### A. Bugs fixed (audit findings B1–B9 + new finding B10)

| # | Finding | Fix |
|---|---|---|
| **B1** | Two competing audio engines (dashboard had its own inline engine; levels loaded the shared one) | `index.html` now loads the canonical `js/gei-game-audio.js` with the same `gei-audio-canonical-bridge` as the level pages. Local `ac()/tone()/sound()` deleted. Dashboard events mapped to canonical kinds. |
| **B2** | Double audio-trigger layers per level (bindGEI + polish engine) → double sounds on ON, mute ignored | `bindGEI` layer **removed** from all 6 levels. One single mute-aware document listener per level now plays every mission event. Verified: ON = exactly one sound per event; OFF = zero sounds. |
| **B3** | Two parallel vaults; player-facing vault had no XP logic | `vault.html` is now the **one** canonical vault, built on `js/gei-vault-economy-engine.js` (900 XP per item, preview → confirm → deduct, ledger). Dashboard Vault tab routes to it; inline video modal deleted. |
| **B4** | Dashboard `DEFAULTS` missing `level6Tasks` → dashboard write **erased Level 6 progress** | `level6Tasks` added; `rewards`/`economy` schema added; `readState` deep-clones defaults. Regression-tested (a theme toggle on the dashboard no longer touches Level 6 tasks). |
| **B5** | Completion cards always showed `0 XP` / `0/6 DAYS` | `completeLevel()` now populates `#xpTotal` (total XP) and `#daysTotal` (completed levels) on all 6 levels. |
| **B6** | Level 6 used the ordinary completion card; button said "Next: Level 1" | Distinct **graduation** card: "🎉 GEI FOUNDATION COMPLETE / 🏆 MASTER BUILDER", animated gold treatment, all four unlocks listed, `🏆 ENTER THE VAULT → vault.html`. Level 6 NEXT tab → VAULT. Certificate identity snapshot written on completion (rename can't rewrite it). |
| **B7** | Locked levels rendered a blank page | Visible lock screen on levels 2–6: "🔒 LEVEL N LOCKED / Complete Level N-1 first" + back-to-previous-level button. |
| **B8** | Second localStorage key (sound preference) | **Left as-is** (pre-existing documented debt; folding it into canonical state is a future migration, per the audit). No new keys were introduced by this pass. |
| **B9** | Correct answer was always option A | Options shuffled at render time on every level; the correct answer keeps its logical identity (`data-j=0`). Verified: display position varies across loads; every question keeps exactly 3 distinct options. |
| **B10** (new) | Every level page had a literal `href="__PREV__"` placeholder (broken link) | Replaced with real previous-level links (Level 1 PREV → dashboard). |

### B. New canonical files

1. **`js/gei-game-audio.js`** — the one audio engine (Master Prompt §10–14)
   - `window.sound(kind)` + `window.GEI_AUDIO_UNLOCK()`
   - Canonical kinds: `click, correct, wrong, save, level-complete, fanfare, certificate, vault`
   - Mobile-safe: no `AudioContext` before first real gesture; `resume()` on unlock;
     pre-gesture requests are silently skipped (never a crash, never fake "audio works")
   - Master-bus gain with headroom; unknown kinds → `console.warn()` once
   - Single-instance guard (`__GEI_AUDIO_ENGINE__`)
   - Event map: TAP→click · CORRECT→correct · WRONG→gentle womp · SAVE/NEXT→save ·
     LEVEL COMPLETE→level-complete (+ premium certificate fanfare on the Level 6 finale) ·
     VAULT entry→vault · purchase→fanfare
2. **`js/gei-vault-economy-engine.js`** — canonical vault economy (§16–18, §20)
   - Permanent rule: **900 XP = exactly one item**; no bulk unlocks, ever
   - Spend flow: name + description + cost + current XP + XP after + explicit CONFIRM
   - Certificate is **earned free** on Level 6 completion (per §21's explicit
     unlock condition) and rendered from the completion snapshot
   - `economy.entitlements` reserved for server-verified purchases — client code
     never populates it (§20: localStorage is not trusted for payment)
3. **`js/gei-skins.js`** — canonical skin system (§23)
   - 6 skins (Mountain, Hot Pink, Baby Blue, Academic, Blueprint, Obsidian Premium)
   - Real visual states: background, frame, panels, buttons, gauge, fills, accents —
     applied on dashboard, all 6 levels, and the vault
   - Hero previews in the vault show each skin's live animated palette before purchase

### C. Business-rule decisions made (please confirm)

- **Certificate = earned free at Level 6 completion** (prompt §21 states the unlock
  condition is Level 6 completion). **Video + each skin = 900 XP purchases.**
- **XP is one pool**: purchasing deducts from the same `xp` the Academy tracks
  (prompt §4 forbids competing XP systems). A foundation run earns 900 XP total,
  which is exactly one vault item — matching the "LEARN → EARN → … → PURCHASE XP"
  model where continued engagement (Missions 07–38) and future real-money XP
  funding further purchases. The XP ledger in the vault shows every transaction.
- **Vault shop list scrolls internally** — the single justified exception to the
  no-scroll game rule (§30): it is a catalog, not gameplay. All gameplay screens
  remain fixed-frame, no-scroll.

### D. Deployment hardening (2026-08-30 — "dashboard buttons don't work" incident)

The first live deployment uploaded the three JS files to the **repo root**
instead of the **`js/` subfolder**, so every `<script src="js/…">` tag 404'd.
On the dashboard that turned into `ReferenceError: sound is not defined`
mid-handler — tabs couldn't switch and the username save never re-rendered
the page; `vault.html` rendered blank (`GEI_ECON` undefined).

Hardening added (this is what makes a wrong-folder upload non-fatal):
- **`gei-audio-engine-guard`** (all 8 pages): if the canonical engine file
  404s, a no-op `sound()`/`GEI_AUDIO_UNLOCK()` is installed with a one-time
  `console.warn` diagnostic. This is a deployment guard, **not** a second
  audio engine — it produces no sound and never overrides a loaded engine.
- **`vault.html`**: a missing economy engine shows a clear
  "VAULT ENGINE NOT LOADED" card with a way back, instead of a blank page.
- **`index.html`**: `confetti()` is wrapped in try/catch so a visual effect
  can never block the functional `render()` (found while reproducing the
  incident under jsdom, which has no canvas).
- New test suite `deploy404.test.js` (16 assertions) pins this regression:
  with the engines absent, dashboard buttons work, level gameplay works,
  the vault shows the diagnostic, and zero uncaught page errors occur.

**The actual fix for the live site** = put the three files in `js/`
(see deployment steps below); the guards are defense-in-depth.

**Deployment steps (GitHub web UI, no git needed):**
1. In the repo, click the **+** next to "Add file" → **Create new file**.
2. Name it `js/gei-game-audio.js` (the slash creates the `js` folder),
   paste the file contents, commit.
3. Repeat for `js/gei-skins.js` and `js/gei-vault-economy-engine.js`.
4. Delete the three root-level copies (open each → 🗑 → **Delete this file** → commit).
5. Wait ~1 minute for GitHub Pages to rebuild, then verify:
   `https://jawa-dam.github.io/God-is-a-mountain/js/gei-game-audio.js` → **200**
   (it was 404; the root-level copy was 200 at the wrong path).
   Or via git: `git clone … && mkdir js && git mv gei-*.js js/ && git commit -am "fix: js/ folder" && git push`.

### E. Verification (Master Prompt §38 — mandatory distinction)

**CODE VERIFIED ✅ — 190/190 automated assertions, all passing:**
- Fresh-player Level 1 journey (incl. deliberate wrong answer, retry window,
  +150 XP, completion card shows real stats) — 106 assertions (`smoke.test.js`)
- Answer randomization across 10 renders + per-question option integrity
- Lock screens, username gates (levels + vault), `?return=` destination
- B4 regression: dashboard write preserves `level6Tasks` + full state
- Audio runtime path (stubbed Web Audio API emulating mobile autoplay):
  no context pre-gesture → gesture → unlock → resume → running; exact note
  sequences for all 8 canonical kinds; unknown-kind diagnostics;
  mute ON = one sound per event, mute OFF = zero sounds;
  full Level 6 finale = exactly 51 notes (no double-firing) — 30 assertions (`audio.test.js`)
- Vault: locked state, gate, legacy certificate issuance, full purchase math
  (900→0, ledger, disabled confirm when broke, no deduction without confirm),
  buy→equip→reskin→classic flow, cross-page skin application,
  certificate snapshot fidelity under rename, dashboard→vault routing — 38 assertions (`vault.test.js`); missing-engine deployment regression — 16 assertions (`deploy404.test.js`)

**PACKAGE VERIFIED ✅** — `SHA256SUMS.txt` covers the exact 13 release files;
zip built from those files (not from memory).

**LIVE DEPLOYMENT VERIFIED ❌** — not deployed yet.
**DEVICE VERIFIED ❌** — audio must still be confirmed on a physical
Android + iPhone (real speakers, real autoplay policy). The stubbed-Web-Audio
tests prove the *code path*, not the device output — per §38 we say so plainly.

### F. Suggested device test script (next session)

1. 🔊 ON: tap (click) · correct (correct) · wrong (womp) · next (save) ·
   level complete (fanfare) · Level 6 (fanfare + premium certificate fanfare) ·
   vault entry (premium vault fanfare) · purchase (big fanfare)
2. 🔇 OFF: repeat all events → zero sound.
3. Kill the app mid-level, reopen → progress intact.
4. Save name with `?return=` link → lands back on the intended level.

### G. Out of scope this pass (per Master Prompt §40 — don't jump ahead)

Animated skin environments/particles beyond palette reskin (Phase 7 depth),
certificate PDF export (printable HTML is in), Missions 07–38,
secure backend + real-money purchases (Phase 9–10), Play Store packaging (Phase 11).
