# Asset manifest

The owner supplied four ZIP archives in the project conversation. A compact 128×128 PNG atlas is embedded as a data URI in `src/game/atlasData.ts` so the starter scene can load it without a binary-file API upload.

| Atlas frame | Source archive | Source file | Intended use | Import status |
|---|---|---|---|---|
| `player` | Pixel Art Character | `PNG/Boy  sheet wlaking and Idle.png` | Starter character portrait/sprite frame | Cropped from first 64×64 cell; full animation sheet not yet wired |
| `slime` | Free Slime Mobs | `PNG/Slime1/Without_shadow/Slime1_Idle_without_shadow.png` | First hostile creature | Cropped from first 64×64 cell; animation and AI polish pending |
| `turnip` | Farming Set | `farming set opengameart/Vegetables.png` | Produce icon | Cropped 32×32 icon sample |
| `grass` | Farming Sim Asset Pack | `ReColor/16x16/Tilesets (Compact)/vectoraith_tileset_farmingsims_terrains_recolor.png` | Terrain texture sample | Cropped 16×16 patch and enlarged with nearest-neighbor |

The current map uses original Phaser-drawn terrain, paths, trees, and building silhouettes. Do not claim those shapes are part of a downloaded pack. The complete source archives are not committed to the public website.

## Next asset work

1. Verify and record the exact license and attribution requirements from each pack's original download page and archive.
2. Add the complete sprite sheets as actual binary files through a local Git checkout or Git LFS/API workflow.
3. Use the original frame layout to wire player idle/walk and slime idle/walk/attack/hurt/death animations.
4. Replace hand-drawn map surfaces with a verified tilemap built from the terrain/building tilesets.
5. Expand the manifest with frame dimensions, animation frame counts, and exact licenses once confirmed.
