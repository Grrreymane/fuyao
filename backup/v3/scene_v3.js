/* ================= scenery of the nine heavens ================= */
const THEME = [
  { light: 0.35, lc: [255, 238, 214], fg: null },
  { light: 0.55, lc: [255, 236, 204], fg: 'pine' },
  { light: 0.6, lc: [255, 255, 248], fg: 'spray' },
  { light: 0.45, lc: [255, 250, 236], fg: 'cloud' },
  { light: 0, lc: [255, 255, 255], fg: 'twig' },
  { light: 0.7, lc: [255, 190, 120], fg: 'maple' },
  { light: 0.22, lc: [190, 205, 255], fg: null },
  { light: 0.35, lc: [255, 212, 190], fg: 'flag' },
  { light: 0.9, lc: [255, 226, 150], fg: 'blossom' }
];
const GOLD = [226, 176, 74], VERM = [184, 57, 45], JADE = [239, 232, 216], LAMP = [255, 196, 110];
let sceneIdx = 0, sceneFade = 1, gateT = 0, pendScene = -1, bgFlash = 0, bgFlashNext = 3;
const SCN = [];
const sres = () => Math.max(0.35, pxu * 0.55);
function sprBox(w, h, padX, padY) {
  const res = sres(), px = padX === undefined ? 24 : padX, py = padY === undefined ? 24 : padY;
  const c = mkCanvas((w + px * 2) * res, (h + py * 2) * res), g = c.getContext('2d');
  g.scale(res, res); g.translate(px, py); g.lineCap = 'round'; g.lineJoin = 'round';
  return { c, g, w: w + px * 2, h: h + py * 2, ax: px + w / 2, px, py };
}
const sprOf = B => ({ c: B.c, w: B.w, h: B.h, ax: B.ax });
function vfade(g, y0, y1, col, a0, a1) { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, rgba(col, a0)); gr.addColorStop(1, rgba(col, a1)); return gr; }
function tracePts(g, P) { g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }
const darker = (c, k) => mixC(c, [0, 0, 0], k);
function strokesIn(g, r, x0, x1, y0, y1, n, col, al, vert) {
  g.strokeStyle = rgba(col, al);
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), l = 10 + r() * 40;
    g.lineWidth = 0.5 + r() * 1.4; g.beginPath(); g.moveTo(x, y);
    if (vert) g.quadraticCurveTo(x + (r() - 0.5) * 8, y + l * 0.5, x + (r() - 0.5) * 6, y + l);
    else g.quadraticCurveTo(x + l * 0.5, y + (r() - 0.5) * 4, x + l, y + (r() - 0.5) * 3);
    g.stroke();
  }
}
function padPine(g, x, y, s, col, r) {
  g.strokeStyle = rgba(col); g.fillStyle = rgba(col);
  g.lineWidth = 2 * s; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 10 * s, y - 10 * s, x + (r() - 0.5) * 6 * s, y - 22 * s); g.stroke();
  for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(x + (r() - 0.5) * 12 * s, y - (8 + k * 7) * s, (12 - k * 2.5) * s, 2.6 * s, (r() - 0.5) * 0.2, 0, TAU); g.fill(); }
}
function roofShape(g, x, y, w, h, fill) {
  g.fillStyle = fill; g.beginPath(); g.moveTo(x - w * 0.62, y - h * 0.08);
  g.quadraticCurveTo(x - w * 0.36, y - h * 0.05, x - w * 0.28, y - h * 0.6); g.lineTo(x + w * 0.28, y - h * 0.6);
  g.quadraticCurveTo(x + w * 0.36, y - h * 0.05, x + w * 0.62, y - h * 0.08);
  g.quadraticCurveTo(x, y + h * 0.12, x - w * 0.62, y - h * 0.08); g.fill();
}
function hall(g, x, y, w, tiers, roofCol, wallCol, pillarCol) {
  let cy = y, ww = w;
  for (let k = 0; k < tiers; k++) {
    const bh = ww * 0.32;
    g.fillStyle = wallCol; g.fillRect(x - ww * 0.36, cy - bh, ww * 0.72, bh);
    g.fillStyle = pillarCol; for (let p = 0; p < 4; p++) g.fillRect(x - ww * 0.34 + p * ww * 0.22, cy - bh, ww * 0.045, bh);
    roofShape(g, x, cy - bh, ww, ww * 0.42, roofCol);
    cy -= bh + ww * 0.2; ww *= 0.78;
  }
  g.fillStyle = roofCol; g.fillRect(x - 1.2, cy - ww * 0.3, 2.4, ww * 0.38);
}
function pagoda(g, x, y, w, tiers, col) {
  let cy = y, ww = w;
  g.fillStyle = col;
  for (let k = 0; k < tiers; k++) { const bh = ww * 0.55; g.fillRect(x - ww * 0.3, cy - bh, ww * 0.6, bh); roofShape(g, x, cy - bh, ww * 1.15, ww * 0.42, col); cy -= bh + ww * 0.12; ww *= 0.88; }
  g.fillStyle = col; g.fillRect(x - 0.8, cy - ww * 1.2, 1.6, ww * 1.3);
}
function deadTree(g, x, y, s, r) {
  const br = (x0, y0, ang, len, wd, d) => {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    g.lineWidth = wd; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    if (d > 0) { br(x1, y1, ang - 0.35 - r() * 0.45, len * 0.7, wd * 0.62, d - 1); br(x1, y1, ang + 0.3 + r() * 0.45, len * 0.62, wd * 0.62, d - 1); }
  };
  br(x, y, -Math.PI / 2 + (r() - 0.5) * 0.4, 16 * s, 2.6 * s, 3);
}
function softBlob(g, x, y, rad, col, a) { const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }

