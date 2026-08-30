# GEI Dam Academy — Control Room

**Project:** Genesis Engineered Interpretations — GEI Dam Learning Academy
**Owner:** Wilbert Bouie Jr.
**Product loop:** LEARN → EARN → MASTER → UNLOCK → BUY / REDEEM

A six-level educational game. 6 levels × 6 questions = **36 foundation questions**.
No Day 7. Question n of every level is Day n (permanent rule).

## Play

Open `index.html` in any modern browser (mobile-first; works 320px–desktop).

1. Pick an avatar, save a username (username gate — enforced on every page).
2. Clear Level 1 → Level 6 (sequential unlock; 25 XP per correct answer;
   150 XP per level; cumulative floors 150/300/450/600/750/900).
3. Level 6 completion = **Foundation Complete / Master Builder**:
   certificate snapshot + A'Dam Vault unlocked.
4. In the Vault (`vault.html`), spend XP at the permanent rule
   **900 XP = one item** (video, each skin individually).

## Files

| File | Role |
|---|---|
| `index.html` | Control Room (dashboard): profile, gauge, six-level roadmap, Vault tab |
| `level1.html` … `level6.html` | The six foundation levels (Day 1–Day 6 mapping, sequential gating) |
| `vault.html` | Canonical A'Dam Vault (certificate, video, skins, rewards, XP ledger) |
| `js/gei-game-audio.js` | **The one** canonical audio engine — `sound(kind)`, `GEI_AUDIO_UNLOCK()` |
| `js/gei-skins.js` | Canonical skin system — real visual game states |
| `js/gei-vault-economy-engine.js` | Canonical vault economy — 900 XP/item, spend & confirm, ledger |

## Canonical state (one key: `gei-academy-state-v1`)

```
player:   name, avatar, xp, theme
progress: completed[], level1Tasks…level6Tasks
rewards:  badges[], achievements[], certificate{snapshot}, vaultAccess,
          ownedVaultItems[], skins[], equippedSkin
economy:  xpSpent, transactions[], entitlements[]   ← server-verified only (§20)
```

Rules: READ → MIGRATE → PRESERVE → WRITE. New fields never drop old data.
The only other key is the pre-existing sound preference
`gei-academy-sound-enabled-v1` (documented debt — see release notes).

## Audio API (one engine, all pages)

Kinds: `click · correct · wrong · save · level-complete · fanfare · certificate · vault`
- No `AudioContext` before the first real user gesture.
- Each page's `gei-audio-canonical-bridge` calls `GEI_AUDIO_UNLOCK()` once.
- One mission-audio path per page (single document-level listener).
- Unknown kinds → `console.warn()` once, never a crash.

## Skins (real visual game states)

`mountain · hotpink · babyblue · academic · blueprint · obsidian` — each 900 XP.
Equipping changes background, panels, buttons, gauge, fills and accents on
**every** page (dashboard, all levels, vault). `Classic` (default) is free.

## Verification status (Master Prompt §38)

- **CODE VERIFIED** ✅ — 190 automated DOM assertions (fresh-player journey,
  answer randomization, lock screens, username gate, state migration,
  audio runtime path with stubbed Web Audio, vault purchase/equip flows,
  certificate snapshot fidelity). See `RELEASE_NOTES.md`.
- **PACKAGE VERIFIED** ✅ — SHA256SUMS.txt over the exact release files.
- **LIVE DEPLOYMENT VERIFIED** ❌ — not yet deployed.
- **DEVICE VERIFIED** ❌ — audio behavior (real speakers, mobile autoplay)
  still needs a physical Android/iOS pass.

## Future (never before the foundation is stable)

Missions 07–38 · server-verified XP purchases · Play Store packaging.
