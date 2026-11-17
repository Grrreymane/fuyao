/* ================= level: the shape of each heaven =================
   A heaven is laid out in beats instead of being scattered evenly: a calm entry, a gauntlet, a reward, a breather,
   the heaven's own set piece, a second gauntlet, a second reward, and calm before the next gate of cloud.
   Rewards are trails of lights to string together, or a mountain gate (山门) that only enough birds can push open.
   u is the altitude within the heaven, 0 .. STAGE_LEN. */
const BEATS = [[0, 550, 'calm'], [550, 2250, 'danger'], [2250, 2560, 'reward'], [2560, 2950, 'calm'], [2950, 3800, 'set'], [3800, 4500, 'danger'], [4500, 4820, 'reward'], [4820, STAGE_LEN, 'calm']];
const HAZ_K = { calm: 0.2, danger: 1.35, reward: 0.15, set: 0 }; // how much of a heaven's scattered hazards each beat keeps
const REWARD_U = [2300, 4560], SET_U = 3000;
const uOf = a => a - Math.min(NST - 1, Math.floor(a / STAGE_LEN)) * STAGE_LEN;
function beatAt(a) { const u = uOf(a); for (const b of BEATS) if (u < b[1]) return b[2]; return 'calm'; }
const hazK = a => HAZ_K[beatAt(a)];
// gates ask for about what a flock that has been gathering well has by then
const GATE_NEED = [0, 14, 20, 28, 36, 44, 52, 60, 68];

/* ---------- trails of lights ---------- */
// kind: 'feather' gold feathers, 'lantern' red lanterns (松崖, 云海), 'star' (星河), 'rainbow' (九霄)
function mkTrail(kind, n, path) {
  const pts = [];
  for (let k = 0; k < n; k++) pts.push(path(k / (n - 1)));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return { t: 8, kind, pts, n, got: new Uint8Array(n), hit: 0, done: 0, minx: Math.min(...xs) - 40, maxx: Math.max(...xs) + 40, miny: Math.min(...ys) - 40, maxy: Math.max(...ys) + 40 };
}
// a point well inside the gorge at altitude a: x pulled in from the walls and pushed off a fork's peak
function lanePoint(a, x) {
  walls(a);
  x = clamp(x, W_L + 50, Math.max(W_L + 50, W_R - 50));
  if (W_IL < W_IR && x > W_IL - 50 && x < W_IR + 50) x = x < (W_IL + W_IR) / 2 ? W_IL - 50 : W_IR + 50;
  return [x, -a];
}
function genTrail(a, L, kind, r) {
  // a swooping S across the gorge, each trail with its own phase and width
  const ph = r() * TAU, sw = 0.22 + r() * 0.12, turns = 1 + r() * 0.8, n = 10 + ((r() * 5) | 0);
  return mkTrail(kind, n, t => { const aa = a + t * L; walls(aa); return lanePoint(aa, W_C + Math.sin(ph + t * Math.PI * turns) * (W_R - W_L) * sw); });
}

/* ---------- 山门: a gate across the gorge that opens to enough birds pushing together ---------- */
function mkShanmen(a, si, r) {
  walls(a);
  const gapSide = r() < 0.5 ? -1 : 1, gapW = 74, y = -a;
  const d0 = gapSide > 0 ? W_L - 12 : W_L + gapW + 10, d1 = gapSide > 0 ? W_R - gapW - 10 : W_R + 12;
  return { t: 9, y, d0, d1, gapSide, gx0: gapSide > 0 ? d1 : W_L, gx1: gapSide > 0 ? W_R : d0, need: GATE_NEED[si] || 14, press: 0, pushT: 0, open: 0, ot: 0, minx: W_L - 20, maxx: W_R + 20, miny: y - 90, maxy: y + 90 };
}

