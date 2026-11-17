/* ================= audio: sound effects and ambience; the music itself is MU (music.js) =================
   One AudioContext for both: MU plays into AU's master, so the mute button covers everything, and lends AU its reverb.
   Every pitched effect sits in the music's key, F gong pentatonic (F G A C D). */
const AU = (() => {
  let C = null, master = null, dry = null, wet = null, ok = false, muted = false, held = false, noise = null;
  let windG = null, windF = null, rainG = null, waterG = null;
  // F G A C D from A2 to D7: the range the effects always used, moved into the music's key
  const NOTES = [110, 130.81, 146.83, 174.61, 196, 220, 261.63, 293.66, 349.23, 392, 440, 523.25, 587.33, 698.46, 783.99, 880, 1046.5, 1174.66, 1396.91, 1567.98, 1760, 2093, 2349.32];
  const TOP = NOTES.length - 1;
  const ks = new Map();
  let joinQ = 0, joinNext = 0, joinI = 9, joinTop = 16, lastLose = 0;
  /*DEBUG*/let meter = null, nVoices = 0;/*/DEBUG*/
  try { muted = localStorage.getItem('fy-mute') === '1'; } catch (e) { muted = false; }
  function route(node, pan, w) {
    /*DEBUG*/nVoices++;/*/DEBUG*/
    let n = node;
    if (C.createStereoPanner) { const p = C.createStereoPanner(); p.pan.value = clamp(pan || 0, -1, 1); node.connect(p); n = p; }
    n.connect(dry);
    if (w > 0 && wet) { const g = C.createGain(); g.gain.value = w; n.connect(g); g.connect(wet); }
  }
  function loopNoise(type, f, q) {
    const s = C.createBufferSource(); s.buffer = noise; s.loop = true;
    const fl = C.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = C.createGain(); g.gain.value = 0;
    s.connect(fl); fl.connect(g); g.connect(dry); s.start();
    return [g, fl];
  }
  function init() {
    if (C) { if (!held && C.state !== 'running') C.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // like a music player, keep sounding when an iPhone's ring switch is on silent; the in-game button mutes
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari */ }
    try { C = new AC(); } catch (e) { C = null; return; }
    master = C.createGain(); master.gain.value = muted ? 0 : 0.85;
    const comp = C.createDynamicsCompressor();
    comp.threshold.value = -13; comp.knee.value = 8; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.22;
    master.connect(comp); comp.connect(C.destination);
    /*DEBUG*/meter = C.createAnalyser(); meter.fftSize = 2048; comp.connect(meter);/*/DEBUG*/
    dry = C.createGain(); dry.connect(master);
    noise = C.createBuffer(1, C.sampleRate * 2, C.sampleRate);
    const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    [windG, windF] = loopNoise('bandpass', 500, 0.7);
    [rainG] = loopNoise('highpass', 2400, 0.4);
    [waterG] = loopNoise('lowpass', 780, 0.5);
    MU.init(C, master); // the music can start at once; its sampled voices decode in the background
    wet = MU.wet;
    ok = true;
    warmUp();
    if (C.state === 'suspended') C.resume().catch(() => {});
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
  // the same for the effects' plucked strings: make every buffer in idle moments rather than on a first wing beat
  function warmUp() {
    let i = 0;
    const idle = window.requestIdleCallback || (f => setTimeout(f, 60));
    const step = () => { const t0 = performance.now(); while (i <= TOP && performance.now() - t0 < 4) ksBuf(i++); if (i <= TOP) idle(step); };
    idle(step);
  }
  function pluck(i, vel, pan, when, o) {
    if (!ok) return;
    i = clamp(i | 0, 0, TOP);
    const e = ksBuf(i), t = Math.max(when || 0, C.currentTime);
    const s = C.createBufferSource(); s.buffer = e.b; s.playbackRate.value = e.rate;
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
  function gong(t, v) {
    const bus = C.createGain(); bus.gain.value = v * 0.14; route(bus, 0, 0.7);
    for (const [m, a, d] of [[1, 1, 4.5], [1.42, 0.7, 3.6], [2.03, 0.55, 3], [2.47, 0.35, 2.4], [3.1, 0.22, 1.8], [4.2, 0.12, 1.4]]) {
      const o = C.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(96 * m, t); o.frequency.exponentialRampToValueAtTime(96 * m * 0.965, t + d);
      const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + d + 0.05);
    }
    nburst(t + 0.05, 2.6, 'bandpass', 900, 1400, 0.6, v * 0.08, 0, 0.6);
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
    suspend(v) { held = !!v; if (!C) return; if (v) C.suspend().catch(() => {}); else C.resume().catch(() => {}); },
    // music: a fresh start in a heaven, the gate into the next one, and the signals the band follows
    music(si) { if (ok) MU.start(si); },
    stage(si) { if (ok) MU.stage(si); },
    tense(v) { MU.threat(v); },
    low(v) { MU.low(v); },
    lite(v) { MU.lite(v); },
    /*DEBUG*/stats() {
      if (!meter) return null;
      const d = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(d);
      let sq = 0, pk = 0;
      for (const v of d) { sq += v * v; if (Math.abs(v) > pk) pk = Math.abs(v); }
      return Object.assign({ rms: Math.sqrt(sq / d.length), peak: pk, voices: nVoices, state: C.state }, MU.stats());
    },/*/DEBUG*/
    tick(dt) {
      if (!ok) return;
      const now = C.currentTime;
      if (joinQ > 0 && now >= joinNext) { joinQ--; joinI = Math.min(joinTop, joinI + 1); pluck(joinI, 0.32, (Math.random() - 0.5) * 0.6, now, { wet: 0.5 }); joinNext = now + 0.07; }
      MU.tick(dt);
    },
    env(wind, rain, water) {
      if (!ok) return;
      const t = C.currentTime;
      windG.gain.setTargetAtTime(wind * 0.32, t, 0.3); windF.frequency.setTargetAtTime(360 + wind * 900, t, 0.3);
      rainG.gain.setTargetAtTime(rain * 0.12, t, 0.5); waterG.gain.setTargetAtTime(water * 0.3, t, 0.3);
    },
    // birds joining: plucks climbing the scale, each new run of joins starting higher than the last (chain: joins in a row)
    join(n, chain) { if (!joinQ) { const base = 7 + Math.min(chain || 0, 8); joinI = base - 1; joinTop = Math.min(TOP - 1, base + 7); } joinQ = Math.min(8, joinQ + n); },
    lose() { if (!ok) return; const now = C.currentTime; if (now - lastLose < 0.09) return; lastLose = now; pluck(Math.random() < 0.5 ? 0 : 1, 0.22, (Math.random() - 0.5) * 0.6, now, { dur: 0.22, wet: 0.2 }); nburst(now, 0.12, 'bandpass', 700, 300, 1, 0.07, 0, 0.1); },
    cry(pan) {
      if (!ok) return;
      const t0 = C.currentTime;
      MU.threat(0.7);
      for (let k = 0; k < 2; k++) {
        const t = t0 + k * 0.38, o = C.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(2500, t); o.frequency.exponentialRampToValueAtTime(1650, t + 0.42);
        const lfo = C.createOscillator(); lfo.frequency.value = 26; const lg = C.createGain(); lg.gain.value = 70; lfo.connect(lg); lg.connect(o.frequency);
        const f = C.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2300; f.Q.value = 2.2;
        const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        o.connect(f); f.connect(g); route(g, pan, 0.6); o.start(t); o.stop(t + 0.5); lfo.start(t); lfo.stop(t + 0.5);
      }
    },
    crackle() { if (!ok) return; MU.threat(0.5); for (let k = 0; k < 4; k++) nburst(C.currentTime + k * 0.18 + Math.random() * 0.08, 0.05, 'highpass', 3000, 3000, 0.5, 0.05, (Math.random() - 0.5), 0.2); },
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
    meteor() { if (!ok) return; const t = C.currentTime; nburst(t, 0.7, 'bandpass', 3800, 600, 2, 0.22, (Math.random() - 0.5), 0.5); bell(2093, 0.25, t, 0, true); },
    whoosh(dir) { if (ok) nburst(C.currentTime, 1.6, 'bandpass', 300, 1400, 0.9, 0.22, dir * 0.6, 0.3); },
    wing() { if (!ok) return; const t = C.currentTime; nburst(t, 0.45, 'bandpass', 500, 2600, 1.1, 0.24, 0, 0.3); gliss(9, 14, t, 0.03, 0.28); boom(t, 120, 60, 0.25, 0.2); },
    dodge() { if (!ok) return; const t = C.currentTime; bell(1396.91, 0.35, t, 0.3, true); bell(2093, 0.25, t + 0.08, -0.3, true); },
    windFull() { if (ok) MU.cue('wind'); },
    vortex(sec) { if (ok) MU.tutti(sec); },
    fable() { if (ok) MU.cue('fable'); },
    smash() { if (!ok) return; const t = C.currentTime; boom(t, 90, 40, 0.4, 0.4); nburst(t, 0.35, 'lowpass', 1400, 220, 0.7, 0.3, (Math.random() - 0.5) * 0.6, 0.3); },
    whirl() { if (!ok) return; const t = C.currentTime; nburst(t, 1.4, 'bandpass', 250, 1700, 1.3, 0.26, 0, 0.4); gliss(9, 16, t + 0.1, 0.05, 0.28); },
    feather() { if (!ok) return; const t = C.currentTime; gliss(7, 17, t, 0.035, 0.32); bell(1174.66, 0.5, t + 0.35); },
    geese() { if (!ok) return; const t = C.currentTime; gliss(10, 20, t, 0.03, 0.3); [880, 1396.91].forEach((f, k) => bell(f, 0.3, t + 0.2 + k * 0.12, 0, true)); },
    splash() { if (!ok) return; const t = C.currentTime; nburst(t, 1.0, 'lowpass', 2600, 300, 0.5, 0.5, 0, 0.4); boom(t, 90, 40, 0.5, 0.3); },
    rise() { if (!ok) return; const t = C.currentTime; boom(t, 48, 38, 1.6, 0.45); nburst(t, 1.3, 'lowpass', 180, 600, 0.6, 0.25, 0, 0.3); },
    burst() { if (!ok) return; const t = C.currentTime; bell(146.83, 0.9, t); bell(293.66, 0.5, t + 0.05); gliss(5, 17, t + 0.08, 0.03, 0.36); },
    // a light of a trail taken: each one a step up the scale, so a whole string climbs
    mote(k, n) { if (!ok) return; const t = C.currentTime; pluck(Math.min(TOP - 1, 7 + k), 0.34, (Math.random() - 0.5) * 0.5, t, { wet: 0.55 }); if (k === n) bell(1396.91, 0.3, t + 0.05, 0, true); },
    trailDone() { if (!ok) return; const t = C.currentTime; gliss(10, 20, t, 0.03, 0.32); [880, 1046.5, 1396.91].forEach((f, k) => bell(f, 0.35, t + 0.15 + k * 0.1, (k - 1) * 0.4, true)); },
    // a mountain gate swinging open: timber groaning, a deep gong
    gate() { if (!ok) return; const t = C.currentTime; nburst(t, 0.9, 'lowpass', 500, 140, 0.8, 0.35, 0, 0.3); boom(t + 0.1, 70, 40, 1.2, 0.5); gong(t + 0.25, 0.9); },
    over() { if (ok) MU.over(); },
    gather() { if (ok) trem(11, C.currentTime, 1.6, 0.26); },
    finale() { if (ok) MU.finale(); },
    win() { if (ok) MU.rest(); }
  };
})();
