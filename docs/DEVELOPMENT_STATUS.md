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
- Initial Neon schema migration and a Cloudflare Worker/Durable Object WebSocket starting point.
- GitHub Actions CI workflow.

## Partial / not yet verified

- The imported sprite atlas uses cropped frames from supplied ZIPs; full sprite sheets and animation sequences are not yet integrated.
- The world map uses original Phaser-drawn shapes; a complete tilemap from the supplied terrain/building tilesets is still pending.
- The Worker calls Supabase Auth to validate access tokens, but character ownership verification against Neon and server-authoritative simulation are not implemented yet.
- The SQL migration has been authored but not applied to a Neon database.
- Supabase, Neon, Cloudflare, and production domains have not been configured.
- The local browser prototype uses localStorage and is not safe for production economy or persistent multiplayer.
- No test/build result is claimed until checks run in CI or a local environment.

## Next acceptance tests

1. Run npm install, typecheck, lint, tests, and production build.
2. Browser QA at desktop and Android-sized viewports.
3. Plant/harvest across refresh; verify crop timers are not forgeable once server endpoints exist.
4. Two authenticated clients in one Durable Object room.
5. Character ownership and movement validation against Neon.
