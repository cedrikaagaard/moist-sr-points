// Achievements: fun, WoW-flavoured badges each raider earns from their data.
// Rarity drives the colour (like item quality). `test(p, d)` gets the player
// plus a small derived-context object (see data.js: rank, itemsLed, etc.).
//
// Keep these defensible and light-hearted - people see their own names here.

export const ACHIEVEMENTS = [
  // --- Dedication (soft-reserves placed) ---
  { id: "first-sr", emoji: "📜", name: "Sharpened Elbows", desc: "Placed your first soft-reserve", rarity: "common", test: (p) => p.srCount >= 1 },
  { id: "sr-25", emoji: "🗒️", name: "Regular", desc: "25 soft-reserves placed", rarity: "common", test: (p) => p.srCount >= 25 },
  { id: "sr-50", emoji: "📚", name: "Committed", desc: "50 soft-reserves placed", rarity: "rare", test: (p) => p.srCount >= 50 },
  { id: "sr-100", emoji: "⚙️", name: "Soft-Reserve Machine", desc: "100 soft-reserves placed", rarity: "epic", test: (p) => p.srCount >= 100 },
  { id: "sr-150", emoji: "🌿", name: "Touch Grass?", desc: "150 soft-reserves placed", rarity: "legendary", test: (p) => p.srCount >= 150 },

  // --- Points banked ---
  { id: "pts-100", emoji: "🪙", name: "Saving Up", desc: "100 points banked", rarity: "common", test: (p) => p.totalPoints >= 100 },
  { id: "pts-300", emoji: "💰", name: "Hoarder", desc: "300 points banked", rarity: "rare", test: (p) => p.totalPoints >= 300 },
  { id: "pts-500", emoji: "🐉", name: "Dragon's Hoard", desc: "500 points banked", rarity: "epic", test: (p) => p.totalPoints >= 500 },
  { id: "pts-800", emoji: "🏦", name: "Scrooge", desc: "800 points banked", rarity: "legendary", test: (p) => p.totalPoints >= 800 },

  // --- Items won ---
  { id: "win-1", emoji: "🎁", name: "First Blood", desc: "Won your first item", rarity: "common", test: (p) => p.wins >= 1 },
  { id: "win-5", emoji: "🛡️", name: "Geared Up", desc: "Won 5 items", rarity: "rare", test: (p) => p.wins >= 5 },
  { id: "win-15", emoji: "👑", name: "Loot Goblin", desc: "Won 15 items", rarity: "epic", test: (p) => p.wins >= 15 },
  { id: "win-30", emoji: "💎", name: "Loot Goblin King", desc: "Won 30 items", rarity: "legendary", test: (p) => p.wins >= 30 },

  // --- Luck (wins vs how much you reserve) ---
  { id: "lucky", emoji: "🍀", name: "Blessed by RNG", desc: "Won on at least half your SRs (20+ SRs)", rarity: "epic", test: (p, d) => p.srCount >= 20 && d.winRate >= 0.5 },
  { id: "horseshoe", emoji: "🌈", name: "Golden Horseshoe", desc: "Won on 70%+ of your SRs (15+ SRs)", rarity: "legendary", test: (p, d) => p.srCount >= 15 && d.winRate >= 0.7 },
  { id: "cursed", emoji: "🎲", name: "RNG Victim", desc: "30+ SRs and still no wins", rarity: "rare", test: (p) => p.srCount >= 30 && p.wins === 0 },
  { id: "snake-eyes", emoji: "🐍", name: "Snake Eyes", desc: "50+ SRs, one win or fewer", rarity: "epic", test: (p) => p.srCount >= 50 && p.wins <= 1 },

  // --- Standing / rank ---
  { id: "top-dog", emoji: "🥇", name: "Top Dog", desc: "#1 on the points leaderboard", rarity: "legendary", test: (p, d) => d.rank === 1 },
  { id: "podium", emoji: "🏆", name: "Podium Finish", desc: "Top 3 in total points", rarity: "epic", test: (p, d) => d.rank <= 3 },
  { id: "front-line", emoji: "🎯", name: "Front of the Line", desc: "#1 in points on at least one item", rarity: "rare", test: (p, d) => d.itemsLed >= 1 },
  { id: "kingpin", emoji: "♛", name: "Kingpin", desc: "#1 in points on 5+ items", rarity: "epic", test: (p, d) => d.itemsLed >= 5 },

  // --- Breadth ---
  { id: "all-raids-sr", emoji: "🗺️", name: "Everywhere at Once", desc: "Soft-reserved in all four raids", rarity: "common", test: (p) => p.raids.length >= 4 },
  { id: "all-raids-pts", emoji: "🌟", name: "Well-Rounded", desc: "Has points in all four raids", rarity: "rare", test: (p, d) => d.raidsWithPoints >= 4 },
  { id: "obsessed", emoji: "🔁", name: "Obsessed", desc: "10+ soft-reserves on a single item", rarity: "rare", test: (p, d) => d.maxItemSRs >= 10 },
  { id: "diversified", emoji: "🎒", name: "Diversified", desc: "Points on 15+ different items", rarity: "rare", test: (p, d) => d.itemsWithPoints >= 15 },
];

const RARITY_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 };

// Earned achievements for a player, rarest first.
export function achievementsFor(p, d) {
  return ACHIEVEMENTS.filter((a) => {
    try {
      return a.test(p, d);
    } catch {
      return false;
    }
  }).sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);
}
