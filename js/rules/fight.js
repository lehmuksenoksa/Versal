// Fighting: the player's blow and defence, monsters' blows, ailments, falling and dying; experience and levels.
// Methods of the World (js/rules/world.js), joined to it there.
import { MONSTERS, PLAYER, LEVELS, AILMENTS, ITEMS, PACK, WHACK, SNEAK_HIT, MORALE } from "./content.js";
import { GOBLINS, MONSTER_BLEED, ROOM_TRAITS, itemTrait, monTrait } from "./traits.js";
import { an, itemName, monName, ordinal } from "./names.js";

export const fightMethods = {
  // The player's blow, as damage from to: their weapon's (bare hands') and
  // better every other level.
  attack() {
    const b = Math.floor((this.player.level - 1) / 2), w = this.player.equip.hand, d = w ? ITEMS[w.type].dmg : PACK.bare, t = itemTrait(w).dmg ?? [0, 0];
    const lo = Math.max(1, d[0] + t[0] + b);
    return [lo, Math.max(lo, d[1] + t[1] + b)];
  },

  // How much of a blow the player's armour can take off (up to this).
  defence() {
    return Object.values(this.player.equip).reduce((s, it) => s + (it ? Math.max(0, (ITEMS[it.type].def ?? 0) + (itemTrait(it).def ?? 0)) : 0), 0);
  },

  // The traits of what the player holds and wears, together: `key` of each
  // that has it.
  worn(key) { return Object.values(this.player.equip).map((it) => itemTrait(it)[key]).filter(Boolean); },

  // A whack at monster `g`: it may miss; one out of hit points falls. Its pack
  // turns on the player, and the noise wakes packs asleep near by. (The
  // weapon's trait: a better or worse chance to hit, more against goblins,
  // a sharp blade's hard blow making the living bleed; a timid monster flees
  // when first hurt.)
  whack(g) {
    const unaware = g.state === "sleeping" || g.state === "neutral", T = itemTrait(this.player.equip.hand);
    const hit = unaware || this.dice.fight.chance(WHACK + (T.hit ?? 0));
    let dmg = 0;
    if (hit) {
      dmg = (this.dice.fight.int(...this.attack()) + (T.bane && GOBLINS.has(g.kind) ? T.bane : 0)) * (unaware ? SNEAK_HIT : 1);
      g.hp -= dmg;
    }
    const killed = g.hp <= 0, name = monName(g);
    this.events.push({ type: "whack", target: g, hit, killed, dmg, sneak: unaware });
    this.makeNoise("blow");
    const what = unaware ? `the unaware ${name}` : `the ${name}`;
    const bleeds = hit && !killed && T.bleed && dmg >= MONSTER_BLEED.at && !MONSTERS[g.kind].undead;
    if (bleeds) g.bleed = Math.max(g.bleed ?? 0, MONSTER_BLEED.turns);
    this.log(!hit ? `You miss ${what}.` : killed ? `You kill ${what}.${unaware ? ` (${dmg})` : ""}` : `You ${unaware ? "strike" : "hit"} ${what}. (${dmg})${bleeds ? " It bleeds." : ""}`, killed ? "good" : "");
    for (const a of this.pack(g)) {
      if (a.state === "fleeing") continue;
      a.state = "aggressive";
      a.calm = 0;
      a.aware = 1;
    }
    if (killed) return this.fall(g);
    if (hit && monTrait(g).timid) {
      g.state = "fleeing";
      g.fear = this.dice.fight.int(...MORALE.flee);
      this.log(`The ${name} flees!`, "good");
      this.events.push({ type: "flee", actor: g });
    }
  },

  // Monster `g` falls (struck down, bled out, cut on spikes): experience
  // for it (the king, and the run is won), sometimes what it carried; the
  // undead in a cursed room to rise again; its pack's morale.
  fall(g) {
    const M = MONSTERS[g.kind], name = monName(g);
    this.player.kills++;
    this.gainXp(Math.round(M.xp * (monTrait(g).xp ?? 1)));
    if (M.boss) {
      const p = this.player;
      this.won = { name: p.name, cls: p.cls, level: p.level, turns: this.turn, kills: p.kills, place: this.place.name };
      this.log(`The ${name} falls. You have won!`, "good");
      this.events.push({ type: "won" });
    }
    // (Goblins sometimes drop what they carried.)
    if (M.drops && this.dice.things.chance(PACK.drop)) {
      const item = this.randomItem();
      this.items.push({ x: g.x, y: g.y, item });
      this.log(`The ${name} drops ${itemName(item)}.`);
    }
    // (The undead falling in a cursed room rise again, once.)
    const R = this.roomTraitAt(g.x, g.y);
    if (R === "cursed" && M.undead && !g.risen) (this.rising ??= []).push({ g, depth: this.place.depth, x: g.x, y: g.y, at: this.turn + this.dice.world.int(...ROOM_TRAITS.cursed.rise) });
    this.actors.splice(this.actors.indexOf(g), 1);
    // (A pack whose leader falls follows another.)
    const rest = this.pack(g);
    if (g.leader === g) for (const a of rest) a.leader = rest[0];
    // (Half the pack gone, the rest flee: the undead never, nor the savage.)
    const L = rest[0]?.leader, scared = rest.filter((a) => !monTrait(a).brave);
    if (L && !M.undead && !L.broken && scared.length && rest.length <= (g.packSize ?? 1) / 2) {
      L.broken = true;
      for (const a of scared) { a.state = "fleeing"; a.fear = this.dice.fight.int(...MORALE.flee); }
      const kind = MONSTERS[scared[0].kind].name;
      this.log(scared.length > 1 ? `The ${kind}s flee!` : `The ${monName(scared[0])} flees!`, "good");
      this.events.push({ type: "flee", actor: scared[0] });
    }
  },

  // A monster's blow at the player: it may miss; a hard one may make them
  // bleed; out of hit points, they die.
  strike(g) {
    const M = MONSTERS[g.kind], T = monTrait(g), p = this.player, name = monName(g), hit = this.dice.fight.chance(M.hit + (T.hit ?? 0));
    let dmg = hit ? this.dice.fight.int(...M.dmg) + (T.dmg ?? 0) : 0;
    this.events.push({ type: "attack", actor: g, hit, dmg });
    if (!hit) return this.log(`The ${name} misses you.`);
    // (Armour takes some of the blow off, up to its defence.)
    const saved = Math.min(dmg, this.dice.fight.int(0, this.defence()));
    if (saved >= dmg) return this.log(`The ${name} ${M.verb} you, but your armour holds.`);
    dmg -= saved;
    p.hp -= dmg;
    // (Padded armour: hard blows make you bleed half as often.)
    const B = AILMENTS.bleeding, bleed = M.bleeds && dmg >= B.at && this.dice.fight.chance(B.chance * (this.worn("padded").length ? 0.5 : 1));
    if (bleed) p.ailments.bleeding = Math.max(p.ailments.bleeding ?? 0, this.dice.fight.int(...B.turns));
    const poison = M.poison && this.dice.fight.chance(M.poison + (T.poison ?? 0));
    if (poison) p.ailments.poisoned = Math.max(p.ailments.poisoned ?? 0, Math.round(this.dice.fight.int(...AILMENTS.poisoned.turns) * (T.poisonFor ?? 1)));
    this.log(`The ${name} ${M.verb} you. (${dmg})${bleed ? " You bleed." : ""}${poison ? " You are poisoned." : ""}`, "hurt");
    if (p.hp <= 0) return this.die(`killed by ${an(name)}`);
    // (Spikes on the helmet cut what hits you.)
    const spikes = this.worn("spikes").reduce((a, b) => a + b, 0);
    if (spikes && this.actors.includes(g)) {
      g.hp -= spikes;
      if (g.hp <= 0) {
        this.log(`The ${name} is cut on your spikes and falls.`, "good");
        this.events.push({ type: "fall", target: g });
        this.fall(g);
      }
    }
  },

  // Ailments take their course, and wounds heal (quicker resting).
  ailing(resting) {
    const p = this.player, A = p.ailments;
    if (A.bleeding && resting) {
      delete A.bleeding;
      this.log("Your bleeding stops.");
    }
    for (const [name, turns] of Object.entries(A)) {
      if (this.turn % AILMENTS[name].every === 0) p.hp--;
      if (turns <= 1) {
        delete A[name];
        this.log(name === "bleeding" ? "Your bleeding stops." : "The poison wears off.");
      } else A[name] = turns - 1;
      if (p.hp <= 0) return this.die(name === "bleeding" ? "bled to death" : "died of poison");
    }
    // (Nothing heals in a cursed room; resting heals twice as fast in a
    // hallowed one.)
    const R = this.roomTraitAt(p.x, p.y);
    if (R === "cursed") return;
    p.healing += (1 / (resting ? PLAYER.restHeal : PLAYER.heal)) * (resting && R === "hallowed" ? 2 : 1);
    if (p.healing >= 1) {
      p.healing -= 1;
      if (p.hp < p.maxHp) p.hp++;
    }
  },

  // The experience the player's next level needs, all told (null at the last).
  nextLevel() { return LEVELS.xp[this.player.level] ?? null; },

  // Experience for a kill; enough, and a new level.
  gainXp(n) {
    const p = this.player;
    p.xp += n;
    while (this.nextLevel() !== null && p.xp >= this.nextLevel()) {
      p.level++;
      p.maxHp += LEVELS.hp;
      p.hp += LEVELS.hp;
      this.log(`You reach the ${ordinal(p.level)} level.`, "good");
    }
  },

  // The run ends: how, where, and what was done.
  die(how) {
    const p = this.player;
    p.hp = Math.min(p.hp, 0);
    this.dead = { how, place: this.place.name, depth: this.place.depth, turns: this.turn, kills: p.kills, name: p.name, cls: p.cls, level: p.level };
    this.log("You die.", "hurt");
    this.events.push({ type: "death" });
  },

  // Why the player can't rest now (null if they can): a monster in sight, or
  // nothing to rest for.
  cantRest() {
    if (this.ended) return "over";
    if (this.monsterInSight()) return "You can't rest with an enemy in sight.";
    if (this.player.hp >= this.player.maxHp && !Object.keys(this.player.ailments).length) return "You don't need rest.";
    if (this.roomTraitAt(this.player.x, this.player.y) === "cursed" && !this.player.ailments.bleeding) return "Nothing heals here.";
    return null;
  },
};
