# Elder Realms Online

An original browser-based 3D open-world MMORPG project. The design takes inspiration from broad MMORPG systems—open exploration, skill progression, quests, combat, crafting, trading, and social play—without copying another game's code, lore, writing, models, or visual identity.

## Current status

**Phase 1: repository foundation.** This repository started empty. The initial application establishes a responsive project entry page and a strict TypeScript/Next.js base. It is not yet a playable MMORPG.

## Technology direction

- Web client: Next.js App Router, React, TypeScript
- 3D rendering: Three.js, React Three Fiber, Drei
- Client presentation state: Zustand
- Multiplayer: persistent Node.js/TypeScript server with WebSocket and Colyseus (planned)
- Persistence: PostgreSQL with migrations and a typed ORM (planned)
- Frontend hosting: Vercel-compatible; the authoritative game server must run on persistent infrastructure
- Docker is not required

## Requirements

- Node.js 20.9 or newer
- npm

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

These commands must be run in an environment with dependencies installed. A GitHub file write alone does not prove that checks pass.

## Environment variables

No secrets are needed for the current project entry page. Before adding backend integrations, document required variables in `.env.example`. Never commit real credentials, database URLs, private keys, or server tokens.

## Roadmap

1. **Foundation:** application structure, quality gates, design system, documentation.
2. **Playable single-player slice:** original procedural 3D starter region, character movement, collision, camera controls, responsive touch controls.
3. **Authoritative multiplayer:** persistent game server, session/authentication boundary, synchronized player movement, reconnect handling.
4. **Persistence:** schema and migrations for accounts, characters, inventories, skills, quest state, and safe item transactions.
5. **Core gameplay:** server-validated gathering, XP/levels, items, equipment, combat, NPCs, and a complete starter quest.
6. **World and social systems:** additional regions, crafting, trading, parties, chat, guilds, PvE encounters, and controlled PvP.
7. **Content expansion:** reusable data-driven skill modules, quests, bosses, raids, minigames, economy balancing, and original assets.
8. **Release hardening:** automated tests, abuse prevention, observability, performance budgets, accessibility, Android browser QA, and deployment runbooks.

Every phase must be validated before it is described as complete. Features affecting persistent state or other players must be validated by the server.