/* ----- ink peaks: one brush routine shared by every mountain ----- */
function peakPts(cx, hw, h, base, sk, o) {
  // a natural peak outline: half-width follows (1 - t^cap)^rnd (domes for low cap, pillars for high cap),
  // wobbled by low and high frequency noise; returns both flanks so the brush can follow them
  const n = 32, L = [], R = [], tap = o.tap || 0, lump = o.lump || 0.14, crag = o.crag || 0, lean = o.lean || 0;
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = Math.pow(Math.max(0, 1 - Math.pow(t, o.cap)), o.rnd) * (1 - tap * t);
    const c = cx + lean * hw * t * t + hw * 0.22 * vnoise(t * 2.3, sk + 5);
    const wl = 1 + lump * vnoise(t * 7 + 1, sk) + crag * vnoise(t * 23 + 2, sk + 9);
    const wr = 1 + lump * vnoise(t * 7 + 4, sk + 3) + crag * vnoise(t * 23 + 6, sk + 11);
    L.push([c - hw * p * wl, base - h * t]); R.push([c + hw * p * wr, base - h * t]);
  }
  return { L, R, P: L.concat(R.slice().reverse()), top: base - h, base };
}
function inkPeak(g, pk, col, r, tex) {
  // one brush routine for every mountain: wash, light and shadow flanks, cun texture strokes, a broken outline, moss dots
  const { L, R, P, top, base } = pk, dk = darker(col, 0.5), lt = mixC(col, [255, 255, 255], 0.25), k = tex === undefined ? 1 : tex;
  let x0 = 1e9, x1 = -1e9;
  for (const p of P) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; }
  g.globalAlpha = 1; tracePts(g, P); g.fillStyle = rgba(col); g.fill();
  g.save(); tracePts(g, P); g.clip();
  const sh = g.createLinearGradient(x0, 0, x1, 0);
  sh.addColorStop(0, rgba(lt, 0.4)); sh.addColorStop(0.35, rgba(lt, 0)); sh.addColorStop(0.65, rgba(dk, 0.08)); sh.addColorStop(1, rgba(dk, 0.55));
  g.fillStyle = sh; g.fillRect(x0, top, x1 - x0, base - top);
  g.strokeStyle = rgba(dk);
  for (const [E, dir, dens] of [[L, 1, 0.45 * k], [R, -1, 0.9 * k]]) {
    for (let i = 3; i < E.length - 1; i++) {
      for (let q = 0; q < 2; q++) {
        if (r() > dens) continue;
        const ex = E[i][0], ey = E[i][1] + (r() - 0.5) * 8, len = 8 + r() * 26, dx = dir * len * (0.35 + r() * 0.4);
        g.globalAlpha = 0.16 + r() * 0.3; g.lineWidth = 0.6 + r() * 1.5;
        g.beginPath(); g.moveTo(ex + dir * (1 + r() * 4), ey); g.quadraticCurveTo(ex + dx * 0.2, ey + len * 0.5, ex + dx, ey + len); g.stroke();
      }
    }
  }
  const nIn = Math.round((x1 - x0) * (base - top) / 900 * k);
  for (let q = 0; q < nIn; q++) {
    const x = x0 + (x1 - x0) * (1 - r() * r()), y = top + (base - top) * r() * 0.85, len = 6 + r() * 18;
    g.globalAlpha = 0.1 + r() * 0.2; g.lineWidth = 0.5 + r();
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 4, y + len * 0.5, x + (r() - 0.5) * 6, y + len); g.stroke();
  }
  g.restore();
  const edge = L.slice(Math.floor(L.length * 0.3)).concat(R.slice(Math.floor(R.length * 0.3)).reverse());
  g.strokeStyle = rgba(dk);
  for (let i = 0; i < edge.length - 1; i++) {
    g.globalAlpha = 0.35 + 0.4 * r(); g.lineWidth = 0.9 + 1.6 * r();
    g.beginPath(); g.moveTo(edge[i][0], edge[i][1]); g.lineTo(edge[i + 1][0], edge[i + 1][1]); g.stroke();
  }
  g.fillStyle = rgba(dk);
  const nd = 6 + ((r() * 8) | 0);
  for (let q = 0; q < nd; q++) {
    const e = edge[(r() * edge.length) | 0];
    g.globalAlpha = 0.6 + r() * 0.35; g.beginPath(); g.ellipse(e[0] + (r() - 0.5) * 6, e[1] + r() * 5, 1 + r() * 1.6, 0.7 + r() * 0.6, 0, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}
function fadeBase(B, y0, y1) {
  // dissolve everything below y0 into mist, fully clear at y1 (local units)
  const g = B.g, gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.globalCompositeOperation = 'destination-in'; g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(-B.px, -B.py, B.w, B.h); g.restore();
}
function apex(pk) { return pk.L[pk.L.length - 1]; }
function crestAt(pk, t) { const i = Math.round(t * (pk.L.length - 1)); return [(pk.L[i][0] + pk.R[i][0]) / 2, pk.L[i][1], (pk.R[i][0] - pk.L[i][0]) / 2]; }
function genSeaStack(r, col, mist, big) {
  const n = big ? 1 + ((r() * 2) | 0) : 1 + ((r() * 3) | 0), hw0 = big ? 46 + r() * 24 : 24 + r() * 16, h0 = big ? 290 + r() * 170 : 140 + r() * 120;
  const w = hw0 * (2.8 + n * 1.3), h = h0 * 1.06, B = sprBox(w, h), g = B.g, pks = [];
  for (let k = 0; k < n; k++) {
    const main = k === 0, cx = main ? w * (0.38 + r() * 0.24) : w * (r() < 0.5 ? 0.14 + r() * 0.16 : 0.7 + r() * 0.16);
    pks.push(peakPts(cx, hw0 * (main ? 1 : 0.5 + r() * 0.3), h0 * (main ? 1 : 0.35 + r() * 0.35), h, (r() * 4096) | 0, { cap: 3 + r() * 2, rnd: 0.3 + r() * 0.1, tap: 0.12, lump: 0.18, lean: (r() - 0.5) * 0.6 }));
  }
  pks.sort((a, b) => a.top - b.top);
  for (const pk of pks) inkPeak(g, pk, col, r);
  const a = apex(pks[0]);
  if (r() < 0.7) for (let q = 0; q < 1 + ((r() * 2) | 0); q++) padPine(g, a[0] + (r() - 0.5) * hw0 * 0.5, a[1] + 4 + r() * 6, big ? 1.1 : 0.75, darker(col, 0.45), r);
  fadeBase(B, h * 0.42, h);
  for (let q = 0; q < (big ? 7 : 4); q++) softBlob(g, w * r(), h * (0.8 + r() * 0.15), hw0 * (0.8 + r() * 0.8), mist, 0.55);
  g.strokeStyle = rgba(darker(col, 0.5), 0.75); g.lineWidth = 1;
  for (let q = 0; q < (big ? 5 : 3); q++) {
    const x = a[0] + (r() - 0.5) * w * 0.8, y = a[1] - 8 - r() * 24, s = 3 + r() * 2;
    g.beginPath(); g.moveTo(x - s, y - s * 0.4); g.quadraticCurveTo(x - s * 0.4, y - s * 0.6, x, y); g.quadraticCurveTo(x + s * 0.4, y - s * 0.6, x + s, y - s * 0.4); g.stroke();
  }
  return sprOf(B);
}
function genHuang(r, col, pineCol, big) {
  // a cluster of granite pillars, Huangshan style, each crowned with a pine
  const n = big ? 2 + ((r() * 2) | 0) : 3 + ((r() * 3) | 0), hw0 = big ? 22 + r() * 10 : 12 + r() * 8, h0 = big ? 480 + r() * 200 : 240 + r() * 190;
  const w = hw0 * 2 * (n * 1.2 + 1.2), h = h0, B = sprBox(w, h), g = B.g, pks = [];
  for (let k = 0; k < n; k++) {
    const cx = w * (0.15 + 0.7 * (k + 0.2 + r() * 0.6) / n);
    pks.push(peakPts(cx, hw0 * (0.75 + r() * 0.5), h0 * (0.5 + r() * 0.5), h, (r() * 4096) | 0, { cap: 7 + r() * 4, rnd: 0.22 + r() * 0.08, tap: 0.3, lump: 0.12, crag: 0.05, lean: (r() - 0.5) * 0.4 }));
  }
  pks.sort((a, b) => a.top - b.top);
  for (const pk of pks) {
    inkPeak(g, pk, col, r);
    const a = apex(pk);
    for (let q = 0; q < 1 + ((r() * 2) | 0); q++) padPine(g, a[0] + (r() - 0.5) * 10, a[1] + 4 + r() * 6, big ? 1.05 : 0.7, pineCol, r);
  }
  fadeBase(B, h * 0.35, h);
  return sprOf(B);
}
function genWelcomePine(r, col, pineCol) {
  // the welcoming pine: one long arm reaching out from the shoulder of a granite pillar
  const hw = 44 + r() * 14, h = 540 + r() * 160, reach = hw * 2.5, w = hw * 2 + reach + 40, B = sprBox(w, h), g = B.g, cx = hw + 20;
  const pk = peakPts(cx, hw, h * 0.97, h, (r() * 4096) | 0, { cap: 6, rnd: 0.26, tap: 0.22, lump: 0.12, lean: 0.1 });
  inkPeak(g, pk, col, r);
  const s = pk.R[Math.floor(pk.R.length * 0.8)], bx0 = s[0] - 6, by0 = s[1];
  const P = t => [bx0 + reach * t, by0 - Math.sin(t * Math.PI * 0.9) * 28 + t * t * 20];
  g.strokeStyle = rgba(pineCol);
  for (let k = 0; k < 12; k++) {
    const a = P(k / 12), b = P((k + 1) / 12);
    g.lineWidth = 8 * (1 - k / 12) + 2; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  const up = P(0.3);
  g.lineWidth = 3; g.beginPath(); g.moveTo(up[0], up[1]); g.quadraticCurveTo(up[0] + 10, up[1] - 26, up[0] + 30, up[1] - 40); g.stroke();
  const tiers = [[0.42, 0, 18], [0.6, 0, 20], [0.78, 0, 19], [0.95, 0, 15], [0.3, -40, 15]];
  for (const [t, oy, R] of tiers) {
    const p = P(t), x = oy ? up[0] + 30 : p[0], y = (oy ? up[1] + oy : p[1]) - 6;
    g.fillStyle = rgba(pineCol); g.globalAlpha = 0.9; g.beginPath(); g.ellipse(x, y, R, R * 0.24, (r() - 0.5) * 0.12, 0, TAU); g.fill();
    g.globalAlpha = 0.65; g.lineWidth = 0.7; g.beginPath();
    for (let q = 0; q < 14; q++) { const a = Math.PI + q / 13 * Math.PI; g.moveTo(x, y + 1); g.lineTo(x + Math.cos(a) * R * 1.05, y + 1 + Math.sin(a) * R * 0.45); }
    g.stroke();
  }
  g.globalAlpha = 1;
  const a = apex(pk);
  padPine(g, a[0], a[1] + 6, 1.3, pineCol, r);
  fadeBase(B, h * 0.4, h);
  return sprOf(B);
}
function genFallPeak(r, col, water, big) {
  const hw = big ? 100 + r() * 30 : 58 + r() * 34, h = big ? 380 + r() * 130 : 200 + r() * 120, w = hw * 3, B = sprBox(w, h), g = B.g;
  if (r() < 0.75) inkPeak(g, peakPts(w / 2 + (r() < 0.5 ? -1 : 1) * hw * (0.75 + r() * 0.3), hw * 0.55, h * (0.45 + r() * 0.2), h, (r() * 4096) | 0, { cap: 3, rnd: 0.45, lump: 0.2 }), col, r);
  const pk = peakPts(w / 2, hw, h * 0.97, h, (r() * 4096) | 0, { cap: 2.4 + r(), rnd: 0.5 + r() * 0.15, tap: 0.05, lump: 0.16, lean: (r() - 0.5) * 0.5 });
  inkPeak(g, pk, col, r);
  const nf = big ? 1 + ((r() * 2) | 0) : 1 + ((r() * 2) | 0);
  for (let f = 0; f < nf; f++) {
    const [cx, fy, half] = crestAt(pk, 0.72 + r() * 0.12), fx = cx + (r() - 0.5) * half, fw = big ? 12 + r() * 12 : 4 + r() * 5;
    const gr = g.createLinearGradient(0, fy, 0, h);
    gr.addColorStop(0, rgba(water, 0)); gr.addColorStop(0.05, rgba(water, 0.95)); gr.addColorStop(0.75, rgba(water, 0.85)); gr.addColorStop(1, rgba(water, 0.3));
    g.fillStyle = gr; g.beginPath(); g.moveTo(fx - fw * 0.5, fy); g.lineTo(fx + fw * 0.5, fy); g.lineTo(fx + fw * 0.9, h); g.lineTo(fx - fw * 0.9, h); g.closePath(); g.fill();
    g.strokeStyle = rgba(darker(col, 0.1), 0.22); g.lineWidth = 0.6;
    for (let q = 0; q < (big ? 10 : 3); q++) { const x = fx + (r() - 0.5) * fw * 0.8; g.beginPath(); g.moveTo(x, fy + 10 + r() * 30); g.lineTo(x + (r() - 0.5) * 3, fy + 60 + r() * (h - fy) * 0.6); g.stroke(); }
  }
  fadeBase(B, h * 0.5, h);
  softBlob(g, w / 2, h * 0.9, hw * (big ? 1.1 : 0.8), water, 0.75);
  return sprOf(B);
}
function genCloudTip(r, col, cloudCol, big) {
  // a summit standing out of the cloud sea, often with a temple on it
  const hw = big ? 70 + r() * 26 : 36 + r() * 22, h = big ? 290 + r() * 110 : 150 + r() * 90, w = hw * 3.2, B = sprBox(w, h), g = B.g;
  const pk = peakPts(w / 2, hw, h * 0.95, h, (r() * 4096) | 0, { cap: 3.2, rnd: 0.36, tap: 0.1, lump: 0.18, lean: (r() - 0.5) * 0.5 });
  inkPeak(g, pk, col, r);
  const [cx, cy] = crestAt(pk, 0.9);
  if (r() < (big ? 0.8 : 0.4)) hall(g, cx, cy + 4, big ? 38 : 22, big ? 2 : 1, rgba(darker(col, 0.55)), rgba(darker(col, 0.3)), '#9a3b30');
  else for (let q = 0; q < 2; q++) padPine(g, cx + (r() - 0.5) * hw * 0.4, cy + 2, big ? 1.2 : 0.8, darker(col, 0.5), r);
  fadeBase(B, h * 0.3, h * 0.78);
  for (let q = 0; q < 11; q++) softBlob(g, w * (q / 10), h * (0.72 + r() * 0.14), w * (0.12 + r() * 0.08), cloudCol, 0.95);
  return sprOf(B);
}
function genStorm(r, col, dark) {
  // storm heads: billows lit from above with a dark, ragged underbelly and trailing rain
  const w = 520 + r() * 240, h = 330 + r() * 140, B = sprBox(w, h), g = B.g, lit = mixC(col, [255, 255, 255], 0.18);
  for (let q = 0; q < 16; q++) {
    const x = w * (0.08 + r() * 0.84), y = h * (0.22 + r() * 0.36), rr = 46 + r() * 80;
    const cg = g.createRadialGradient(x, y - rr * 0.35, rr * 0.1, x, y, rr);
    cg.addColorStop(0, rgba(lit, 0.9)); cg.addColorStop(0.7, rgba(col, 0.85)); cg.addColorStop(1, rgba(col, 0));
    g.fillStyle = cg; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }
  for (let q = 0; q < 12; q++) softBlob(g, w * (0.06 + q / 11 * 0.88), h * (0.58 + r() * 0.08), 60 + r() * 46, dark, 0.7);
  g.strokeStyle = rgba(dark, 0.22); g.lineWidth = 1.2;
  for (let q = 0; q < 26; q++) { const x = w * (0.1 + r() * 0.8), y = h * (0.62 + r() * 0.08); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 14 - r() * 10, y + 60 + r() * 70); g.stroke(); }
  return sprOf(B);
}
function genJagged(r, col) {
  const hw = 66 + r() * 36, h = 400 + r() * 190, w = hw * 3, B = sprBox(w, h), g = B.g;
  for (let k = 0; k < 2; k++) {
    const pk = peakPts(w * (k ? 0.3 + r() * 0.4 : 0.5), hw * (k ? 0.6 : 1), h * (k ? 0.55 : 0.97), h, (r() * 4096) | 0, { cap: 1.5, rnd: 0.9, lump: 0.3, crag: 0.12, lean: (r() - 0.5) * 0.8 });
    inkPeak(g, pk, k ? darker(col, 0.15) : col, r, 1.3);
    g.strokeStyle = rgba(darker(col, 0.45));
    for (let q = 0; q < 2; q++) { const [x, y] = crestAt(pk, 0.82 + r() * 0.15); deadTree(g, x + (r() - 0.5) * 10, y + 3, 0.8 + r() * 0.5, r); }
  }
  fadeBase(B, h * 0.5, h);
  return sprOf(B);
}
function genSunsetRidge(r, col, sun) {
  const w = 600 + r() * 300, h = 260 + r() * 140, B = sprBox(w, h), g = B.g;
  for (let L = 0; L < 3; L++) {
    const amp = h * (0.35 + L * 0.2), sk = (r() * 4096) | 0, pts = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([t * w, h - amp * (0.55 + 0.45 * fbm(t * 3 + L, sk, 3)) * Math.min(1, t * 5, (1 - t) * 5)]); }
    pts.push([w, h], [0, h]);
    tracePts(g, pts); g.fillStyle = vfade(g, h - amp, h, mixC(col, sun, 0.25 - L * 0.1), 0.55 + L * 0.2, 0.2); g.fill();
    if (L === 1 && r() < 0.8) { const p = pts[8 + ((r() * 24) | 0)]; pagoda(g, p[0], p[1] + 4, 9 + r() * 5, 5 + ((r() * 3) | 0), rgba(darker(col, 0.35))); }
  }
  return sprOf(B);
}
function genPagodaCliff(r, col, maple) {
  const hw = 38 + r() * 14, h = 460 + r() * 150, extra = 120, w = hw * 3.4, B = sprBox(w, h + extra), g = B.g;
  const pk = peakPts(w / 2, hw, h * 0.96, h + extra, (r() * 4096) | 0, { cap: 6, rnd: 0.3, tap: 0.28, lump: 0.14, lean: (r() - 0.5) * 0.3 });
  inkPeak(g, pk, col, r);
  const [cx, cy] = crestAt(pk, 0.93);
  pagoda(g, cx, cy + 4, 18 + r() * 5, 7, rgba(darker(col, 0.3)));
  for (let q = 0; q < 4; q++) {
    const [mx, my, half] = crestAt(pk, 0.78 + r() * 0.12), x = mx + (r() - 0.5) * half * 1.6;
    g.fillStyle = rgba(maple, 0.85);
    for (let k = 0; k < 12; k++) { g.beginPath(); g.arc(x + (r() - 0.5) * 22, my - r() * 14, 1.8 + r() * 3, 0, TAU); g.fill(); }
  }
  fadeBase(B, extra + h * 0.4, h + extra);
  return sprOf(B);
}
function genNightHills(r, col) {
  const w = 560 + r() * 280, h = 300 + r() * 160, B = sprBox(w, h), g = B.g, sk = (r() * 4096) | 0, pts = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([t * w, h - h * (0.5 + 0.5 * fbm(t * 3, sk, 3)) * Math.min(1, t * 4, (1 - t) * 4)]); }
  pts.push([w, h], [0, h]);
  tracePts(g, pts); g.fillStyle = vfade(g, 0, h, col, 0.97, 0.5); g.fill();
  const nv = 2 + ((r() * 3) | 0);
  for (let v = 0; v < nv; v++) {
    const p = pts[6 + ((r() * 28) | 0)], cx = p[0], cy = p[1] + 14 + r() * 30;
    for (let k = 0; k < 6 + ((r() * 8) | 0); k++) { const x = cx + (r() - 0.5) * 50, y = cy + r() * 22; softBlob(g, x, y, 6, LAMP, 0.95); g.fillStyle = rgba(LAMP); g.fillRect(x - 1, y - 1, 2, 2); }
  }
  return sprOf(B);
}
function genLanternPeak(r, col) {
  const hw = 38 + r() * 14, h = 420 + r() * 150, extra = 70, w = hw * 3.2, B = sprBox(w, h + extra), g = B.g;
  const pk = peakPts(w / 2, hw, h * 0.96, h + extra, (r() * 4096) | 0, { cap: 5, rnd: 0.32, tap: 0.25, lump: 0.15, lean: (r() - 0.5) * 0.3 });
  inkPeak(g, pk, col, r, 0.8);
  const [cx, cy] = crestAt(pk, 0.92);
  hall(g, cx, cy + 4, 36, 2, rgba(darker(col, 0.4)), rgba(mixC(col, LAMP, 0.15)), rgba(darker(col, 0.2)));
  for (let k = 0; k < 5; k++) softBlob(g, cx + (k - 2) * 8, cy - 12 + (k % 2) * 4, 14, LAMP, 0.85);
  for (let k = 0; k < 4; k++) {
    const [mx, my, half] = crestAt(pk, 0.45 + r() * 0.4), x = mx + (r() - 0.5) * half;
    softBlob(g, x, my, 10, [255, 150, 70], 0.95); g.fillStyle = '#ffb36b'; g.beginPath(); g.ellipse(x, my, 2.4, 3.2, 0, 0, TAU); g.fill();
  }
  fadeBase(B, extra + h * 0.45, h + extra);
  return sprOf(B);
}
function genFloatIsle(r, col, chainCol, big) {
  const w = big ? 300 + r() * 120 : 140 + r() * 120, th = w * 0.18, bh = w * (0.7 + r() * 0.5);
  const B = sprBox(w * 1.2, th + bh + (big ? 420 : 200)), g = B.g, cx = w * 0.6, top = th + 10, pts = [[cx - w / 2, top]];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([cx - w / 2 + w * t, top - th * Math.sin(t * Math.PI) * (0.6 + 0.4 * r())]); }
  for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push([cx + w / 2 - w * t + (r() - 0.5) * 10, top + bh * Math.pow(Math.sin(t * Math.PI), 0.7) * (0.7 + 0.3 * r())]); }
  tracePts(g, pts); g.fillStyle = vfade(g, top - th, top + bh, col, 0.97, 0.35); g.fill();
  g.save(); tracePts(g, pts); g.clip(); strokesIn(g, r, cx - w / 2, cx + w / 2, top, top + bh, big ? 26 : 12, darker(col, 0.45), 0.35, true); g.restore();
  g.strokeStyle = rgba(chainCol, 0.85); g.lineWidth = big ? 1.6 : 1.1;
  for (let k = 0; k < (big ? 3 : 2); k++) {
    const x = cx + (r() - 0.5) * w * 0.5, y0 = top + bh * (0.5 + r() * 0.3), len = (big ? 260 : 120) + r() * 120;
    for (let y = y0; y < y0 + len; y += 6) { g.beginPath(); g.ellipse(x + Math.sin(y * 0.02) * 4, y, 2, 3.2, ((y / 6) | 0) % 2 ? 0 : Math.PI / 2, 0, TAU); g.stroke(); }
  }
  for (let q = 0; q < (big ? 3 : 1); q++) padPine(g, cx + (r() - 0.5) * w * 0.6, top - th * 0.5, big ? 1.3 : 0.9, darker(col, 0.5), r);
  if (big) {
    hall(g, cx + w * 0.15, top - th * 0.6, 34, 1, rgba(darker(col, 0.45)), rgba(darker(col, 0.2)), '#8e3a30');
    const fx = cx - w * 0.42, gr = g.createLinearGradient(0, top, 0, top + 380);
    gr.addColorStop(0, 'rgba(240,244,248,0.85)'); gr.addColorStop(1, 'rgba(240,244,248,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(fx - 5, top); g.lineTo(fx + 5, top); g.lineTo(fx + 14, top + 380); g.lineTo(fx - 14, top + 380); g.closePath(); g.fill();
  }
  return sprOf(B);
}
function rainbowArc(g, cx, cy, rx, ry, a) {
  const cols = [[232, 84, 72], [240, 152, 64], [240, 212, 92], [112, 182, 112], [92, 150, 212], [124, 102, 192]];
  g.lineWidth = rx * 0.035;
  for (let k = 0; k < 6; k++) { g.strokeStyle = rgba(cols[k], a); g.beginPath(); g.ellipse(cx, cy, rx - k * rx * 0.035, ry - k * rx * 0.035, 0, Math.PI, TAU); g.stroke(); }
}
function genPalaceIsle(r, col, big) {
  const w = big ? 380 : 220 + r() * 120, B = sprBox(w * 1.7, w * 1.25), g = B.g, cx = w * 0.85, top = w * 0.55, bh = w * 0.6, pts = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push([cx - w / 2 + w * t, top + (i % 3 === 0 ? 0 : -2)]); }
  for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push([cx + w / 2 - w * t, top + bh * Math.pow(Math.sin(t * Math.PI), 0.8) * (0.7 + 0.3 * r())]); }
  tracePts(g, pts); g.fillStyle = vfade(g, top, top + bh, col, 0.95, 0.25); g.fill();
  g.save(); tracePts(g, pts); g.clip(); strokesIn(g, r, cx - w / 2, cx + w / 2, top, top + bh, 18, darker(col, 0.4), 0.35, true); g.restore();
  g.fillStyle = rgba(JADE, 0.95); g.fillRect(cx - w * 0.44, top - 5, w * 0.88, 6);
  const pil = rgba(darker(VERM, 0.3));
  hall(g, cx, top - 5, w * 0.34, big ? 3 : 2, rgba(GOLD), rgba(VERM), pil);
  hall(g, cx - w * 0.32, top - 5, w * 0.18, 1, rgba(GOLD), rgba(VERM), pil);
  hall(g, cx + w * 0.32, top - 5, w * 0.18, 1, rgba(GOLD), rgba(VERM), pil);
  if (r() < 0.7) rainbowArc(g, cx + w * 0.5 + w * 0.3, top + 4, w * 0.32, w * 0.24, 0.6);
  for (let q = 0; q < 6; q++) softBlob(g, cx + (r() - 0.5) * w, top + bh * (0.6 + r() * 0.4), w * 0.2, [255, 250, 236], 0.85);
  return sprOf(B);
}
function genGate() {
  const pad = 60, w = 560, h = 640, B = sprBox(w, h, pad, pad), g = B.g, cx = w / 2;
  for (let q = 0; q < 9; q++) softBlob(g, cx + (q - 4) * 56, h - 14 - (q % 2) * 18, 72, [255, 250, 236], 0.9);
  for (const px of [cx - 190, cx + 190 - 54]) {
    const gr = g.createLinearGradient(px, 0, px + 54, 0);
    gr.addColorStop(0, '#7f2219'); gr.addColorStop(0.5, '#c8432f'); gr.addColorStop(1, '#7f2219');
    g.fillStyle = gr; g.fillRect(px, 170, 54, h - 190);
    g.fillStyle = rgba(GOLD); for (const yy of [196, 250, h - 80, h - 52]) g.fillRect(px - 4, yy, 62, 8);
    g.strokeStyle = rgba(GOLD, 0.85); g.lineWidth = 3.4; g.beginPath();
    for (let y = 280; y < h - 92; y += 4) { const x = px + 27 + Math.sin(y * 0.05) * 22; y === 280 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.stroke();
  }
  g.fillStyle = '#8e2a20'; g.fillRect(cx - 232, 150, 464, 30);
  g.fillStyle = rgba(GOLD); g.fillRect(cx - 232, 146, 464, 6); g.fillRect(cx - 232, 178, 464, 4);
  const roofG = (y, rw, rh) => { const gr = g.createLinearGradient(0, y - rh * 0.6, 0, y); gr.addColorStop(0, '#f3cf6a'); gr.addColorStop(1, '#b7832c'); roofShape(g, cx, y, rw, rh, gr); };
  g.fillStyle = '#8e2a20'; g.fillRect(cx - 150, 96, 300, 26); g.fillRect(cx - 86, 40, 172, 22);
  roofG(150, 560, 120); roofG(98, 380, 92); roofG(42, 220, 72);
  g.fillStyle = '#1d3657'; g.fillRect(cx - 34, 190, 68, 168);
  g.strokeStyle = rgba(GOLD); g.lineWidth = 4; g.strokeRect(cx - 34, 190, 68, 168);
  g.fillStyle = rgba(GOLD); g.font = '46px FYT, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  ['南', '天', '门'].forEach((ch, k) => g.fillText(ch, cx, 222 + k * 52));
  const S = sprOf(B);
  S.oy = (pad + 400) / S.h;
  return S;
}
function paintDragon(g, P, R, body, light, eyeA, belly) {
  // P runs tail -> head; the dorsal side is whichever normal points up the screen
  const n = P.length;
  const frame = i => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    let nx = -dy / L, ny = dx / L;
    if (ny > 0) { nx = -nx; ny = -ny; }
    return [dx / L, dy / L, nx, ny];
  };
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.fillStyle = body;
  for (let i = 3; i < n - 4; i += 2) {
    const [tx, ty, nx, ny] = frame(i), r = R[i], x = P[i][0], y = P[i][1], hg = r * (1.1 + 0.5 * Math.sin(i * 1.7));
    g.beginPath(); g.moveTo(x - tx * r * 0.9 + nx * r * 0.6, y - ty * r * 0.9 + ny * r * 0.6);
    g.quadraticCurveTo(x + nx * r * 1.2, y + ny * r * 1.2, x - tx * r * 0.6 + nx * (r + hg), y - ty * r * 0.6 + ny * (r + hg));
    g.quadraticCurveTo(x + tx * r * 0.2 + nx * r * 1.1, y + ty * r * 0.2 + ny * r * 1.1, x + tx * r * 0.9 + nx * r * 0.6, y + ty * r * 0.9 + ny * r * 0.6);
    g.fill();
  }
  for (const u of [0.3, 0.38, 0.64, 0.72]) {
    const i = Math.round(u * (n - 1)), [tx, ty, nx, ny] = frame(i), r = R[i], x = P[i][0], y = P[i][1];
    const kx = x - nx * r * 1.8 - tx * r * 0.5, ky = y - ny * r * 1.8 - ty * r * 0.5, fx = kx + tx * r * 1.1 - nx * r * 0.4, fy = ky + ty * r * 1.1 - ny * r * 0.4;
    g.strokeStyle = body; g.lineWidth = r * 0.55; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(kx, ky, fx, fy); g.stroke();
    g.lineWidth = r * 0.16;
    for (const s of [-0.7, 0, 0.7]) {
      const a = Math.atan2(ty, tx) + s, cx = fx + Math.cos(a) * r * 0.8, cy = fy + Math.sin(a) * r * 0.8;
      g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo((fx + cx) / 2 - nx * r * 0.25, (fy + cy) / 2 - ny * r * 0.25, cx, cy); g.stroke();
    }
  }
  g.strokeStyle = body;
  for (let i = 1; i < n; i++) { g.lineWidth = R[i] * 2; g.beginPath(); g.moveTo(P[i - 1][0], P[i - 1][1]); g.lineTo(P[i][0], P[i][1]); g.stroke(); }
  {
    const [tx, ty, nx, ny] = frame(1), x = P[0][0], y = P[0][1], r = R[1] * 3.2;
    for (const s of [-1, 0, 1]) {
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x - tx * r + nx * s * r * 0.5, y - ty * r + ny * s * r * 0.5, x - tx * r * 1.6 + nx * s * r * 0.9, y - ty * r * 1.6 + ny * s * r * 0.9);
      g.quadraticCurveTo(x - tx * r * 0.6 + nx * s * r * 0.15, y - ty * r * 0.6 + ny * s * r * 0.15, x, y); g.fill();
    }
  }
  if (belly) {
    g.strokeStyle = belly;
    for (let i = 3; i < n - 2; i++) {
      const a = frame(i - 1), b = frame(i);
      g.lineWidth = R[i] * 0.8; g.beginPath();
      g.moveTo(P[i - 1][0] - a[2] * R[i - 1] * 0.48, P[i - 1][1] - a[3] * R[i - 1] * 0.48); g.lineTo(P[i][0] - b[2] * R[i] * 0.48, P[i][1] - b[3] * R[i] * 0.48); g.stroke();
    }
    g.strokeStyle = body; g.lineWidth = 1.1;
    for (let i = 3; i < n - 2; i++) {
      const [, , nx, ny] = frame(i), r = R[i], cx = P[i][0] - nx * r * 0.48, cy = P[i][1] - ny * r * 0.48;
      g.beginPath(); g.moveTo(cx - nx * r * 0.38, cy - ny * r * 0.38); g.lineTo(cx + nx * r * 0.38, cy + ny * r * 0.38); g.stroke();
    }
  }
  g.strokeStyle = light;
  for (let i = 2; i < n - 3; i++) {
    const [tx, ty, nx, ny] = frame(i), r = R[i], a0 = Math.atan2(ty, tx), x = P[i][0] + nx * r * 0.3, y = P[i][1] + ny * r * 0.3;
    g.lineWidth = Math.max(0.7, r * 0.09); g.beginPath(); g.arc(x - tx * r * 0.3, y - ty * r * 0.3, r * 0.5, a0 - 1.2, a0 + 1.2); g.stroke();
  }
  const hx = P[n - 1][0], hy = P[n - 1][1], ang = Math.atan2(hy - P[n - 3][1], hx - P[n - 3][0]), hr = R[n - 1] * 1.25;
  g.save(); g.translate(hx, hy); g.rotate(ang);
  if (Math.cos(ang) < 0) g.scale(1, -1);
  g.fillStyle = body;
  for (let k = 0; k < 6; k++) {
    const L = hr * (2.2 + (k % 2) * 0.8);
    g.beginPath(); g.moveTo(-hr * 0.2, -hr * 0.2);
    g.quadraticCurveTo(-hr * 0.9, -hr * (0.4 + k * 0.25), -L, -hr * (0.2 + k * 0.32) + Math.sin(T * 4 + k) * hr * 0.15);
    g.quadraticCurveTo(-hr * 0.8, -hr * 0.1 - k * hr * 0.12, -hr * 0.1, hr * 0.1); g.fill();
  }
  g.beginPath(); g.ellipse(hr * 0.3, 0, hr * 1.1, hr * 0.78, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(hr * 0.6, -hr * 0.55); g.quadraticCurveTo(hr * 1.9, -hr * 0.6, hr * 2.5, -hr * 0.15); g.lineTo(hr * 2.4, hr * 0.12); g.lineTo(hr * 0.8, hr * 0.2); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(hr * 0.7, hr * 0.25); g.quadraticCurveTo(hr * 1.6, hr * 0.5, hr * 2.2, hr * 0.75); g.lineTo(hr * 1.9, hr * 0.85); g.quadraticCurveTo(hr * 1.2, hr * 0.85, hr * 0.5, hr * 0.6); g.closePath(); g.fill();
  g.strokeStyle = body;
  for (const s of [0, 1]) {
    const bx = hr * (0.2 - s * 0.25), by = -hr * 0.6;
    g.lineWidth = hr * 0.2; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx - hr * 0.6, by - hr * 1.0, bx - hr * (1.4 + s * 0.3), by - hr * (1.1 + s * 0.2)); g.stroke();
    g.lineWidth = hr * 0.13; g.beginPath(); g.moveTo(bx - hr * 0.5, by - hr * 0.72); g.lineTo(bx - hr * 0.4, by - hr * 1.3); g.stroke();
  }
  g.strokeStyle = light; g.lineWidth = Math.max(0.8, hr * 0.07);
  for (const s of [1, -1]) {
    g.beginPath(); g.moveTo(hr * 2.2, s * hr * 0.05);
    g.bezierCurveTo(hr * 1.4, hr * 1.6 * s + hr * 0.4, -hr * 1.6, hr * 0.9 * s + hr * 0.6, -hr * 4.2, hr * (1.6 + Math.sin(T * 3 + s) * 0.6) * s + hr * 0.5); g.stroke();
  }
  g.fillStyle = 'rgba(255,206,92,' + eyeA + ')'; g.beginPath(); g.ellipse(hr * 0.95, -hr * 0.3, hr * 0.2, hr * 0.13, -0.2, 0, TAU); g.fill();
  g.restore();
}
function genDragonBg() {
  const w = 900, h = 460, B = sprBox(w, h), g = B.g, P = [], R = [], n = 60;
  for (let i = 0; i <= n; i++) { const t = i / n; P.push([w * (0.06 + 0.82 * t), h * 0.52 + Math.sin(t * 7.2) * h * 0.24 * (0.5 + 0.5 * t)]); R.push(5 + 24 * Math.sin(Math.min(1, t * 1.05) * Math.PI * 0.62)); }
  paintDragon(g, P, R, 'rgba(14,16,22,0.92)', 'rgba(150,164,180,0.35)', 0.9, 'rgba(46,50,58,0.9)');
  return sprOf(B);
}
function sceneJobs(si) {
  const P = PAL[si], far = P.far, ink = P.ink, mid = mixC(far, ink, 0.4), J = [];
  const add = (layer, fn) => J.push([layer, fn]);
  switch (si) {
    case 0: for (let k = 0; k < 4; k++) add('far', r => genSeaStack(r, far, P.mist, false)); for (let k = 0; k < 3; k++) add('mid', r => genSeaStack(r, mid, P.mist, true)); break;
    case 1: for (let k = 0; k < 4; k++) add('far', r => genHuang(r, far, darker(far, 0.35), false)); add('mid', r => genHuang(r, mid, darker(ink, 0.1), true)); for (let k = 0; k < 2; k++) add('mid', r => genWelcomePine(r, mid, darker(ink, 0.1))); break;
    case 2: for (let k = 0; k < 4; k++) add('far', r => genFallPeak(r, far, [244, 246, 242], false)); for (let k = 0; k < 3; k++) add('mid', r => genFallPeak(r, mid, [246, 248, 244], true)); break;
    case 3: for (let k = 0; k < 4; k++) add('far', r => genCloudTip(r, far, P.mist, false)); for (let k = 0; k < 3; k++) add('mid', r => genCloudTip(r, mid, P.mist, true)); break;
    case 4: for (let k = 0; k < 3; k++) add('far', r => genStorm(r, mixC(far, P.mist, 0.25), darker(far, 0.3))); for (let k = 0; k < 3; k++) add('mid', r => genJagged(r, mid)); add('extra', () => ({ dragon: genDragonBg() })); break;
    case 5: for (let k = 0; k < 4; k++) add('far', r => genSunsetRidge(r, far, P.sunC)); for (let k = 0; k < 3; k++) add('mid', r => genPagodaCliff(r, mid, [196, 58, 34])); break;
    case 6: for (let k = 0; k < 4; k++) add('far', r => genNightHills(r, far)); for (let k = 0; k < 3; k++) add('mid', r => genLanternPeak(r, mid)); break;
    case 7: for (let k = 0; k < 4; k++) add('far', r => genFloatIsle(r, far, darker(far, 0.4), false)); for (let k = 0; k < 3; k++) add('mid', r => genFloatIsle(r, mid, darker(mid, 0.4), true)); break;
    default: for (let k = 0; k < 4; k++) add('far', r => genPalaceIsle(r, far, false)); for (let k = 0; k < 2; k++) add('mid', r => genPalaceIsle(r, mid, true)); add('extra', () => ({ gate: genGate() })); break;
  }
  return J;
}
function stepScene(si, all) {
  if (si < 0 || si >= NST) return true;
  let S = SCN[si];
  if (!S) S = SCN[si] = { far: [], mid: [], extra: {}, jobs: sceneJobs(si), i: 0 };
  while (S.i < S.jobs.length) {
    const [layer, fn] = S.jobs[S.i], out = fn(makeRng(seedOf(S.i, 7919 + si * 131)));
    if (layer === 'extra') Object.assign(S.extra, out); else S[layer].push(out);
    S.i++;
    if (!all) break;
  }
  return S.i >= S.jobs.length;
}
function freeScene(si) {
  const S = SCN[si];
  if (!S) return;
  for (const s of S.far.concat(S.mid)) s.c.width = s.c.height = 0;
  for (const k in S.extra) if (S.extra[k] && S.extra[k].c) S.extra[k].c.width = S.extra[k].c.height = 0;
  SCN[si] = null;
}
function freeScenes(all) { for (let i = 0; i < NST; i++) if (all || (i !== 0 && Math.abs(i - sceneIdx) > 1)) freeScene(i); }
function drawSceneLayer(layer, par, spacing, al, sc, salt, per) {
  const S = SCN[sceneIdx];
  if (!S || !S[layer].length) return;
  const list = S[layer], la = cam.alt * par, half = viewH / 2;
  const s0 = Math.floor((la - half - 300) / spacing), s1 = Math.floor((la + half + 1100) / spacing);
  ctx.globalAlpha = al * (0.35 + 0.65 * sceneFade);
  for (let s = s1; s >= s0; s--) {
    for (let q = 0; q < per; q++) {
      const id = s * 7 + q, h1 = hash2(id, SEED + salt), h2 = hash2(id, SEED + salt + 9), h3 = hash2(id, SEED + salt + 17);
      const sp = list[(h1 * list.length) | 0], k = sc * (0.8 + h3 * 0.4), dw = sp.w * k * pxu, dh = sp.h * k * pxu;
      const flip = hash2(id, SEED + salt + 23) < 0.5;
      const x = W / 2 + ((h2 - 0.5) * (viewW + 600) - cam.x * par - sp.ax * k) * pxu;
      const y = H / 2 - (s * spacing + h3 * spacing * 0.6 - la) * pxu - dh;
      if (y > H || y + dh < 0 || x > W || x + dw < 0) continue;
      if (flip) { ctx.save(); ctx.translate(x + dw, y); ctx.scale(-1, 1); ctx.drawImage(sp.c, 0, 0, dw, dh); ctx.restore(); }
      else ctx.drawImage(sp.c, x, y, dw, dh);
    }
  }
  ctx.globalAlpha = 1;
}

