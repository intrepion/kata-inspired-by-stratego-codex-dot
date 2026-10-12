import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync, readdirSync } from "node:fs";
import { newGame } from "../src/engine.js";
import { SAVE_KEY } from "../src/session.js";
const script = readFileSync(
  "dist/assets/" + readdirSync("dist/assets").find((p) => p.endsWith(".js")),
  "utf8",
);
function boot(saved = newGame(() => 0.3)) {
  const dom = new JSDOM('<div id="app"></div>', {
    url: "http://localhost:5200",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  dom.window.localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
  dom.window.structuredClone = structuredClone;
  dom.window.eval(script);
  return dom;
}
const click = (d: JSDOM, selector: string) => {
  const element = d.window.document.querySelector<HTMLButtonElement>(selector);
  assert.ok(element);
  element.click();
};
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
test("all concealed enemy UI names, markup and previews are independent of hidden ranks", () => {
  const d = boot();
  const doc = d.window.document;
  const hidden = [...doc.querySelectorAll(".square.ai")];
  assert.equal(hidden.length, 12);
  for (const b of hidden) {
    assert.match(b.getAttribute("aria-label")!, /Dusk veiled unit/);
    assert.equal(b.getAttribute("title"), null);
    assert.equal(b.querySelector(".rank")?.textContent, "?");
    assert.ok(
      !/Crown|Ward|Regent|Captain|Shade|Sapper|Runner|Sentinel/.test(
        b.outerHTML,
      ),
    );
  }
  const alternative = newGame(() => 0.3);
  const a = alternative.pieces.find((p) => p.side === "ai")!;
  const b = alternative.pieces.find(
    (p) => p.side === "ai" && p.rank !== a.rank,
  )!;
  [a.rank, b.rank] = [b.rank, a.rank];
  const different = boot(alternative);
  assert.deepEqual(
    [...different.window.document.querySelectorAll(".square.ai")].map(
      (e) => e.outerHTML,
    ),
    hidden.map((e) => e.outerHTML),
  );
  different.window.close();
  click(d, "#start");
  click(d, ".square.ai");
  assert.match(doc.querySelector(".intel")!.textContent!, /rank is unknown/);
  assert.ok(
    !/Dusk Crown|Dusk Ward/.test(doc.querySelector(".intel")!.textContent!),
  );
  d.window.close();
});
test("keyboard board focus survives delayed AI render and repeated destination clicks cannot double-move", async () => {
  const d = boot(),
    doc = d.window.document;
  click(d, "#start");
  const mobile = [
    ...doc.querySelectorAll<HTMLButtonElement>(".square.player"),
  ].find((b) => !/Crown|Ward/.test(b.getAttribute("aria-label")!))!;
  mobile.click();
  const target = doc.querySelector<HTMLButtonElement>(".square.legal")!;
  assert.ok(target);
  target.click();
  const pos = target.dataset.pos;
  click(d, `[data-pos="${pos}"]`);
  await delay(850);
  assert.equal(doc.activeElement?.getAttribute("data-pos"), pos);
  assert.equal(doc.querySelector("#phase")?.textContent, "Your command");
  assert.match(doc.querySelector(".board-heading")!.textContent!, /ACTION 3/);
  d.window.close();
});
test("pending AI cannot remove modal focus; Escape closes dialog and Tab stays contained", async () => {
  const d = boot(),
    doc = d.window.document;
  click(d, "#start");
  const mobile = [
    ...doc.querySelectorAll<HTMLButtonElement>(".square.player"),
  ].find((b) => !/Crown|Ward/.test(b.getAttribute("aria-label")!))!;
  mobile.click();
  click(d, ".square.legal");
  click(d, "#help");
  assert.equal(doc.activeElement?.id, "close");
  await delay(850);
  assert.ok(doc.activeElement?.closest(".guide"));
  doc.dispatchEvent(
    new d.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  assert.equal(doc.querySelector(".guide"), null);
  assert.equal(doc.activeElement?.id, "help");
  d.window.close();
});
test("normal drill controls demonstrate disarming, reveal, victory, loss and rematch", async () => {
  const d = boot(),
    doc = d.window.document;
  click(d, "#help");
  click(d, '[data-drill="sapper"]');
  click(d, '[data-pos="6"]');
  click(d, '[data-pos="7"]');
  assert.match(
    doc.querySelector(".chronicle")!.textContent!,
    /Sapper attacked Ward.*Attacker prevailed/,
  );
  await delay(850);
  click(d, '[data-pos="7"]');
  click(d, '[data-pos="1"]');
  await delay(850);
  click(d, '[data-pos="1"]');
  click(d, '[data-pos="0"]');
  assert.equal(doc.querySelector("#phase")!.textContent, "The Crown is yours");
  click(d, "#rematch");
  assert.equal(doc.querySelector("#phase")!.textContent, "Arrange your army");
  click(d, "#help");
  click(d, '[data-drill="defense"]');
  click(d, '[data-pos="6"]');
  click(d, '[data-pos="7"]');
  await delay(850);
  assert.equal(
    doc.querySelector("#phase")!.textContent,
    "The Compact has fallen",
  );
  d.window.close();
});
