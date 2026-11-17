import os, time
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.abspath(__file__)); URL="file://"+os.path.join(ROOT,"dist","debug.html")
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    c=b.new_context(viewport={"width":390,"height":844},device_scale_factor=2,is_mobile=True,has_touch=True)
    pg=c.new_page(); pg.goto(URL); time.sleep(2.5)
    pg.screenshot(path=os.path.join(ROOT,'shots','intro_0.png'))
    pg.evaluate("window.__fy.start()")
    t0=time.time()
    for k,t in enumerate([0.25,0.5,0.75,0.95,1.3]):
        while time.time()-t0<t: time.sleep(0.01)
        pg.screenshot(path=os.path.join(ROOT,'shots',f'intro_{k+1}.png'))
    b.close()