/* ----- per-heaven sky effects ----- */
function drawFarWater(baseAlt, col, foam, glint) {
  // a distant sea on its own slow parallax, so the horizon sits far behind the near water
  const y = H / 2 - (baseAlt - cam.alt) * 0.2 * pxu;
  if (y > H) return;
  const wc = glint ? col : mixC(col, PN.mist, 0.45), hz = 26 * dpr;
  const g = ctx.createLinearGradient(0, y - hz, 0, H);
  const k = Math.min(0.999, hz / (H - y + hz));
  g.addColorStop(0, rgba(wc, 0)); g.addColorStop(k, rgba(wc, glint ? 0.55 : 0.3)); g.addColorStop(1, rgba(wc, glint ? 0.92 : 0.6));
  ctx.fillStyle = g; ctx.fillRect(0, y - hz, W, H - y + hz);
  ctx.strokeStyle = rgba(foam, glint ? 0.55 : 0.4); ctx.lineCap = 'round';
  for (let q = 0; q < 8; q++) {
    const yy = y + (q * q * 5 + 5) * dpr;
    if (yy > H) break;
    ctx.lineWidth = (glint ? 1.8 : 1.1) * dpr; ctx.setLineDash([(16 + q * 6) * dpr, (28 + q * 9) * dpr]);
    ctx.lineDashOffset = -T * (8 + q * 3) * dpr * (q % 2 ? 1 : -1);
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
  }
  ctx.setLineDash([]);
  if (glint) {
    const sx = W * 0.72;
    for (let q = 0; q < 26; q++) {
      const yy = y + (4 + q * 7) * dpr;
      if (yy > H) break;
      const ww = (40 - q * 1.1) * dpr * (0.6 + 0.4 * Math.sin(T * 3 + q * 1.7));
      ctx.globalAlpha = 0.55 * (1 - q / 26); ctx.fillStyle = '#ffd88a'; ctx.fillRect(sx - ww / 2 + Math.sin(T + q) * 6 * dpr, yy, ww, 1.6 * dpr);
    }
    ctx.globalAlpha = 1;
  }
}
function drawKunBack() {
  // far out on the northern sea the kun surfaces, rolls, and shows its flukes as it dives
  const seaY = H / 2 + cam.alt * 0.2 * pxu;
  if (seaY > H - 10 * dpr) return;
  const cyc = 13, ph = (T % cyc) / cyc, n = Math.floor(T / cyc);
  if (ph > 0.72) return;
  const u = ph / 0.72, dir = hash2(n, 993) < 0.5 ? 1 : -1, w = Math.min(W, H) * 0.3, x = (0.22 + 0.56 * hash2(n, 991)) * W + (u - 0.4) * w * 0.6 * dir;
  const col = rgba(mixC(PAL[0].tide, PAL[0].far, 0.4), 0.72), back = Math.sin(Math.min(1, u / 0.6) * Math.PI);
  ctx.fillStyle = col;
  if (back > 0.01) {
    ctx.beginPath(); ctx.moveTo(x - w / 2, seaY + 2 * dpr);
    ctx.bezierCurveTo(x - w * 0.28, seaY - w * 0.11 * back, x + w * 0.18, seaY - w * 0.12 * back, x + w / 2, seaY + 2 * dpr);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.6 * back; ctx.strokeStyle = 'rgba(236,240,238,0.9)'; ctx.lineWidth = 1.4 * dpr;
    ctx.setLineDash([8 * dpr, 10 * dpr]); ctx.beginPath(); ctx.moveTo(x - w * 0.62, seaY + 3 * dpr); ctx.lineTo(x + w * 0.62, seaY + 3 * dpr); ctx.stroke(); ctx.setLineDash([]);
    if (u > 0.12 && u < 0.4) { const s = Math.sin((u - 0.12) / 0.28 * Math.PI); ctx.globalAlpha = 0.65 * s; ctx.drawImage(glowW, x + dir * w * 0.22 - 14 * dpr, seaY - w * 0.1 - 46 * dpr * s, 28 * dpr, 52 * dpr * s + 6); }
    ctx.globalAlpha = 1;
  }
  if (u > 0.55) {
    const f = Math.sin((u - 0.55) / 0.45 * Math.PI), tx = x - dir * w * 0.42, fh = w * 0.22 * f, fw = w * 0.17;
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(tx - fw * 0.24, seaY + 2 * dpr);
    ctx.quadraticCurveTo(tx - fw * 0.12, seaY - fh * 0.3, tx - fw * 0.1, seaY - fh * 0.52);
    ctx.quadraticCurveTo(tx - fw * 0.62, seaY - fh * 0.5, tx - fw, seaY - fh);
    ctx.quadraticCurveTo(tx - fw * 0.5, seaY - fh * 0.98, tx, seaY - fh * 0.8);
    ctx.quadraticCurveTo(tx + fw * 0.5, seaY - fh * 0.98, tx + fw, seaY - fh);
    ctx.quadraticCurveTo(tx + fw * 0.62, seaY - fh * 0.5, tx + fw * 0.1, seaY - fh * 0.52);
    ctx.quadraticCurveTo(tx + fw * 0.12, seaY - fh * 0.3, tx + fw * 0.24, seaY + 2 * dpr);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.5 * f; ctx.strokeStyle = 'rgba(236,240,238,0.9)'; ctx.lineWidth = dpr;
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(tx + sd * fw * 0.9, seaY - fh * 0.96); ctx.lineTo(tx + sd * fw * 0.95, seaY); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
}
function drawRainbow() {
  const R = Math.max(W, H) * 0.62, cx = W * 0.34, cy = H * 1.02;
  const cols = [[226, 84, 74], [236, 150, 72], [238, 212, 96], [116, 184, 112], [92, 150, 214], [122, 104, 190]];
  ctx.lineWidth = R * 0.022;
  for (let k = 0; k < 6; k++) { ctx.strokeStyle = rgba(cols[k], 0.15 * sceneFade); ctx.beginPath(); ctx.arc(cx, cy, R - k * R * 0.022, Math.PI * 1.08, Math.PI * 1.78); ctx.stroke(); }
}
// one bank of billowing cloud, rendered once at half resolution and reused for every layer of the cloud sea
let bankC = null, bankKey = '';
function cloudBank() {
  const key = W + 'x' + H;
  if (bankC && bankKey === key) return bankC;
  if (bankC) bankC.width = bankC.height = 0;
  const bw = W * 1.5, cw = W / 6 * 2.5, ch = cw * 0.48, top = ch * 0.62, bh = top + 280 * pxu, col = PAL[3].mist;
  const c = mkCanvas(bw / 2, bh / 2), g = c.getContext('2d');
  g.scale(0.5, 0.5);
  const gr = g.createLinearGradient(0, top, 0, bh);
  gr.addColorStop(0, rgba(col, 0.75)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(0, top, bw, bh - top);
  for (let k = 0; k < 10; k++) g.drawImage(tinted(cloudList[k & 3], col), (k + 0.3 * Math.sin(k * 2.7)) / 9 * bw - cw / 2, 0, cw, ch);
  bankC = c; bankKey = key;
  return c;
}
function drawCloudSea(par, sp, al, salt) {
  if (!cloudList.length) return;
  const bank = cloudBank(), bw = W * 1.5, bh = bank.height * 2, top = W / 6 * 2.5 * 0.48 * 0.62;
  const la = cam.alt * par, half = viewH / 2, s0 = Math.floor((la - half - 200) / sp), s1 = Math.floor((la + half + 300) / sp);
  ctx.globalAlpha = al;
  for (let s = s0; s <= s1; s++) {
    const y = H / 2 - (s * sp + hash2(s, salt) * 120 - la) * pxu - top;
    if (y > H || y + bh < 0) continue;
    ctx.drawImage(bank, -W * 0.25 + (hash2(s, salt + 7) - 0.5) * W * 0.4 + Math.sin(T * 0.06 + s) * 18 * pxu, y, bw, bh);
  }
  ctx.globalAlpha = 1;
}
function drawStormFlash() {
  if (bgFlash <= 0.01) return;
  ctx.globalAlpha = bgFlash * 0.26; ctx.fillStyle = '#dfe6f2'; ctx.fillRect(0, 0, W, H);
  const S = SCN[4], d = S && S.extra.dragon;
  if (d) { const w = W * 1.15, h = w * d.h / d.w; ctx.globalAlpha = bgFlash * 0.8; ctx.drawImage(d.c, W * 0.5 - w / 2 + Math.sin(T * 0.07) * 50 * dpr, H * 0.12, w, h); }
  ctx.globalAlpha = 1;
}
function drawMagpieBridge() {
  const n = 46, x0 = W * 0.06, x1 = W * 0.94, yb = H * 0.3, arch = H * 0.12, s = 0.9 * dpr;
  ctx.beginPath();
  for (let k = 0; k < n; k++) { const t = k / (n - 1); birdPath(lerp(x0, x1, t), yb - Math.sin(t * Math.PI) * arch + Math.sin(T * 1.5 + k) * 2 * dpr, 20, -220, T * 7 + k * 0.7, s * (0.8 + 0.3 * Math.sin(k * 2.3))); }
  ctx.strokeStyle = 'rgba(220,228,255,' + (0.6 * sceneFade) + ')'; ctx.lineWidth = 1.3 * dpr; ctx.stroke();
}
function drawTornado() {
  const cx0 = W * 0.3 + Math.sin(T * 0.13) * W * 0.05, top = -H * 0.05, bot = H * 0.95, col = mixC(PN.far, PN.ink, 0.25);
  for (let k = 0; k < 28; k++) {
    const t = k / 27, y = lerp(bot, top, t), rw = lerp(W * 0.02, W * 0.28, Math.pow(t, 1.6)), sway = Math.sin(t * 4 - T * 0.8) * W * 0.03 * t, a0 = (T * (2 - t) * 1.5 + k) % TAU;
    ctx.strokeStyle = rgba(col, (0.26 + 0.12 * Math.sin(T * 3 + k)) * sceneFade); ctx.lineWidth = (2 + t * 4) * dpr;
    ctx.beginPath(); ctx.ellipse(cx0 + sway, y, rw, rw * 0.18, 0, a0, a0 + Math.PI * 1.4); ctx.stroke();
  }
  ctx.fillStyle = rgba(darker(col, 0.3), 0.6 * sceneFade);
  for (let k = 0; k < 34; k++) {
    const t = (k * 0.137 + T * 0.05) % 1, y = lerp(bot, top, t), rw = lerp(W * 0.02, W * 0.28, Math.pow(t, 1.6)), a = T * (3 - t * 2) + k * 2.4;
    ctx.fillRect(cx0 + Math.sin(t * 4 - T * 0.8) * W * 0.03 * t + Math.cos(a) * rw, y + Math.sin(a) * rw * 0.18, 2.4 * dpr, 2.4 * dpr);
  }
}
function gateGeom() {
  // the gate hangs on its own half-speed parallax so that it settles above the flock exactly at ninety thousand li
  const S = SCN[NST - 1], gt = S && S.extra.gate;
  if (!gt) return null;
  const GL = (GOAL + 150) * 0.5 - 0.07 * viewH, baseY = H / 2 - (GL - cam.alt * 0.5) * pxu;
  const w = Math.min(viewW * 0.72, 700) * pxu, h = w * gt.h / gt.w;
  return { img: gt.c, x: W / 2 - w / 2, y: baseY - h, w, h, ox: W / 2, oy: baseY - h + h * gt.oy };
}
function drawGate() {
  const g = gateGeom();
  if (!g || g.y > H || g.y + g.h < 0) return;
  const glow = clamp((cam.alt - (GOAL - 1400)) / 1400, 0, 1) + (fin && fin.gf ? fin.gf : 0);
  ctx.globalAlpha = Math.min(1, 0.55 * glow); ctx.drawImage(glowGold, g.ox - g.w * 0.36, g.oy - g.h * 0.42, g.w * 0.72, g.h * 0.8);
  ctx.globalAlpha = 1; ctx.drawImage(g.img, g.x, g.y, g.w, g.h);
  if (glow > 1) { ctx.globalAlpha = Math.min(1, glow - 1); ctx.drawImage(glowW, g.ox - g.w * 0.5, g.oy - g.h * 0.5, g.w, g.h); ctx.globalAlpha = 1; }
}
function drawFarFX() {
  const si = sceneIdx;
  if (si === 0) { drawFarWater(0, PAL[0].tide, PAL[0].mist, false); if (state === 'play') drawKunBack(); }
  else if (si === 2) drawRainbow();
  else if (si === 3) drawCloudSea(0.3, 760, 0.85, 3);
  else if (si === 4) drawStormFlash();
  else if (si === 5) drawFarWater(5 * STAGE_LEN, [124, 44, 26], [252, 206, 128], true);
  else if (si === 6) drawMagpieBridge();
  else if (si === 7) drawTornado();
}
function drawMidFX() {
  if (sceneIdx === 3) drawCloudSea(0.55, 980, 0.9, 5);
  if (sceneIdx === NST - 1) drawGate();
}

/* ----- living things in the distance ----- */
const flyers = [], lanterns = [];
function updFlyers(dt) {
  const si = sceneIdx, want = si === 0 ? 'gull' : si === 5 ? 'geese' : si === NST - 1 ? 'crane' : null;
  if (want && state !== 'over' && flyers.length < 6 && Math.random() < dt * (want === 'geese' ? 0.22 : 0.45)) {
    const dir = Math.random() < 0.5 ? 1 : -1, par = want === 'crane' ? rand(0.55, 0.9) : want === 'geese' ? rand(0.22, 0.38) : rand(0.3, 0.6);
    flyers.push({ k: want, dir, par, sx: dir > 0 ? -90 * dpr : W + 90 * dpr, la: (H / 2 - H * rand(0.08, 0.6)) / pxu + cam.alt * par, sp: want === 'crane' ? rand(55, 75) : want === 'geese' ? rand(40, 55) : rand(60, 95), ph: rand(0, TAU), n: want === 'geese' ? 7 + ((Math.random() * 6) | 0) : want === 'gull' ? 1 + ((Math.random() * 3) | 0) : 1, s: rand(0.8, 1.15) });
  }
  for (let i = flyers.length - 1; i >= 0; i--) {
    const f = flyers[i];
    f.sx += f.dir * f.sp * pxu * dt * (0.6 + f.par); f.ph += dt * (f.k === 'crane' ? 3.2 : 7);
    const y = H / 2 - (f.la - cam.alt * f.par) * pxu;
    if (f.sx < -340 * dpr || f.sx > W + 340 * dpr || y > H + 100 * dpr) flyers.splice(i, 1);
  }
  const on = si === 6 && state !== 'over';
  if (on && lanterns.length < 26 && Math.random() < dt * 2.4) {
    const par = Math.random() < 0.72 ? rand(0.3, 0.85) : rand(1.1, 1.35), sx = Math.random() * W, sy = H * rand(0.05, 1.05);
    lanterns.push({ par, lx: (sx - W / 2) / pxu + cam.x * par, la: (H / 2 - sy) / pxu + cam.alt * par, vy: rand(18, 42), ph: rand(0, TAU), a: 0, s: rand(0.8, 1.2) });
  }
  for (let i = lanterns.length - 1; i >= 0; i--) {
    const L = lanterns[i];
    L.la += L.vy * dt; L.lx += Math.sin(T * 0.6 + L.ph) * 6 * dt; L.a = on ? Math.min(1, L.a + dt * 0.6) : L.a - dt * 0.8;
    const y = H / 2 - (L.la - cam.alt * L.par) * pxu;
    if (y > H + 90 * dpr || y < -260 * dpr || L.a < 0) lanterns.splice(i, 1);
  }
}
function drawCrane(x, y, s, ph, dir) {
  const f = Math.sin(ph);
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s);
  const wing = (ox, wy, col) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(4 + ox, -3); ctx.quadraticCurveTo(-4 + ox, -3 + wy * 0.6, -14 + ox, -2 + wy); ctx.lineTo(-25 + ox, -1 + wy * 0.95); ctx.lineTo(-10 + ox, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.moveTo(-14 + ox, -2 + wy); ctx.lineTo(-25 + ox, -1 + wy * 0.95); ctx.lineTo(-17 + ox, 0.5 + wy * 0.5); ctx.closePath(); ctx.fill();
  };
  wing(-3, -22 * f * 0.85, '#e4e0d6');
  ctx.fillStyle = '#f6f4ee'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 5, -0.08, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#f6f4ee'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(10, -2); ctx.quadraticCurveTo(22, -6, 30, -4); ctx.stroke();
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(21, -5.6); ctx.lineTo(27.5, -4.6); ctx.stroke();
  ctx.fillStyle = '#d23a2a'; ctx.beginPath(); ctx.arc(30.5, -5, 1.9, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(32, -4); ctx.lineTo(39, -3); ctx.stroke();
  ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-12, 2); ctx.lineTo(-31, 4); ctx.moveTo(-12, 3); ctx.lineTo(-30, 6.5); ctx.stroke();
  wing(0, -24 * f, '#fbfaf5');
  ctx.restore();
}
function drawFlyers() {
  for (const f of flyers) {
    const y = H / 2 - (f.la - cam.alt * f.par) * pxu, s = f.par * pxu * f.s;
    if (f.k === 'crane') { drawCrane(f.sx, y, s * 1.1, f.ph, f.dir); continue; }
    ctx.beginPath();
    for (let q = 0; q < f.n; q++) {
      const row = (q + 1) >> 1, sd = q & 1 ? 1 : -1, ox = -f.dir * row * (f.k === 'geese' ? 22 : 30) * s, oy = (f.k === 'geese' ? row * 12 * sd : ((q * 17) % 13) - 6) * s;
      birdPath(f.sx + ox, y + oy, f.dir * 30, -200, f.ph + q, s * (f.k === 'geese' ? 0.95 : 1.1));
    }
    ctx.strokeStyle = f.k === 'gull' ? 'rgba(244,246,244,0.9)' : rgba(darker(PN.far, 0.45), 0.85); ctx.lineWidth = 1.5 * s; ctx.stroke();
  }
}
function drawLanterns(front) {
  for (const L of lanterns) {
    if ((L.par >= 1) !== front) continue;
    const x = W / 2 + (L.lx - cam.x * L.par) * pxu, y = H / 2 - (L.la - cam.alt * L.par) * pxu, s = 8 * L.s * L.par * pxu;
    ctx.globalAlpha = Math.max(0, L.a) * 0.5; ctx.drawImage(glowGold, x - s * 3, y - s * 3, s * 6, s * 6);
    ctx.globalAlpha = Math.max(0, L.a) * (0.85 + 0.15 * Math.sin(T * 7 + L.ph));
    const gr = ctx.createLinearGradient(0, y - s, 0, y + s); gr.addColorStop(0, '#ffd27a'); gr.addColorStop(1, '#de6a2a');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x - s * 0.72, y - s); ctx.lineTo(x + s * 0.72, y - s); ctx.lineTo(x + s * 0.5, y + s * 0.9); ctx.lineTo(x - s * 0.5, y + s * 0.9); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ----- light, depth and foreground ----- */
const shaftSpr = (() => {
  const c = mkCanvas(64, 512), g = c.getContext('2d'), gh = g.createLinearGradient(0, 0, 64, 0);
  gh.addColorStop(0, 'rgba(255,255,255,0)'); gh.addColorStop(0.5, 'rgba(255,255,255,1)'); gh.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gh; g.fillRect(0, 0, 64, 512);
  g.globalCompositeOperation = 'destination-in';
  const gv = g.createLinearGradient(0, 0, 0, 512); gv.addColorStop(0, 'rgba(0,0,0,1)'); gv.addColorStop(0.55, 'rgba(0,0,0,0.45)'); gv.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gv; g.fillRect(0, 0, 64, 512);
  return { mask: c, cache: new Map() };
})();
function drawShafts() {
  const th = THEME[sceneIdx], k = th.light * (0.3 + 0.7 * sceneFade);
  if (k < 0.02) return;
  const img = tinted(shaftSpr, th.lc), sx = W * 0.8, sy = H * Math.max(-0.12, PN.sunY - 0.12);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 5; i++) {
    const ang = 0.32 + i * 0.12 + Math.sin(T * 0.07 + i * 1.7) * 0.035, len = H * 1.55, wd = W * (0.07 + 0.045 * ((i * 3) % 5) / 4);
    ctx.setTransform(Math.cos(ang), Math.sin(ang), -Math.sin(ang), Math.cos(ang), sx, sy);
    ctx.globalAlpha = k * (0.13 + 0.06 * Math.sin(T * 0.31 + i * 2.1));
    ctx.drawImage(img, -wd / 2, 0, wd, len);
  }
  ctx.restore();
}
const fgItems = [], FGS = {};
let fgNext = 3;
function fgSprite(type) {
  if (FGS[type]) return FGS[type];
  const res = Math.max(0.1, pxu * 0.15), w = 300, h = 300, c = mkCanvas(w * res, h * res), g = c.getContext('2d'), r = makeRng(type.length * 977 + 13);
  g.scale(res, res); g.lineCap = 'round'; g.lineJoin = 'round';
  const branch = (col, wd) => { g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); g.moveTo(0, 170); g.bezierCurveTo(80, 150, 160, 120, 270, 70); g.stroke(); g.lineWidth = wd * 0.5; g.beginPath(); g.moveTo(120, 140); g.quadraticCurveTo(170, 170, 230, 190); g.stroke(); };
  const along = t => [lerp(0, 270, t), lerp(170, 70, t) - Math.sin(t * Math.PI) * 25];
  if (type === 'pine') {
    branch('#17160f', 16);
    for (let k = 0; k < 9; k++) { const [x, y] = along(0.25 + k * 0.085); g.fillStyle = 'rgba(16,18,12,0.9)'; g.beginPath(); g.ellipse(x, y - 8, 34, 12, -0.25, 0, TAU); g.fill(); g.strokeStyle = 'rgba(16,18,12,0.85)'; g.lineWidth = 2; g.beginPath(); for (let q = 0; q < 14; q++) { const a = Math.PI + q / 13 * Math.PI; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 36, y + Math.sin(a) * 18); } g.stroke(); }
  } else if (type === 'maple') {
    branch('#2a140c', 12);
    for (let k = 0; k < 40; k++) { const [x, y] = along(0.2 + r() * 0.8); const lx = x + (r() - 0.5) * 70, ly = y + (r() - 0.5) * 60, s = 10 + r() * 9; g.fillStyle = r() < 0.5 ? 'rgba(186,48,28,0.92)' : 'rgba(214,92,38,0.9)'; g.beginPath(); for (let j = 0; j < 10; j++) { const a = j * TAU / 10 - Math.PI / 2, rr = j % 2 ? s * 0.45 : s; j ? g.lineTo(lx + Math.cos(a) * rr, ly + Math.sin(a) * rr) : g.moveTo(lx + Math.cos(a) * rr, ly + Math.sin(a) * rr); } g.closePath(); g.fill(); }
  } else if (type === 'blossom') {
    branch('#3a2420', 11);
    for (let k = 0; k < 34; k++) { const [x, y] = along(0.15 + r() * 0.85); const bx_ = x + (r() - 0.5) * 50, by_ = y + (r() - 0.5) * 44, s = 6 + r() * 6; g.fillStyle = r() < 0.5 ? 'rgba(244,184,196,0.95)' : 'rgba(232,134,156,0.92)'; for (let j = 0; j < 5; j++) { const a = j * TAU / 5; g.beginPath(); g.ellipse(bx_ + Math.cos(a) * s * 0.6, by_ + Math.sin(a) * s * 0.6, s * 0.55, s * 0.38, a, 0, TAU); g.fill(); } g.fillStyle = 'rgba(250,240,200,0.95)'; g.beginPath(); g.arc(bx_, by_, s * 0.22, 0, TAU); g.fill(); }
  } else if (type === 'twig') {
    g.strokeStyle = 'rgba(12,12,14,0.92)'; deadTree(g, 20, 280, 6, r); g.save(); g.translate(60, 290); g.rotate(0.6); deadTree(g, 0, 0, 4, r); g.restore();
  } else if (type === 'flag') {
    // two strings of prayer flags sagging across the corner of the view
    for (const [y0, y1, n] of [[50, 120, 10], [150, 220, 9]]) {
      const P = t => [300 * t, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y1 + 40) + t * t * (y1 - 30)];
      g.strokeStyle = 'rgba(30,26,22,0.85)'; g.lineWidth = 2; g.beginPath();
      for (let k = 0; k <= 20; k++) { const p = P(k / 20); k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
      g.stroke();
      for (let k = 1; k < n; k++) {
        const [x, y] = P(k / n), sw = (r() - 0.5) * 6;
        g.fillStyle = FLAGC[k % 5]; g.globalAlpha = 0.92;
        g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 10, y); g.lineTo(x + 12 + sw, y + 30); g.lineTo(x - 8 + sw, y + 31); g.closePath(); g.fill();
      }
      g.globalAlpha = 1;
    }
  } else {
    for (let k = 0; k < 8; k++) softBlob(g, 40 + r() * 220, 90 + r() * 120, 60 + r() * 60, [255, 255, 255], type === 'spray' ? 0.75 : 0.85);
  }
  return (FGS[type] = { c, w, h });
}
function updFg(dt) {
  const type = THEME[sceneIdx].fg;
  fgNext -= dt;
  if (type && fgNext <= 0 && state === 'play') {
    fgNext = rand(2.6, 5.4);
    const last = fgItems[fgItems.length - 1], side = last ? -last.side : (Math.random() < 0.5 ? -1 : 1), sc = rand(0.85, 1.25);
    fgItems.push({ type, side, sc, la: (H / 2 + 30 * pxu) / pxu + cam.alt * 1.7 + 300 * sc, rot: rand(-0.35, 0.35), a: rand(0.5, 0.72) });
  }
  for (let i = fgItems.length - 1; i >= 0; i--) {
    const f = fgItems[i], y = H / 2 - (f.la - cam.alt * 1.7) * pxu;
    if (y > H + 40 * pxu || (state !== 'play' && state !== 'dying')) fgItems.splice(i, 1);
  }
}
function drawFg() {
  for (const f of fgItems) {
    const s = fgSprite(f.type), w = s.w * f.sc * pxu, h = s.h * f.sc * pxu, y = H / 2 - (f.la - cam.alt * 1.7) * pxu;
    const x = f.side < 0 ? -w * 0.7 : W - w * 0.3;
    ctx.save(); ctx.globalAlpha = f.a; ctx.translate(x + w / 2, y + h / 2); ctx.rotate(f.rot * f.side); if (f.side > 0) ctx.scale(-1, 1);
    ctx.drawImage(s.c, -w / 2, -h / 2, w, h); ctx.restore();
  }
}
function drawBuddhaLight() {
  if (sceneIdx !== 3 || !nB || state !== 'play') return;
  const R = flock.r + 95 + Math.sin(T * 1.3) * 6, cols = [[230, 90, 80], [236, 170, 80], [232, 220, 110], [120, 190, 120], [100, 150, 220], [140, 110, 200]];
  ctx.globalAlpha = 0.16 * sceneFade; ctx.drawImage(glowW, flock.cx - R * 0.9, flock.cy - R * 0.9, R * 1.8, R * 1.8);
  ctx.lineWidth = 5;
  for (let k = 0; k < 6; k++) { ctx.globalAlpha = 0.15 * sceneFade; ctx.strokeStyle = rgba(cols[k]); ctx.beginPath(); ctx.arc(flock.cx, flock.cy, R - k * 5, 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
// crossing into a new heaven: a bank of cloud closes behind the cliffs, the scenery is swapped while hidden, then the clouds part
const GATE_IN = 0.32, GATE_OUT = 1.58;
function drawGateFog(k) {
  if (gateT <= 0) return;
  const a = gateT < GATE_IN ? gateT / GATE_IN : Math.max(0, 1 - (gateT - GATE_IN) / GATE_OUT);
  ctx.globalAlpha = a * k * 0.75; ctx.fillStyle = rgba(PN.mist); ctx.fillRect(0, 0, W, H);
  if (k > 0.5 && cloudList.length) {
    const part = Math.max(0, gateT - GATE_IN) * 0.55 * W, w = W * 1.1, h = w * 0.48;
    ctx.globalAlpha = Math.min(1, a * 1.4) * k;
    for (let q = 0; q < 6; q++) {
      const side = q & 1 ? 1 : -1;
      ctx.drawImage(tinted(cloudList[q & 3], PN.mist), W / 2 + side * (W * 0.12 + part + w * 0.25) - w / 2, H * (0.1 + q * 0.16) - h / 2, w, h);
    }
  }
  ctx.globalAlpha = 1;
}
const sceneReady = () => { const S = SCN[sceneIdx]; return !!S && S.i >= S.jobs.length; };
function updScene(dt) {
  const want = state === 'title' || state === 'intro' ? 0 : stageIdx(cam.alt);
  if (pendScene < 0 && want !== sceneIdx) {
    if (want === sceneIdx + 1 && state === 'play') { pendScene = want; gateT = 0.001; }
    else { stepScene(want, true); sceneIdx = want; sceneFade = 1; freeScenes(false); }
  }
  if (gateT > 0) {
    gateT += dt;
    if (pendScene >= 0 && gateT >= GATE_IN) { stepScene(pendScene, true); sceneIdx = pendScene; pendScene = -1; sceneFade = 0; freeScenes(false); }
    if (gateT > GATE_IN + GATE_OUT) gateT = 0;
  }
  if (sceneFade < 1) sceneFade = Math.min(1, sceneFade + dt * 0.6);
  if (stepScene(sceneIdx, false)) stepScene(sceneIdx + 1, false);
  if (bgFlash > 0) bgFlash = Math.max(0, bgFlash - dt * 1.6);
  if (sceneIdx === 4 && state === 'play') { bgFlashNext -= dt; if (bgFlashNext <= 0) { bgFlashNext = rand(3.5, 7); bgFlash = 0.8; AU.rumble(); } }
}
function resetScene() {
  dragon.st = 0; dragon.next = 6; meteors.length = 0; meteorNext = 4;
  flyers.length = 0; lanterns.length = 0; fgItems.length = 0; fgNext = 3;
  gateT = 0; pendScene = -1; bgFlash = 0; bgFlashNext = 3;
}

/* ----- details on the near cliffs, one kind per heaven ----- */
const TREEK = [0, 0, 0, 0, 3, 2, 0, 0, 1];
function lantern(g, x, y) {
  softBlob(g, x, y + 5, 16, [255, 150, 70], 0.55);
  g.globalAlpha = 0.9; g.strokeStyle = 'rgba(40,20,10,0.8)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x, y + 1); g.stroke();
  g.fillStyle = '#c23a26'; g.beginPath(); g.ellipse(x, y + 5, 3.4, 4.4, 0, 0, TAU); g.fill();
  g.fillStyle = '#e7b04a'; g.fillRect(x - 2, y + 0.6, 4, 1); g.fillRect(x - 2, y + 9, 4, 1);
}
function cliffSpecial(g, si, a, side, edge, r, P) {
  const ex = edge(a), y = -a, ink = rgba(P.ink), into = side, out = -side;
  g.globalAlpha = 1; g.strokeStyle = ink;
  switch (si) {
    case 1:
      if (r() < 0.65) {
        const n = 6 + ((r() * 4) | 0), x0 = ex + into * (8 + r() * 18), dx = into * (9 + r() * 4), dy = -(5 + r() * 3);
        g.lineWidth = 1; g.fillStyle = rgba(mixC(P.rockA, P.ink, 0.5));
        for (let k = 0; k < n; k++) {
          const px = x0 + dx * k, py = y + dy * k;
          g.globalAlpha = 0.85; g.fillRect(px - 6, py - 2, 12, 3);
          g.globalAlpha = 0.55; g.beginPath(); g.moveTo(px, py + 1); g.lineTo(px - into * 5, py + 12); g.stroke();
        }
        g.globalAlpha = 0.5; g.beginPath(); g.moveTo(x0 - 4, y - 7); g.lineTo(x0 + dx * (n - 1) + 4, y + dy * (n - 1) - 7); g.stroke();
        if (r() < 0.8) { const k = 1 + ((r() * (n - 2)) | 0); lantern(g, x0 + dx * k, y + dy * k - 12); }
      } else {
        const x = ex + into * (10 + r() * 12), s = 0.8 + r() * 0.3;
        g.lineWidth = 1.1; g.globalAlpha = 0.8;
        for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + k * 9 * s, y); g.lineTo(x + k * 9 * s + out * 4, y + (26 + r() * 18) * s); g.stroke(); }
        drawPavilion(g, x, y, s, P.ink);
      }
      break;
    case 2: {
      const x = ex + into * (2 + r() * 6), len = 40 + r() * 70, gr = g.createLinearGradient(0, y, 0, y + len);
      gr.addColorStop(0, 'rgba(248,250,248,0.85)'); gr.addColorStop(1, 'rgba(248,250,248,0)');
      g.strokeStyle = gr; g.lineWidth = 1.6 + r() * 1.6; g.globalAlpha = 1;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + out * 6, y + len * 0.4, x + out * (3 + r() * 6), y + len); g.stroke();
      g.fillStyle = rgba(mixC(P.ink, [70, 110, 70], 0.5), 0.6);
      for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(ex + into * r() * 14, y + (r() - 0.5) * 20, 1.2 + r() * 2, 0, TAU); g.fill(); }
      break;
    }
    case 3:
      if (r() < 0.4) drawPavilion(g, ex + into * 16, y, 0.75, P.ink);
      softBlob(g, ex + out * (10 + r() * 30), y + 10, 50 + r() * 40, P.mist, 0.55);
      break;
    case 4:
      g.save(); g.translate(ex, y); g.rotate(out * (0.7 + r() * 0.4)); g.globalAlpha = 0.85; deadTree(g, 0, 0, 0.8 + r() * 0.5, r); g.restore();
      break;
    case 5:
      if (r() < 0.3) pagoda(g, ex + into * 18, y, 7 + r() * 3, 4 + ((r() * 3) | 0), rgba(mixC(P.ink, P.rockA, 0.3), 0.9));
      else for (let k = 0; k < 16; k++) { g.globalAlpha = 0.85; g.fillStyle = r() < 0.5 ? '#b8341e' : '#d8692a'; g.beginPath(); g.arc(ex + into * (r() * 26 - 4), y + (r() - 0.5) * 26, 1.6 + r() * 2.6, 0, TAU); g.fill(); }
      break;
    case 6: {
      const x = ex + into * (14 + r() * 30);
      softBlob(g, x, y, 18, LAMP, 0.6);
      g.globalAlpha = 0.95; g.fillStyle = 'rgba(255,214,140,0.95)'; g.fillRect(x - 2, y - 3, 4, 5);
      break;
    }
    case 7: {
      const x = ex + out * 2, len = 30 + r() * 60;
      g.strokeStyle = rgba(P.ink, 0.8); g.lineWidth = 1;
      for (let d = 0; d < len; d += 5) { g.beginPath(); g.ellipse(x + out * d * 0.12, y + d, 1.6, 2.6, ((d / 5) | 0) % 2 ? 0 : Math.PI / 2, 0, TAU); g.stroke(); }
      break;
    }
    case 8:
      if (r() < 0.5) drawPavilion(g, ex + into * 14, y, 0.8, GOLD);
      else softBlob(g, ex + out * 8, y, 26, [255, 214, 120], 0.45);
      break;
    default: break;
  }
  g.globalAlpha = 1;
}

