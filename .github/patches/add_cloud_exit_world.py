from pathlib import Path

scene = Path('scene.js')
src = scene.read_text(encoding='utf-8')

# State for the stable staircase / hatch and separate cloud scene.
old = '''    this.liminalFall = false;
    this.liminalFallTime = 0;
    this.shouldRestoreContacts = sessionStorage.getItem("about-return-to-contacts") === "1";'''
new = '''    this.liminalFall = false;
    this.liminalFallTime = 0;
    this.liminalStairStartX = -142.4;
    this.liminalStairEndX = -152.55;
    this.liminalStairRise = 7.45;
    this.liminalStairSteps = 18;
    this.liminalStairSanctuary = 0;
    this.skyMode = false;
    this.skyCloudTime = 0;
    this.skyCloudClusters = [];
    this.skyCloudPuffs = [];
    this.shouldRestoreContacts = sessionStorage.getItem("about-return-to-contacts") === "1";'''
if old not in src:
    raise SystemExit('constructor liminal state block not found')
src = src.replace(old, new, 1)

old = '''    this.createRoom();
    this.createBackPassage();
    this.createBoard();'''
new = '''    this.createRoom();
    this.createBackPassage();
    this.createCloudWorld();
    this.createBoard();'''
if old not in src:
    raise SystemExit('init room block not found')
src = src.replace(old, new, 1)

# Remove the fake header above the interactive curtain. The curtain itself now reaches the ceiling.
old = '''    const doorwayWidth = 3.55;
    const doorwayHeight = 6.3;
    const endHeader = new THREE.Mesh(
      new THREE.BoxGeometry(doorwayWidth, height - doorwayHeight, .3),
      wallMaterial
    );
    endHeader.position.set(0, doorwayHeight + (height - doorwayHeight) * .5, endZ);
    endHeader.receiveShadow = true;
    passage.add(endHeader);

'''
if old not in src:
    raise SystemExit('rear passage header block not found')
src = src.replace(old, '', 1)

old = '''    const gateLeafWidth = 3.32;
    this.liminalCurtainLeft = this.createCurtain(gateLeafWidth, 6.5, 72, gateLeftMaterial, 36);
    this.liminalCurtainRight = this.createCurtain(gateLeafWidth, 6.5, 72, gateRightMaterial, 36);
    this.liminalCurtainLeftBaseX = -1.64;
    this.liminalCurtainRightBaseX = 1.64;
    this.liminalCurtainLeft.position.set(this.liminalCurtainLeftBaseX, 3.25, 0);
    this.liminalCurtainRight.position.set(this.liminalCurtainRightBaseX, 3.25, -.015);'''
new = '''    const gateLeafWidth = 3.32;
    this.liminalCurtainLeft = this.createCurtain(gateLeafWidth, passageHeight, 72, gateLeftMaterial, 40);
    this.liminalCurtainRight = this.createCurtain(gateLeafWidth, passageHeight, 72, gateRightMaterial, 40);
    this.liminalCurtainLeftBaseX = -1.64;
    this.liminalCurtainRightBaseX = 1.64;
    this.liminalCurtainLeft.position.set(this.liminalCurtainLeftBaseX, passageHeight * .5, 0);
    this.liminalCurtainRight.position.set(this.liminalCurtainRightBaseX, passageHeight * .5, -.015);'''
if old not in src:
    raise SystemExit('gate leaf block not found')
src = src.replace(old, new, 1)

# Build the stable exit staircase after corridor lights are created.
old = '''    const thresholdLight = new THREE.PointLight(0xb01328, 12, 24, 1.8);
    thresholdLight.position.set(0, 4.8, this.liminalCenterZ);'''
new = '''    this.createLiminalExit(level, passageHeight);

    const thresholdLight = new THREE.PointLight(0xb01328, 12, 24, 1.8);
    thresholdLight.position.set(0, 4.8, this.liminalCenterZ);'''
