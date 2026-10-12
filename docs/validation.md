# Validation

## Automated

`npm run check`: strict TypeScript checking, Vite production build, 21 public engine/session/DOM tests and 200 seeded fair AI self-play simulations. The simulations reach player victories, AI victories and draws. These are simulations, not browser gameplay.

Coverage includes complete setup inventory and swaps, illegal setup, orthogonal movement, obstacles/friendly blockers, Runner range and reveal, all special matchups, combat survivor positions and ties, Crown capture, one-sided and both-blocked endings, repetition and quiet draws, illegal/wrong-phase/repeated actions, redaction and deterministic AI invariance, save roundtrips and malformed input, pending AI reload, timer cancellation on reset, storage failures, concealed DOM markup, asynchronous keyboard/modal focus, and normal drill control outcomes. Dependency audit reports zero vulnerabilities.

## Actual Mac Chrome gameplay

Two complete twelve-unit matches played through normal visible board controls, with decisions based only on public labels/highlights. The first ended in Dusk Crown capture after 40 actions. The second ended in Amber Crown capture after 55 actions, including a Shade defeating a revealed Regent. The second match used the final defensive AI setup. No engine calls, save injection or hidden-rank reads were used for these games. [Visible player-move transcript](browser-gameplay.txt) records moves after the initial manually tested sequence.

Also verified setup swaps/shuffle and reload; legal highlights; combat reveals; rapid repeated destination clicks; pending AI reload; player-phase reload; ended-save restoration; rematch; new arrangement during a pending turn; tutorial open during AI completion; Enter/Space, arrows and Escape; Sapper/Ward, Shade/Regent and Runner drills; Crown victories and no-legal-move defeat. Drills are reduced practice games and are not counted as full matches.

Inspected screenshots at default desktop, 320×740, 390×844 and 768×1024 CSS viewport sizes. No horizontal document overflow; 390px board cells measured 51px. The viewport override was reset. Browser automation briefly lost its debugger; continued the first full match with native Chrome accessibility controls and recovered browser automation in a fresh tab.

Screenshots: [full victory](screenshots/full-battle-victory.jpg), [full loss](screenshots/full-battle-loss.jpg), [drill victory](screenshots/drill-victory.jpg), [mobile setup](screenshots/mobile-setup.jpg). Browser extensions may add an unrelated floating icon to screenshots.

## Limits

Physical touch hardware, gamepads, screen-reader speech and browsers other than Mac Chrome were not tested. Keyboard events and normal pointer controls were exercised through automation. AI quality is heuristic, not tournament strength. Local code/save inspection can reveal ranks. Multiple concurrent active tabs are unsupported and may overwrite their shared autosave. This is a local server build; direct `file://` launch is not supported. No public deployment or sidebar registration was performed.
