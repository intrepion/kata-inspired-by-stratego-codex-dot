# Veil of the Salt Crown

An original hidden-rank tactical board game for one player against the Dusk Covenant. Arrange the Amber Compact, cross the salt basins, reveal enemy units through combat, and capture their Crown. Custom SVG seals, coastal colors and writing are original; no publisher art or branding is used.

## Play locally

```sh
npm ci
npm run build
PORT=5200 npm run start:detached
```

Open http://127.0.0.1:5200. The launcher creates a detached Node child for this login session; it does not add boot/login automation. PID and log are in `.play-server.pid` and `.play-server.log`. The launcher checks the port and refuses to replace an existing service. If the saved PID still belongs to this game's `scripts/serve.mjs`, stop that process before restarting. Existing unrelated servers are preserved.

For development: `npm run dev -- --port 5200 --strictPort` after stopping this game's preview. Tests: `npm run check` (type check, production build, then rule/session/DOM tests and 200 simulations); security: `npm audit --audit-level=moderate`. No runtime libraries, analytics, services, public deployment or account are needed. Node 24 is used in CI.

## Commands and persistence

Click a unit, then a glowing square. Arrows move board focus; Enter/Space activates; Escape cancels selection. Setup swaps two home units and offers shuffle. Field guide explains every rule and offers four reduced practice formations. Autosave stores setup changes, each move, pending AI phase and completed results in this browser's localStorage. Reload resumes the saved phase. New battle/rematch replaces that save; drills clearly warn that they do too. Storage failures are reported in the command panel.

## Rules and adaptations

- 6×8 board; twelve units per army in two home rows; basins at B4, B5, E4 and E5. Amber takes the first turn.
- Crown ×1 and Ward ×2 cannot move. Regent 6 ×1, Sentinel 5 ×1, Captain 4 ×2, Sapper 3 ×2, Runner 2 ×2 and Shade 1 ×1 make up the mobile army.
- Most units move one square orthogonally. Runners travel/attack any clear straight distance, without jumping. A move longer than one square reveals a Runner.
- Higher rank wins; equal ranks remove both. Winning attacker occupies defender's square; winning defender stays. Sapper disarms Ward; other attackers lose to Ward. Attacking Shade defeats Regent; Regent attacking Shade wins. Shade-versus-Shade removes both. Any mobile unit captures a Crown.
- Capture Crown or leave the opponent with no legal move to win. Both blocked draws. Three occurrences of the exact board and side to act, or 80 consecutive actions without combat, draws. These replace publisher oscillation rules; no separate back-and-forth restriction is enforced.
- Revealed survivors stay visible permanently. Fewer ranks and units replace the standard large army. The opponent randomizes its own formation, then protects a randomly chosen rear Crown with two Wards.

Research: [PlayMonster / Royal Jumbo official rules](https://www.playmonster.com/wp-content/uploads/2018/06/7471_Classic_English_Rules.pdf) and [Hasbro official manual](https://www.hasbro.com/common/instruct/Stratego.PDF). See [research notes](docs/rules-research.md) for the adopted conventions.

## Fairness and verification

The AI receives a redacted observation containing its own identities, enemy positions, public reveals and observed movement. It uses expected combat value, reachable objectives, known threats and Crown defense. It never receives the authoritative state. Unit IDs contain only side and slot. The interface also uses observations; concealed ranks do not enter labels, tooltips, previews, attributes or DOM state. Tests permute concealed identities and verify equal observations, deterministic AI choices and enemy DOM markup.

Local-only play is **not cheat-proof**: deliberate inspection of code, memory or the save can reveal identities. The AI is a tactical heuristic, not a tournament-level search engine. Use one active game tab; concurrent tabs have separate timers and can overwrite the same autosave.

[Validation and honest limitations](docs/validation.md) · [Independent standards/spec reviews](docs/review.md) · [Design specification](docs/spec.md) · [Glossary](GLOSSARY.md).

## Play online

[Play the hosted game](https://intrepion.github.io/kata-inspired-by-stratego-codex-dot/)
