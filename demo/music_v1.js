/* ================= music: 《列子御风》 — one theme in many tempos (qin, xiao, zheng, pipa, sheng, opera percussion) =================
   Melody: 《神奇秘谱》(1425)《列子御风》 sections 1–2, read from the public-domain tablature; rhythm and arrangement are ours.
   Xiao / zheng / pipa / drum notes: FluidR3_GM (Frank Wen, CC BY 3.0), passed in as window.MU_SAMPLES (base64 mp3). */
const MU = (() => {
  let C = null, master = null, loading = null, ok = false, noise = null, ir = null, bus = null, run = null, reedWave = null;
  /*DEBUG*/let solo = null;/*/DEBUG*/
  const SMP = {}, KS = new Map(), PRE = {};
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const DEG = [0, 2, 4, 5, 7, 9, 11];
  const jp = (d, o) => 65 + DEG[d - 1] + 12 * (o || 0); // jianpu degree -> midi, 1 = F4
  const PENT = [];
  for (let m = 29; m <= 101; m++) if ([0, 2, 5, 7, 9].includes(m % 12)) PENT.push(m);
  const LV = { drums: 0.4, pipa: 1.7, zheng: 0.8, fan: 1.8, wind: 0.4 }; // mix balance, measured with test_music_demo.py
  const FILES = { xiao: 'shakuhachi', zheng: 'koto', pipa: 'shamisen', gu: 'taiko_drum', ban: 'woodblock' };
  const NAME = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const n2m = s => { const r = /^([A-G])([b#]?)(\d)$/.exec(s); return 12 * (+r[3] + 1) + NAME[r[1]] + (r[2] === 'b' ? -1 : r[2] === '#' ? 1 : 0); };

  /* ---------- setup ---------- */
  function b64(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function decode(ab) { return new Promise((res, rej) => { const p = C.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); }); }
  function onset(b) {
    const d = b.getChannelData(0); let pk = 0;
    for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > pk) pk = Math.abs(d[i]);
    for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > pk * 0.02) return Math.max(0, i / b.sampleRate - 0.003);
    return 0;
  }
  // loop the steady part of a sustained note with an equal-power crossfade so it can be held for any length
  function loopify(b, start, fade) {
    const sr = b.sampleRate, x = b.getChannelData(0), end = Math.floor((b.duration - 0.16) * sr), a = Math.floor(start * sr), f = Math.floor(fade * sr), L = end - a;
    const out = C.createBuffer(1, end, sr), y = out.getChannelData(0);
    y.set(x.subarray(0, end));
    for (let i = end - f; i < end; i++) { const w = (i - (end - f)) / f; y[i] = x[i] * Math.cos(w * Math.PI / 2) + x[i - L] * Math.sin(w * Math.PI / 2); }
    return { b: out, ls: start, le: end / sr };
  }
  function offline(dur, build) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext, sr = C.sampleRate;
    const oc = new OAC(1, Math.ceil(dur * sr), sr);
    build(oc, oc.destination);
    return new Promise(res => {
      oc.oncomplete = e => res(e.renderedBuffer);
      const p = oc.startRendering();
      if (p && p.then) p.then(res);
    }).then(buf => { const d = buf.getChannelData(0); let pk = 0; for (const v of d) pk = Math.max(pk, Math.abs(v)); if (pk > 0) for (let i = 0; i < d.length; i++) d[i] *= 0.9 / pk; return buf; });
  }
  function noiseIn(oc, dur) { const b = oc.createBuffer(1, Math.ceil(dur * oc.sampleRate), oc.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = oc.createBufferSource(); s.buffer = b; return s; }
  function metal(oc, dst, base, parts, glide, gt) {
    for (const [m, a, d] of parts) {
      const o = oc.createOscillator(), g = oc.createGain();
      o.frequency.setValueAtTime(base * m, 0); o.frequency.exponentialRampToValueAtTime(base * m * glide, gt);
      g.gain.setValueAtTime(0.0001, 0); g.gain.exponentialRampToValueAtTime(a, 0.004); g.gain.exponentialRampToValueAtTime(0.0001, d);
      o.connect(g); g.connect(dst); o.start(0); o.stop(d + 0.02);
    }
  }
  function crash(oc, dst, dec, lvl) {
    const g = oc.createGain(); g.gain.setValueAtTime(0.0001, 0); g.gain.exponentialRampToValueAtTime(lvl, 0.003); g.gain.exponentialRampToValueAtTime(0.0001, dec); g.connect(dst);
    const hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5200; hp.connect(g);
    const bp = oc.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 8200; bp.Q.value = 0.7; bp.connect(hp);
    for (const f of [263, 400, 421, 474, 587, 845]) { const o = oc.createOscillator(); o.type = 'square'; o.frequency.value = f * 2.15; o.connect(bp); o.start(0); o.stop(dec + 0.02); }
    const n = noiseIn(oc, dec + 0.05), nf = oc.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 6500; const ng = oc.createGain(); ng.gain.value = 0.7; n.connect(nf); nf.connect(ng); ng.connect(g); n.start(0);
    const mid = noiseIn(oc, dec + 0.05), mf = oc.createBiquadFilter(); mf.type = 'bandpass'; mf.frequency.value = 2600; mf.Q.value = 1.4;
    const mg = oc.createGain(); mg.gain.setValueAtTime(lvl * 0.9, 0); mg.gain.exponentialRampToValueAtTime(0.0001, Math.min(dec, 0.45)); mid.connect(mf); mf.connect(mg); mg.connect(dst); mid.start(0);
  }
  function prerender() {
    return Promise.all([
      offline(2.9, (oc, d) => { // 大锣: falling pitch, the "仓" of the opera band
        metal(oc, d, 205, [[1, 1, 2.8], [1.5, 0.6, 2.2], [2.04, 0.5, 1.7], [2.63, 0.32, 1.3], [3.31, 0.2, 1], [4.22, 0.12, 0.7]], 0.83, 0.9);
        const n = noiseIn(oc, 0.4), f = oc.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(1900, 0); f.frequency.exponentialRampToValueAtTime(900, 0.3); f.Q.value = 0.9;
        const g = oc.createGain(); g.gain.setValueAtTime(0.35, 0); g.gain.exponentialRampToValueAtTime(0.0001, 0.32); n.connect(f); f.connect(g); g.connect(d); n.start(0);
      }).then(b => { PRE.daluo = b; }),
      offline(1.1, (oc, d) => { // 小锣: rising "台"
        metal(oc, d, 660, [[1, 1, 1.0], [1.61, 0.45, 0.7], [2.33, 0.28, 0.5], [3.08, 0.14, 0.35]], 1.09, 0.22);
        const n = noiseIn(oc, 0.05), f = oc.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3800;
        const g = oc.createGain(); g.gain.setValueAtTime(0.3, 0); g.gain.exponentialRampToValueAtTime(0.0001, 0.03); n.connect(f); f.connect(g); g.connect(d); n.start(0);
      }).then(b => { PRE.xiaoluo = b; }),
      offline(1.5, (oc, d) => crash(oc, d, 1.4, 0.8)).then(b => { PRE.bo = b; }),
      offline(0.2, (oc, d) => crash(oc, d, 0.16, 0.8)).then(b => { PRE.boc = b; })
    ]);
  }
  function makeIR(dur, decay) {
    const sr = C.sampleRate, n = Math.floor(sr * dur), b = C.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch); let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr, a = 0.85 - 0.7 * Math.min(1, t / dur);
        lp += (Math.random() * 2 - 1 - lp) * a;
        d[i] = lp * Math.exp(-t * decay) * (t < 0.015 ? t / 0.015 : 1);
      }
    }
    return b;
  }
  function init(ctx) {
    if (C) { if (C.state === 'suspended' && C.resume) C.resume().catch(() => {}); return loading; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!ctx && !AC) return Promise.reject(new Error('Web Audio unavailable'));
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari: ring switch may mute */ }
    C = ctx || new AC();
    master = C.createGain(); master.gain.value = 0.9;
    const comp = C.createDynamicsCompressor();
    comp.threshold.value = -13; comp.knee.value = 8; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.22;
    master.connect(comp); comp.connect(C.destination);
    noise = C.createBuffer(1, C.sampleRate * 2, C.sampleRate);
    const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    ir = makeIR(3.6, 2.05);
    if (C.state === 'suspended' && C.resume) C.resume().catch(() => {});
    const src = window.MU_SAMPLES || {}, jobs = [prerender()];
    for (const [k, file] of Object.entries(FILES)) {
      SMP[k] = [];
      for (const [note, data] of Object.entries(src[file] || {})) {
        jobs.push(decode(b64(data)).then(b => { const e = { m: n2m(note), b, off: onset(b) }; if (k === 'xiao') e.lp = loopify(b, 1.05, 0.28); SMP[k].push(e); }));
      }
    }
    loading = Promise.all(jobs).then(() => {
      for (const k in SMP) { if (!SMP[k].length) throw new Error('missing samples: ' + k); SMP[k].sort((a, b) => a.m - b.m); }
      ok = true;
    });
    return loading;
  }

  /* ---------- mixing ---------- */
  function newBus() {
    const clip = C.createGain(); clip.connect(master);
    const dry = C.createGain(); dry.connect(clip);
    const rev = C.createConvolver(); rev.buffer = ir;
    const wet = C.createGain(); wet.connect(rev);
    const rg = C.createGain(); rg.gain.value = 0.5; rev.connect(rg); rg.connect(clip);
    return { clip, dry, wet };
  }
  function out(node, pan, w) {
    let n = node;
    if (C.createStereoPanner) { const p = C.createStereoPanner(); p.pan.value = cl(pan || 0, -1, 1); node.connect(p); n = p; }
    n.connect(bus.dry);
    if (w > 0) { const g = C.createGain(); g.gain.value = w; n.connect(g); g.connect(bus.wet); }
  }
  /*DEBUG*/const muted = k => solo && !solo.includes(k);/*/DEBUG*/
  function pick(k, m) { let best = SMP[k][0]; for (const s of SMP[k]) if (Math.abs(s.m - m) < Math.abs(best.m - m)) best = s; return best; }
  function filt(type, f, q, gain) { const b = C.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q !== undefined) b.Q.value = q; if (gain !== undefined) b.gain.value = gain; return b; }
  function chain(...n) { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; }
  function nburst(t, dur, type, f0, f1, q, vol, pan, w) {
    const s = C.createBufferSource(); s.buffer = noise; s.loop = true;
    const f = filt(type, f0, q); f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.25)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    chain(s, f, g); out(g, pan, w); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  /* ---------- instruments ---------- */
  function xiao(m, t, d, v, o = {}) {
    /*DEBUG*/if (muted('xiao')) return;/*/DEBUG*/
    const e = pick('xiao', m), s = C.createBufferSource(), pr = s.playbackRate;
    s.buffer = e.lp.b; s.loop = true; s.loopStart = e.lp.ls; s.loopEnd = e.lp.le;
    let r = Math.pow(2, (m - e.m) / 12); const r0 = r;
    pr.setValueAtTime(r, t);
    for (const [dt, mm, rt] of o.path || []) { const nr = Math.pow(2, (mm - e.m) / 12); pr.setValueAtTime(r, t + Math.max(0.01, dt - rt)); pr.linearRampToValueAtTime(nr, t + dt); r = nr; }
    const lfo = C.createOscillator(), lg = C.createGain(); lfo.frequency.value = o.vr || 5.1;
    lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + Math.min(0.35, d * 0.4)); lg.gain.linearRampToValueAtTime(r0 * (o.vib === undefined ? 0.0065 : o.vib), t + Math.min(0.95, d * 0.8));
    lfo.connect(lg); lg.connect(pr);
    const g = C.createGain(), a = o.soft ? 0.14 : 0.03, rel = t + Math.max(a + 0.02, d - 0.06);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.swell ? v * 0.7 : v, t + a);
    if (o.swell) g.gain.linearRampToValueAtTime(v * 1.1, t + d * 0.6);
    g.gain.setValueAtTime(o.swell ? v * 1.1 : v, rel); g.gain.setTargetAtTime(0, rel, 0.08);
    chain(s, filt('highpass', 140, 0.5), filt('lowpass', o.lp || 4600, 0.4), g); out(g, o.pan === undefined ? 0.14 : o.pan, o.wet === undefined ? 0.5 : o.wet);
    s.start(t, e.off); s.stop(t + d + 0.6); lfo.start(t); lfo.stop(t + d + 0.6);
  }
  function ksBuf(m) {
    let e = KS.get(m);
    if (e) return e;
    const f = mtof(m), sr = C.sampleRate, N = Math.max(2, Math.floor(sr / f - 0.5)), act = sr / (N + 0.5);
    const T60 = cl(5 - (m - 38) * 0.08, 1.2, 5), len = Math.floor(sr * (T60 + 0.3));
    const b = C.createBuffer(1, len, sr), y = b.getChannelData(0), d = new Float32Array(N);
    let lp = 0;
    for (let k = 0; k < N; k++) { lp += 0.3 * ((Math.random() * 2 - 1) - lp); d[k] = lp; }
    const pp = Math.max(1, Math.floor(N * 0.16));
    for (let k = N - 1; k >= pp; k--) d[k] -= 0.75 * d[k - pp];
    const gl = Math.pow(10, -3 / (act * T60));
    let i = 0;
    for (let n = 0; n < len; n++) { const nx = i + 1 === N ? 0 : i + 1, a = d[i]; y[n] = a; d[i] = (a + d[nx]) * 0.5 * gl; i = nx; }
    let mx = 0; for (let n = 0; n < Math.min(len, 8000); n++) mx = Math.max(mx, Math.abs(y[n]));
    const sc = 0.9 / (mx || 1), fade = Math.floor(sr * 0.06);
    for (let n = 0; n < len; n++) y[n] *= sc * (n > len - fade ? (len - n) / fade : 1);
    e = { b, rate: f / act };
    KS.set(m, e);
    return e;
  }
  // 古琴按音: plucked silk string; sl = slides [[dt, semitones from the plucked pitch, ramp]], yin = [cents, hz, delay, dur]
  function qin(m, t, v, o = {}) {
    /*DEBUG*/if (muted('qin')) return;/*/DEBUG*/
    const e = ksBuf(m), s = C.createBufferSource(), pr = s.playbackRate;
    s.buffer = e.b; let r = e.rate; pr.setValueAtTime(r, t);
    for (const [dt, semi, rt] of o.sl || []) {
      const nr = e.rate * Math.pow(2, semi / 12); pr.setValueAtTime(r, t + dt); pr.linearRampToValueAtTime(nr, t + dt + rt); r = nr;
      nburst(t + dt, rt + 0.06, 'bandpass', 1500, 2400, 1.8, v * 0.03, -0.1, 0.3);
    }
    if (o.yin) {
      const [cents, hz, dl, dd] = o.yin, lfo = C.createOscillator(), lg = C.createGain();
      lfo.frequency.value = hz; lg.gain.setValueAtTime(0, t + dl); lg.gain.linearRampToValueAtTime(e.rate * cents / 1731, t + dl + 0.15); lg.gain.setValueAtTime(e.rate * cents / 1731, t + dl + dd); lg.gain.linearRampToValueAtTime(0, t + dl + dd + 0.4);
      lfo.connect(lg); lg.connect(pr); lfo.start(t); lfo.stop(t + dl + dd + 0.5);
    }
    const g = C.createGain(); g.gain.setValueAtTime(v, t);
    if (o.dur) { g.gain.setValueAtTime(v, t + o.dur); g.gain.setTargetAtTime(0, t + o.dur, 0.12); }
    chain(s, filt('lowpass', 2600, 0.5), filt('peaking', 230, 0.9, 3), g); out(g, o.pan === undefined ? -0.12 : o.pan, o.wet === undefined ? 0.55 : o.wet);
    s.start(t); if (o.dur) s.stop(t + o.dur + 0.7);
  }
  // 古琴泛音: glassy, pure
  function fan(m, t, v, o = {}) {
    /*DEBUG*/if (muted('qin')) return;/*/DEBUG*/
    const f = mtof(m), b = C.createGain(); b.gain.value = v * 0.24 * LV.fan; out(b, o.pan === undefined ? 0.05 : o.pan, o.wet === undefined ? 0.75 : o.wet);
    for (const [k, a, d] of [[1, 1, 3.2], [2.003, 0.09, 1.6], [3.01, 0.035, 0.9]]) {
      const os = C.createOscillator(), g = C.createGain(); os.frequency.value = f * k;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      os.connect(g); g.connect(b); os.start(t); os.stop(t + d + 0.05);
    }
    nburst(t, 0.014, 'highpass', 3500, 3500, 0.7, v * 0.05, 0, 0.2);
  }
  function plucked(k, m, t, v, o, shelf, pan, wet) {
    const e = pick(k, m), s = C.createBufferSource(); s.buffer = e.b;
    const r = Math.pow(2, (m - e.m) / 12); s.playbackRate.setValueAtTime(r, t);
    if (o.bend) { const [dt, semi, rt] = o.bend; s.playbackRate.setValueAtTime(r, t + dt); s.playbackRate.linearRampToValueAtTime(r * Math.pow(2, semi / 12), t + dt + rt); }
    const g = C.createGain(); g.gain.setValueAtTime(v, t);
    if (o.dur) { g.gain.setValueAtTime(v, t + o.dur); g.gain.setTargetAtTime(0, t + o.dur, o.choke || 0.06); }
    chain(s, filt('highshelf', shelf[0], undefined, shelf[1]), g); out(g, o.pan === undefined ? pan : o.pan, o.wet === undefined ? wet : o.wet);
    s.start(t, e.off); if (o.dur) s.stop(t + o.dur + 0.4);
  }
  function zheng(m, t, v, o = {}) {
    /*DEBUG*/if (muted('zheng')) return;/*/DEBUG*/
    plucked('zheng', m, t, v * LV.zheng, o, [3000, 4], cl((m - 62) / 28, -0.6, 0.6), 0.4);
  }
  function pipa(m, t, v, o = {}) {
    /*DEBUG*/if (muted('pipa')) return;/*/DEBUG*/
    plucked('pipa', m, t, v * LV.pipa, o, [2500, 3], -0.24, 0.35);
  }
  function pipaLun(m, t, d, v) { // 轮指: five fingers in turn
    const step = 0.064, pat = [1, 0.78, 0.86, 0.72, 0.9];
    let k = 0;
    for (let x = 0; x < d - 0.03; x += step, k++) { const last = x + step >= d - 0.03; pipa(m, t + x, v * pat[k % 5] * (0.92 + 0.16 * Math.random()), last ? { dur: 0.5, choke: 0.1 } : { dur: step + 0.02, choke: 0.025 }); }
  }
  function pipaSao(ms, t, v) { ms.forEach((m, i) => pipa(m, t + i * 0.013, v * (0.85 + 0.15 * i / ms.length), { dur: 0.75, choke: 0.12 })); }
  function zhengGliss(m0, m1, t, d, v) {
    const lo = Math.min(m0, m1), hi = Math.max(m0, m1), ns = PENT.filter(m => m >= lo && m <= hi);
    if (m1 < m0) ns.reverse();
    ns.forEach((m, i) => zheng(m, t + d * i / Math.max(1, ns.length - 1), v * (0.6 + 0.4 * i / ns.length), i === ns.length - 1 ? {} : { dur: 0.6 }));
  }
  function reed() {
    if (reedWave) return reedWave;
    const n = 16, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (k === 1 ? 1 : 0.9 / Math.pow(k, 0.85)) * (k % 2 ? 1 : 0.8) * (k >= 3 && k <= 6 ? 1.25 : 1);
    reedWave = C.createPeriodicWave(re, im);
    return reedWave;
  }
  function sheng(ms, t, d, v) { // 笙: reedy held chord
    /*DEBUG*/if (muted('sheng')) return;/*/DEBUG*/
    const g = C.createGain(), lp = filt('lowpass', 2700, 0.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.3, d * 0.3)); g.gain.setValueAtTime(v, t + Math.max(0.31, d - 0.1)); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.45);
    const trem = C.createOscillator(), tg = C.createGain(); trem.frequency.value = 5.3; tg.gain.value = v * 0.07; trem.connect(tg); tg.connect(g.gain);
    lp.connect(g); out(g, 0.04, 0.45);
    for (const m of ms) { const o = C.createOscillator(); o.setPeriodicWave(reed()); o.frequency.value = mtof(m); o.detune.value = (Math.random() - 0.5) * 8; o.connect(lp); o.start(t); o.stop(t + d + 0.5); }
    trem.start(t); trem.stop(t + d + 0.5);
  }
  function drumSample(k, t, v, rate, cut, pan, wet) {
    const e = pick(k, 0), s = C.createBufferSource(); s.buffer = e.b; s.playbackRate.value = rate;
    const g = C.createGain(); g.gain.setValueAtTime(v, t); if (cut) { g.gain.setValueAtTime(v, t + cut); g.gain.setTargetAtTime(0, t + cut, 0.04); }
    s.connect(g); out(g, pan, wet); s.start(t, e.off); s.stop(t + (cut ? cut + 0.25 : e.b.duration / rate));
  }
  function dagu(t, v) { // 大鼓
    /*DEBUG*/if (muted('drums')) return;/*/DEBUG*/
    v *= LV.drums;
    drumSample('gu', t, v, 0.8, 0, 0, 0.22);
    const o = C.createOscillator(), g = C.createGain(); o.frequency.setValueAtTime(64, t); o.frequency.exponentialRampToValueAtTime(41, t + 0.4);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 0.75, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g); out(g, 0, 0.05); o.start(t); o.stop(t + 0.55);
  }
  function tanggu(t, v, rate, pan) { /*DEBUG*/if (muted('drums')) return;/*/DEBUG*/ drumSample('gu', t, v * LV.drums, rate || 1.6, 0.22, pan === undefined ? 0.15 : pan, 0.18); }
  function roll(t, d, v0, v1) { const step = 1 / 22; let k = 0; for (let x = 0; x < d; x += step, k++) tanggu(t + x, (v0 + (v1 - v0) * x / d) * (k % 2 ? 0.86 : 1), 1.7 + (k % 2) * 0.05, k % 2 ? -0.12 : 0.12); }
  function ban(t, v, rate) { /*DEBUG*/if (muted('drums')) return;/*/DEBUG*/ drumSample('ban', t, v * LV.drums, rate || 1, 0, 0.32, 0.18); }
  function pre(name, t, v, pan, wet, rate) {
    /*DEBUG*/if (muted('drums')) return;/*/DEBUG*/
    const s = C.createBufferSource(); s.buffer = PRE[name]; if (rate) s.playbackRate.value = rate;
    const g = C.createGain(); g.gain.value = v * LV.drums; s.connect(g); out(g, pan, wet); s.start(t);
  }
  const daluo = (t, v) => pre('daluo', t, v, 0, 0.5);
  const xiaoluo = (t, v) => pre('xiaoluo', t, v, 0.28, 0.35, 0.98 + Math.random() * 0.04);
  const bo = (t, v, open) => pre(open ? 'bo' : 'boc', t, v, (Math.random() - 0.5) * 0.4, open ? 0.45 : 0.2);
  function qing(m, t, v) { // 磬: a bowl struck once
    /*DEBUG*/if (muted('qin')) return;/*/DEBUG*/
    const b = C.createGain(); b.gain.value = v * 0.2; out(b, 0, 0.8);
    for (const [k, a, d] of [[1, 1, 6], [2.76, 0.5, 3.5], [5.4, 0.25, 2], [8.93, 0.12, 1.2]]) {
      const o = C.createOscillator(), g = C.createGain(); o.frequency.value = mtof(m) * k;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(b); o.start(t); o.stop(t + d + 0.05);
    }
  }
  function wind(t, d, v) {
    /*DEBUG*/if (muted('wind')) return;/*/DEBUG*/
    const s = C.createBufferSource(); s.buffer = noise; s.loop = true;
    const bp = filt('bandpass', 600, 0.6), lfo = C.createOscillator(), lg = C.createGain();
    lfo.frequency.value = 0.09; lg.gain.value = 320; lfo.connect(lg); lg.connect(bp.frequency);
    v *= LV.wind;
    const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.5, t + 3); g.gain.setValueAtTime(v * 0.5, t + d - 3); g.gain.linearRampToValueAtTime(0.0001, t + d);
    chain(s, bp, g); out(g, 0, 0.3);
    const s2 = C.createBufferSource(); s2.buffer = noise; s2.loop = true;
    const wh = filt('bandpass', 1900, 7), l2 = C.createOscillator(), l2g = C.createGain(); l2.frequency.value = 0.13; l2g.gain.value = 500; l2.connect(l2g); l2g.connect(wh.frequency);
    const g2 = C.createGain(); g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(v * 0.08, t + 4); g2.gain.setValueAtTime(v * 0.08, t + d - 3); g2.gain.linearRampToValueAtTime(0.0001, t + d);
    chain(s2, wh, g2); out(g2, 0.3, 0.4);
    for (const n of [s, s2]) { n.start(t, Math.random()); n.stop(t + d + 0.1); }
    for (const n of [lfo, l2]) { n.start(t); n.stop(t + d + 0.1); }
  }

  /* ---------- score tools ---------- */
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // jianpu line: "6:1.5~ 5,:0.5 3'*" = degree, octave marks (' up, , down), beats, flags (~ slur into next, ! accent, * tremolo)
  function parse(str) {
    const notes = []; let b = 0;
    for (const tok of str.trim().split(/\s+/)) {
      if (tok === '|') continue;
      const r = /^([0-7])([',]*)(?::([\d.]+))?([~!*]*)$/.exec(tok);
      if (!r) throw new Error('bad jianpu token: ' + tok);
      const d = r[3] ? +r[3] : 1, deg = +r[1];
      let oct = 0; for (const c of r[2]) oct += c === "'" ? 1 : -1;
      if (deg) notes.push({ b, d, deg, oct, slur: r[4].includes('~'), acc: r[4].includes('!'), trem: r[4].includes('*') });
      b += d;
    }
    return { notes, len: b };
  }
  function tempo(segs) { // piecewise-linear bpm, returns beat -> seconds
    const step = 1 / 32, tab = [0], last = segs[segs.length - 1][0];
    const bpm = b => { for (let i = 0; i < segs.length - 1; i++) { const [b0, p0] = segs[i], [b1, p1] = segs[i + 1]; if (b <= b1) return p0 + (p1 - p0) * (b - b0) / (b1 - b0); } return segs[segs.length - 1][1]; };
    for (let b = 0; b < last + 16; b += step) tab.push(tab[tab.length - 1] + 60 / bpm(b + step / 2) * step);
    return b => { const x = b / step, k = Math.min(Math.floor(x), tab.length - 2); return tab[k] + (tab[k + 1] - tab[k]) * (x - k); };
  }
  // one call per note: play(midi, when, note, seconds)
  function line(ev, T, b0, str, oct, play, R, jit) {
    for (const n of parse(str).notes) {
      const t0 = T(b0 + n.b), d = T(b0 + n.b + n.d) - t0, m = jp(n.deg, n.oct + oct);
      ev.push({ t: Math.max(0, t0 + (R ? (R() - 0.5) * 2 * jit : 0)), f: w => play(m, w, n, d) });
    }
  }
  // slurred notes share one breath
  function xiaoLine(ev, T, b0, str, oct, v, o = {}) {
    const ns = parse(str).notes;
    for (let i = 0; i < ns.length; i++) {
      const g = [ns[i]];
      while (ns[i].slur && i + 1 < ns.length) g.push(ns[++i]);
      const t0 = T(b0 + g[0].b), last = g[g.length - 1], d = T(b0 + last.b + last.d) - t0;
      const path = g.slice(1).map(n => [T(b0 + n.b) - t0, jp(n.deg, n.oct + oct), 0.09]);
      const vv = v * (g[0].acc ? 1.15 : 1);
      ev.push({ t: t0, f: w => xiao(jp(g[0].deg, g[0].oct + oct), w, d - 0.03, vv, Object.assign({ path }, o)) });
    }
  }
  function pipaLine(ev, T, b0, str, oct, v, R) {
    line(ev, T, b0, str, oct, (m, w, n, d) => {
      const vv = v * (n.acc ? 1.25 : 1) * (0.92 + 0.16 * Math.random());
      if (n.trem) pipaLun(m, w, d, vv * 0.8);
      else pipa(m, w, vv, { dur: Math.min(d + 0.04, 1.4), choke: 0.05 });
    }, R, 0.006);
  }

  /* ---------- the two heavens ---------- */
  // 6 = D, 5 = C, 2 = G, 1 = F, 4 = Bb, 3 = A: zheng figures, sheng chords and bass for each root
  const OST = { 6: [50, 57, 62, 65, 69, 65, 62, 57], 5: [48, 55, 60, 62, 67, 62, 60, 55], 2: [43, 50, 55, 60, 62, 60, 55, 50], 1: [41, 48, 53, 57, 60, 57, 53, 48], 4: [46, 53, 58, 62, 65, 62, 58, 53], 3: [45, 52, 57, 60, 64, 60, 57, 52] };
  const CHORD = { 6: [62, 69, 74], 5: [60, 67, 72], 2: [55, 62, 67], 1: [53, 60, 65], 4: [58, 65, 70], 3: [57, 64, 69] };
  const BASS = { 6: 50, 5: 48, 2: 43, 1: 41, 4: 46, 3: 45 };
  // theme from section 2 (俯视寰壤): skeleton for the xiao, two flowered versions for the pipa
  const XIAO_A = '7:1.5~ 6:0.5 6:1 5,:3 6:3 2:1 6:2 1:2 5:1 4:2 2:1 3:4';
  const PIPA_A = [
    "7:0.75 1':0.25 7:0.5 6:0.5 6:0.5 5:0.25 3:0.25 5,:1 6,:0.5 1:0.5 2:0.5 3:0.5 6:1.5* 1':0.25 7:0.25 6:0.5 5:0.5 2:1 6:0.5 5:0.5 6:0.5 1':0.5 1:1* 2:0.5 1:0.5 5:0.5 6:0.5 4:1 5:0.25 4:0.25 2:0.5 1:0.5 2:0.5 3:2* 2:0.25 3:0.25 5:0.5 3:1!",
    "3':0.25 2':0.25 1':0.25 7:0.25 1':0.25 7:0.25 6:0.5 6:0.25 1':0.25 6:0.25 5:0.25 3:0.25 5:0.25 3:0.25 2:0.25 1:0.5 5,:0.5 6,:0.5 1:0.5 6:2* 1':0.25 7:0.25 6:0.25 5:0.25 2:0.5 3:0.5 6:0.25 5:0.25 6:0.25 1':0.25 2':0.5 1':0.5 1:0.5 2:0.25 1:0.25 2:0.5 3:0.5 5:0.25 6:0.25 5:0.25 4:0.25 4:1* 5:0.25 4:0.25 2:0.25 1:0.25 2:0.5 5,:0.5 3:2* 2:0.25 3:0.25 5:0.25 6:0.25 3:1!"
  ];
  const ROOTS_A = [[0, 6], [3, 5], [6, 6], [9, 2], [10, 6], [12, 1], [14, 5], [15, 4], [17, 2], [18, 3], [22, 0]];
  function bar16(ev, T, b, R, lvl) { // percussion for one 2/4 bar: 1 = 板 and big drum, 2 = 急急风 eighths, 3 = sixteenths
    const at = (bb, f) => ev.push({ t: T(bb) + (R() - 0.5) * 0.006, f });
    at(b, w => ban(w, lvl === 1 ? 0.42 : 0.5)); at(b + 1, w => ban(w, 0.3, 1.12));
    at(b, w => dagu(w, [0, 0.42, 0.62, 0.7][lvl]));
    if (lvl === 1) {
      at(b + 0.75, w => tanggu(w, 0.16, 1.66, -0.1)); at(b + 1.75, w => tanggu(w, 0.22));
      at(b + 1, w => bo(w, 0.14, false));
    } else if (lvl === 2) {
      [0.4, 0.22, 0.32, 0.26].forEach((v, s) => at(b + s * 0.5, w => tanggu(w, v, 1.62 + (s % 2) * 0.06, s % 2 ? -0.14 : 0.14)));
      at(b + 1.75, w => tanggu(w, 0.2, 1.7, -0.1));
      at(b + 1, w => dagu(w, 0.34)); at(b + 1, w => bo(w, 0.2, false));
      at(b + 0.5, w => xiaoluo(w, 0.15)); at(b + 1.5, w => xiaoluo(w, 0.13));
    } else {
      [0.42, 0.18, 0.24, 0.3, 0.38, 0.18, 0.28, 0.24].forEach((v, s) => at(b + s * 0.25, w => tanggu(w, v * 0.85, 1.62 + (s % 2) * 0.06, s % 2 ? -0.14 : 0.14)));
      at(b + 1, w => dagu(w, 0.4)); at(b + 1, w => bo(w, 0.24, false));
      at(b + 0.5, w => xiaoluo(w, 0.17)); at(b + 1.5, w => xiaoluo(w, 0.15));
    }
  }
  function cang(ev, T, b, v) { ev.push({ t: T(b), f: w => { daluo(w, 0.55 * v); bo(w, 0.3 * v, true); dagu(w, 0.8 * v); } }); }
  function harmony(ev, T, b0, roots, pass, R) {
    for (let i = 0; i < roots.length - 1; i++) {
      const [r0, deg] = roots[i], r1 = roots[i + 1][0];
      ev.push({ t: T(b0 + r0), f: w => { zheng(BASS[deg], w, pass === 1 ? 0.32 : 0.45, { pan: -0.15 }); sheng(CHORD[deg], w, T(b0 + r1) - T(b0 + r0), pass === 1 ? 0.028 : 0.05); } });
      const step = pass === 1 ? 0.5 : 0.25;
      for (let x = r0, k = 0; x < r1 - 1e-6; x += step, k++) {
        const m = OST[deg][(pass === 1 ? k * 2 : k) % 8], acc = (x - r0) % 1 === 0;
        ev.push({ t: T(b0 + x) + (R() - 0.5) * 0.008, f: w => zheng(m, w, (acc ? 0.26 : 0.18) * (pass === 1 ? 0.75 : 1), { dur: 0.5 }) });
      }
    }
  }
  function themeA(ev, T, b0, R, pass) {
    xiaoLine(ev, T, b0, XIAO_A, 0, pass === 1 ? 0.43 : 0.56, { vib: 0.007 });
    pipaLine(ev, T, b0, PIPA_A[pass - 1], 0, pass === 1 ? 0.35 : 0.47, R);
    harmony(ev, T, b0, ROOTS_A, pass, R);
    for (let b = b0; b < b0 + 22; b += 2) bar16(ev, T, b, R, pass);
    for (const r of pass === 1 ? [2, 10, 18] : [2, 6, 10, 14, 18]) cang(ev, T, b0 + r, pass === 1 ? 0.8 : 1);
  }
  function sectionB(ev, T, b0, R) { // section 1's motif (1 3 1 3 | 6 6 1 2 3), stepped up twice
    const bars = ['1:0.5! 3:0.5 1:0.5! 3:0.5', '6,:0.5 6,:0.5 1:0.25 2:0.25 3:0.5!', '2:0.5! 5:0.5 2:0.5! 5:0.5', '1:0.5 1:0.5 2:0.25 3:0.25 5:0.5!', '3:0.5! 6:0.5 3:0.5! 6:0.5', '2:0.5 2:0.5 3:0.25 5:0.25 6:0.5!'];
    const roots = [1, 6, 2, 1, 3, 2];
    bars.forEach((s, k) => {
      const bb = b0 + k * 2;
      line(ev, T, bb, s, 0, (m, w, n) => {
        if (n.acc) { pipaSao([m, m + 7, m + 12], w, 0.5); dagu(w, 0.62); bo(w, 0.24, false); }
        else pipa(m, w, 0.44, { dur: 0.3 });
      }, R, 0.005);
      harmony(ev, T, bb, [[0, roots[k]], [2, 0]], 2, R);
      bar16(ev, T, bb, R, 3);
    });
    xiaoLine(ev, T, b0, '3:4 5:4 6:4', 0, 0.52, { swell: 1, vib: 0.008 });
    cang(ev, T, b0, 1); cang(ev, T, b0 + 8, 1);
    ev.push({ t: T(b0 + 10), f: w => roll(w, T(b0 + 12) - T(b0 + 10), 0.25, 0.85) });
  }
  function coda(ev, T, b0, R) { // 5 4 2 | 3, broadened
    xiaoLine(ev, T, b0, '5:1 4:1 2:2 3:4', 0, 0.6, { vib: 0.008 });
    pipaLine(ev, T, b0, '5:1 4:1 2:2 3:4*', 0, 0.5, R);
    [[0, 48], [1, 46], [2, 43], [4, 45]].forEach(([x, m]) => ev.push({ t: T(b0 + x), f: w => { zheng(m, w, 0.5, { pan: -0.15 }); dagu(w, x === 4 ? 0.9 : 0.68); } }));
    ev.push({ t: T(b0 + 2.5), f: w => roll(w, T(b0 + 4) - T(b0 + 2.5), 0.2, 0.9) });
    cang(ev, T, b0 + 4, 1.25);
    ev.push({ t: T(b0 + 4), f: w => { zhengGliss(jp(6, 1), jp(6, -2), w + 0.05, 0.7, 0.34); sheng([57, 64, 69, 74], w, 3.4, 0.06); } });
  }
  const CLIPS = {
    sanxu() { // 第一重 · 散序: section 1 (凭虚驭风) in harmonics, the xiao foreshadows section 2
      const ev = [], at = (t, f) => ev.push({ t, f }), R = rng(11), T = b => 8.3 + b * 60 / 68;
      at(0, w => wind(w, 36, 0.55));
      at(0.25, w => qing(jp(6, 0), w, 0.3));
      at(0.9, w => { qin(jp(6, -3), w, 0.62); qin(jp(3, -2), w + 0.012, 0.5); });
      for (const [t, d, v] of [[2.4, 6, 0.55], [3.7, 1, 0.4], [4.15, 2, 0.42], [4.6, 2, 0.5], [5.85, 3, 0.45], [6.25, 2, 0.4], [6.7, 6, 0.6]]) at(t, w => fan(jp(d, 0), w, v));
      line(ev, T, 0, '1:2 3:2 1:1.5 3:0.5 1:1 3:1 6,:1 6,:1 1:0.5 2:0.5 3:1 3:1 3:0.5 3:0.5', 0, (m, w) => fan(m, w, 0.42 + R() * 0.08), R, 0.012);
      xiaoLine(ev, T, 2, '7:1.5~ 6:3.5', 0, 0.38, { soft: 1 });
      xiaoLine(ev, T, 7.5, '6:3 2:1', 0, 0.4);
      xiaoLine(ev, T, 11.5, '6:2 1:2', 0, 0.4);
      xiaoLine(ev, T, 16, '5:1 4:2 2:1', 0, 0.45);
      xiaoLine(ev, T, 20, '3:4', 0, 0.42, { swell: 1 });
      line(ev, T, 20, '1:1.5 3:0.5 2:1 3:1 5,:1.5 6,:4', 0, (m, w) => fan(m, w, 0.45 + R() * 0.08), R, 0.012);
      at(T(8), w => qin(jp(6, -3), w, 0.4));
      at(T(16), w => qin(jp(5, -3), w, 0.4));
      at(T(20), w => qin(jp(3, -2), w, 0.38, { yin: [18, 5, 0.4, 2] }));
      at(T(25.5), w => { qin(jp(6, -3), w, 0.55); qin(jp(3, -2), w + 0.015, 0.45); qing(jp(6, 0), w + 0.05, 0.28); });
      return { ev, dur: T(25.5) + 5.5 };
    },
    rupo() { // 第八重 · 入破: the section 2 theme at 132 bpm, flowered twice, then section 1's motif and a broadened cadence
      const ev = [], R = rng(23), T = tempo([[0, 132], [60, 132], [66, 84], [72, 84]]);
      ev.push({ t: T(0), f: w => roll(w, T(3.6) - T(0), 0.06, 0.55) });
      ev.push({ t: T(2), f: w => { zhengGliss(jp(1, -2), jp(6, 1), w, T(4) - T(2) - 0.03, 0.3); sheng(CHORD[6], w, T(4) - T(2), 0.04); } });
      ev.push({ t: T(3.5), f: w => dagu(w, 0.5) });
      themeA(ev, T, 4, R, 1);
      themeA(ev, T, 26, R, 2);
      sectionB(ev, T, 48, R);
      coda(ev, T, 60, R);
      return { ev, dur: T(68) + 3.5 };
    }
  };

  /* ---------- transport ---------- */
  function pump() {
    if (!run) return;
    const lim = C.currentTime + 0.25;
    while (run.i < run.ev.length && run.t0 + run.ev[run.i].t < lim) { const e = run.ev[run.i++]; e.f(run.t0 + e.t); }
  }
  function stop() {
    if (!run) return;
    clearInterval(run.timer);
    const b = run.bus, t = C.currentTime;
    b.clip.gain.setValueAtTime(b.clip.gain.value, t); b.clip.gain.linearRampToValueAtTime(0, t + 0.12);
    setTimeout(() => b.clip.disconnect(), 400);
    run = null;
  }
  function play(name) {
    if (!ok || !CLIPS[name]) return 0;
    stop();
    const clip = CLIPS[name]();
    bus = newBus();
    run = { ev: clip.ev.sort((a, b) => a.t - b.t), i: 0, t0: C.currentTime + 0.15, dur: clip.dur, name, bus };
    pump();
    run.timer = setInterval(pump, 30);
    return clip.dur;
  }
  return {
    init, play, stop,
    get ready() { return ok; },
    progress() { return run ? { name: run.name, t: Math.max(0, C.currentTime - run.t0), dur: run.dur } : null; },
    /*DEBUG*/
    clipNames: () => Object.keys(CLIPS),
    // render a clip offline (use a fresh page: MU binds to the first context it sees)
    async render(name, only) {
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const probe = new OAC(2, 44100, 44100); await init(probe); // decode at 44.1k, then render into the real offline context
      solo = only || null;
      const clip = CLIPS[name](), oc = new OAC(2, Math.ceil((clip.dur + 0.5) * 44100), 44100);
      C = oc; master = C.createGain(); master.gain.value = 0.9;
      const comp = C.createDynamicsCompressor(); comp.threshold.value = -13; comp.knee.value = 8; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.22;
      master.connect(comp); comp.connect(C.destination);
      reedWave = null; bus = newBus();
      let n = 0;
      for (const e of clip.ev) { e.f(0.1 + e.t); n++; }
      const buf = await oc.startRendering();
      return { buf, events: n, dur: clip.dur };
    },
    /*/DEBUG*/
    jp, parse
  };
})();
