# Asset manifest and integration audit

Audit date: 2026-10-20

The four original ZIP archives are available in the project conversation/library and have now been inspected. The current game still embeds only a small 128×128 PNG atlas in `src/game/atlasData.ts`; the full source art has **not** yet been integrated into the running scene.

## Source archive inventory

| Pack | Verified contents | Current integration |
|---|---|---|
| Farming Sim Asset Pack (`vectoraith_tileset_farming_sim_essentials.zip`) | 474 archive entries; includes 16×16, 32×32 and 48×48 tile sets, buildings, terrain, crops, orchard/details, seasonal variants, and farm animal/farmer sprites. | One small terrain patch only. The rest of the tilesets and farm sprites are not yet loaded by Phaser. |
| Farming Set (`Farming Stuff.zip`) | 14 archive entries; includes vegetables, fruits, cereals, seeds, crates/sacks, hay, sliced produce, and nested Horse/Slavic Woman ZIPs. | One small crop from `farming set opengameart/Vegetables.png` used as a temporary turnip stand-in. |
| Pixel Art Character (`Pixel Art Character-TheGameAssetsMine-.zip`) | Character PNG `Pixel Art Character-TheGameAssetsMine-/PNG/Boy  sheet wlaking and Idle.png`. | One cropped frame only; the full sheet is not yet loaded as a spritesheet or animated. |
| Free Slime Mobs (`craftpix-net-788364-free-slime-mobs-pixel-art-top-down-sprite-pack.zip`) | 604 archive entries; includes Slime 1/2/3 with idle, walk, run, attack, hurt and death art, including direction variants and Aseprite sources. | One idle-frame crop only; the animation sheets are not yet connected to the game. |

## Existing atlas frames

| Atlas frame | Source | Intended use | Status |
|---|---|---|---|
| `player` | Pixel Art Character PNG | Player sprite | Cropped first cell; animation not connected |
| `slime` | Slime 1 idle PNG without shadow | Hostile creature | Cropped first cell; animation not connected |
| `turnip` | Farming Set vegetables PNG | Harvest item | Temporary root-vegetable stand-in, not verified as a turnip |
| `grass` | Farming Sim terrain tileset | Terrain texture | One 16×16 patch, enlarged with nearest-neighbor |

The map's current paths, trees, buildings and other scenery are drawn by the game code; they should not be represented as imported artwork from these packs.

## Integration plan

1. Preserve the source images in a dedicated public asset directory (or use Git LFS if the asset collection becomes large), without embedding large PNGs as base64 in TypeScript.
2. Load the player sheet as a Phaser spritesheet after confirming its exact frame dimensions and layout; wire idle/walk animations using the real frame layout.
3. Load the Slime 1 PNG sheets and wire idle/walk/attack/hurt/death animations using verified frame dimensions and counts. Select a consistent direction/shadow variant.
4. Use the Farming Sim terrain, buildings, crops, and details tilesets to create a tilemap; preserve correct tile sizes and nearest-neighbor pixel-art rendering.
5. Integrate Farming Set produce/seed/crate assets into inventory icons and crop rewards where appropriate.
6. Verify each pack's license and attribution from its original distribution page and included documentation before publishing assets. License details are not yet confirmed in this manifest.
7. Run `npm install`, `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` in an environment with npm registry access; record results before calling the stage complete.

## Stage 1 status

**Audit completed; full asset integration remains in progress.** The archive contents are now inventoried, but the full art sheets, tilemaps, and animations are not yet integrated into the live Phaser scene. Do not mark Stage 1 complete until the integration and build checks above pass.
