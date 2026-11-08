// Test rooms: the real game on a small, set-up level (js/rules/scenario.js),
// opened straight away with no name asked and nothing saved, to try a look or
// a rule in play: `index.html?scene=lights`, or on the published page
// `#test-lights` (or a test page of its own setting `VERSAL_SCENE`).
//
// The map's letters: js/rules/scenario.js (# rock, . floor, @ you, B a
// brazier, F a campfire, T a torch on that wall, A an altar with candles
// along it, V across; monsters by their letter).

export const SCENES = {
  // Every light the levels have: a torch on each of the room's walls, a
  // brazier, a campfire, candles on an altar both ways; the lamp out, so
  // each shows by its own light.
  lights: {
    sneaking: true,
    map: `
      #########T#########
      #.................#
      #..B..........F...#
      #.................#
      #.................#
      T........@........T
      #.................#
      #.................#
      #...A.........V...#
      #.................#
      #.................#
      #########T#########
    `,
  },
};

// The test room asked for, or null: by a test page (`window.VERSAL_SCENE`,
// set before the game loads: a page of its own, for where an address's
// `#…` doesn't reach the game), or by the address.
export function sceneAsked(loc = location) {
  const q = new URLSearchParams(loc.search).get("scene"), h = loc.hash.match(/^#test-([a-z0-9-]+)$/)?.[1];
  const name = globalThis.VERSAL_SCENE ?? q ?? h ?? null;
  return name && SCENES[name] ? name : null;
}
