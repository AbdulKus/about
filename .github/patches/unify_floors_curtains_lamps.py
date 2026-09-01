from pathlib import Path

scene = Path('scene.js')
src = scene.read_text(encoding='utf-8')

# 1. Make the rear passage floor an exact world-scale continuation of the room floor.
old = '''    const passageFloorMaterial = this.floorMaterial.clone();
    passageFloorMaterial.color = new THREE.Color(0xd8d0bd);
    passageFloorMaterial.roughness = .58;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, length), passageFloorMaterial);'''
new = '''    const passageFloorMaterial = this.floorMaterial.clone();
    passageFloorMaterial.color.copy(this.floorMaterial.color);
    passageFloorMaterial.roughness = this.floorMaterial.roughness;
    passageFloorMaterial.map = this.floorMaterial.map?.clone() || null;
    if (passageFloorMaterial.map) {
      passageFloorMaterial.map.wrapS = passageFloorMaterial.map.wrapT = THREE.RepeatWrapping;
      passageFloorMaterial.map.repeat.set(width / 24 * 3.15, length / 70 * 10.5);
      passageFloorMaterial.map.offset.set(
        (((12 - width * .5) / 24 * 3.15) % 1 + 1) % 1,
        ((((startZ + 20) / 70 * 10.5) % 1) + 1) % 1
      );
      passageFloorMaterial.map.needsUpdate = true;
    }

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, length), passageFloorMaterial);'''
if old not in src:
    raise SystemExit('rear floor block not found')
src = src.replace(old, new, 1)

# 2. Remove the extra curtain valance above the interactive curtains: the gate must be one curtain layer only.
old = '''    const gateValance = this.createLiminalCurtain(4.15, 1.18, this.curtainMaterial.clone(), this.liminalSeed + 43);
    gateValance.position.set(0, 6.58, .025);
    this.liminalCurtainGate.add(gateValance);

'''
if old not in src:
    raise SystemExit('gate valance not found')
src = src.replace(old, '', 1)

# 3. Replace the junction floor with the same world-scale pattern, rotated 90 degrees.
old = '''    const landingMaterial = this.floorMaterial.clone();
    landingMaterial.color = new THREE.Color(0xf1e5ca);
    landingMaterial.map = this.floorMaterial.map?.clone() || null;
    if (landingMaterial.map) {
      landingMaterial.map.wrapS = landingMaterial.map.wrapT = THREE.RepeatWrapping;
      landingMaterial.map.repeat.set(3.9, 10.5);
      landingMaterial.map.needsUpdate = true;
    }
    const landing = new THREE.Mesh(new THREE.BoxGeometry(8.4, .12, 6.7), landingMaterial);
    landing.position.set(0, .02, this.liminalCenterZ);
    landing.receiveShadow = true;
    level.add(landing);'''
new = '''    const landingMaterial = this.floorMaterial.clone();
    landingMaterial.map = this.floorMaterial.map?.clone() || null;
    if (landingMaterial.map) {
      landingMaterial.map.wrapS = landingMaterial.map.wrapT = THREE.RepeatWrapping;
      landingMaterial.map.repeat.set(6.7 / 24 * 3.15, 8.4 / 70 * 10.5);
      landingMaterial.map.offset.set(
        ((((this.liminalCenterZ - 3.35) * (3.15 / 24)) % 1) + 1) % 1,
        (((-4.2 * (10.5 / 70)) % 1) + 1) % 1
      );
      landingMaterial.map.needsUpdate = true;
    }
    const landingGeometry = new THREE.PlaneGeometry(6.7, 8.4);
    landingGeometry.rotateZ(-Math.PI / 2);
    const landing = new THREE.Mesh(landingGeometry, landingMaterial);
    landing.rotation.x = -Math.PI / 2;
    landing.position.set(0, .025, this.liminalCenterZ);
    landing.receiveShadow = true;
    level.add(landing);'''
