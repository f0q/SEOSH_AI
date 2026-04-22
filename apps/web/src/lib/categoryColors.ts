const CAT_PALETTE = [
  { h: 330 }, // pink
  { h: 220 }, // blue
  { h: 175 }, // teal
  { h: 15  }, // orange
  { h: 250 }, // indigo
  { h: 90  }, // lime
  { h: 350 }, // rose
  { h: 200 }, // sky
];

/** Hash a string to a number (djb2) — stable across renders / page loads */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return Math.abs(h);
}

/** Returns inline-style objects for a category badge, dot, and checkmark.
 *  Color is derived from the category NAME (not its list position),
 *  so the same name always gets the same hue. */
export function getCatColor(name: string) {
  const { h } = CAT_PALETTE[hashStr(name) % CAT_PALETTE.length];
  return {
    badge: {
      color:      `hsl(${h} 80% 72%)`,
      background: `hsl(${h} 70% 30% / 0.15)`,
      border:     `1px solid hsl(${h} 60% 50% / 0.30)`,
    },
    dot:   `hsl(${h} 80% 65%)`,
    check: `hsl(${h} 80% 70%)`,
  };
}