if old not in src:
    raise SystemExit('threshold light insertion point not found')
src = src.replace(old, new, 1)

# Floor collapse begins directly beneath the last lamp and drops visibly around it.
src = src.replace('    if (x > 134.5 && !this.liminalFall) {', '    if (x > 131.65 && !this.liminalFall) {', 1)
src = src.replace('        const influence = clamp((segment.x - 125) / 28, 0, 1);', '        const influence = clamp((segment.x - 121.5) / 17.5, 0, 1);', 1)

# Fade the glitch out as the stable staircase sanctuary is reached.
old = '''      if (leftEase > .01) this.glitch = Math.max(this.glitch, .12 + leftEase * .92);
    }

    if (x > 131.65 && !this.liminalFall) {'''
new = '''      if (leftEase > .01) this.glitch = Math.max(this.glitch, .12 + leftEase * .92);
    }

    this.liminalStairSanctuary = clamp((this.liminalStairStartX + 2.4 - x) / 6.2, 0, 1);
    if (this.liminalStairSanctuary > 0) {
      this.glitch *= 1 - this.liminalStairSanctuary * .94;
    }

    if (x > 131.65 && !this.liminalFall) {'''
if old not in src:
    raise SystemExit('stair sanctuary insertion point not found')
src = src.replace(old, new, 1)

# Add stable staircase, hatch and separate cloud world methods.
marker = '''  registerLiminalDistortion(mesh, kind) {'''
if marker not in src:
    raise SystemExit('registerLiminalDistortion marker not found')
