# 扶摇 · 九万里

水墨风竖屏小游戏，灵感来自《庄子·逍遥游》“抟扶摇而上者九万里”。引领一群鸟穿过九重天的峡谷，从北冥飞到九霄，鸟群在终点化而为鹏。手机（触屏）和电脑（键鼠）都能玩。

完整设计说明见 [docs/扶摇-九万里.md](docs/扶摇-九万里.md)。

## 构建

```bash
pip install fonttools brotli   # 字体子集化
python3 build.py               # 生成 dist/index.html（发布版）和 dist/debug.html（带调试接口）
```

`dist/index.html` 是一个独立的 HTML 文件，字体、乐器采样、脚本全部内嵌，直接用浏览器打开即可。

配乐试听页：`python3 demo/build_demo.py`，生成到 `demo/dist/`。

## 目录

| 路径 | 内容 |
| --- | --- |
| `src/game.html` | 游戏主体（页面、状态机、鸟群、碰撞、渲染循环） |
| `parts/music.js` | 配乐引擎（改编古琴曲《列子御风》，九重天各自编配） |
| `parts/audio.js` | 音效和风雨水声 |
| `parts/scene.js` | 九重天远景、瀑布、彩虹、宫阙、龙、流星 |
| `parts/play.js` | 振翅、风、扶摇、续飞、称号、今日之风、成绩图、寓言 |
| `parts/level.js` | 关卡节奏、收集路线、合力山门、九个招牌桥段 |
| `parts/peng.js` | 结局的鹏（金碧画法） |
| `samples/` | 乐器采样（已裁剪转码，见下方署名） |
| `fonts/` | 志莽行书、马善政楷书（构建时按用字裁剪） |
| `demo/` | 配乐试听页、鹏的单独预览页 |
| `tools/` | 采样预处理等辅助脚本 |
| `test_*.py` | 浏览器自动化测试 |
| `src/game_v1–v3.html`、`backup/v3/` | 旧版本（换配乐前），留作对照 |

## 测试

测试用 Playwright 驱动本机 Chrome（`/usr/bin/google-chrome`），先运行 `python3 build.py`：

```bash
pip install playwright numpy pillow
python3 test_run.py            # 单个测试
python3 test_bot.py            # 自动驾驶飞完全程（约 3 分钟）
```

常用的几项：`test_input.py`（触屏、鼠标、键盘操作）、`test_ui_wide.py`（横屏和宽屏布局）、`test_music_game.py phone desk`（游戏里的配乐）、`test_tinted.py`（着色光晕缓存）、`test_bot.py`（全程无报错并能抵达）。

## 素材与署名

- 字体：[志莽行书](https://github.com/googlefonts/zhimangxing)、[马善政楷书](https://github.com/googlefonts/mashanzheng)，SIL Open Font License 1.1，许可全文见 `fonts/OFL-*.txt`。
- 尺八、筝、三味线、太鼓、木鱼采样：FluidR3_GM，Frank Wen，[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)，取自 [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts)，已裁剪、归一化并重新编码。游戏标题页底部也有署名。
- 配乐旋律改编自明《神奇秘谱》（1425）所载古琴曲《列子御风》（公有领域）。
