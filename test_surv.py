import os, sys, time, json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.abspath(__file__)); URL="file://"+os.path.join(ROOT,"dist","debug.html")
mode=sys.argv[1]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    c=b.new_context(viewport={"width":390,"height":844},device_scale_factor=2,is_mobile=True,has_touch=True)
    pg=c.new_page(); errs=[]
    pg.on("pageerror",lambda e: errs.append(str(e)))
    pg.goto(URL); time.sleep(1.5); pg.touchscreen.tap(195,400); time.sleep(3)
    if mode=="jump":
        for alt in [11200, 11600, 12400, 7200, 2200]:
            pg.evaluate("window.__fy.birds(Math.max(0,200-window.__fy.info().birds))")
            before=pg.evaluate("window.__fy.info()")
            pg.evaluate(f"window.__fy.jump({alt})"); time.sleep(3)
            after=pg.evaluate("window.__fy.info()")
            print(alt, before['birds'],'->',after['birds'],'deaths(wall,tide,obs,hawk,bolt)=',after['deaths'], 'fps',after['fps'])
            pg.screenshot(path=os.path.join(ROOT,'shots',f'jump_{alt}.png'))
    else:
        for k in range(14):
            time.sleep(5); i=pg.evaluate("window.__fy.info()"); print(k*5+5,'s', i)
            if i['state']!='play': break
        pg.screenshot(path=os.path.join(ROOT,'shots','surv_end.png'))
    print('errors',errs)
    b.close()
