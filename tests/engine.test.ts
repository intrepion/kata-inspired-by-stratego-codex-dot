import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newGame,
  startBattle,
  legalMoves,
  move,
  observe,
  decodeSave,
  validSetup,
  swapSetup,
} from "../src/engine.js";
test("arrangement has complete armies and cannot start after an illegal arrangement", () => {
  const s = newGame(() => 0.4);
  assert.equal(validSetup(s), true);
  assert.equal(s.pieces.length, 24);
  assert.equal(startBattle(s).phase, "player");
  assert.equal(swapSetup(s, 24, 0), s);
  assert.equal(validSetup({ ...s, pieces: s.pieces.slice(1) }), false);
});
import {
  combat,
  type State,
  type Rank,
  type Piece,
  BASINS,
  shuffleSetup,
} from "../src/engine.js";
import { chooseMove } from "../src/ai.js";
function scenario(
  items: [string, Rank, number][],
  phase: "player" | "ai" = "player",
): State {
  const pieces: Piece[] = items.map(([id, rank, pos]) => ({
    id,
    side: id.startsWith("player") ? "player" : "ai",
    rank,
    pos,
    revealed: false,
    moved: false,
  }));
  return { ...newGame(), pieces, phase, history: [], log: [] };
}
test("setup swaps preserve rank inventory and shuffle only changes player arrangement", () => {
  const s = newGame(() => 0.5),
    next = swapSetup(s, 36, 37);
  assert.equal(next.pieces.find((p) => p.id === "player-0")?.pos, 37);
  assert.ok(validSetup(next));
  const shuffled = shuffleSetup(s, () => 0);
  assert.ok(validSetup(shuffled));
  assert.deepEqual(
    shuffled.pieces.filter((p) => p.side === "ai"),
    s.pieces.filter((p) => p.side === "ai"),
  );
  assert.equal(swapSetup(startBattle(s), 36, 37).phase, "player");
});
test("orthogonal moves prohibit terrain, friends and diagonals; immobile units stay put", () => {
  const s = scenario([
    ["player-0", 4, 18],
    ["player-1", 0, 47],
    ["player-2", 7, 36],
    ["ai-0", 0, 0],
  ]);
  assert.deepEqual(
    legalMoves(s)
      .filter((a) => a.from === 18)
      .map((a) => a.to)
      .sort((a, b) => a - b),
    [12, 24],
  );
  assert.ok(!legalMoves(s).some((a) => a.from === 47 || a.from === 36));
  assert.ok(!legalMoves(s).some((a) => BASINS.has(a.to)));
});
test("Runner stops at first occupied square, cannot jump basins and reveals on long move", () => {
  const s = scenario([
    ["player-0", 2, 30],
    ["player-1", 0, 47],
    ["ai-0", 0, 0],
    ["ai-1", 4, 32],
  ]);
  assert.deepEqual(
    legalMoves(s)
      .filter((a) => a.from === 30 && a.to >= 30 && a.to < 36)
      .map((a) => a.to),
    [31, 32],
  );
  const next = move(s, { from: 30, to: 12 }, "player");
  assert.equal(next.pieces.find((p) => p.id === "player-0")?.revealed, true);
  assert.equal(
    observe(next, "ai").pieces.find((p) => p.id === "player-0")?.rank,
    2,
  );
});
test("rank combat and every special matchup have explicit expected outcomes", () => {
  assert.equal(combat(5, 4), "attacker");
  assert.equal(combat(4, 5), "defender");
  assert.equal(combat(4, 4), "both");
  assert.equal(combat(3, 7), "attacker");
  assert.equal(combat(6, 7), "defender");
  assert.equal(combat(1, 6), "attacker");
  assert.equal(combat(6, 1), "attacker");
  assert.equal(combat(1, 1), "both");
  assert.equal(combat(1, 0), "attacker");
});
test("combat survivors are revealed, ties disappear, defense stays in place", () => {
  for (const [a, d] of [
    [5, 4],
    [4, 5],
    [4, 4],
  ] as [Rank, Rank][]) {
    const s = scenario([
      ["player-0", a, 30],
      ["player-1", 0, 47],
      ["ai-0", 0, 0],
      ["ai-1", d, 24],
      ["ai-2", 2, 1],
    ]);
    const n = move(s, { from: 30, to: 24 }, "player");
    assert.equal(n.quiet, 0);
    assert.equal(n.ply, 1);
    const survivor = n.pieces.find((p) => p.pos === 24);
    if (a === d) assert.equal(survivor, undefined);
    else assert.equal(survivor?.revealed, true);
  }
});
test("capture, one-sided no-move, both-blocked and quiet draw endings", () => {
  const s = scenario([
    ["player-0", 4, 6],
    ["player-1", 0, 47],
    ["ai-0", 0, 0],
  ]);
  assert.equal(move(s, { from: 6, to: 0 }, "player").winner, "player");
  assert.equal(move(s, { from: 6, to: 12 }, "player").winner, "player");
  const tied = scenario([
    ["player-0", 4, 6],
    ["player-1", 0, 47],
    ["ai-0", 0, 0],
    ["ai-1", 4, 7],
  ]);
  assert.equal(move(tied, { from: 6, to: 7 }, "player").winner, "draw");
  const quiet = scenario([
    ["player-0", 4, 30],
    ["player-1", 0, 47],
    ["ai-0", 0, 0],
    ["ai-1", 4, 6],
  ]);
  quiet.quiet = 79;
  assert.equal(move(quiet, { from: 30, to: 31 }, "player").winner, "draw");
});
test("threefold repetition draws and illegal, repeated or wrong-phase actions are inert", () => {
  let s = scenario([
    ["player-0", 4, 30],
    ["player-1", 0, 47],
    ["ai-0", 0, 0],
    ["ai-1", 4, 6],
  ]);
  assert.equal(move(s, { from: 30, to: 23 }, "player"), s);
  assert.equal(move(s, { from: 30, to: 31 }, "ai"), s);
  for (let i = 0; i < 3 && s.phase !== "end"; i++) {
    s = move(s, { from: 30, to: 31 }, "player");
    const same = s;
    assert.equal(move(s, { from: 30, to: 31 }, "player"), same);
    s = move(s, { from: 6, to: 7 }, "ai");
    s = move(s, { from: 31, to: 30 }, "player");
    s = move(s, { from: 7, to: 6 }, "ai");
  }
  assert.equal(s.winner, "draw");
  assert.match(s.reason, /repeated/);
});
test("hidden identities do not enter observations or influence deterministic AI choice", () => {
  const s = startBattle(newGame(() => 0.37));
  s.phase = "ai";
  const altered = structuredClone(s);
  const hidden = altered.pieces.filter((p) => p.side === "player");
  [hidden[0].rank, hidden[3].rank] = [hidden[3].rank, hidden[0].rank];
  const a = observe(s, "ai"),
    b = observe(altered, "ai");
  assert.deepEqual(a, b);
  assert.deepEqual(
    chooseMove(a, () => 0.5),
    chooseMove(b, () => 0.5),
  );
  assert.ok(
    a.pieces.filter((p) => p.side === "player").every((p) => p.rank === null),
  );
  s.pieces.find((p) => p.side === "player")!.revealed = true;
  assert.notDeepEqual(observe(s, "ai"), b);
});
test("AI takes known Crown and avoids knowingly losing Regent to a Ward", () => {
  const s = scenario(
    [
      ["ai-0", 6, 6],
      ["ai-1", 0, 11],
      ["player-0", 0, 0],
      ["player-1", 7, 7],
    ],
    "ai",
  );
  s.pieces.forEach((p) => (p.revealed = true));
  assert.deepEqual(
    chooseMove(observe(s, "ai"), () => 0.5),
    { from: 6, to: 0 },
  );
});
test("saves roundtrip setup, player, pending AI and ended games; malformed input is rejected", () => {
  const s = newGame(() => 0.3);
  assert.deepEqual(decodeSave(JSON.stringify(s)), s);
  const p = startBattle(s);
  assert.deepEqual(decodeSave(JSON.stringify(p)), p);
  const n = move(p, legalMoves(p)[0], "player");
  assert.equal(n.phase, "ai");
  assert.deepEqual(decodeSave(JSON.stringify(n)), n);
  for (const bad of [
    "null",
    "{}",
    "broken",
    JSON.stringify({ ...s, pieces: [...s.pieces, s.pieces[0]] }),
    JSON.stringify({ ...p, quiet: -1 }),
    JSON.stringify({ ...p, last: { from: 19, to: 100 } }),
  ])
    assert.equal(decodeSave(bad), null);
  const end = move(
    scenario([
      ["player-0", 4, 6],
      ["player-1", 0, 47],
      ["ai-0", 0, 0],
    ]),
    { from: 6, to: 0 },
    "player",
  );
  assert.equal(decodeSave(JSON.stringify(end))?.winner, "player");
});
test("200 fair AI self-play simulations always use legal moves and terminate with valid outcomes", () => {
  let seed = 12345;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const outcomes = new Set();
  for (let game = 0; game < 200; game++) {
    let s = startBattle(newGame(random));
    while (s.phase !== "end" && s.ply < 2000) {
      const side = s.phase as "player" | "ai";
      const a = chooseMove(observe(s, side), random);
      assert.ok(a);
      assert.ok(
        legalMoves(s, side).some((m) => m.from === a.from && m.to === a.to),
      );
      const n = move(s, a, side);
      assert.notEqual(n, s);
      s = n;
    }
    assert.equal(s.phase, "end");
    assert.ok(s.winner);
    outcomes.add(s.winner);
  }
  assert.ok(outcomes.has("player") && outcomes.has("ai"));
  console.log("Simulation outcomes:", [...outcomes]);
});
test("inconsistent save counters and impossible setup observations are rejected", () => {
  const s = newGame();
  for (const changes of [
    { quiet: 80 },
    { history: ["impossible"] },
    { last: { from: 36, to: 30 } },
    { pieces: s.pieces.map((p) => ({ ...p, moved: true })) },
    { pieces: s.pieces.map((p) => ({ ...p, revealed: true })) },
  ])
    assert.equal(decodeSave(JSON.stringify({ ...s, ...changes })), null);
  const p = startBattle(s);
  assert.equal(decodeSave(JSON.stringify({ ...p, quiet: 1 })), null);
});
test("opponent setup protects a rear Crown using its own Wards without revealing identities", () => {
  const s = newGame(() => 0.3),
    crown = s.pieces.find((p) => p.side === "ai" && p.rank === 0)!;
  assert.equal(crown.pos, 1);
  assert.ok(
    s.pieces.some((p) => p.side === "ai" && p.rank === 7 && p.pos === 7),
  );
  assert.ok(
    s.pieces.some((p) => p.side === "ai" && p.rank === 7 && p.pos === 2),
  );
  assert.ok(
    observe(s, "player")
      .pieces.filter((p) => p.side === "ai")
      .every((p) => p.rank === null),
  );
});