/* ---------- the content of a heaven's reward and set-piece segments ---------- */
// called by genSeg for a segment in a 'reward' or 'set' beat; returns true when it filled the segment
function levelSeg(j, a0, si, r, obs, grp) {
  const u0 = uOf(a0), u1 = u0 + SEG, beat = beatAt(a0 + SEG / 2);
  if (beat === 'reward') {
    for (let q = 0; q < REWARD_U.length; q++) {
      const ua = REWARD_U[q];
      if (ua < u0 || ua >= u1) continue;
      const a = a0 + (ua - u0), gateHere = si > 0 && (si + q) % 2 === 1;
      if (gateHere) {
        const g = mkShanmen(a + 120, si, r);
        obs.push(g);
        // what lies behind the gate: a flock waiting, and sometimes a phoenix feather
        const cx = (g.d0 + g.d1) / 2, cy = g.y - 150, n = 8 + ((r() * 5) | 0), m = [];
        for (let k = 0; k < n; k++) m.push(mkStray(cx + (r() - 0.5) * 70, cy + (r() - 0.5) * 50, 0, r));
        grp.push({ m, done: 0, joined: 0, cx, cy, ph: r() * TAU });
        if (r() < 0.5) obs.push({ t: 5, x: cx + (r() - 0.5) * 60, y: cy - 90, taken: 0, minx: 0, maxx: 0, miny: cy - 120, maxy: cy - 60 });
      } else obs.push(genTrail(a, 520, si === NST - 1 ? 'rainbow' : 'feather', r));
    }
    return true;
  }
  if (beat !== 'set') return false;
  if (SET_U < u0 || SET_U >= u1) return true; // the rest of the set-piece beat is left clear for it
  const a = a0 + (SET_U - u0);
  setPiece(si, a, r, obs, grp);
  return true;
}
function setPiece(si, a, r, obs, grp) {
  switch (si) {
    case 0: { // 北冥: the kun leaps across the gorge and scatters a flock out of its spray
      obs.push({ t: 11, kind: 'kun', y: -a - 260, st: 0, tt: 0, dir: r() < 0.5 ? 1 : -1, minx: -1e5, maxx: 1e5, miny: -a - 700, maxy: -a + 100 });
      break;
    }
    case 1: { // 松崖: a plank road of red lanterns along one cliff, lit one by one as the flock passes
      const side = r() < 0.5 ? -1 : 1;
      obs.push(mkTrail('lantern', 14, t => { const aa = a + 40 + t * 700; walls(aa); return lanePoint(aa, side < 0 ? W_L + 62 + Math.sin(t * 9) * 10 : W_R - 62 - Math.sin(t * 9) * 10); }));
      break;
    }
    case 2: { // 飞瀑: 水帘洞, a cave behind a waterfall in one cliff (the cliff itself recedes there: caveAt)
      const C = caveInfo(2);
      walls(C.a0 + C.L / 2);
      const wall = C.side < 0 ? W_L : W_R, mouth = C.side < 0 ? W_L + C.depth : W_R - C.depth;
      obs.push({ t: 12, side: C.side, a0: C.a0, L: C.L, y0: -(C.a0 + C.L * 0.86), y1: -(C.a0 + C.L * 0.14), minx: -1e5, maxx: 1e5, miny: -(C.a0 + C.L) - 40, maxy: -C.a0 + 40 });
      const n = 10, m = [], cx = (wall + mouth) / 2 + (C.side < 0 ? -C.depth * 0.25 : C.depth * 0.25), cy = -(C.a0 + C.L / 2);
      for (let k = 0; k < n; k++) m.push(mkStray(cx + (r() - 0.5) * 50, cy + (r() - 0.5) * 140, 0, r));
      grp.push({ m, done: 0, joined: 0, cx, cy, ph: r() * TAU });
      obs.push({ t: 5, x: cx, y: cy - 110, taken: 0, minx: 0, maxx: 0, miny: cy - 140, maxy: cy - 80 });
      break;
    }
    case 3: { // 云海: a bank of cloud so thick the gorge vanishes; lanterns of a hidden temple show the way
      const L = 760;
      obs.push({ t: 13, y0: -a - L, y1: -a, minx: -1e5, maxx: 1e5, miny: -a - L - 200, maxy: -a + 200 });
      const tr = genTrail(a + 60, L - 120, 'lantern', r);
      obs.push(tr);
      // rocks hidden in the cloud, kept off the lanterns' line
      for (let k = 0; k < 3; k++) {
        const aa = a + 160 + k * 200 + r() * 60;
        walls(aa);
        const near = tr.pts.reduce((b, p) => (Math.abs(p[1] + aa) < Math.abs(b[1] + aa) ? p : b), tr.pts[0]);
        const x = near[0] + (near[0] > W_C ? -1 : 1) * (95 + r() * 40), rad = 28 + r() * 14;
        if (x - rad > W_L + 40 && x + rad < W_R - 40) { const o = { t: 2, x, y: -aa, r: rad, cr: rad * 0.8, isl: false, seed: (r() * 1e9) | 0 }; o.minx = x - rad * 1.3 - 50; o.maxx = x + rad * 1.3 + 50; o.miny = -aa - rad - 50; o.maxy = -aa + rad * 1.9 + 50; obs.push(o); }
      }
      break;
    }
    case 4: // 雷泽: 雷阵, lightning falling on the beat, alternating sides, with a lane of calm between
      obs.push({ t: 14, y0: -a - 760, y1: -a, n: 0, next: 0, last: 0, minx: -1e5, maxx: 1e5, miny: -a - 800, maxy: -a + 40 });
      break;
    case 5: { // 落日: 万雁归巢, a great wedge of wild geese crossing at sunset; touch one and the whole wedge joins
      for (let w = 0; w < 2; w++) {
        const aa = a + 120 + w * 420; walls(aa);
        const dir = w % 2 ? -1 : 1, n = 21, m = [], x = dir > 0 ? W_L - 140 : W_R + 140, y = -aa;
        for (let k = 0; k < n; k++) { const row = (k + 1) >> 1, s = mkStray(x - dir * row * 18, y + row * 10 * (k & 1 ? 1 : -1), 0, r); s.R = 2; s.w = 1.2; m.push(s); }
        grp.push({ m, done: 0, joined: 0, cx: x, cy: y, ph: r() * TAU, v: dir, sp: 92, hit: 0 });
      }
      break;
    }
    case 6: { // 星河: 鹊桥, a bridge of magpies arching from cliff to cliff, stars strung along it
      walls(a + 250);
      const x0 = W_L + 40, x1 = W_R - 40;
      const tr = mkTrail('star', 15, t => { const aa = a + 120 + Math.sin(t * Math.PI) * 260; return lanePoint(aa, lerp(x0, x1, t)); });
      tr.bridge = 1;
      obs.push(tr);
      break;
    }
    case 7: { // 天风: 风道, a column of rising air to ride, with feathers strung up it
      walls(a + 400);
      const x = W_C + (r() - 0.5) * (W_R - W_L) * 0.3, w = 120;
      obs.push({ t: 15, x, w, y0: -a - 780, y1: -a, minx: x - w, maxx: x + w, miny: -a - 820, maxy: -a + 40 });
      obs.push(mkTrail('feather', 12, t => lanePoint(a + 80 + t * 640, x + Math.sin(t * 7) * 26)));
      break;
    }
    default: { // 九霄: 虹桥, a rainbow bridge sweeping up toward the gate of heaven, its lights strung along it
      walls(a + 300);
      const side = r() < 0.5 ? -1 : 1, xa = side < 0 ? W_L + 60 : W_R - 60, xb = side < 0 ? W_R - 60 : W_L + 60;
      const tr = mkTrail('rainbow', 16, t => lanePoint(a + 60 + t * 640, lerp(xa, xb, t) + Math.sin(t * Math.PI) * 40 * side));
      tr.bridge = 2;
      obs.push(tr);
    }
  }
}

