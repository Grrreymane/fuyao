// 封面候选（横版 1600x900）：玩法场面 + 标题，不露结局
const fy = window.__fy, g = document.getElementById('g');
const DT = 1000 / 30, adv = ms => { for (let t = 0; t < ms; t += DT) REC.advance(DT); };
const out = document.createElement('canvas'), o = out.getContext('2d');
function title(name) {
  out.width = g.width; out.height = g.height; o.drawImage(g, 0, 0);
  const W = out.width, H = out.height, s = H / 900;
  o.save(); o.textAlign = 'center'; o.textBaseline = 'middle'; o.lineJoin = 'round';
  o.strokeStyle = 'rgba(250,244,228,0.92)'; o.fillStyle = '#16191b';
  const x = W * 0.2;
  o.font = 230 * s + 'px FYT, FYK, serif'; o.lineWidth = 24 * s; o.strokeText('扶摇', x, H * 0.4); o.fillText('扶摇', x, H * 0.4);
  o.font = 72 * s + 'px FYK, serif'; o.lineWidth = 12 * s; o.strokeText('九万里', x, H * 0.6); o.fillText('九万里', x, H * 0.6);
  o.restore(); REC.shot(name, out);
}
const top = n => { const b = fy.info().birds; if (b < n) fy.birds(n - b); };
REC.run({ fps: 1, seconds: 1, canvas: g,
  async setup() {
    adv(300); fy.start();
    let k = 0; while (fy.info().state !== 'play' && k++ < 600) adv(100);
    fy.bot(true); adv(800);
    fy.jump(26600); top(70); adv(300); fy.ev('gold'); fy.place('strays', 60, -220); adv(900); REC.shot('p-luori', g);
    fy.jump(31600); top(70); adv(300); fy.ev('gold'); fy.ev('meteor'); adv(1100); REC.shot('p-xinghe', g);
    fy.jump(11600); top(70); adv(1600); REC.shot('p-feipu', g);
    fy.jump(21500); top(70); adv(300); fy.ev('gold'); fy.ev('dragon'); adv(900); REC.shot('p-leize1', g); fy.ev('bolt'); adv(450); REC.shot('p-leize2', g); adv(300); REC.shot('p-leize3', g);
  }, step() {} });
