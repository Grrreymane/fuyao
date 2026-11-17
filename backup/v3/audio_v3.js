/* ================= audio: a guzheng ensemble that grows with every heaven ================= */
const AU = (() => {
  let C = null, master = null, dry = null, wet = null, ok = false, muted = false, noise = null;
  let windG = null, windF = null, rainG = null, waterG = null, pad = null;
  const NOTES = [110, 123.47, 146.83, 164.81, 185, 220, 246.94, 293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.26, 739.99, 880, 987.77, 1174.66, 1318.51, 1479.98, 1760, 1975.53, 2349.32];
  const PCS = NOTES.map((_, i) => [3, 4, 0, 1, 2][i % 5]);
  const TOP = NOTES.length - 1;
  const ks = new Map();
  // arrangement per heaven: z zheng, x xiao, l lun-zhi tremolo, d big drum, w war drums, e erhu, b bells, g gong, c choir
  const ARR = [
    { t: 68, z: 1, x: 0, l: 0, d: 0, w: 0, e: 0, b: 0, g: 0, c: 0 },
    { t: 76, z: 2, x: 1, l: 0, d: 0, w: 0, e: 0, b: 0, g: 0, c: 0 },
    { t: 84, z: 2, x: 1, l: 1, d: 1, w: 0, e: 0, b: 0, g: 0, c: 0 },
    { t: 92, z: 2, x: 1, l: 1, d: 2, w: 0, e: 0, b: 0, g: 1, c: 0 },
    { t: 102, z: 3, x: 0, l: 2, d: 2, w: 2, e: 0, b: 0, g: 1, c: 0 },
    { t: 108, z: 2, x: 1, l: 1, d: 2, w: 1, e: 1, b: 0, g: 1, c: 0 },
    { t: 86, z: 1, x: 1, l: 0, d: 1, w: 0, e: 0, b: 2, g: 0, c: 1 },
    { t: 126, z: 3, x: 1, l: 2, d: 3, w: 2, e: 1, b: 0, g: 2, c: 0 },
    { t: 112, z: 3, x: 1, l: 2, d: 3, w: 1, e: 2, b: 1, g: 2, c: 2 }
  ];
  const ARR_WIN = { t: 72, z: 2, x: 1, l: 0, d: 0, w: 0, e: 0, b: 1, g: 0, c: 1 };
  const PROG = [[0, 3, 4, 1], [0, 2, 3, 3], [0, 4, 3, 1], [0, 3, 1, 4]];
  const RHY = [[[0, 6], [6, 2], [8, 8]], [[0, 4], [4, 4], [8, 4], [12, 4]], [[0, 8], [8, 6], [14, 2]], [[0, 12], [12, 4]], [[0, 3], [3, 1], [4, 4], [8, 8]], [[0, 16]]];
  const mus = { on: false, A: ARR[0], pend: null, next: 0, step: 0, tempo: 68, tgt: 68, mode: 4, tonic: 1, prog: PROG[0], phA: [], phB: [], lastF: 0, tense: 0, low: false, zi: 10 };
  let joinQ = 0, joinNext = 0, joinI = 9, lastLose = 0;
  /*DEBUG*/let meter = null, nVoices = 0;/*/DEBUG*/
  try { muted = localStorage.getItem('fy-mute') === '1'; } catch (e) { muted = false; }
  const droneIdx = m => PCS.indexOf(m);
  function impulse(dur, dec) {
    const sr = C.sampleRate, n = Math.floor(sr * dur), b = C.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch); let lp = 0;
      for (let i = 0; i < n; i++) { const t = i / n; lp += (Math.random() * 2 - 1 - lp) * (0.92 - 0.8 * t); d[i] = lp * Math.pow(1 - t, dec); }
    }
    return b;
  }
  function route(node, pan, w) {
    /*DEBUG*/nVoices++;/*/DEBUG*/
    let n = node;
    if (C.createStereoPanner) { const p = C.createStereoPanner(); p.pan.value = clamp(pan || 0, -1, 1); node.connect(p); n = p; }
    n.connect(dry);
    if (w > 0) { const g = C.createGain(); g.gain.value = w; n.connect(g); g.connect(wet); }
  }
  function loopNoise(type, f, q) {
    const s = C.createBufferSource(); s.buffer = noise; s.loop = true;
    const fl = C.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = C.createGain(); g.gain.value = 0;
    s.connect(fl); fl.connect(g); g.connect(dry); s.start();
    return [g, fl];
  }
  function init() {
    if (C) { if (C.state === 'suspended') C.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { C = new AC(); } catch (e) { C = null; return; }
    master = C.createGain(); master.gain.value = muted ? 0 : 0.85;
    const comp = C.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.25;
    master.connect(comp); comp.connect(C.destination);
    /*DEBUG*/meter = C.createAnalyser(); meter.fftSize = 2048; comp.connect(meter);/*/DEBUG*/
    dry = C.createGain(); dry.connect(master);
    const rev = C.createConvolver(); rev.buffer = impulse(3.4, 2.6);
    wet = C.createGain(); wet.connect(rev);
    const rg = C.createGain(); rg.gain.value = 0.5; rev.connect(rg); rg.connect(master);
    noise = C.createBuffer(1, C.sampleRate * 2, C.sampleRate);
    const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    [windG, windF] = loopNoise('bandpass', 500, 0.7);
    [rainG] = loopNoise('highpass', 2400, 0.4);
    [waterG] = loopNoise('lowpass', 780, 0.5);
    pad = makePad();
    ok = true;
    if (C.state === 'suspended') C.resume().catch(() => {});
  }
  function makePad() {
    const g = C.createGain(); g.gain.value = 0;
    const f = C.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 620; f.Q.value = 0.4;
    f.connect(g); g.connect(dry);
    const s2 = C.createGain(); s2.gain.value = 0.6; g.connect(s2); s2.connect(wet);
    const os = [['sine', 0.5, 0.5], ['triangle', 1, 0.32], ['triangle', 1.5, 0.2]].map(([type, m, a]) => {
      const o = C.createOscillator(); o.type = type; o.frequency.value = 123.47 * m;
      const og = C.createGain(); og.gain.value = a; o.connect(og); og.connect(f); o.start(); return [o, m];
    });
    const lfo = C.createOscillator(); lfo.frequency.value = 0.07; const lg = C.createGain(); lg.gain.value = 160; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    return { g, os };
  }
  function ksBuf(i) {
    let e = ks.get(i);
    if (e) return e;
    const f = NOTES[i], sr = C.sampleRate, N = Math.max(2, Math.floor(sr / f - 0.5)), actual = sr / (N + 0.5);
    const dur = clamp(3.2 - i * 0.1, 1.0, 3.2), len = Math.floor(sr * dur);
    const b = C.createBuffer(1, len, sr), out = b.getChannelData(0), d = new Float32Array(N);
    let lp = 0;
    for (let k = 0; k < N; k++) { lp += 0.55 * ((Math.random() * 2 - 1) - lp); d[k] = lp; }
    const pp = Math.max(1, Math.floor(N * 0.12));
    for (let k = N - 1; k >= pp; k--) d[k] -= 0.6 * d[k - pp];
    const T60 = clamp(2.6 - i * 0.07, 0.8, 2.6), gl = Math.pow(10, -3 / (actual * T60));
    let idx = 0;
    for (let n = 0; n < len; n++) { const nx = idx + 1 === N ? 0 : idx + 1, a = d[idx]; out[n] = a; d[idx] = (a + d[nx]) * 0.5 * gl; idx = nx; }
    let mx = 0; for (let n = 0; n < Math.min(len, 6000); n++) mx = Math.max(mx, Math.abs(out[n]));
    const sc = 0.9 / (mx || 1), fade = Math.floor(sr * 0.05);
    for (let n = 0; n < len; n++) out[n] *= sc * (n > len - fade ? (len - n) / fade : 1);
    e = { b, rate: f / actual, dur };
    ks.set(i, e);
    return e;
  }
  function pluck(i, vel, pan, when, o) {
    if (!ok) return;
    i = clamp(i | 0, 0, TOP);
    const e = ksBuf(i), t = Math.max(when || 0, C.currentTime);
    const s = C.createBufferSource(); s.buffer = e.b; s.playbackRate.value = e.rate;
    if (o && o.bend) { s.playbackRate.setValueAtTime(e.rate, t + 0.09); s.playbackRate.linearRampToValueAtTime(e.rate * Math.pow(2, o.bend / 12), t + 0.26); }
    const g = C.createGain(), v = vel * 0.55;
    g.gain.value = v;
    let end = t + e.dur;
    if (o && o.dur) { end = t + Math.min(o.dur, e.dur); g.gain.setValueAtTime(v, t + o.dur * 0.5); g.gain.linearRampToValueAtTime(0.0001, end); }
    s.connect(g); route(g, pan, o && o.wet !== undefined ? o.wet : 0.45);
    s.start(t); s.stop(end + 0.05);
  }
  function bell(f, vel, when, pan, short) {
    if (!ok) return;
    const t = Math.max(when || 0, C.currentTime), sc = short ? 0.35 : 1;
    const bus = C.createGain(); bus.gain.value = vel * 0.2; route(bus, pan, 0.7);
    for (const [m, a, d] of [[1, 1, 3.6], [2.01, 0.55, 2.4], [2.76, 0.4, 1.7], [4.07, 0.22, 1.1], [5.43, 0.13, 0.8], [6.79, 0.07, 0.55]]) {
      const o = C.createOscillator(); o.type = 'sine'; o.frequency.value = f * m * (1 + (Math.random() - 0.5) * 0.002);
      const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d * sc);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + d * sc + 0.05);
    }
  }
  function nburst(t, dur, type, f0, f1, q, vol, pan, w) {
    const s = C.createBufferSource(); s.buffer = noise; s.loop = true; s.playbackRate.value = 0.7 + Math.random() * 0.6;
    const f = C.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q;
    const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.04, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); route(g, pan, w); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  function boom(t, f0, f1, d, v) {
    const o = C.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.8);
    const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); route(g, 0, 0.15); o.start(t); o.stop(t + d + 0.05);
  }
  function gliss(lo, hi, t0, dt, vel, down) {
    const n = Math.max(1, hi - lo);
    for (let k = 0; k <= n; k++) pluck(down ? hi - k : lo + k, vel * (0.6 + 0.4 * k / n), (k / n - 0.5) * 0.8, t0 + k * dt, { wet: 0.55 });
  }
  function trem(i, t0, dur, vel) { for (let t = 0; t < dur; t += 0.056) pluck(i, vel * (0.7 + Math.random() * 0.3) * (1 - t / dur * 0.4), 0, t0 + t, { dur: 0.5 }); }
  function bigDrum(t, v) { boom(t, 92, 44, 0.62, v); nburst(t, 0.08, 'lowpass', 700, 200, 0.7, v * 0.35, 0, 0.2); }
  function tom(t, f, v, pan) { boom(t, f, f * 0.55, 0.24, v); nburst(t, 0.045, 'bandpass', 1800, 900, 1, v * 0.25, pan || 0, 0.1); }
  function wood(t, v) {
    const o = C.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(1250, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.05);
    const g = C.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); route(g, 0.35, 0.2); o.start(t); o.stop(t + 0.09);
  }
  function gong(t, v) {
    const bus = C.createGain(); bus.gain.value = v * 0.14; route(bus, 0, 0.7);
    for (const [m, a, d] of [[1, 1, 4.5], [1.42, 0.7, 3.6], [2.03, 0.55, 3], [2.47, 0.35, 2.4], [3.1, 0.22, 1.8], [4.2, 0.12, 1.4]]) {
      const o = C.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(96 * m, t); o.frequency.exponentialRampToValueAtTime(96 * m * 0.965, t + d);
      const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + d + 0.05);
    }
    nburst(t + 0.05, 2.6, 'bandpass', 900, 1400, 0.6, v * 0.08, 0, 0.6);
  }
  function cymbal(t, v) { nburst(t, 1.7, 'highpass', 6000, 4200, 0.6, v, (Math.random() - 0.5) * 0.6, 0.5); }
  function xiao(f, t, d, v) {
    const o = C.createOscillator(), o2 = C.createOscillator(); o.type = 'sine'; o2.type = 'triangle';
    o.frequency.setValueAtTime(f, t); o2.frequency.setValueAtTime(f, t);
    const vib = C.createOscillator(); vib.frequency.value = 5.3;
    const vg = C.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.008, t + Math.min(0.45, d * 0.6));
    vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
    const m2 = C.createGain(); m2.gain.value = 0.25; o2.connect(m2);
    const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.08); g.gain.setValueAtTime(v * 0.9, t + d * 0.75); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.2);
    o.connect(g); m2.connect(g); route(g, 0.18, 0.65);
    const ns = C.createBufferSource(); ns.buffer = noise; ns.loop = true;
    const bf = C.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = Math.min(9000, f * 2); bf.Q.value = 1.5;
    const bg = C.createGain(); bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime(v * 0.5, t + 0.05); bg.gain.linearRampToValueAtTime(v * 0.1, t + 0.22); bg.gain.linearRampToValueAtTime(0.0001, t + d + 0.2);
    ns.connect(bf); bf.connect(bg); route(bg, 0.18, 0.4);
    const end = t + d + 0.28;
    for (const n of [o, o2, vib]) { n.start(t); n.stop(end); }
    ns.start(t, Math.random()); ns.stop(end);
  }
  function erhu(f, t, d, v, from) {
    const o = C.createOscillator(), o2 = C.createOscillator(); o.type = 'sawtooth'; o2.type = 'sawtooth'; o2.detune.value = 7;
    for (const osc of [o, o2]) {
      if (from && Math.abs(from - f) > 1 && Math.abs(Math.log2(from / f)) < 1) { osc.frequency.setValueAtTime(from, t); osc.frequency.exponentialRampToValueAtTime(f, t + 0.13); }
      else { osc.frequency.setValueAtTime(f * 0.985, t); osc.frequency.exponentialRampToValueAtTime(f, t + 0.07); }
    }
    const vib = C.createOscillator(); vib.frequency.value = 5.8;
    const vg = C.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(0, t + 0.18); vg.gain.linearRampToValueAtTime(f * 0.012, t + 0.45);
    vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
    const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1050; bp.Q.value = 0.7;
    const pk = C.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 2600; pk.gain.value = 5; pk.Q.value = 1.2;
    const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
    const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.11); g.gain.setValueAtTime(v * 0.88, t + d * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.18);
    o.connect(bp); o2.connect(bp); bp.connect(pk); pk.connect(lp); lp.connect(g); route(g, -0.18, 0.55);
    const end = t + d + 0.25;
    for (const n of [o, o2, vib]) { n.start(t); n.stop(end); }
  }
  function choir(root, t, d, lvl) {
    const g = C.createGain(), lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800 + lvl * 300; lp.Q.value = 0.5;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.02 * lvl, t + d * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + d * 1.05);
    lp.connect(g); route(g, 0, 0.8);
    for (const off of [5, 8, 10]) {
      const f = NOTES[clamp(root + off, 0, TOP)];
      for (const dt of [-7, 7]) { const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + d * 1.1); }
    }
  }
  function heartbeat(t) { boom(t, 62, 40, 0.16, 0.24); boom(t + 0.2, 58, 40, 0.18, 0.17); }
  function nearPC(idx, pc) { for (let d = 0; d < 6; d++) { if (PCS[idx - d] === pc) return idx - d; if (PCS[idx + d] === pc) return idx + d; } return idx; }
  function phrase(seed) {
    const r = makeRng(seed), notes = [];
    for (let b = 0; b < 4; b++) {
      const rh = b === 3 ? RHY[r() < 0.5 ? 5 : 3] : RHY[(r() * 5) | 0];
      for (const [pos, len] of rh) notes.push({ b, pos, len, off: b === 3 && pos + len >= 12 ? 0 : [0, 2, 3, 5, 1, 4][(r() * 6) | 0] });
    }
    return notes;
  }
  function lead(t, bar, s, A, root) {
    const blk = (bar >> 2) & 3, bi = bar & 3, ph = blk === 2 ? mus.phB : mus.phA;
    const playX = A.x && (A.e !== 1 || blk < 2), playE = A.e && (A.e === 2 || blk >= 2);
    if (!playX && !playE) return;
    for (const n of ph) {
      if (n.b !== bi || n.pos !== s) continue;
      let idx = root + 5 + n.off + (blk === 1 && bi === 3 ? 2 : 0);
      while (idx > 15) idx -= 5;
      while (idx < 8) idx += 5;
      const len = n.len * 15 / mus.tempo, f = NOTES[idx];
      if (playE) erhu(f, t, len * 0.95, A.e === 2 ? 0.085 : 0.07, mus.lastF);
      if (playX) xiao(f * (playE ? 2 : 1), t, len * 0.92, playE ? 0.045 : 0.07);
      mus.lastF = f;
    }
  }
  function step16(t) {
    const st = mus.step++, s = st & 15, bar = st >> 4, bi = bar & 3;
    if (s === 0 && mus.pend) { mus.A = mus.pend; mus.pend = null; }
    if (s === 0) mus.tempo += (mus.tgt - mus.tempo) * 0.5;
    const A = mus.A, root = mus.tonic + mus.prog[bi], sp = 15 / mus.tempo;
    if (A.z === 1) {
      if (s === 0 && !(bar & 1)) pluck(root, 0.3, -0.2, t, { wet: 0.6 });
      if ((s % 4 === 0 && Math.random() < 0.55) || (s % 4 === 2 && Math.random() < 0.15)) {
        let k = [-2, -1, -1, 1, 1, 2, 0][(Math.random() * 7) | 0];
        if (Math.random() < 0.08) k *= 2;
        mus.zi = clamp(mus.zi + k, 7, 16);
        if (bi === 3 && s >= 8) mus.zi = clamp(nearPC(mus.zi, mus.mode), 7, 16);
        pluck(mus.zi, 0.26 + Math.random() * 0.16, (Math.random() - 0.5) * 0.5, t, { bend: Math.random() < 0.1 ? 2 : 0 });
      }
      if ((bar & 7) === 4 && s === 0 && Math.random() < 0.5) trem(mus.zi, t, 0.9, 0.2);
    } else if (A.z === 2) {
      if (s === 0) pluck(root, 0.32, -0.2, t, { wet: 0.55 });
      if (s % 2 === 0) { const arp = [0, 2, 3, 5, 7, 5, 3, 2][s >> 1]; pluck(root + 5 + arp, 0.19 + (s === 0 ? 0.06 : 0), (arp - 3) * 0.1, t, { dur: 1.2 }); }
    } else if (A.z === 3) {
      if (s === 0 || s === 8) pluck(root, 0.34, -0.2, t);
      const arp = [0, 2, 3, 5, 7, 8, 7, 5, 3, 5, 7, 8, 10, 8, 7, 5][s];
      pluck(root + 5 + arp, 0.14 + (s % 4 === 0 ? 0.06 : 0), (arp - 5) * 0.08, t, { dur: 0.9 });
      if (s === 0 && bi === 0) gliss(root + 5, Math.min(TOP, root + 16), t, 0.022, 0.24);
    }
    if (A.l && ((A.l === 1 && s % 8 === 4) || (A.l === 2 && s % 4 === 2))) {
      const n = root + 10 + [0, 2, 3][(s >> 2) % 3];
      for (let k = 0; k < 4; k++) pluck(n, 0.11, 0.3, t + k * sp / 2, { dur: 0.3 });
    }
    lead(t, bar, s, A, root);
    if (A.d === 1 && s === 0) bigDrum(t, 0.3);
    else if (A.d === 2) { if (s === 0 || s === 8) bigDrum(t, s ? 0.3 : 0.38); if (s === 4 || s === 12) wood(t, 0.1); }
    else if (A.d === 3) {
      const pat = [0.42, 0, 0, 0.2, 0, 0, 0.26, 0, 0.38, 0, 0.2, 0.22, 0, 0, 0.28, 0][s];
      if (pat) bigDrum(t, pat);
      if (bi === 3 && s >= 12) tom(t, 150 + (s - 12) * 20, 0.16 + (s - 12) * 0.04);
    }
    if (A.w === 1) { const hit = { 0: 0.3, 6: 0.2, 8: 0.26, 12: 0.2, 14: 0.22 }[s]; if (hit) tom(t, s % 8 ? 190 : 150, hit, (s % 3 - 1) * 0.3); }
    else if (A.w === 2) { const acc = s % 4 === 0 || s === 10; tom(t, acc ? 160 : 210, (acc ? 0.28 : 0.11) * (bi === 3 ? 1 + s / 24 : 1), (s % 2 ? 0.25 : -0.25)); }
    if (A.g) { if (s === 0 && bi === 0) gong(t, 0.9); if (A.g === 2 && s === 0 && bi === 2) cymbal(t, 0.09); }
    if (A.b && ((A.b === 1 && s % 4 === 0) || (A.b === 2 && s % 2 === 0))) {
      const arp = [5, 7, 8, 10, 12, 10, 8, 7][(s >> 1) & 7];
      bell(NOTES[clamp(root + arp, 0, TOP)] * 2, 0.15, t, (arp - 8) * 0.1, true);
    }
    if (A.c && s === 0) choir(root, t, sp * 16, A.c);
    if (mus.tense > 0.3 && s % 2 === 1) tom(t, 230, 0.07 + 0.08 * mus.tense, (Math.random() - 0.5) * 0.6);
    if (mus.tense > 0.6 && s % 4 === 3) tom(t, 120, 0.16 * mus.tense);
    if (mus.low && s % 4 === 0) heartbeat(t);
  }
  function setArr(A, si) {
    mus.pend = A; mus.tgt = A.t;
    if (!mus.on) { mus.on = true; mus.A = A; mus.pend = null; mus.tempo = A.t; mus.step = 0; mus.next = C.currentTime + 0.05; }
    const m = STAGES[si].mode;
    mus.mode = m; mus.tonic = droneIdx(m); mus.prog = PROG[si % PROG.length];
    mus.phA = phrase(1000 + si * 17); mus.phB = phrase(2000 + si * 29);
    const root = NOTES[mus.tonic], t = C.currentTime;
    for (const [o, mm] of pad.os) o.frequency.setTargetAtTime(root * mm, t, 0.8);
    pad.g.gain.setTargetAtTime(0.05, t, 1.5);
  }
  return {
    init,
    get ready() { return ok; },
    isMuted: () => muted,
    toggle() {
      muted = !muted;
      try { localStorage.setItem('fy-mute', muted ? '1' : '0'); } catch (e) { /* storage unavailable */ }
      if (ok) master.gain.setTargetAtTime(muted ? 0 : 0.85, C.currentTime, 0.05);
      return muted;
    },
    suspend(v) { if (!C) return; if (v) C.suspend().catch(() => {}); else C.resume().catch(() => {}); },
    music(si) { if (ok) setArr(ARR[si], si); },
    tense(v) { if (v > mus.tense) mus.tense = v; },
    /*DEBUG*/stats() {
      if (!meter) return null;
      const d = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(d);
      let sq = 0, pk = 0;
      for (const v of d) { sq += v * v; if (Math.abs(v) > pk) pk = Math.abs(v); }
      return { rms: Math.sqrt(sq / d.length), peak: pk, voices: nVoices, tempo: Math.round(mus.tempo), state: C.state };
    },/*/DEBUG*/
    low(v) { mus.low = !!v; },
    tick(dt) {
      if (!ok) return;
      const now = C.currentTime;
      mus.tense = Math.max(0, mus.tense - dt * 0.5);
      if (joinQ > 0 && now >= joinNext) { joinQ--; joinI = joinI >= 16 ? 9 : joinI + 1; pluck(joinI, 0.3, (Math.random() - 0.5) * 0.6, now, { wet: 0.5 }); joinNext = now + 0.07; }
      if (!mus.on) return;
      if (mus.next < now) mus.next = now + 0.05;
      while (mus.next < now + 0.2) { step16(mus.next); mus.next += 15 / mus.tempo; }
    },
    env(wind, rain, water) {
      if (!ok) return;
      const t = C.currentTime;
      windG.gain.setTargetAtTime(wind * 0.32, t, 0.3); windF.frequency.setTargetAtTime(360 + wind * 900, t, 0.3);
      rainG.gain.setTargetAtTime(rain * 0.12, t, 0.5); waterG.gain.setTargetAtTime(water * 0.3, t, 0.3);
    },
    join(n) { joinQ = Math.min(8, joinQ + n); },
    lose() { if (!ok) return; const now = C.currentTime; if (now - lastLose < 0.09) return; lastLose = now; pluck(Math.random() < 0.5 ? 0 : 1, 0.22, (Math.random() - 0.5) * 0.6, now, { dur: 0.22, wet: 0.2 }); nburst(now, 0.12, 'bandpass', 700, 300, 1, 0.07, 0, 0.1); },
    cry(pan) {
      if (!ok) return;
      const t0 = C.currentTime;
      mus.tense = Math.max(mus.tense, 0.7);
      for (let k = 0; k < 2; k++) {
        const t = t0 + k * 0.38, o = C.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(2500, t); o.frequency.exponentialRampToValueAtTime(1650, t + 0.42);
        const lfo = C.createOscillator(); lfo.frequency.value = 26; const lg = C.createGain(); lg.gain.value = 70; lfo.connect(lg); lg.connect(o.frequency);
        const f = C.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2300; f.Q.value = 2.2;
        const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        o.connect(f); f.connect(g); route(g, pan, 0.6); o.start(t); o.stop(t + 0.5); lfo.start(t); lfo.stop(t + 0.5);
      }
    },
    crackle() { if (!ok) return; mus.tense = Math.max(mus.tense, 0.5); for (let k = 0; k < 4; k++) nburst(C.currentTime + k * 0.18 + Math.random() * 0.08, 0.05, 'highpass', 3000, 3000, 0.5, 0.05, (Math.random() - 0.5), 0.2); },
    thunder() { if (!ok) return; const t = C.currentTime; nburst(t, 0.25, 'highpass', 1800, 900, 0.5, 0.45, 0, 0.3); nburst(t + 0.02, 3.2, 'lowpass', 900, 90, 0.6, 0.9, 0, 0.6); boom(t, 62, 36, 1.6, 0.55); },
    rumble() { if (!ok) return; const t = C.currentTime; nburst(t, 2.6, 'lowpass', 300, 80, 0.6, 0.35, (Math.random() - 0.5), 0.7); },
    roar() {
      if (!ok) return;
      const t = C.currentTime, o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(64, t); o.frequency.linearRampToValueAtTime(52, t + 2.2);
      const lfo = C.createOscillator(); lfo.frequency.value = 11; const lg = C.createGain(); lg.gain.value = 0.5;
      const amp = C.createGain(); amp.gain.value = 0.5; lfo.connect(lg); lg.connect(amp.gain);
      const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(220, t); lp.frequency.linearRampToValueAtTime(520, t + 0.8); lp.frequency.linearRampToValueAtTime(160, t + 2.2);
      const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
      o.connect(amp); amp.connect(lp); lp.connect(g); route(g, 0, 0.6);
      o.start(t); o.stop(t + 2.4); lfo.start(t); lfo.stop(t + 2.4);
      nburst(t, 2.2, 'lowpass', 400, 120, 0.6, 0.3, 0, 0.6); gong(t + 1.4, 0.7);
    },
    meteor() { if (!ok) return; const t = C.currentTime; nburst(t, 0.7, 'bandpass', 3800, 600, 2, 0.22, (Math.random() - 0.5), 0.5); bell(1975.53, 0.25, t, 0, true); },
    whoosh(dir) { if (ok) nburst(C.currentTime, 1.6, 'bandpass', 300, 1400, 0.9, 0.22, dir * 0.6, 0.3); },
    wing() { if (!ok) return; const t = C.currentTime; nburst(t, 0.45, 'bandpass', 500, 2600, 1.1, 0.24, 0, 0.3); gliss(9, 14, t, 0.03, 0.28); boom(t, 120, 60, 0.25, 0.2); },
    dodge() { if (!ok) return; const t = C.currentTime; bell(1318.51, 0.35, t, 0.3, true); bell(1975.53, 0.25, t + 0.08, -0.3, true); },
    windFull() { if (!ok) return; const t = C.currentTime; gliss(5, 19, t, 0.035, 0.3); [587.33, 880, 1174.66].forEach((f, k) => bell(f, 0.4, t + 0.5 + k * 0.1, (k - 1) * 0.4)); },
    peng() {
      // six seconds of full ensemble on top of whatever heaven is playing
      if (!ok) return;
      const t = C.currentTime, root = mus.tonic;
      gong(t, 1); gliss(0, 19, t, 0.028, 0.34); choir(root, t + 0.2, 5.6, 2);
      for (let k = 0; k < 12; k++) bigDrum(t + 0.3 + k * 0.48, k % 4 ? 0.26 : 0.38);
      [5, 7, 8, 10, 12].forEach((n, k) => erhu(NOTES[root + n + 5], t + 1.2 + k * 0.9, 0.85, 0.06, k ? NOTES[root + [5, 7, 8, 10, 12][k - 1] + 5] : 0));
      bell(NOTES[root + 10] * 2, 0.5, t + 5.7, 0);
    },
    fable() { if (!ok) return; const t = C.currentTime, root = mus.tonic; [10, 12, 13, 15].forEach((n, k) => xiao(NOTES[root + n], t + k * 0.22, 0.32, 0.06)); bell(NOTES[root + 15] * 2, 0.4, t + 0.95); },
    smash() { if (!ok) return; const t = C.currentTime; boom(t, 90, 40, 0.4, 0.4); nburst(t, 0.35, 'lowpass', 1400, 220, 0.7, 0.3, (Math.random() - 0.5) * 0.6, 0.3); },
    whirl() { if (!ok) return; const t = C.currentTime; nburst(t, 1.4, 'bandpass', 250, 1700, 1.3, 0.26, 0, 0.4); gliss(9, 16, t + 0.1, 0.05, 0.28); },
    feather() { if (!ok) return; const t = C.currentTime; gliss(7, 17, t, 0.035, 0.32); bell(1174.66, 0.5, t + 0.35); },
    geese() { if (!ok) return; const t = C.currentTime; gliss(10, 20, t, 0.03, 0.3); [880, 1318.51].forEach((f, k) => bell(f, 0.3, t + 0.2 + k * 0.12, 0, true)); },
    splash() { if (!ok) return; const t = C.currentTime; nburst(t, 1.0, 'lowpass', 2600, 300, 0.5, 0.5, 0, 0.4); boom(t, 90, 40, 0.5, 0.3); },
    rise() { if (!ok) return; const t = C.currentTime; boom(t, 48, 38, 1.6, 0.45); nburst(t, 1.3, 'lowpass', 180, 600, 0.6, 0.25, 0, 0.3); },
    burst() { if (!ok) return; const t = C.currentTime; bell(146.83, 0.9, t); bell(293.66, 0.5, t + 0.05); gliss(5, 17, t + 0.08, 0.03, 0.36); },
    stage(si) {
      if (!ok) return;
      const t = C.currentTime, s = STAGES[si];
      bell(NOTES[droneIdx(s.mode)] * 2, 0.6, t); gliss(7, 16, t + 0.05, 0.04, 0.26);
      if (si >= 3) gong(t + 0.05, 0.8);
      boom(t + 0.9, 160, 55, 0.3, 0.45); nburst(t + 0.9, 0.08, 'lowpass', 1500, 400, 0.7, 0.22, 0, 0.1);
    },
    over() { if (!ok) return; const t = C.currentTime; mus.on = false; mus.low = false; pad.g.gain.setTargetAtTime(0.02, t, 1); bell(110, 0.7, t); [12, 10, 8, 5].forEach((n, k) => pluck(n, 0.3, 0, t + 0.5 + k * 0.45, { wet: 0.7 })); },
    gather() { if (!ok) return; trem(12, C.currentTime, 1.6, 0.26); },
    finale() {
      if (!ok) return;
      const t = C.currentTime; mus.on = false; mus.low = false; pad.g.gain.setTargetAtTime(0.07, t, 1);
      for (const [o, m] of pad.os) o.frequency.setTargetAtTime(146.83 * m, t, 0.8);
      gliss(0, 17, t + 0.2, 0.06, 0.32);
      for (let k = 0; k < 12; k++) tom(t + 1.6 + k * 0.11, 150 + k * 6, 0.1 + k * 0.02);
      gong(t + 3, 1);
      [146.83, 220, 293.66, 369.99].forEach((f, k) => bell(f, 0.55, t + 3 + k * 0.12, (k - 1.5) * 0.3));
      gliss(5, 17, t + 5.6, 0.04, 0.34); bell(587.33, 0.6, t + 6.1);
      for (let k = 0; k < 10; k++) bigDrum(t + 4.8 + k * 0.6, 0.26);
      [7, 9, 10, 12, 14, 15, 17, 14, 12].forEach((n, k) => { pluck(n, 0.3, 0, t + 7 + k * 0.42, { wet: 0.6 }); erhu(NOTES[n], t + 7 + k * 0.42, 0.4, 0.05, k ? NOTES[[7, 9, 10, 12, 14, 15, 17, 14, 12][k - 1]] : 0); });
      gliss(0, 20, t + 10.6, 0.03, 0.3); bell(293.66, 0.7, t + 11.2);
      gong(t + 13.3, 1); bell(587.33, 0.7, t + 13.3); bell(880, 0.5, t + 13.45); cymbal(t + 13.3, 0.12);
    },
    win() { if (!ok) return; const t = C.currentTime; [293.66, 369.99, 440, 587.33].forEach((f, k) => bell(f, 0.45, t + k * 0.2)); setTimeout(() => { if (ok && !mus.on) { mus.mode = 0; setArr(ARR_WIN, NST - 1); } }, 2500); }
  };
})();