/* ----- prayer flags & broken bridges ----- */
const FLAGC = ['#4f74a0', '#ece6d4', '#b2463a', '#5d8656', '#d2aa48'];
function drawFlags() {
  const wind = 0.4 + gust.k * 1.4, dir = gust.k > 0.1 ? gust.dir : 1;
  for (const o of actObs) {
    if (o.t !== 7 || !onScreen(o.y, 80)) continue;
    ctx.strokeStyle = rgba(PN.ink, 0.7); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(o.x0, o.y); ctx.quadraticCurveTo((o.x0 + o.x1) / 2, o.y + o.sag * 2, o.x1, o.y); ctx.stroke();
    ctx.globalAlpha = 0.88;
    for (let k = 1; k < o.n; k++) {
      const t = k / o.n, x = lerp(o.x0, o.x1, t), y = o.y + 4 * o.sag * t * (1 - t), fl = Math.sin(T * 7 + k * 1.3) * (4 + 7 * wind) * dir;
      ctx.fillStyle = FLAGC[k % 5]; ctx.beginPath(); ctx.moveTo(x - 4.5, y); ctx.lineTo(x + 4.5, y); ctx.lineTo(x + 4.5 + fl, y + 13); ctx.lineTo(x - 4.5 + fl * 0.8, y + 14); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
function drawBridge(g, o) {
  palAt(-o.y, PT);
  const r = makeRng(o.seed), ink = rgba(PT.ink), stone = rgba(mixC(PT.rockB, PT.mist, 0.15)), y = o.y;
  for (const [xa, xb, left] of [[o.L, o.gx0, true], [o.gx1, o.R, false]]) {
    const wall = left ? xa : xb, end = left ? xb : xa, dir = left ? 1 : -1;
    g.fillStyle = stone; g.strokeStyle = ink; g.lineWidth = 1.6; g.globalAlpha = 1;
    g.beginPath(); g.moveTo(wall, y - 9); g.lineTo(end - dir * 6, y - 9); g.lineTo(end, y - 3); g.lineTo(end - dir * 4, y + 3); g.lineTo(end + dir * 1, y + 9); g.lineTo(end - dir * 10, y + 14);
    g.quadraticCurveTo(wall + dir * Math.abs(end - wall) * 0.35, y + 18, wall, y + 64); g.closePath(); g.fill(); g.stroke();
    g.globalAlpha = 0.45; g.lineWidth = 0.8;
    for (let x = wall + dir * 14; dir * (end - x) > 10; x += dir * 16) { g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x, y + 9); g.stroke(); }
    g.globalAlpha = 0.9; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(wall, y - 16); g.lineTo(end - dir * 8, y - 16); g.stroke();
    for (let x = wall + dir * 8; dir * (end - x) > 12; x += dir * 15) { g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x, y - 19); g.stroke(); }
    g.fillStyle = stone; g.globalAlpha = 0.85;
    for (let k = 0; k < 3; k++) { const fx = end - dir * (4 + r() * 10), fy = y + 22 + k * 18 + r() * 8, fs = 3 + r() * 3; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + fs, fy + fs * 0.4); g.lineTo(fx + fs * 0.4, fy + fs); g.closePath(); g.fill(); g.stroke(); }
  }
  g.globalAlpha = 1;
}

