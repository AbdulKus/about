from pathlib import Path

scene = Path('scene.js')
src = scene.read_text(encoding='utf-8')

old_signature = '''  createCurtain(width, height, segments, material) {
    const geometry = new THREE.PlaneGeometry(width, height, segments, 96);'''
new_signature = '''  createCurtain(width, height, segments, material, verticalSegments = 96) {
    const geometry = new THREE.PlaneGeometry(width, height, segments, verticalSegments);'''
if old_signature not in src:
    raise SystemExit('createCurtain signature not found')
src = src.replace(old_signature, new_signature, 1)

old_left = '''    const leftCurtainMaterialA = this.curtainMaterial.clone();
    const leftCurtainMaterialB = this.curtainMaterial.clone();
    const leftCurtainA = this.createLiminalCurtain(leftCurtainLength, 7.15, leftCurtainMaterialA, this.liminalSeed + 31);
    const leftCurtainB = this.createLiminalCurtain(leftCurtainLength, 7.15, leftCurtainMaterialB, this.liminalSeed + 79);
    leftCurtainA.position.set(leftCurtainCenterX, 3.575, this.liminalCenterZ - 3.25);
    leftCurtainB.position.set(leftCurtainCenterX, 3.575, this.liminalCenterZ + 3.25);'''
new_left = '''    const leftCurtainMaterialA = this.curtainMaterial.clone();
    const leftCurtainMaterialB = this.curtainMaterial.clone();
    // Use the exact Black Lodge curtain shape from the main room here too.
    // Long corridor curtains use fewer subdivisions only to keep the live
    // procedural distortion affordable; the fold formula itself is identical.
    const leftCurtainSegments = Math.max(420, Math.round(leftCurtainLength * 3.2));
    const leftCurtainA = this.createCurtain(leftCurtainLength, 7.15, leftCurtainSegments, leftCurtainMaterialA, 32);
    const leftCurtainB = this.createCurtain(leftCurtainLength, 7.15, leftCurtainSegments, leftCurtainMaterialB, 32);
    leftCurtainA.position.set(leftCurtainCenterX, 3.575, this.liminalCenterZ - 3.25);
    leftCurtainB.position.set(leftCurtainCenterX, 3.575, this.liminalCenterZ + 3.25);'''
if old_left not in src:
    raise SystemExit('left curtain block not found')
src = src.replace(old_left, new_left, 1)

scene.write_text(src, encoding='utf-8')

index = Path('index.html')
html = index.read_text(encoding='utf-8')
if 'scene.js?v=20' not in html:
    raise SystemExit('expected cache version v20 not found')
html = html.replace('scene.js?v=20', 'scene.js?v=21', 1)
index.write_text(html, encoding='utf-8')
