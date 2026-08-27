import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const random = (min, max) => min + Math.random() * (max - min);

const THEMES = {
  red: {
    label: "RED ROOM",
    curtain: 0x760016,
    curtainLight: 0xb6002c,
    lamp: 0xffba62,
    fog: 0x190207,
    ui: "#ff244f",
    uiSoft: "#b98778",
    screen: "#16070b"
  },
  blue: {
    label: "BLUE ROSE",
    curtain: 0x34102f,
    curtainLight: 0x62305e,
    lamp: 0x83c9e9,
    fog: 0x060b18,
    ui: "#79d7ff",
    uiSoft: "#8e9fbc",
    screen: "#07111b"
  },
  mono: {
    label: "MONO SIGNAL",
    curtain: 0x272329,
    curtainLight: 0x625d64,
    lamp: 0xe8e4d8,
    fog: 0x070707,
    ui: "#ece9df",
    uiSoft: "#9b9993",
    screen: "#0c0c0c"
  }
};

class WaitingRoom {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.lastFrame = 0;
    this.frame = 0;
    this.pointer = new THREE.Vector2();
    this.pointerTarget = new THREE.Vector2();
    this.pointerNdc = new THREE.Vector2(3, 3);
    this.raycaster = new THREE.Raycaster();
    this.raycaster.layers.set(1);
    this.themeKey = "red";
    this.hoveredButton = null;
    this.glitchPulse = 0;
    this.nextGlitch = random(4, 9);
    this.intro = 0;
    this.ready = false;
    this.isPortrait = false;
    this.outputWidth = 1;
    this.outputHeight = 1;
    this.lowResTarget = null;
    this.curtainMaterials = [];
    this.lampLights = [];
    this.dust = [];
    this.buttonRegions = [];

