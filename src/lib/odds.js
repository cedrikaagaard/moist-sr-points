// Win-the-roll probabilities for the guild's system: the winner is whoever has
// the highest (points + d100 roll). Given the points of everyone contesting an
// item, this returns each contender's chance of winning.
//
// IMPORTANT framing (the data can't know this, the UI must say it): these odds
// assume *every listed point-holder* actually SRs the item and rolls. In a real
// raid, many won't be present — so a person's true odds are usually BETTER than
// shown (fewer competitors), and someone with 0 points can still SR and win on a
// pure roll. Treat these as "worst-case, if the whole field shows up".

// Exact win probability per contender. Ties (equal totals) are treated as a
// loss for simplicity; in-game they're rerolled, and they're rare enough not to
// matter for typical point spreads. O(n^2 * 100) — fine for raid-sized fields.
export function winChances(points) {
  const n = points.length;
  if (n === 0) return [];
  if (n === 1) return [1];
  const out = new Array(n);
  for (let k = 0; k < n; k++) {
    let sum = 0;
    for (let roll = 1; roll <= 100; roll++) {
      const total = points[k] + roll;
      let p = 1;
      for (let i = 0; i < n && p > 0; i++) {
        if (i === k) continue;
        // P(points[i] + r < total) = P(r <= total - points[i] - 1), r in 1..100
        const beaten = Math.min(Math.max(total - points[i] - 1, 0), 100);
        p *= beaten / 100;
      }
      sum += p;
    }
    out[k] = sum / 100;
  }
  return out;
}