methods = r'''  createLiminalExit(level, passageHeight) {
    const centerZ = this.liminalCenterZ;
    const startX = this.liminalStairStartX;
    const endX = this.liminalStairEndX;
    const stepCount = this.liminalStairSteps;
    const totalRun = startX - endX;
    const stepDepth = totalRun / stepCount;
    const stepRise = this.liminalStairRise / stepCount;

    const exit = new THREE.Group();
    exit.name = "stableExitStaircase";
    level.add(exit);
    this.liminalExitGroup = exit;

    const stepMaterial = new THREE.MeshStandardMaterial({
      color: 0x241819,
      roughness: .58,
      metalness: .08,
      emissive: 0x16090b,
      emissiveIntensity: .34
    });
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x8a6744,
      roughness: .34,
      metalness: .58,
      emissive: 0x2b1809,
      emissiveIntensity: .18
    });

    for (let index = 0; index < stepCount; index += 1) {
      const topY = (index + 1) * stepRise;
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(stepDepth + .035, topY, 2.62),
        stepMaterial
      );
      step.position.set(startX - stepDepth * (index + .5), topY * .5, centerZ);
      step.castShadow = true;
      step.receiveShadow = true;
      exit.add(step);

      const lip = new THREE.Mesh(
        new THREE.BoxGeometry(.055, .055, 2.68),
        trimMaterial
      );
      lip.position.set(startX - stepDepth * (index + 1) + .025, topY + .018, centerZ);
      exit.add(lip);
    }

    [-1.48, 1.48].forEach((side) => {
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(.035, .045, totalRun * 1.24, 10),
        trimMaterial
      );
      rail.rotation.z = Math.PI * .455;
      rail.position.set((startX + endX) * .5, this.liminalStairRise * .5 + 1.02, centerZ + side);
      exit.add(rail);

      for (let index = 1; index < stepCount; index += 3) {
        const t = index / stepCount;
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(.028, .035, 1.0, 9),
          trimMaterial
        );
        post.position.set(lerp(startX, endX, t), t * this.liminalStairRise + .52, centerZ + side);
        exit.add(post);
      }
    });

    const hatchY = this.liminalStairRise + 3.62;
    const hatchX = endX - .08;
    const hatchWidth = 3.18;
    const hatchDepth = 3.05;
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x211d19,
      roughness: .46,
      metalness: .68,
      emissive: 0x15110b,
      emissiveIntensity: .2
    });

    const hatch = new THREE.Group();
    hatch.position.set(hatchX, hatchY, centerZ);
    exit.add(hatch);
    this.liminalHatchGroup = hatch;

    [[hatchWidth, .16, .18, 0, -hatchDepth * .5],
     [hatchWidth, .16, .18, 0, hatchDepth * .5],
     [.18, .16, hatchDepth, -hatchWidth * .5, 0],
     [.18, .16, hatchDepth, hatchWidth * .5, 0]].forEach(([w, h, d, x, z]) => {
      const part = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMaterial);
      part.position.set(x, 0, z);
      hatch.add(part);
    });

    const skyPortal = new THREE.Mesh(
      new THREE.PlaneGeometry(hatchWidth - .22, hatchDepth - .22),
      new THREE.MeshBasicMaterial({ color: 0x9fd4f3, side: THREE.DoubleSide, toneMapped: false })
    );
    skyPortal.rotation.x = -Math.PI / 2;
    skyPortal.position.y = .07;
    hatch.add(skyPortal);

    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(hatchWidth - .18, .12, hatchDepth - .2),
      frameMaterial
    );
    lid.position.set(1.6, .9, 0);
    lid.rotation.z = -1.03;
    hatch.add(lid);

    const coolGlow = new THREE.PointLight(0xbfe6ff, 27, 18, 1.6);
    coolGlow.position.set(hatchX + 1.25, hatchY - 2.2, centerZ);
    exit.add(coolGlow);
    const warmGlow = new THREE.PointLight(0xffb370, 18, 14, 1.7);
    warmGlow.position.set(startX - 2.2, 2.45, centerZ - .85);
    exit.add(warmGlow);
  }

  getLiminalStairHeight(x, z) {
    if (!this.liminalEntered || this.skyMode || !this.liminalCenterZ) return 0;
    if (Math.abs(z - this.liminalCenterZ) > 1.42) return 0;
    const progress = clamp(
      (this.liminalStairStartX - x) / (this.liminalStairStartX - this.liminalStairEndX),
      0,
      1
    );
    const eased = progress * progress * (3 - 2 * progress);
    return eased * this.liminalStairRise;
  }

  createCloudWorld() {
    this.skyScene = new THREE.Scene();
    this.skyScene.background = new THREE.Color(0x91c8eb);
    this.skyScene.fog = new THREE.FogExp2(0xc4dfef, .0062);

    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(300, 32, 20),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          topColor: { value: new THREE.Color(0x70b4e5) },
          horizonColor: { value: new THREE.Color(0xd9edf7) },
          bottomColor: { value: new THREE.Color(0x8bbcd8) }
        },
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 horizonColor;
          uniform vec3 bottomColor;
          varying vec3 vDir;
          void main() {
            float h = clamp(vDir.y * .5 + .5, 0.0, 1.0);
            vec3 low = mix(bottomColor, horizonColor, smoothstep(.12, .5, h));
            vec3 col = mix(low, topColor, smoothstep(.5, .94, h));
            gl_FragColor = vec4(col, 1.0);
          }
        `
      })
    );
    this.skyScene.add(skyDome);
    this.skyDome = skyDome;

    this.skyHemiLight = new THREE.HemisphereLight(0xe8f7ff, 0x7899ad, 2.0);
    this.skyScene.add(this.skyHemiLight);
    this.skySunLight = new THREE.DirectionalLight(0xfff4da, 2.15);
    this.skySunLight.position.set(-18, 28, 12);
    this.skyScene.add(this.skySunLight);

    const cloudGeometry = new THREE.IcosahedronGeometry(1, 2);
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xf7fbff,
      roughness: .97,
      metalness: 0,
      transparent: true,
      opacity: .82,
      depthWrite: false
    });

    const clusterCount = 52;
    const puffsPerCluster = 9;
    const instanceCount = clusterCount * puffsPerCluster;
    this.skyCloudMesh = new THREE.InstancedMesh(cloudGeometry, cloudMaterial, instanceCount);
    this.skyCloudMesh.frustumCulled = false;
    this.skyScene.add(this.skyCloudMesh);
    this.skyCloudDummy = new THREE.Object3D();

    let puffIndex = 0;
    for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = random(18, 92);
      const cluster = {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        baseY: random(-8.5, 9),
        phase: Math.random() * Math.PI * 2,
        speedX: random(-.42, .42),
        speedZ: random(-.34, .34),
        drift: random(.07, .18),
        scale: random(1.25, 3.7)
      };
      this.skyCloudClusters.push(cluster);

      for (let local = 0; local < puffsPerCluster; local += 1) {
        const side = local - (puffsPerCluster - 1) * .5;
        this.skyCloudPuffs.push({
          cluster: clusterIndex,
          index: puffIndex,
          lx: side * random(.72, 1.15) + random(-.55, .55),
          ly: random(-.8, .8) + Math.cos(local * 1.7) * .35,
          lz: random(-1.55, 1.55),
          sx: random(.85, 1.45),
          sy: random(.62, 1.08),
          sz: random(.95, 1.7),
          phase: Math.random() * Math.PI * 2
        });
        puffIndex += 1;
      }
    }
    this.updateCloudWorld(0);
  }

  updateCloudWorld(delta) {
    if (!this.skyCloudMesh) return;
    this.skyCloudTime += delta;
    const time = this.skyCloudTime;
    const cameraX = this.freeCameraPosition.x || 0;
    const cameraZ = this.freeCameraPosition.z || 0;

    this.skyCloudClusters.forEach((cluster) => {
      cluster.x += cluster.speedX * delta;
      cluster.z += cluster.speedZ * delta;
      const dx = cluster.x - cameraX;
      const dz = cluster.z - cameraZ;
      if (dx > 98) cluster.x -= 196;
      else if (dx < -98) cluster.x += 196;
      if (dz > 98) cluster.z -= 196;
      else if (dz < -98) cluster.z += 196;
    });

    this.skyCloudPuffs.forEach((puff) => {
      const cluster = this.skyCloudClusters[puff.cluster];
      const breathe = 1 + Math.sin(time * cluster.drift + puff.phase) * .09;
      const swell = 1 + Math.cos(time * cluster.drift * .73 + puff.phase * 1.3) * .055;
      const clusterY = cluster.baseY + Math.sin(time * cluster.drift + cluster.phase) * .9;
      this.skyCloudDummy.position.set(
        cluster.x + puff.lx * cluster.scale + Math.sin(time * .055 + puff.phase) * .18,
        clusterY + puff.ly * cluster.scale * .52,
        cluster.z + puff.lz * cluster.scale * .66
      );
      this.skyCloudDummy.scale.set(
        puff.sx * cluster.scale * breathe,
        puff.sy * cluster.scale * swell,
        puff.sz * cluster.scale * breathe
      );
      this.skyCloudDummy.rotation.set(
        Math.sin(puff.phase) * .12,
        time * .01 + puff.phase,
        Math.cos(puff.phase) * .1
      );
      this.skyCloudDummy.updateMatrix();
      this.skyCloudMesh.setMatrixAt(puff.index, this.skyCloudDummy.matrix);
    });
    this.skyCloudMesh.instanceMatrix.needsUpdate = true;
  }

  enterCloudWorld() {
    if (this.skyMode) return;
    this.skyMode = true;
    if (this.liminalHatchGroup) this.liminalHatchGroup.visible = false;
    this.scene.visible = false;
    this.renderer.shadowMap.enabled = false;
    this.glitch = 0;
    this.nextGlitch = Number.POSITIVE_INFINITY;
    this.postMaterial.uniforms.glitch.value = 0;
    document.documentElement.style.setProperty("--glitch-opacity", "0");
    document.documentElement.style.setProperty("--glitch-x", "0px");
    if (this.transitionBlackout) this.transitionBlackout.style.opacity = "0";
    this.doorPrompt?.classList.remove("is-visible");
    this.freeCameraKeys.clear();
    this.freeCameraVelocity.set(0, 0, 0);
    this.resetMobileControls();
    this.freeCameraPosition.set(0, 0, 0);
    this.freeYaw = 0;
    this.freePitch = .03;
    this.walkAmount = 0;
    this.camera.near = .1;
    this.camera.far = 420;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 3.65, 0);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.freePitch, this.freeYaw, 0);
  }

  updateSkyCamera(delta) {
    if (this.isTouch) {
      this.freeYaw -= this.mobileLookInput.x * 1.72 * delta;
      this.freePitch = clamp(this.freePitch + this.mobileLookInput.y * 1.34 * delta, -Math.PI * .46, Math.PI * .46);
    }
    const forward = new THREE.Vector3(-Math.sin(this.freeYaw), 0, -Math.cos(this.freeYaw));
    const right = new THREE.Vector3(Math.cos(this.freeYaw), 0, -Math.sin(this.freeYaw));
    const input = new THREE.Vector3();
    if (this.freeCameraKeys.has("KeyW")) input.add(forward);
    if (this.freeCameraKeys.has("KeyS")) input.sub(forward);
    if (this.freeCameraKeys.has("KeyD")) input.add(right);
    if (this.freeCameraKeys.has("KeyA")) input.sub(right);
    const keyboardMoving = input.lengthSq() > 0;
    const mobileStrength = clamp(this.mobileMoveInput.length(), 0, 1);
    if (mobileStrength > .025) {
      input.addScaledVector(forward, this.mobileMoveInput.y);
      input.addScaledVector(right, this.mobileMoveInput.x);
    }
    const speed = this.freeCameraKeys.has("ShiftLeft") || this.freeCameraKeys.has("ShiftRight") ? 9.2 : 5.1;
    const inputStrength = keyboardMoving ? 1 : mobileStrength;
    const desired = input.lengthSq() > 0 ? input.normalize().multiplyScalar(speed * inputStrength) : input;
    this.freeCameraVelocity.x = damp(this.freeCameraVelocity.x, desired.x, 5.8, delta);
    this.freeCameraVelocity.z = damp(this.freeCameraVelocity.z, desired.z, 5.8, delta);
    this.freeCameraPosition.x += this.freeCameraVelocity.x * delta;
    this.freeCameraPosition.z += this.freeCameraVelocity.z * delta;

    this.camera.position.set(
      this.freeCameraPosition.x,
      3.65 + Math.sin(this.skyCloudTime * .32) * .06,
      this.freeCameraPosition.z
    );
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.freePitch, this.freeYaw, 0);
    if (this.skyDome) this.skyDome.position.copy(this.camera.position);
  }

'''
src = src.replace(marker, methods + marker, 1)

