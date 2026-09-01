from pathlib import Path

scene = Path("scene.js")
src = scene.read_text(encoding="utf-8")

start_marker = "    this.liminalDoorPivot = new THREE.Group();"
end_marker = "    level.add(this.liminalSealCurtain);"
start = src.find(start_marker)
if start < 0:
    raise SystemExit("liminal door block start not found")
end = src.find(end_marker, start)
if end < 0:
    raise SystemExit("liminal door block end not found")
end += len(end_marker)

curtain_gate = """    this.liminalCurtainGate = new THREE.Group();
    this.liminalCurtainGate.position.set(0, 0, this.liminalDoorZ);
    level.add(this.liminalCurtainGate);

    const gateLeftMaterial = this.curtainMaterial.clone();
    const gateRightMaterial = this.curtainDarkMaterial.clone();
    this.liminalCurtainLeft = this.createLiminalCurtain(2.16, 6.5, gateLeftMaterial, this.liminalSeed + 14);
    this.liminalCurtainRight = this.createLiminalCurtain(2.16, 6.5, gateRightMaterial, this.liminalSeed + 29);
    this.liminalCurtainLeftBaseX = -1.02;
    this.liminalCurtainRightBaseX = 1.02;
    this.liminalCurtainLeft.position.set(this.liminalCurtainLeftBaseX, 3.25, 0);
    this.liminalCurtainRight.position.set(this.liminalCurtainRightBaseX, 3.25, -.015);
    this.liminalCurtainGate.add(this.liminalCurtainLeft, this.liminalCurtainRight);

    const gateValance = this.createLiminalCurtain(4.15, 1.18, this.curtainDarkMaterial.clone(), this.liminalSeed + 43);
    gateValance.position.set(0, 6.58, .025);
    this.liminalCurtainGate.add(gateValance);"""
src = src[:start] + curtain_gate + src[end:]

src = src.replace(
    "    this.liminalCenterZ = endZ + 2.7;",
    "    this.liminalCenterZ = endZ + 3.6;",
    1,
)

old_left_pos = "    leftCurtainA.position.set(-leftLength * .5, 3.575, this.liminalCenterZ - 3.25);"
new_left_pos = """    leftCurtainA.scale.x = .965;
    leftCurtainA.position.set(-leftLength * .5 - 2.7, 3.575, this.liminalCenterZ - 3.25);"""
if old_left_pos not in src:
    raise SystemExit("left near curtain position not found")
src = src.replace(old_left_pos, new_left_pos, 1)

right_anchor = """      curtainA.position.set(0, height * .5, -halfWidth);
      curtainB.position.set(0, height * .5, halfWidth);
      segment.add(curtainA, curtainB);"""
right_replacement = """      curtainA.position.set(0, height * .5, -halfWidth);
      curtainB.position.set(0, height * .5, halfWidth);
      if (index === 0) {
        curtainA.scale.x = .3;
        curtainA.position.x = 2.45;
      }
      segment.add(curtainA, curtainB);"""
if right_anchor not in src:
    raise SystemExit("right near curtain anchor not found")
src = src.replace(right_anchor, right_replacement, 1)

src = src.replace(
    "if (!this.doorPrompt || !this.liminalDoorPivot) return;",
    "if (!this.doorPrompt || !this.liminalCurtainGate) return;",
    1,
)
src = src.replace(
    'if (label) label.textContent = "ОТКРЫВАЕТСЯ";',
    'if (label) label.textContent = "РАЗДВИГАЕТСЯ";',
    1,
)

old_anim = """    const doorEase = this.liminalDoorOpenAmount * this.liminalDoorOpenAmount * (3 - 2 * this.liminalDoorOpenAmount);
    if (this.liminalDoorPivot?.visible) {
      this.liminalDoorPivot.rotation.y = -doorEase * 1.52;
      this.liminalDoorPivot.position.z = this.liminalDoorZ + Math.sin(doorEase * Math.PI) * .035;
    }
    this.updateDoorPrompt();"""
new_anim = """    const doorEase = this.liminalDoorOpenAmount * this.liminalDoorOpenAmount * (3 - 2 * this.liminalDoorOpenAmount);
    if (this.liminalCurtainLeft && this.liminalCurtainRight) {
      const gather = 1 - doorEase * .4;
      const breathe = Math.sin(this.elapsed * 3.1) * .018 * doorEase;
      this.liminalCurtainLeft.position.x = lerp(this.liminalCurtainLeftBaseX, -2.42, doorEase);
      this.liminalCurtainRight.position.x = lerp(this.liminalCurtainRightBaseX, 2.42, doorEase);
      this.liminalCurtainLeft.position.z = Math.sin(doorEase * Math.PI) * .09 + breathe;
      this.liminalCurtainRight.position.z = Math.sin(doorEase * Math.PI) * .075 - breathe;
      this.liminalCurtainLeft.scale.x = gather;
      this.liminalCurtainRight.scale.x = gather;
      this.liminalCurtainLeft.rotation.z = -.028 * doorEase;
      this.liminalCurtainRight.rotation.z = .028 * doorEase;
    }
    this.updateDoorPrompt();"""
if old_anim not in src:
    raise SystemExit("door animation block not found")
src = src.replace(old_anim, new_anim, 1)

old_enter = """    if (!this.liminalEntered
      && this.liminalDoorOpenAmount > .72
      && this.freeCameraPosition.z > this.liminalDoorZ + .68) {
      this.liminalEntered = true;
      this.liminalDoorPivot.visible = false;
      this.liminalSealCurtain.visible = true;
      this.liminalPromptActive = false;
      this.doorPrompt?.classList.remove("is-visible");
      const label = this.doorPrompt?.querySelector("span");
      if (label) label.textContent = "ОТКРЫТЬ";
      this.glitch = Math.max(this.glitch, .46);
    }"""
new_enter = """    if (!this.liminalEntered
      && this.liminalDoorOpenAmount > .72
      && this.freeCameraPosition.z > this.liminalDoorZ + 1.02) {
      this.liminalEntered = true;
      this.liminalDoorTarget = 0;
      this.liminalPromptActive = false;
      this.doorPrompt?.classList.remove("is-visible");
      const label = this.doorPrompt?.querySelector("span");
      if (label) label.textContent = "РАЗДВИНУТЬ";
      this.glitch = Math.max(this.glitch, .46);
    }"""
if old_enter not in src:
    raise SystemExit("door enter block not found")
src = src.replace(old_enter, new_enter, 1)

old_collision = "    if (!this.liminalEntered && this.liminalDoorOpenAmount < .7) return true;"
new_collision = """    if (!this.liminalEntered && this.liminalDoorOpenAmount < .7) return true;
    if (this.liminalEntered && z < this.liminalDoorZ + .42) return true;"""
if old_collision not in src:
    raise SystemExit("liminal gate collision line not found")
src = src.replace(old_collision, new_collision, 1)

if "liminalDoorPivot" in src or "liminalSealCurtain" in src:
    raise SystemExit("stale door/seal references remain")

scene.write_text(src, encoding="utf-8")

index = Path("index.html")
html = index.read_text(encoding="utf-8")
html = html.replace(
    "<kbd>E</kbd><span>ОТКРЫТЬ</span>",
    "<kbd>E</kbd><span>РАЗДВИНУТЬ</span>",
    1,
)
html = html.replace("scene.js?v=16", "scene.js?v=17", 1)
index.write_text(html, encoding="utf-8")
