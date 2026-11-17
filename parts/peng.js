/* ================= the Peng, painted once in ink and gold for the arrival at ninety thousand li =================
   《逍遥游》: 怒而飞，其翼若垂天之云. Unit frame: 1 = the Peng's size S, facing right, both wings raised.
   Three sprites so the wings can beat: the far wing behind, the body with head and tail, the near wing in front.
   Every feather is a tapered brush stroke laid wet over a soft wash; the leading edges are dry-brushed; the wing tips
   trail into cloud. Painted when first needed (or in idle time beforehand) at the resolution it will be shown at. */
const PENG = (() => {
  const NEAR = { pv: [0.1, -0.06], k: 0.95, box: [-1.12, -1.62, 0.42, 0.2] };
  const FAR = { pv: [0.24, -0.08], k: 0.8, box: [-0.16, -1.36, 1.0, 0.12] };
  const BODY = { box: [-1.36, -0.56, 0.92, 0.46] };
  const PAD = 6;
  let cache = null;

  /* ---------- brush ---------- */
  function feather(g, bx, by, tx, ty, w, bend, fill, edge, round) {
    // one feather as one brush stroke: narrow at the quill, full in the vane, a round or pointed tip; fill = [col0, a0, col1, a1]
    const dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy) || 1e-6, nx = -dy / L, ny = dx / L, b4 = bend * 4;
    const P = (t, o) => [bx + dx * t + nx * (o + b4 * t * (1 - t)), by + dy * t + ny * (o + b4 * t * (1 - t))];
    const path = s => {
      const a = P(0, w * 0.28 * s), m1 = P(0.5, w * 0.6 * s), n1 = P(0.86, w * (round ? 0.52 : 0.34) * s), tip = P(round ? 1.1 : 1.03, 0), n2 = P(0.86, -w * (round ? 0.52 : 0.34) * s), m2 = P(0.5, -w * 0.6 * s), z = P(0, -w * 0.28 * s);
      g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(m1[0], m1[1], n1[0], n1[1]); g.quadraticCurveTo(tip[0], tip[1], n2[0], n2[1]); g.quadraticCurveTo(m2[0], m2[1], z[0], z[1]); g.closePath();
    };
    const gr = g.createLinearGradient(bx, by, tx, ty);
    gr.addColorStop(0, rgba(fill[0], fill[1])); gr.addColorStop(1, rgba(fill[2], fill[3]));
    g.globalAlpha = 0.35; g.fillStyle = gr; path(1.18); g.fill(); g.globalAlpha = 1; // the wet edge where the ink bled
    g.fillStyle = gr; path(1); g.fill();
    // barbs: fine strokes from the shaft out to the vane's edge, the brush texture of a painted feather
    g.strokeStyle = rgba(fill[2], 0.35); g.lineWidth = w * 0.035;
    for (let k = 1; k < 9; k++) { const t = 0.15 + k * 0.085, o = w * 0.5 * Math.sin(Math.PI * Math.min(1, t * 0.95)), s0 = P(t, 0), s1 = P(t + 0.06, o * (k % 2 ? 1 : -1)); g.beginPath(); g.moveTo(s0[0], s0[1]); g.lineTo(s1[0], s1[1]); g.stroke(); }
    if (edge) { g.strokeStyle = rgba(edge[0], edge[1]); g.lineWidth = edge[2]; path(1); g.stroke(); const m = P(0.5, 0), e = P(0.92, 0); g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(m[0], m[1], e[0], e[1]); g.lineWidth = edge[2] * 0.8; g.stroke(); }
  }
  function blot(g, x, y, rx, ry, col, a) {
    // a soft wet blot: the wash that spreads under the strokes
    g.save(); g.translate(x, y); g.scale(1, ry / rx);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, rgba(col, a)); gr.addColorStop(0.6, rgba(col, a * 0.55)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
  }
  function bone(g, P, w, col, r) {
    // a dry-brushed edge: one loaded stroke and the broken hairlines beside it (飞白)
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let h = -3; h <= 3; h++) {
      const off = h * w * 0.3, main = h === 0;
      g.strokeStyle = rgba(col, main ? 0.95 : 0.3 + r() * 0.35); g.lineWidth = main ? w : w * 0.16;
      for (let i = 0; i < P.length - 1; i++) {
        if (!main && r() < 0.3) continue;
        const [x0, y0] = P[i], [x1, y1] = P[i + 1], L = Math.hypot(x1 - x0, y1 - y0) || 1e-6, nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
        g.beginPath(); g.moveTo(x0 + nx * off, y0 + ny * off); g.lineTo(x1 + nx * off, y1 + ny * off); g.stroke();
      }
    }
  }
  function curve(P0, P1, P2, P3, n) {
    const out = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0], u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1]]); }
    return out;
  }
  function taper(g, P, w0, w1, col, a) {
    g.lineCap = 'round'; g.strokeStyle = rgba(col, a);
    for (let i = 0; i < P.length - 1; i++) { g.lineWidth = w0 + (w1 - w0) * i / (P.length - 1); g.beginPath(); g.moveTo(P[i][0], P[i][1]); g.lineTo(P[i + 1][0], P[i + 1][1]); g.stroke(); }
  }
  const at = (P, f) => P[Math.max(0, Math.min(P.length - 1, Math.round(f * (P.length - 1))))];

  /* ---------- the parts ---------- */
  function wing(g, W, pal, r, far) {
    // a raised wing: a dark band of coverts along the leading edge, broad overlapping secondaries that make the trailing
    // edge, and long splayed primaries at the hand; mineral blue toward the feather tips and gold outlines (金碧)
    const fa = far ? 0.82 : 1, arm = curve(W.sh, W.el, W.el2, W.wr, 24), hand = curve(W.wr, [W.wr[0] - 0.02, W.wr[1] - 0.08], W.ht, W.ht, 8);
    const gold = [pal.gold, far ? 0.45 : 0.85, 0.0045 * W.s], tipC = far ? pal.azure2 : pal.azure;
    // under-wash over the whole wing so no paper shows between the feathers
    g.beginPath(); g.moveTo(W.sh[0], W.sh[1]);
    for (const p of arm) g.lineTo(p[0], p[1]);
    for (const p of hand) g.lineTo(p[0], p[1]);
    for (let j = W.nPri - 1; j >= 0; j--) { const f = j / (W.nPri - 1), b = at(hand, f), ang = W.priA[0] + (W.priA[1] - W.priA[0]) * f, len = W.priL[j] * W.s * 0.9; g.lineTo(b[0] + Math.cos(ang) * len, b[1] + Math.sin(ang) * len); }
    for (let j = W.nSec - 1; j >= 0; j--) { const f = j / (W.nSec - 1), b = at(arm, 1 - f), ang = W.secA[1] + (W.secA[0] - W.secA[1]) * f, len = (W.secL[1] + (W.secL[0] - W.secL[1]) * f) * W.s * 0.85; g.lineTo(b[0] + Math.cos(ang) * len, b[1] + Math.sin(ang) * len); }
    g.closePath();
    const gw = g.createLinearGradient(W.sh[0], W.sh[1], W.sh[0] + Math.cos(W.secA[0]) * 0.5, W.sh[1] + Math.sin(W.secA[0]) * 0.5);
    gw.addColorStop(0, rgba(pal.ink, 0.92 * fa)); gw.addColorStop(1, rgba(tipC, 0.75 * fa));
    g.fillStyle = gw; g.fill();
    // primaries first (they lie under the secondaries at the wrist), from the outermost in
    for (let j = 0; j < W.nPri; j++) {
      const f = j / (W.nPri - 1), b = at(hand, f), ang = W.priA[0] + (W.priA[1] - W.priA[0]) * f + (r() - 0.5) * 0.04, len = W.priL[j] * W.s;
      feather(g, b[0], b[1], b[0] + Math.cos(ang) * len, b[1] + Math.sin(ang) * len, 0.075 * W.s, -0.012 * W.s, [pal.ink, 0.95 * fa, pal.deep, fa], gold, false);
    }
    // secondaries, from the hand toward the body, each overlapping the last
    for (let j = 0; j < W.nSec; j++) {
      const f = j / (W.nSec - 1), b = at(arm, 1 - f * 0.97), ang = W.secA[0] + (W.secA[1] - W.secA[0]) * f + (r() - 0.5) * 0.04;
      const len = (W.secL[0] + (W.secL[1] - W.secL[0]) * f + r() * 0.02) * W.s;
      feather(g, b[0], b[1], b[0] + Math.cos(ang) * len, b[1] + Math.sin(ang) * len, 0.12 * W.s, 0.01 * W.s, [pal.ink, 0.95 * fa, tipC, 0.95 * fa], gold, true);
    }
    // coverts: three rows of broad scale-like strokes, the darkest along the bone
    for (let row = 2; row >= 0; row--) {
      const n = 16 - row * 3;
      for (let j = 0; j < n; j++) {
        const f = (j + 0.5 * (row % 2)) / n, b = at(arm, f), ang = W.secA[0] + (W.secA[1] - W.secA[0]) * (1 - f);
        const off = (0.015 + row * 0.07) * W.s, len = (0.1 + row * 0.05) * W.s, bx = b[0] + Math.cos(ang) * off, by = b[1] + Math.sin(ang) * off;
        feather(g, bx, by, bx + Math.cos(ang) * len, by + Math.sin(ang) * len, (0.07 + row * 0.02) * W.s, 0.004, [pal.deep, fa, row ? pal.ink : pal.deep, 0.9 * fa], row ? [pal.gold, (far ? 0.3 : 0.6), 0.003 * W.s] : null, true);
      }
    }
    // the leading edge, dry-brushed, with a thread of gold
    bone(g, arm.concat(hand.slice(1)), 0.034 * W.s, pal.deep, r);
    taper(g, arm.concat(hand.slice(1)), 0.006 * W.s, 0.003 * W.s, pal.gold, far ? 0.45 : 0.9);
    // 其翼若垂天之云: the longest primaries dissolve into cloud at their tips
    for (let j = 1; j < W.nPri - 1; j += 2) {
      const f = j / (W.nPri - 1), b = at(hand, f), ang = W.priA[0] + (W.priA[1] - W.priA[0]) * f, len = W.priL[j] * W.s, x = b[0] + Math.cos(ang) * len * 0.92, y = b[1] + Math.sin(ang) * len * 0.92, sz = 0.1 * W.s;
      for (let k = 0; k < 3; k++) blot(g, x + (r() - 0.5) * sz, y + (r() - 0.5) * sz * 0.6, sz * (0.8 + r() * 0.6), sz * (0.45 + r() * 0.3), pal.mist, 0.42);
    }
  }
  function body(g, pal, r) {
    const deep = pal.deep, ink = pal.ink, gold = [pal.gold, 0.8, 0.0045];
    // tail: a long fan of broad feathers and two flowing plumes
    // tail: two long plumes rippling behind, each ending in a flame of a feather, over a long narrow fan
    for (const S of [[[-0.26, 0.09], [-0.62, -0.12], [-0.9, 0.16], [-1.3, -0.06]], [[-0.26, 0.13], [-0.58, 0.36], [-0.92, 0.1], [-1.26, 0.32]]]) {
      const P = curve(S[0], S[1], S[2], S[3], 40);
      taper(g, P, 0.07, 0.008, pal.azure, 0.45); taper(g, P, 0.04, 0.005, deep, 0.95); taper(g, P, 0.008, 0.002, pal.gold, 0.85);
    }
    // the fan grows from the whole rump, not one point, and is long and only a little spread
    for (let j = 0; j < 10; j++) {
      const f = j / 9, bx = -0.15 - f * 0.1, by = 0.05 + f * 0.1, ang = 2.98 + f * 0.34 + (r() - 0.5) * 0.03, len = 0.6 + Math.sin(f * Math.PI) * 0.18;
      feather(g, bx, by, bx + Math.cos(ang) * len, by + Math.sin(ang) * len, 0.095, 0.012 * (f - 0.5), [ink, 0.97, pal.azure, 0.95], gold, true);
    }
    // the body: deep ink along the back, breast feathers outlined in gold
    blot(g, 0.04, 0.07, 0.46, 0.24, pal.wash, 0.4);
    g.beginPath(); g.moveTo(0.36, -0.02); g.bezierCurveTo(0.3, -0.13, 0.0, -0.13, -0.22, -0.02); g.bezierCurveTo(-0.32, 0.06, -0.28, 0.16, -0.16, 0.2); g.bezierCurveTo(0.04, 0.27, 0.28, 0.2, 0.36, -0.02); g.closePath();
    const gb = g.createLinearGradient(0, -0.12, 0, 0.24); gb.addColorStop(0, rgba(deep, 1)); gb.addColorStop(0.5, rgba(ink, 0.95)); gb.addColorStop(1, rgba(pal.azure, 0.9));
    g.fillStyle = gb; g.fill();
    g.save(); g.clip();
    for (let k = 0; k < 70; k++) { // breast and flank feathers: small overlapping strokes, denser and brighter toward the breast
      const x = 0.32 - Math.pow(r(), 0.8) * 0.56, y = 0.0 + r() * 0.2, s = 0.02 + r() * 0.014, ang = 2.9 + (r() - 0.5) * 0.3;
      feather(g, x, y, x + Math.cos(ang) * s * 2.4, y + Math.sin(ang) * s * 2.4, s * 1.4, 0.002, [deep, 0.7, pal.azure, 0.6], [pal.gold, 0.3 + (x + 0.24) * 0.6, 0.003], true);
    }
    g.restore();
    bone(g, curve([0.34, -0.05], [0.14, -0.13], [-0.08, -0.1], [-0.26, 0.0], 14), 0.022, deep, r);
    // talons tucked under the belly, gold-clawed
    g.lineCap = 'round';
    for (const [x, y] of [[0.0, 0.215], [0.07, 0.22]]) { g.strokeStyle = rgba(deep, 0.95); g.lineWidth = 0.022; g.beginPath(); g.moveTo(x + 0.02, y - 0.02); g.quadraticCurveTo(x - 0.03, y + 0.04, x - 0.1, y + 0.03); g.stroke(); g.strokeStyle = rgba(pal.gold, 0.9); g.lineWidth = 0.006; g.beginPath(); g.moveTo(x - 0.09, y + 0.03); g.quadraticCurveTo(x - 0.12, y + 0.05, x - 0.11, y + 0.07); g.stroke(); }
    // the neck: thick and muscular, with a mane of pointed hackles flowing back over the shoulders
    g.beginPath(); g.moveTo(0.28, -0.07); g.bezierCurveTo(0.42, -0.12, 0.5, -0.22, 0.56, -0.27); g.lineTo(0.68, -0.13); g.bezierCurveTo(0.68, -0.03, 0.52, 0.1, 0.34, 0.13); g.bezierCurveTo(0.2, 0.12, 0.16, 0.0, 0.28, -0.07); g.closePath();
    const gn = g.createLinearGradient(0.42, -0.24, 0.52, 0.1); gn.addColorStop(0, rgba(deep, 1)); gn.addColorStop(1, rgba(ink, 0.97)); g.fillStyle = gn; g.fill();
    // hackles lie along the nape and flow back down over the shoulders
    for (let k = 0; k < 11; k++) {
      const t = k / 10, bx = 0.58 - t * 0.26, by = -0.25 + t * 0.2, ang = 2.62 + t * 0.12 + (r() - 0.5) * 0.06, len = 0.13 + t * 0.05;
      feather(g, bx, by, bx + Math.cos(ang) * len, by + Math.sin(ang) * len, 0.05, 0.012, [deep, 1, ink, 0.95], [pal.gold, 0.7, 0.004], false);
    }
    // the throat: small feathers falling down the front of the neck, so it reads as plumage rather than a plate
    for (let k = 0; k < 14; k++) {
      const t = k / 13, bx = 0.66 - t * 0.24 + (r() - 0.5) * 0.02, by = -0.12 + t * 0.2 + (r() - 0.5) * 0.02, ang = 2.2 + t * 0.35;
      feather(g, bx, by, bx + Math.cos(ang) * 0.08, by + Math.sin(ang) * 0.08, 0.04, 0.005, [deep, 1, ink, 0.95], [pal.gold, 0.35 + t * 0.25, 0.003], true);
    }
    // crest: two long plumes swept back from the crown
    for (const [ang, len, w] of [[3.4, 0.3, 0.05], [3.56, 0.24, 0.04]]) feather(g, 0.6, -0.25, 0.6 + Math.cos(ang) * len, -0.25 + Math.sin(ang) * len, w, 0.025, [deep, 1, pal.azure, 0.9], gold, false);
    // head: a big eagle head with a jutting brow
    blot(g, 0.62, -0.19, 0.14, 0.12, deep, 0.5);
    g.fillStyle = rgba(deep, 1); g.beginPath(); g.ellipse(0.625, -0.19, 0.1, 0.082, -0.35, 0, TAU); g.fill();
    // the hooked beak: horn-pale, dark at the hook, gold at the gape
    g.fillStyle = rgba(pal.horn, 1); g.beginPath(); g.moveTo(0.68, -0.235); g.quadraticCurveTo(0.79, -0.245, 0.86, -0.17); g.quadraticCurveTo(0.872, -0.13, 0.845, -0.112); g.quadraticCurveTo(0.83, -0.15, 0.775, -0.158); g.quadraticCurveTo(0.72, -0.152, 0.685, -0.143); g.closePath(); g.fill();
    g.fillStyle = rgba(deep, 0.95); g.beginPath(); g.moveTo(0.81, -0.205); g.quadraticCurveTo(0.872, -0.17, 0.845, -0.112); g.quadraticCurveTo(0.84, -0.148, 0.8, -0.18); g.closePath(); g.fill();
    g.strokeStyle = rgba(deep, 0.95); g.lineWidth = 0.009; g.beginPath(); g.moveTo(0.69, -0.148); g.quadraticCurveTo(0.75, -0.136, 0.82, -0.132); g.stroke();
    g.strokeStyle = rgba(pal.gold, 0.95); g.lineWidth = 0.008; g.beginPath(); g.moveTo(0.672, -0.152); g.lineTo(0.705, -0.158); g.stroke();
    // the eye under a heavy brow: 怒而飞
    g.fillStyle = rgba(pal.gold, 1); g.beginPath(); g.arc(0.655, -0.213, 0.024, 0, TAU); g.fill();
    g.fillStyle = rgba([6, 6, 6], 1); g.beginPath(); g.arc(0.66, -0.213, 0.0125, 0, TAU); g.fill();
    g.fillStyle = rgba(pal.mist, 0.95); g.beginPath(); g.arc(0.664, -0.218, 0.0045, 0, TAU); g.fill();
    g.strokeStyle = rgba(pal.gold, 0.7); g.lineWidth = 0.0045; g.beginPath(); g.arc(0.655, -0.213, 0.03, 0, TAU); g.stroke();
    g.strokeStyle = rgba(deep, 1); g.lineWidth = 0.02; g.lineCap = 'round'; g.beginPath(); g.moveTo(0.6, -0.245); g.quadraticCurveTo(0.65, -0.258, 0.7, -0.232); g.stroke();
  }
  const NEAR_W = { s: 1, sh: [0.1, -0.06], el: [0.2, -0.36], el2: [0.12, -0.62], wr: [-0.02, -0.8], ht: [-0.16, -0.96], nSec: 20, secA: [-2.7, -3.25], secL: [0.46, 0.4], nPri: 9, priA: [-1.75, -2.65], priL: [0.58, 0.66, 0.7, 0.7, 0.67, 0.62, 0.57, 0.52, 0.48],
    mist: [[-0.7, -1.3, 0.22], [-0.92, -1.0, 0.2], [-0.42, -1.5, 0.16]] };
  const FAR_W = { s: 0.8, sh: [0.24, -0.08], el: [0.34, -0.32], el2: [0.36, -0.52], wr: [0.4, -0.66], ht: [0.42, -0.8], nSec: 15, secA: [-2.2, -2.7], secL: [0.36, 0.3], nPri: 8, priA: [-1.32, -2.1], priL: [0.48, 0.55, 0.58, 0.58, 0.55, 0.51, 0.47, 0.43],
    mist: [[0.72, -1.14, 0.17], [0.32, -1.22, 0.14]] };

  function sprite(box, res, paint) {
    const [x0, y0, x1, y1] = box, c = mkCanvas((x1 - x0) * res + PAD * 2, (y1 - y0) * res + PAD * 2), g = c.getContext('2d');
    g.setTransform(res, 0, 0, res, PAD - x0 * res, PAD - y0 * res);
    paint(g);
    return { c, box, res };
  }
  // the three parts are painted one at a time, so preparing ahead can spread the work over three idle moments
  const PARTS = [['far', FAR.box, (g, r) => wing(g, FAR_W, PAL, r, true)], ['body', BODY.box, (g, r) => body(g, PAL, r)], ['near', NEAR.box, (g, r) => wing(g, NEAR_W, PAL, r, false)]];
  // 金碧: indigo ink, azurite toward the feather tips, gold outlines
  const PAL = { deep: [10, 16, 24], ink: [22, 40, 54], azure: [44, 96, 122], azure2: [70, 118, 136], wash: [96, 116, 124], gold: [214, 168, 72], mist: [255, 250, 238], horn: [232, 214, 168] };
  function start(res) {
    const want = Math.max(80, Math.min(560, Math.round(res / 40) * 40));
    if (cache && cache.res >= want * 0.75) return cache; // a little sharper or softer than asked is fine; repainting is not
    if (cache) for (const [k] of PARTS) if (cache[k]) cache[k].c.width = cache[k].c.height = 0;
    cache = { res: want, r: makeRng(9090), done: 0 };
    return cache;
  }
  function step(C) { const [k, box, fn] = PARTS[C.done++]; C[k] = sprite(box, C.res, g => fn(g, C.r)); }
  function get(res) { const C = start(res); while (C.done < PARTS.length) step(C); return C; }
  // the wing beat: a rigid turn about the shoulder, the same turn the birds that form the wing follow
  function xf(lx, ly, rg, flap) {
    if (rg !== 1 && rg !== 2) return [lx, ly];
    const W = rg === 1 ? NEAR : FAR, dx = lx - W.pv[0], dy = ly - W.pv[1], th = -flap * W.k, c = Math.cos(th), s = Math.sin(th);
    return [W.pv[0] + dx * c - dy * s, W.pv[1] + dx * s + dy * c];
  }
  function place(c, spr, S, ox, oy) {
    const [x0, y0] = spr.box, k = S / spr.res;
    c.drawImage(spr.c, ox + (x0 - PAD / spr.res) * S, oy + (y0 - PAD / spr.res) * S, spr.c.width * k, spr.c.height * k);
  }
  function wingAt(c, spr, W, S, ox, oy, flap, a) {
    if (a <= 0.01) return;
    c.save(); c.globalAlpha = a; c.translate(ox + W.pv[0] * S, oy + W.pv[1] * S); c.rotate(-flap * W.k);
    place(c, spr, S, -W.pv[0] * S, -W.pv[1] * S); c.restore();
  }
  return {
    xf,
    pad: PAD,
    // paint ahead of time, one part per idle moment, so the arrival does not stall on its first frame
    prepare(res) {
      const C = start(res), idle = window.requestIdleCallback || (f => setTimeout(f, 30));
      const next = () => { if (cache === C && C.done < PARTS.length) { step(C); idle(next); } };
      idle(next);
    },
    // P = { S, x, y, flap, bob } as the birds use it; a = [far wing, body, near wing] opacity, or one number for all
    draw(c, P, a, pxPerUnit) {
      const A = Array.isArray(a) ? a : [a, a, a], spr = get(pxPerUnit || P.S), S = P.S, ox = P.x + 0.06 * S, oy = P.y + (0.3 + P.bob) * S;
      wingAt(c, spr.far, FAR, S, ox, oy, P.flap, A[0]);
      if (A[1] > 0.01) { c.globalAlpha = A[1]; place(c, spr.body, S, ox, oy); }
      wingAt(c, spr.near, NEAR, S, ox, oy, P.flap, A[2]);
      c.globalAlpha = 1;
    },
    // the outline of each part at u px per unit, for placing the birds that form the Peng: 1 near wing, 2 far wing, 3 body
    silhouettes(u) {
      const spr = cache && cache.done === PARTS.length ? cache : get(u * 1.5);
      return [[1, spr.near], [2, spr.far], [3, spr.body]];
    }
  };
})();