/* ----- the thunder dragon ----- */
// the dragon's path is anchored to the view, so the warning line stays where the flock is while the gorge scrolls
const dragon = { st: 0, t: 0, next: 6, dir: 1, oy: 0, amp: 70, k: 0.01, ph: 0, hx: 0, kills: 0, cap: 0, pts: [] };
const DR_N = 44, DR_LEN = 1100;
const dragonY = x => camY + dragon.oy + dragon.amp * Math.sin(x * dragon.k + dragon.ph) + 18 * Math.sin(x * dragon.k * 2.7 + dragon.ph * 1.3);
function dragonPts() {
  const P = dragon.pts;
  P.length = 0;
  for (let i = 0; i <= DR_N; i++) {
    const u = i / DR_N, x = dragon.hx - dragon.dir * (1 - u) * DR_LEN;
    const r = u > 0.93 ? 17 : u > 0.86 ? 15 : 5 + 17 * Math.pow(u / 0.86, 0.7);
    P.push([x, dragonY(x) + Math.sin(T * 5 - u * 7) * 9 * (1 - u), r]);
  }
  return P;
}
function spawnDragon() {
  dragon.st = 1; dragon.t = 0; dragon.dir = Math.random() < 0.5 ? 1 : -1;
  dragon.oy = clamp(flock.cy - camY + rand(-50, 50), -viewH * 0.3, viewH * 0.22);
  dragon.amp = rand(45, 85); dragon.k = rand(0.008, 0.013); dragon.ph = rand(0, TAU);
  dragon.rider = !fabs[4].st;
  AU.roar(); toast('dragon', '云中有龙，看清它的来路再闪开');
}
function updDragon(dt) {
  if (dragon.st === 0) {
    if (sceneIdx !== 4 || state !== 'play' || !nB) return;
    dragon.next -= dt;
    if (dragon.next <= 0) spawnDragon();
    return;
  }
  dragon.t += dt;
  AU.tense(1);
  if (dragon.st === 1) {
    if (dragon.t > 1.6) { dragon.st = 2; dragon.t = 0; dragon.hx = cam.x - dragon.dir * (viewW / 2 + 60); dragon.kills = 0; dragon.near = 0; dragon.cap = Math.max(4, Math.floor(nB * 0.16)); shakeA = RM ? 2 : 7; bgFlash = 1; AU.thunder(); dragonPts(); }
    return;
  }
  dragon.hx += dragon.dir * 780 * dt;
  const P = dragonPts();
  if (Math.abs(flock.cy - (camY + dragon.oy)) < dragon.amp + 140) dragon.near = 1;
  if (!shielded() && dragon.kills < dragon.cap) {
    const yc = camY + dragon.oy, lo = yc - dragon.amp - 60, hi = yc + dragon.amp + 60;
    for (let i = 0; i < nB && dragon.kills < dragon.cap; i++) {
      if (bdead[i] || by[i] < lo || by[i] > hi) continue;
      for (let q = 0; q < P.length; q += 2) { const dx = bx[i] - P[q][0], dy = by[i] - P[q][1], rr = P[q][2] + 3; if (dx * dx + dy * dy < rr * rr) { bdead[i] = 6; dragon.kills++; break; } }
    }
  }
  if (dragon.dir * (dragon.hx - cam.x) > viewW / 2 + DR_LEN + 120) { dragon.st = 0; dragon.next = rand(9, 13); if (!dragon.kills && dragon.near) { dodgeBonus(22); if (dragon.rider && state === 'play') collectFable(fabs[4]); } }
}
function drawDragon() {
  if (dragon.st === 1) {
    const ex = cam.x - dragon.dir * (viewW / 2 - 26), ey = dragonY(ex), pulse = 0.5 + 0.5 * Math.sin(dragon.t * 12);
    ctx.globalAlpha = 0.25 + 0.2 * pulse; ctx.setLineDash([10, 12]); ctx.strokeStyle = 'rgba(214,170,72,0.9)'; ctx.lineWidth = 2.2; ctx.beginPath();
    for (let x = -viewW / 2 - 40; x <= viewW / 2 + 40; x += 16) { const wx = cam.x + x, yy = dragonY(wx); x === -viewW / 2 - 40 ? ctx.moveTo(wx, yy) : ctx.lineTo(wx, yy); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 0.6 + 0.4 * pulse;
    for (const s of [-7, 7]) ctx.drawImage(glowGold, ex - 9, ey + s - 9, 18, 18);
    ctx.globalAlpha = 1;
    return;
  }
  if (dragon.st !== 2 || !dragon.pts.length) return;
  const P = dragon.pts, R = P.map(p => p[2]);
  paintDragon(ctx, P, R, 'rgba(14,17,22,0.96)', 'rgba(170,184,198,' + (0.35 + bgFlash * 0.4) + ')', 1, 'rgba(150,136,96,0.9)');
  const cl = tinted(glowSpr, PN.mist);
  ctx.globalAlpha = 0.55;
  for (let i = 4; i < P.length - 6; i += 9) { const s = 46 + (i % 3) * 14; ctx.drawImage(cl, P[i][0] - s, P[i][1] - s * 0.45 + 6, s * 2, s * 1.1); }
  ctx.globalAlpha = 1;
  if (dragon.rider) drawRider(P);
}
/* ----- meteors ----- */
const meteors = [];
let meteorNext = 4;
const MET_SP = 1500, MET_R = 20;
function spawnMeteor() {
  const tx = flock.cx + rand(-70, 70), ty = flock.cy + rand(-60, 60), side = Math.random() < 0.5 ? -1 : 1, ang = rand(1.0, 1.25), ux = -side * Math.cos(ang), uy = Math.sin(ang);
  meteors.push({ st: 0, t: 0, s: 0, cy: camY, x0: tx - ux * 820, y0: ty - uy * 820, x1: tx + ux * 520, y1: ty + uy * 520, hx: 0, hy: 0, kills: 0, cap: Math.max(3, Math.floor(nB * 0.1)) });
  AU.tense(0.5); toast('meteor', '流星划过之前，天上会先亮起一道细线');
}
function updMeteors(dt) {
  if (sceneIdx === 6 && state === 'play' && nB) { meteorNext -= dt; if (meteorNext <= 0) { meteorNext = rand(3.4, 5.8); spawnMeteor(); } }
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i], dy = camY - m.cy;
    m.cy = camY; m.y0 += dy; m.y1 += dy; m.t += dt;
    if (m.st === 0) { if (m.t > 0.95) { m.st = 1; m.t = 0; m.s = 0; AU.meteor(); } continue; }
    const len = Math.hypot(m.x1 - m.x0, m.y1 - m.y0), ux = (m.x1 - m.x0) / len, uy = (m.y1 - m.y0) / len, s0 = m.s, s1 = m.t * MET_SP;
    if (s0 >= len) { if (!m.kills && m.near) dodgeBonus(12); meteors.splice(i, 1); continue; }
    m.s = s1; m.hx = m.x0 + ux * Math.min(s1, len); m.hy = m.y0 + uy * Math.min(s1, len);
    if (Math.random() < 0.6) spawnP(P_SPARK, m.hx, m.hy, rand(-60, 60), rand(-60, 60), rand(0.3, 0.6), rand(6, 10));
    if (Math.hypot(flock.cx - m.hx, flock.cy - m.hy) < flock.r + 140) m.near = 1;
    if (shielded()) continue;
    // swept test: everything within MET_R of the stretch of path covered this frame
    for (let j = 0; j < nB && m.kills < m.cap; j++) {
      if (bdead[j]) continue;
      const rx = bx[j] - m.x0, ry = by[j] - m.y0, along = rx * ux + ry * uy;
      if (along < s0 - MET_R || along > s1 + MET_R) continue;
      if (Math.abs(rx * uy - ry * ux) < MET_R) { bdead[j] = 7; m.kills++; }
    }
  }
}
function drawMeteors() {
  for (const m of meteors) {
    if (m.st === 0) {
      ctx.globalAlpha = 0.18 + 0.22 * m.t; ctx.strokeStyle = 'rgba(200,220,255,0.9)'; ctx.lineWidth = 1.4; ctx.setLineDash([6, 10]);
      ctx.beginPath(); ctx.moveTo(m.x0, m.y0); ctx.lineTo(m.x1, m.y1); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      continue;
    }
    const dx = m.x1 - m.x0, dy = m.y1 - m.y0, L = Math.hypot(dx, dy), tx = m.hx - dx / L * 260, ty = m.hy - dy / L * 260;
    const gr = ctx.createLinearGradient(tx, ty, m.hx, m.hy); gr.addColorStop(0, 'rgba(180,200,255,0)'); gr.addColorStop(1, 'rgba(240,246,255,0.95)');
    ctx.strokeStyle = gr; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(m.hx, m.hy); ctx.stroke();
    ctx.drawImage(glowW, m.hx - 26, m.hy - 26, 52, 52);
  }
}

