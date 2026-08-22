import { describe, expect, it } from "vitest";
import { byOrder, orderAfter, orderBetween } from "@/lib/order";

function sorted(keys: string[]): string[] {
  return [...keys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

describe("orderBetween", () => {
  it("returns midpoint for empty bounds", () => {
    expect(orderBetween(null, null)).toBe("V");
  });

  it("inserts between two keys", () => {
    const mid = orderBetween("a", "c");
    expect(mid > "a").toBe(true);
    expect(mid < "c").toBe(true);
  });

  it("inserts before the first key", () => {
    const k = orderBetween(null, "a");
    expect(k < "a").toBe(true);
  });

  it("inserts after the last key", () => {
    const k = orderAfter("a");
    expect(k > "a").toBe(true);
  });

  it("handles adjacent keys by extending precision", () => {
    const k = orderBetween("a", "b");
    expect(k > "a").toBe(true);
    expect(k < "b").toBe(true);
  });

  it("handles deep adjacency repeatedly without collision", () => {
    let prev = "a0";
    const keys = [prev];
    for (let i = 0; i < 50; i++) {
      const next = orderBetween(prev, "a1");
      expect(next > prev).toBe(true);
      expect(next < "a1").toBe(true);
      keys.push(next);
      prev = next;
    }
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("throws when bounds are inverted", () => {
    expect(() => orderBetween("b", "a")).toThrow();
    expect(() => orderBetween("a", "a")).toThrow();
  });
});

describe("ordering invariants", () => {
  it("keeps a shuffled list recoverable via sort", () => {
    // build a list by inserting at valid positions (kept sorted)
    let keys: string[] = ["V"];
    const ops: ("first" | "last" | "between01" | "between12")[] = [
      "last",
      "first",
      "between01",
      "between12",
      "last",
      "first",
    ];
    for (const op of ops) {
      let key: string;
      if (op === "last") {
        key = orderAfter(keys[keys.length - 1]);
      } else if (op === "first") {
        key = orderBetween(null, keys[0]);
      } else if (op === "between01") {
        key = orderBetween(keys[0], keys[1]);
      } else {
        key = orderBetween(keys[1], keys[2]);
      }
      expect(key.length).toBeGreaterThan(0);
      keys = sorted([...keys, key]);
    }
    const shuffled = [...keys].reverse();
    expect(sorted(shuffled)).toEqual(keys);
  });

  it("appending always sorts last", () => {
    let last: string | null = null;
    const keys: string[] = [];
    for (let i = 0; i < 20; i++) {
      last = orderAfter(last);
      keys.push(last);
    }
    expect(sorted(keys)).toEqual(keys);
  });
});

describe("byOrder", () => {
  it("sorts objects by their order key", () => {
    const items = [{ order: "b" }, { order: "a0" }, { order: "a" }];
    const out = [...items].sort(byOrder);
    expect(out.map((i) => i.order)).toEqual(["a", "a0", "b"]);
  });
});
