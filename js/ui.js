// The words around the map, as in the ink ledger mockup (mockups/ledger.html):
// at the top left, the place, the level and the newest messages; on a wide
// screen, the sidebar on the right (health and what ails the player); the
// whole log, pulled down as a drawer (m); the help (?); and the page that
// says how a run ended. Kept as plain page elements over the map's canvas,
// redone only when something they show has changed.

const ORDINAL = (n) => `${n}${["th", "st", "nd", "rd"][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]}`;
// How wide the screen must be for the sidebar; how wide the sidebar is.
export const SIDEBAR = { minWidth: 900, width: 340 };
// The keys, for the help and the sidebar's foot.
const KEYS_HELP = [
  ["WASD, arrows, numpad", "move; into a monster, attack; into a door, open it"],
  ["z", "search for secret doors"],
  ["r", "rest until healed"],
  [". or space", "wait a turn"],
  ["f", "put out the lamp (sneak), or light it"],
  ["c", "close a door"],
  ["m", "all the messages"],
  ["?", "this help"],
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export class UI {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = { corner: $("corner"), side: $("side"), drawer: $("drawer"), death: $("death"), help: $("help") };
    this.stamp = "";
    this.drawerOpen = false;
    this.helpOpen = false;
  }

  // Is the sidebar shown (a wide enough screen)? And so how much of the
  // screen's right the map should keep clear of.
  get wide() { return window.innerWidth >= SIDEBAR.minWidth; }
  get insetRight() { return this.wide ? SIDEBAR.width : 0; }

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

  // Bring everything up to date with the world (cheap when nothing changed).
  update(world) {
    const p = world.player;
    const stamp = `${world.messages.length}|${p.hp}/${p.maxHp}|${Object.entries(p.ailments).map(([k]) => k).join()}|${!!world.dead}|${this.wide}|${this.drawerOpen}`;
    if (stamp === this.stamp) return;
    this.stamp = stamp;
    this.el.side.hidden = !this.wide;
    this.el.drawer.style.right = `${this.insetRight}px`;
    const low = p.hp <= p.maxHp / 3;
    const ailing = Object.keys(p.ailments);

    // The corner: the place, the level (on a narrow screen, health), the
    // newest three messages, older ones dimmer.
    const news = world.messages.slice(-3);
    this.el.corner.innerHTML = `<div class="head"><span class="place">${esc(world.place.name)}</span>
        <span class="depth">${ORDINAL(world.place.depth)} level</span>
        ${this.wide ? "" : `<span class="hpline${low ? " low" : ""}">${Math.max(0, p.hp)}<span>/${p.maxHp}</span></span>`}</div>
      <div class="news">${news.map((m, i) => `<div class="age${news.length - 1 - i} ${m.kind}">${esc(m.text)}</div>`).join("")}</div>
      ${world.messages.length > 3 ? `<div class="pull">m for more</div>` : ""}`;

    // The sidebar: health, and what ails the player; the keys along its foot.
    if (this.wide)
      this.el.side.innerHTML = `<div class="block"><h5>Health</h5>
          <div class="hp${low ? " low" : ""}">${Math.max(0, p.hp)}<span>/${p.maxHp}</span></div>
          <div class="ailments">${ailing.length ? ailing.map((a) => `<span class="${a}">${a}</span>`).join("") : `<span class="none">nothing ails you</span>`}</div></div>
        <div class="foot"><span><b>r</b> rest</span><span><b>z</b> search</span><span><b>f</b> lamp</span><span><b>m</b> messages</span><span><b>?</b> help</span></div>`;

    // The drawer: every message, by the turn it came on.
    if (this.drawerOpen) {
      let last = -1, rows = "";
      for (const m of world.messages) {
        if (m.turn !== last) rows += `<li class="turn">Turn ${m.turn}</li>`;
        last = m.turn;
        rows += `<li class="${m.kind}">${esc(m.text)}</li>`;
      }
      this.el.drawer.innerHTML = `<h5>Messages, ${esc(world.place.name.toLowerCase())}</h5><ol>${rows}</ol><div class="hint">m or Esc to push it back up</div>`;
      const ol = this.el.drawer.querySelector("ol");
      ol.scrollTop = ol.scrollHeight;
    }

    // How the run ended.
    this.el.death.hidden = !world.dead;
    if (world.dead) {
      const d = world.dead;
      this.el.death.innerHTML = `<div class="card"><h2>You died</h2>
        <p>${esc(d.how[0].toUpperCase() + d.how.slice(1))} in ${esc(d.place.toLowerCase())}, on the ${ORDINAL(d.depth)} level, after ${d.turns} turns.</p>
        <p>${d.kills ? `You killed ${d.kills} ${d.kills === 1 ? "monster" : "monsters"}.` : "You killed nothing."}</p>
        <p class="hint">Press any key, or tap, to start again.</p></div>`;
    }
  }
}