/* ----- the lone peak that splits the gorge at a fork, drawn into the cliff tiles ----- */
function drawIsland(ch) {
  const g = ch.g, aT = chunkTop(ch.k) + 30, aB = ch.k * CH - 30, L = [], R = [];
  for (let a = aB; a <= aT; a += 4) { walls(a); if (W_IL < W_IR - 0.5) { L.push([W_IL, -a]); R.push([W_IR, -a]); } }
  if (L.length < 2) return;
  const P = L.concat(R.slice().reverse()), top = -L[L.length - 1][1], bot = -L[0][1];
  g.save();
  tracePts(g, P); g.fillStyle = vGrad(g, top, bot, 'rockB', 1); g.globalAlpha = 1; g.fill();
  tracePts(g, P); g.clip();
  g.strokeStyle = vGrad(g, top, bot, 'rockA', 1);
  for (const E of [L, R]) for (const [wd, al] of [[60, 0.1], [32, 0.16], [14, 0.24]]) {
    g.globalAlpha = al; g.lineWidth = wd; g.beginPath(); E.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  }
  const r = makeRng(seedOf(ch.k, SEED + 557));
  g.strokeStyle = vGrad(g, top, bot, 'ink', 1);
  for (let q = 0; q < 26; q++) {
    const i = (r() * L.length) | 0, x = lerp(L[i][0], R[i][0], 0.15 + r() * 0.7), y = L[i][1], len = 8 + r() * 22;
    g.globalAlpha = 0.14 + r() * 0.22; g.lineWidth = 0.6 + r() * 1.2;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 4, y + len * 0.5, x + (r() - 0.5) * 6, y + len); g.stroke();
  }
  g.restore();
  g.strokeStyle = vGrad(g, top, bot, 'ink', 1);
  for (const E of [L, R]) for (let i = 0; i < E.length - 1; i += 3) {
    const v = 0.5 + 0.5 * vnoise(-E[i][1] / 70, SEED + (E === L ? 207 : 209));
    g.globalAlpha = 0.58 + 0.38 * v; g.lineWidth = 1.5 + 3 * v;
    g.beginPath(); g.moveTo(E[i][0], E[i][1]); for (let q = i + 1; q <= Math.min(E.length - 1, i + 3); q++) g.lineTo(E[q][0], E[q][1]); g.stroke();
  }
  g.globalAlpha = 1;
  // the crown of the peak: a pine where the two flanks meet
  walls(top + 6);
  if (!(W_IL < W_IR)) { palAt(top, PT); padPine(g, (L[L.length - 1][0] + R[R.length - 1][0]) / 2, -top + 2, 1.4, PT.ink, r); }
}
