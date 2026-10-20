export const XP_PER_LEVEL = 100;

export function levelForXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 1;
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function addItem(
  inventory: Record<string, number>,
  itemId: string,
  quantity = 1
): Record<string, number> {
  if (!itemId || !Number.isInteger(quantity) || quantity <= 0) return inventory;
  return { ...inventory, [itemId]: (inventory[itemId] ?? 0) + quantity };
}
