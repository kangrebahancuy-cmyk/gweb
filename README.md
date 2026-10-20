# Elder Realms Online

Elder Realms Online is an original 2D pixel-art farming-adventure MMORPG project. It combines cozy farming, exploration, gathering, quests, and combat with a roadmap toward authoritative multiplayer. It takes inspiration from broad genre conventions without copying another game's maps, writing, lore, art direction, or code.

## Current milestone

**Playable local prototype in progress.** The repository uses Vite, React, TypeScript, and Phaser 3. The playable slice includes a scrollable village/farm area, directional player idle/walk animations, touch joystick, NPC interaction, planting and harvesting with original crop sprites, a starter quest, animated slime combat, sprite-based inventory icons, skills/quest panels, and local prototype save data. The map now uses original terrain, building, orchard, and detail sprites alongside some procedural paths and pond scenery.

The current browser prototype is **not yet an online MMORPG**: gameplay saves are local to the browser, and authentication, Neon persistence, and Cloudflare multiplayer still require configuration and implementation. Do not treat localStorage state or client-side rewards as secure production game data.

## Stack

- Frontend: Vite, React, TypeScript
- Game runtime: Phaser 3 / Canvas
- UI state: React; Zustand is available for later shared UI state
- Planned multiplayer: Cloudflare Workers + Durable Objects + WebSockets
- Planned identity: Supabase Auth
- Planned persistence: Neon PostgreSQL with versioned SQL migrations

## Requirements

- Node.js 20+
- npm

## Local development

```bash
npm install
npm run dev
```

Open the URL Vite prints (normally http://localhost:5173).

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

A GitHub edit is not proof that these commands pass. Run them in a local or CI environment with dependencies installed.

## Controls

- **WASD / arrow keys:** move
- **E:** interact with nearby NPCs, crops, and objects
- **Space:** attack a nearby slime
- **I:** inventory
- **K:** skills
- **J:** quest journal
- **Esc:** close the active panel
- **Touch:** use the on-screen joystick and action buttons

## Assets

The game loads original sprite sheets from the user-supplied asset packs under `public/assets/game/`: the player character sheet, Slime 1 animation sheets, Farming Sim terrain/buildings/orchard/details/crops, and Farming Set vegetables/seeds. The compact starter atlas remains for legacy props. See [docs/ASSET_MANIFEST.md](docs/ASSET_MANIFEST.md) and [docs/ASSET_CREDITS.md](docs/ASSET_CREDITS.md) for provenance, browser QA needs, and remaining license checks.

## Security and deployment status

No production credentials are committed. The Worker and SQL files are infrastructure starting points, not a claim that cloud services have been provisioned. Set secrets through the provider's secret manager, apply migrations to a configured Neon database, and complete server-authoritative validation before exposing multiplayer or economy features to real players.

## Roadmap

1. **Playable local slice:** core Phaser scene, desktop/touch controls, farming, inventory, quest, and a first enemy.
2. **Verified asset integration:** complete browser visual QA, verify licenses and frame layouts, and evolve the hand-assembled map into a full tilemap.
3. **Cloud services:** Supabase Auth, Neon migrations, Cloudflare Worker and Durable Object room.
4. **Authoritative gameplay:** server-side movement validation, farming timers, combat, XP, loot, and inventory transactions.
5. **Persistent multiplayer:** character load/save, room synchronization, reconnects, abuse prevention, and two-client tests.
6. **Core MMORPG content:** gathering skills, crafting, equipment, quests, trading, social systems, and additional regions.
7. **Release hardening:** automated browser tests, performance budgets, backups, moderation, accessibility, and deployment runbooks.

## Originality

Use original names, quests, maps, dialogue, game rules, and any newly created artwork. Respect each imported pack's license and attribution terms before public release.