if old not in src:
    raise SystemExit('landing floor block not found')
src = src.replace(old, new, 1)

# 4. Left branch floor: same scale, 90-degree orientation, continuous along world X.
old = '''    const leftFloorMaterial = this.floorMaterial.clone();
    leftFloorMaterial.map = this.floorMaterial.map?.clone() || null;
    if (leftFloorMaterial.map) {
      leftFloorMaterial.map.wrapS = leftFloorMaterial.map.wrapT = THREE.RepeatWrapping;
      leftFloorMaterial.map.repeat.set(71.3, 10.5);
      leftFloorMaterial.map.needsUpdate = true;
    }
    this.liminalLeftFloorMaterial = leftFloorMaterial;

    const leftFloorGeometry = new THREE.PlaneGeometry(leftLength, 6.4, 96, 8);
    const leftFloor = new THREE.Mesh(leftFloorGeometry, leftFloorMaterial);
    leftFloor.rotation.x = -Math.PI / 2;
    leftFloor.position.set(-leftLength * .5, .025, this.liminalCenterZ);'''
new = '''    const leftFloorMaterial = this.floorMaterial.clone();
    leftFloorMaterial.map = this.floorMaterial.map?.clone() || null;
    if (leftFloorMaterial.map) {
      leftFloorMaterial.map.wrapS = leftFloorMaterial.map.wrapT = THREE.RepeatWrapping;
      leftFloorMaterial.map.repeat.set(6.4 / 24 * 3.15, leftLength / 70 * 10.5);
      leftFloorMaterial.map.offset.set(
        ((((this.liminalCenterZ - 3.2) * (3.15 / 24)) % 1) + 1) % 1,
        (((-leftLength * (10.5 / 70)) % 1) + 1) % 1
      );
      leftFloorMaterial.map.needsUpdate = true;
    }
    this.liminalLeftFloorMaterial = leftFloorMaterial;

    const leftFloorGeometry = new THREE.PlaneGeometry(6.4, leftLength, 8, 96);
    leftFloorGeometry.rotateZ(-Math.PI / 2);
    const leftFloor = new THREE.Mesh(leftFloorGeometry, leftFloorMaterial);
    leftFloor.rotation.x = -Math.PI / 2;
    leftFloor.position.set(-leftLength * .5, .025, this.liminalCenterZ);'''
if old not in src:
    raise SystemExit('left floor block not found')
src = src.replace(old, new, 1)

# 5. Leave a real visual opening around the junction so no second curtain layer sits behind the gate.
old = '''    const leftCurtainMaterialA = this.curtainMaterial.clone();
    const leftCurtainMaterialB = this.curtainMaterial.clone();
    const leftCurtainA = this.createLiminalCurtain(leftLength, 7.15, leftCurtainMaterialA, this.liminalSeed + 31);
    const leftCurtainB = this.createLiminalCurtain(leftLength, 7.15, leftCurtainMaterialB, this.liminalSeed + 79);
    leftCurtainA.position.set(-leftLength * .5, 3.575, this.liminalCenterZ - 3.25);
    leftCurtainB.position.set(-leftLength * .5, 3.575, this.liminalCenterZ + 3.25);'''
new = '''    const junctionHalfGap = 4.5;
    const leftCurtainLength = leftLength - junctionHalfGap;
    const leftCurtainCenterX = -(leftLength + junctionHalfGap) * .5;
    const leftCurtainMaterialA = this.curtainMaterial.clone();
    const leftCurtainMaterialB = this.curtainMaterial.clone();
    const leftCurtainA = this.createLiminalCurtain(leftCurtainLength, 7.15, leftCurtainMaterialA, this.liminalSeed + 31);
    const leftCurtainB = this.createLiminalCurtain(leftCurtainLength, 7.15, leftCurtainMaterialB, this.liminalSeed + 79);
    leftCurtainA.position.set(leftCurtainCenterX, 3.575, this.liminalCenterZ - 3.25);
    leftCurtainB.position.set(leftCurtainCenterX, 3.575, this.liminalCenterZ + 3.25);'''
