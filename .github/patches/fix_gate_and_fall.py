from pathlib import Path

scene = Path('scene.js')
src = scene.read_text(encoding='utf-8')

old_gate = '''    const gateLeftMaterial = this.curtainMaterial.clone();
    const gateRightMaterial = this.curtainMaterial.clone();
    this.liminalCurtainLeft = this.createLiminalCurtain(2.16, 6.5, gateLeftMaterial, this.liminalSeed + 14);
    this.liminalCurtainRight = this.createLiminalCurtain(2.16, 6.5, gateRightMaterial, this.liminalSeed + 29);
    this.liminalCurtainLeftBaseX = -1.02;
    this.liminalCurtainRightBaseX = 1.02;
    this.liminalCurtainLeft.position.set(this.liminalCurtainLeftBaseX, 3.25, 0);
    this.liminalCurtainRight.position.set(this.liminalCurtainRightBaseX, 3.25, -.015);
    this.liminalCurtainGate.add(this.liminalCurtainLeft, this.liminalCurtainRight);'''
new_gate = '''    const gateLeftMaterial = this.curtainMaterial.clone();
    const gateRightMaterial = this.curtainMaterial.clone();
    // The interactive curtain is the whole rear-passage wall: each leaf spans
    // half the full 6.4 m passage width with a tiny overlap at the seam.
    const gateLeafWidth = 3.32;
    this.liminalCurtainLeft = this.createCurtain(gateLeafWidth, 6.5, 72, gateLeftMaterial, 36);
    this.liminalCurtainRight = this.createCurtain(gateLeafWidth, 6.5, 72, gateRightMaterial, 36);
    this.liminalCurtainLeftBaseX = -1.64;
    this.liminalCurtainRightBaseX = 1.64;
    this.liminalCurtainLeft.position.set(this.liminalCurtainLeftBaseX, 3.25, 0);
    this.liminalCurtainRight.position.set(this.liminalCurtainRightBaseX, 3.25, -.015);
    this.liminalCurtainGate.add(this.liminalCurtainLeft, this.liminalCurtainRight);'''
if old_gate not in src:
    raise SystemExit('interactive gate block not found')
src = src.replace(old_gate, new_gate, 1)

old_anim = '''      const gather = 1 - doorEase * .4;
      const breathe = Math.sin(this.elapsed * 3.1) * .018 * doorEase;
      this.liminalCurtainLeft.position.x = lerp(this.liminalCurtainLeftBaseX, -2.42, doorEase);
      this.liminalCurtainRight.position.x = lerp(this.liminalCurtainRightBaseX, 2.42, doorEase);'''
new_anim = '''      const gather = 1 - doorEase * .55;
      const breathe = Math.sin(this.elapsed * 3.1) * .018 * doorEase;
      // Gather the full-width leaves against the corridor edges. At full open
      // they visually become the side bunches instead of exposing empty holes.
      this.liminalCurtainLeft.position.x = lerp(this.liminalCurtainLeftBaseX, -2.43, doorEase);
      this.liminalCurtainRight.position.x = lerp(this.liminalCurtainRightBaseX, 2.43, doorEase);'''
if old_anim not in src:
    raise SystemExit('curtain animation block not found')
src = src.replace(old_anim, new_anim, 1)

old_lamp = "      [68, 'floor', -1, .78],"
new_lamp = "      [68, 'ceiling', .34, .78],"
if old_lamp not in src:
    raise SystemExit('right lamp x=68 not found')
src = src.replace(old_lamp, new_lamp, 1)

old_fall = '    if (x > 139 && !this.liminalFall) {'
new_fall = '    if (x > 134.5 && !this.liminalFall) {'
if old_fall not in src:
    raise SystemExit('fall trigger not found')
src = src.replace(old_fall, new_fall, 1)

scene.write_text(src, encoding='utf-8')

index = Path('index.html')
html = index.read_text(encoding='utf-8')
if 'scene.js?v=21' not in html:
    raise SystemExit('expected scene cache version v21 not found')
html = html.replace('scene.js?v=21', 'scene.js?v=22', 1)
index.write_text(html, encoding='utf-8')
