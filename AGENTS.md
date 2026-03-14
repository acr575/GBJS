AGENTS Guide for GameBoy JS

Purpose

This document orients automated and human agents contributing to the GameBoy JS repository. It explains project scope, development constraints, verification steps, agent responsibilities, and PR/commit conventions so agents can make safe, verifiable changes to the emulator.

Repository at a glance

- Entry: index.html (imports src/GameBoy.js as an ES module)
- Core: src/
  - GameBoy.js — orchestrator / module entry
  - CPU.js — LR35902 CPU emulation
  - GPU.js — PPU / rendering
  - MMU.js — memory map & cartridge loading
  - APU/ — audio subsystem
  - Joypad.js — input handling
  - Timer.js — hardware timer emulation
  - Instruction.js, OpcodeTable.js — decoding and instructions
  - Disassembler.js, GameBoyUtils.js — helpers & utilities
- debug/ — development-only scripts and helpers
- css/, assets/ — styles and static assets

Key constraints

- Vanilla JavaScript (ES modules). No build step required or expected. Files are loaded directly by the browser; therefore, changes must preserve module interfaces and run under a static HTTP server.
- Do not add or commit ROM files. ROMs are copyrighted content and must be kept out of the repository.
- Minimal external dependencies. Prefer pure JS and small, well-justified additions.

How to run locally (quick)

1. Serve repository root over HTTP (ES modules require HTTP):

- Python 3:

  python -m http.server 8000

- Node (http-server):

  npx http-server . -p 8000

2. Open http://localhost:8000/index.html in a modern browser with ES module support.

3. Use the "Load game" button to open a .gb/.gbc/.bin file from disk (do not add ROMs to repo).

Agent responsibilities and types

- Small code agents (automated): implement narrowly scoped changes (fix typos, small refactors, docs, add unit-like debug harnesses under debug/). Always run local verification steps and produce a human-readable PR body describing the verification.

- Feature agents (human-assisted or general-purpose): implement new features (MBC support, save states, UI improvements). Open an issue before large changes and include design notes.

- Testing agents: create/maintain debug harnesses in debug/ or a tests/ folder (no test framework yet). Provide instructions to run the harness in a browser or Node, and include sample ROM or synthetic data description (but never commit ROM files).

- Review agents: perform code review focusing on correctness of emulation logic, test coverage, regression risk, performance impact, and cross-browser behavior.

Change & PR guidelines

- Branch naming: feature/<short-desc>, fix/<short-desc>, docs/<short-desc>.
- Commit messages: brief summary line (<=72 chars) and a body with rationale and verification steps.
- Required commit trailer for automated commits (include in PR commits when using agents):

  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>

- PR description must include:
  - What changed and why
  - How to run and verify locally (exact steps)
  - Any performance or compatibility notes
  - If the change touches CPU/GPU/MMU/APU/timing, include regression steps and tests

Verification checklist (before merging)

1. Run local server and open index.html.
2. Load at least one known-good ROM (local, not committed) and perform these checks:
   - No console errors or uncaught exceptions.
   - Canvas renders (160x144) and UI controls respond.
   - Key mappings work (default: A=J, B=K, Start=Enter, Select=Shift, Up=W, Down=S, Left=A, Right=D).
   - Pause/Resume and Load/Quit buttons behave as expected.
   - If audio changes were made, verify channels and volume settings (Settings UI) and check for clicks or latency regressions.
3. For CPU/GPU/timer changes, run a 30–60s gameplay session and compare behavior to pre-change baseline (screens, known sequences, no hangs).
4. For performance optimizations, include before/after profiling snapshots or measurable frame/CPU improvements.
5. Ensure no ROMs or other large binaries are added to the commit.

Debugging & profiling

- Use browser DevTools (Sources, Performance, Memory) to set breakpoints inside modules (src/). Modules are loaded as-is, so source maps are not required.
- The debug/ folder contains helper scripts (e.g., CPU stepping, disassembly, APU inspectors) that can be loaded via index.html or opened as standalone pages served by the static server. Agents adding debug harnesses should add README entries under debug/ explaining usage.
- For audio troubleshooting, confirm sample rates, channel enabling, and that the APU does not block the main thread (consider AudioWorklet if needed, but discuss design first).

Code style and architectural guidance

- Keep modules small and focused. Prefer pure functions for CPU/decoder logic where possible; side effects should generally be isolated inside the GameBoy orchestrator (GameBoy.js) or MMU.
- Favor clarity and correctness over micro-optimizations. Provide data-driven comments for non-obvious emulation choices.
- Avoid adding global variables; export and import through modules.

Testing strategy and where to add tests

- There is no formal test framework yet. Use debug/ for runnable harnesses: create a page that imports a module and runs deterministic sequences.
- When adding tests, add clear instructions and automated checks if possible (simple assertions logged to console or downloadable JSON results). If a test requires a ROM, provide instructions to the user on where to obtain the ROM legally and how to run the test locally.

When to escalate or block

- Any change that modifies CPU timing, interrupts, MMU behaviour, APU mixing, or instruction decoding must be discussed in an issue before merging unless it's an obvious bug fix with tests.
- If automated agents are uncertain about correctness or produce large diffs, open a draft PR and request human review.

Security, licensing, and IP

- Do not commit any game ROMs or other copyrighted material.
- Keep sensitive data (credentials, API keys) out of the repo.

Example agent tasks (templates)

- docs/update-readme: Update README.md with improved run or browser compatibility notes; verify locally.
- fix/timer-overflow-logic: Reproduce failing behavior with a small harness under debug/, implement fix, add verification steps to PR.
- feature/mbc1-support: Open an issue with design notes, implement MBC1 in MMU, add test ROM instructions (do not commit ROM), and include regressions steps in PR.
- perf/gpu-hotpath: Profile draw loop, propose targeted optimization (benchmarks before/after) and include a fallback.

Good agent practices

- Small, incremental changes are preferred.
- Always include verification steps in human-readable form.
- Keep PRs focused and small to simplify review and reduce risk.
- Update this AGENTS.md if workflow or constraints change.

Contact & escalation

- Use GitHub Issues to propose designs, report regressions, or ask for maintainer review. If a change is high-risk, tag it as draft PR and request explicit human approval before merging.

Acknowledgements

This guide is intended to help automated agents and contributors act safely in a correctness-sensitive emulator project. Keep changes reversible and well-documented.