/* ---------- 水帘洞: where the cliff recedes behind the curtain ---------- */
function caveInfo(si) {
  const a0 = si * STAGE_LEN + SET_U + 60, L = 560;
  return { a0, L, side: hash2(si, SEED + 977) < 0.5 ? -1 : 1, depth: 150 };
}
// how far the cliff on the cave's side is pushed back at altitude a (0 outside the cave)
function caveAt(a) {
  if (stageIdx(a) !== 2) return null;
  const C = caveInfo(2), f = (a - C.a0) / C.L;
  if (f <= 0 || f >= 1) return null;
  return [C.side, C.depth * Math.pow(Math.sin(Math.PI * f), 0.6)];
}

/* ---------- running the pieces ---------- */
let lvlFog = 0; // how deep in the cloud bank the flock is (0 .. 1)
function updLevel(dt) {
  if (state !== 'play' || !nB) { lvlFog = Math.max(0, lvlFog - dt); return; }
  const top = camY - viewH / 2 - 60, bot = camY + viewH / 2 + 60;
  let fog = 0;
  for (const o of actObs) {
    if (o.maxy < top - 400 || o.miny > bot + 400) continue;
    if (o.t === 8) updTrail(o, top, bot);
    else if (o.t === 9) updGate(o, dt);
    else if (o.t === 11) updKunLeap(o, dt);
    else if (o.t === 12) {
      if (flock.cy < o.y1 + 300 && flock.cy > o.y0 - 200) toast('cave', '水帘后似有洞天，穿帘而入');
      const C = caveInfo(2), cv = caveAt(-flock.cy);
      if (cv) { walls(-flock.cy); const mx = (C.side < 0 ? W_L : W_R) - cv[0] * cv[1]; if (Math.abs(flock.cx - mx) < flock.r + 20 && Math.random() < dt * 40) spawnP(P_SPLASH, mx + rand(-14, 14), flock.cy + rand(-30, 30), rand(-120, 120), rand(-200, -40), rand(0.4, 0.8), rand(1.5, 3)); }
    }
    else if (o.t === 13) {
      if (flock.cy < o.y1 + 260) toast('fog', '云深不知处，跟着灯火走');
      fog = Math.max(fog, sstep(o.y1 + 120, o.y1 - 140, flock.cy) * (1 - sstep(o.y0 + 160, o.y0 - 80, flock.cy)));
    } else if (o.t === 14) updThunderArray(o, dt);
    else if (o.t === 15) { if (flock.cy < o.y1 + 260 && flock.cy > o.y0) toast('lane', '风道上升，乘风直上'); }
  }
  lvlFog += (fog - lvlFog) * Math.min(1, dt * 2.5);
}
function updTrail(o, top, bot) {
  if (o.done) return;
  if (o.maxy > top && o.miny < bot) toast(o.kind === 'lantern' ? 'trailL' : 'trail', o.kind === 'lantern' ? '点亮沿途的灯，一盏不落有奖' : '收集羽光，连成一串有奖');
  let pending = 0;
  for (let k = 0; k < o.n; k++) {
    if (o.got[k]) continue;
    const [x, y] = o.pts[k];
    if (y > bot + 40) continue; // left behind
    pending++;
    if (y < top || y > bot) continue;
    if (nearestBird(x, y, 34) >= 0) {
      o.got[k] = 1; o.hit++; pending--;
      AU.mote(o.hit, o.n);
      spawnP(P_GRING, x, y, 0, 0, 0.45, 8).ph = 40; spawnP(P_DART, x, y, 0, 0, 0.3, 2.2);
      if (o.hit === o.n) trailDone(o, x, y);
    }
  }
  if (!pending && !o.done) {
    o.done = 1;
    if (o.hit > 0) floatText(o.hit + ' / ' + o.n, flock.cx, flock.cy - flock.r - 30); // a broken string: how close it came
  }
}
function trailDone(o, x, y) {
  o.done = 1;
  const word = { feather: '羽迹圆满', lantern: '灯火通明', star: '鹊桥星满', rainbow: '虹桥贯日' }[o.kind];
  floatText(word, flock.cx, flock.cy - flock.r - 50, 'big');
  AU.trailDone(); haptic(35); pickGold = Math.max(pickGold, 0.6);
  spawnP(P_GRING, flock.cx, flock.cy, 0, 0, 0.9, flock.r).ph = 260;
  // the reward: spirit birds come down out of the light to join, and a gust of wind for the ring
  const n = 6 + Math.round(o.n / 3);
  for (let k = 0; k < n && nB < MAXB; k++) addBird(x + rand(-40, 40), y + rand(-40, 40), rand(-60, 60), rand(-60, 60), 1.4, false);
  joinedNow += n; addWind(22); flockStats();
  floatText('+' + n, flock.cx + 40, flock.cy - flock.r, 'big');
}
function updGate(g, dt) {
  if (g.open) { g.ot = Math.min(1, g.ot + dt / 0.7); return; }
  if (flock.cy < g.y + 420 && flock.cy > g.y) toast('gate', '山门须众鸟合力，鸟不够就走旁边的窄缝');
  // birds pressing on the door from below count toward opening it
  let n = 0;
  for (let i = 0; i < nB; i++) if (bx[i] > g.d0 && bx[i] < g.d1 && by[i] > g.y && by[i] < g.y + 90) n++;
  g.press += (n - g.press) * Math.min(1, dt * 8);
  if (n >= g.need) { g.pushT += dt; if (g.pushT > 0.45) openGate(g); } else g.pushT = Math.max(0, g.pushT - dt * 2);
}
function openGate(g) {
  g.open = 1; g.ot = 0;
  AU.gate(); haptic(40); shakeA = Math.max(shakeA, RM ? 2 : 9); pickGold = Math.max(pickGold, 0.5);
  floatText('合力开山', (g.d0 + g.d1) / 2, g.y - 30, 'big');
  for (let k = 0; k < 30; k++) spawnP(P_INK, lerp(g.d0, g.d1, Math.random()), g.y + rand(-10, 10), rand(-60, 60), rand(-120, -20), rand(0.5, 1), rand(6, 12));
  addWind(10);
}
// the closed gates and wind lanes near the flock, gathered once a frame for the per-bird checks below
const nearGates = [], nearLanes = [];
function levelNear() {
  nearGates.length = nearLanes.length = 0;
  for (const o of actObs) {
    if (o.t === 9 && !o.open && Math.abs(o.y - flock.cy) < 500) nearGates.push(o);
    else if (o.t === 15 && flock.cy > o.y0 - 200 && flock.cy < o.y1 + 200) nearLanes.push(o);
  }
}
// a closed gate holds the flock back like a wall it cannot hurt itself on
function gateHold(i) {
  for (const o of nearGates) {
    if (bx[i] < o.d0 || bx[i] > o.d1) continue;
    if (by[i] < o.y + 16 && by[i] > o.y - 40) { by[i] = o.y + 16; if (bvy[i] < 0) bvy[i] = -bvy[i] * 0.25 + 30; }
  }
}
function updKunLeap(o, dt) {
  if (o.st === 0) { if (flock.cy < o.y + 340) { o.st = 1; o.tt = 0; o.by = flock.cy - 260; AU.rise(); shakeA = Math.max(shakeA, RM ? 2 : 6); } return; }
  if (o.st !== 1) return;
  o.tt += dt;
  // spray where it breaks the air, and a flock thrown out of it at the top of the leap
  if (o.tt < 2.2 && Math.random() < dt * 30) { const [x, y] = kunLeapPos(o, o.tt); spawnP(P_SPLASH, x + rand(-40, 40), y + rand(-20, 20), rand(-140, 140), rand(-260, -60), rand(0.6, 1.1), rand(2, 4)); }
  if (!o.gave && o.tt > 1.05) {
    o.gave = 1;
    const [x, y] = kunLeapPos(o, 1.1), m = [], r = makeRng(((o.y * 3.1) | 0) ^ 0x2f1);
    walls(-y);
    for (let k = 0; k < 12; k++) { const s = mkStray(clamp(x + (r() - 0.5) * 160, W_L + 50, W_R - 50), y + (r() - 0.5) * 60, 0, r); s.act = 1; s.vx = rand(-80, 80); s.vy = rand(-120, 40); m.push(s); }
    const gp = { m, done: 0, joined: 0, cx: x, cy: y, ph: 0 };
    actGrp.push(gp); (actSegs.find(q => q.obs.includes(o)) || actSegs[actSegs.length - 1]).grp.push(gp);
    floatText('鲲跃', x, y - 40, 'big');
  }
  if (o.tt > 2.6) o.st = 2;
}
function kunLeapPos(o, t) {
  // a leap across the gorge: from below one cliff, up over the flock's path, down past the other
  walls(-o.by);
  const f = clamp(t / 2.4, 0, 1), x = lerp(o.dir > 0 ? W_L - 200 : W_R + 200, o.dir > 0 ? W_R + 200 : W_L - 200, f), y = o.by + 260 - Math.sin(f * Math.PI) * 420;
  return [x, y, Math.atan2(-Math.cos(f * Math.PI) * 420 * Math.PI, (o.dir > 0 ? 1 : -1) * (W_R - W_L + 400))];
}
function updThunderArray(o, dt) {
  if (flock.cy > o.y1 + 200 || flock.cy < o.y0 || bolt.st !== 0) return;
  toast('thunderArr', '雷阵：雷踩着鼓点落下，看准空当');
  o.next -= dt;
  if (o.next > 0) return;
  // every second strike lands on the other side; the third of the gorge between them stays calm
  walls(-flock.cy);
  const third = (W_R - W_L) / 3, side = o.n % 2 ? 1 : -1, x = side < 0 ? W_L + third * (0.5 + Math.random() * 0.4) : W_R - third * (0.5 + Math.random() * 0.4);
  bolt.st = 1; bolt.t = 0.25; bolt.x = x; AU.crackle();
  o.n++; o.next = 1.25;
}