if old not in src:
    raise SystemExit('left curtains block not found')
src = src.replace(old, new, 1)

# 6. Right branch floors use the same rotated world-scale pattern, with phase based on segment position.
old = '''      const floorMaterial = this.floorMaterial.clone();
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(segmentLength + .08, .12, halfWidth * 2),
        floorMaterial
      );
      floor.position.y = .015;
      floor.receiveShadow = true;
      segment.add(floor);'''
new = '''      const floorMaterial = this.floorMaterial.clone();
      floorMaterial.map = this.floorMaterial.map?.clone() || null;
      if (floorMaterial.map) {
        floorMaterial.map.wrapS = floorMaterial.map.wrapT = THREE.RepeatWrapping;
        floorMaterial.map.repeat.set(halfWidth * 2 / 24 * 3.15, segmentLength / 70 * 10.5);
        floorMaterial.map.offset.set(
          ((((this.liminalCenterZ - halfWidth) * (3.15 / 24)) % 1) + 1) % 1,
          ((((index * segmentLength) * (10.5 / 70)) % 1) + 1) % 1
        );
        floorMaterial.map.needsUpdate = true;
      }
      const rightFloorGeometry = new THREE.PlaneGeometry(halfWidth * 2, segmentLength, 5, 8);
      rightFloorGeometry.rotateZ(-Math.PI / 2);
      const floor = new THREE.Mesh(rightFloorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = .025;
      floor.receiveShadow = true;
      segment.add(floor);'''
if old not in src:
    raise SystemExit('right floor block not found')
src = src.replace(old, new, 1)

# 7. Shorten only the first side-curtain segment on the right, symmetrically on both sides, leaving the junction clear.
old = '''      const curtainA = this.createLiminalCurtain(segmentLength + .12, height, this.curtainMaterial, this.liminalSeed + index * 3.1);
      const curtainB = this.createLiminalCurtain(segmentLength + .12, height, this.curtainMaterial, this.liminalSeed + 200 + index * 4.7);
      curtainA.position.set(0, height * .5, -halfWidth);
      curtainB.position.set(0, height * .5, halfWidth);
      segment.add(curtainA, curtainB);'''
new = '''      const curtainSpan = index === 0 ? segmentLength - junctionHalfGap + .12 : segmentLength + .12;
      const curtainOffsetX = index === 0 ? junctionHalfGap * .5 : 0;
      const curtainA = this.createLiminalCurtain(curtainSpan, height, this.curtainMaterial, this.liminalSeed + index * 3.1);
      const curtainB = this.createLiminalCurtain(curtainSpan, height, this.curtainMaterial, this.liminalSeed + 200 + index * 4.7);
      curtainA.position.set(curtainOffsetX, height * .5, -halfWidth);
      curtainB.position.set(curtainOffsetX, height * .5, halfWidth);
      segment.add(curtainA, curtainB);'''
if old not in src:
    raise SystemExit('right curtains block not found')
src = src.replace(old, new, 1)

# 8. Add a dark wall directly opposite the gate so the junction reads as a T, not as another curtain doorway.
anchor = '''    const segmentLength = 6.8;
    const segmentCount = 22;'''
insert = '''    const junctionWallMaterial = new THREE.MeshStandardMaterial({
      color: 0x0b0506,
      roughness: .97,
      metalness: 0
    });
    const junctionWall = new THREE.Mesh(
      new THREE.BoxGeometry(junctionHalfGap * 2, passageHeight, .18),
      junctionWallMaterial
    );
    junctionWall.position.set(0, passageHeight * .5, this.liminalCenterZ + 3.31);
    junctionWall.receiveShadow = true;
    level.add(junctionWall);

    const segmentLength = 6.8;
    const segmentCount = 22;'''
