// The words around the map, as in the ink ledger mockup (mockups/ledger.html):
// at the top left, the place, the level and the newest messages; on a wide
// screen, the sidebar on the right: who the player is and how they are, and
// under that their sheet, or what they've opened in its place (equipment,
// inventory, a look at what's in sight); the whole log, pulled down as a
// drawer (m); the help (?); the page that asks the player's name; the page
// that says how a run ended. On a wide screen the corner and the sidebar sit
// on torn black plates (js/plates.js). Plain page elements over the map's
// canvas, redone only when something they show has changed.

import { ordinal } from "./world.js";
import { drawPlates, drawDrawer } from "./plates.js";

// How wide the screen must be for the sidebar; how wide the sidebar is.
export const SIDEBAR = { minWidth: 900, width: 340 };
// The drawer's sheet.
const DRAWER_GREY = "#1e1c1a";
// The keys, for the help.
const KEYS_HELP = [
  ["WASD, arrows, numpad", "move; into a monster, attack; into a door, open it"],
  ["z", "search for secret doors"],
  ["r", "rest until healed"],
  [". or space", "wait a turn"],
  ["f", "put out the lamp (sneak), or light it"],
  ["c", "close a door"],
  ["e", "equipment"],
  ["i", "inventory"],
  ["l", "look at what's in sight"],
  ["m", "all the messages"],
  ["?", "this help"],
];
// How a monster's state reads in the look.
const STATE = { sleeping: "asleep", neutral: "unaware", suspicious: "suspicious", aggressive: "alarmed" };
// Things worth naming in the look (the rest of the furniture too common to).
const THINGS = { campfire: "a campfire", altar: "an altar", coffin: "a coffin", sarcophagus: "a sarcophagus", table: "a table", bed: "a bed", shelf: "shelves", bench: "a bench", crate: "a crate", barrel: "a barrel", chair: "a chair" };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const NAME_KEY = "versal-name";

export class UI {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = { corner: $("corner"), side: $("side"), drawer: $("drawer"), death: $("death"), help: $("help"), start: $("start"), plates: $("plates") };
    this.stamp = "";
    this.drawerOpen = false;
    this.helpOpen = false;
    // What the sidebar shows under the player: "sheet", "e", "i" or "l".
    this.panel = "sheet";
    this.platesFor = "";
  }

  // Is the sidebar shown (a wide enough screen)? And so how much of the
  // screen's right the map should keep clear of.
  get wide() { return window.innerWidth >= SIDEBAR.minWidth; }
  get insetRight() { return this.wide ? SIDEBAR.width : 0; }
  // Is anything open that takes the keys (a page over the map)?
  get blocking() { return this.helpOpen || !this.el.start.hidden; }

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
      <p class="hint">? or Esc to close</p></div>`;
  }
  // Open a panel in the sidebar ("e", "i", "l"), or the sheet again; the same
  // key twice closes it.
  togglePanel(k) {
    this.panel = this.panel === k || k === "sheet" ? "sheet" : k;
    this.stamp = "";
  }

  // The page that asks who goes down; `go(name)` when answered.
  askName(go) {
    let last = "";
    try { last = localStorage.getItem(NAME_KEY) || ""; } catch {}
    const el = this.el.start;
    el.hidden = false;
    el.innerHTML = `<form class="card"><h2>Who goes down?</h2>
      <label for="start-name">Your name</label>
      <input id="start-name" name="name" maxlength="20" autocomplete="off" spellcheck="false" value="${esc(last)}">
      <p>An adventurer, into the old crypts.</p>
      <button type="submit">Go down</button></form>`;
    const input = el.querySelector("input");
    setTimeout(() => { input.focus(); input.select(); }, 0);
    el.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = input.value.trim().replace(/\s+/g, " ") || "Adventurer";
      try { localStorage.setItem(NAME_KEY, name); } catch {}
      el.hidden = true;
      el.innerHTML = "";
      go(name);
    });
  }

  // Bring everything up to date with the world (cheap when nothing changed).
  update(world) {
    const p = world.player;
    const seen = world.actors.filter((a) => a !== p && world.isVisible(a.x, a.y));
    const stamp = [world.messages.length, p.hp, p.maxHp, p.xp, p.level, Object.keys(p.ailments).join(), !!world.dead, this.wide, this.drawerOpen, this.panel,
      window.innerWidth, window.innerHeight, this.panel === "l" ? seen.map((a) => `${a.id}${a.state}`).join() + world.turn : ""].join("|");
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
      <div class="news">${news.map((m, i) => `<div class="age${news.length - 1 - i} ${m.kind}">${esc(m.text)}</div>`).join("")}</div>
      ${world.messages.length > 3 ? `<div class="pull">m for more</div>` : ""}`;
    const box = this.el.corner.querySelector(".news"), line = parseFloat(getComputedStyle(box).lineHeight) || 26;
    while (box.children.length > 1 && box.scrollHeight > 3 * line + 4) box.firstElementChild.remove();

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

    // How the run ended.
    this.el.death.hidden = !world.dead;
    if (world.dead) {
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
    if (this.panel === "e") {
      const eq = p.equip ?? {};
      const slot = (where, label) => (eq[where] ? row(eq[where].glyph, eq[where].name, esc(eq[where].note ?? "")) : empty(`${label}: nothing`));
      return `${head("Equipment", "e")}<ul class="ledger">${slot("hand", "hand")}${slot("off", "off hand")}${slot("head", "head")}${slot("body", "body")}</ul>
        <div class="sum">Altogether: attack <b>${a0}–${a1}</b>, defence <b>${world.defence()}</b>.</div>`;
    }
    if (this.panel === "i") {
      const inv = p.pack ?? [];
      return `${head("Inventory", "i")}<ul class="ledger">${inv.length ? inv.map((it) => row(it.glyph, it.name, esc(it.note ?? ""), it.key)).join("") : empty("You carry nothing.")}</ul>
        <div class="sum">Room for <b>${10 - inv.length}</b> more things.</div>`;
    }
    if (this.panel === "l") {
      const things = new Map();
      for (const f of world.level.features ?? []) {
        if (!THINGS[f.type] || !world.isVisible(Math.floor(f.x), Math.floor(f.y))) continue;
        things.set(f.type, (things.get(f.type) ?? 0) + 1);
      }
      const creatures = seen.map((a) => `<li><span></span><span class="g">${esc(a.glyph)}</span><span>${esc(a.kind)}</span><span class="lead"></span><span class="st ${a.state}">${STATE[a.state] ?? a.state}</span></li>`).join("");
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
        <li><span>Speed</span><span class="lead"></span><b class="val">normal</b></li>
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
