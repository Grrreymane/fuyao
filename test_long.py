import os, time
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.abspath(__file__)); URL="file://"+os.path.join(ROOT,"dist","debug.html")
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    c=b.new_context(viewport={"width":390,"height":844},device_scale_factor=1,is_mobile=True,has_touch=True)
    pg=c.new_page(); errs=[]; pg.on("pageerror",lambda e: errs.append(str(e)))
    pg.goto(URL); time.sleep(1.5); pg.evaluate("window.__fy.start()")
    for k in range(48):
        time.sleep(5); i=pg.evaluate("window.__fy.info()"); print(f"{(k+1)*5:4d}s", i, flush=True)
        if i['state'] not in ('play','intro'): break
    pg.screenshot(path=os.path.join(ROOT,'shots','long_end.png'))
    print('errors', errs); b.close()
