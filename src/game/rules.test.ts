import { describe, expect, it } from "vitest";
import { addItem, clamp, levelForXp } from "./rules";

describe("game rules", () => {
  it("starts skills at level one and advances per 100 XP", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(250)).toBe(3);
  });

  it("clamps values to a range", () => {
    expect(clamp(-2, 0, 10)).toBe(0);
    expect(clamp(4, 0, 10)).toBe(4);
    expect(clamp(20, 0, 10)).toBe(10);
  });

  it("adds positive whole item quantities immutably", () => {
    const initial = { turnip: 2 };
    expect(addItem(initial, "turnip", 3)).toEqual({ turnip: 5 });
    expect(initial).toEqual({ turnip: 2 });
    expect(addItem(initial, "turnip", 0)).toBe(initial);
  });
});
