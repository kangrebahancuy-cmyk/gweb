# Asset manifest and integration audit

Audit date: 2026-10-20

The supplied asset packs are under `public/assets/game/`. The Phaser scene now maps the 640×640 player sheet as a 10×10, 64×64 grid, animates walk cycles for left/up/down/right, loads Slime 1 idle/walk/attack/hurt/death sheets, and uses Farming Sim terrain, buildings, orchard trees, details, and crop sprites. Farming Set vegetable and seed sheets are used for inventory item icons. This is an initial hand-assembled map pass, not yet a full Tiled tilemap.

## Source archive inventory

| Pack | Verified contents | Current integration |
|---|---|---|
| Farming Sim Asset Pack (`vectoraith_tileset_farming_sim_essentials.zip`) | 474 archive entries; includes 16×16, 32×32 and 48×48 tile sets, buildings, terrain, crops, orchard/details, seasonal variants, and farm animal/farmer sprites. | Summer terrain texture, building crops, orchard tree sprites, detail sprites, soil bed tiles, and crop-sheet sprout frames are used. Roads, pond, and some map decorations are still drawn procedurally; no full Tiled tilemap yet. |
| Farming Set (`Farming Stuff.zip`) | 14 archive entries; includes vegetables, fruits, cereals, seeds, crates/sacks, hay, sliced produce, and nested Horse/Slavic Woman ZIPs. | The original vegetable sheet is used for the radish-like market prop and turnip inventory icon; the seed sheet is used for the seed inventory icon. Slime gel uses a slime-sheet icon. |
| Pixel Art Character (`Pixel Art Character-TheGameAssetsMine-.zip`) | Character PNG `Pixel Art Character-TheGameAssetsMine-/PNG/Boy  sheet wlaking and Idle.png`. | 64×64 cells mapped as left/up/down/right idle frames in row 0 and walking poses in rows 1–3; player animation switches by movement direction. Visual browser QA still required. |
| Free Slime Mobs (`craftpix-net-788364-free-slime-mobs-pixel-art-top-down-sprite-pack.zip`) | 604 archive entries; includes Slime 1/2/3 with idle, walk, run, attack, hurt and death art, including direction variants and Aseprite sources. | Slime 1 without-shadow idle, walk, attack, hurt, and death sheets are loaded at 64×64 frames; idle/walk loop and combat animations are connected. |

## Existing atlas frames

| Atlas frame | Source | Intended use | Status |
|---|---|---|---|
| `player` | Pixel Art Character PNG | Player and Mira | Player uses row 0 for directional idle and rows 1–3 for direction-specific walk cycles; Mira uses the front-facing frame |
| `slime` | Slime 1 idle PNG without shadow | Hostile creature | Legacy atlas crop remains unused by the animated slime |
| `turnip` | Farming Set vegetable sheet | Harvest and inventory icon | Uses a 32×32 radish-like sprite as a visual stand-in; the source art is not positively identified as a turnip |
| `grass` | Farming Sim terrain tileset | Terrain texture | Runtime uses the original tileset's top-left 16×16 tile |
| `farmhouse`, `barn`, `small-house` | Farming Sim buildings tileset | Village buildings | Three cropped sprites are displayed; crop boundaries and scale need browser visual QA |
| `tree-green`, `tree-fruit`, `tree-blossom` | Farming Sim orchard tileset | Orchard scenery | Original 32×32 tree frames are placed around the village; scale/positions need browser visual QA |
| `sprout`, `young-crop` | Farming Sim crops tileset | Crop growth stages | Sprout/young plant frames display while plots grow; ripe crop uses the vegetable sheet |

The current map combines imported terrain, building, orchard, details, and crop sprites with code-drawn paths, pond, labels, and collision zones. The code-drawn pieces should not be represented as imported artwork from these packs.

## Integration plan

1. Keep the source art in `public/assets/game/`; do not embed large PNGs as base64 in TypeScript.
2. Player sheet frame mapping is implemented: row 0 directional idle poses, rows 1–3 walking cycle poses, with direction-aware animation keys. Verify the rendered result in a browser.
3. Slime 1 idle/walk/attack/hurt/death animations are wired from the original 64×64-frame sheets; verify sprite crop boundaries and animation playback in browser.
4. Terrain, building, orchard, detail, and crop sprites are now placed in the hand-assembled map. A full Tiled tilemap and more precise collision/depth sorting remain future improvements.
5. Farming Set vegetable and seed icons are used in inventory; the ripe turnip remains a radish-like visual stand-in pending a positively identified turnip sprite.
6. Verify each pack's license and attribution from its original distribution page and included documentation before publishing assets. License details are not yet confirmed in this manifest.
7. Run `npm install`, `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` in an environment with npm registry access; record results before calling the stage complete.

## Stage 1 status

**Runtime integration pass committed; validation is pending.** Direction-aware player idle/walk animations, Slime 1 combat animations, Farming Sim terrain/building/orchard/details/crop sprites, and Farming Set inventory icons are now connected. Remaining work: browser visual QA for frame/crop boundaries and layout, verify all pack licenses/attributions, and obtain typecheck/test/lint/production-build results from a working npm environment. No successful build or browser QA is claimed yet.
