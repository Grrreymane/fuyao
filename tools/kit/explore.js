const fy = window.__fy, cv = document.getElementById('g');
const adv = (ms) => { for (let t = 0; t < ms; t += 1000 / 30) REC.advance(1000 / 30); };
REC.run({ fps: 1, seconds: 1, canvas: cv, async setup(ac) {
  adv(500); REC.shot('00title', cv);
  fy.start(); let k = 0; while (fy.info().state !== 'play' && k++ < 600) adv(100);
  REC.log('intro done after ' + k); REC.shot('01start', cv);
  fy.bot(true); adv(4000); REC.shot('02fly', cv); REC.log(JSON.stringify(fy.info()));
  for (let s = 1; s < 9; s++) { fy.jump(s * 5000 + 1500); adv(3000); REC.shot('s' + s, cv); REC.log(s + ' ' + JSON.stringify(fy.info())); }
}, step(i) {} });
