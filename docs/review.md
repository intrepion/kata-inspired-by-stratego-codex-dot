# Independent review

Applied Matt Pocock's code-review skill with two independent, read-only agents. Fixed point: initial documentation commit `627716387cdb23aea532e9e7cc01508c09b96bca`; first reviewed implementation: `1e4c6c648a4d22716ab07e7fa07b88feeac1742d`. Spec source: docs/spec.md; standards: CODING_STANDARDS.md and ADRs, plus the skill's Fowler smell baseline.

## Standards

Two findings required fixes:

- Untrusted save validation accepted setup `ply=0, quiet=80`, causing an immediate draw at start. Require `quiet <= ply`, zero setup counters, null last action, empty history and unmoved/unrevealed setup units. Immobile moved units are also rejected. Added malformed-save regressions.
- Replacing the app DOM removed keyboard focus during delayed AI completion, including focus inside a tutorial opened during that delay. Capture and restore focused board/control identities on every render; preserve modal containment. Added DOM regressions and verified in Chrome.

Heuristic judgment: the renderer combines several view concerns in a large template. Formatting improved readability; further view-module extraction remains a maintainability opportunity rather than a correctness or acceptance blocker.

The reviewer found no actual concealed-rank exposure in labels, symbols or details. AI received redacted observations; callback guards checked generation and phase correctly.

## Spec

One finding: asynchronous DOM replacement violated keyboard controls by removing board focus and weakening modal containment. Fixed as described above. No other concrete defects were found in movement, special combat, endings, callback invalidation or rank redaction. Reviewer confirmed deterministic information-boundary coverage supported fairness.

Initial counts: Standards 2 findings (save validation and focus), Spec 1 finding (focus). All correctness findings were fixed; final focused rereview is recorded below. The independent source reviews were not independent browser playtests.

## Focused rereview

Both independent reviewers confirmed the earlier correctness findings are resolved and found no new concrete blocker. Standards reviewer executed seven targeted UI/information/save tests; Spec reviewer executed all four DOM UI tests. Both confirmed explicit observation fields and own-army-only defensive setup. These rereviews did not independently repeat Chrome gameplay or broad simulations.
