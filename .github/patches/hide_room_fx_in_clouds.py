from pathlib import Path

scene = Path('scene.js')
src = scene.read_text(encoding='utf-8')
old = '''    document.documentElement.style.setProperty("--glitch-opacity", "0");
    document.documentElement.style.setProperty("--glitch-x", "0px");
    if (this.transitionBlackout) this.transitionBlackout.style.opacity = "0";'''
new = '''    document.documentElement.style.setProperty("--glitch-opacity", "0");
    document.documentElement.style.setProperty("--glitch-x", "0px");
    const roomScreenEffects = document.querySelector(".screen-effects");
    if (roomScreenEffects) roomScreenEffects.style.display = "none";
    if (this.transitionBlackout) this.transitionBlackout.style.opacity = "0";'''
if old not in src:
    raise SystemExit('enterCloudWorld FX block not found')
src = src.replace(old, new, 1)
scene.write_text(src, encoding='utf-8')

index = Path('index.html')
html = index.read_text(encoding='utf-8')
if 'scene.js?v=23' not in html:
    raise SystemExit('expected v23 cache marker not found')
html = html.replace('scene.js?v=23', 'scene.js?v=24', 1)
index.write_text(html, encoding='utf-8')