# Raise camera smoothly on the physical staircase and transition when the top is reached.
old = '''    const groundEye = lerp(this.freeStartEyeHeight, this.freeEyeHeight, this.freeGroundBlend);
    const actualSpeed = Math.hypot(this.freeCameraVelocity.x, this.freeCameraVelocity.z);'''
new = '''    const stairHeight = this.getLiminalStairHeight(this.freeCameraPosition.x, this.freeCameraPosition.z);
    const groundEye = lerp(this.freeStartEyeHeight, this.freeEyeHeight, this.freeGroundBlend) + stairHeight;
    const actualSpeed = Math.hypot(this.freeCameraVelocity.x, this.freeCameraVelocity.z);'''
if old not in src:
    raise SystemExit('groundEye block not found')
src = src.replace(old, new, 1)

old = '''    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.freePitch, this.freeYaw, Math.sin(this.walkPhase) * .008 * this.walkAmount);
  }

  isWalkBlocked(x, z) {'''
new = '''    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.freePitch, this.freeYaw, Math.sin(this.walkPhase) * .008 * this.walkAmount);

    if (!this.skyMode
      && this.liminalEntered
      && this.freeCameraPosition.x <= this.liminalStairEndX + .2
      && stairHeight >= this.liminalStairRise * .965) {
      this.enterCloudWorld();
    }
  }

  isWalkBlocked(x, z) {'''
