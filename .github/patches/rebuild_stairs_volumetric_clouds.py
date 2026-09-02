from pathlib import Path

scene = Path('scene.js')
src = scene.read_text(encoding='utf-8')

# Make the staircase longer, with a real landing beyond the hatch.
src = src.replace('    this.liminalStairStartX = -142.4;\n    this.liminalStairEndX = -152.55;\n    this.liminalStairRise = 7.45;\n    this.liminalStairSteps = 18;',
'''    this.liminalStairStartX = -139.5;
    this.liminalStairEndX = -157.0;
    this.liminalStairExitX = -160.05;
    this.liminalStairRise = 9.2;
    this.liminalStairSteps = 24;
    this.skyBaseY = 0;''', 1)

start = src.index('  createLiminalExit(level, passageHeight) {')
end = src.index('  registerLiminalDistortion(mesh, kind) {', start)

methods = r'''  createLiminalExit(level, passageHeight) {
    const centerZ = this.liminalCenterZ;
    const startX = this.liminalStairStartX;
    const endX = this.liminalStairEndX;
    const exitX = this.liminalStairExitX;
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
      roughness: .62,
      metalness: .06,
      emissive: 0x14080a,
      emissiveIntensity: .26
    });
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x9b754c,
      roughness: .31,
      metalness: .62,
      emissive: 0x29170a,
      emissiveIntensity: .16
    });
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x18090c,
      roughness: .91,
      metalness: .02
    });

    for (let index = 0; index < stepCount; index += 1) {
      const topY = (index + 1) * stepRise;
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(stepDepth + .045, topY, 2.72),
        stepMaterial
      );
      step.position.set(startX - stepDepth * (index + .5), topY * .5, centerZ);
      step.castShadow = true;
      step.receiveShadow = true;
      exit.add(step);

      const lip = new THREE.Mesh(
        new THREE.BoxGeometry(.06, .055, 2.78),
        trimMaterial
      );
      lip.position.set(startX - stepDepth * (index + 1) + .03, topY + .02, centerZ);
      exit.add(lip);
    }

    const landingLength = endX - exitX + .28;
    const landing = new THREE.Mesh(
      new THREE.BoxGeometry(landingLength, .18, 2.72),
      stepMaterial
    );
    landing.position.set((endX + exitX) * .5, this.liminalStairRise - .09, centerZ);
    landing.castShadow = true;
    landing.receiveShadow = true;
    exit.add(landing);

    const stairShellLength = startX - exitX + .6;
    [-1.58, 1.58].forEach((zOffset) => {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(stairShellLength, this.liminalStairRise + 4.4, .16),
        wallMaterial
      );
      wall.position.set((startX + exitX) * .5, (this.liminalStairRise + 4.4) * .5, centerZ + zOffset);
      wall.receiveShadow = true;
      exit.add(wall);
    });

    const makeRail = (a, b, radius = .045) => {
      const direction = b.clone().sub(a);
      const length = direction.length();
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, length, 12),
        trimMaterial
      );
      rail.position.copy(a).add(b).multiplyScalar(.5);
      rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      rail.castShadow = true;
      exit.add(rail);
      return rail;
    };

    [-1.46, 1.46].forEach((side) => {
      const railStart = new THREE.Vector3(startX + .12, 1.03, centerZ + side);
      const railEnd = new THREE.Vector3(endX - .08, this.liminalStairRise + 1.03, centerZ + side);
      makeRail(railStart, railEnd, .048);

      const landingRailEnd = new THREE.Vector3(exitX + .34, this.liminalStairRise + 1.03, centerZ + side);
      makeRail(railEnd, landingRailEnd, .048);

      for (let index = 1; index < stepCount; index += 3) {
        const stepX = startX - stepDepth * (index + .5);
        const topY = (index + 1) * stepRise;
        makeRail(
          new THREE.Vector3(stepX, topY + .04, centerZ + side),
          new THREE.Vector3(stepX, topY + 1.02, centerZ + side),
          .034
        );
      }
      [endX - .42, exitX + .55].forEach((postX) => {
        makeRail(
          new THREE.Vector3(postX, this.liminalStairRise + .04, centerZ + side),
          new THREE.Vector3(postX, this.liminalStairRise + 1.03, centerZ + side),
          .034
        );
      });
    });

    const hatchY = this.liminalStairRise + 3.58;
    const hatchX = endX - 1.55;
    const hatchWidth = 3.32;
    const hatchDepth = 3.04;
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x211d19,
      roughness: .44,
      metalness: .68,
      emissive: 0x15110b,
      emissiveIntensity: .2
    });

    const hatch = new THREE.Group();
    hatch.position.set(hatchX, hatchY, centerZ);
    exit.add(hatch);
    this.liminalHatchGroup = hatch;

    [[hatchWidth, .17, .18, 0, -hatchDepth * .5],
     [hatchWidth, .17, .18, 0, hatchDepth * .5],
     [.18, .17, hatchDepth, -hatchWidth * .5, 0],
     [.18, .17, hatchDepth, hatchWidth * .5, 0]].forEach(([w, h, d, x, z]) => {
      const part = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMaterial);
      part.position.set(x, 0, z);
      hatch.add(part);
    });

    const skyPortal = new THREE.Mesh(
      new THREE.PlaneGeometry(hatchWidth - .2, hatchDepth - .2),
      new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        depthWrite: false,
        uniforms: { time: { value: 0 } },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float time;
          void main() {
            float haze = sin(vUv.x * 8.0 + time * .12) * .025 + sin(vUv.y * 11.0 - time * .08) * .018;
            vec3 low = vec3(.72, .88, .97);
            vec3 high = vec3(.28, .60, .86);
            vec3 col = mix(low, high, clamp(vUv.y + haze, 0.0, 1.0));
            gl_FragColor = vec4(col, 1.0);
          }
        `
      })
    );
    skyPortal.rotation.x = -Math.PI / 2;
    skyPortal.position.y = .075;
    hatch.add(skyPortal);
    this.liminalSkyPortal = skyPortal;

    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(hatchWidth - .16, .12, hatchDepth - .18),
      frameMaterial
    );
    lid.position.set(1.7, .95, 0);
    lid.rotation.z = -1.06;
    hatch.add(lid);

    const coolGlow = new THREE.PointLight(0xc7ebff, 31, 21, 1.55);
    coolGlow.position.set(hatchX + .35, hatchY - 2.0, centerZ);
    exit.add(coolGlow);
    const warmGlow = new THREE.PointLight(0xffad69, 19, 15, 1.7);
    warmGlow.position.set(startX - 2.8, 2.65, centerZ - .78);
    exit.add(warmGlow);
  }

  getLiminalStairHeight(x, z) {
    if (!this.liminalEntered || this.skyMode || !this.liminalCenterZ) return 0;
    if (Math.abs(z - this.liminalCenterZ) > 1.38) return 0;
    if (x >= this.liminalStairStartX) return 0;
    if (x <= this.liminalStairEndX) return this.liminalStairRise;

    const progress = clamp(
      (this.liminalStairStartX - x) / (this.liminalStairStartX - this.liminalStairEndX),
      0,
      1
    );
    const stepFloat = progress * this.liminalStairSteps;
    const whole = Math.floor(stepFloat);
    const fraction = stepFloat - whole;
    const climbRaw = clamp((fraction - .52) / .4, 0, 1);
    const climb = climbRaw * climbRaw * (3 - 2 * climbRaw);
    const stepRise = this.liminalStairRise / this.liminalStairSteps;
    return Math.min(this.liminalStairRise, (whole + climb) * stepRise);
  }

  createCloudWorld() {
    this.skyScene = new THREE.Scene();
    this.skyRenderCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.skyCloudTime = 0;

    this.skyCloudMaterial = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        uTime: { value: 0 },
        uAspect: { value: 1 },
        uTanHalfFov: { value: Math.tan(THREE.MathUtils.degToRad(this.camera.fov * .5)) },
        uCameraPos: { value: new THREE.Vector3() },
        uForward: { value: new THREE.Vector3(0, 0, -1) },
        uRight: { value: new THREE.Vector3(1, 0, 0) },
        uUp: { value: new THREE.Vector3(0, 1, 0) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uAspect;
        uniform float uTanHalfFov;
        uniform vec3 uCameraPos;
        uniform vec3 uForward;
        uniform vec3 uRight;
        uniform vec3 uUp;

        float hash31(vec3 p) {
          p = fract(p * .1031);
          p += dot(p, p.yzx + 33.33);
          return fract((p.x + p.y) * p.z);
        }

        float noise3(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
          float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
          float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
          float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
          float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
          float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
          float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
          float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
          float nx00 = mix(n000, n100, f.x);
          float nx10 = mix(n010, n110, f.x);
          float nx01 = mix(n001, n101, f.x);
          float nx11 = mix(n011, n111, f.x);
          return mix(mix(nx00, nx10, f.y), mix(nx01, nx11, f.y), f.z);
        }

        float cloudDensity(vec3 p) {
          vec3 drift = vec3(uTime * .72, sin(uTime * .035) * 1.7, uTime * .26);
          vec3 q = p + drift;
          q.xz += vec2(
            sin(q.z * .018 + uTime * .055),
            sin(q.x * .016 - uTime * .043)
          ) * 5.2;

          float macro = noise3(q * .026);
          float body = noise3(q * .061 + vec3(9.7, 3.1, -7.2));
          float fluff = noise3(q * .135 + vec3(-4.1, 11.3, 5.8));
          float shape = macro * .58 + body * .31 + fluff * .11;

          float relativeY = abs(p.y - uCameraPos.y);
          float vertical = 1.0 - smoothstep(17.0, 34.0, relativeY);
          float pockets = smoothstep(.535, .69, shape);
          return pockets * vertical;
        }

        vec3 skyColor(vec3 rd, vec3 sunDir) {
          float h = clamp(rd.y * .5 + .5, 0.0, 1.0);
          vec3 bottom = vec3(.54, .73, .84);
          vec3 horizon = vec3(.82, .91, .96);
          vec3 top = vec3(.28, .57, .82);
          vec3 col = mix(bottom, horizon, smoothstep(.05, .48, h));
          col = mix(col, top, smoothstep(.48, .96, h));
          float sunGlow = pow(max(dot(rd, sunDir), 0.0), 18.0);
          float sunCore = pow(max(dot(rd, sunDir), 0.0), 520.0);
          col += vec3(1.0, .78, .5) * sunGlow * .16;
          col += vec3(1.0, .92, .72) * sunCore * 1.35;
          return col;
        }

        void main() {
          vec2 screen = vUv * 2.0 - 1.0;
          screen.x *= uAspect;
          vec3 rd = normalize(
            uForward
            + uRight * screen.x * uTanHalfFov
            + uUp * screen.y * uTanHalfFov
          );
          vec3 ro = uCameraPos;
          vec3 sunDir = normalize(vec3(-.48, .72, .34));
          vec3 color = skyColor(rd, sunDir);
          float transmittance = 1.0;
          float jitter = hash31(vec3(gl_FragCoord.xy, fract(uTime))) * 2.4;
          float t = 1.4 + jitter;

          for (int i = 0; i < 24; i++) {
            vec3 pos = ro + rd * t;
            float density = cloudDensity(pos);
            if (density > .006) {
              float edgeLight = 1.0 - smoothstep(.18, .92, density);
              float sunFacing = pow(max(dot(rd, sunDir), 0.0), 5.0);
              float powder = 1.0 - exp(-density * 4.2);
              vec3 shadow = vec3(.48, .57, .64);
              vec3 white = vec3(1.02, 1.015, .99);
              float lighting = clamp(.52 + edgeLight * .48 + sunFacing * .18, .0, 1.18);
              vec3 cloud = mix(shadow, white, lighting);
              cloud *= .84 + powder * .25;

              float stepLength = mix(3.1, 5.6, clamp(t / 125.0, 0.0, 1.0));
              float alpha = 1.0 - exp(-density * stepLength * .34);
              color = mix(color, cloud, alpha * transmittance);
              transmittance *= 1.0 - alpha;
              if (transmittance < .035) break;
            }
            t += mix(3.1, 5.6, clamp(t / 125.0, 0.0, 1.0));
            if (t > 145.0) break;
          }

          float grain = (hash31(vec3(gl_FragCoord.xy, floor(uTime * 11.0))) - .5) * .008;
          color += grain;
          gl_FragColor = vec4(clamp(color, 0.0, 1.15), 1.0);
        }
      `
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.skyCloudMaterial);
    quad.frustumCulled = false;
    this.skyScene.add(quad);
    this.skyCloudQuad = quad;
  }

  updateCloudWorld(delta) {
    if (!this.skyCloudMaterial) return;
    this.skyCloudTime += delta;
    const uniforms = this.skyCloudMaterial.uniforms;
    uniforms.uTime.value = this.skyCloudTime;
    uniforms.uAspect.value = this.camera.aspect;
    uniforms.uTanHalfFov.value = Math.tan(THREE.MathUtils.degToRad(this.camera.fov * .5));
    uniforms.uCameraPos.value.set(
      this.freeCameraPosition.x,
      this.skyBaseY,
      this.freeCameraPosition.z
    );

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    uniforms.uForward.value.copy(forward);
    uniforms.uRight.value.copy(right);
    uniforms.uUp.value.copy(up);

    if (this.liminalSkyPortal?.material?.uniforms?.time) {
      this.liminalSkyPortal.material.uniforms.time.value = this.skyCloudTime;
    }
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
    const roomScreenEffects = document.querySelector(".screen-effects");
    if (roomScreenEffects) roomScreenEffects.style.display = "none";
    if (this.transitionBlackout) this.transitionBlackout.style.opacity = "0";
    this.doorPrompt?.classList.remove("is-visible");

    // Preserve heading, held movement and momentum so crossing the hatch does
    // not feel like a teleport or a control reset.
    this.skyBaseY = this.camera.position.y;
    this.freeCameraVelocity.multiplyScalar(.68);
    this.walkAmount = 0;
    this.camera.near = .1;
    this.camera.far = 420;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(
      this.freeCameraPosition.x,
      this.skyBaseY,
      this.freeCameraPosition.z
    );
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.freePitch, this.freeYaw, 0);

    const skyPixelRatio = Math.min(window.devicePixelRatio || 1, this.isTouch ? .95 : 1.2);
    this.renderer.setPixelRatio(skyPixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.updateCloudWorld(0);
  }

  updateSkyCamera(delta) {
    if (this.isTouch) {
      this.freeYaw -= this.mobileLookInput.x * 1.72 * delta;
      this.freePitch = clamp(this.freePitch + this.mobileLookInput.y * 1.34 * delta, -Math.PI * .47, Math.PI * .47);
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
    const running = this.freeCameraKeys.has("ShiftLeft") || this.freeCameraKeys.has("ShiftRight");
    const speed = running ? 9.0 : 5.0;
    const inputStrength = keyboardMoving ? 1 : mobileStrength;
    const desired = input.lengthSq() > 0 ? input.normalize().multiplyScalar(speed * inputStrength) : input;
    this.freeCameraVelocity.x = damp(this.freeCameraVelocity.x, desired.x, 5.6, delta);
    this.freeCameraVelocity.z = damp(this.freeCameraVelocity.z, desired.z, 5.6, delta);
    this.freeCameraPosition.x += this.freeCameraVelocity.x * delta;
    this.freeCameraPosition.z += this.freeCameraVelocity.z * delta;

    this.camera.position.set(
      this.freeCameraPosition.x,
      this.skyBaseY + Math.sin(this.skyCloudTime * .29) * .045,
      this.freeCameraPosition.z
    );
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.freePitch, this.freeYaw, 0);
  }

'''