/* ---------- drawing ---------- */
function drawLevel() {
  const top = camY - viewH / 2 - 80, bot = camY + viewH / 2 + 80;
  for (const o of actObs) {
    if (o.maxy < top || o.miny > bot) continue;
    if (o.t === 8) drawTrail(o, top, bot);
    else if (o.t === 9) drawShanmen(o);
    else if (o.t === 11) drawKunLeap(o);
    else if (o.t === 15) drawWindLane(o, top, bot);
  }
}
function drawTrail(o, top, bot) {
  if (o.bridge === 1) drawMagpieArc(o);
  else if (o.bridge === 2) drawRainbowBridge(o);
  // a faint thread through the lights still to come, so the line reads at a glance
  let first = -1;
  ctx.strokeStyle = o.kind === 'lantern' ? 'rgba(200,70,50,0.35)' : 'rgba(226,173,68,0.4)'; ctx.lineWidth = 1.4; ctx.setLineDash([3, 7]); ctx.beginPath();
  let started = false;
  for (let k = 0; k < o.n; k++) {
    if (o.got[k] || o.done) continue;
    if (first < 0) first = k;
    const [x, y] = o.pts[k];
    if (started) ctx.lineTo(x, y); else { ctx.moveTo(x, y); started = true; }
  }
  if (!o.done) ctx.stroke();
  ctx.setLineDash([]);
  for (let k = 0; k < o.n; k++) {
    const [x, y] = o.pts[k];
    if (o.got[k]) { if (o.kind === 'lantern') drawLantern(x, y, 1.5, true); continue; }
    if (o.done || y < top || y > bot) continue;
    const next = k === first, s = (next ? 1.25 + 0.15 * Math.sin(T * 8) : 1) * (1 + 0.06 * Math.sin(T * 3 + k));
    const bob = Math.sin(T * 2.2 + k * 0.9) * 4;
    if (o.kind === 'lantern') drawLantern(x, y + bob, s * 1.5, false);
    else if (o.kind === 'star') drawStarMote(x, y + bob, s, k);
    else if (o.kind === 'rainbow') drawRainbowMote(x, y + bob, s, k);
    else drawFeatherMote(x, y + bob, s, k);
  }
  ctx.globalAlpha = 1;
}
function drawFeatherMote(x, y, s, k) {
  ctx.globalAlpha = 0.7; ctx.drawImage(glowGold, x - 22 * s, y - 22 * s, 44 * s, 44 * s); ctx.globalAlpha = 1;
  rotT(x, y, -0.6 + Math.sin(T * 2 + k) * 0.25);
  ctx.fillStyle = '#e6b44c'; ctx.beginPath(); ctx.ellipse(0, 0, 11 * s, 3.6 * s, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#8a5c16'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-14 * s, 0); ctx.lineTo(10 * s, 0); ctx.stroke();
  setWorld();
}
// the trails' own glows, one per colour and made once: a rainbow trail has more colours than tinted() keeps
const trailGlows = new Map();
function trailGlow(col) {
  const k = col.join();
  let c = trailGlows.get(k);
  if (!c) { c = makeGlow(col); trailGlows.set(k, c); }
  return c;
}
const LANTERN_C = [220, 90, 60];
function drawLantern(x, y, s, lit) {
  // a red paper lantern: dim until the flock reaches it, then lit and glowing warm
  ctx.globalAlpha = lit ? 0.85 : 0.45; ctx.drawImage(lit ? glowGold : trailGlow(LANTERN_C), x - 24 * s, y - 24 * s, 48 * s, 48 * s); ctx.globalAlpha = 1;
  ctx.fillStyle = lit ? '#e2503a' : '#9c3a2c'; ctx.beginPath(); ctx.ellipse(x, y, 8 * s, 10 * s, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(70,20,12,0.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, y - 10 * s); ctx.lineTo(x, y + 10 * s); ctx.moveTo(x - 5 * s, y - 8 * s); ctx.quadraticCurveTo(x - 7 * s, y, x - 5 * s, y + 8 * s); ctx.moveTo(x + 5 * s, y - 8 * s); ctx.quadraticCurveTo(x + 7 * s, y, x + 5 * s, y + 8 * s); ctx.stroke();
  ctx.fillStyle = '#c99a3a'; ctx.fillRect(x - 4 * s, y - 12 * s, 8 * s, 2.4 * s); ctx.fillRect(x - 4 * s, y + 9.6 * s, 8 * s, 2.4 * s);
  ctx.strokeStyle = '#c99a3a'; ctx.beginPath(); ctx.moveTo(x, y + 12 * s); ctx.lineTo(x, y + 18 * s); ctx.stroke();
  if (lit) { ctx.globalAlpha = 0.7; ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.ellipse(x, y, 3 * s, 5 * s, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
}
function drawStarMote(x, y, s, k) {
  const tw = 0.7 + 0.3 * Math.sin(T * 5 + k * 1.7);
  ctx.globalAlpha = 0.8 * tw; ctx.drawImage(glowGold, x - 20 * s, y - 20 * s, 40 * s, 40 * s); ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff4cf'; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4 + T * 0.5, rr = (i % 2 ? 2.6 : 9) * s * tw; i ? ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr) : ctx.moveTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr); }
  ctx.closePath(); ctx.fill();
}
const BOW_C = [[226, 92, 80], [236, 160, 80], [238, 222, 110], [120, 196, 130], [100, 150, 225], [150, 120, 210]];
function drawRainbowMote(x, y, s, k) {
  const c = BOW_C[k % 6];
  ctx.globalAlpha = 0.75; ctx.drawImage(trailGlow(c), x - 22 * s, y - 22 * s, 44 * s, 44 * s); ctx.globalAlpha = 1;
  ctx.fillStyle = rgba(c); ctx.beginPath(); ctx.arc(x, y, 6 * s, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(x - 1.6 * s, y - 1.6 * s, 2.2 * s, 0, TAU); ctx.fill();
}
function drawMagpieArc(o) {
  // magpies wing to wing along the arc, a little below the stars
  ctx.strokeStyle = rgba(PN.bird, 0.9); ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
  for (let k = 0; k < 46; k++) {
    const f = k / 45, i = Math.min(o.n - 2, Math.floor(f * (o.n - 1))), g = f * (o.n - 1) - i, A = o.pts[i], B = o.pts[i + 1];
    const x = lerp(A[0], B[0], g), y = lerp(A[1], B[1], g) + 26, fl = Math.sin(T * 9 + k * 1.3) * 3;
    ctx.moveTo(x - 6, y - fl); ctx.quadraticCurveTo(x - 3, y - 4, x, y); ctx.quadraticCurveTo(x + 3, y - 4, x + 6, y - fl);
  }
  ctx.stroke();
}
function drawRainbowBridge(o) {
  ctx.lineCap = 'round';
  for (let c = 0; c < 6; c++) {
    ctx.strokeStyle = rgba(BOW_C[c], 0.22); ctx.lineWidth = 7; ctx.beginPath();
    o.pts.forEach((p, k) => { const x = p[0], y = p[1] + 18 + c * 6; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
  }
}
function drawShanmen(g) {
  // 山门: stone posts at either end, a pair of vermilion doors with gold studs, and over them a plaque with the count it needs
  const y = g.y, open = sstep(0, 1, g.ot), mid = (g.d0 + g.d1) / 2, half = (g.d1 - g.d0) / 2, ink = rgba(PN.ink);
  for (const px of [g.d0, g.d1]) {
    ctx.fillStyle = rgba(mixC(PN.rockB, PN.rockA, 0.4)); ctx.fillRect(px - 9, y - 56, 18, 82);
    ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.strokeRect(px - 9, y - 56, 18, 82);
    ctx.fillStyle = rgba(PN.ink, 0.8); ctx.fillRect(px - 13, y - 62, 26, 8);
  }
  // each door turns on its post away from the flock: seen from below it narrows toward the hinge, its far edge lifting
  for (const sd of [-1, 1]) {
    const hinge = sd < 0 ? g.d0 + 9 : g.d1 - 9, w = half - 9, dw = w * (1 - 0.9 * open), lift = 10 * open, far = hinge + (sd < 0 ? dw : -dw);
    ctx.beginPath(); ctx.moveTo(hinge, y - 46); ctx.lineTo(far, y - 46 + lift); ctx.lineTo(far, y + 16 - lift); ctx.lineTo(hinge, y + 16); ctx.closePath();
    ctx.fillStyle = open > 0 ? rgba(mixC([142, 46, 34], [60, 18, 12], open * 0.6)) : '#8e2e22'; ctx.fill();
    ctx.strokeStyle = '#4d140e'; ctx.lineWidth = 1.6; ctx.stroke();
    if (open < 0.3) {
      ctx.fillStyle = '#d9a64a';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { ctx.beginPath(); ctx.arc(lerp(hinge, far, (c + 0.5) / 5), y - 38 + r * 15, 1.8, 0, TAU); ctx.fill(); }
    }
  }
  // the lintel with a tiled roof over it, so it reads as a gate of the mountain
  ctx.fillStyle = rgba(PN.ink, 0.85); ctx.fillRect(g.d0 - 14, y - 70, g.d1 - g.d0 + 28, 10);
  const rw = g.d1 - g.d0 + 70, rg = ctx.createLinearGradient(0, y - 100, 0, y - 70);
  rg.addColorStop(0, rgba(mixC(PN.ink, PN.rockA, 0.5))); rg.addColorStop(1, rgba(PN.ink));
  ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(mid - rw / 2, y - 66); ctx.quadraticCurveTo(mid - rw * 0.4, y - 74, mid - rw * 0.36, y - 92); ctx.lineTo(mid + rw * 0.36, y - 92); ctx.quadraticCurveTo(mid + rw * 0.4, y - 74, mid + rw / 2, y - 66); ctx.quadraticCurveTo(mid, y - 62, mid - rw / 2, y - 66); ctx.fill();
  if (g.ot >= 1) return;
  // the plaque: the count needed, and while the flock presses, how many are pushing
  const pushing = Math.round(Math.min(g.press, g.need)), enough = g.press >= g.need, txt = g.press > 0.5 && !g.open ? pushing + ' / ' + g.need : '需' + g.need + '羽';
  ctx.globalAlpha = 1 - open;
  ctx.fillStyle = enough || g.open ? '#d9a64a' : '#b3312a'; ctx.fillRect(mid - 46, y - 58, 92, 30);
  ctx.strokeStyle = '#f2e6cf'; ctx.lineWidth = 1.6; ctx.strokeRect(mid - 42, y - 54, 84, 22);
  ctx.fillStyle = '#f7ecd6'; ctx.font = '19px FYK, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, mid, y - 42);
  if (g.press > 0.5 && !g.open) { ctx.fillStyle = 'rgba(226,173,68,0.9)'; ctx.fillRect(mid - 46, y - 26, 92 * Math.min(1, g.press / g.need), 4); }
  ctx.globalAlpha = 1;
}
function drawKunLeap(o) {
  if (o.st !== 1) return;
  const [x, y, ang] = kunLeapPos(o, o.tt), a = Math.min(1, o.tt * 3) * Math.min(1, (2.6 - o.tt) * 3);
  const c = Math.cos(ang) * o.dir, s = Math.sin(ang), pts = kunOutline(), sc = 0.55;
  ctx.save(); ctx.globalAlpha = 0.9 * a;
  ctx.fillStyle = rgba(PN.ink, 0.85); ctx.strokeStyle = rgba(PN.mist, 0.6); ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach((p, i) => { const lx = p[0] * sc * o.dir, ly = p[1] * sc, X = x + lx * c - ly * s * o.dir, Y = y + lx * s * o.dir + ly * c; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawWindLane(o, top, bot) {
  // a column of rising air: a pale band with streaks racing up it
  const y0 = Math.max(o.y0, top), y1 = Math.min(o.y1, bot), dark = lum(PN.skyT) < 0.42, col = dark ? PN.mist : [255, 250, 240];
  const gr = ctx.createLinearGradient(o.x - o.w, 0, o.x + o.w, 0);
  gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.5, rgba(col, 0.28)); gr.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = gr; ctx.fillRect(o.x - o.w, y0, o.w * 2, y1 - y0);
  ctx.strokeStyle = rgba(col, 0.75); ctx.lineCap = 'round';
  for (let k = 0; k < 22; k++) {
    const x = o.x + Math.sin(k * 2.3) * o.w * 0.7, sp = 420 + (k % 4) * 90, y = o.y1 - ((T * sp + k * 97) % (o.y1 - o.y0)), len = 40 + (k % 3) * 22;
    if (y < y0 || y > y1) continue;
    ctx.globalAlpha = 0.5; ctx.lineWidth = 1 + (k % 2); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
// in the wind lane, rising air lifts every bird inside it (called per bird from updFlock)
function laneLift(i) {
  for (const o of nearLanes) if ( by[i] > o.y0 && by[i] < o.y1 && Math.abs(bx[i] - o.x) < o.w * 0.7) { bboost[i] = Math.max(bboost[i], 0.4); return -900; }
  return 0;
}
// the cloud bank of 云海, over everything but the lanterns and the flock
function drawFogBank() {
  if (lvlFog <= 0.01) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = lvlFog * 0.88; ctx.fillStyle = rgba(PN.mist); ctx.fillRect(0, 0, W, H);
  for (let k = 0; k < 7; k++) { const s = Math.max(W, H) * (0.5 + (k % 3) * 0.2), x = ((k * 0.37 + T * 0.02 * (k % 2 ? 1 : -1)) % 1) * W, y = ((k * 0.61) % 1) * H; ctx.globalAlpha = lvlFog * 0.5; ctx.drawImage(glowW, x - s / 2, y - s / 2, s, s); }
  ctx.globalAlpha = 1;
  setWorld();
}
// 水帘洞: the dark of the cave behind the curtain, and the curtain over its mouth, which the flock can fly through
function drawCave() {
  for (const o of actObs) {
    if (o.t !== 12 || o.maxy < camY - viewH / 2 - 100 || o.miny > camY + viewH / 2 + 100) continue;
    const C = caveInfo(2), pts = [];
    for (let k = 0; k <= 20; k++) { const a = C.a0 + C.L * k / 20; walls(a); pts.push([C.side < 0 ? W_L : W_R, -a]); }
    // the mouth line: where the cliff would be without the cave, i.e. the depth pushed back
    const mouth = pts.map(([x, y]) => { const cv = caveAt(-y); return [x - (cv ? cv[0] * cv[1] : 0), y]; });
    ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); for (let k = mouth.length - 1; k >= 0; k--) ctx.lineTo(mouth[k][0], mouth[k][1]); ctx.closePath();
    ctx.fillStyle = rgba(darker(PN.rockA, 0.55), 0.85); ctx.fill();
    // the curtain over the mouth: the same falling water as the gorge's falls, thin enough to show the dark behind it
    const mx = mouth[10][0], cur = { x0: mx - (C.side < 0 ? 12 : 38), x1: mx + (C.side < 0 ? 38 : 12), y0: -(C.a0 + C.L * 0.88), y1: -(C.a0 + C.L * 0.12) + 160, side: C.side };
    drawCurtain(cur, camY - viewH / 2 - 30, camY + viewH / 2 + 60, 0.75);
  }
}
