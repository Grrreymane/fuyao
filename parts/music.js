/* ================= music: 《列子御风》 across the nine heavens =================
   Every heaven plays the qin piece in its own tempo and band: free harmonics in 北冥, a slow qin in 松崖, flowing zheng in 飞瀑,
   sheng and pipa in 云海, thunder strums in 雷泽, a xiao song in 落日, starlight harmonics in 星河, the full 入破 in 天风 and the
   whole ensemble in 九霄. Threats add drums, riding the whirlwind brings the gong and the full band, a thin flock leaves only the qin and a heartbeat.
   Melody: 《神奇秘谱》(1425)《列子御风》 sections 1–5, 8 and 10, read from the public-domain tablature; rhythm and arrangement are ours.
   Xiao / zheng / pipa / drum notes: FluidR3_GM (Frank Wen, CC BY 3.0), passed in as window.MU_SAMPLES (base64 mp3). */
const MU = (() => {
  let C = null, master = null, sharedWet = null, loading = null, ok = false, noise = null, reedWave = null, bus = null, simNow = null, lite = false, autoTimer = 0;
  /*DEBUG*/let solo = null, nEv = 0; const prof = [];/*/DEBUG*/
  const SMP = { xiao: [], zheng: [], pipa: [], gu: [], ban: [] }, KS = new Map(), PRE = {};
  const now = () => (simNow !== null ? simNow : C.currentTime);
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const DEG = [0, 2, 4, 5, 7, 9, 11];
  const jp = (d, o) => 65 + DEG[d - 1] + 12 * (o || 0); // jianpu degree -> midi, 1 = F4
  const PENT = [];
  for (let m = 29; m <= 101; m++) if ([0, 2, 5, 7, 9].includes(m % 12)) PENT.push(m);
  const LV = { drums: 0.4, pipa: 1.7, zheng: 0.8, fan: 1.8 }; // mix balance, measured with test_music_heavens.py
  const FILES = { xiao: 'shakuhachi', zheng: 'koto', pipa: 'shamisen', gu: 'taiko_drum', ban: 'woodblock' };
  const NAME = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const n2m = s => { const r = /^([A-G])([b#]?)(\d)$/.exec(s); return 12 * (+r[3] + 1) + NAME[r[1]] + (r[2] === 'b' ? -1 : r[2] === '#' ? 1 : 0); };
  const J = () => (Math.random() - 0.5) * 0.008;

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
  function graph(out, wet) {
    master = C.createGain(); master.gain.value = 0.9;
    if (out) master.connect(out);
    else {
      const comp = C.createDynamicsCompressor();
      comp.threshold.value = -13; comp.knee.value = 8; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.22;
      master.connect(comp); comp.connect(C.destination);
    }
    if (wet) sharedWet = wet;
    else { const rev = C.createConvolver(); rev.buffer = makeIR(3.6, 2.05); const rg = C.createGain(); rg.gain.value = 0.5; rev.connect(rg); rg.connect(master); sharedWet = rev; }
  }
  // ctx/out/wet: share the game's AudioContext, mute bus and reverb; leave them out to run standalone
  function init(ctx, out, wet) {
    if (C) { if (C.state === 'suspended' && C.resume) C.resume().catch(() => {}); return loading; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!ctx && !AC) return Promise.reject(new Error('Web Audio unavailable'));
    if (!ctx) { try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari: the ring switch may mute */ } }
    C = ctx || new AC();
    graph(out, wet);
    noise = C.createBuffer(1, C.sampleRate * 2, C.sampleRate);
    const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    if (C.state === 'suspended' && C.resume) C.resume().catch(() => {});
    const src = window.MU_SAMPLES || {}, jobs = [];
    // gongs and cymbals are rendered once offline; without OfflineAudioContext they stay silent and the rest plays on
    try { jobs.push(prerender().catch(() => {})); } catch (e) { /* no OfflineAudioContext */ }
    for (const [k, file] of Object.entries(FILES)) {
      for (const [note, data] of Object.entries(src[file] || {})) {
        jobs.push(decode(b64(data)).then(b => { const e = { m: n2m(note), b, off: onset(b) }; if (k === 'xiao') e.lp = loopify(b, 1.05, 0.28); SMP[k].push(e); }, () => { /* a note that fails to decode falls back to synthesis */ }));
      }
    }
    // the music starts at once; sampled voices join as they decode, synthesized ones stand in until then
    ok = true;
    warmUp();
    loading = Promise.all(jobs).then(() => { for (const k in SMP) SMP[k].sort((a, b) => a.m - b.m); });
    return loading;
  }

  /* ---------- mixing ---------- */
  function newBus(vol) {
    const clip = C.createGain(); clip.gain.value = vol === undefined ? 1 : vol; clip.connect(master);
    const dry = C.createGain(); dry.connect(clip);
    const wet = C.createGain(); wet.gain.value = vol === undefined ? 1 : vol; wet.connect(sharedWet);
    return { clip, dry, wet, sends: new Map() };
  }
  function fadeBus(b, sec) {
    if (!b) return;
    const t = now();
    for (const g of [b.clip.gain, b.wet.gain]) { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + sec); }
    if (simNow === null) setTimeout(() => { b.clip.disconnect(); b.wet.disconnect(); }, sec * 1000 + 600);
  }
  // notes with the same tone, pan and reverb send share one chain of those nodes per bus instead of each building its own:
  // half the nodes on a busy beat. Fixed filters after a note's envelope sound the same as before it; pan and send are
  // rounded to 1/16 and 1/20. tone: 'zheng' / 'pipa' shelf, 'qin' body, 'x<cutoff>' the xiao's band, '' none
  function send(pan, w, tone) {
    const p = Math.round(cl(pan || 0, -1, 1) * 16) / 16, ww = Math.round((w || 0) * 20) / 20, key = tone + ' ' + p + ' ' + ww;
    const old = bus.sends.get(key);
    if (old) return old;
    let head, tail;
    if (tone === 'zheng') head = tail = filt('highshelf', 3000, undefined, 4);
    else if (tone === 'pipa') head = tail = filt('highshelf', 2500, undefined, 3);
    else if (tone === 'qin') { head = filt('lowpass', 2600, 0.5); tail = chain(head, filt('peaking', 230, 0.9, 3)); }
    else if (tone[0] === 'x') { head = filt('highpass', 140, 0.5); tail = chain(head, filt('lowpass', +tone.slice(1), 0.4)); }
    else head = tail = C.createGain();
    let n = tail;
    if (C.createStereoPanner) { const pn = C.createStereoPanner(); pn.pan.value = p; n.connect(pn); n = pn; }
    n.connect(bus.dry);
    if (ww > 0) { const g = C.createGain(); g.gain.value = ww; n.connect(g); g.connect(bus.wet); }
    bus.sends.set(key, head);
    return head;
  }
  function out(node, pan, w, tone) {
    node.connect(send(pan, w, tone || ''));
    /*DEBUG*/nEv++;/*/DEBUG*/
  }
  /*DEBUG*/const muted = k => solo && !solo.includes(k);/*/DEBUG*/
  function pick(k, m) { const a = SMP[k]; if (!a.length) return null; let best = a[0]; for (const s of a) if (Math.abs(s.m - m) < Math.abs(best.m - m)) best = s; return best; }
  function filt(type, f, q, gain) { const b = C.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q !== undefined) b.Q.value = q; if (gain !== undefined) b.gain.value = gain; return b; }
  function chain(...n) { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; }
  function nburst(t, dur, type, f0, f1, q, vol, pan, w) {
    const s = C.createBufferSource(); s.buffer = noise; s.loop = true;
    const f = filt(type, f0, q); f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.25)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    chain(s, f, g); out(g, pan, w); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  function boom(t, f0, f1, d, v, pan) {
    const o = C.createOscillator(), g = C.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.8);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); out(g, pan || 0, 0.05); o.start(t); o.stop(t + d + 0.05);
  }

  /* ---------- instruments ---------- */
  function xiao(m, t, d, v, o = {}) {
    /*DEBUG*/if (muted('xiao')) return;/*/DEBUG*/
    const e = pick('xiao', m);
    if (!e) { xiaoSynth(m, t, d, v, o); return; }
    const s = C.createBufferSource(), pr = s.playbackRate;
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
    s.connect(g); out(g, o.pan === undefined ? 0.14 : o.pan, o.wet === undefined ? 0.5 : o.wet, 'x' + (o.lp || 4600));
    s.start(t, e.off); s.stop(t + d + 0.6); lfo.start(t); lfo.stop(t + d + 0.6);
  }
  function xiaoSynth(m, t, d, v, o) { // stand-in until the samples decode
    const f = mtof(m), os = C.createOscillator(), g = C.createGain(), vib = C.createOscillator(), vg = C.createGain();
    os.frequency.setValueAtTime(f, t);
    let ff = f; for (const [dt, mm] of o.path || []) { os.frequency.setValueAtTime(ff, t + Math.max(0.01, dt - 0.09)); ff = mtof(mm); os.frequency.linearRampToValueAtTime(ff, t + dt); }
    vib.frequency.value = 5.1; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.8, d * 0.8)); vib.connect(vg); vg.connect(os.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.5, t + 0.08); g.gain.setValueAtTime(v * 0.5, t + Math.max(0.1, d - 0.08)); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.15);
    os.connect(g); out(g, 0.14, 0.55); os.start(t); os.stop(t + d + 0.2); vib.start(t); vib.stop(t + d + 0.2);
    nburst(t, Math.min(0.25, d), 'bandpass', Math.min(8000, f * 2), Math.min(8000, f * 2), 1.5, v * 0.12, 0.14, 0.3);
  }
  function ksBuf(m, dark) {
    const key = m + (dark ? 0 : 1000);
    let e = KS.get(key);
    if (e) return e;
    const f = mtof(m), sr = C.sampleRate, N = Math.max(2, Math.floor(sr / f - 0.5)), act = sr / (N + 0.5);
    const T60 = dark ? cl(5 - (m - 38) * 0.08, 1.2, 5) : cl(3 - (m - 45) * 0.05, 0.8, 3), len = Math.floor(sr * (T60 + 0.3));
    const b = C.createBuffer(1, len, sr), y = b.getChannelData(0), d = new Float32Array(N);
    let lp = 0;
    for (let k = 0; k < N; k++) { lp += (dark ? 0.3 : 0.6) * ((Math.random() * 2 - 1) - lp); d[k] = lp; }
    const pp = Math.max(1, Math.floor(N * (dark ? 0.16 : 0.11)));
    for (let k = N - 1; k >= pp; k--) d[k] -= 0.75 * d[k - pp];
    const gl = Math.pow(10, -3 / (act * T60));
    let i = 0;
    for (let n = 0; n < len; n++) { const nx = i + 1 === N ? 0 : i + 1, a = d[i]; y[n] = a; d[i] = (a + d[nx]) * 0.5 * gl; i = nx; }
    let mx = 0; for (let n = 0; n < Math.min(len, 8000); n++) mx = Math.max(mx, Math.abs(y[n]));
    const sc = 0.9 / (mx || 1), fade = Math.floor(sr * 0.06);
    for (let n = 0; n < len; n++) y[n] *= sc * (n > len - fade ? (len - n) / fade : 1);
    e = { b, rate: f / act };
    KS.set(key, e);
    return e;
  }
  // 古琴按音: plucked silk; sl = slides [[dt, semitones from the plucked pitch, ramp]], yin = [cents, hz, delay, dur]
  function qin(m, t, v, o = {}) {
    /*DEBUG*/if (muted('qin')) return;/*/DEBUG*/
    const e = ksBuf(m, true), s = C.createBufferSource(), pr = s.playbackRate;
    s.buffer = e.b; let r = e.rate; pr.setValueAtTime(r, t);
    for (const [dt, semi, rt] of o.sl || []) {
      const nr = e.rate * Math.pow(2, semi / 12); pr.setValueAtTime(r, t + dt); pr.linearRampToValueAtTime(nr, t + dt + rt); r = nr;
      nburst(t + dt, rt + 0.06, 'bandpass', 1500, 2400, 1.8, v * 0.03, -0.1, 0.3);
    }
    if (o.yin) {
      const [cents, hz, dl, dd] = o.yin, lfo = C.createOscillator(), lg = C.createGain(), dep = e.rate * cents / 1731;
      lfo.frequency.value = hz; lg.gain.setValueAtTime(0, t + dl); lg.gain.linearRampToValueAtTime(dep, t + dl + 0.15); lg.gain.setValueAtTime(dep, t + dl + dd); lg.gain.linearRampToValueAtTime(0, t + dl + dd + 0.4);
      lfo.connect(lg); lg.connect(pr); lfo.start(t); lfo.stop(t + dl + dd + 0.5);
    }
    const g = C.createGain(); g.gain.setValueAtTime(v, t);
    if (o.dur) { g.gain.setValueAtTime(v, t + o.dur); g.gain.setTargetAtTime(0, t + o.dur, 0.12); }
    s.connect(g); out(g, o.pan === undefined ? -0.12 : o.pan, o.wet === undefined ? 0.55 : o.wet, 'qin');
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
  function plucked(k, m, t, v, o, pan, wet) {
    const e = pick(k, m), s = C.createBufferSource();
    let r;
    if (e) { s.buffer = e.b; r = Math.pow(2, (m - e.m) / 12); }
    else { const kb = ksBuf(m, false); s.buffer = kb.b; r = kb.rate; v *= 0.8; }
    s.playbackRate.setValueAtTime(r, t);
    if (o.bend) { const [dt, semi, rt] = o.bend; s.playbackRate.setValueAtTime(r, t + dt); s.playbackRate.linearRampToValueAtTime(r * Math.pow(2, semi / 12), t + dt + rt); }
    const g = C.createGain(); g.gain.setValueAtTime(v, t);
    if (o.dur) { g.gain.setValueAtTime(v, t + o.dur); g.gain.setTargetAtTime(0, t + o.dur, o.choke || 0.06); }
    s.connect(g); out(g, o.pan === undefined ? pan : o.pan, o.wet === undefined ? wet : o.wet, k);
    s.start(t, e ? e.off : 0); if (o.dur) s.stop(t + o.dur + 0.4);
  }
  function zheng(m, t, v, o = {}) {
    /*DEBUG*/if (muted('zheng')) return;/*/DEBUG*/
    plucked('zheng', m, t, v * LV.zheng, o, cl((m - 62) / 28, -0.6, 0.6), 0.4);
  }
  function pipa(m, t, v, o = {}) {
    /*DEBUG*/if (muted('pipa')) return;/*/DEBUG*/
    plucked('pipa', m, t, v * LV.pipa, o, -0.24, 0.35);
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
    const e = pick(k, 0);
    if (!e) { if (k === 'gu') boom(t, 150 * rate, 60 * rate, cut || 0.5, v, pan); else boom(t, 1250 * rate, 900 * rate, 0.07, v * 0.6, pan); return; }
    const s = C.createBufferSource(); s.buffer = e.b; s.playbackRate.value = rate;
    const g = C.createGain(); g.gain.setValueAtTime(v, t); if (cut) { g.gain.setValueAtTime(v, t + cut); g.gain.setTargetAtTime(0, t + cut, 0.04); }
    s.connect(g); out(g, pan, wet); s.start(t, e.off); s.stop(t + (cut ? cut + 0.25 : e.b.duration / rate));
  }
  function dagu(t, v) { // 大鼓
    /*DEBUG*/if (muted('drums')) return;/*/DEBUG*/
    v *= LV.drums;
    drumSample('gu', t, v, 0.8, 0, 0, 0.22);
    boom(t, 64, 41, 0.5, v * 0.75);
  }
  function tanggu(t, v, rate, pan) { /*DEBUG*/if (muted('drums')) return;/*/DEBUG*/ drumSample('gu', t, v * LV.drums, rate || 1.6, 0.22, pan === undefined ? 0.15 : pan, 0.18); }
  function roll(t, d, v0, v1) { const step = 1 / 22; let k = 0; for (let x = 0; x < d; x += step, k++) tanggu(t + x, (v0 + (v1 - v0) * x / d) * (k % 2 ? 0.86 : 1), 1.7 + (k % 2) * 0.05, k % 2 ? -0.12 : 0.12); }
  function ban(t, v, rate) { /*DEBUG*/if (muted('drums')) return;/*/DEBUG*/ drumSample('ban', t, v * LV.drums, rate || 1, 0, 0.32, 0.18); }
  function pre(name, t, v, pan, wet, rate) {
    /*DEBUG*/if (muted('drums')) return;/*/DEBUG*/
    if (!PRE[name]) return;
    const s = C.createBufferSource(); s.buffer = PRE[name]; if (rate) s.playbackRate.value = rate;
    const g = C.createGain(); g.gain.value = v * LV.drums; s.connect(g); out(g, pan, wet); s.start(t);
  }
  const daluo = (t, v) => pre('daluo', t, v, 0, 0.5);
  const xiaoluo = (t, v) => pre('xiaoluo', t, v, 0.28, 0.35, 0.98 + Math.random() * 0.04);
  const bo = (t, v, open) => pre(open ? 'bo' : 'boc', t, v, (Math.random() - 0.5) * 0.4, open ? 0.45 : 0.2);
  function cang(t, v) { daluo(t, 0.55 * v); bo(t, 0.3 * v, true); dagu(t, 0.8 * v); }
  function qing(m, t, v) { // 磬: a bowl struck once
    /*DEBUG*/if (muted('qin')) return;/*/DEBUG*/
    const b = C.createGain(); b.gain.value = v * 0.2; out(b, 0, 0.8);
    for (const [k, a, d] of [[1, 1, 6], [2.76, 0.5, 3.5], [5.4, 0.25, 2], [8.93, 0.12, 1.2]]) {
      const o = C.createOscillator(), g = C.createGain(); o.frequency.value = mtof(m) * k;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(b); o.start(t); o.stop(t + d + 0.05);
    }
  }

  /* ---------- score tools ---------- */
  // jianpu line: "6:1.5~ 5,:0.5 3'*" = degree (0 = rest), octave marks (' up, , down), beats, flags (~ slur into next, ! accent, * tremolo)
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
  // one melodic part of a phrase: [instrument, jianpu, octave, velocity, options, start beat]
  function mkPart([inst, str, oct, v, opt, at]) {
    const ns = parse(str).notes, byBeat = {};
    opt = opt || {}; at = at || 0; oct = oct || 0;
    for (let i = 0; i < ns.length; i++) {
      const g = [ns[i]];
      if (inst === 'xiao' || inst === 'qin') while (ns[i].slur && i + 1 < ns.length) g.push(ns[++i]);
      const f = g[0], l = g[g.length - 1], b = at + f.b, k = Math.floor(b + 1e-6);
      (byBeat[k] = byBeat[k] || []).push({ b, d: l.b + l.d - f.b, m: jp(f.deg, f.oct + oct), acc: f.acc, trem: f.trem, path: g.slice(1).map(n => [n.b - f.b, jp(n.deg, n.oct + oct)]) });
    }
    return { inst, v, opt, byBeat };
  }
  // a phrase: length in beats plus parts, roots ([beat, degree]), bass, zheng figure, sheng, percussion level, gong hits, drum rolls
  function phrase(len, cfg) {
    const sh = cfg.shift || 0, rootAt = {}, rootOf = [], cangAt = {}, rollAt = {};
    const parts = (cfg.parts || []).map(p => { const q = p.slice(); q[5] = (q[5] || 0) + sh; return mkPart(q); });
    const rs = (cfg.roots || []).map(([b, d]) => [b + sh, d]);
    if (rs.length && rs[0][0] > 0) rs.unshift([0, rs[0][1]]);
    for (let i = 0; i < rs.length; i++) {
      const [b, deg] = rs[i], e = i + 1 < rs.length ? rs[i + 1][0] : len;
      rootAt[b] = { deg, len: e - b };
      for (let x = b; x < e; x++) rootOf[x] = deg;
    }
    for (const b of cfg.cang || []) cangAt[b + sh] = 1;
    for (const [b, l] of cfg.roll || []) rollAt[b + sh] = l;
    return { len, parts, rootAt, rootOf, cangAt, rollAt, bass: cfg.bass || null, acc: cfg.acc || null, accV: cfg.accV || 0.2, sheng: cfg.sheng || 0, perc: cfg.perc || 0 };
  }

  /* ---------- material from 《列子御风》 (key: 1 = F) ---------- */
  const M1A = '6:1.5 1:0.5 2:0.5 2:1.5 3:0.5 2:0.5 6:2';                       // §1 凭虚驭风, the free opening bar (harmonics)
  const M1B = '1:2 3:2 1:1.5 3:0.5 1:1 3:1 6,:1 6,:1 1:0.5 2:0.5 3:1 3:1 3:0.5 3:0.5';
  const M1C = '1:1.5 3:0.5 2:1 3:1 5,:1.5 6,:2.5';
  const M2 = '7:1.5~ 6:0.5 6:1 5,:3 6:3 2:1 6:2 1:2 5:1 4:2 2:1 3:4';           // §2 俯视寰壤: the theme, 22 beats
  const M2Q = '7:1.5 6:0.5 6:1 5,:3 6:3 2:1 6:2 1:2 5:1~ 4:2 2:1 3:4';          // the same for the qin, with the slide
  const M3 = "3':1 3':1 1:2 3':1 1':1 1':1.5 2:0.5 2':1 3':1 3':1 1:1 3':4";   // §3 渺焉六合: wide leaps
  const M4X = "5:2 6:1~ 1':1 1':4";                                             // §4 不知风乘我: the call (high)
  const M4Q = '2,:0.5 3,:0.5 5,,:1 1:0.5 2:0.5 1:1 1,:4';                        // ... and the answer (low)
  const M5 = '6,:1 3:1 3:2 3:3 1:1 6,:2 3:2 3:4 2:3 1:1 6,:3 6:1 5:2 2,:2 3:4'; // §5 不知我乘风, 32 beats
  const M8 = "3':2 3':2 3':1 3':0.5 3':0.5 3':1 3':1 3':1 2':1 2':2 2':1 1':0.5 2':0.5 3':1 2':1 6:2 6:2"; // §8 长啸空碧
  const M10 = "3:1.5 5:0.5 6:1 1':1 0:2 3':2 2':1 1':0.5 6:0.5 3:1.5 5:0.5 6:1 1':1 0:2"; // §10 兴尽而返
  const PIPA_A = [
    "7:0.75 1':0.25 7:0.5 6:0.5 6:0.5 5:0.25 3:0.25 5,:1 6,:0.5 1:0.5 2:0.5 3:0.5 6:1.5* 1':0.25 7:0.25 6:0.5 5:0.5 2:1 6:0.5 5:0.5 6:0.5 1':0.5 1:1* 2:0.5 1:0.5 5:0.5 6:0.5 4:1 5:0.25 4:0.25 2:0.5 1:0.5 2:0.5 3:2* 2:0.25 3:0.25 5:0.5 3:1!",
    "3':0.25 2':0.25 1':0.25 7:0.25 1':0.25 7:0.25 6:0.5 6:0.25 1':0.25 6:0.25 5:0.25 3:0.25 5:0.25 3:0.25 2:0.25 1:0.5 5,:0.5 6,:0.5 1:0.5 6:2* 1':0.25 7:0.25 6:0.25 5:0.25 2:0.5 3:0.5 6:0.25 5:0.25 6:0.25 1':0.25 2':0.5 1':0.5 1:0.5 2:0.25 1:0.25 2:0.5 3:0.5 5:0.25 6:0.25 5:0.25 4:0.25 4:1* 5:0.25 4:0.25 2:0.25 1:0.25 2:0.5 5,:0.5 3:2* 2:0.25 3:0.25 5:0.25 6:0.25 3:1!"
  ];
  const R2 = [[0, 6], [3, 5], [6, 6], [9, 2], [10, 6], [12, 1], [14, 5], [15, 4], [17, 2], [18, 3]];
  const R3 = [[0, 3], [2, 1], [4, 3], [5, 1], [7, 2], [8, 2], [9, 3], [11, 1], [12, 3]];
  const R4 = [[0, 5], [2, 6], [3, 1], [8, 2], [9, 5], [10, 1], [12, 1]];
  const R5 = [[0, 6], [4, 1], [8, 6], [12, 3], [16, 2], [20, 6], [24, 5], [28, 3]];
  const R10 = [[0, 3], [2, 6], [4, 1], [6, 3], [8, 2], [9, 6], [10, 3], [12, 6], [13, 1]];
  // zheng figures, sheng chords and bass for each root (6 = D, 5 = C, 2 = G, 1 = F, 4 = Bb, 3 = A)
  const OST = { 6: [50, 57, 62, 65, 69, 65, 62, 57], 5: [48, 55, 60, 62, 67, 62, 60, 55], 2: [43, 50, 55, 60, 62, 60, 55, 50], 1: [41, 48, 53, 57, 60, 57, 53, 48], 4: [46, 53, 58, 62, 65, 62, 58, 53], 3: [45, 52, 57, 60, 64, 60, 57, 52] };
  const CHORD = { 6: [62, 69, 74], 5: [60, 67, 72], 2: [55, 62, 67], 1: [53, 60, 65], 4: [58, 65, 70], 3: [57, 64, 69] };
  const BASS = { 6: 50, 5: 48, 2: 43, 1: 41, 4: 46, 3: 45 };

  /* ---------- the nine heavens (散序 → 慢板 → 中板 → 快板 → 急板 → 全奏) ---------- */
  const HEAV = [
    { name: '北冥', bpm: 64, bpb: 4, rub: 0.05, vol: 0.95, loop: 1, ph: [
      phrase(8, { parts: [['fan', M1A, 0, 0.55], ['qin', '3,,:8', 0, 0.45]], roots: [[0, 6]], bass: 'qin' }),
      phrase(28, { parts: [['fan', M1B, 0, 0.46], ['xiao', '7:1.5~ 6:3.5 0:0.5 6:3 2:1 6:2 1:2 0:0.5 5:1 4:2 2:1 3:4', 0, 0.38, { soft: 1 }, 2], ['fan', M1C, 0, 0.48, {}, 20], ['qing', '0:25 6:3', 0, 0.26]], roots: [[0, 6], [8, 6], [16, 5], [20, 3], [24, 6]], bass: 'qin' }),
      phrase(32, { parts: [['fan', M5, 0, 0.44], ['xiao', '0:8 3:4 0:4 6,:4 0:4 2:4 0:2 3:2', 0, 0.32, { soft: 1, swell: 1 }]], roots: R5, bass: 'qin' })
    ] },
    { name: '松崖', bpm: 72, bpb: 4, rub: 0.02, vol: 0.95, loop: 0, ph: [
      phrase(24, { shift: 2, parts: [['qin', M2Q, -1, 0.66], ['xiao', '6:1 5,:3 6:3 2:1 6:2 1:2 5:1 4:2 2:1 3:4', 0, 0.28, { soft: 1 }, 2]], roots: R2, bass: 'qin', perc: 0.5 }),
      phrase(16, { parts: [['xiao', M4X, 0, 0.42, { swell: 1 }], ['qin', M4Q, 0, 0.6, {}, 8]], roots: R4, bass: 'qin', perc: 0.5 })
    ] },
    { name: '飞瀑', bpm: 80, bpb: 4, vol: 0.95, loop: 0, ph: [
      phrase(16, { parts: [['qin', M3, -1, 0.66], ['xiao', '0:12 3:4', 0, 0.34, { soft: 1, swell: 1 }]], roots: R3, bass: 'qin', acc: 'flow', accV: 0.16, perc: 0.5 }),
      phrase(24, { shift: 2, parts: [['xiao', M2, 0, 0.44, { lead: 1 }]], roots: R2, bass: 'qin', acc: 'flow', accV: 0.15, perc: 0.5 })
    ] },
    { name: '云海', bpm: 88, bpb: 4, vol: 0.95, loop: 0, ph: [
      phrase(16, { parts: [['pipa', "5:2 6:1 1':1 1':4* " + M4Q.replace('1,:4', '1,:4*'), 0, 0.36], ['xiao', "5:2 6:2 1':4", 0, 0.3, { soft: 1, lead: 1 }]], roots: R4, bass: 'zheng', acc: 'arp8', accV: 0.18, sheng: 0.04, perc: 1 }),
      phrase(24, { shift: 2, parts: [['xiao', M2, 0, 0.45, { lead: 1 }], ['pipa', PIPA_A[0], 0, 0.28]], roots: R2, bass: 'zheng', acc: 'arp8', accV: 0.18, sheng: 0.035, perc: 1 })
    ] },
    { name: '雷泽', bpm: 100, bpb: 2, vol: 1, loop: 0, ph: [
      phrase(16, { parts: [['pipa', "3':1! 3':1! 1:2* 3':1! 1':1 1':1.5 2:0.5 2':1 3':1! 3':1! 1:1 3':4*", -1, 0.36], ['xiao', '0:12 3:4', 0, 0.42, { swell: 1, lead: 1 }]], roots: R3, bass: 'zheng', acc: 'arp16', accV: 0.16, sheng: 0.03, perc: 2, cang: [0, 8] }),
      phrase(22, { parts: [['xiao', M2, 0, 0.5, { lead: 1 }], ['pipa', PIPA_A[0], 0, 0.4]], roots: R2, bass: 'zheng', acc: 'arp16', accV: 0.17, sheng: 0.04, perc: 2, cang: [2, 10, 18] })
    ] },
    { name: '落日', bpm: 92, bpb: 4, vol: 0.95, loop: 0, ph: [
      phrase(32, { parts: [['xiao', M5, 0, 0.5, { swell: 1, vib: 0.008, lead: 1 }]], roots: R5, bass: 'qin', acc: 'arp8', accV: 0.18, sheng: 0.045, perc: 1 }),
      phrase(24, { shift: 2, parts: [['xiao', M2, 0, 0.46, { lead: 1 }], ['pipa', PIPA_A[0], 0, 0.3]], roots: R2, bass: 'zheng', acc: 'arp8', accV: 0.18, sheng: 0.04, perc: 1 })
    ] },
    { name: '星河', bpm: 70, bpb: 4, rub: 0.03, vol: 0.9, loop: 0, ph: [
      phrase(20, { parts: [['fan', M8, 0, 0.42], ['qing', '3:20', 1, 0.2]], roots: [[0, 3], [8, 2], [12, 2], [16, 6]], bass: 'qin', sheng: 0.03 }),
      phrase(32, { parts: [['xiao', M5, 0, 0.4, { soft: 1, swell: 1, lead: 1 }], ['fan', "0:2 6:2 0:4 3':2 0:6 5':2 0:4 2':2 0:6 1':2", 0, 0.24]], roots: R5, bass: 'qin', sheng: 0.03 })
    ] },
    { name: '天风', bpm: 132, bpb: 2, vol: 1, loop: 0, ph: [
      phrase(22, { parts: [['xiao', M2, 0, 0.43, { vib: 0.007, lead: 1 }], ['pipa', PIPA_A[0], 0, 0.35]], roots: R2, bass: 'zheng', acc: 'arp8', accV: 0.2, sheng: 0.028, perc: 1, cang: [2, 10, 18] }),
      phrase(22, { parts: [['xiao', M2, 0, 0.56, { vib: 0.007, lead: 1 }], ['pipa', PIPA_A[1], 0, 0.47]], roots: R2, bass: 'zheng', acc: 'arp16', accV: 0.2, sheng: 0.05, perc: 2, cang: [2, 6, 10, 14, 18] }),
      phrase(12, { parts: [['pipa', "1:0.5! 3:0.5 1:0.5! 3:0.5 6,:0.5 6,:0.5 1:0.25 2:0.25 3:0.5! 2:0.5! 5:0.5 2:0.5! 5:0.5 1:0.5 1:0.5 2:0.25 3:0.25 5:0.5! 3:0.5! 6:0.5 3:0.5! 6:0.5 2:0.5 2:0.5 3:0.25 5:0.25 6:0.5!", 0, 0.3], ['xiao', '3:4 5:4 6:4', 0, 0.52, { swell: 1, vib: 0.008, lead: 1 }]], roots: [[0, 1], [2, 6], [4, 2], [6, 1], [8, 3], [10, 2]], bass: 'zheng', acc: 'arp16', accV: 0.2, sheng: 0.05, perc: 3, cang: [0, 8], roll: [[10, 2]] })
    ] },
    { name: '九霄', bpm: 120, bpb: 2, vol: 1, loop: 0, ph: [
      phrase(16, { parts: [['xiao', M10, 0, 0.55, { vib: 0.008, lead: 1 }], ['pipa', "3:1.5* 5:0.5 6:1 1':1 0:2 3':2* 2':1 1':0.5 6:0.5 3:1.5* 5:0.5 6:1 1':1 0:2", 0, 0.4]], roots: R10, bass: 'zheng', acc: 'arp16', accV: 0.2, sheng: 0.055, perc: 3, cang: [0, 8] }),
      phrase(22, { parts: [['xiao', M2, 0, 0.58, { vib: 0.008, lead: 1 }], ['pipa', PIPA_A[1], 0, 0.48]], roots: R2, bass: 'zheng', acc: 'arp16', accV: 0.2, sheng: 0.055, perc: 3, cang: [2, 10, 18] })
    ] }
  ];
  // after the last gate: harmonics come back, softly (兴尽而返)
  const REST = { name: '归', bpm: 60, bpb: 4, rub: 0.05, vol: 0.7, loop: 0, ph: [
    phrase(32, { parts: [['fan', M5, 0, 0.4], ['xiao', '0:8 3:4 0:4 6,:4 0:4 2:4 0:2 3:2', 0, 0.28, { soft: 1, swell: 1 }]], roots: R5, bass: 'qin' }),
    phrase(24, { parts: [['fan', M1A + ' 0:4 ' + M1C.replace('6,:2.5', '6,:4.5'), 0, 0.42], ['qing', '0:22 6:2', 0, 0.2]], roots: [[0, 6], [8, 1], [16, 3], [20, 6]], bass: 'qin' })
  ] };
  // each qin pitch needs a plucked-string buffer that takes a few ms to make: make them in idle moments, not on the beat
  function warmUp() {
    const want = new Set([jp(3, -2), jp(6, -3)]);
    for (const d of [2, 3, 4, 5]) want.add(jp(d, -1));
    for (const d in BASS) want.add(BASS[d] - 12);
    for (const H of HEAV.concat(REST)) for (const P of H.ph) for (const part of P.parts) {
      if (part.inst !== 'qin') continue;
      for (const k in part.byBeat) for (const e of part.byBeat[k]) want.add(e.m);
    }
    const list = [...want], idle = window.requestIdleCallback || (f => setTimeout(f, 60));
    const step = () => { const t0 = performance.now(); while (list.length && performance.now() - t0 < 4) ksBuf(list.shift(), true); if (list.length) idle(step); };
    idle(step);
  }

  /* ---------- the sequencer ---------- */
  const LOOK = 0.3;
  const S = { on: false, H: null, si: -1, ph: 0, pb: 0, pass: 0, nextT: 0, spb: 1, gbeat: 0, threat: 0, low: false, tuttiEnd: -1, mode: 'off' };
  const Q = []; // one-off events (gates, cues, the finale), drained by pump()
  // keep: a state change that must happen even if its moment has passed; notes whose moment has passed are dropped
  const at = (t, f, keep) => { Q.push({ t, f, keep }); Q.sort((a, b) => a.t - b.t); };
  function play(part, e, when, d, v, tutti) {
    const m = e.m;
    switch (part.inst) {
      case 'fan': fan(m, when, v); break;
      case 'qing': qing(m, when, v); break;
      case 'qin': {
        const sl = e.path.map(([dt, mm]) => [dt * S.spb, mm - m, 0.2]);
        qin(m, when, v, { sl, yin: d > 1.6 && !sl.length ? [14, 4.8, 0.35, Math.min(3, d - 0.4)] : null });
        break;
      }
      case 'xiao': xiao(m, when, d - 0.03, v, Object.assign({ path: e.path.map(([dt, mm]) => [dt * S.spb, mm, 0.09]) }, part.opt)); break;
      case 'pipa':
        if (e.trem) pipaLun(m, when, d, v * 0.8);
        else if (e.acc) pipaSao([m, m + 7, m + 12], when, v * 0.85);
        else pipa(m, when, v, { dur: Math.min(d + 0.04, 1.4), choke: 0.05 });
        break;
      case 'zheng': zheng(m, when, v, { dur: d + 0.3 }); break;
    }
    if (tutti && part.opt.lead && part.inst !== 'pipa') { // the full band: the pipa doubles the lead an octave up
      if (d > 0.45) pipaLun(m + 12, when, d * 0.92, 0.26); else pipa(m + 12, when, 0.3, { dur: d + 0.03 });
    }
  }
  function figure(kind, deg, t, spb, v) {
    const O = OST[deg];
    if (!O) return;
    if (kind === 'arp8' || (lite && kind === 'arp16')) for (let j = 0; j < 2; j++) zheng(O[(S.gbeat * 2 + j) % 8], t + j * spb / 2 + J(), v * (j ? 0.72 : 1), { dur: 0.6 });
    else if (kind === 'arp16') for (let j = 0; j < 4; j++) zheng(O[(S.gbeat * 4 + j) % 8], t + j * spb / 4 + J(), v * (j ? 0.7 : 1), { dur: 0.42 });
    else if (kind === 'flow') { // water: sixteenths running up two octaves and back
      const base = PENT.findIndex(m => m >= BASS[deg] + 12), seq = [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1];
      for (let j = 0; j < 4; j++) { const k = (S.gbeat % 4) * 4 + j, m = PENT[cl(base + seq[k], 0, PENT.length - 1)]; zheng(m, t + j * spb / 4 + J(), v * (0.65 + 0.35 * Math.sin(k / 16 * Math.PI)), { dur: 0.55 }); }
    }
  }
  function perc(t, bb, bpb, lvl, spb) { // 0.5 = 板 only, 1 = 板眼 and the big drum, 2 = 急急风 eighths, 3 = sixteenths
    const s = spb / 4, down = bb === 0;
    if (lite) lvl = Math.min(lvl, 2);
    ban(t, down ? 0.45 : 0.22, down ? 1 : 1.12);
    if (lvl < 1) return;
    if (down) dagu(t, [0, 0.42, 0.6, 0.7][Math.floor(lvl)]);
    if (lvl === 1) { if (bb === bpb - 1) tanggu(t + 3 * s, 0.2); return; }
    if (lvl === 2) {
      tanggu(t + J(), down ? 0.36 : 0.26, 1.62, 0.14); tanggu(t + 2 * s + J(), 0.22, 1.68, -0.14);
      if (!down) { bo(t, 0.18, false); xiaoluo(t + 2 * s, 0.13); }
      return;
    }
    [0.42, 0.18, 0.26, 0.22].forEach((v, k) => tanggu(t + k * s + J(), v * 0.85, 1.62 + (k % 2) * 0.06, k % 2 ? -0.14 : 0.14));
    if (!down) { dagu(t, 0.36); bo(t, 0.2, false); }
    xiaoluo(t + 2 * s, 0.14);
  }
  function bass(kind, deg, t, dur, k) {
    if (kind === 'qin') qin(BASS[deg] - 12, t, 0.5 * k, { yin: dur > 2.5 ? [10, 4.5, 0.5, Math.min(3, dur - 1)] : null });
    else zheng(BASS[deg], t, 0.38 * k, { pan: -0.15 });
  }
  function emitBeat(P, b, t) {
    const spb = S.spb, bb = b % S.H.bpb, low = S.low, tutti = S.tuttiEnd > t;
    for (const part of P.parts) {
      const evs = part.byBeat[b];
      if (!evs) continue;
      if (low && part.inst === 'pipa') continue;
      for (const e of evs) {
        const when = t + (e.b - b) * spb + (S.H.rub ? J() * 3 : 0), d = e.d * spb;
        play(part, e, when, d, part.v * (low ? 0.75 : 1) * (tutti && part.opt.lead ? 1.12 : 1), tutti);
      }
    }
    const r = P.rootAt[b];
    if (r) {
      const dur = r.len * spb;
      if (P.bass) bass(P.bass, r.deg, t, dur, low ? 0.7 : 1);
      if (!low && (P.sheng || tutti)) sheng(CHORD[r.deg], t, dur, (P.sheng || 0.03) * (tutti ? 1.6 : 1));
    }
    if (P.acc && !low) figure(P.acc, P.rootOf[b], t, spb, P.accV * (tutti ? 1.15 : 1));
    else if (tutti && P.rootOf[b]) figure('arp16', P.rootOf[b], t, spb, 0.18);
    const thr = S.threat > 0.7 ? 3 : S.threat > 0.3 ? 2 : 0;
    let lvl = Math.max(P.perc, thr, tutti ? 3 : 0);
    if (low) lvl = Math.min(lvl, 0.5);
    if (lvl) perc(t, bb, S.H.bpb, lvl, spb);
    if (low && bb === 0) { dagu(t, 0.32); dagu(t + Math.min(0.32, spb * 0.4), 0.22); }
    if (P.cangAt[b] && !low) cang(t, 1);
    if (P.rollAt[b]) roll(t, P.rollAt[b] * spb, 0.25, 0.85);
  }
  function pump() {
    if (!C || !ok) return;
    const n = now();
    // after a hidden tab the queue may be behind: play late notes only if they are barely late, never as a pile-up
    while (Q.length && Q[0].t < n + LOOK) { const e = Q.shift(); if (e.keep || e.t > n - 0.25) e.f(Math.max(e.t, n)); }
    if (S.tuttiEnd > 0 && n > S.tuttiEnd) { S.tuttiEnd = -1; if (bus) bo(n + 0.02, 0.22, true); }
    if (!S.on) return;
    if (S.nextT < n) S.nextT = n + 0.03; // fell behind (hidden tab, long frame): pick up from now
    while (S.on && S.nextT < n + LOOK) {
      const P = S.H.ph[S.ph];
      /*DEBUG*/const pt0 = performance.now();/*/DEBUG*/
      emitBeat(P, S.pb, S.nextT);
      /*DEBUG*/const pd = performance.now() - pt0; if (pd > 0.8) prof.push([+pd.toFixed(2), S.H.name, S.ph, S.pb]);/*/DEBUG*/
      S.nextT += S.spb * (S.H.rub ? 1 + (Math.random() - 0.5) * 2 * S.H.rub : 1);
      S.pb++; S.gbeat++;
      if (S.pb >= P.len) { S.pb = 0; S.ph++; if (S.ph >= S.H.ph.length) { S.ph = S.H.loop; S.pass++; } }
    }
  }
  const GATE = 0.5;
  function gate(si, t) { // the run and the hit that open a heaven; the downbeat lands GATE seconds after t
    if (si === 0) { qing(jp(6, 0), t + GATE, 0.3); return; }
    zhengGliss(jp(1, -2), jp(6, 1), t, GATE - 0.02, si >= 4 ? 0.3 : 0.22);
    if (si >= 4) cang(t + GATE, 0.9); else { qing(jp(6, 0), t + GATE, 0.24); daluo(t + GATE, 0.25); }
  }
  function begin(H, t, si, withGate) {
    const old = bus;
    bus = newBus(H.vol);
    fadeBus(old, 1.4);
    Object.assign(S, { on: true, H, si, ph: 0, pb: 0, pass: 0, nextT: t + (withGate ? GATE : 0), spb: 60 / H.bpm, mode: 'play' });
    if (withGate) at(t, w => gate(si, w));
  }
  function stopAll(sec) { S.on = false; Q.length = 0; fadeBus(bus, sec || 0.4); bus = null; S.mode = 'off'; S.tuttiEnd = -1; }
  // game over: the theme's cadence on a lone qin
  function over() {
    if (!ok) return;
    const t0 = now() + 0.2;
    stopAll(1.2);
    bus = newBus(1); S.mode = 'over';
    const T = b => t0 + b * 60 / 54;
    [[0, 5, 1], [1, 4, 1], [2, 2, 2], [4, 3, 4]].forEach(([b, d, l], k) => at(T(b), w => qin(jp(d, -1), w, 0.6, { yin: l > 1 ? [16, 4.5, 0.3, l * 0.9] : null })));
    at(T(4) + 0.05, w => { qing(jp(3, 0), w, 0.22); qin(jp(3, -2), w, 0.4); });
  }
  // arrival at 90,000 li: the broadened cadence and the gong, then §10 on the xiao, then the opening harmonics come back
  function finale() {
    if (!ok) return;
    const t0 = now() + 0.15;
    stopAll(0.6);
    bus = newBus(1); S.mode = 'finale';
    const TT = tempo([[0, 116], [4, 84], [10, 84]]), T = b => t0 + TT(b);
    [[0, 5, 1], [1, 4, 1], [2, 2, 2], [4, 3, 4]].forEach(([b, d, l]) => at(T(b), w => {
      const dd = T(b + l) - T(b);
      xiao(jp(d, 0), w, dd - 0.03, 0.6, { vib: 0.008, swell: l > 2 ? 1 : 0 });
      if (l > 2) pipaLun(jp(d, 0), w, dd, 0.42); else pipa(jp(d, 0), w, 0.5, { dur: dd });
      zheng(BASS[d], w, 0.5, { pan: -0.15 }); dagu(w, l > 2 ? 0.9 : 0.68);
    }));
    at(T(2.5), w => roll(w, T(4) - T(2.5), 0.2, 0.9));
    at(T(4), w => { cang(w, 1.25); zhengGliss(jp(6, 1), jp(6, -2), w + 0.05, 0.7, 0.34); sheng([57, 64, 69, 74], w, 3.6, 0.06); });
    const t1 = T(8) + 0.4, spb = 60 / 72, mel = mkPart(['xiao', M10, 0, 0.42, { soft: 1 }]);
    for (const k of Object.keys(mel.byBeat)) for (const e of mel.byBeat[k]) at(t1 + e.b * spb, w => xiao(e.m, w, e.d * spb - 0.03, 0.42, { soft: 1, vib: 0.007 }));
    for (let b = 0; b < 16; b++) {
      let deg = 3; for (const [rb, d] of R10) if (rb <= b) deg = d;
      if (R10.some(([rb]) => rb === b)) at(t1 + b * spb, w => qin(BASS[deg] - 12, w, 0.42));
      at(t1 + b * spb, w => { const O = OST[deg]; zheng(O[(b * 2) % 8], w, 0.15, { dur: 0.7 }); zheng(O[(b * 2 + 1) % 8], w + spb / 2, 0.11, { dur: 0.7 }); });
    }
    const t2 = t1 + 16 * spb + 0.3, fm = parse(M1A).notes;
    for (const n of fm) at(t2 + n.b * 0.86, w => fan(jp(n.deg, n.oct), w, 0.5));
    at(t2, w => { qing(jp(6, 0), w, 0.26); qin(jp(6, -3), w, 0.5); qin(jp(3, -2), w + 0.015, 0.4); });
    at(t2 + 8 * 0.86 + 3, w => { if (S.mode === 'finale') { begin(REST, w, 9, false); S.mode = 'rest'; } }, true);
  }

  return {
    init,
    get ready() { return ok; },
    get loaded() { return SMP.xiao.length > 0 && SMP.pipa.length > 0; },
    get heaven() { return S.on ? S.si : -1; },
    get mode() { return S.mode; },
    get tuttiOn() { return S.tuttiEnd > 0; },
    get wet() { return sharedWet; }, // the reverb input, for a host that wants its effects in the same hall
    jp, parse,
    start(si) { if (!ok) return; const t = now() + 0.12; S.threat = 0; S.low = false; S.tuttiEnd = -1; begin(HEAV[si], t, si, true); },
    stage(si) { if (!ok || si === S.si && S.on) return; begin(HEAV[si], now() + 0.15, si, true); },
    rest() { if (!ok || S.mode === 'finale' || S.mode === 'rest') return; begin(REST, now() + 0.2, 9, false); S.mode = 'rest'; },
    threat(v) { if (v > S.threat) S.threat = Math.min(1, v); },
    low(v) { S.low = !!v; },
    tutti(sec) { // the whole band for sec seconds (the flock riding the whirlwind)
      if (!ok || !bus) return;
      const t = now() + 0.02;
      S.tuttiEnd = t + (sec || 6);
      cang(t, 1.2); zhengGliss(jp(1, -2), jp(6, 1), t, 0.9, 0.32);
    },
    cue(name) {
      if (!ok || !bus) return;
      const t = now() + 0.02;
      if (name === 'wind') { zhengGliss(jp(1, -1), jp(6, 1), t, 0.6, 0.3); qing(jp(6, 1), t + 0.62, 0.22); }
      else if (name === 'fable') { fan(jp(6, 0), t, 0.5); fan(jp(3, 1), t + 0.24, 0.45); fan(jp(3, 1), t + 0.48, 0.4); qing(jp(3, 1), t + 0.9, 0.2); }
    },
    over, finale,
    stop(sec) { stopAll(sec); },
    lite(v) { lite = !!v; },
    tick(dt) { S.threat = Math.max(0, S.threat - (dt || 0) * 0.5); pump(); },
    // standalone pages have no game loop: keep the scheduler running on a timer
    autoPump(on) { clearInterval(autoTimer); if (on) autoTimer = setInterval(() => { S.threat = Math.max(0, S.threat - 0.02); pump(); }, 40); },
    /*DEBUG*/
    names: () => HEAV.map(h => h.name),
    prof: () => prof.splice(0), // beats that took longer than 0.8 ms to schedule: [ms, heaven, phrase, beat]
    stats: () => ({ events: nEv, mode: S.mode, heaven: S.si, ph: S.ph, pass: S.pass, threat: +S.threat.toFixed(2), low: S.low, tutti: S.tuttiEnd > 0, loaded: SMP.xiao.length }),
    // render a script of [time, action, arg] offline (fresh page per render: MU binds to the first context it sees)
    async render(script, dur, only) {
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      await init(new OAC(2, 44100, 44100));
      solo = only || null;
      const oc = new OAC(2, Math.ceil(dur * 44100), 44100);
      C = oc; reedWave = null; graph(null, null); bus = null; nEv = 0;
      const api = this;
      let i = 0;
      for (let t = 0; t < dur; t += 0.05) {
        simNow = t;
        while (i < script.length && script[i][0] <= t + 1e-9) { const [, act, arg] = script[i++]; api[act](arg); }
        api.tick(0.05);
      }
      simNow = null;
      const buf = await oc.startRendering();
      return { buf, events: nEv };
    }
    /*/DEBUG*/
  };
})();
