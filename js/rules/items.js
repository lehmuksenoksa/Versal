// Things: what lies about, the pack, picking up, drinking, wielding and wearing, dropping.
// Methods of the World (js/rules/world.js), joined to it there.
import { ITEMS, PACK } from "./content.js";
import { MURKY, ITEM_TRAITS, ITEM_TRAIT, itemTrait } from "./traits.js";
import { an, itemName } from "./names.js";
import { T } from "./dungeon.js";

// A thing found or made: its type, how many, its trait, whether known.
export const makeItem = (type, n = 1, trait = null, known = false) => ({ type, glyph: ITEMS[type].glyph, n, ...(trait ? { trait } : {}), ...(known ? { known } : {}) });

export const itemMethods = {
  // ---- Things ----
  // A thing for this place: of those found this deep, by how common.
  randomItem() {
    const kinds = Object.entries(ITEMS).filter(([, d]) => d.depth <= this.place.depth);
    let r = this.rng.next() * kinds.reduce((s, [, d]) => s + d.weight, 0);
    let type = "potion";
    for (const [t, d] of kinds) if ((r -= d.weight) < 0) { type = t; break; }
    const item = makeItem(type, 1, this.rng.chance(ITEM_TRAIT.chance) ? this.itemTraitFor(type) : null);
    if (item.trait === "murky") Object.assign(item, { brew: this.murky.good, known: this.murky.known });
    return item;
  },

  // A trait for a thing of `type` found here (null if none fits): the bad
  // ones commoner near the top, the good deeper.
  itemTraitFor(type) {
    const depth = this.place.depth, fit = Object.entries(ITEM_TRAITS).filter(([, T]) => T.on.includes(type) && (T.depth ?? 1) <= depth);
    if (!fit.length) return null;
    const weight = ([, T]) => (T.good ? ITEM_TRAIT.good : ITEM_TRAIT.bad)[Math.min(depth, 3) - 1] * (T.weight ?? 1);
    let r = this.rng.next() * fit.reduce((a, t) => a + weight(t), 0);
    for (const t of fit) if ((r -= weight(t)) < 0) return t[0];
    return fit[0][0];
  },

  itemsAt(x, y) { return this.items.filter((i) => i.x === x && i.y === y); },

  // Into the pack: potions of a kind together, else the first free letter.
  // False if there's no room.
  stow(item) {
    const pack = this.player.pack, same = ITEMS[item.type].cat === "potion" && pack.find((i) => i.type === item.type && (i.trait ?? null) === (item.trait ?? null));
    if (same) { same.n += item.n; return same; }
    if (pack.length >= PACK.size) return false;
    const key = [...PACK.letters].find((k) => !pack.some((i) => i.key === k));
    const it = { ...item, key };
    pack.push(it);
    pack.sort((a, b) => a.key.localeCompare(b.key));
    return it;
  },

  packItem(key) { return this.player.pack.find((i) => i.key === key); },

  unpack(it) {
    const pack = this.player.pack;
    pack.splice(pack.indexOf(it), 1);
    const { key, ...item } = it;
    return item;
  },

  // Pick up what lies here (a turn), if there's room.
  pickUp() {
    if (this.ended) return false;
    const p = this.player, here = this.itemsAt(p.x, p.y);
    if (!here.length) { this.log("There's nothing here."); return false; }
    let took = false;
    for (const floor of here) {
      const it = this.stow(floor.item);
      if (!it) { this.log(`You can't carry ${itemName(floor.item)}: your pack is full.`); break; }
      this.items.splice(this.items.indexOf(floor), 1);
      this.log(`You pick up ${itemName(floor.item)} (${it.key}).`);
      took = true;
    }
    return took ? this.tick() : false;
  },

  // Drink a potion from the pack (a turn).
  drink(key) {
    const it = this.packItem(key), d = it && ITEMS[it.type];
    if (!it || d.cat !== "potion") return false;
    const p = this.player, before = p.hp, name = itemName({ ...it, n: 1 });
    if (--it.n <= 0) this.player.pack.splice(this.player.pack.indexOf(it), 1);
    // (A murky one: this run's luck, found out now.)
    if (it.trait === "murky") {
      const knew = this.murky.known;
      this.learnMurky();
      if (!this.murky.good) {
        p.hp -= this.rng.int(...MURKY.harm);
        p.ailments.poisoned = Math.max(p.ailments.poisoned ?? 0, this.rng.int(...MURKY.poison));
        this.log(`You drink ${name}. ${knew ? "Poison, as you knew." : "It's poison!"} You are poisoned. (${p.hp - before})`, "hurt");
        if (p.hp <= 0) this.die("poisoned by a murky potion");
        return this.tick();
      }
    }
    const heal = this.rng.int(...(it.trait === "murky" ? MURKY.heal : itemTrait(it).heal ?? d.heal));
    p.hp = Math.min(p.maxHp, p.hp + heal);
    if (p.ailments.bleeding) delete p.ailments.bleeding;
    this.log(`You drink ${name}. You feel ${it.trait === "murky" ? "much " : ""}better. (+${p.hp - before})`, "good");
    return this.tick();
  },

  // This run's murky potions found out: every one, here and on the levels
  // left, named for what it does.
  learnMurky() {
    this.murky.known = true;
    const all = [...this.player.pack, ...this.places.flatMap((st) => st.items ?? []).map((f) => f.item), ...this.items.map((f) => f.item)];
    for (const it of all) if (it.trait === "murky") it.known = true;
  },

  // Wield a weapon or put on armour from the pack (a turn); what was there
  // goes into the pack in its place (a two-handed weapon frees the off hand).
  wield(key) {
    const it = this.packItem(key), d = it && ITEMS[it.type];
    if (!it || (d.cat !== "weapon" && d.cat !== "armour")) return false;
    const p = this.player, where = d.cat === "weapon" ? "hand" : d.slot;
    const item = this.unpack(it), old = p.equip[where], extra = d.hands === 2 ? p.equip.off : null;
    p.equip[where] = item;
    if (extra) p.equip.off = null;
    for (const o of [old, extra]) if (o && !this.stow(o)) this.drop(o, true);
    const was = itemName(item, false);
    this.log(d.cat === "weapon" ? `You wield the ${was}.` : `You put on the ${was}.`);
    return this.tick();
  },

  // Take off what's held or worn there (a turn), into the pack.
  takeOff(where) {
    const p = this.player, it = p.equip[where];
    if (!it) return false;
    if (p.pack.length >= PACK.size) { this.log("Your pack is full."); return false; }
    p.equip[where] = null;
    this.stow(it);
    this.log(ITEMS[it.type].cat === "weapon" ? `You put away the ${itemName(it, false)}.` : `You take off the ${itemName(it, false)}.`);
    return this.tick();
  },

  // Drop a thing from the pack where the player stands (a turn); or, `item`
  // given (`quiet`), drop that without a turn.
  drop(keyOrItem, quiet = false) {
    const p = this.player;
    let item = keyOrItem;
    if (typeof keyOrItem === "string") {
      const it = this.packItem(keyOrItem);
      if (!it) return false;
      item = this.unpack(it);
    }
    this.items.push({ x: p.x, y: p.y, item });
    this.log(`You drop ${itemName(item)}.`);
    return quiet ? true : this.tick();
  },
};