    this.init();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
    this.completeLoad();
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance"
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070103);
    this.scene.fog = new THREE.FogExp2(THEMES.red.fog, 0.028);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
    this.desktopStart = new THREE.Vector3(0.8, 5.85, 19.8);
    this.desktopEnd = new THREE.Vector3(0.8, 5.45, 15.8);
    this.mobileStart = new THREE.Vector3(0, 5.7, 23.2);
    this.mobileEnd = new THREE.Vector3(0, 5.15, 18.7);
    this.camera.position.copy(this.desktopStart);

    this.createCompositePass();
    this.createTextures();
    this.createLights();
    this.createRoom();
    this.createBoard();
    this.createFurniture();
    this.createDust();
    this.createVisitor();
    this.resize();
    this.bindEvents();
  }

  createCompositePass() {
    this.compositeScene = new THREE.Scene();
    this.compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.compositeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.compositeMaterial);
    quad.frustumCulled = false;
    this.compositeScene.add(quad);
    this.depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking });
    this.depthMaterial.colorWrite = false;
  }

  createCanvasTexture(size, draw, repeat = [1, 1]) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    draw(context, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return texture;
  }

  createTextures() {
    this.floorTexture = this.createCanvasTexture(1024, (ctx, size) => {
      const cells = 15;
      const gridSize = cells * 2 + 1;
      const maze = Array.from({ length: gridSize }, () => Array(gridSize).fill(1));
      const visited = Array.from({ length: cells }, () => Array(cells).fill(false));
      const stack = [[0, 0]];
      visited[0][0] = true;
      maze[1][1] = 0;
      const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

      while (stack.length) {
        const [x, y] = stack[stack.length - 1];
        const options = directions
          .map(([dx, dy]) => [x + dx, y + dy, dx, dy])
          .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cells && ny < cells && !visited[ny][nx]);
        if (!options.length) {
          stack.pop();
          continue;
        }
        const [nx, ny, dx, dy] = options[(Math.random() * options.length) | 0];
        visited[ny][nx] = true;
        maze[y * 2 + 1 + dy][x * 2 + 1 + dx] = 0;
        maze[ny * 2 + 1][nx * 2 + 1] = 0;
        stack.push([nx, ny]);
      }

      ctx.fillStyle = "#09090a";
      ctx.fillRect(0, 0, size, size);
      const tile = size / gridSize;
      for (let y = 0; y < gridSize; y += 1) {
        for (let x = 0; x < gridSize; x += 1) {
          const inset = .65;
          const white = maze[y][x] === 0;
          ctx.fillStyle = white
            ? ((x + y) % 5 === 0 ? "#d5d1c8" : "#ede8dc")
            : ((x * 3 + y) % 7 === 0 ? "#171618" : "#060607");
          ctx.fillRect(x * tile + inset, y * tile + inset, tile - inset * 2, tile - inset * 2);
        }
      }
      ctx.globalAlpha = .08;
      for (let i = 0; i < 6000; i += 1) {
        const shade = Math.random() > .5 ? 255 : 0;
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
        ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
      }
      ctx.globalAlpha = 1;
    }, [1.15, 1.85]);

    this.woodTexture = this.createCanvasTexture(256, (ctx, size) => {
      ctx.fillStyle = "#180b08";
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 150; i += 1) {
        const y = Math.random() * size;
        ctx.strokeStyle = `rgba(${70 + Math.random() * 45},${28 + Math.random() * 18},${14 + Math.random() * 9},${random(.12, .34)})`;
        ctx.lineWidth = random(.6, 2.4);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(size * .25, y + random(-9, 9), size * .75, y + random(-7, 7), size, y + random(-3, 3));
        ctx.stroke();
      }
    }, [3, 1]);
  }

  createLights() {
    const ambient = new THREE.HemisphereLight(0x7b4b55, 0x070104, 0.65);
    this.scene.add(ambient);

    const ceilingGlow = new THREE.SpotLight(0xffd4aa, 20, 38, Math.PI * .24, .72, 1.4);
    ceilingGlow.position.set(0, 12, 5);
    ceilingGlow.target.position.set(0, 1, -4);
    ceilingGlow.castShadow = true;
    ceilingGlow.shadow.mapSize.set(512, 512);
    ceilingGlow.shadow.bias = -.0008;
    this.scene.add(ceilingGlow, ceilingGlow.target);

    const redWash = new THREE.PointLight(0xa90027, 12, 30, 2);
    redWash.position.set(0, 7, -11);
    this.scene.add(redWash);
    this.curtainWash = redWash;
  }

  createRoom() {
    const floorMaterial = new THREE.MeshStandardMaterial({
      map: this.floorTexture,
      color: 0xffffff,
      roughness: .68,
      metalness: .08
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 36), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 2);
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 36),
      new THREE.MeshStandardMaterial({ color: 0x070406, roughness: 1 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 12.2, 2);
    this.scene.add(ceiling);

    const back = this.createCurtain(23, 12.6, 42);
    back.position.set(0, 6.2, -13.5);
    this.scene.add(back);

    const left = this.createCurtain(28, 12.6, 40);
    left.rotation.y = Math.PI / 2;
    left.position.set(-11.2, 6.2, .1);
    this.scene.add(left);

    const right = this.createCurtain(28, 12.6, 40);
    right.rotation.y = -Math.PI / 2;
    right.position.set(11.2, 6.2, .1);
    this.scene.add(right);

    const valanceMaterial = new THREE.MeshStandardMaterial({
      color: THEMES.red.curtain,
      roughness: .86,
      metalness: 0
    });
    this.curtainMaterials.push(valanceMaterial);
    const valance = new THREE.Mesh(new THREE.CylinderGeometry(.58, .72, 22.8, 24), valanceMaterial);
    valance.rotation.z = Math.PI / 2;
    valance.position.set(0, 11.7, -12.9);
    this.scene.add(valance);
  }

  createCurtain(width, height, pleats) {
    const geometry = new THREE.PlaneGeometry(width, height, pleats * 2, 30);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const y = position.getY(i);
      const normalizedY = y / height + .5;
      const fold = Math.sin((x / width + .5) * Math.PI * pleats * 2);
      const secondary = Math.sin((x / width + .5) * Math.PI * pleats * 4 + normalizedY * 1.2) * .08;
      const bottomGather = Math.pow(1 - normalizedY, 2) * .11 * Math.sin(x * 1.7);
      position.setZ(i, fold * .19 + secondary + bottomGather);
      position.setX(i, x + Math.sin(normalizedY * Math.PI) * Math.sin(x * .6) * .025);
    }
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: THEMES.red.curtain,
      roughness: .88,
      metalness: 0,
      side: THREE.DoubleSide
    });
    this.curtainMaterials.push(material);
    const curtain = new THREE.Mesh(geometry, material);
    curtain.receiveShadow = true;
    return curtain;
  }

  createBoard() {
    this.board = new THREE.Group();
    this.board.position.set(0, 0, -6.25);
    this.board.rotation.y = -.025;

    const wood = new THREE.MeshStandardMaterial({
      map: this.woodTexture,
      color: 0x5b2d1c,
      roughness: .48,
      metalness: .05
    });
    const metal = new THREE.MeshStandardMaterial({ color: 0x3d332b, roughness: .32, metalness: .72 });
    const makeBox = (w, h, d, x, y, z, material = wood) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.board.add(mesh);
      return mesh;
    };

    makeBox(8.25, .28, .34, 0, 6.42, 0);
    makeBox(8.25, .28, .34, 0, 1.72, 0);
    makeBox(.28, 4.98, .34, -3.99, 4.07, 0);
    makeBox(.28, 4.98, .34, 3.99, 4.07, 0);
    makeBox(.24, 1.66, .28, -2.95, .82, -.02, metal);
    makeBox(.24, 1.66, .28, 2.95, .82, -.02, metal);
    makeBox(7.1, .18, .27, 0, .27, 0, metal);

    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x090909, roughness: .6, metalness: .25 });
    [-3.25, 3.25].forEach((x) => {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(.27, .105, 9, 18), wheelMaterial);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(x, .13, 0);
      wheel.castShadow = true;
      this.board.add(wheel);
    });

    this.boardCanvas = document.createElement("canvas");
    this.boardCanvas.width = 1200;
    this.boardCanvas.height = 680;
    this.boardContext = this.boardCanvas.getContext("2d");
    this.boardTexture = new THREE.CanvasTexture(this.boardCanvas);
    this.boardTexture.colorSpace = THREE.SRGBColorSpace;
    this.boardTexture.magFilter = THREE.LinearFilter;
    this.boardTexture.minFilter = THREE.LinearFilter;

    this.boardMaterial = new THREE.MeshBasicMaterial({
      map: this.boardTexture,
      toneMapped: false
    });
    this.boardScreen = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 4.28), this.boardMaterial);
    this.boardScreen.position.set(0, 4.08, .19);
    this.boardScreen.layers.set(1);
    this.boardScreen.userData.isBoard = true;
    this.board.add(this.boardScreen);

    this.boardGlow = new THREE.PointLight(THEMES.red.ui, 2.1, 9, 2);
    this.boardGlow.position.set(0, 4.1, 1.2);
    this.board.add(this.boardGlow);
    this.scene.add(this.board);
    this.drawBoard();
  }

  drawBoard() {
    const ctx = this.boardContext;
    const width = this.boardCanvas.width;
    const height = this.boardCanvas.height;
    const theme = THEMES[this.themeKey];
    const accent = theme.ui;
    const soft = theme.uiSoft;
    const hovered = this.hoveredButton;

    const background = ctx.createRadialGradient(width * .48, height * .42, 0, width * .48, height * .42, width * .8);
    background.addColorStop(0, theme.screen);
    background.addColorStop(1, "#020202");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = soft;
    ctx.globalAlpha = .42;
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, width - 56, height - 56);
    ctx.globalAlpha = 1;

    ctx.fillStyle = soft;
    ctx.font = "700 22px 'Courier New', monospace";
    ctx.letterSpacing = "3px";
    ctx.fillText("ROOM://ABOUT", 64, 78);
    ctx.textAlign = "right";
    ctx.fillText("CH. 00 — LIVE", width - 64, 78);
    ctx.textAlign = "left";

    ctx.fillStyle = "#f2e4d6";
    ctx.font = "700 72px 'Courier New', monospace";
    ctx.fillText("ABDUL", 62, 188);
    ctx.fillStyle = accent;
    ctx.fillRect(64, 214, 164, 7);
    ctx.fillStyle = soft;
    ctx.font = "700 22px 'Courier New', monospace";
    ctx.fillText("PERSONAL TERMINAL / BETWEEN TWO WORLDS", 64, 270);

    ctx.strokeStyle = "rgba(255,255,255,.13)";
    ctx.beginPath();
    ctx.moveTo(64, 316);
    ctx.lineTo(width - 64, 316);
    ctx.stroke();
    ctx.fillStyle = soft;
    ctx.font = "700 18px 'Courier New', monospace";
    ctx.fillText("SELECT A TRANSMISSION", 64, 358);

    const labels = [
      ["red", "01", "RED ROOM"],
      ["blue", "02", "BLUE ROSE"],
      ["mono", "03", "MONO SIGNAL"]
    ];
    this.buttonRegions = [];
    const gap = 22;
    const buttonWidth = (width - 128 - gap * 2) / 3;
    const y = 395;
    const buttonHeight = 150;
    labels.forEach(([key, number, label], index) => {
      const x = 64 + index * (buttonWidth + gap);
      const active = key === this.themeKey;
      const over = key === hovered;
      ctx.fillStyle = active ? accent : (over ? "rgba(255,255,255,.11)" : "rgba(255,255,255,.035)");
      ctx.fillRect(x, y, buttonWidth, buttonHeight);
      ctx.strokeStyle = active ? accent : (over ? "rgba(255,255,255,.68)" : "rgba(255,255,255,.22)");
      ctx.lineWidth = over ? 4 : 2;
      ctx.strokeRect(x, y, buttonWidth, buttonHeight);
      ctx.fillStyle = active ? theme.screen : soft;
      ctx.font = "700 18px 'Courier New', monospace";
      ctx.fillText(number, x + 20, y + 34);
      ctx.fillStyle = active ? "#ffffff" : "#e2d6cb";
      ctx.font = "700 24px 'Courier New', monospace";
      ctx.fillText(label, x + 20, y + 91);
      ctx.fillStyle = active ? theme.screen : soft;
      ctx.font = "700 14px 'Courier New', monospace";
      ctx.fillText(active ? "● ACTIVE" : "○ STANDBY", x + 20, y + 126);
      this.buttonRegions.push({ key, x, y, width: buttonWidth, height: buttonHeight });
    });

    ctx.fillStyle = soft;
    ctx.font = "700 15px 'Courier New', monospace";
    ctx.fillText("POINTER / TOUCH", 64, 616);
    ctx.textAlign = "right";
    ctx.fillText("THE OWLS ARE NOT WHAT THEY SEEM", width - 64, 616);
    ctx.textAlign = "left";

    ctx.globalAlpha = .07;
    ctx.fillStyle = "#fff";
    for (let scanY = 0; scanY < height; scanY += 4) ctx.fillRect(0, scanY, width, 1);
    ctx.globalAlpha = 1;

    if (this.glitchPulse > .55) {
      const sliceY = random(120, 560) | 0;
      const sliceHeight = random(4, 18) | 0;
      ctx.globalAlpha = .6;
      ctx.fillStyle = accent;
      ctx.fillRect(random(20, 360), sliceY, random(200, 650), sliceHeight);
      ctx.fillStyle = "#050505";
      ctx.fillRect(random(300, 800), sliceY + sliceHeight + 3, random(120, 360), 3);
      ctx.globalAlpha = 1;
    }

    this.boardTexture.needsUpdate = true;
  }

  createFurniture() {
    this.createChair(-5.65, 1.3, .26);
    this.createChair(5.7, 2.1, -.38);
    this.createLamp(-7.9, -1.4);
    this.createLamp(7.95, -1.7);

    const tableMaterial = new THREE.MeshStandardMaterial({
      map: this.woodTexture,
      color: 0x3a190f,
      roughness: .6
    });
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, .16, 24), tableMaterial);
    tableTop.position.set(-7.25, 1.85, 3.2);
    tableTop.castShadow = true;
    this.scene.add(tableTop);
    const tableStem = new THREE.Mesh(new THREE.CylinderGeometry(.12, .17, 1.75, 12), tableMaterial);
    tableStem.position.set(-7.25, .93, 3.2);
    tableStem.castShadow = true;
    this.scene.add(tableStem);
  }

  createChair(x, z, rotation) {
    const group = new THREE.Group();
    const velvet = new THREE.MeshStandardMaterial({ color: 0x4f0714, roughness: .96 });
    const darkVelvet = new THREE.MeshStandardMaterial({ color: 0x26040b, roughness: 1 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x24100b, roughness: .68 });
    const part = (geometry, material, px, py, pz, rx = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(px, py, pz);
      mesh.rotation.x = rx;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };

    part(new THREE.BoxGeometry(2.25, .48, 1.85), velvet, 0, 1.15, 0);
    part(new THREE.BoxGeometry(2.18, 2.5, .48), velvet, 0, 2.32, -.68, -.12);
    part(new THREE.BoxGeometry(.42, 1.05, 1.95), darkVelvet, -1.18, 1.62, 0);
    part(new THREE.BoxGeometry(.42, 1.05, 1.95), darkVelvet, 1.18, 1.62, 0);
    [-.88, .88].forEach((legX) => {
      [-.58, .58].forEach((legZ) => part(new THREE.CylinderGeometry(.09, .13, .9, 8), wood, legX, .45, legZ));
    });
    const seamMaterial = new THREE.MeshBasicMaterial({ color: 0x771328, transparent: true, opacity: .55 });
    for (let y = 1.55; y < 3.2; y += .46) {
      part(new THREE.BoxGeometry(1.82, .025, .025), seamMaterial, 0, y, -.42 - (y - 1.55) * .055);
    }
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    group.scale.setScalar(.9);
    this.scene.add(group);
  }

  createLamp(x, z) {
    const group = new THREE.Group();
    const brass = new THREE.MeshStandardMaterial({ color: 0x806131, roughness: .25, metalness: .8 });
    const shadeMaterial = new THREE.MeshStandardMaterial({
      color: 0xc68a43,
      emissive: 0x7b3515,
      emissiveIntensity: .55,
      roughness: .82,
      side: THREE.DoubleSide
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.5, .7, .18, 20), brass);
    base.position.y = .09;
    group.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.055, .08, 5.2, 10), brass);
    stem.position.y = 2.65;
    group.add(stem);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.54, 1.1, 1.35, 22, 1, true), shadeMaterial);
    shade.position.y = 5.1;
    group.add(shade);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(.22, 14, 10),
      new THREE.MeshBasicMaterial({ color: THEMES.red.lamp })
    );
    bulb.position.y = 5.14;
    group.add(bulb);
    const light = new THREE.PointLight(THEMES.red.lamp, 8.5, 13, 1.7);
    light.position.y = 5.05;
    light.castShadow = false;
    group.add(light);
    this.lampLights.push({ light, bulb, shadeMaterial });
    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  createDust() {
    const count = 180;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const item = {
        x: random(-9.5, 9.5),
        y: random(.4, 10.8),
        z: random(-11.5, 13),
        speed: random(.035, .12),
        phase: random(0, Math.PI * 2)
      };
      this.dust.push(item);
      positions[i * 3] = item.x;
      positions[i * 3 + 1] = item.y;
      positions[i * 3 + 2] = item.z;
    }
    this.dustGeometry = new THREE.BufferGeometry();
    this.dustGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.dustPoints = new THREE.Points(
      this.dustGeometry,
      new THREE.PointsMaterial({
        color: 0xffd39c,
        size: .045,
        transparent: true,
        opacity: .5,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    this.scene.add(this.dustPoints);
  }

  createVisitor() {
    const material = new THREE.MeshBasicMaterial({
      color: 0x020001,
      transparent: true,
      opacity: .14,
      depthWrite: false
    });
    this.visitor = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.46, 2.4, 5, 10), material);
    body.scale.set(1, 1.18, .28);
    body.position.y = 2.15;
    this.visitor.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.43, 12, 9), material);
    head.position.y = 4.05;
    head.scale.z = .4;
    this.visitor.add(head);
    this.visitor.position.set(-14, 1.15, -12.75);
    this.scene.add(this.visitor);
  }

  bindEvents() {
    window.addEventListener("resize", () => this.resize(), { passive: true });
    window.addEventListener("pointermove", (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      const y = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
      this.pointerTarget.set(x * 2 - 1, y * 2 - 1);
      this.pointerNdc.set(x * 2 - 1, -(y * 2 - 1));
      this.updateBoardHover();
    }, { passive: true });
    window.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      this.activateBoard();
    });
    window.addEventListener("pointerleave", () => {
      this.pointerTarget.set(0, 0);
      this.pointerNdc.set(3, 3);
      this.setHoveredButton(null);
    }, { passive: true });
    window.addEventListener("keydown", (event) => {
      const byKey = { Digit1: "red", Digit2: "blue", Digit3: "mono" };
      if (byKey[event.code]) this.setTheme(byKey[event.code]);
    });
    document.querySelectorAll("[data-theme]").forEach((button) => {
      button.addEventListener("click", () => this.setTheme(button.dataset.theme));
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.clock.getDelta();
    });
  }

  getBoardHit() {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hit = this.raycaster.intersectObject(this.boardScreen, false)[0];
    if (!hit?.uv) return null;
    const x = hit.uv.x * this.boardCanvas.width;
    const y = (1 - hit.uv.y) * this.boardCanvas.height;
    return this.buttonRegions.find((region) =>
      x >= region.x && x <= region.x + region.width && y >= region.y && y <= region.y + region.height
    ) || null;
  }

  updateBoardHover() {
    const hit = this.getBoardHit();
    this.setHoveredButton(hit?.key || null);
  }

  setHoveredButton(key) {
    if (this.hoveredButton === key) return;
    this.hoveredButton = key;
    this.canvas.classList.toggle("is-interactive", Boolean(key));
    document.body.classList.toggle("board-hover", Boolean(key));
    this.drawBoard();
  }

  activateBoard() {
    const hit = this.getBoardHit();
    if (hit) this.setTheme(hit.key);
  }

  setTheme(key) {
    if (!THEMES[key]) return;
    this.themeKey = key;
    const theme = THEMES[key];
    this.curtainMaterials.forEach((material) => {
      material.color.setHex(theme.curtain);
      material.needsUpdate = true;
    });
    this.curtainWash.color.setHex(theme.curtainLight);
    this.scene.fog.color.setHex(theme.fog);
    this.scene.background.setHex(theme.fog);
    this.boardGlow.color.set(theme.ui);
    this.lampLights.forEach(({ light, bulb, shadeMaterial }) => {
      light.color.setHex(theme.lamp);
      bulb.material.color.setHex(theme.lamp);
      shadeMaterial.emissive.setHex(key === "blue" ? 0x244c62 : key === "mono" ? 0x585650 : 0x7b3515);
    });
    this.dustPoints.material.color.setHex(theme.lamp);
    document.documentElement.style.setProperty("--signal-red", theme.ui);
    document.querySelector("#themeAnnouncement").textContent = `Выбран вариант: ${theme.label}`;
    this.glitchPulse = 1;
    this.drawBoard();
  }

  updateDust(time, delta) {
    const positions = this.dustGeometry.attributes.position.array;
    this.dust.forEach((item, index) => {
      item.y += item.speed * delta;
      if (item.y > 11) item.y = .3;
      positions[index * 3] = item.x + Math.sin(time * .18 + item.phase) * .18;
      positions[index * 3 + 1] = item.y;
      positions[index * 3 + 2] = item.z + Math.cos(time * .13 + item.phase) * .12;
    });
    this.dustGeometry.attributes.position.needsUpdate = true;
  }

  updateScene(time, delta) {
    this.intro = clamp(this.intro + delta / 6.5, 0, 1);
    const ease = 1 - Math.pow(1 - this.intro, 3);
    this.pointer.lerp(this.pointerTarget, .035);
    const start = this.isPortrait ? this.mobileStart : this.desktopStart;
    const end = this.isPortrait ? this.mobileEnd : this.desktopEnd;
    this.camera.position.lerpVectors(start, end, ease);
    this.camera.position.x += this.pointer.x * (this.isPortrait ? .45 : .62);
    this.camera.position.y -= this.pointer.y * .24;
    const lookAt = new THREE.Vector3(
      this.pointer.x * -.22,
      (this.isPortrait ? 3.8 : 3.7) + this.pointer.y * -.12,
      -6.15
    );
    this.camera.lookAt(lookAt);

    this.board.rotation.y = -.025 + Math.sin(time * .24) * .006;
    this.lampLights.forEach(({ light }, index) => {
      light.intensity = 8.1 + Math.sin(time * 1.7 + index * 2.2) * .22 + Math.sin(time * 8.3) * .07;
    });
    this.updateDust(time, delta);

    const visitorCycle = (time % 31) / 31;
    this.visitor.position.x = lerp(-14, 14, visitorCycle);
    this.visitor.visible = visitorCycle > .12 && visitorCycle < .88;
    this.visitor.children.forEach((child) => {
      child.material.opacity = .08 + Math.sin(visitorCycle * Math.PI) * .09;
    });

    this.glitchPulse = Math.max(0, this.glitchPulse - delta * 3.4);
    this.nextGlitch -= delta;
    if (this.nextGlitch <= 0) {
      this.glitchPulse = 1;
      this.nextGlitch = random(4.5, 11.5);
      this.drawBoard();
    }
    const glitching = this.glitchPulse > .52;
    document.body.classList.toggle("glitching", glitching);
    const glitchX = glitching ? `${random(-2.2, 2.2).toFixed(2)}px` : "0px";
    const glitchY = glitching ? `${random(-.7, .7).toFixed(2)}px` : "0px";
    document.documentElement.style.setProperty("--glitch-x", glitchX);
    document.documentElement.style.setProperty("--glitch-y", glitchY);
    if (glitching && this.frame % 3 === 0) {
      document.querySelector("#signalStatus").textContent = "SIGNAL UNKNOWN";
    } else if (!glitching) {
      document.querySelector("#signalStatus").textContent = "SIGNAL STABLE";
    }

    if (this.frame % 3 === 0 && this.pointerNdc.x <= 1) this.updateBoardHover();
  }

  resize() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    this.isPortrait = width < height;
    const pixelRatio = clamp(window.devicePixelRatio || 1, 1, 1.75);
    this.outputWidth = Math.floor(width * pixelRatio);
    this.outputHeight = Math.floor(height * pixelRatio);
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.outputWidth, this.outputHeight, false);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    const worldScale = this.isPortrait ? .58 : .54;
    const lowWidth = Math.max(1, Math.floor(width * worldScale));
    const lowHeight = Math.max(1, Math.floor(height * worldScale));
    if (!this.lowResTarget) {
      this.lowResTarget = new THREE.WebGLRenderTarget(lowWidth, lowHeight, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        generateMipmaps: false,
        depthBuffer: true,
        stencilBuffer: false
      });
      this.lowResTarget.texture.colorSpace = THREE.SRGBColorSpace;
      this.compositeMaterial.map = this.lowResTarget.texture;
      this.compositeMaterial.needsUpdate = true;
    } else {
      this.lowResTarget.setSize(lowWidth, lowHeight);
    }
    this.camera.aspect = width / height;
    this.camera.fov = this.isPortrait ? 61 : 48;
    this.camera.updateProjectionMatrix();
    this.floorTexture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
  }

  render() {
    const oldMask = this.camera.layers.mask;
    this.camera.layers.set(0);
    this.renderer.setRenderTarget(this.lowResTarget);
    this.renderer.setViewport(0, 0, this.lowResTarget.width, this.lowResTarget.height);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.scene, this.camera);

    this.renderer.setRenderTarget(null);
    this.renderer.setViewport(0, 0, this.outputWidth, this.outputHeight);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.compositeScene, this.compositeCamera);

    this.renderer.clearDepth();
    this.scene.overrideMaterial = this.depthMaterial;
    this.camera.layers.set(0);
    this.renderer.render(this.scene, this.camera);
    this.scene.overrideMaterial = null;
    this.camera.layers.set(1);
    this.renderer.render(this.scene, this.camera);
    this.camera.layers.mask = oldMask;
  }

  async completeLoad() {
    const pageReady = document.readyState === "complete"
      ? Promise.resolve()
      : new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));
    await pageReady;
    this.render();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    this.clock.getDelta();
    this.ready = true;
    document.body.classList.add("scene-ready");
  }

  animate(now) {
    requestAnimationFrame(this.animate);
    if (document.hidden || now - this.lastFrame < 30) return;
    const delta = Math.min(this.clock.getDelta(), .075);
    this.lastFrame = now;
    if (this.ready) {
      this.elapsed += delta;
      this.frame += 1;
      this.updateScene(this.elapsed, delta);
    }
    this.render();
  }
}

try {
  new WaitingRoom(document.querySelector("#world"));
} catch (error) {
  console.error("The Waiting Room could not open", error);
  document.body.classList.add("scene-fallback", "scene-ready");
}
