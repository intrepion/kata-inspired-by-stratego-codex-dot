import "./style.css";
import {
  BASINS,
  ROLES,
  coordinate,
  legalMoves,
  move,
  observe,
  shuffleSetup,
  startBattle,
  swapSetup,
  newGame,
  validSetup,
  type Rank,
} from "./engine.js";
import { Session } from "./session.js";
import { drill, type Drill } from "./drills.js";
const app = document.querySelector<HTMLDivElement>("#app")!;
let selected: number | null = null,
  focused = 36,
  tutorial = false,
  confirmNew = false,
  confirmConcede = false;
let storage: Storage;
try {
  storage = localStorage;
} catch {
  storage = {
    getItem: () => {
      throw Error("storage unavailable");
    },
    setItem: () => {
      throw Error("storage unavailable");
    },
  } as unknown as Storage;
}
const session = new Session(storage, render);
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function emblem(symbol: string, enemy = false) {
  return `<svg viewBox="0 0 48 54" aria-hidden="true" class="emblem"><path d="M24 2 43 10v23L24 51 5 33V10Z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M24 7 38 13v18L24 45 10 31V13Z" fill="currentColor" opacity=".09"/><text x="24" y="33" text-anchor="middle" font-size="25" fill="currentColor">${enemy ? "≋" : symbol}</text></svg>`;
}
function render() {
  const previous = document.activeElement as HTMLElement | null;
  const previousId = previous?.id,
    previousPos = previous?.getAttribute("data-pos");
  const s = session.state,
    view = observe(s, "player"),
    piece =
      selected === null
        ? undefined
        : view.pieces.find((p) => p.pos === selected);
  const actions =
    s.phase === "player" && selected !== null
      ? legalMoves(s).filter((a) => a.from === selected)
      : [];
  if (selected !== null && !piece) selected = null;
  const phaseText =
    s.phase === "setup"
      ? "Arrange your army"
      : s.phase === "ai"
        ? "Dusk is considering…"
        : s.phase === "end"
          ? s.winner === "player"
            ? "The Crown is yours"
            : s.winner === "ai"
              ? "The Compact has fallen"
              : "A saltwater truce"
          : "Your command";
  const instruction =
    s.phase === "setup"
      ? "Select two Amber units to swap their positions."
      : s.phase === "ai"
        ? "Your move is saved. The Covenant moves next."
        : s.phase === "end"
          ? s.reason
          : selected !== null
            ? actions.length
              ? "Choose a glowing square, or Escape to cancel."
              : "This unit has no legal move. Choose another."
            : "Select an Amber unit to see its legal moves.";
  const squares = Array.from({ length: 48 }, (_, pos) => {
    const p = view.pieces.find((p) => p.pos === pos),
      basin = BASINS.has(pos),
      legal = actions.some((a) => a.to === pos),
      known = p?.rank !== null;
    const role = p && known ? ROLES[p.rank as Rank] : null;
    const name = basin
      ? "Salt basin"
      : p
        ? `${p.side === "player" ? "Amber" : "Dusk"} ${role ? role.name : "veiled unit"}${p.revealed ? ", revealed" : ""}${p.moved ? ", moved" : ""}`
        : "Empty";
    const label = `${coordinate(pos)}: ${name}${legal ? `, legal ${p ? "attack" : "move"} destination` : ""}${selected === pos ? ", selected" : ""}`;
    return `<button class="square ${basin ? "basin" : ""} ${p?.side ?? ""} ${selected === pos ? "selected" : ""} ${legal ? "legal" : ""} ${s.last?.to === pos ? "last" : ""}" data-pos="${pos}" aria-label="${label}" aria-pressed="${selected === pos}" tabindex="${focused === pos ? 0 : -1}"><span class="coord">${coordinate(pos)}</span>${basin ? '<span class="waves" aria-hidden="true">≈<br>≈</span>' : p ? `<span class="unit">${emblem(role?.symbol ?? "", !role)}<span class="rank">${role ? (p.rank === 0 ? "C" : p.rank === 7 ? "W" : p.rank) : "?"}</span></span>${p.revealed ? '<span class="revealed" aria-hidden="true">•</span>' : ""}` : legal ? '<span class="move-dot" aria-hidden="true"></span>' : ""}</button>`;
  }).join("");
  app.innerHTML = `<div class="shell"><header><a class="brand" href="#" aria-label="Veil of the Salt Crown home">${emblem("♔")}<span>VEIL OF THE<br><strong>SALT CROWN</strong></span></a><div class="header-actions"><span class="edition">A GAME OF SECRETS &amp; SALT</span><button id="help">Field guide</button><button id="new">New battle</button></div></header><main><section class="intro"><div><p class="eyebrow">THE AMBER COMPACT / THE DUSK COVENANT</p><h1>Every veil hides<br>a different threat.</h1><p class="lede">Cross the salt basins. Read the enemy.<br>Take the Crown before they take yours.</p></div><div class="brief"><span class="small-label">BATTLE ORDERS</span><p>One army. Twelve secrets.<br>Only one Crown returns.</p><div class="factions"><span>◈ AMBER / YOU</span><span>≋ DUSK / AI</span></div></div></section><div class="game-layout"><section class="battlefield" aria-label="Battlefield"><div class="board-heading"><span>THE SALT REACH</span><span>${s.phase === "setup" ? "DEPLOYMENT" : `ACTION ${s.ply + 1}`}</span></div><div class="board" role="group" aria-label="6 by 8 tactical board">${squares}</div><div class="board-footer"><span>◈ AMBER COMPACT</span><span>ARROWS · ENTER · ESC</span></div></section><aside><section class="command-panel"><p class="eyebrow">${s.phase === "end" ? "BATTLE COMPLETE" : s.phase === "ai" ? "OPPONENT TURN" : s.phase === "setup" ? "BEFORE THE VEIL" : "PLAYER TURN"}</p><h2 id="phase" role="status" aria-live="polite">${phaseText}</h2><p>${escape(instruction)}</p>${s.phase === "setup" ? `<div class="actions"><button class="primary" id="start" ${validSetup(s) ? "" : "disabled"}>Lower the veils <span>→</span></button><button id="shuffle">Shuffle arrangement</button></div>` : s.phase === "end" ? '<button class="primary" id="rematch">Arrange a rematch →</button>' : '<button id="cancel" ' + (selected === null ? "disabled" : "") + ">Cancel selection</button>"}${s.phase === "player" ? '<button class="quiet-button" id="concede">Concede battle</button>' : ""}${confirmConcede ? '<div class="confirmation"><p>Yield the Crown and end this battle?</p><button id="yield">Yes, concede</button><button id="keep">Keep playing</button></div>' : ""}${confirmNew ? '<div class="confirmation"><p>Replace the current saved battle with a fresh arrangement?</p><button id="replace">New arrangement</button><button id="back">Keep battle</button></div>' : ""}<p class="save-status" role="status">${escape(session.storageMessage)}</p></section><section class="intel"><span class="small-label">SELECTED UNIT</span>${piece ? `<h3>${piece.side === "player" ? "Amber" : "Dusk"} ${piece.rank !== null ? ROLES[piece.rank].name : "veiled unit"}</h3><p>${piece.rank !== null ? ROLES[piece.rank].detail : "Its rank is unknown. Combat or a long Runner move can reveal it."}</p><p class="muted">${coordinate(piece.pos)} · ${piece.revealed ? "Publicly revealed" : piece.side === "player" ? "Known only to your army" : "Identity concealed"}</p>` : "<h3>A little knowledge goes a long way.</h3><p>Your units show their ranks. Enemy seals conceal theirs until they are revealed.</p>"}<div class="strength"><span>AMBER ${view.pieces.filter((p) => p.side === "player").length}/12</span><span>DUSK ${view.pieces.filter((p) => p.side === "ai").length}/12</span></div></section><section class="chronicle"><span class="small-label">FIELD CHRONICLE</span><ol aria-label="Public battle history">${s.log
    .slice(0, 6)
    .map((l) => `<li>${escape(l)}</li>`)
    .join(
      "",
    )}</ol></section></aside></div><section class="roster"><div><p class="eyebrow">KNOW YOUR ARMY</p><h2>Strength has its exceptions.</h2></div><div class="role-list">${([6, 5, 4, 3, 2, 1, 7, 0] as Rank[]).map((r) => `<div class="role-card">${emblem(ROLES[r].symbol)}<div><strong>${ROLES[r].name} <span>${r === 0 ? "C" : r === 7 ? "W" : r}</span></strong><p>${ROLES[r].detail}</p></div></div>`).join("")}</div></section><footer>Original local strategy game · No accounts, no tracking.<br>Enemy decisions use observed information. Local code and saves contain ranks and can be inspected.</footer></main></div>${tutorial ? guide() : ""}`;
  app.querySelectorAll<HTMLButtonElement>("[data-pos]").forEach((b) => {
    b.onclick = () => activate(Number(b.dataset.pos));
    b.onkeydown = boardKey;
  });
  bind("start", () => {
    selected = null;
    session.commit(startBattle(s));
  });
  bind("shuffle", () => {
    selected = null;
    session.commit(shuffleSetup(s));
  });
  bind("cancel", () => {
    selected = null;
    render();
  });
  bind("new", () => {
    confirmNew = true;
    render();
    app.querySelector<HTMLButtonElement>("#replace")?.focus();
  });
  bind("replace", reset);
  bind("back", () => {
    confirmNew = false;
    render();
  });
  bind("rematch", reset);
  bind("concede", () => {
    confirmConcede = true;
    render();
    app.querySelector<HTMLButtonElement>("#yield")?.focus();
  });
  bind("keep", () => {
    confirmConcede = false;
    render();
  });
  bind("yield", () => {
    confirmConcede = false;
    selected = null;
    session.commit({
      ...s,
      phase: "end",
      winner: "ai",
      reason: "Amber yielded the Crown.",
      log: ["Amber yielded the Crown.", ...s.log].slice(0, 24),
    });
  });
  bind("help", () => {
    tutorial = true;
    render();
    app.querySelector<HTMLButtonElement>("#close")?.focus();
  });
  bind("close", () => {
    tutorial = false;
    render();
    app.querySelector<HTMLButtonElement>("#help")?.focus();
  });
  app.querySelectorAll<HTMLButtonElement>("[data-drill]").forEach(
    (b) =>
      (b.onclick = () => {
        tutorial = false;
        selected = null;
        confirmNew = false;
        confirmConcede = false;
        session.commit(drill(b.dataset.drill as Drill));
      }),
  );
  const restore = tutorial
    ? previous?.closest(".guide") && previousId
      ? app.querySelector<HTMLElement>(`#${previousId}`)
      : app.querySelector<HTMLElement>("#close")
    : previousPos !== null && previousPos !== undefined
      ? app.querySelector<HTMLElement>(`[data-pos="${focused}"]`)
      : previousId
        ? app.querySelector<HTMLElement>(`#${previousId}`)
        : null;
  restore?.focus({ preventScroll: true });
  app.querySelector<HTMLAnchorElement>(".brand")!.onclick = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
}
function bind(id: string, fn: () => void) {
  const b = app.querySelector<HTMLButtonElement>(`#${id}`);
  if (b) b.onclick = fn;
}
function reset() {
  selected = null;
  focused = 36;
  confirmNew = false;
  confirmConcede = false;
  session.commit(newGame());
}
function activate(pos: number) {
  const s = session.state;
  focused = pos;
  confirmConcede = false;
  if (s.phase === "setup") {
    const p = s.pieces.find((p) => p.pos === pos && p.side === "player");
    if (!p) return;
    if (selected === null) {
      selected = pos;
      render();
    } else {
      const before = selected;
      selected = null;
      session.commit(swapSetup(s, before, pos));
      render();
    }
  } else if (s.phase === "player") {
    if (
      selected !== null &&
      legalMoves(s).some((a) => a.from === selected && a.to === pos)
    ) {
      const from = selected;
      selected = null;
      session.commit(move(s, { from, to: pos }, "player"));
    } else {
      const p = s.pieces.find((p) => p.pos === pos);
      selected = p ? (selected === pos ? null : pos) : null;
      render();
    }
  } else if (s.phase === "end") {
    selected = s.pieces.some((p) => p.pos === pos) ? pos : null;
    render();
  }
  app
    .querySelector<HTMLButtonElement>(`[data-pos="${focused}"]`)
    ?.focus({ preventScroll: true });
}
function boardKey(e: KeyboardEvent) {
  const steps: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -6,
    ArrowDown: 6,
  };
  if (e.key in steps) {
    e.preventDefault();
    const next = focused + steps[e.key];
    if (
      next >= 0 &&
      next < 48 &&
      (Math.abs(steps[e.key]) === 6 ||
        Math.floor(next / 6) === Math.floor(focused / 6))
    )
      focused = next;
    app
      .querySelectorAll<HTMLButtonElement>("[data-pos]")
      .forEach(
        (b) => (b.tabIndex = Number(b.dataset.pos) === focused ? 0 : -1),
      );
    app.querySelector<HTMLButtonElement>(`[data-pos="${focused}"]`)?.focus();
  }
  if (e.key === "Escape") {
    e.preventDefault();
    selected = null;
    render();
    app.querySelector<HTMLButtonElement>(`[data-pos="${focused}"]`)?.focus();
  }
}
function guide() {
  return `<div class="overlay"><section class="guide" role="dialog" aria-modal="true" aria-labelledby="guide-title"><button id="close" class="close">Close ×</button><p class="eyebrow">THE FIELD GUIDE</p><h2 id="guide-title">Read the battlefield.<br>Keep your secrets.</h2><div class="guide-steps"><article><b>01 / ARRANGE</b><p>Swap any two of your twelve units in the bottom two rows. Protect the Crown, leave paths for Sappers, and put Runners near open lanes. Amber moves first.</p></article><article><b>02 / ADVANCE</b><p>Select a unit, then a glowing square. Most units move one square horizontally or vertically. Runners travel any clear straight line and may attack at its end. No unit crosses a basin or jumps another unit.</p></article><article><b>03 / REVEAL</b><p>Attacks reveal both ranks permanently. Higher number wins; ties remove both. A defender that wins stays put. Sappers defeat Wards. An attacking Shade defeats a Regent; a Regent attacking a Shade wins. Crowns and Wards cannot move.</p></article><article><b>04 / TAKE THE CROWN</b><p>Capture the enemy Crown or leave Dusk without a legal action. You lose if Amber cannot act. Both blocked is a draw. Three repetitions of the same board and turn, or 80 actions without combat, also draw. There is no separate back-and-forth prohibition.</p></article></div><p class="guide-note">A compact adaptation: 6×8 board, 12 units each, two home rows, four basin squares, ranks 1–6, permanent reveals. Each army has 1 Crown, 2 Wards, 1 Regent, 1 Sentinel, 2 Captains, 2 Sappers, 2 Runners, 1 Shade. Runners reveal on moves longer than one square.</p><h3>Field drills</h3><p>Short, reduced practice battles. Selecting a drill replaces the current autosave.</p><div class="drills"><button data-drill="sapper">Sapper vs Ward</button><button data-drill="shade">Shade ambush</button><button data-drill="runner">Runner lane</button><button data-drill="defense">Costly attack</button></div><p class="guide-note">Arrows move board focus. Enter or Space selects and moves. Escape cancels selection. Your battle autosaves after every action, including pending AI turns. This local game is fair by design but not cheat-proof against code or save inspection.</p></section></div>`;
}
document.addEventListener("keydown", (e) => {
  if (tutorial) {
    if (e.key === "Escape") {
      tutorial = false;
      render();
      app.querySelector<HTMLButtonElement>("#help")?.focus();
    }
    if (e.key === "Tab") {
      const buttons = [
        ...app.querySelectorAll<HTMLButtonElement>(".guide button"),
      ];
      const first = buttons[0],
        last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }
});
render();
session.resume();
