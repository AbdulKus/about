from pathlib import Path

scene = Path('scene.js')
src = scene.read_text(encoding='utf-8')

replacements = [
    (
        '    const gateRightMaterial = this.curtainDarkMaterial.clone();',
        '    const gateRightMaterial = this.curtainMaterial.clone();'
    ),
    (
        '    const gateValance = this.createLiminalCurtain(4.15, 1.18, this.curtainDarkMaterial.clone(), this.liminalSeed + 43);',
        '    const gateValance = this.createLiminalCurtain(4.15, 1.18, this.curtainMaterial.clone(), this.liminalSeed + 43);'
    ),
    (
        '    landingMaterial.color = new THREE.Color(0xd8cfba);\n    const landing = new THREE.Mesh(new THREE.BoxGeometry(8.4, .12, 6.7), landingMaterial);',
        '''    landingMaterial.color = new THREE.Color(0xf1e5ca);\n    landingMaterial.map = this.floorMaterial.map?.clone() || null;\n    if (landingMaterial.map) {\n      landingMaterial.map.wrapS = landingMaterial.map.wrapT = THREE.RepeatWrapping;\n      landingMaterial.map.repeat.set(3.9, 10.5);\n      landingMaterial.map.needsUpdate = true;\n    }\n    const landing = new THREE.Mesh(new THREE.BoxGeometry(8.4, .12, 6.7), landingMaterial);'''
    ),
    (
        '      leftFloorMaterial.map.repeat.set(22, 3.4);',
        '      leftFloorMaterial.map.repeat.set(71.3, 10.5);'
    ),
    (
        '    const leftCurtainMaterialB = this.curtainDarkMaterial.clone();',
        '    const leftCurtainMaterialB = this.curtainMaterial.clone();'
    ),
    (
        '''    leftCurtainA.scale.x = .965;\n    leftCurtainA.position.set(-leftLength * .5 - 2.7, 3.575, this.liminalCenterZ - 3.25);''',
        '    leftCurtainA.position.set(-leftLength * .5, 3.575, this.liminalCenterZ - 3.25);'
    ),
    (
        '      const t = index / (segmentCount - 1);',
        '      const t = clamp((index - 3) / (segmentCount - 4), 0, 1);'
    ),
    (
        '      const curtainB = this.createLiminalCurtain(segmentLength + .12, height, this.curtainDarkMaterial, this.liminalSeed + 200 + index * 4.7);',
        '      const curtainB = this.createLiminalCurtain(segmentLength + .12, height, this.curtainMaterial, this.liminalSeed + 200 + index * 4.7);'
    ),
    (
        '''      if (index === 0) {\n        curtainA.scale.x = .3;\n        curtainA.position.x = 2.45;\n      }\n''',
        ''
    ),
    (
        '    const leftDepth = clamp((-x - 8) / 140, 0, 1);',
        '''    const leftDepth = clamp((-x - 16) / 128, 0, 1);\n    const leftEase = leftDepth * leftDepth * (3 - 2 * leftDepth);'''
    ),
    (
        '''    if (x < -7) {''',
        '''    if (x < -12) {'''
    ),
    (
        '''          velocityX * .018 * modeA\n          + autonomous * leftDepth\n          + Math.sin(time * .7 + seed) * .012 * leftDepth''',
        '''          velocityX * .018 * modeA * leftEase\n          + autonomous * leftEase\n          + Math.sin(time * .7 + seed) * .012 * leftEase'''
    ),
    (
        '''          velocityZ * .02 * modeB\n          + Math.cos(time * .46 + seed * .3) * .018 * leftDepth''',
        '''          velocityZ * .02 * modeB * leftEase\n          + Math.cos(time * .46 + seed * .3) * .018 * leftEase'''
    ),
    (
        '          const late = Math.pow(depth, 2.15);',
        '          const late = Math.pow(depth, 2.15) * leftEase;'
    ),
    (
        '''              + pulse * (.12 + late * 1.18)\n              + coarse * late * .65\n              + jump * late * .38;''',
        '''              + pulse * late * 1.3\n              + coarse * late * .65\n              + jump * late * .38;'''
    ),
    (
        '''              + pulse * (.16 + late * 1.42)\n              + coarse * late * .82\n              + jump * late * .55;''',
        '''              + pulse * late * 1.58\n              + coarse * late * .82\n              + jump * late * .55;'''
    ),
    (
        '        const local = Math.pow(slice.strength, 1.45) * leftDepth;',
        '        const local = Math.pow(slice.strength, 1.45) * leftEase;'
    ),
    (
        '''        this.liminalLeftLight.intensity = (7.5 + Math.sin(time * 1.8 + seed) * 2.1) * (1 - leftDepth * .45) * badFlicker;\n        this.liminalLeftLight.position.z = this.liminalCenterZ + Math.sin(time * .51 + seed) * leftDepth * 1.4;''',
        '''        const flickerMix = lerp(1, badFlicker, leftEase);\n        this.liminalLeftLight.intensity = (7.5 + Math.sin(time * 1.8 + seed) * 2.1 * leftEase) * (1 - leftEase * .45) * flickerMix;\n        this.liminalLeftLight.position.z = this.liminalCenterZ + Math.sin(time * .51 + seed) * leftEase * 1.4;'''
    ),
    (
        '      this.glitch = Math.max(this.glitch, .12 + leftDepth * .92);',
        '      if (leftEase > .01) this.glitch = Math.max(this.glitch, .12 + leftEase * .92);'
    ),
]

for old, new in replacements:
    if old not in src:
        raise SystemExit(f'Expected scene fragment not found:\n{old}')
    src = src.replace(old, new, 1)

old_collision = '''    if (!this.liminalEntered && this.liminalDoorOpenAmount < .7) return true;\n    if (this.liminalEntered && z < this.liminalDoorZ + .42) return true;\n    if (z < 68.35 && Math.abs(x) > 1.62) return true;\n\n    const centerZ = this.liminalCenterZ || 70.7;'''
new_collision = '''    const centerZ = this.liminalCenterZ || 71.6;\n    if (!this.liminalEntered) {\n      if (this.liminalDoorOpenAmount < .64) return true;\n      if (Math.abs(x) > 1.62 && z < centerZ - 2.25) return true;\n      if (Math.abs(x) <= 1.62 && z < centerZ - .15) return false;\n    }\n    if (this.liminalEntered && z < this.liminalDoorZ + .42) return true;'''
if old_collision not in src:
    raise SystemExit('Entry collision block not found')
src = src.replace(old_collision, new_collision, 1)

# Delay the visible glitch ribs so the junction starts as an ordinary corridor.
src = src.replace('      const x = -10 - index * 9.2;', '      const x = -26 - index * 9.2;', 1)
src = src.replace('        strength: clamp((-x - 8) / 140, 0, 1)', '        strength: clamp((-x - 20) / 124, 0, 1)', 1)

scene.write_text(src, encoding='utf-8')

index = Path('index.html')
html = index.read_text(encoding='utf-8')
if 'scene.js?v=17' not in html:
    raise SystemExit('Expected scene cache version not found')
html = html.replace('scene.js?v=17', 'scene.js?v=18', 1)
index.write_text(html, encoding='utf-8')
