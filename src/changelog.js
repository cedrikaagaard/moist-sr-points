// Site version + human-curated changelog. Add an entry at the TOP of CHANGELOG
// whenever you ship something worth noting; VERSION is derived from the newest
// entry, so you only edit one place. Surfaced in the footer and on /#/changelog.

export const REPO_URL = "https://github.com/cedrikaagaard/moist-points";

export const CHANGELOG = [
  {
    version: "1.1.0",
    date: "2026-08-29",
    changes: [
      "Reworked the mobile layout: the top bar now reflows into tidy rows (brand, search, then a nav that wraps cleanly instead of truncating), panel headings stack their subtitle, and tables breathe better on small screens.",
      "Added guild-observed drop rates on item pages, worked out from how often each item has actually been awarded versus how many times we've cleared the raid. Compare it against Wowhead's rates yourself.",
      "Added this changelog and a visible version number, plus links to the GitHub repo.",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-08-27",
    changes: [
      "Achievements: rarity badges on profiles, locked achievements now show progress bars, and a Most Decorated board on Statistics.",
      "Internal item pages with standings, win odds and past winners.",
      "Faster loads: cached data shows instantly, then refreshes in the background.",
    ],
  },
];

export const VERSION = CHANGELOG[0].version;
