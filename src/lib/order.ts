/**
 * Fractional indexing for stable ordering.
 *
 * Keys are base-62 strings. `orderBetween("a0", "a1")` returns a key that
 * sorts lexicographically between the two, so moving an item never rewrites
 * the whole list — only O(1) rows change.
 */

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const PREV_CHAR: Record<string, string> = {};
const NEXT_CHAR: Record<string, string> = {};
for (let i = 0; i < DIGITS.length; i++) {
  PREV_CHAR[DIGITS[i]] = DIGITS[Math.max(0, i - 1)];
  NEXT_CHAR[DIGITS[i]] = DIGITS[Math.min(DIGITS.length - 1, i + 1)];
}
const FIRST = DIGITS[0];
const LAST = DIGITS[DIGITS.length - 1];
const MIDPOINT = DIGITS[Math.floor(DIGITS.length / 2)];

function integerHead(key: string): string {
  let head = "";
  for (const ch of key) {
    head += ch;
    if (ch !== MIDPOINT) break;
  }
  return head;
}

/** Generate a key that sorts strictly between a and b (a < b). Pass null for unbounded ends. */
export function orderBetween(before: string | null, after: string | null): string {
  if (before === null && after === null) return MIDPOINT;

  if (before === null) {
    // before the smallest key
    if (!after) return MIDPOINT;
    const head = integerHead(after);
    const lastCh = head[head.length - 1];
    if (lastCh !== FIRST) return head.slice(0, -1) + PREV_CHAR[lastCh] + LAST.repeat(13);
    return head + LAST.repeat(14);
  }

  if (after === null) {
    // after the largest key
    const head = integerHead(before);
    const lastCh = head[head.length - 1];
    if (lastCh !== LAST) return head.slice(0, -1) + NEXT_CHAR[lastCh] + FIRST.repeat(13);
    return head + FIRST.repeat(14);
  }

  if (before >= after) throw new Error(`orderBetween: ${before} >= ${after}`);

  let a = before;
  let b = after;
  let out = "";
  // Walk both keys, extending the shorter one with implicit midpoints.
  for (let i = 0; ; i++) {
    const ca = i < a.length ? a[i] : FIRST;
    const cb = i < b.length ? b[i] : LAST;
    if (ca === cb) {
      out += ca;
      continue;
    }
    const ia = DIGITS.indexOf(ca);
    const ib = DIGITS.indexOf(cb);
    if (ib - ia > 1) {
      // room between the two chars
      return out + DIGITS[Math.floor((ia + ib) / 2)];
    }
    // no room: take ca and recurse on the tails
    out += ca;
    a = a.slice(i + 1);
    b = b.slice(i + 1);
    i = -1; // restart loop on tails
    if (a === "") return out + FIRST.repeat(13); // b tail is non-empty
    if (b === "") {
      // a is a prefix of the path; increment within a's tail
      const head = integerHead(a);
      const lastCh = head[head.length - 1];
      if (lastCh !== LAST) return out + head.slice(0, -1) + NEXT_CHAR[lastCh] + FIRST.repeat(13);
      return out + head + FIRST.repeat(14);
    }
  }
}

/** Initial order key for appending to the end of a list. */
export function orderAfter(lastKey: string | null): string {
  return orderBetween(lastKey, null);
}

/** Compare helper for sorting by fractional keys. */
export function byOrder(a: { order: string }, b: { order: string }): number {
  return a.order < b.order ? -1 : a.order > b.order ? 1 : 0;
}
