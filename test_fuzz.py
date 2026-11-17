import os, sys, time, random
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.abspath(__file__)); URL="file://"+os.path.join(ROOT,"dist","debug.html")
random.seed(int(sys.argv[1]) if len(sys.argv)>1 else 1)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    c=b.new_context(viewport={"width":390,"height":844},device_scale_factor=1,is_mobile=True,has_touch=True)
    pg=c.new_page(); errs=[]
    pg.on("pageerror",lambda e: errs.append(str(e)))
    for run in range(10):
        pg.goto(URL); time.sleep(1.0); pg.touchscreen.tap(195,400); time.sleep(2.4)
        pg.evaluate("window.__fy.birds(184)")
        for k in range(3):
            alt=random.randint(2000,44000)
            bef=pg.evaluate("window.__fy.info()")
            pg.evaluate(f"window.__fy.jump({alt})"); time.sleep(4)
            aft=pg.evaluate("window.__fy.info()")
            flag = '  <<<' if aft['birds'] < bef['birds']*0.75 else ''
            print(f"run{run} alt{alt} st{aft['stage']+1}: {bef['birds']}->{aft['birds']} causes {aft['deaths']} fps{aft['fps']}{flag}")
            if flag: pg.screenshot(path=os.path.join(ROOT,'shots',f'fuzz_{run}_{alt}.png'))
            if aft['state']!='play': break
    print('errors',errs)
    b.close()