if old not in src:
    raise SystemExit('updateFreeCamera end block not found')
src = src.replace(old, new, 1)

src = src.replace('  isWalkBlocked(x, z) {\n    if (this.liminalFall) return false;', '  isWalkBlocked(x, z) {\n    if (this.skyMode) return false;\n    if (this.liminalFall) return false;', 1)

# Sky world uses its own controls and stops updating the old room.
old = '''  updateTheme(delta) {
    const target = this.themeDefinitions[this.activeTheme];'''
new = '''  updateTheme(delta) {
    if (this.skyMode) return;
    const target = this.themeDefinitions[this.activeTheme];'''
if old not in src:
    raise SystemExit('updateTheme marker not found')
src = src.replace(old, new, 1)

old = '''  updateCamera(delta) {
    if (this.portalSequence) {'''
new = '''  updateCamera(delta) {
    if (this.skyMode) {
      this.updateSkyCamera(delta);
      return;
    }
    if (this.portalSequence) {'''
if old not in src:
    raise SystemExit('updateCamera marker not found')
src = src.replace(old, new, 1)

old = '''  updateEffects(delta) {
    const theme = this.themeDefinitions[this.activeTheme];
    this.updateLiminalWorld(delta);
    if (!this.reduceMotion && this.elapsed > this.nextGlitch) {'''
