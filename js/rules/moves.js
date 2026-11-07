// The map and moving on it: squares, doors, who stands where; the player's step (a blow when into a monster).
// Methods of the World (js/rules/world.js), joined to it there.
import { MONSTERS, ITEMS, SNEAK_STEP } from "./content.js";
import { ROOM_TRAITS } from "./traits.js";
import { an, itemName, roomName, roomAt } from "./names.js";
import { isWalkable, isOpen, DIRS8 } from "./dungeon.js";

export const moveMethods = {
  tileAt(x, y) { return this.level.get(x, y); },

  // The trait of the room the square (x, y) is in (null if none).
  roomTraitAt(x, y) { return roomAt(this.level, x, y)?.trait ?? null; },

  actorAt(x, y) { return this.actors.find((a) => a.x === x && a.y === y); },

  isFree(x, y) { return this.walkable(x, y) && !this.shut(x, y) && !this.actorAt(x, y); },

  walkable(x, y) { return isWalkable(this.tileAt(x, y)) && !this.blocks.has(y * this.level.w + x); },

  // The door in the square (x, y), if any; whether one is there and shut.
  doorAt(x, y) { return this.doors.get(y * this.level.w + x); },

  shut(x, y) { return this.doorAt(x, y)?.open === false; },

  // Can a step go from (x, y) by (dx, dy)? Not diagonally past a post.
  canStep(x, y, dx, dy) {
    if (!dx || !dy) return true;
    return !this.posts.has((y + (dy > 0 ? 1 : 0)) * (this.level.w + 1) + x + (dx > 0 ? 1 : 0));
  },

  pack(g) { return this.actors.filter((a) => a !== this.player && a.leader === g.leader); },

  // The player steps by (dx, dy): into a monster, a whack; into a shut door,
  // opening it. Returns true if a turn passed.
  playerMove(dx, dy) {
    if (this.ended) return false;
    const p = this.player, nx = p.x + dx, ny = p.y + dy;
    if (!this.canStep(p.x, p.y, dx, dy)) return false;
    const g = this.actorAt(nx, ny);
    if (g && g !== this.player) {
      this.whack(g);
      return this.tick();
    }
    if (g || !this.walkable(nx, ny)) return false;
    if (this.shut(nx, ny)) {
      this.setDoor(this.doorAt(nx, ny), true, p);
      return this.tick();
    }
    this.moveActor(p, nx, ny);
    // (Potions are picked up on the way, when there's room.)
    for (const floor of this.itemsAt(nx, ny)) {
      if (ITEMS[floor.item.type].cat !== "potion") continue;
      const it = this.stow(floor.item);
      if (!it) continue;
      this.items.splice(this.items.indexOf(floor), 1);
      this.log(`You pick up ${itemName(floor.item)} (${it.key}).`);
    }
    const here = this.itemsAt(nx, ny);
    if (here.length) this.log(`You see ${here.map((i) => itemName(i.item)).join(" and ")} here.`);
    const L = this.level;
    if (L.stairsDown && L.stairsDown.x === nx && L.stairsDown.y === ny) this.log("There are stairs down here (>).");
    if (L.stairsUp && L.stairsUp.x === nx && L.stairsUp.y === ny) this.log("There are stairs up here (<).");
    // (Coming into a room worth naming the first time, its name.)
    const room = roomAt(L, nx, ny);
    if (room && !room.entered && isOpen(this.tileAt(nx, ny))) {
      room.entered = true;
      const name = roomName(room, L);
      if (name) this.log(`You come into ${name}.`);
    }
    // (Sneaking, a step is slower, and quieter; wading, slower still.)
    this.makeNoise(this.sneaking ? "sneak" : "step");
    const wade = this.roomTraitAt(nx, ny) === "flooded" ? ROOM_TRAITS.flooded.slow : 1;
    return this.tick(false, false, (this.sneaking ? SNEAK_STEP : 1) * wade);
  },

  // Is there an open door next to the player to close (none standing in it)?
  canCloseDoor() {
    const p = this.player;
    return DIRS8.some(([dx, dy]) => {
      const d = this.doorAt(p.x + dx, p.y + dy);
      return d && d.open && !this.actorAt(d.x, d.y);
    });
  },

  // Close an open door next to the player (none standing in it). Returns
  // true if one was, which takes the turn.
  closeDoor() {
    if (this.ended) return false;
    const p = this.player;
    for (const [dx, dy] of DIRS8) {
      const d = this.doorAt(p.x + dx, p.y + dy);
      if (!d || !d.open || this.actorAt(d.x, d.y)) continue;
      this.setDoor(d, false, p);
      return this.tick();
    }
    return false;
  },

  // Close the open door at (x, y), next to the player (none standing in it).
  closeDoorAt(x, y) {
    const p = this.player, d = this.doorAt(x, y);
    if (this.ended || !d || !d.open || this.actorAt(x, y) || Math.max(Math.abs(x - p.x), Math.abs(y - p.y)) !== 1) return false;
    this.setDoor(d, false, p);
    return this.tick();
  },

  setDoor(door, open, by) {
    door.open = open;
    if (by === this.player) this.makeNoise("door");
    this.events.push({ type: "door", door, by });
  },

  moveActor(a, x, y) {
    // (The undead won't come into a hallowed room.)
    if (a !== this.player && MONSTERS[a.kind]?.undead && this.roomTraitAt(x, y) === "hallowed" && this.roomTraitAt(a.x, a.y) !== "hallowed") return;
    // (Wading, a monster's step takes longer too.)
    if (a !== this.player && this.roomTraitAt(x, y) === "flooded") a.energy -= ROOM_TRAITS.flooded.slow - 1;
    this.events.push({ type: "move", actor: a });
    a.x = x;
    a.y = y;
  },
};