src = src[:start] + methods + src[end:]

# Stop all left-corridor deformation cleanly before the stable staircase.
needle = '''    const time = this.elapsed;
    const seed = this.liminalSeed;

    if (x < -12) {'''
replacement = '''    const time = this.elapsed;
    const seed = this.liminalSeed;
    const stairApproach = clamp((this.liminalStairStartX + 8.0 - x) / 8.0, 0, 1);
    const distortionEase = leftEase * (1 - stairApproach);

    if (x < -12) {'''
if needle not in src:
    raise SystemExit('distortion prelude not found')
src = src.replace(needle, replacement, 1)

for old, new in [
    ('velocityX * .018 * modeA * leftEase', 'velocityX * .018 * modeA * distortionEase'),
    ('autonomous * leftEase', 'autonomous * distortionEase'),
    ('Math.sin(time * .7 + seed) * .012 * leftEase', 'Math.sin(time * .7 + seed) * .012 * distortionEase'),
    ('velocityZ * .02 * modeB * leftEase', 'velocityZ * .02 * modeB * distortionEase'),
    ('Math.cos(time * .46 + seed * .3) * .018 * leftEase', 'Math.cos(time * .46 + seed * .3) * .018 * distortionEase'),
]:
    if old not in src:
        raise SystemExit(f'distortion term not found: {old}')
    src = src.replace(old, new, 1)