new = '''  updateEffects(delta) {
    if (this.skyMode) {
      this.glitch = 0;
      this.postMaterial.uniforms.glitch.value = 0;
      document.documentElement.style.setProperty("--glitch-opacity", "0");
      document.documentElement.style.setProperty("--glitch-x", "0px");
      this.updateCloudWorld(delta);
      return;
    }
    const theme = this.themeDefinitions[this.activeTheme];
    this.updateLiminalWorld(delta);
    if (!this.reduceMotion && this.liminalStairSanctuary < .08 && this.elapsed > this.nextGlitch) {'''
if old not in src:
    raise SystemExit('updateEffects marker not found')
src = src.replace(old, new, 1)

old = '''    this.glitch = Math.max(theme.glitch, this.glitch - delta * (this.activeTheme === "fever" ? 1.45 : 2.9));
    this.postMaterial.uniforms.glitch.value = this.glitch;'''
new = '''    this.glitch = Math.max(theme.glitch, this.glitch - delta * (this.activeTheme === "fever" ? 1.45 : 2.9));
    if (this.liminalStairSanctuary > 0) {
      this.glitch *= 1 - this.liminalStairSanctuary * .96;
    }
    this.postMaterial.uniforms.glitch.value = this.glitch;'''
if old not in src:
    raise SystemExit('glitch decay block not found')
src = src.replace(old, new, 1)

old = '''  renderFrame() {
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.postScene, this.postCamera);
  }'''
new = '''  renderFrame() {
    if (this.skyMode) {
      this.renderer.setRenderTarget(null);
      this.renderer.clear();
      this.renderer.render(this.skyScene, this.camera);
      return;
    }
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.postScene, this.postCamera);
  }'''
if old not in src:
    raise SystemExit('renderFrame block not found')
src = src.replace(old, new, 1)

scene.write_text(src, encoding='utf-8')

index = Path('index.html')
html = index.read_text(encoding='utf-8')
if 'scene.js?v=22' not in html:
    raise SystemExit('expected scene cache version v22 not found')
html = html.replace('scene.js?v=22', 'scene.js?v=23', 1)
index.write_text(html, encoding='utf-8')
