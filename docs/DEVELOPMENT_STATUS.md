# Development status

Updated: 2026-10-20

## Implemented in the repository

- Vite + React + TypeScript frontend foundation.
- Phaser 3 scene with a scrollable village map, player movement, world bounds, building/tree collision, and desktop keyboard controls.
- Touch joystick and touch action affordances.
- Local prototype state for inventory, gold, crop timers, XP, quest progress, health, and local save/reset.
- One starter farming loop (plant, wait, harvest) and one original quest.
- One slime combat loop with health, rewards, and timed respawn.
- Inventory, skills, and quest UI panels.
- Unit tests for small shared gameplay rules.
- Supabase email/password sign-up, sign-in, sign-out, and session handling when the public environment variables are configured.
- Authenticated character GET/create API backed by Neon through an optional Cloudflare Hyperdrive binding.
- Initial Neon schema migration and a Cloudflare Worker/Durable Object WebSocket starting point.
- GitHub Actions CI workflow.

## Partial / not yet verified

- Initial original asset integration is in progress: the 64×64-frame player sheet is loaded, Slime 1 idle/walk/attack/hurt/death animations are wired, the Farming Sim terrain tile is used for ground, three building crops are displayed, and the Farming Set radish-like crop is used at the market.
- The world still uses hand-drawn paths, trees, pond, farm plots, and crop growth visuals; a complete tilemap and player movement/directional animations remain pending. Sprite crop boundaries need in-game visual QA.
- The Worker validates Supabase sessions and supports character creation/lookup when Hyperdrive is configured. The WebSocket room still does not verify character ownership or run authoritative movement/combat simulation.
- The SQL migration has been authored but not applied to a Neon database.
- Supabase, Neon, Cloudflare, Hyperdrive, and production domains have not been configured. The Hyperdrive binding is intentionally commented until a real configuration ID exists.
- The local browser prototype uses localStorage and is not safe for production economy or persistent multiplayer.
- No test/build result is claimed until checks run in CI or a local environment. A package lockfile still needs to be generated with npm install in an environment with registry access.

## Next acceptance tests

1. Run npm install, typecheck, lint, tests, and production build.
2. Browser QA at desktop and Android-sized viewports.
3. Plant/harvest across refresh; verify crop timers are not forgeable once server endpoints exist.
4. Two authenticated clients in one Durable Object room.
5. Character ownership and movement validation against Neon.