if anchor not in src:
    raise SystemExit('segment anchor not found')
src = src.replace(anchor, insert, 1)

# 9. Add irregular alternating floor / ceiling lamps after the gate, never directly opposite it.
anchor = '''    const thresholdLight = new THREE.PointLight(0xb01328, 12, 24, 1.8);
    thresholdLight.position.set(0, 4.8, this.liminalCenterZ);
    level.add(thresholdLight);'''
lamps = '''    this.liminalLampLights = [];
    const addLiminalFloorLamp = (x, side = 1, scale = 1) => {
      const lamp = new THREE.Group();
      const z = this.liminalCenterZ + side * 2.32;
      lamp.position.set(x, 0, z);
      lamp.scale.setScalar(scale);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(.48, .58, .13, 22), this.brassMaterial);
      base.position.y = .07;
      lamp.add(base);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.045, .06, 4.45, 12), this.brassMaterial);
      pole.position.y = 2.25;
      lamp.add(pole);
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(.38, .78, .95, 24, 1, true), this.shadeMaterial);
      shade.position.y = 4.33;
      lamp.add(shade);
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(.085, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xffbd78, toneMapped: false })
      );
      glow.position.y = 4.18;
      lamp.add(glow);
      const light = new THREE.PointLight(0xffa66c, 14, 9, 1.8);
      light.position.y = 4.18;
      lamp.add(light);
      this.liminalLampLights.push(light);
      level.add(lamp);
    };

    const addLiminalCeilingLamp = (x, side = 0, scale = 1) => {
      const lamp = new THREE.Group();
      lamp.position.set(x, passageHeight, this.liminalCenterZ + side);
      lamp.scale.setScalar(scale);
      const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(.018, .018, .82, 8),
        new THREE.MeshStandardMaterial({ color: 0x161011, roughness: .86 })
      );
      cord.position.y = -.4;
      lamp.add(cord);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(.38, .5, 18, 1, true), this.shadeMaterial);
      shade.position.y = -.83;
      shade.rotation.x = Math.PI;
      lamp.add(shade);
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(.075, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xffc47e, toneMapped: false })
      );
      glow.position.y = -.98;
      lamp.add(glow);
      const light = new THREE.PointLight(0xffa85f, 13, 10, 1.85);
      light.position.y = -.98;
      lamp.add(light);
      this.liminalLampLights.push(light);
      level.add(lamp);
    };

    [
      [-16, 'floor', 1, .9],
      [-32, 'ceiling', -.35, 1],
      [-49, 'floor', -1, .86],
      [-69, 'ceiling', .4, .95],
      [-91, 'floor', 1, .82],
      [-116, 'ceiling', -.5, .9],
      [-141, 'floor', -1, .76],
      [16, 'ceiling', .3, 1],
      [33, 'floor', 1, .88],
      [51, 'ceiling', -.35, .95],
      [68, 'floor', -1, .78],
      [87, 'ceiling', .2, .84],
      [109, 'ceiling', -.12, .7],
      [132, 'ceiling', .08, .54]
    ].forEach(([x, type, side, scale]) => {
      if (type === 'floor') addLiminalFloorLamp(x, side, scale);
      else addLiminalCeilingLamp(x, side, scale);
    });

    const thresholdLight = new THREE.PointLight(0xb01328, 12, 24, 1.8);
    thresholdLight.position.set(0, 4.8, this.liminalCenterZ);
    level.add(thresholdLight);'''
if anchor not in src:
    raise SystemExit('threshold light anchor not found')
src = src.replace(anchor, lamps, 1)

scene.write_text(src, encoding='utf-8')

index = Path('index.html')
html = index.read_text(encoding='utf-8')
if 'scene.js?v=18' not in html:
    raise SystemExit('expected scene cache version v18 not found')
html = html.replace('scene.js?v=18', 'scene.js?v=19', 1)
index.write_text(html, encoding='utf-8')
