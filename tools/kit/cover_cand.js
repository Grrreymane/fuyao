// 封面候选：1600x2844 竖版高清拍一批，再用 tools/kit/cover_compose.py 裁成 16:9 加标题
const fy = window.__fy, g = document.getElementById('g');
const DT = 1000 / 30, adv = ms => { for (let t = 0; t < ms; t += DT) REC.advance(DT); };
const top = n => { const b = fy.info().birds; if (b < n) fy.birds(n - b); };
REC.run({ fps: 1, seconds: 1, canvas: g,
  async setup() {
    adv(300); fy.start();
    let k = 0; while (fy.info().state !== 'play' && k++ < 600) adv(100);
    fy.bot(true); adv(1200); REC.shot('k-beiming0', g); adv(600); REC.shot('k-beiming1', g);
    fy.jump(31600); top(70); adv(300); fy.ev('gold'); fy.ev('meteor'); for (let j = 0; j < 4; j++) { adv(350); REC.shot('k-xinghe' + j, g); }
    fy.jump(36600); top(70); adv(1500); REC.shot('k-tianfeng', g);
    fy.jump(21500); top(70); adv(300); fy.ev('gold'); fy.ev('dragon'); for (let j = 0; j < 4; j++) { adv(400); REC.shot('k-leize' + j, g); }
    fy.ev('bolt'); for (let j = 0; j < 5; j++) { adv(200); REC.shot('k-bolt' + j, g); }
    fy.jump(16400); top(70); adv(1000); fy.ev('vortex'); for (let j = 0; j < 3; j++) { adv(700); REC.shot('k-vortex' + j, g); }
  }, step() {} });
