"""封面排版：从 cover_cand.js 拍的高清竖版候选（拷进 1gp-kit/，现用 cover-src.png，参数 1050 left dark）里裁 16:9，加竖排「扶摇」+ 红印「九万里」。
用法：python cover_compose.py <候选名> <裁切上沿y> <标题在 left|right> <输出>"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))).replace(os.sep, '/')
name, y0, side, out = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
dark = len(sys.argv) > 5 and sys.argv[5] == 'dark'
im = Image.open(f'{ROOT}/1gp-kit/{name}.png').convert('RGB')
w, h = im.size; ch = round(w * 9 / 16)
im = im.crop((0, y0, w, y0 + ch)).resize((1600, 900), Image.LANCZOS).convert('RGBA')
big = ImageFont.truetype(f'{ROOT}/fonts/ZhiMangXing.ttf', 300)
seal = ImageFont.truetype(f'{ROOT}/fonts/MaShanZheng.ttf', 58)
cx = 250 if side == 'left' else 1350
ink = (245, 238, 222, 255) if dark else (20, 22, 24, 255)
glow = (10, 14, 30, 200) if dark else (250, 244, 228, 215)
# 柔光衬底：字形放大模糊，让字从画面里浮出来又不像贴纸
mask = Image.new('L', im.size, 0); md = ImageDraw.Draw(mask)
for i, c in enumerate('扶摇'):
    md.text((cx, 250 + i * 290), c, font=big, anchor='mm', fill=255, stroke_width=30, stroke_fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(38))
halo = Image.new('RGBA', im.size, glow); halo.putalpha(mask.point(lambda v: int(v * glow[3] / 255)))
im = Image.alpha_composite(im, halo)
lay = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
for i, c in enumerate('扶摇'):
    d.text((cx, 250 + i * 290), c, font=big, anchor='mm', fill=ink)
# 红印：竖排「九万里」
sx = cx + (150 if side == 'left' else -150); sy = 600
d.rounded_rectangle((sx - 40, sy - 100, sx + 40, sy + 100), 8, fill=(178, 42, 34, 240))
for i, c in enumerate('九万里'):
    d.text((sx, sy - 60 + i * 60), c, font=seal, anchor='mm', fill=(250, 236, 214, 255))
Image.alpha_composite(im, lay).convert('RGB').save(out)
