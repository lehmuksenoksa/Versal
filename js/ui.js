// The side panel ("codex"): stats, satchel, and the chronicle of messages.

import { WEAPONS, ARMOURS, DEPTHS, MAX_DEPTH } from "./content.js";
import { T } from "./dungeon.js";
import { toRoman } from "./game.js";

export class UI {
  constructor(handlers) {
    this.$ = (id) => document.getElementById(id);
    this.handlers = handlers;
    this.$("btn-quaff").addEventListener("click", () => handlers.quaff());
    this.$("btn-read").addEventListener("click", () => handlers.read());
    this.$("btn-wait").addEventListener("click", () => handlers.wait());
    this.$("btn-descend").addEventListener("click", () => handlers.descend());
    this.lastLogLen = -1;
  }

  update(g) {
    const p = g.player, $ = this.$;
    $("leaf").textContent = `Leaf ${toRoman(g.depth)} of ${toRoman(MAX_DEPTH)}: ${DEPTHS[g.depth].title}`;
    const hpFrac = Math.max(0, p.hp / p.maxHp);
    $("hp-text").textContent = `${Math.max(0, p.hp)} / ${p.maxHp}`;
    $("hp-fill").style.width = `${hpFrac * 100}%`;
    $("hp-fill").classList.toggle("low", hpFrac < 0.34);
    const need = (10 * p.level * (p.level + 1)) / 2, prev = (10 * (p.level - 1) * p.level) / 2;
    $("xp-fill").style.width = `${Math.min(100, ((p.xp - prev) / (need - prev)) * 100)}%`;
    $("level").textContent = p.level;
    $("xp-text").textContent = `${p.xp} / ${need}`;
    const [a0, a1] = g.attackRange(p);
    $("attack").textContent = `${a0}–${a1}`;
    $("armour").textContent = ARMOURS[p.armour].def;
    $("gold").textContent = p.gold;
    $("weapon-name").textContent = WEAPONS[p.weapon].name;
    $("armour-name").textContent = ARMOURS[p.armour].name;
    $("potions").textContent = p.potions;
    $("scrolls").textContent = p.scrolls;
    $("btn-quaff").disabled = p.potions <= 0 || g.state !== "play";
    $("btn-read").disabled = p.scrolls <= 0 || g.state !== "play";
    $("btn-descend").hidden = g.tileAt(p.x, p.y) !== T.STAIRS_DOWN || g.state !== "play";

    if (g.messages.length !== this.lastLogLen || g.messages.at(-1) !== this.lastMsg) {
      this.lastLogLen = g.messages.length;
      this.lastMsg = g.messages.at(-1);
      const log = $("log");
      log.replaceChildren(
        ...g.messages.slice(-40).map((m, i, arr) => {
          const li = document.createElement("li");
          li.className = `msg-${m.kind}`;
          if (m.turn === g.turn || i === arr.length - 1) li.classList.add("fresh");
          li.textContent = m.text;
          return li;
        })
      );
      log.scrollTop = log.scrollHeight;
    }
  }
}
