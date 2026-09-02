from pathlib import Path

scene = Path('scene.js')
src = scene.read_text(encoding='utf-8')

old_entry = '''    const doorwayWidth = 3.55;
    const doorwayHeight = 6.3;
    const sideWidth = (width - doorwayWidth) * .5;
    [-1, 1].forEach((side) => {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(sideWidth, height, .3), wallMaterial);
      sideWall.position.set(side * (doorwayWidth * .5 + sideWidth * .5), height * .5, endZ);
      sideWall.receiveShadow = true;
      passage.add(sideWall);
    });
    const endHeader = new THREE.Mesh(
      new THREE.BoxGeometry(doorwayWidth, height - doorwayHeight, .3),
      wallMaterial
    );'''
new_entry = '''    const doorwayWidth = 3.55;
    const doorwayHeight = 6.3;
    const endHeader = new THREE.Mesh(
      new THREE.BoxGeometry(doorwayWidth, height - doorwayHeight, .3),
      wallMaterial
    );'''
if old_entry not in src:
    raise SystemExit('rear passage end-wall side posts block not found')
src = src.replace(old_entry, new_entry, 1)

old_height = '      const height = Math.max(2.05, 7.05 * (1 - t * .69));'
new_height = '      const height = passageHeight;'
if old_height not in src:
    raise SystemExit('shrinking tunnel height formula not found')
src = src.replace(old_height, new_height, 1)

scene.write_text(src, encoding='utf-8')

index = Path('index.html')
html = index.read_text(encoding='utf-8')
if 'scene.js?v=19' not in html:
    raise SystemExit('expected scene cache version v19 not found')
html = html.replace('scene.js?v=19', 'scene.js?v=20', 1)
index.write_text(html, encoding='utf-8')
