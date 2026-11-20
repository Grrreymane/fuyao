// 宣传视频导演脚本（onegp record_game_video，page=debug.html, root=dist）
// 九重天快切 + 结尾鸟群化鹏。REC.arg 含 frames 时每 0.5 秒存一张检查图。
const fy = window.__fy, g = document.getElementById('g');
const FPS = 30, DT = 1000 / FPS;
const adv = ms => { for (let t = 0; t < ms; t += DT) REC.advance(DT); };
const out = document.createElement('canvas'), o = out.getContext('2d');
// 段落：[开始秒, 高度, 字幕, 事件]
const CUTS = [
  [0.0, null, '北冥有鱼　其名为鲲'],
  [2.2, 6700, '松崖'],
  [3.6, 11600, '飞瀑'],
  [5.0, 16400, '云海'],
  [6.4, 21500, '雷泽', 'dragon'],
  [8.2, 26600, '落日'],
  [9.6, 31600, '星河', 'meteor'],
  [11.0, 36600, '天风'],
  [12.2, 'fin', '化而为鸟　其名为鹏'],
];
const END = 16.5, TITLE_AT = 15.0;
let cut = -1, cutT = 0;
function caption(text, a, big) {
  if (a <= 0) return;
  const W = out.width, H = out.height, s = W / 1080;
  o.save(); o.globalAlpha = a; o.textAlign = 'center'; o.textBaseline = 'middle';
  o.font = (big ? 96 : 110) * s + 'px FYK, serif';
  const y = H * (big ? 0.2 : 0.16);
  o.lineJoin = 'round'; o.lineWidth = 14 * s; o.strokeStyle = 'rgba(250,246,236,0.85)'; o.strokeText(text, W / 2, y);
  o.fillStyle = '#1a1d1f'; o.fillText(text, W / 2, y);
  o.restore();
}
function titleCard(a) {
  if (a <= 0) return;
  const W = out.width, H = out.height, s = W / 1080;
  o.save(); o.globalAlpha = a; o.textAlign = 'center'; o.textBaseline = 'middle';
  o.lineJoin = 'round'; o.strokeStyle = 'rgba(250,244,228,0.9)'; o.fillStyle = '#16191b';
  o.font = 250 * s + 'px FYT, FYK, serif'; o.lineWidth = 26 * s; o.strokeText('扶摇', W / 2, H * 0.2); o.fillText('扶摇', W / 2, H * 0.2);
  o.font = 80 * s + 'px FYK, serif'; o.lineWidth = 14 * s; o.strokeText('九万里', W / 2, H * 0.3); o.fillText('九万里', W / 2, H * 0.3);
  o.restore();
}
REC.run({ fps: FPS, seconds: END, canvas: out, audio: true,
  async setup(ac) {
    window.AudioContext = window.webkitAudioContext = function () { return ac; };
    adv(300);
    fy.start();
    let k = 0; while (fy.info().state !== 'play' && k++ < 600) adv(100);
    fy.bot(true); adv(600);
    out.width = g.width; out.height = g.height;
  },
  step(i, t) {
    const sec = i / FPS;
    while (cut + 1 < CUTS.length && sec >= CUTS[cut + 1][0]) {
      cut++; cutT = CUTS[cut][0];
      const [, alt, , ev] = CUTS[cut];
      if (alt === 'fin') { fy.jump(44600); let k = 0; while (fy.info().state === 'play' && k++ < 400) adv(100); adv(2000); }
      else if (alt) { fy.jump(alt); adv(400); if (ev) fy.ev(ev); }
    }
    REC.advance(DT);
    o.drawImage(g, 0, 0, out.width, out.height);
    const lt = sec - cutT, len = (cut + 1 < CUTS.length ? CUTS[cut + 1][0] : TITLE_AT) - cutT;
    const big = cut === 0 || CUTS[cut][1] === 'fin';
    const fade = Math.min(1, lt / 0.25, Math.max(0, (len - lt) / 0.25));
    if (sec < TITLE_AT) caption(CUTS[cut][2], fade, big);
    titleCard(Math.min(1, Math.max(0, (sec - TITLE_AT) / 0.6)));
    if (/frames/.test(REC.arg || '') && i % 15 === 0) REC.shot('f' + String(i).padStart(3, '0'), out);
  } });