old = '          const late = Math.pow(depth, 2.15) * leftEase;'
new = '''          const localStability = clamp((worldX - this.liminalStairStartX) / 7.5, 0, 1);
          const late = Math.pow(depth, 2.15) * distortionEase * localStability;'''
if old not in src:
    raise SystemExit('late distortion line not found')
src = src.replace(old, new, 1)

old = '        const local = Math.pow(slice.strength, 1.45) * leftEase;'
new = '''        const sliceStability = clamp((slice.baseX - this.liminalStairStartX) / 8.0, 0, 1);
        const local = Math.pow(slice.strength, 1.45) * distortionEase * sliceStability;'''
if old not in src:
    raise SystemExit('slice distortion line not found')
src = src.replace(old, new, 1)

src = src.replace('        const flickerMix = lerp(1, badFlicker, leftEase);', '        const flickerMix = lerp(1, badFlicker, distortionEase);', 1)
src = src.replace('(7.5 + Math.sin(time * 1.8 + seed) * 2.1 * leftEase) * (1 - leftEase * .45) * flickerMix', '(7.5 + Math.sin(time * 1.8 + seed) * 2.1 * distortionEase) * (1 - distortionEase * .45) * flickerMix', 1)
src = src.replace('Math.sin(time * .51 + seed) * leftEase * 1.4', 'Math.sin(time * .51 + seed) * distortionEase * 1.4', 1)
src = src.replace('      if (leftEase > .01) this.glitch = Math.max(this.glitch, .12 + leftEase * .92);', '      if (distortionEase > .01) this.glitch = Math.max(this.glitch, .12 + distortionEase * .92);', 1)

