// 竖版商店截图（无字幕）
const fy = window.__fy, g = document.getElementById('g');
const DT = 1000 / 30, adv = ms => { for (let t = 0; t < ms; t += DT) REC.advance(DT); };
REC.run({ fps: 1, seconds: 1, canvas: g,
  async setup() {
    adv(300); fy.start();
    let k = 0; while (fy.info().state !== 'play' && k++ < 600) adv(100);
    fy.bot(true); adv(2500); REC.shot('1-beiming', g);
    fy.jump(11600); adv(2200); REC.shot('2-feipu', g);
    fy.jump(21500); adv(400); fy.ev('dragon'); adv(1500); REC.shot('3-leize', g);
    fy.jump(26600); adv(2500); REC.shot('4-luori', g);
    fy.jump(31600); adv(400); fy.ev('meteor'); adv(1200); REC.shot('5-xinghe', g);
    fy.jump(44600); k = 0; while (fy.info().state === 'play' && k++ < 400) adv(100); adv(5200); REC.shot('6-peng', g);
  }, step() {} });
