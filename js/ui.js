// The words around the map, as in the ink ledger mockup (mockups/ledger.html):
// at the top left, the place, the level and the newest messages; on a wide
// screen, the sidebar on the right: who the player is and how they are, and
// under that their sheet, or what they've opened in its place (equipment,
// inventory, a look at what's in sight); the whole log, pulled down as a
// drawer (m); the help (?); the page that asks the player's name; the page
// that says how a run ended. On a wide screen the corner and the sidebar sit
// on torn black plates (js/plates.js). Plain page elements over the map's
// canvas, redone only when something they show has changed.

import { ordinal, ITEMS, PACK, itemName, MONSTERS, monName } from "./rules/world.js";
import { STATE, THINGS, wounds, itemStats } from "./tips.js";
import { drawPlates, drawDrawer } from "./plates.js";

// How wide the screen must be for the sidebar; how wide the sidebar is.
export const SIDEBAR = { minWidth: 900, width: 340 };
// The drawer's sheet.
const DRAWER_GREY = "#1e1c1a";
// The keys, for the help.
const KEYS_HELP = [
  ["WASD, arrows, numpad", "move; into a monster, attack; into a door, open it"],
  ["click", "step toward it; hold to keep walking"],
  ["Shift", "held: what's under the mouse, and the way there"],
  ["Shift+click", "walk there; a monster, attack it; a thing, pick it up; a door by you, close it"],
  ["x", "explore: walk to where you haven't been"],
  ["z", "search for secret doors"],
  ["r", "rest until healed"],
  ["> and <", "go down or up the stairs you stand on"],
  [". or space", "wait a turn"],
  ["f", "put out the lamp (sneak), or light it"],
  ["c", "close a door"],
  [",", "pick up what's here"],
  ["q", "drink a potion"],
  ["W", "wield a weapon, put on armour"],
  ["t", "take off, put away"],
  ["D", "drop"],
  ["e", "equipment"],
  ["i", "inventory"],
  ["l", "look at what's in sight"],
  ["m", "all the messages"],
  ["Tab", "the whole level, as far as you've seen it"],
  ["?", "this help"],
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const NAME_KEY = "versal-name";

export class UI {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = { corner: $("corner"), side: $("side"), drawer: $("drawer"), death: $("death"), help: $("help"), plates: $("plates") };
    this.stamp = "";
    this.drawerOpen = false;
    this.helpOpen = false;
    // What the sidebar shows under the player: "sheet", "e", "i" or "l".
    this.panel = "sheet";
    this.platesFor = "";
    // A question waiting for a letter: { verb, title } ("q" drink, "W" wield
    // or wear, "D" drop: from the pack; "t" take off: from the equipment).
    this.prompt = null;
    // What to do when a thing's action is clicked: onAct(verb, key).
    this.onAct = null;
    this.el.side.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (b && this.onAct) this.onAct(b.dataset.act, b.dataset.key);
    });
  }

  // Ask which thing (a letter or a click): the panel it's chosen from opened.
  ask(verb) {
    const titles = { q: "Drink which?", W: "Wield or wear which?", D: "Drop which?", t: "Take off which?" };
    this.prompt = { verb, title: titles[verb] };
    this.panel = verb === "t" ? "e" : "i";
    this.stamp = "";
  }
  endAsk() {
    if (!this.prompt) return;
    this.prompt = null;
    this.panel = "sheet";
    this.stamp = "";
  }

  // Is the sidebar shown (a wide enough screen)? And so how much of the
  // screen's right the map should keep clear of.
  get wide() { return window.innerWidth >= SIDEBAR.minWidth; }
  get insetRight() { return this.wide ? SIDEBAR.width : 0; }
  // Is anything open that takes the keys (a page over the map)?
  get blocking() { return this.helpOpen || !!this.asking; }

  toggleDrawer(open = !this.drawerOpen) {
    this.drawerOpen = open;
    this.el.drawer.classList.toggle("open", open);
    this.stamp = "";
  }
  toggleHelp(open = !this.helpOpen) {
    this.helpOpen = open;
    this.el.help.hidden = !open;
    if (open) this.el.help.innerHTML = `<div class="card"><h2>Keys</h2><dl>${KEYS_HELP.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
      <h2>Touch</h2><p>Tap beside you to step that way; hold to keep walking. Pinch to zoom. The buttons along the bottom search, rest, light or put out the lamp, and close doors.</p>
      <h2>Something odd?</h2><p><button id="save-replay" type="button">Save a replay of this run</button> It plays the very same run again, move by move, so whatever happened can be seen again.</p>
      <p class="hint">? or Esc to close</p></div>`;
    if (open) this.el.help.querySelector("#save-replay")?.addEventListener("click", () => this.onSaveReplay?.());
  }
  // Open a panel in the sidebar ("e", "i", "l"), or the sheet again; the same
  // key twice closes it.
  togglePanel(k) {
    this.panel = this.panel === k || k === "sheet" ? "sheet" : k;
    this.stamp = "";
  }

  // Who goes down: asked in the corner, over the level already there (as
  // chosen in mockups/choices.html), the last name offered; `go(name)` when
  // answered.
  lastName() {
    try { return localStorage.getItem(NAME_KEY) || ""; } catch { return ""; }
  }
  askName(go) {
    this.asking = { go, last: this.lastName() };
    this.stamp = "";
  }
  // (The corner's question, once drawn: the name field taken, Enter to go.)
  wireAsk() {
    const form = this.el.corner.querySelector("form.ask");
    if (!form || form.dataset.wired) return;
    form.dataset.wired = "1";
    const input = form.querySelector("input");
    // (What's typed kept, should the corner be drawn again meanwhile.)
    input.addEventListener("input", () => { if (this.asking) this.asking.last = input.value; });
    setTimeout(() => { input.focus(); input.select(); }, 0);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = input.value.trim().replace(/\s+/g, " ") || "Adventurer";
      try { localStorage.setItem(NAME_KEY, name); } catch {}
      const { go } = this.asking;
      this.asking = null;
      this.stamp = "";
      go(name);
    });
  }

  // Bring everything up to date with the world (cheap when nothing changed).
  update(world) {
    const p = world.player;
    const seen = world.actors.filter((a) => a !== p && world.isVisible(a.x, a.y));
    const stamp = [world.place.depth, !!this.asking, p.name, !!world.won, world.messages.length, world.messages[world.messages.length - 1]?.n, p.hp, p.maxHp, p.xp, p.level, JSON.stringify(p.equip), JSON.stringify(p.pack), this.prompt?.verb, Object.keys(p.ailments).join(), !!world.dead, this.wide, this.drawerOpen, this.panel,
      window.innerWidth, window.innerHeight, world.sneaking, this.panel === "l" ? seen.map((a) => `${a.id}${a.state}${a.hp}`).join() + world.turn : ""].join("|");
    if (stamp === this.stamp) return;
    this.stamp = stamp;
    const wide = this.wide;
    document.body.classList.toggle("wide", wide);
    this.el.drawer.style.right = `${this.insetRight}px`;
    this.drawPlates();
    const low = p.hp <= p.maxHp / 3;
    const ailing = Object.keys(p.ailments);
    const hp = `${Math.max(0, p.hp)}<span>/${p.maxHp}</span>`;

    // The corner: the place, the level (on a narrow screen, health), the
    // newest three messages, older ones dimmer; older ones give way while the
    // newest take more than three lines.
    const news = world.messages.slice(-3);
    this.el.corner.innerHTML = `<div class="head"><span class="place">${esc(world.place.name)}</span>
        <span class="depth">${ordinal(world.place.depth)} level</span>
        ${wide ? "" : `<span class="hpline${low ? " low" : ""}">${hp}</span>`}</div>
      ${this.asking ? `<form class="ask"><label for="start-name">Who goes down?</label>
        <input id="start-name" name="name" maxlength="20" autocomplete="off" spellcheck="false" enterkeyhint="go" value="${esc(this.asking.last)}">
        <div class="pull">Enter to go down</div></form>`
      : `<div class="news">${news.map((m, i) => `<div class="age${news.length - 1 - i} ${m.kind}">${esc(m.text)}</div>`).join("")}</div>
      ${world.messages.length > 3 ? `<div class="pull">m for more</div>` : ""}`}`;
    if (this.asking) this.wireAsk();
    const box = this.el.corner.querySelector(".news"), line = box ? parseFloat(getComputedStyle(box).lineHeight) || 26 : 0;
    while (box && box.children.length > 1 && box.scrollHeight > 3 * line + 4) box.firstElementChild.remove();

    // The sidebar (on a narrow screen, only a panel, over the map).
    const top = `<div class="who"><h3>${esc(p.name)}</h3><div>${esc(p.cls)}, level ${p.level}</div></div>
      <div><h5>Health</h5><div class="hp${low ? " low" : ""}">${hp}</div>
        <div class="ailments">${ailing.length ? ailing.map((a) => `<span class="${a}">${a}</span>`).join("") : `<span class="none">nothing ails you</span>`}</div></div>`;
    const foot = `<div class="foot">${[["e", "equipment"], ["i", "inventory"], ["l", "look"], ["m", "messages"], ["r", "rest"], ["?", "help"]]
      .map(([k, n]) => `<span class="${k === this.panel ? "on" : ""}"><b>${k}</b> ${n}</span>`).join("")}</div>`;
    const body = `<div class="body">${this.panelHtml(world, seen)}</div>`;
    this.el.side.hidden = !wide && this.panel === "sheet";
    this.el.side.classList.toggle("sheetup", !wide);
    this.el.side.innerHTML = wide ? top + body + foot : body;

    // The drawer: every message, by the turn it came on.
    if (this.drawerOpen) {
      let last = -1, rows = "";
      for (const m of world.messages) {
        if (m.turn !== last) rows += `<li class="turn">Turn ${m.turn}</li>`;
        last = m.turn;
        rows += `<li class="${m.kind}">${esc(m.text)}</li>`;
      }
      this.el.drawer.innerHTML = `<canvas class="dback" aria-hidden="true"></canvas><h5>Messages, ${esc(world.place.name.toLowerCase())}</h5><ol>${rows}</ol><div class="hint">m or Esc to push it back up</div>`;
      const ol = this.el.drawer.querySelector("ol");
      ol.scrollTop = ol.scrollHeight;
      const r = this.el.drawer.getBoundingClientRect();
      drawDrawer(this.el.drawer.querySelector(".dback"), r.width, r.height, r.height + 80, DRAWER_GREY);
    }

    // How the run ended: died, or won.
    this.el.death.hidden = !world.ended;
    this.el.death.classList.toggle("won", !!world.won);
    if (world.won) {
      const v = world.won;
      this.el.death.innerHTML = `<div class="card"><h2>You have won</h2>
        <p>${esc(v.name)} the ${esc(v.cls.toLowerCase())}, of the ${ordinal(v.level)} level, killed the goblin king in ${esc(v.place.toLowerCase())}, after ${v.turns} turns.</p>
        <p>You killed ${v.kills} ${v.kills === 1 ? "monster" : "monsters"} in all.</p>
        <p class="hint">Press any key, or tap, to start again.</p></div>`;
    } else if (world.dead) {
      const d = world.dead;
      this.el.death.innerHTML = `<div class="card"><h2>You died</h2>
        <p>${esc(d.name)} the ${esc(d.cls.toLowerCase())}, of the ${ordinal(d.level)} level, ${esc(d.how)} in ${esc(d.place.toLowerCase())}, on its ${ordinal(d.depth)} level, after ${d.turns} turns.</p>
        <p>${d.kills ? `You killed ${d.kills} ${d.kills === 1 ? "monster" : "monsters"}.` : "You killed nothing."}</p>
        <p class="hint">Press any key, or tap, to start again.</p></div>`;
    }
  }

  // The sidebar's body: the sheet, or the panel opened.
  panelHtml(world, seen) {
    const p = world.player, head = (title, k) => `<div class="panel-head"><h4>${title}</h4><small>${k} to close</small></div>`;
    const row = (g, name, val = "", key = "") => `<li><span class="key">${key}</span><span class="g">${esc(g)}</span><span>${esc(name)}</span><span class="lead"></span><span class="val">${val}</span></li>`;
    const empty = (text) => `<li class="none"><span></span><span class="g">·</span><span>${esc(text)}</span><span></span><span></span></li>`;
    const [a0, a1] = world.attack();
    const P = this.prompt, can = {
      q: (d) => d.cat === "potion",
      W: (d) => d.cat === "weapon" || d.cat === "armour",
      D: () => true,
    };
    const note = (it) => {
      const d = ITEMS[it.type], S = itemStats(it);
      return d.cat === "weapon" ? `attack ${S.dmg[0]}–${S.dmg[1]}${d.hands === 2 ? ", two hands" : ""}` : d.cat === "armour" ? `defence ${S.def}` : it.n > 1 ? `${it.n}` : "";
    };
    // (Its name with its trait, without the count.)
    const named = (it) => itemName(it, false).replace(/^\d+ /, "");
    const btn = (verb, key, label) => `<button type="button" class="act" data-act="${verb}" data-key="${key}">${label}</button>`;
    if (this.panel === "e") {
      const eq = p.equip ?? {}, slots = [["hand", "hand", "a"], ["off", "off hand", "b"], ["head", "head", "c"], ["body", "body", "d"]];
      const rows = slots.map(([where, label, key]) => {
        const it = eq[where], two = where === "off" && eq.hand && ITEMS[eq.hand.type].hands === 2;
        if (!it) return empty(two ? "off hand: the two-handed weapon" : `${label}: nothing`);
        return `<li class="${P ? "pick" : ""}"><span class="key">${P ? key : ""}</span><span class="g">${esc(it.glyph)}</span><span>${esc(named(it))}</span><span class="lead"></span><span class="val">${esc(note(it))}</span>
          <span class="acts">${btn("t", where, ITEMS[it.type].cat === "weapon" ? "put away" : "take off")}</span></li>`;
      }).join("");
      return `${P ? `<div class="panel-head ask"><h4>${P.title}</h4><small>Esc to cancel</small></div>` : head("Equipment", "e")}<ul class="ledger">${rows}</ul>`;
    }
    if (this.panel === "i") {
      const inv = p.pack ?? [];
      const rows = inv.map((it) => {
        const d = ITEMS[it.type], ok = !P || can[P.verb](d);
        const acts = [d.cat === "potion" ? btn("q", it.key, "drink") : btn("W", it.key, d.cat === "weapon" ? "wield" : "wear"), btn("D", it.key, "drop")].join("");
        return `<li class="${P ? (ok ? "pick" : "dim") : ""}"><span class="key">${it.key}</span><span class="g" style="${d.ink ? `color:${d.ink}` : ""}">${esc(it.glyph)}</span><span>${esc(named(it))}</span><span class="lead"></span><span class="val">${esc(note(it))}</span><span class="acts">${acts}</span></li>`;
      }).join("");
      const here = world.itemsAt(p.x, p.y);
      return `${P ? `<div class="panel-head ask"><h4>${P.title}</h4><small>Esc to cancel</small></div>` : head("Inventory", "i")}<ul class="ledger">${inv.length ? rows : empty("You carry nothing.")}</ul>
        ${here.length ? `<div class="sum">Here: ${here.map((i) => esc(itemName(i.item))).join(", ")}. ${btn("pick", "", "pick up")}</div>` : ""}`;
    }
    if (this.panel === "l") {
      const things = new Map();
      for (const f of world.level.features ?? []) {
        if (!THINGS[f.type] || !world.isVisible(Math.floor(f.x), Math.floor(f.y))) continue;
        things.set(f.type, (things.get(f.type) ?? 0) + 1);
      }
      const creatures = seen.map((a) => `<li><span></span><span class="g">${esc(a.glyph)}</span><span>${esc(monName(a))}</span><span class="lead"></span><span class="st ${a.state}">${STATE[a.state] ?? a.state}${wounds(a) === "unhurt" ? "" : `, ${wounds(a)}`}</span></li>`).join("");
      return `${head("In sight", "l")}
        <div><h5>Creatures</h5><ul class="ledger">${creatures || empty("none")}</ul></div>
        <div><h5>Things</h5><ul class="ledger">${things.size ? [...things].map(([t, n]) => row("", n > 1 ? `${THINGS[t].replace(/^an? /, "")} (${n})` : THINGS[t])).join("") : empty("nothing of note")}</ul></div>
        <div class="sum">Your lamp is <b>${world.sneaking ? "out" : "lit"}</b>.</div>`;
    }
    const next = world.nextLevel();
    return `<div><h5>Experience<small>${next !== null ? `to the ${ordinal(p.level + 1)} level` : "the last level"}</small></h5>
        <div class="xp">${p.xp}${next !== null ? `<span> / ${next}</span>` : ""}</div>
        <div class="xpline"><i style="width:${next !== null ? Math.min(100, (100 * p.xp) / next) : 100}%"></i></div></div>
      <div><h5>Stats</h5><ul class="ledger plain">
        <li><span>Attack</span><span class="lead"></span><b class="val">${a0}–${a1}</b></li>
        <li><span>Defence</span><span class="lead"></span><b class="val">${world.defence()}</b></li>
        <li><span>Speed</span><span class="lead"></span><b class="val">${world.sneaking ? "slow, sneaking" : "normal"}</b></li>
        <li><span>Kills</span><span class="lead"></span><b class="val">${p.kills}</b></li>
        <li><span>Turns</span><span class="lead"></span><b class="val">${world.turn}</b></li></ul></div>`;
  }

  // The torn plates under the corner and the sidebar (wide screens), drawn
  // again only when the screen's size changes.
  drawPlates() {
    const W = window.innerWidth, H = window.innerHeight, key = this.wide ? `${W}x${H}` : "none";
    if (key === this.platesFor) return;
    this.platesFor = key;
    this.el.plates.hidden = !this.wide;
    if (this.wide) drawPlates(this.el.plates, W, H);
  }
}
