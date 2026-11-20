// 宣传视频导演脚本（onegp record_game_video，page=debug.html, root=dist, 1080x1920）
// 只拍玩法：拖动带鸟群、收拢同伴、扶摇、雷龙闪电、流星；不拍终点和化鹏。
// 叠加：手指圈（机器人的目标点）+ 鸟数（游戏 HUD 是 DOM，录不到）。REC.arg 含 frames 时每 0.5 秒存一张检查图。
const fy = window.__fy, g = document.getElementById('g');
const FPS = 30, DT = 1000 / FPS;
const adv = ms => { for (let t = 0; t < ms; t += DT) REC.advance(DT); };
const top = n => { const b = fy.info().birds; if (b < n) fy.birds(n - b); };
const out = document.createElement('canvas'), o = out.getContext('2d');
// [开始秒, 高度, 字幕, 段内事件 [[秒, 动作]]]
// 扶摇（旋风）放最后：旋风没结束就跳关，鸟群和镜头会错位
const CUTS = [
  [0.0, null, '拖动 · 引领鸟群', [[0.5, () => fy.place('strays', 40, -300)], [1.7, () => fy.place('strays', -60, -320)]]],
  [3.2, 26600, '', [[0.0, () => { top(45); fy.ev('gold'); }], [0.3, () => fy.place('strays', 70, -280)]]],
  [5.4, 31600, '', [[0.0, () => top(50)], [0.2, () => fy.ev('meteor')], [1.1, () => fy.ev('meteor')]]],
  [7.6, 21500, '', [[0.0, () => { top(55); fy.ev('dragon'); }], [1.5, () => fy.ev('bolt')]]],
  [10.6, 16400, '抟扶摇而上', [[0.0, () => top(60)], [0.6, () => fy.ev('vortex')]]],
];
const END = 16.0, TITLE_AT = 13.4;
let cut = -1, cutT = 0, evI = 0, fx = 0, fy2 = 0, fa = 0;
function txt(text, x, y, px, font, a, sw) {
  o.save(); o.globalAlpha = a; o.textAlign = 'center'; o.textBaseline = 'middle'; o.lineJoin = 'round';
  o.font = px + 'px ' + font; o.lineWidth = sw; o.strokeStyle = 'rgba(250,246,236,0.88)'; o.strokeText(text, x, y);
  o.fillStyle = '#1a1d1f'; o.fillText(text, x, y); o.restore();
}
function finger(a) { // 手指 / 指针：淡墨圈 + 实心点，跟着机器人的目标点平滑移动
  const [tx, ty] = fy.tgt(), k = out.width / g.width;
  if (!fa) { fx = tx; fy2 = ty; } fa = 1;
  fx += (tx - fx) * 0.18; fy2 += (ty - fy2) * 0.18;
  const x = fx * k, y = fy2 * k, s = out.width / 1080;
  o.save(); o.globalAlpha = 0.55 * a;
  o.fillStyle = 'rgba(255,255,255,0.35)'; o.beginPath(); o.arc(x, y, 46 * s, 0, 7); o.fill();
  o.lineWidth = 5 * s; o.strokeStyle = 'rgba(30,30,30,0.7)'; o.stroke();
  o.globalAlpha = 0.8 * a; o.fillStyle = 'rgba(30,30,30,0.75)'; o.beginPath(); o.arc(x, y, 12 * s, 0, 7); o.fill();
  o.restore();
}
function counter(a) {
  const s = out.width / 1080, n = fy.info().birds;
  o.save(); o.globalAlpha = a;
  o.fillStyle = '#b8322a'; o.fillRect(40 * s, 50 * s, 84 * s, 84 * s);
  o.fillStyle = '#f7ecd6'; o.font = 62 * s + 'px FYK, serif'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillText('羽', 82 * s, 94 * s);
  o.restore();
  txt(String(n), 200 * s, 94 * s, 86 * s, 'FYK, serif', a, 12 * s);
}
REC.run({ fps: FPS, seconds: END, canvas: out, audio: true,
  async setup(ac) {
    window.AudioContext = window.webkitAudioContext = function () { return ac; };
    adv(300);
    fy.start();
    let k = 0; while (fy.info().state !== 'play' && k++ < 600) adv(100);
    fy.bot(true); adv(300);
    out.width = g.width; out.height = g.height;
  },
  step(i) {
    const sec = i / FPS;
    while (cut + 1 < CUTS.length && sec >= CUTS[cut + 1][0]) {
      cut++; cutT = CUTS[cut][0]; evI = 0; fa = 0;
      if (CUTS[cut][1]) { fy.jump(CUTS[cut][1]); adv(300); }
    }
    const evs = CUTS[cut][3];
    while (evI < evs.length && sec - cutT >= evs[evI][0]) evs[evI++][1]();
    REC.advance(DT);
    o.drawImage(g, 0, 0, out.width, out.height);
    const W = out.width, H = out.height, s = W / 1080, ta = Math.min(1, Math.max(0, (sec - TITLE_AT) / 0.6));
    finger(1 - ta); counter(1 - ta);
    const lt = sec - cutT, len = (cut + 1 < CUTS.length ? CUTS[cut + 1][0] : TITLE_AT) - cutT;
    const cap = CUTS[cut][2], fade = Math.min(1, lt / 0.25, Math.max(0, (len - lt) / 0.25));
    if (cap && sec < TITLE_AT) txt(cap, W / 2, H * 0.17, 92 * s, 'FYK, serif', fade, 14 * s);
    if (ta > 0) {
      txt('扶摇', W / 2, H * 0.22, 250 * s, 'FYT, FYK, serif', ta, 26 * s);
      txt('九万里', W / 2, H * 0.32, 80 * s, 'FYK, serif', ta, 14 * s);
    }
    if (/frames/.test(REC.arg || '') && i % 15 === 0) REC.shot('f' + String(i).padStart(3, '0'), out);
  } });