# Cross the entire hatch/landing before switching scenes.
old = '''    if (!this.skyMode
      && this.liminalEntered
      && this.freeCameraPosition.x <= this.liminalStairEndX + .2
      && stairHeight >= this.liminalStairRise * .965) {
      this.enterCloudWorld();
    }'''
new = '''    if (!this.skyMode
      && this.liminalEntered
      && this.freeCameraPosition.x <= this.liminalStairExitX
      && stairHeight >= this.liminalStairRise * .995) {
      this.enterCloudWorld();
    }'''
if old not in src:
    raise SystemExit('cloud transition condition not found')
src = src.replace(old, new, 1)

if '    if (x < -153.5 || x > 151.2) return true;' not in src:
    raise SystemExit('left corridor collision limit not found')
src = src.replace('    if (x < -153.5 || x > 151.2) return true;', '    if (x < -160.45 || x > 151.2) return true;', 1)

# Fullscreen cloud shader has its own orthographic render camera.
old = '''    if (this.skyMode) {
      this.renderer.setRenderTarget(null);
      this.renderer.clear();
      this.renderer.render(this.skyScene, this.camera);
      return;
    }'''
new = '''    if (this.skyMode) {
      this.renderer.setRenderTarget(null);
      this.renderer.clear();
      this.renderer.render(this.skyScene, this.skyRenderCamera);
      return;
    }'''
if old not in src:
    raise SystemExit('sky render block not found')
src = src.replace(old, new, 1)

scene.write_text(src, encoding='utf-8')

index = Path('index.html')
html = index.read_text(encoding='utf-8')
if 'scene.js?v=24' not in html:
    raise SystemExit('expected scene cache version v24 not found')
html = html.replace('scene.js?v=24', 'scene.js?v=25', 1)
index.write_text(html, encoding='utf-8')
