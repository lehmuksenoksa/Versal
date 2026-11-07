// Level generation by areas. The level is split into a few regions, each of
// a type that sets how its rooms and corridors are made:
//   dungeon: built square rooms and straight corridors;
//   cavern: misshapen caves (the big ones with rock formations standing in
//     them) joined by winding passages of varying width;
//   collapsed: built rooms and caves mixed, some of the rooms half fallen in,
//     with rubble on their floors and along their corridors;
//   halls: the goblin king's: big halls hewn roughly out of the rock, held
//     up by rough columns, joined by wide hewn passages.
// Or (`from` and `to` set) the level changes from one kind to the other,
// gradually, across it from left to right: the player starts on the left
// (by the stairs up, `stairsUp`, if `up`), the stairs down (`stairsDown`, if
// `down`) are on the far right, and (`throne`) the far right's biggest hall
// is the throne room (`throneRoom`).
// A corridor changes as it crosses from one region into another.
// The level has the shape the game and the map drawing expect (see
// dungeon.js), and also `area` (each tile's region type, an index into
// AREAS), `rubble` (0 to 3 for each tile), `doors` (each { x, y, dx, dy, open }:
// a door in the tile at x, y, the dungeon room it opens into that way, shut
// or open), `secrets` (secret doors, as doors, their squares rock until
// found), `features` (things drawn in the dungeon rooms: see the
// furnishing), `posts` (pillars on grid crossings, [x, y]: no step
// diagonally past one), `recesses` (shallow alcoves in the walls, each
// { x, y, dx, dy, w }: in the wall that way from the square x, y, w squares
// wide), `lights` (every light, each { x, y, kind } in squares: all light
// comes from them), `blocks` (squares in the way though
// floor: campfires), `roomOf` and `wallOf` (which room, an index into
// `rooms`, each square's floor and each bit of rock bordering it is part
// of; -1 for none: corridors, passages), each room's `kind`,
// and `regions` (their seed points and types).
// Columns are rock, a square each.
//
// The generator itself is in levelgen/, a file a part (levelgen/index.js:
// the order of it all).

export * from "./levelgen/index.js";
