/* ================= play: wing beat, wind, and riding the whirlwind (扶摇) in mid-flight ================= */
const WING_CD = 3.6, WING_T = 0.55, VORTEX_T = 6, VORTEX_MIN = 30;
// every gain of wind is scaled by this: a good flight fills the ring about three times (it was about seven at 1)
const WIND_GAIN = 0.45;
const wing = { cd: 0, t: 0, dx: 0, dy: -1 };
// the Peng itself is kept for the arrival at ninety thousand li; mid-flight the flock rides a ram's-horn whirlwind
const vortex = { on: false, t: 0, S: 160, x: 0, y: 0, vx: 0, fit: 1, a: 0 };
let wind = 0, windFull = false, joinChain = 0, lastJoinT = -9;
const shielded = () => goldT > 0 || vortex.on;

function resetPlay() {
  wing.cd = 0; wing.t = 0; wind = 0; windFull = false; joinChain = 0; lastJoinT = -9;
  vortex.on = false; vortex.t = 0; vortex.a = 0;
  resetFables();
}
function steerPoint() { return [cam.x + (tgt.sx - cssW / 2) / scale, camY + (tgt.sy - cssH / 2) / scale]; }
function tryWing() {
  if (state !== 'play' || paused || !nB || wing.cd > 0 || vortex.on) return false;
  // toward the steering point, biased upward so that tapping on the flock itself means "climb"
  const [sx, sy] = steerPoint(), ex = sx - flock.cx, ey = sy - 140 - flock.cy, d = Math.hypot(ex, ey) || 1;
  wing.dx = ex / d; wing.dy = ey / d; wing.t = WING_T; wing.cd = WING_CD;
  for (let i = 0; i < nB; i++) { bvx[i] += wing.dx * 240; bvy[i] += wing.dy * 240; }
  spawnP(P_RING, flock.cx, flock.cy, 0, 0, 0.6, flock.r * 0.6);
  for (let k = 0; k < 10; k++) spawnP(P_STREAK, flock.cx + rand(-flock.r, flock.r), flock.cy + rand(-flock.r, flock.r), -wing.dx * rand(300, 600), -wing.dy * rand(300, 600), 0.5, rand(0.8, 1.6));
  AU.wing(); haptic(16);
  return true;
}
/*DEBUG*/const vortexLog = [];/*/DEBUG*/
function addWind(v) {
  if (state !== 'play' || vortex.on || v <= 0) return;
  wind = Math.min(100, wind + v * WIND_GAIN);
  if (wind >= 100 && !windFull) { windFull = true; AU.windFull(); toast('windfull', COARSE ? '风满　点右下的印　抟扶摇而上' : '风满　按 E 或点印　抟扶摇而上'); }
}
function dodgeBonus(v) {
  // a clean escape from a hawk, bolt, dragon or meteor: no birds lost while it passed close by
  if (state !== 'play' || shielded()) return;
  addWind(v); AU.dodge();
  floatText('妙', flock.cx, flock.cy - flock.r - 26);
}
const canVortex = () => windFull && nB >= VORTEX_MIN && state === 'play' && !vortex.on && !paused;
function tryVortex() {
  if (!canVortex()) return false;
  vortex.on = true; vortex.t = 0; vortex.vx = 0; vortex.fit = 1; wind = 0; windFull = false;
  /*DEBUG*/vortexLog.push([Math.round(cam.alt), Math.round(playT)]);/*/DEBUG*/
  vortex.S = clamp(60 + 12 * Math.sqrt(nB), 150, 260); vortex.x = flock.cx; vortex.y = flock.cy;
  for (const h of hawks) if (h.st < 5) { h.st = 5; h.t = 0; }
  shakeA = RM ? 2 : 8; AU.vortex(VORTEX_T); haptic(40);
  floatText('扶摇', flock.cx, flock.cy - flock.r - 40);
  return true;
}
function endVortex() {
  vortex.on = false;
  for (let i = 0; i < nB; i++) {
    walls(-by[i]);
    if (W_IL < W_IR && bx[i] > W_IL && bx[i] < W_IR) bx[i] = bx[i] < (W_IL + W_IR) / 2 ? W_IL - 6 : W_IR + 6;
    // flung off the funnel along their circling, then the flock gathers again
    const dx = bx[i] - flock.cx, dy = by[i] - flock.cy, d = Math.hypot(dx, dy) || 1;
    bvx[i] = dx / d * 200 + bvx[i] * 0.35; bvy[i] = dy / d * 200 - 120 + bvy[i] * 0.2; bglow[i] = 0.8;
  }
  for (let k = 0; k < 18; k++) {
    const [ax, ay, r] = vortexAxis(k / 17), th = k * 2.4;
    spawnP(P_STREAK, ax + Math.cos(th) * r, ay + Math.sin(th) * r * VX_E, -Math.sin(th) * 520, Math.cos(th) * 160 - 60, 0.7, 1.6);
  }
  for (let k = 0; k < 6; k++) spawnP(P_MIST, vortex.x + rand(-vortex.S, vortex.S) * 0.6, vortex.y + rand(-vortex.S, vortex.S) * 0.8, rand(-40, 40), rand(-60, -10), rand(1, 1.6), rand(40, 70));
  spawnP(P_RING, flock.cx, flock.cy, 0, 0, 0.8, flock.r);
  AU.burst();
}
function updPlay(dt) {
  if (wing.cd > 0) wing.cd = Math.max(0, wing.cd - dt);
  if (wing.t > 0) wing.t = Math.max(0, wing.t - dt);
  if (vortex.on) {
    vortex.t += dt; vortex.a = Math.min(1, vortex.a + dt * 2); AU.tense(1);
    let [tx, ty] = steerPoint();
    walls(-ty);
    const half = Math.min(vortex.S * 0.75, (W_R - W_L) / 2 - 10);
    tx = clamp(tx, W_L + half, Math.max(W_L + half, W_R - half));
    const dx = tx - vortex.x, dy = ty - vortex.y, d = Math.hypot(dx, dy), mv = Math.min(d, 420 * dt), x0 = vortex.x;
    if (d > 0.5) { vortex.x += dx / d * mv; vortex.y += dy / d * mv; }
    vortex.vx += ((vortex.x - x0) / dt - vortex.vx) * Math.min(1, dt * 4);
    // a narrow pass squeezes the funnel instead of pinning its birds against the rock
    walls(-vortex.y);
    vortex.fit += (clamp(((W_R - W_L) / 2 - 14) / (vortex.S * 0.69), 0.35, 1) - vortex.fit) * Math.min(1, dt * 5);
    if (Math.random() < dt * 16) {
      const [ax, ay, r] = vortexAxis(0.75 + Math.random() * 0.25), th = Math.random() * TAU;
      spawnP(P_STREAK, ax + Math.cos(th) * r, ay + Math.sin(th) * r * VX_E, -Math.sin(th) * 420, Math.cos(th) * 120 - 140, 0.6, rand(1, 2));
    }
    smashNear();
    if (vortex.t >= VORTEX_T || state !== 'play') endVortex();
  } else if (vortex.a > 0) vortex.a = Math.max(0, vortex.a - dt * 1.6);
  updFables(dt);
  if (state === 'play' && forkAt(cam.alt + viewH * 0.4)) toast('fork', '孤峰分路　窄道险而散鸟多　宽道稳');
  if (state === 'play' && playT > 12) toast('wing', COARSE ? '双击屏幕　振翅疾飞' : '点击或按空格　振翅疾飞');
}
// the whirlwind: a ram's-horn funnel, a narrow tip at the foot and a wide crown, swaying as it climbs and leaning into its drift.
// u = 0 at the foot .. 1 at the crown; returns the axis point and the ring radius there
const VX_E = 0.27; // the rings seen from a little above
function vortexAxis(u) {
  const S = vortex.S, lean = clamp(vortex.vx * 0.12, -S * 0.3, S * 0.3);
  return [vortex.x + Math.sin(T * 1.7 - u * 3.2) * S * 0.1 * (0.3 + u) + lean * u, vortex.y + S * (0.85 - 1.75 * u), S * (0.07 + 0.62 * Math.pow(u, 1.35)) * vortex.fit];
}
function updVortexFlock(dt) {
  // every bird circles the funnel at its own height, faster near the foot; nothing in the gorge can take one
  buildGrid();
  const k = Math.min(24, 6 + vortex.t * 30), cd = Math.min(8.5, 3 + vortex.t * 10), grow = Math.min(1, 0.25 + vortex.t * 1.5);
  for (let i = 0; i < nB; i++) {
    // height and starting angle from a 2-D low-discrepancy sequence, so the birds fill the funnel's surface evenly
    const u = (0.5 + i * 0.7548777) % 1 * grow, th = (0.5 + i * 0.5698403) % 1 * TAU + vortex.t * (6.2 - 3 * u), [ax, ay, r0] = vortexAxis(u);
    const r = r0 * (0.8 + 0.4 * ((i * 0.3183099) % 1)), gx = ax + Math.cos(th) * r, gy = ay + Math.sin(th) * r * VX_E;
    let vx = bvx[i] + ((gx - bx[i]) * k - bvx[i] * cd) * dt, vy = bvy[i] + ((gy - by[i]) * k - bvy[i] * cd) * dt;
    const sp = Math.hypot(vx, vy);
    if (sp > 1100) { vx *= 1100 / sp; vy *= 1100 / sp; }
    let nx = bx[i] + vx * dt;
    const ny = by[i] + vy * dt;
    walls(-ny);
    if (nx < W_L + 4 || nx > W_R - 4) { nx = clamp(nx, W_L + 4, Math.max(W_L + 4, W_R - 4)); vx *= -0.3; }
    bx[i] = nx; by[i] = ny; bvx[i] = vx; bvy[i] = vy; bph[i] += dt * 6;
  }
  flockStats();
}
function capsuleDist(px, py, o) {
  const ex = o.x1 - o.x0, ey = o.y1 - o.y0;
  let t = ((px - o.x0) * ex + (py - o.y0) * ey) / o.l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (o.x0 + ex * t), py - (o.y0 + ey * t));
}
function smashNear() {
  const R = vortex.S * 0.85;
  for (const o of actObs) {
    if (o.broken) continue;
    if (o.t === 2) { if (Math.hypot(o.x - vortex.x, o.y - vortex.y) - o.r < R) breakObs(o); }
    else if ((o.t === 1 || o.t === 6) && capsuleDist(vortex.x, vortex.y, o) - o.r < R) breakObs(o);
  }
}
function breakObs(o) {
  const set = o.t === 6 ? actObs.filter(p => p.t === 6 && p.br === o.br) : [o];
  let y0 = 1e9, y1 = -1e9;
  for (const p of set) {
    p.broken = 1; y0 = Math.min(y0, p.miny); y1 = Math.max(y1, p.maxy);
    const cx = p.t === 2 ? p.x : (p.x0 + p.x1) / 2, cy = p.t === 2 ? p.y : (p.y0 + p.y1) / 2, w = p.t === 2 ? p.r : Math.abs(p.x1 - p.x0) / 2;
    for (let k = 0; k < 14; k++) spawnP(P_INK, cx + rand(-w, w), cy + rand(-16, 16), rand(-140, 140), rand(-180, 60), rand(0.6, 1.2), rand(5, 11));
    for (let k = 0; k < 8; k++) spawnP(P_SPLASH, cx + rand(-w, w), cy + rand(-10, 10), rand(-200, 200), rand(-320, -80), rand(0.6, 1), rand(1.5, 3)).ph = 0;
  }
  if (o.br) o.br.broken = 1;
  for (const gp of actGrp) {
    if (gp.done) continue;
    for (const s of gp.m) if (!s.gone && s.perch && s.y > y0 - 40 && s.y < y1 + 40) wakeStray(s);
  }
  const k0 = Math.floor((-y1 - 200) / CH), k1 = Math.floor((-y0 + 200) / CH);
  for (let k = k0; k <= k1; k++) { const ch = chunks.get(k); if (ch) { ch.c.width = ch.c.height = 0; chunks.delete(k); } }
  shakeA = Math.max(shakeA, RM ? 1 : 6); AU.smash();
}
function vortexInk() {
  // ink on a light sky, mist on a dark one (星河), so the funnel always reads
  const dark = lum(PN.skyT) < 0.42;
  return dark ? [PN.mist, PN.ink] : [PN.ink, PN.mist];
}
function drawVortex() {
  // the far side: a faint wash for the funnel's body, then the brush strokes and cloud flecks that pass behind the birds
  if (vortex.a <= 0.01) return;
  const a = vortex.a, [ink, hi] = vortexInk(), mist = tinted(glowSpr, hi), haze = tinted(glowSpr, ink);
  // no outline: the funnel's body is spray and haze, darker along the axis, dissolving at the rim
  for (let j = 0; j <= 7; j++) {
    const u = j / 7, [ax, ay, r] = vortexAxis(u), w = r * 2.6 + 30, h = r * 1.3 + 40, wob = Math.sin(T * 3 + j * 1.7) * r * 0.12;
    ctx.globalAlpha = a * 0.3; ctx.drawImage(mist, ax - w / 2 + wob, ay - h / 2, w, h);
    ctx.globalAlpha = a * 0.13; ctx.drawImage(haze, ax - w * 0.22 - wob, ay - h * 0.3, w * 0.44, h * 0.6);
  }
  ctx.globalAlpha = 1;
  vortexStrokes(false, ink, hi);
}
function drawVortexFront() { if (vortex.a > 0.01) { const [ink, hi] = vortexInk(); vortexStrokes(true, ink, hi); } }
function vortexStrokes(front, ink, hi) {
  // helical dry-brush strokes, thin at the foot and broad at the crown; the half facing us is drawn over the birds
  const a = vortex.a, grow = vortex.on ? Math.min(1, 0.25 + vortex.t * 1.5) : 1;
  ctx.lineCap = 'round';
  for (let k = 0; k < 11; k++) {
    const ph = k * TAU / 11 * 3 + T * (2.2 + (k * 0.381966) % 1 * 1.4), u0 = (k * 0.137) % 0.4, u1 = Math.min(1, u0 + 0.4 + (k % 4) * 0.16), col = k % 3 === 2 ? hi : ink;
    let px = 0, py = 0;
    for (let j = 0; j <= 30; j++) {
      const f = j / 30, u = (u0 + (u1 - u0) * f) * grow, th = ph + u * 5.6, [ax, ay, r] = vortexAxis(u), sn = Math.sin(th);
      const x = ax + Math.cos(th) * r, y = ay + sn * r * VX_E;
      if (j && (sn >= 0) === front) {
        const taper = Math.sin(Math.PI * f);
        ctx.globalAlpha = a * taper * (front ? 0.62 : 0.34); ctx.strokeStyle = rgba(col);
        ctx.lineWidth = (0.8 + 5.5 * u) * taper + 0.5;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
        // dry brush: the hairs at the stroke's edge leave thin broken lines beside it (飞白)
        if (k % 2) { ctx.globalAlpha *= 0.55; ctx.lineWidth = 0.7; for (const o of [0.07, -0.06]) { if ((j + k) % 4 === 0) continue; ctx.beginPath(); ctx.moveTo(px, py + r * o); ctx.lineTo(x, y + r * o); ctx.stroke(); } }
      }
      px = x; py = y;
    }
  }
  // cloud flecks torn along by the wind, rising slowly as they circle
  ctx.strokeStyle = rgba(hi); ctx.lineWidth = 2.2;
  for (let q = 0; q < 24; q++) {
    const u = ((q * 0.371 + T * 0.07) % 1) * grow, th = q * 1.93 + T * (5.4 - 2.6 * u), sn = Math.sin(th);
    if ((sn >= 0) !== front) continue;
    const [ax, ay, r] = vortexAxis(u);
    ctx.globalAlpha = a * (front ? 0.7 : 0.4) * Math.min(1, u * 6);
    ctx.beginPath(); ctx.ellipse(ax, ay, r * 1.1, r * 1.1 * VX_E, 0, th, th + 0.3 + 0.2 * u); ctx.stroke();
  }
  // the foot: a tight knot of wind
  if (!front) {
    const [fx, fy] = vortexAxis(0);
    ctx.strokeStyle = rgba(ink); ctx.lineWidth = 1.4;
    for (let q = 0; q < 3; q++) { const rr = vortex.S * (0.05 + q * 0.04), st = T * (9 - q * 2) + q * 2; ctx.globalAlpha = a * 0.45; ctx.beginPath(); ctx.ellipse(fx, fy + q * 4, rr, rr * 0.35, 0, st, st + 4.2); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
}

/* ----- HUD: the wind ring around the seal, cooldown, and the 扶 seal ----- */
const sealW = $('sealW'), bFy = $('bFy');
let hudWind = -1, hudCd = null, hudFull = null, hudPk = null;
function updPlayHud() {
  const w = Math.round(wind) / 100, cd = wing.cd > 0 || vortex.on, pk = canVortex();
  if (w !== hudWind) { hudWind = w; sealW.style.setProperty('--w', w.toFixed(2)); }
  if (cd !== hudCd) { hudCd = cd; sealW.classList.toggle('cd', cd); }
  if (windFull !== hudFull) { hudFull = windFull; sealW.classList.toggle('full', windFull); }
  if (pk !== hudPk) { hudPk = pk; bFy.classList.toggle('on', pk); bFy.tabIndex = pk ? 0 : -1; }
}
bFy.addEventListener('click', e => { e.stopPropagation(); tryVortex(); });

/* ----- titles, and flying on from the heaven where the flock fell ----- */
const run = { cont: false, daily: false };
const TITLES_WIN = [[40, '鹪鹩', '巢于深林　不过一枝'], [120, '学鸠', '奚以之九万里而南为'], [300, '大鹏', '怒而飞　其翼若垂天之云'], [1e9, '逍遥', '乘天地之正　御六气之辩　以游无穷']];
const TITLES_FALL = [[3, '蜩', '我决起而飞　抢榆枋而止'], [6, '学鸠', '时则不至　而控于地而已矣'], [9, '鹪鹩', '巢于深林　不过一枝']];
const winTitle = n => TITLES_WIN.find(t => n < t[0]);
const fallTitle = si => TITLES_FALL.find(t => si < t[0]);
function setQuote(el, q) {
  el.textContent = '';
  for (const ph of q.split('　')) { const sp = document.createElement('span'); sp.textContent = ph; el.appendChild(sp); }
}
function continueRun() {
  // same map, from the start of the heaven where the flock fell, with a small flock; not counted for records
  const si = clamp(curStage, 1, NST - 1), daily = run.daily;
  for (const id of ['over', 'win', 'pause']) $(id).classList.remove('on');
  paused = false;
  newGame(SEED);
  run.cont = true; run.daily = daily;
  const a = si * STAGE_LEN + 260, ya = a - viewH * 0.3;
  cam.alt = a; camY = -a; segHi = Math.floor((a - viewH) / SEG); actSegs = []; manageSegs(); nextCloudA = a - viewH;
  walls(ya);
  for (let k = 0; k < 24; k++) addBird(W_C + rand(-50, 50), -ya + rand(-30, 30), rand(-40, 40), -320, 0.8, false);
  flockStats();
  kun.st = 2; kun.a = 0;
  state = 'play'; playT = 0; stateT = 0; curStage = si - 1;
  hudEl.classList.remove('off');
}
$('cont').addEventListener('click', () => { AU.init(); continueRun(); });

/* ----- 今日之风: everyone flies the same map today ----- */
const CNm = n => n < 10 ? CNd[n] : n === 10 ? '十' : n < 20 ? '十' + CNd[n - 10] : CNd[(n / 10) | 0] + '十' + (n % 10 ? CNd[n % 10] : '');
function dayKey() { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
const dailySeed = () => seedOf(dayKey(), 90217);
function loadDaily() {
  const k = dayKey();
  try { const v = JSON.parse(localStorage.getItem('fy-daily') || 'null'); if (v && v.k === k) return v; } catch (e) { /* storage unavailable */ }
  return { k, li: 0, b: 0 };
}
function saveDaily(li, b) {
  const v = loadDaily();
  try { localStorage.setItem('fy-daily', JSON.stringify({ k: v.k, li: Math.max(v.li, li), b: Math.max(v.b, b) })); } catch (e) { /* storage unavailable */ }
  return v;
}
function showDaily() { const v = loadDaily(); $('dailyT').textContent = v.li > 0 ? '今日之风　最远 ' + liText(v.li) : ''; }
function startDaily() {
  if (state !== 'title') return;
  newGame(dailySeed()); run.daily = true;
  const d = new Date();
  toast('daily', '今日之风　' + CNm(d.getMonth() + 1) + '月' + CNm(d.getDate()) + '日　人人同一张图');
  startGame();
}
$('bDaily').addEventListener('click', e => { e.stopPropagation(); startDaily(); });

/* ----- the result card: a vertical ink painting of the run, to keep or send on ----- */
let lastRun = null;
function vtext(g, str, x, y, size, step) { for (let i = 0; i < str.length; i++) g.fillText(str[i], x, y + i * size * step); }
function fitText(g, str, x, y, size, family, maxW) {
  let s = size;
  g.font = s + 'px ' + family;
  while (s > 24 && g.measureText(str).width > maxW) { s -= 4; g.font = s + 'px ' + family; }
  g.fillText(str, x, y);
}
function makeSeal(text, ss, r) {
  const c = mkCanvas(ss, ss), g = c.getContext('2d');
  g.fillStyle = '#b3312a'; g.fillRect(0, 0, ss, ss);
  g.fillStyle = '#f1e9d8'; g.font = Math.round(ss * 0.42) + 'px FYT, serif'; g.textAlign = 'center'; g.textBaseline = 'top';
  vtext(g, text, ss / 2, ss * 0.07, ss * 0.42, 1.02);
  g.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 90; k++) {
    const edge = r() * 4 | 0, t = r() * ss, d = r() * 7, x = edge === 0 ? t : edge === 1 ? ss - d : edge === 2 ? t : d, y = edge === 0 ? d : edge === 1 ? t : edge === 2 ? ss - d : t;
    g.globalAlpha = 0.3 + r() * 0.6; g.beginPath(); g.arc(x, y, 1 + r() * 3, 0, TAU); g.fill();
  }
  return c;
}
function makeShareCard(R) {
  const CW = 1080, CHh = 1620, c = mkCanvas(CW, CHh), g = c.getContext('2d'), P = PAL[R.si], r = makeRng((SEED ^ 0x2545f491) >>> 0);
  const paper = [240, 233, 216], ink = '#1d1a16', zhu = '#b3312a';
  const bg = g.createLinearGradient(0, 0, 0, CHh);
  bg.addColorStop(0, rgba(mixC(P.skyT, paper, 0.45))); bg.addColorStop(0.6, rgba(mixC(P.skyB, paper, 0.5))); bg.addColorStop(1, rgba(paper));
  g.fillStyle = bg; g.fillRect(0, 0, CW, CHh);
  const sun = g.createRadialGradient(CW * 0.7, CHh * 0.2, 0, CW * 0.7, CHh * 0.2, 260);
  sun.addColorStop(0, rgba(P.sunC, 0.75)); sun.addColorStop(0.3, rgba(P.sunC, 0.45)); sun.addColorStop(1, rgba(P.sunC, 0));
  g.fillStyle = sun; g.fillRect(0, 0, CW, CHh * 0.5);
  for (let k = 0; k < 3; k++) {
    const col = mixC(P.far, paper, 0.5 - k * 0.22), n = k === 2 ? 3 : 4;
    for (let q = 0; q < n; q++) {
      const cx = CW * (0.06 + 0.88 * (q + 0.2 + r() * 0.6) / n), hw = 36 + r() * 40 + k * 14, h = CHh * (0.22 + r() * 0.22 - k * 0.03);
      const pk = peakPts(cx, hw, h, CHh * (0.97 + k * 0.03), (r() * 4096) | 0, { cap: 5 + r() * 5, rnd: 0.26 + r() * 0.08, tap: 0.25, lump: 0.14, crag: 0.04, lean: (r() - 0.5) * 0.4 });
      inkPeak(g, pk, col, r);
      if (r() < 0.6) { const a = apex(pk); padPine(g, a[0], a[1] + 5, 1.3, darker(col, 0.4), r); }
    }
  }
  const mist = g.createLinearGradient(0, CHh * 0.68, 0, CHh);
  mist.addColorStop(0, rgba(paper, 0)); mist.addColorStop(1, rgba(paper, 0.96));
  g.fillStyle = mist; g.fillRect(0, CHh * 0.68, CW, CHh * 0.32);
  if (R.win) PENG.draw(g, { S: 330, x: CW * 0.38, y: CHh * 0.36, flap: 0.6, bob: 0 }, 1, 330);
  else {
    g.strokeStyle = ink; g.lineCap = 'round';
    const n = clamp(Math.round(R.birds / 3), 12, 60);
    for (let k = 0; k < n; k++) {
      const a = r() * TAU, d = Math.sqrt(r()), x = CW * 0.38 + Math.cos(a) * d * 230, y = CHh * 0.4 + Math.sin(a) * d * 150, s = 9 + r() * 7;
      g.lineWidth = 2 + r() * 1.5; g.globalAlpha = 0.6 + r() * 0.4;
      g.beginPath(); g.moveTo(x - s, y - s * 0.3); g.quadraticCurveTo(x - s * 0.4, y - s * 0.7, x, y); g.quadraticCurveTo(x + s * 0.4, y - s * 0.7, x + s, y - s * 0.3); g.stroke();
    }
    g.globalAlpha = 1;
  }
  if (paperC) { g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.55; g.fillStyle = g.createPattern(paperC, 'repeat'); g.fillRect(0, 0, CW, CHh); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
  g.textAlign = 'center'; g.textBaseline = 'top';
  g.fillStyle = zhu; g.font = '150px FYT, serif'; vtext(g, R.title, CW - 120, 90, 150, 1.02);
  g.fillStyle = ink; g.font = '46px FYK, serif';
  R.quote.split('　').forEach((ph, k) => vtext(g, ph, CW - 250 - k * 66, 110, 46, 1.18));
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  fitText(g, R.win ? '九万里' : '飞至' + liText(R.li), 80, CHh - 260, 92, 'FYT, serif', 700);
  fitText(g, (R.win ? '化鹏 ' : '鸟群最盛 ') + R.birds + ' 羽　历时 ' + fmtTime(R.time), 84, CHh - 182, 44, 'FYK, serif', 700);
  const d = new Date();
  g.globalAlpha = 0.7;
  fitText(g, d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日' + (R.daily ? '　今日之风' : '') + (R.cont ? '　续飞' : ''), 86, CHh - 120, 34, 'FYK, serif', 700);
  g.globalAlpha = 1;
  g.drawImage(makeSeal('扶摇', 150, r), CW - 250, CHh - 300);
  return c.toDataURL('image/jpeg', 0.9);
}
// inside Claude a file goes through the viewer's save prompt; on an ordinary web page the download link does it
const inClaude = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null, cardUrl = '';
if (inClaude) window.claude.use('downloads').then(d => { dlCap = d; }, () => { dlCap = null; });
function dataBytes(url) {
  const b = atob(url.slice(url.indexOf(',') + 1)), a = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
  return a;
}
function openShare() {
  if (!lastRun) return;
  cardUrl = makeShareCard(lastRun);
  const canSave = !inClaude || !!dlCap, dl = $('shareDl');
  $('shareImg').src = cardUrl; dl.href = cardUrl; dl.hidden = !canSave;
  $('shareHint').textContent = COARSE ? '长按图片　保存或发给朋友' : canSave ? '右键图片可另存　也可点下面保存' : '右键图片即可另存';
  $('share').classList.add('on');
}
$('shareDl').addEventListener('click', e => {
  if (!inClaude) return;
  e.preventDefault();
  if (!dlCap || !cardUrl) return;
  dlCap.save({ filename: '扶摇九万里.jpg', data: dataBytes(cardUrl) }).catch(err => {
    const code = err && err.code;
    if (code !== 'declined' && code !== 'rate_limited') $('shareDl').hidden = true;
  });
});
const closeShare = () => $('share').classList.remove('on');
for (const id of ['oCard', 'wCard']) $(id).addEventListener('click', e => { e.stopPropagation(); openShare(); });
$('shareClose').addEventListener('click', closeShare);
$('share').addEventListener('click', e => { if (e.target.id === 'share') closeShare(); });

/* ----- nine fables from 逍遥游, one hidden in each heaven ----- */
const FABLES = [
  ['齐谐', '齐谐者　志怪者也'], ['蜩与学鸠', '我决起而飞　抢榆枋而止'], ['大瓠', '何不虑以为大樽　而浮乎江湖'],
  ['大椿', '以八千岁为春　八千岁为秋'], ['藐姑射神人', '乘云气　御飞龙　而游乎四海之外'], ['蟪蛄', '蟪蛄不知春秋'],
  ['朝菌', '朝菌不知晦朔'], ['列子', '夫列子御风而行　泠然善也'], ['大樗', '彷徨乎无为其侧　逍遥乎寝卧其下']
];
const fabs = [];
let fabMask = 0, fabNew = 0, tailT = 0, fcardTO = 0;
try { fabMask = (+localStorage.getItem('fy-fables')) | 0; } catch (e) { fabMask = 0; }
function resetFables() {
  fabs.length = 0; fabNew = 0; tailT = 0;
  const r = makeRng(seedOf(SEED, 3319));
  for (let si = 0; si < NST; si++) {
    let a = si * STAGE_LEN + 1300 + r() * 2400;
    const side = r() < 0.5 ? -1 : 1, F = forkInfo(Math.floor(a / FSEG));
    if (F && a > F.f0 - 250 && a < F.f0 + F.L + 250) a = F.f0 - 260;
    walls(a);
    const f = { si, side, st: 0, t: 0, near: 0, ph: r() * TAU, ex: side < 0 ? W_L : W_R, x: W_C + side * (W_R - W_L) * 0.2, y: -a };
    if (si === 7) f.x = W_C;
    fabs.push(f);
  }
}
function fabHot(f) {
  const s = -f.side;
  switch (f.si) {
    case 1: return [f.ex + s * 95, f.y - 20, 170];
    case 3: return [f.ex + s * 110, f.y - 90, 220];
    case 5: return [f.ex + s * 80, f.y - 10, 160];
    case 6: return [f.ex + s * 60, f.y, 185];
    case 7: return [f.x, f.y, 230];
    case 8: return [f.x, f.y - 40, 230];
    default: return [f.x, f.y, 170];
  }
}
function collectFable(f) {
  if (f.st) return;
  f.st = 1; f.t = 0;
  const bit = 1 << f.si, first = !(fabMask & bit);
  if (first) { fabMask |= bit; fabNew++; try { localStorage.setItem('fy-fables', String(fabMask)); } catch (e) { /* storage unavailable */ } }
  addWind(15); AU.fable(); pickGold = Math.max(pickGold, 0.55); haptic(30);
  spawnP(P_GRING, flock.cx, flock.cy, 0, 0, 0.9, flock.r).ph = 220;
  if (f.si === 7) tailT = 5;
  const [n, q] = FABLES[f.si], el = $('fcard');
  $('fN').textContent = n; setQuote($('fQ'), q); $('fS').textContent = first ? '新得寓言' : '寓言';
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  clearTimeout(fcardTO); fcardTO = setTimeout(() => el.classList.remove('on'), 4800);
}
function updFables(dt) {
  if (tailT > 0) {
    tailT = Math.max(0, tailT - dt);
    if (Math.random() < dt * 24) spawnP(P_STREAK, flock.cx + rand(-120, 120), flock.cy + rand(-40, 160), rand(-20, 20), -rand(500, 800), 0.5, rand(0.8, 1.4));
  }
  for (const f of fabs) {
    if (f.si === 4 || Math.abs(f.y - camY) > viewH) continue;
    f.t += dt;
    if (f.si === 7) {
      // Liezi rides the wind up the gorge a little slower than the view; once met he speeds away
      f.y -= (f.st ? 260 : Math.max(0, scrollV - 10)) * dt;
      walls(-f.y); f.x += (W_C - f.x) * Math.min(1, dt * 0.8);
    }
    if (f.st || state !== 'play' || !nB) continue;
    if (onScreen(f.y, -60)) toast('fable', '前方有《逍遥游》里的寓言　飞近看看');
    const [hx, hy, R] = fabHot(f), d = Math.hypot(flock.cx - hx, flock.cy - hy);
    if (f.si === 7) { if (d < R) { f.near += dt; if (f.near > 2) collectFable(f); } }
    else if (d < R) collectFable(f);
  }
}
function fabLine() {
  let n = 0;
  for (let si = 0; si < NST; si++) if (fabMask & (1 << si)) n++;
  return '寓言卷 ' + n + ' / ' + NST + (fabNew ? '　本局新得 ' + fabNew : '');
}

/* drawings, in world units */
function inkBranch(ex, y, s, len, w) {
  ctx.strokeStyle = rgba(PN.ink); ctx.lineCap = 'round';
  ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(ex - s * 4, y + 6); ctx.quadraticCurveTo(ex + s * len * 0.46, y - 4, ex + s * len, y - 18); ctx.stroke();
  ctx.lineWidth = w * 0.5; ctx.beginPath(); ctx.moveTo(ex + s * len * 0.54, y - 6); ctx.quadraticCurveTo(ex + s * len * 0.7, y - 30, ex + s * len * 0.8, y - 44); ctx.stroke();
}
function inkCicada(x, y, s, sc) {
  ctx.fillStyle = '#2a2418'; ctx.beginPath(); ctx.ellipse(x, y, 6 * sc, 3 * sc, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(220,230,220,0.6)'; ctx.strokeStyle = 'rgba(40,40,30,0.6)'; ctx.lineWidth = 0.6;
  for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x - s * 7 * sc, y + k * 2.5 * sc, 9 * sc, 2.6 * sc, k * 0.25, 0, TAU); ctx.fill(); ctx.stroke(); }
}
function drawBook(f) {
  const y = f.y + Math.sin(T * 1.3 + f.ph) * 8;
  ctx.save(); ctx.translate(f.x, y); ctx.rotate(Math.sin(T * 0.7 + f.ph) * 0.15);
  ctx.fillStyle = '#efe4c8'; ctx.strokeStyle = '#3a2e22'; ctx.lineWidth = 1.2; ctx.fillRect(-20, -28, 44, 60); ctx.strokeRect(-20, -28, 44, 60);
  ctx.fillStyle = '#2f4a6b'; ctx.fillRect(-24, -32, 44, 60);
  ctx.fillStyle = '#efe4c8'; ctx.fillRect(4, -26, 11, 30);
  ctx.fillStyle = '#1d1a16'; ctx.font = '10px FYT, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('齐', 9.5, -24); ctx.fillText('谐', 9.5, -13);
  ctx.strokeStyle = '#d8cdb2'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-18, -32); ctx.lineTo(-18, 28); for (const yy of [-24, -10, 6, 20]) { ctx.moveTo(-24, yy); ctx.lineTo(-18, yy); } ctx.stroke();
  ctx.restore();
}
function drawCicadaDove(f) {
  const ex = f.ex, y = f.y, s = -f.side;
  inkBranch(ex, y, s, 130, 6);
  ctx.fillStyle = rgba(PN.ink, 0.85);
  for (const [px, py, w] of [[110, -26, 26], [96, -50, 20], [132, -22, 18]]) { ctx.beginPath(); ctx.ellipse(ex + s * px, y + py, w, 5, 0, 0, TAU); ctx.fill(); }
  inkCicada(ex + s * 48, y - 3, s, 1);
  const hop = Math.max(0, Math.sin(T * 3 + f.ph)) * 6, dx = ex + s * 118, dy = y - 34 - hop;
  ctx.fillStyle = '#8d8c86'; ctx.beginPath(); ctx.ellipse(dx, dy, 9, 6, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(dx + s * 8, dy - 5, 4, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5d5c58'; ctx.beginPath(); ctx.moveTo(dx - s * 6, dy - 1); ctx.lineTo(dx - s * 17, dy + 3); ctx.lineTo(dx - s * 6, dy + 4); ctx.fill();
  ctx.fillStyle = '#c96f3a'; ctx.beginPath(); ctx.moveTo(dx + s * 11.5, dy - 5.5); ctx.lineTo(dx + s * 15, dy - 4.5); ctx.lineTo(dx + s * 11.5, dy - 3.5); ctx.fill();
  ctx.fillStyle = '#1d1a16'; ctx.beginPath(); ctx.arc(dx + s * 9, dy - 6, 0.9, 0, TAU); ctx.fill();
}
function drawGourd(f) {
  const y = f.y + Math.sin(T * 0.9 + f.ph) * 10;
  ctx.strokeStyle = rgba(PN.mist, 0.85); ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(f.x, y + 62 + k * 7, 60 - k * 12 + Math.sin(T * 2 + k) * 4, 6, 0, 0, Math.PI); ctx.stroke(); }
  ctx.save(); ctx.translate(f.x, y); ctx.rotate(Math.sin(T * 0.5 + f.ph) * 0.12);
  const gr = ctx.createRadialGradient(-14, -8, 4, 0, 10, 62);
  gr.addColorStop(0, '#ecd38c'); gr.addColorStop(1, '#a8823c');
  ctx.fillStyle = gr; ctx.strokeStyle = '#4a3a20'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(0, 18, 46, 40, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -34, 26, 24, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#7a3a24'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -13, 19, 5, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#3b2e1c'; ctx.beginPath(); ctx.moveTo(0, -57); ctx.quadraticCurveTo(4, -66, 10, -70); ctx.stroke();
  ctx.fillStyle = 'rgba(70,98,58,0.9)'; ctx.beginPath(); ctx.ellipse(17, -66, 9, 4, -0.5, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawGreatTree(f) {
  // 大椿: an ancient tree leaning out of the cliff, its crown as wide as a cloud
  const ex = f.ex, y = f.y, s = -f.side;
  ctx.strokeStyle = rgba(PN.ink); ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    ctx.lineWidth = 22 - k * 7; ctx.beginPath(); ctx.moveTo(ex - s * 6, y + 40 - k * 4);
    ctx.bezierCurveTo(ex + s * (40 + k * 6), y + 20, ex + s * 70, y - 30, ex + s * (100 + k * 8), y - 90 + k * 6); ctx.stroke();
  }
  ctx.lineWidth = 6;
  for (const [bx, by, tx, ty] of [[70, -34, 150, -70], [86, -60, 60, -130], [96, -80, 170, -120]]) { ctx.beginPath(); ctx.moveTo(ex + s * bx, y + by); ctx.quadraticCurveTo(ex + s * (bx + tx) / 2, y + by - 30, ex + s * tx, y + ty); ctx.stroke(); }
  const cx = ex + s * 110, cy = y - 112, leaf = mixC(PN.ink, [70, 110, 70], 0.45);
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * TAU, rr = 38 + (k % 3) * 18;
    ctx.fillStyle = rgba(leaf, 0.5 + (k % 2) * 0.2); ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * rr * 1.5, cy + Math.sin(a) * rr * 0.6, 34, 13, 0, 0, TAU); ctx.fill();
  }
}
function drawRider(P) {
  // 藐姑射神人, sitting on the dragon's neck with ribbons streaming behind
  const q = P[Math.max(0, P.length - 8)];
  ctx.save(); ctx.translate(q[0], q[1] - q[2] - 14); ctx.scale(dragon.dir * 1.7, 1.7);
  ctx.strokeStyle = 'rgba(214,170,72,0.9)'; ctx.lineWidth = 1.4;
  for (const k of [0, 1]) { ctx.beginPath(); ctx.moveTo(-4, -6 + k * 4); ctx.bezierCurveTo(-20, -10 + k * 6 + Math.sin(T * 6 + k) * 4, -34, -2 + k * 6, -52, -8 + k * 8 + Math.sin(T * 5 + k) * 6); ctx.stroke(); }
  ctx.fillStyle = '#f2efe6'; ctx.beginPath(); ctx.moveTo(-8, 8); ctx.quadraticCurveTo(-10, -4, -2, -12); ctx.lineTo(4, -12); ctx.quadraticCurveTo(10, -2, 9, 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f0dcc4'; ctx.beginPath(); ctx.arc(1, -16, 4, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1d1a16'; ctx.beginPath(); ctx.arc(1, -20.5, 2.4, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawHuigu(f) {
  const ex = f.ex, y = f.y, s = -f.side;
  inkBranch(ex, y, s, 110, 5);
  for (let k = 0; k < 9; k++) {
    const lx = ex + s * (60 + (k * 37) % 60), ly = y - 14 - (k * 23) % 34, sz = 7 + (k % 3) * 2;
    ctx.fillStyle = k % 2 ? '#b8341e' : '#d8692a'; ctx.beginPath();
    for (let j = 0; j < 10; j++) { const a = j * TAU / 10 - Math.PI / 2 + k, rr = j % 2 ? sz * 0.45 : sz; j ? ctx.lineTo(lx + Math.cos(a) * rr, ly + Math.sin(a) * rr) : ctx.moveTo(lx + Math.cos(a) * rr, ly + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  }
  inkCicada(ex + s * 40, y - 1, s, 1.2);
}
function drawMushrooms(f) {
  const ex = f.ex, y = f.y, s = -f.side, gl = tinted(glowSpr, [150, 240, 220]);
  ctx.fillStyle = rgba(mixC(PN.rockB, PN.ink, 0.3));
  ctx.beginPath(); ctx.moveTo(ex - s * 4, y - 2); ctx.lineTo(ex + s * 72, y + 2); ctx.lineTo(ex + s * 60, y + 12); ctx.lineTo(ex - s * 4, y + 24); ctx.closePath(); ctx.fill();
  for (let k = 0; k < 6; k++) {
    const mx = ex + s * (12 + k * 9), mh = 7 + (k % 3) * 4, g = 0.6 + 0.4 * Math.sin(T * 2 + k + f.ph);
    ctx.globalAlpha = 0.55 * g; ctx.drawImage(gl, mx - 16, y - mh - 16, 32, 32); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#d9e4dc'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(mx, y); ctx.lineTo(mx, y - mh); ctx.stroke();
    ctx.fillStyle = 'rgba(170,240,230,0.95)'; ctx.beginPath(); ctx.ellipse(mx, y - mh, 5.5, 3.5, 0, Math.PI, TAU); ctx.fill();
  }
}
function drawLiezi(f) {
  const x = f.x, y = f.y;
  ctx.strokeStyle = rgba(PN.mist, 0.9); ctx.lineWidth = 1.8;
  for (let k = 0; k < 3; k++) { const a = T * 3 + k * 2.1; ctx.beginPath(); ctx.ellipse(x, y + 26 + k * 6, 34 - k * 6, 7, 0, a, a + 4); ctx.stroke(); }
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(184,52,30,0.85)'; ctx.lineWidth = 1.6;
  for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(k * 4, -18); ctx.bezierCurveTo(k * 22, -8 + Math.sin(T * 4 + k) * 5, k * 18, 16, k * 34, 30 + Math.sin(T * 3 + k) * 6); ctx.stroke(); }
  ctx.fillStyle = '#ece6d6';
  ctx.beginPath(); ctx.moveTo(-6, -26); ctx.quadraticCurveTo(-14, 0, -12, 20); ctx.lineTo(13, 22); ctx.quadraticCurveTo(14, 0, 6, -26); ctx.closePath(); ctx.fill();
  for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(k * 5, -22); ctx.quadraticCurveTo(k * 26, -18 + Math.sin(T * 5 + k) * 3, k * 32, -2 + Math.sin(T * 4 + k) * 4); ctx.quadraticCurveTo(k * 18, -6, k * 4, -12); ctx.fill(); }
  ctx.fillStyle = '#f0dcc4'; ctx.beginPath(); ctx.arc(0, -31, 5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1d1a16'; ctx.beginPath(); ctx.arc(0, -36, 2.6, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawChu(f) {
  // 大樗 on a floating island, someone asleep in its shade
  const x = f.x, y = f.y + Math.sin(T * 0.6 + f.ph) * 6, rock = mixC(PN.far, PN.ink, 0.35);
  ctx.fillStyle = rgba(rock);
  ctx.beginPath(); ctx.moveTo(x - 92, y); ctx.quadraticCurveTo(x, y - 12, x + 92, y);
  ctx.quadraticCurveTo(x + 70, y + 40, x + 30, y + 70); ctx.quadraticCurveTo(x + 12, y + 110, x + 4, y + 118); ctx.quadraticCurveTo(x - 20, y + 80, x - 50, y + 50); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(mixC(rock, [120, 150, 90], 0.4)); ctx.beginPath(); ctx.ellipse(x, y - 2, 92, 9, 0, Math.PI, TAU); ctx.fill();
  ctx.strokeStyle = rgba(PN.ink); ctx.lineCap = 'round';
  ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(x - 30, y - 4); ctx.bezierCurveTo(x - 46, y - 40, x - 6, y - 50, x - 24, y - 92); ctx.stroke();
  ctx.lineWidth = 6;
  for (const [tx, ty, cx, cy] of [[-96, -110, -70, -70], [40, -120, 10, -80], [-20, -150, -40, -120], [60, -96, 30, -70]]) { ctx.beginPath(); ctx.moveTo(x - 24, y - 84); ctx.quadraticCurveTo(x + cx, y + cy, x + tx, y + ty); ctx.stroke(); }
  ctx.fillStyle = rgba(mixC(PN.ink, [90, 120, 70], 0.4), 0.7);
  for (const [tx, ty] of [[-96, -112], [40, -122], [-20, -152], [60, -98], [-60, -130]]) { ctx.beginPath(); ctx.ellipse(x + tx, y + ty, 26, 10, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#ece6d6'; ctx.beginPath(); ctx.ellipse(x + 24, y - 8, 16, 4.5, -0.05, 0, TAU); ctx.fill();
  ctx.fillStyle = '#f0dcc4'; ctx.beginPath(); ctx.arc(x + 42, y - 10, 4, 0, TAU); ctx.fill();
}
const FDRAW = [drawBook, drawCicadaDove, drawGourd, drawGreatTree, null, drawHuigu, drawMushrooms, drawLiezi, drawChu];
function drawFables() {
  for (const f of fabs) {
    if (!FDRAW[f.si] || Math.abs(f.y - camY) > viewH * 0.8 + 300) continue;
    if (!f.st) { const [hx, hy, R] = fabHot(f); ctx.globalAlpha = 0.28 + 0.14 * Math.sin(T * 2.4); ctx.drawImage(glowGold, hx - R * 0.6, hy - R * 0.6, R * 1.2, R * 1.2); ctx.globalAlpha = 1; }
    FDRAW[f.si](f);
  }
}

/* ----- 寓言卷 ----- */
function openScroll() {
  const grid = $('fGrid');
  grid.textContent = '';
  FABLES.forEach(([name, q], si) => {
    const got = fabMask & (1 << si), cell = document.createElement('div'), b = document.createElement('b');
    cell.className = 'fcell' + (got ? '' : ' no'); b.textContent = got ? name : '？'; cell.appendChild(b);
    if (got) { const v = document.createElement('div'); v.className = 'vq'; setQuote(v, q); cell.appendChild(v); }
    else { const sm = document.createElement('small'); sm.textContent = '藏于第' + CNd[si + 1] + '重'; cell.appendChild(sm); }
    grid.appendChild(cell);
  });
  $('fCount').textContent = fabLine().split('　')[0];
  $('scroll').classList.add('on');
}
const closeScroll = () => $('scroll').classList.remove('on');
$('bScroll').addEventListener('click', e => { e.stopPropagation(); openScroll(); });
$('scrollClose').addEventListener('click', e => { e.stopPropagation(); closeScroll(); });
$('scroll').addEventListener('click', e => { e.stopPropagation(); if (e.target.id === 'scroll') closeScroll(); });
