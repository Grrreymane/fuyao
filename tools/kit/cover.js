// 封面（横版 1600x900，一帧）+ REC.arg=base 时出不带字的底图
const fy = window.__fy, g = document.getElementById('g');
const DT = 1000 / 30, adv = ms => { for (let t = 0; t < ms; t += DT) REC.advance(DT); };
const out = document.createElement('canvas'), o = out.getContext('2d');
REC.run({ fps: 1, seconds: 1, canvas: out,
  async setup() {
    adv(300); fy.start();
    let k = 0; while (fy.info().state !== 'play' && k++ < 600) adv(100);
    fy.bot(true); fy.jump(44600);
    k = 0; while (fy.info().state === 'play' && k++ < 400) adv(100);
    adv(5600);
    out.width = g.width; out.height = g.height;
  },
  step() {
    o.drawImage(g, 0, 0);
    if (/base/.test(REC.arg || '')) return;
    const W = out.width, H = out.height, s = H / 900;
    o.save(); o.textAlign = 'center'; o.textBaseline = 'middle'; o.lineJoin = 'round';
    o.strokeStyle = 'rgba(250,244,228,0.92)'; o.fillStyle = '#16191b';
    const x = W * 0.2;
    o.font = 230 * s + 'px FYT, FYK, serif'; o.lineWidth = 24 * s; o.strokeText('扶摇', x, H * 0.4); o.fillText('扶摇', x, H * 0.4);
    o.font = 72 * s + 'px FYK, serif'; o.lineWidth = 12 * s; o.strokeText('九万里', x, H * 0.6); o.fillText('九万里', x, H * 0.6);
    o.restore();
    REC.shot('cover-raw', out);
  } });
