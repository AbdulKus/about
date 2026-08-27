import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const random = (min, max) => min + Math.random() * (max - min);
const damp = (current, target, smoothing, delta) => lerp(current, target, 1 - Math.exp(-smoothing * delta));

class PrivateRoom {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.pointer = new THREE.Vector2();
    this.pointerTarget = new THREE.Vector2();
    this.pointerNdc = new THREE.Vector2(2, 2);
    this.raycaster = new THREE.Raycaster();
    this.hoveredButton = null;
    this.activeTheme = "velvet";
    this.cameraMode = "default";
    this.boardTransition = 0;
    this.boardTransitionTarget = 0;
    this.freeCameraEnabled = false;
    this.freeCameraPosition = new THREE.Vector3();
    this.freeCameraVelocity = new THREE.Vector3();
    this.freeCameraKeys = new Set();
    this.mobileMoveInput = new THREE.Vector2();
    this.mobileLookInput = new THREE.Vector2();
    this.mobileStickPointers = { move: null, look: null };
    this.freeYaw = 0;
    this.freePitch = 0;
    this.freeEyeHeight = 3.65;
    this.freeStartEyeHeight = 3.65;
    this.freeGroundBlend = 1;
    this.walkPhase = 0;
    this.walkAmount = 0;
    this.contactLinks = {
      telegram: "https://t.me/abdulkus",
      github: "https://github.com/AbdulKus"
    };
    this.portalSequence = null;
    this.portalTextureTick = 0;
    this.shouldRestoreContacts = sessionStorage.getItem("about-return-to-contacts") === "1";
    this.transitionBlackout = document.querySelector("#transitionBlackout");
    this.glitch = 0;
    this.nextGlitch = random(2.4, 5.2);
    this.intro = 0;
    this.introActive = false;
    const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches;
    const hoverPointer = window.matchMedia?.("(hover: hover)").matches;
    this.isTouch = Boolean(coarsePointer || (navigator.maxTouchPoints > 0 && !hoverPointer));
    this.reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    this.themeDefinitions = {
      velvet: {
        label: "БАРХАТ",
        curtain: new THREE.Color(0x9d091b),
        curtainDark: new THREE.Color(0x570711),
        light: new THREE.Color(0xffc18b),
        lamp: new THREE.Color(0xffa66c),
        floor: new THREE.Color(0xf1e5ca),
        fog: new THREE.Color(0x100004),
        exposure: .95,
        glitch: .08
      },
      monochrome: {
        label: "МОНОХРОМ",
        curtain: new THREE.Color(0x242021),
        curtainDark: new THREE.Color(0x080808),
        light: new THREE.Color(0xe2e3dd),
        lamp: new THREE.Color(0xcbd8da),
        floor: new THREE.Color(0xf2f0e8),
        fog: new THREE.Color(0x030303),
        exposure: 1.08,
        glitch: .045
      },
      fever: {
        label: "ЛИХОРАДКА",
        curtain: new THREE.Color(0xa20719),
        curtainDark: new THREE.Color(0x4d000b),
        light: new THREE.Color(0xff4b37),
        lamp: new THREE.Color(0xff1f42),
        floor: new THREE.Color(0xffdfc4),
        fog: new THREE.Color(0x1d0006),
        exposure: 1.08,
        glitch: .3
      }
    };

    this.init();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
    this.finishLoading();
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: "high-performance"
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090002);
    this.scene.fog = new THREE.FogExp2(0x100004, .026);

    this.camera = new THREE.PerspectiveCamera(43, 1, .1, 80);
    this.camera.position.set(0, 5.25, 15.8);

    this.createMaterials();
    this.createPostProcess();
    this.createLights();
    this.createRoom();
    this.createBoard();
    this.createChairs();
    this.createLamps();
    this.createDust();
    this.bindEvents();
    this.resize();
  }

  createMaterials() {
    const woodTexture = this.createWoodTexture();
    const woodHorizontalTexture = woodTexture.clone();
    woodHorizontalTexture.center.set(.5, .5);
    woodHorizontalTexture.rotation = Math.PI / 2;
    woodHorizontalTexture.repeat.set(2.8, 1.4);
    woodHorizontalTexture.needsUpdate = true;
    const fabricTexture = this.createFabricTexture();
    const fabricBump = fabricTexture.clone();
    fabricBump.colorSpace = THREE.NoColorSpace;
    fabricBump.needsUpdate = true;
    const blackboardTexture = this.createBlackboardTexture();
    const blackboardBump = blackboardTexture.clone();
    blackboardBump.colorSpace = THREE.NoColorSpace;
    blackboardBump.needsUpdate = true;

    this.curtainMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x9d091b,
      roughness: .72,
      metalness: 0,
      sheen: .92,
      sheenColor: new THREE.Color(0xb71c31),
      sheenRoughness: .48,
      clearcoat: .025,
      clearcoatRoughness: .9,
      side: THREE.DoubleSide
    });
    this.curtainDarkMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x570711,
      roughness: .79,
      metalness: 0,
      sheen: .78,
      sheenColor: new THREE.Color(0x7f0b1b),
      sheenRoughness: .54,
      side: THREE.DoubleSide
    });
    this.blackMaterial = new THREE.MeshStandardMaterial({ color: 0x090707, roughness: .74, metalness: .12 });
    this.woodMaterial = new THREE.MeshStandardMaterial({ color: 0x9a6747, map: woodTexture, roughness: .68, metalness: .02 });
    this.woodEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0xd7a477, map: woodTexture, roughness: .62, metalness: .025 });
    this.woodHorizontalMaterial = new THREE.MeshStandardMaterial({ color: 0xd7a477, map: woodHorizontalTexture, roughness: .62, metalness: .025 });
    this.blackboardMaterial = new THREE.MeshStandardMaterial({
      color: 0x777a75,
      map: blackboardTexture,
      bumpMap: blackboardBump,
      bumpScale: .018,
      roughness: .98,
      metalness: 0
    });
    this.brassMaterial = new THREE.MeshStandardMaterial({ color: 0x8d6b37, roughness: .35, metalness: .72 });
    this.chairMaterial = new THREE.MeshStandardMaterial({
      color: 0x671522,
      map: fabricTexture,
      bumpMap: fabricBump,
      bumpScale: .045,
      roughness: .92,
      metalness: 0
    });
    this.chairDarkMaterial = new THREE.MeshStandardMaterial({ color: 0x16070a, roughness: .88 });
    this.shadeMaterial = new THREE.MeshStandardMaterial({
      color: 0x5d1720,
      emissive: 0x2e060b,
      emissiveIntensity: .4,
      roughness: .7,
      side: THREE.DoubleSide
    });

    const floorTexture = this.createChevronTexture();
    this.floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture,
      color: 0xf1e5ca,
      roughness: .48,
      metalness: .02
    });
  }

  createWoodTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#815032";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let x = 0; x < canvas.width; x += 1) {
      const grain = Math.sin(x * .17) * 9 + Math.sin(x * .047 + 1.6) * 13 + Math.sin(x * .53) * 3;
      ctx.fillStyle = grain > 4 ? "rgba(255,211,153,.07)" : "rgba(43,15,6,.075)";
      ctx.fillRect(x, 0, 1, canvas.height);
    }
    for (let index = 0; index < 64; index += 1) {
      const x = random(-30, canvas.width + 20);
      const y = random(0, canvas.height);
      const length = random(24, 130);
      ctx.strokeStyle = index % 3 === 0 ? "rgba(37,12,5,.22)" : "rgba(239,176,112,.12)";
      ctx.lineWidth = random(.5, 1.8);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + length * .32, y + random(-7, 7), x + length * .68, y + random(-7, 7), x + length, y + random(-3, 3));
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.4, 2.8);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  createFabricTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#b7a6a5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y += 3) {
      ctx.fillStyle = y % 6 === 0 ? "rgba(255,238,232,.16)" : "rgba(38,13,17,.15)";
      ctx.fillRect(0, y, canvas.width, 1);
    }
    for (let x = 0; x < canvas.width; x += 3) {
      ctx.fillStyle = x % 6 === 0 ? "rgba(248,221,218,.12)" : "rgba(36,10,15,.14)";
      ctx.fillRect(x, 0, 1, canvas.height);
    }
    for (let index = 0; index < 1600; index += 1) {
      const value = Math.random() > .5 ? 255 : 20;
      ctx.fillStyle = `rgba(${value},${value},${value},${random(.012, .045)})`;
      ctx.fillRect(random(0, canvas.width), random(0, canvas.height), 1, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3.5, 3.5);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  createBlackboardTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#2d302e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < 6800; index += 1) {
      const pale = Math.random() > .46;
      ctx.fillStyle = pale ? `rgba(218,220,207,${random(.006, .032)})` : `rgba(0,0,0,${random(.008, .04)})`;
      const x = random(0, canvas.width);
      const y = random(0, canvas.height);
      ctx.fillRect(x, y, random(.5, 3.6), random(.5, 1.7));
    }
    for (let index = 0; index < 38; index += 1) {
      ctx.strokeStyle = `rgba(213,217,203,${random(.012, .045)})`;
      ctx.lineWidth = random(5, 22);
      ctx.beginPath();
      ctx.moveTo(random(-80, 200), random(0, canvas.height));
      ctx.bezierCurveTo(random(250, 430), random(0, canvas.height), random(600, 790), random(0, canvas.height), random(850, 1110), random(0, canvas.height));
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  createPaperTexture(label, options = {}) {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = options.paperColor || "#d8d0b8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let grain = 0; grain < 2500; grain += 1) {
      const value = Math.random() > .5 ? 255 : 36;
      ctx.fillStyle = `rgba(${value},${value},${value},${random(.006, .025)})`;
      ctx.fillRect(random(0, canvas.width), random(0, canvas.height), random(.5, 2), random(.5, 2));
    }
    ctx.strokeStyle = options.accent || "#3f8150";
    ctx.lineWidth = 7;
    ctx.strokeRect(23.5, 23.5, canvas.width - 47, canvas.height - 47);
    ctx.strokeStyle = options.accentSoft || "rgba(49,111,64,.34)";
    ctx.lineWidth = 2;
    ctx.strokeRect(36.5, 36.5, canvas.width - 73, canvas.height - 73);
    ctx.fillStyle = options.ink || "#2f7141";
    ctx.font = `700 ${options.fontSize || 70}px 'Courier New', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 4);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  createChalkTitle() {
    this.chalkTitleCanvas = document.createElement("canvas");
    this.chalkTitleCanvas.width = 1024;
    this.chalkTitleCanvas.height = 220;
    this.chalkTitleContext = this.chalkTitleCanvas.getContext("2d");
    this.chalkTitleTexture = new THREE.CanvasTexture(this.chalkTitleCanvas);
    this.chalkTitleTexture.colorSpace = THREE.SRGBColorSpace;
    this.chalkTitleMaterial = new THREE.MeshBasicMaterial({
      map: this.chalkTitleTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false
    });
    this.chalkTitle = new THREE.Mesh(new THREE.PlaneGeometry(5.45, 1.16), this.chalkTitleMaterial);
    this.chalkTitle.position.set(0, 5.55, .285);
    this.board.add(this.chalkTitle);
    this.drawChalkTitle();
  }

  drawChalkTitle() {
    if (!this.chalkTitleContext) return;
    const ctx = this.chalkTitleContext;
    const width = this.chalkTitleCanvas.width;
    const height = this.chalkTitleCanvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `108px "Neucha", "Comic Sans MS", cursive`;
    const chalkText = "Я живу тут:";

    ctx.strokeStyle = "rgba(249,248,229,.12)";
    for (let stroke = 0; stroke < 6; stroke += 1) {
      ctx.lineWidth = random(.7, 2.5);
      ctx.strokeText(chalkText, width / 2 + random(-1.8, 1.8), height / 2 + 7 + random(-1.5, 1.5));
    }
    ctx.fillStyle = "rgba(236,235,218,.78)";
    ctx.fillText(chalkText, width / 2, height / 2 + 7);
    ctx.fillStyle = "rgba(255,255,239,.16)";
    ctx.fillText(chalkText, width / 2 - 1.4, height / 2 + 5.7);

    ctx.globalCompositeOperation = "destination-out";
    for (let grain = 0; grain < 3600; grain += 1) {
      ctx.fillStyle = `rgba(0,0,0,${random(.08, .42)})`;
      const grainWidth = Math.random() < .84 ? random(.6, 2.8) : random(3, 6.5);
      const grainHeight = Math.random() < .9 ? random(.5, 1.9) : random(2, 4.2);
      ctx.fillRect(random(170, width - 170), random(38, height - 28), grainWidth, grainHeight);
    }
    for (let scratch = 0; scratch < 115; scratch += 1) {
      ctx.fillStyle = `rgba(0,0,0,${random(.14, .48)})`;
      ctx.save();
      ctx.translate(random(205, width - 205), random(52, height - 38));
      ctx.rotate(random(-.18, .18));
      ctx.fillRect(0, 0, random(5, 23), random(.7, 2.2));
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";

    for (let dust = 0; dust < 420; dust += 1) {
      ctx.fillStyle = `rgba(244,243,225,${random(.012, .07)})`;
      const size = random(.4, 1.8);
      ctx.fillRect(random(175, width - 175), random(35, height - 25), size, size);
    }
    this.chalkTitleTexture.needsUpdate = true;
  }

  createPortalTexture() {
    this.portalCanvas = document.createElement("canvas");
    this.portalCanvas.width = 256;
    this.portalCanvas.height = 384;
    this.portalContext = this.portalCanvas.getContext("2d");
    this.portalTexture = new THREE.CanvasTexture(this.portalCanvas);
    this.portalTexture.colorSpace = THREE.SRGBColorSpace;
    this.portalTexture.magFilter = THREE.NearestFilter;
    this.portalTexture.minFilter = THREE.NearestFilter;
    this.portalTexture.generateMipmaps = false;
    this.drawPortalTexture();
    return this.portalTexture;
  }

  drawPortalTexture() {
    if (!this.portalContext) return;
    const ctx = this.portalContext;
    const width = this.portalCanvas.width;
    const height = this.portalCanvas.height;
    const cell = 8;
    const palette = [
      "#000000", "#001ee8", "#ed1010", "#e500d8",
      "#00e923", "#00dce9", "#f0e900", "#efefef",
      "#1010a8", "#a600a8", "#00a8a8", "#a8a8a8",
      "#ffffff", "#ff00ef", "#00ff19"
    ];
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    for (let band = 0; band < 18; band += 1) {
      const y = Math.floor(random(0, height / cell)) * cell;
      const bandHeight = Math.floor(random(1, 5)) * cell;
      let x = Math.floor(random(-4, 2)) * cell;
      while (x < width) {
        const blockWidth = Math.floor(random(1, 11)) * cell;
        ctx.fillStyle = palette[(Math.random() * palette.length) | 0];
        ctx.fillRect(x, y, blockWidth, bandHeight);
        if (Math.random() < .24) {
          ctx.fillStyle = palette[(Math.random() * palette.length) | 0];
          for (let bit = 0; bit < random(3, 14); bit += 1) {
            ctx.fillRect(x + Math.floor(random(0, Math.max(cell, blockWidth)) / 4) * 4, y + Math.floor(random(0, bandHeight) / 4) * 4, 4, 4);
          }
        }
        x += blockWidth + (Math.random() < .38 ? Math.floor(random(0, 5)) * cell : 0);
      }
    }

    const noiseStart = Math.floor(height * random(.52, .7));
    for (let index = 0; index < 720; index += 1) {
      const size = Math.random() < .78 ? 4 : 8;
      const x = Math.floor(random(0, width) / size) * size;
      const y = Math.floor(random(noiseStart, height) / size) * size;
      ctx.fillStyle = palette[(Math.random() * palette.length) | 0];
      ctx.fillRect(x, y, size, size);
    }

    for (let line = 0; line < 6; line += 1) {
      ctx.fillStyle = palette[(Math.random() * palette.length) | 0];
      ctx.fillRect(0, Math.floor(random(0, height) / cell) * cell, width, Math.random() < .5 ? 2 : 4);
    }
    this.portalTexture.needsUpdate = true;
  }

  createChevronTexture() {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(size, size);

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const localX = x % 128;
        const zig = Math.abs(localX - 64);
        const phase = (y + zig) % 128;
        const dark = phase < 55;
        const seam = x % 64 < 2 || y % 64 < 2;
        const value = dark ? 10 : 226;
        const offset = (y * size + x) * 4;
        image.data[offset] = seam ? Math.max(4, value - 14) : value;
        image.data[offset + 1] = seam ? Math.max(4, value - 14) : dark ? 8 : 220;
        image.data[offset + 2] = seam ? Math.max(4, value - 14) : dark ? 9 : 205;
        image.data[offset + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3.15, 5.1);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  createPostProcess() {
    this.renderTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true
    });
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postMaterial = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tDiffuse: { value: this.renderTarget.texture },
        time: { value: 0 },
        glitch: { value: 0 },
        resolution: { value: new THREE.Vector2(1, 1) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform float glitch;
        uniform vec2 resolution;
        varying vec2 vUv;

        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 345.45));
          p += dot(p, p + 34.345);
          return fract(p.x * p.y);
        }

        void main() {
          vec2 uv = vUv;
          float row = floor(uv.y * 62.0);
          float rowNoise = hash(vec2(row, floor(time * 18.0)));
          float tear = step(.77, rowNoise) * glitch;
          uv.x += (rowNoise - .5) * .075 * tear;

          float split = (.001 + glitch * .012) * (1.0 + tear * 2.0);
          float red = texture2D(tDiffuse, uv + vec2(split, 0.0)).r;
          float green = texture2D(tDiffuse, uv).g;
          float blue = texture2D(tDiffuse, uv - vec2(split, 0.0)).b;
          vec3 color = vec3(red, green, blue);

          float scan = sin(uv.y * resolution.y * 1.35) * .018;
          float grain = (hash(gl_FragCoord.xy + vec2(time * 83.0, time * 29.0)) - .5) * .052;
          color += grain - scan;

          float band = step(.985, hash(vec2(floor(time * 7.0), floor(uv.y * 12.0)))) * glitch;
          color = mix(color, color.bgr * 1.08, band * .7);
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial);
    quad.frustumCulled = false;
    this.postScene.add(quad);
  }

  createLights() {
    this.hemiLight = new THREE.HemisphereLight(0x481219, 0x080304, .58);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.SpotLight(0xffc18b, 70, 45, Math.PI * .23, .66, 1.1);
    this.keyLight.position.set(0, 10.8, 6.5);
    this.keyLight.target.position.set(0, 2.8, -4.2);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.bias = -.00045;
    this.scene.add(this.keyLight, this.keyLight.target);

    this.redBackLight = new THREE.PointLight(0xb60c25, 34, 22, 1.6);
    this.redBackLight.position.set(0, 5.8, -8.4);
    this.scene.add(this.redBackLight);

    this.curtainLights = [
      this.createCurtainLight(-8.6, 12.5, -3.8, -5.8, 6.4, -10.2, 52),
      this.createCurtainLight(7.8, 10.2, -4.6, 5.3, 5.2, -10.2, 39)
    ];
  }

  createCurtainLight(x, y, z, targetX, targetY, targetZ, intensity) {
    const light = new THREE.SpotLight(0xff2947, intensity, 27, Math.PI * .19, .82, 1.25);
    light.position.set(x, y, z);
    light.target.position.set(targetX, targetY, targetZ);
    this.scene.add(light, light.target);
    return light;
  }

  createRoom() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 52), this.floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 6);
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.floor = floor;

    this.curtains = [];
    const back = this.createCurtain(26, 46, 228, this.curtainMaterial);
    back.position.set(0, 15.1, -10.4);
    this.scene.add(back);
    this.curtains.push(back);

    const left = this.createCurtain(54, 46, 320, this.curtainDarkMaterial);
    left.position.set(-11.85, 15.1, 5.5);
    left.rotation.y = Math.PI / 2;
    this.scene.add(left);
    this.curtains.push(left);

    const right = this.createCurtain(54, 46, 320, this.curtainDarkMaterial);
    right.position.set(11.85, 15.1, 5.5);
    right.rotation.y = -Math.PI / 2;
    this.scene.add(right);
    this.curtains.push(right);

    const thresholdMaterial = new THREE.MeshStandardMaterial({ color: 0x050304, roughness: .8 });
    const threshold = new THREE.Mesh(new THREE.BoxGeometry(5.6, 9.2, .35), thresholdMaterial);
    threshold.position.set(0, 4.6, -10.05);
    this.scene.add(threshold);

    const voidPanel = new THREE.Mesh(new THREE.PlaneGeometry(4.75, 8.4), new THREE.MeshBasicMaterial({ color: 0x010101 }));
    voidPanel.position.set(0, 4.45, -9.82);
    this.scene.add(voidPanel);
    this.createPortalDoor();
  }

  createPortalDoor() {
    this.portalMaterial = new THREE.MeshBasicMaterial({
      map: this.createPortalTexture(),
      transparent: true,
      opacity: 0,
      toneMapped: false,
      depthWrite: false
    });
    this.portalMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.68, 8.25), this.portalMaterial);
    this.portalMesh.position.set(0, 4.42, -9.79);
    this.portalMesh.renderOrder = 2;
    this.scene.add(this.portalMesh);

    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(-2.34, .28, -9.57);
    this.scene.add(this.doorPivot);

    const door = new THREE.Mesh(new THREE.BoxGeometry(4.66, 8.18, .25), this.woodMaterial);
    door.position.set(2.33, 4.09, 0);
    door.castShadow = true;
    door.receiveShadow = true;
    this.doorPivot.add(door);

    [2.18, 5.92].forEach((panelY) => {
      const inset = new THREE.Mesh(new THREE.BoxGeometry(3.62, 2.76, .11), this.woodHorizontalMaterial);
      inset.position.set(2.33, panelY, .175);
      inset.castShadow = true;
      this.doorPivot.add(inset);
    });

    const handleBase = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .08, 20), this.brassMaterial);
    handleBase.rotation.x = Math.PI / 2;
    handleBase.position.set(4.05, 4.08, .22);
    this.doorPivot.add(handleBase);
    const handle = new THREE.Mesh(new THREE.SphereGeometry(.11, 18, 10), this.brassMaterial);
    handle.position.set(4.05, 4.08, .34);
    handle.castShadow = true;
    this.doorPivot.add(handle);
  }

  createCurtain(width, height, segments, material) {
    const geometry = new THREE.PlaneGeometry(width, height, segments, 96);
    const position = geometry.attributes.position;
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const normalizedY = (y + height * .5) / height;
      const verticalDrift = Math.sin(y * .255 + x * .115) * .19
        + Math.sin(y * .67 - x * .075 + 1.7) * .075
        + Math.sin(y * .115 + x * .43) * .045;
      const warpedX = x + verticalDrift * (.68 + normalizedY * .32);
      const irregularPhase = warpedX * 2.52
        + Math.sin(warpedX * .49 + .7) * .86
        + Math.sin(warpedX * 1.31 - 1.1) * .21
        + Math.sin(y * .185 + x * .08) * .16;
      const mainFold = Math.sin(irregularPhase);
      const asymmetricFold = mainFold >= 0
        ? Math.pow(mainFold, .82) * .34
        : -Math.pow(-mainFold, 1.38) * .49;
      const narrowFold = Math.sin(irregularPhase * 2.06 + Math.sin(y * .31) * .42) * .072;
      const fineFold = Math.sin(warpedX * 10.8 - y * .085 + Math.sin(x * .72)) * .024;
      const diagonalTension = Math.sin(y * .78 + x * .63) * Math.sin(x * .37 + 1.2) * .032;
      const hangingWeight = .9 + (1 - normalizedY) * .15;
      const edge = Math.pow(Math.abs(x) / (width * .5), 7) * .13;
      const depth = (asymmetricFold + narrowFold + fineFold) * hangingWeight
        + diagonalTension
        + Math.sin(y * .29 - x * .22) * .022
        + edge;
      position.setZ(index, depth);
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  createBoard() {
    this.board = new THREE.Group();
    this.board.position.set(0, .12, -3.7);
    this.board.rotation.y = -.018;
    this.scene.add(this.board);

    const panel = new THREE.Mesh(new THREE.BoxGeometry(7.5, 4.62, .3), this.blackMaterial);
    panel.position.y = 4.25;
    panel.castShadow = true;
    panel.receiveShadow = true;
    this.board.add(panel);

    const frameParts = [
      [7.62, .22, .46, 0, 6.63, .03, "horizontal"],
      [7.62, .22, .46, 0, 1.87, .03, "horizontal"],
      [.22, 4.98, .46, -3.81, 4.25, .03, "vertical"],
      [.22, 4.98, .46, 3.81, 4.25, .03, "vertical"]
    ];
    frameParts.forEach(([w, h, d, x, y, z, orientation]) => {
      const material = orientation === "horizontal" ? this.woodHorizontalMaterial : this.woodEdgeMaterial;
      const part = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      part.position.set(x, y, z);
      part.castShadow = true;
      this.board.add(part);
    });

    const boardSurface = new THREE.Mesh(new THREE.PlaneGeometry(7.12, 4.36, 16, 10), this.blackboardMaterial);
    boardSurface.position.set(0, 4.25, .241);
    boardSurface.receiveShadow = true;
    this.board.add(boardSurface);
    this.boardSurface = boardSurface;
    this.createChalkTitle();

    const tray = new THREE.Mesh(new THREE.BoxGeometry(5.4, .16, .52), this.woodHorizontalMaterial);
    tray.position.set(0, 1.67, .22);
    tray.castShadow = true;
    this.board.add(tray);

    const chalkColors = [0xd8d4bd, 0x8dad8e, 0xa25d66];
    chalkColors.forEach((color, index) => {
      const chalk = new THREE.Mesh(
        new THREE.CylinderGeometry(.035, .035, .38 - index * .04, 10),
        new THREE.MeshStandardMaterial({ color, roughness: 1 })
      );
      chalk.rotation.z = Math.PI / 2;
      chalk.position.set(-.65 + index * .42, 1.81, .45);
      chalk.rotation.y = -.08 + index * .07;
      chalk.castShadow = true;
      this.board.add(chalk);
    });

    const legGeometry = new THREE.BoxGeometry(.18, 2.15, .2);
    [-2.85, 2.85].forEach((x) => {
      const leg = new THREE.Mesh(legGeometry, this.brassMaterial);
      leg.position.set(x, .85, -.05);
      leg.castShadow = true;
      this.board.add(leg);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(1.8, .16, .7), this.brassMaterial);
      foot.position.set(x, -.12, .05);
      foot.castShadow = true;
      this.board.add(foot);

      [-.66, .66].forEach((offset) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .12, 16), this.blackMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x + offset, -.32, .08);
        wheel.castShadow = true;
        this.board.add(wheel);
      });
    });

    this.boardButtonRecords = [];
    this.paperButtonMeshes = [];
    [
      { panel: "main", kind: "camera", id: "approach", label: "ПОДОЙТИ", x: -1.73, y: 4.15, rotation: -.027, fontSize: 78 },
      { panel: "main", kind: "camera", id: "observe", label: "ОСМОТРЕТЬСЯ", x: 1.73, y: 4.08, rotation: .032, fontSize: 62 },
      { panel: "contacts", kind: "link", id: "telegram", label: "ТЕЛЕГРАМ", x: -1.3, y: 4.08, rotation: -.025, width: 2.18, height: 1.08, fontSize: 68, href: this.contactLinks.telegram },
      { panel: "contacts", kind: "link", id: "github", label: "ГИТХАБ", x: 1.3, y: 4.08, rotation: .022, width: 2.18, height: 1.08, fontSize: 82, href: this.contactLinks.github },
      { panel: "contacts", kind: "back", id: "back", label: "НАЗАД", x: -2.78, y: 2.65, rotation: .025, width: 1.3, height: .62, fontSize: 76, accent: "#754553", accentSoft: "rgba(117,69,83,.32)", ink: "#653745", paperColor: "#cfc5b3" }
    ].forEach((definition, index) => this.createPaperButton(definition, index));
    this.updateBoardPresentation(0, true);
  }

  createPaperButton(definition, index) {
    const width = definition.width || 2.76;
    const height = definition.height || 1.36;
    const geometry = new THREE.PlaneGeometry(width, height, 18, 10);
    const position = geometry.attributes.position;
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      const x = position.getX(vertex);
      const y = position.getY(vertex);
      const edgeCurl = Math.pow(Math.abs(x) / (width * .5), 4) * .024
        + Math.pow(Math.abs(y) / (height * .5), 4) * .014;
      const unevenness = Math.sin(x * 3.7 + y * 2.1 + index) * .0045;
      position.setZ(vertex, edgeCurl + unevenness);
    }
    geometry.computeVertexNormals();

    const paperMaterial = new THREE.MeshStandardMaterial({
      color: 0xf2ead6,
      map: this.createPaperTexture(definition.label, definition),
      roughness: .9,
      metalness: 0,
      emissive: 0x000000,
      emissiveIntensity: 0,
      transparent: true,
      side: THREE.DoubleSide
    });
    const group = new THREE.Group();
    group.position.set(definition.x, definition.y, .31);
    group.rotation.z = definition.rotation;
    this.board.add(group);

    const paper = new THREE.Mesh(geometry, paperMaterial);
    paper.castShadow = true;
    paper.receiveShadow = true;
    paper.userData.boardButton = definition;
    group.add(paper);

    const pinMaterial = new THREE.MeshStandardMaterial({
      color: definition.kind === "back" ? 0x642735 : index % 2 === 0 ? 0x335e3d : 0x725e37,
      roughness: .28,
      metalness: .5,
      transparent: true
    });
    const pinOffsetX = width * .38;
    const pinY = height * .35;
    [-pinOffsetX, pinOffsetX].forEach((pinX) => {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(.078, .062, .095, 18), pinMaterial);
      pin.rotation.x = Math.PI / 2;
      pin.position.set(pinX, pinY, .08);
      pin.castShadow = true;
      group.add(pin);
    });

    const record = {
      ...definition,
      group,
      mesh: paper,
      material: paperMaterial,
      pinMaterial,
      baseX: definition.x,
      baseY: definition.y,
      baseZ: .31
    };
    this.boardButtonRecords.push(record);
    this.paperButtonMeshes.push(paper);
  }

  updateBoardPresentation(delta, immediate = false) {
    if (!this.boardButtonRecords) return;
    this.boardTransition = immediate
      ? this.boardTransitionTarget
      : damp(this.boardTransition, this.boardTransitionTarget, 4.4, delta);
    const contactAmount = clamp(this.boardTransition, 0, 1);
    const mainAmount = 1 - contactAmount;
    if (this.chalkTitleMaterial) this.chalkTitleMaterial.opacity = contactAmount * .92;

    this.boardButtonRecords.forEach((record) => {
      const hovered = this.hoveredButton === record.id;
      const selected = record.kind === "camera" && this.cameraMode === record.id;
      const amount = record.panel === "main" ? mainAmount : contactAmount;
      const baseScale = record.panel === "main" ? .9 + amount * .1 : .84 + amount * .16;
      record.group.visible = amount > .018;
      record.group.position.set(
        record.baseX,
        record.baseY + (record.panel === "main" ? contactAmount * .1 : (1 - contactAmount) * -.08),
        record.baseZ + (hovered ? .055 : 0) + (selected ? .022 : 0)
      );
      record.group.scale.setScalar(baseScale * (hovered ? 1.025 : 1));
      record.material.opacity = amount;
      record.pinMaterial.opacity = amount;
      record.material.depthWrite = amount > .65;
      record.pinMaterial.depthWrite = amount > .65;
      record.material.color.set(selected ? 0xb8d6b9 : hovered ? 0xffffff : 0xf2ead6);
      record.material.emissive.set(hovered || selected ? 0x14351c : 0x000000);
      record.material.emissiveIntensity = hovered ? .16 : selected ? .09 : 0;
    });
  }

  createChairs() {
    this.chairs = [
      this.createChair(-5.45, .45, -.35),
      this.createChair(5.45, .45, .35)
    ];
  }

  createChair(x, z, rotationY) {
    const chair = new THREE.Group();
    chair.position.set(x, 0, z);
    chair.rotation.y = rotationY;
    this.scene.add(chair);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, .46, 1.82, 4, 2, 4), this.chairMaterial);
    seat.position.set(0, 1.18, 0);
    seat.castShadow = true;
    chair.add(seat);

    const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.85, .28, 1.52), this.chairMaterial);
    cushion.position.set(0, 1.49, .03);
    cushion.castShadow = true;
    chair.add(cushion);

    const back = new THREE.Mesh(new THREE.BoxGeometry(2.18, 2.35, .44, 5, 5, 2), this.chairMaterial);
    back.position.set(0, 2.44, -.77);
    back.rotation.x = -.12;
    back.castShadow = true;
    chair.add(back);

    [-1.02, 1.02].forEach((side) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(.34, .62, 1.8), this.chairMaterial);
      arm.position.set(side, 1.73, -.02);
      arm.castShadow = true;
      chair.add(arm);
    });

    [-.79, .79].forEach((side) => {
      [-.62, .55].forEach((depth) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(.075, .11, 1.05, 10), this.woodEdgeMaterial);
        leg.position.set(side, .55, depth);
        leg.rotation.z = side * .055;
        leg.castShadow = true;
        chair.add(leg);
      });
    });

    [-.55, 0, .55].forEach((buttonX) => {
      [2.05, 2.68].forEach((buttonY) => {
        const tuft = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 6), this.chairDarkMaterial);
        tuft.scale.z = .35;
        tuft.position.set(buttonX, buttonY, -.52);
        chair.add(tuft);
      });
    });
    return chair;
  }

  createLamps() {
    this.lampLights = [];
    this.lamps = [
      this.createLamp(-7.75, -3.8, 1),
      this.createLamp(7.75, -3.8, -1)
    ];
  }

  createLamp(x, z, mirror) {
    const lamp = new THREE.Group();
    lamp.position.set(x, 0, z);
    lamp.rotation.z = mirror * .015;
    this.scene.add(lamp);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(.72, .82, .16, 28), this.brassMaterial);
    base.position.y = .1;
    base.castShadow = true;
    lamp.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 5.65, 14), this.brassMaterial);
    pole.position.y = 2.98;
    pole.castShadow = true;
    lamp.add(pole);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(.5, .055, 10, 28), this.brassMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 5.86;
    lamp.add(ring);

    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.5, 1.04, 1.28, 32, 1, true), this.shadeMaterial);
    shade.position.y = 5.45;
    shade.castShadow = true;
    lamp.add(shade);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(.14, 14, 8), this.brassMaterial);
    cap.position.y = 6.13;
    lamp.add(cap);

    const light = new THREE.PointLight(0xffa66c, 21, 10, 1.75);
    light.position.y = 5.35;
    lamp.add(light);
    this.lampLights.push(light);
    return lamp;
  }

  createDust() {
    const count = 520;
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = random(-10.5, 10.5);
      positions[index * 3 + 1] = random(.3, 9.5);
      positions[index * 3 + 2] = random(-9.5, 29);
      phases[index] = random(0, Math.PI * 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
    const material = new THREE.PointsMaterial({
      color: 0xd8ad87,
      size: .025,
      transparent: true,
      opacity: .34,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.dust = new THREE.Points(geometry, material);
    this.scene.add(this.dust);
  }

  bindEvents() {
    this.setupMobileControls();
    window.addEventListener("resize", () => this.resize(), { passive: true });
    window.addEventListener("pointermove", (event) => {
      if (event.target instanceof Element && event.target.closest("[data-overlay-ui]")) return;
      if (this.freeCameraEnabled) return;
      const rect = this.canvas.getBoundingClientRect();
      this.pointerTarget.x = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
      this.pointerTarget.y = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1);
      this.pointerNdc.set(this.pointerTarget.x, -this.pointerTarget.y);
      this.updateBoardHover();
    }, { passive: true });

    window.addEventListener("pointerdown", (event) => {
      if (event.target instanceof Element && event.target.closest("[data-overlay-ui]")) return;
      if (this.portalSequence) return;
      if (this.freeCameraEnabled) {
        if (!this.isTouch && document.pointerLockElement !== this.canvas) this.canvas.requestPointerLock?.();
        return;
      }
      const rect = this.canvas.getBoundingClientRect();
      this.pointerNdc.set(
        (event.clientX - rect.left) / rect.width * 2 - 1,
        -((event.clientY - rect.top) / rect.height * 2 - 1)
      );
      const button = this.pickBoardButton();
      if (button?.kind === "camera") {
        this.setCameraMode(this.cameraMode === button.id ? "default" : button.id);
      } else if (button?.kind === "back") {
        this.setCameraMode("default");
      } else if (button?.kind === "link") {
        this.startPortalTransition(button.href);
      }
    });

    window.addEventListener("mousemove", (event) => {
      if (!this.freeCameraEnabled || document.pointerLockElement !== this.canvas) return;
      this.freeYaw -= event.movementX * .0021;
      this.freePitch = clamp(this.freePitch - event.movementY * .0021, -Math.PI * .48, Math.PI * .48);
    });

    window.addEventListener("keydown", (event) => {
      if (!this.freeCameraEnabled) return;
      const controls = ["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"];
      if (controls.includes(event.code)) {
        event.preventDefault();
        this.freeCameraKeys.add(event.code);
      }
    });

    window.addEventListener("keyup", (event) => {
      this.freeCameraKeys.delete(event.code);
    });

    document.addEventListener("pointerlockchange", () => {
      if (!this.isTouch && this.freeCameraEnabled && document.pointerLockElement !== this.canvas) {
        this.disableFreeCamera();
        this.cameraMode = "default";
        this.boardTransitionTarget = 0;
        this.updateBoardPresentation(0);
      }
    });

    window.addEventListener("pointerleave", () => {
      this.pointerTarget.set(0, 0);
      this.pointerNdc.set(2, 2);
      this.setHoveredButton(null);
    }, { passive: true });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.clock.getDelta();
    });

    window.addEventListener("pageshow", (event) => {
      if (event.persisted || document.body.classList.contains("is-transitioning") || sessionStorage.getItem("about-return-to-contacts") === "1") {
        this.restoreAfterNavigation();
      }
    });
  }

  setupMobileControls() {
    this.mobileControls = document.querySelector("#mobileControls");
    if (!this.mobileControls || !this.isTouch) return;
    document.body.classList.add("is-touch-mode");

    const resetStick = (type, element) => {
      this.mobileStickPointers[type] = null;
      const input = type === "move" ? this.mobileMoveInput : this.mobileLookInput;
      input.set(0, 0);
      const knob = element.querySelector(".mobile-stick__knob");
      if (knob) knob.style.transform = "translate(-50%, -50%)";
    };

    this.mobileControls.querySelectorAll("[data-stick]").forEach((element) => {
      const type = element.dataset.stick;
      const input = type === "move" ? this.mobileMoveInput : this.mobileLookInput;
      const knob = element.querySelector(".mobile-stick__knob");
      const updateStick = (event) => {
        const rect = element.getBoundingClientRect();
        const radius = rect.width * .34;
        let x = event.clientX - (rect.left + rect.width * .5);
        let y = event.clientY - (rect.top + rect.height * .5);
        const distance = Math.hypot(x, y);
        if (distance > radius) {
          x *= radius / distance;
          y *= radius / distance;
        }
        input.set(x / radius, -y / radius);
        if (knob) knob.style.transform = `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px))`;
      };

      element.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!this.freeCameraEnabled || this.mobileStickPointers[type] !== null) return;
        this.mobileStickPointers[type] = event.pointerId;
        element.setPointerCapture?.(event.pointerId);
        updateStick(event);
      });
      element.addEventListener("pointermove", (event) => {
        if (this.mobileStickPointers[type] !== event.pointerId) return;
        event.preventDefault();
        updateStick(event);
      });
      const release = (event) => {
        if (this.mobileStickPointers[type] !== event.pointerId) return;
        resetStick(type, element);
      };
      element.addEventListener("pointerup", release);
      element.addEventListener("pointercancel", release);
      element.addEventListener("lostpointercapture", release);
    });

    this.mobileControls.querySelector(".mobile-walk-exit")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.setCameraMode("default");
    });
  }

  resetMobileControls() {
    this.mobileMoveInput.set(0, 0);
    this.mobileLookInput.set(0, 0);
    this.mobileStickPointers.move = null;
    this.mobileStickPointers.look = null;
    this.mobileControls?.querySelectorAll(".mobile-stick__knob").forEach((knob) => {
      knob.style.transform = "translate(-50%, -50%)";
    });
  }

  pickBoardButton() {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const interactiveMeshes = this.paperButtonMeshes.filter((mesh) => mesh.parent.visible && mesh.material.opacity > .35);
    const hit = this.raycaster.intersectObjects(interactiveMeshes, false)[0];
    return hit?.object?.userData?.boardButton || null;
  }

  updateBoardHover() {
    const button = this.pickBoardButton();
    this.setHoveredButton(button?.id || null);
  }

  setHoveredButton(id) {
    if (this.hoveredButton === id) return;
    this.hoveredButton = id;
    this.canvas.classList.toggle("is-interactive", Boolean(id));
    this.updateBoardPresentation(0);
  }

  setTheme(id) {
    if (!this.themeDefinitions[id]) return;
    this.activeTheme = id;
    this.glitch = id === "fever" ? 1 : .72;
    this.nextGlitch = this.elapsed + random(2.6, 5.8);
  }

  setCameraMode(mode) {
    if (mode === "observe" && !this.freeCameraEnabled) {
      this.enableFreeCamera();
    } else if (mode !== "observe" && this.freeCameraEnabled) {
      this.disableFreeCamera();
    }
    this.cameraMode = mode;
    this.boardTransitionTarget = mode === "approach" ? 1 : 0;
    this.intro = 1;
    this.glitch = Math.max(this.glitch, .34);
    this.setHoveredButton(null);
    this.updateBoardPresentation(0);
  }

  enableFreeCamera() {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    this.freeCameraPosition.copy(this.camera.position);
    this.freeYaw = Math.atan2(-direction.x, -direction.z);
    this.freePitch = Math.asin(clamp(direction.y, -1, 1));
    this.freeStartEyeHeight = this.camera.position.y;
    this.freeGroundBlend = 0;
    this.freeCameraVelocity.set(0, 0, 0);
    this.walkAmount = 0;
    this.freeCameraEnabled = true;
    document.body.classList.add("is-observing");
    this.mobileControls?.setAttribute("aria-hidden", "false");
    if (!this.isTouch) this.canvas.requestPointerLock?.();
  }

  disableFreeCamera() {
    this.freeCameraEnabled = false;
    this.freeCameraKeys.clear();
    this.freeCameraVelocity.set(0, 0, 0);
    this.resetMobileControls();
    document.body.classList.remove("is-observing");
    this.mobileControls?.setAttribute("aria-hidden", "true");
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
  }

  updateFreeCamera(delta) {
    if (this.isTouch) {
      this.freeYaw -= this.mobileLookInput.x * 1.95 * delta;
      this.freePitch = clamp(this.freePitch + this.mobileLookInput.y * 1.48 * delta, -Math.PI * .48, Math.PI * .48);
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
    const speed = running ? 6.4 : 3.45;
    const inputStrength = keyboardMoving ? 1 : mobileStrength;
    const desiredVelocity = input.lengthSq() > 0 ? input.normalize().multiplyScalar(speed * inputStrength) : input;
    const acceleration = input.lengthSq() > 0 ? 12 : 9;
    this.freeCameraVelocity.x = damp(this.freeCameraVelocity.x, desiredVelocity.x, acceleration, delta);
    this.freeCameraVelocity.z = damp(this.freeCameraVelocity.z, desiredVelocity.z, acceleration, delta);

    const nextX = this.freeCameraPosition.x + this.freeCameraVelocity.x * delta;
    const nextZ = this.freeCameraPosition.z + this.freeCameraVelocity.z * delta;
    if (!this.isWalkBlocked(nextX, this.freeCameraPosition.z)) {
      this.freeCameraPosition.x = nextX;
    } else {
      this.freeCameraVelocity.x = 0;
    }
    if (!this.isWalkBlocked(this.freeCameraPosition.x, nextZ)) {
      this.freeCameraPosition.z = nextZ;
    } else {
      this.freeCameraVelocity.z = 0;
    }

    this.freeGroundBlend = damp(this.freeGroundBlend, 1, 5.5, delta);
    const groundEye = lerp(this.freeStartEyeHeight, this.freeEyeHeight, this.freeGroundBlend);
    const actualSpeed = Math.hypot(this.freeCameraVelocity.x, this.freeCameraVelocity.z);
    const movingTarget = clamp(actualSpeed / Math.max(.001, speed), 0, 1);
    this.walkAmount = damp(this.walkAmount, movingTarget, movingTarget > this.walkAmount ? 9 : 6, delta);
    if (actualSpeed > .08) this.walkPhase += delta * (running ? 12.8 : 9.2);

    const bobY = Math.sin(this.walkPhase * 2) * .055 * this.walkAmount;
    const sway = Math.sin(this.walkPhase) * .032 * this.walkAmount;
    const cameraPosition = this.freeCameraPosition.clone().addScaledVector(right, sway);
    cameraPosition.y = groundEye + bobY;
    this.camera.position.copy(cameraPosition);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.freePitch, this.freeYaw, Math.sin(this.walkPhase) * .008 * this.walkAmount);
  }

  isWalkBlocked(x, z) {
    if (x < -10.55 || x > 10.55 || z < -8.95 || z > 29.2) return true;
    const inside = (centerX, centerZ, radiusX, radiusZ) => (
      Math.abs(x - centerX) < radiusX && Math.abs(z - centerZ) < radiusZ
    );
    if (inside(this.board.position.x, -3.7, 4.15, .72)) return true;
    if (inside(-5.45, .45, 1.38, 1.48) || inside(5.45, .45, 1.38, 1.48)) return true;
    if (inside(-7.75, -3.8, .82, .82) || inside(7.75, -3.8, .82, .82)) return true;
    return false;
  }

  startPortalTransition(url) {
    if (!url || this.portalSequence) return;
    if (this.freeCameraEnabled) this.disableFreeCamera();
    this.cameraMode = "portal";
    this.hoveredButton = null;
    this.canvas.classList.remove("is-interactive");
    this.portalSequence = {
      url,
      elapsed: 0,
      navigated: false,
      startPosition: this.camera.position.clone(),
      watchPosition: new THREE.Vector3(0, 4.35, 5.8),
      entrancePosition: new THREE.Vector3(0, 4.3, -9.22)
    };
    this.portalTextureTick = 0;
    this.portalMaterial.opacity = 0;
    this.doorPivot.rotation.y = 0;
    document.body.classList.add("is-transitioning");
    if (this.transitionBlackout) this.transitionBlackout.style.opacity = "0";
  }

  updatePortalTransition(delta) {
    const sequence = this.portalSequence;
    if (!sequence) return;
    sequence.elapsed += delta;
    const smooth = (value) => {
      const amount = clamp(value, 0, 1);
      return amount * amount * (3 - 2 * amount);
    };
    const reveal = smooth(sequence.elapsed / 1.05);
    this.board.position.x = lerp(0, 8.7, reveal);
    this.doorPivot.rotation.y = reveal * 1.34;
    this.portalMaterial.opacity = smooth((sequence.elapsed - .08) / .7) * .97;
    this.portalMesh.position.x = Math.sin(this.elapsed * 28) * .014 * reveal;
    this.portalMesh.scale.set(1 + Math.sin(this.elapsed * 19) * .006 * reveal, 1 + Math.cos(this.elapsed * 23) * .005 * reveal, 1);

    this.portalTextureTick += delta;
    if (this.portalTextureTick >= .075) {
      this.portalTextureTick = 0;
      this.drawPortalTexture();
    }

    const portalLook = new THREE.Vector3(0, 4.3, -9.82);
    if (sequence.elapsed < 1.05) {
      this.camera.position.copy(sequence.startPosition).lerp(sequence.watchPosition, reveal);
    } else if (sequence.elapsed < 2.05) {
      this.camera.position.copy(sequence.watchPosition);
    } else {
      const enter = smooth((sequence.elapsed - 2.05) / 1.85);
      this.camera.position.copy(sequence.watchPosition).lerp(sequence.entrancePosition, enter);
      this.glitch = Math.max(this.glitch, .28 + enter * .62 + Math.sin(this.elapsed * 31) * .08);
      const blackout = clamp((enter - .58) / .42, 0, 1);
      if (this.transitionBlackout) this.transitionBlackout.style.opacity = blackout.toFixed(3);
    }
    this.camera.lookAt(portalLook);

    if (sequence.elapsed >= 4.02 && !sequence.navigated) {
      sequence.navigated = true;
      sessionStorage.setItem("about-return-to-contacts", "1");
      window.location.assign(sequence.url);
    }
  }

  restoreAfterNavigation() {
    sessionStorage.removeItem("about-return-to-contacts");
    this.shouldRestoreContacts = false;
    this.portalSequence = null;
    this.freeCameraEnabled = false;
    this.freeCameraKeys.clear();
    this.resetMobileControls();
    document.body.classList.remove("is-observing");
    this.mobileControls?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-transitioning");
    if (this.transitionBlackout) this.transitionBlackout.style.opacity = "0";
    this.board.position.set(0, .12, -3.7);
    this.doorPivot.rotation.y = 0;
    this.portalMaterial.opacity = 0;
    this.portalMesh.position.x = 0;
    this.portalMesh.scale.set(1, 1, 1);
    this.cameraMode = "approach";
    this.intro = 1;
    this.introActive = false;
    this.boardTransitionTarget = 1;
    this.boardTransition = 1;
    this.hoveredButton = null;
    this.pointer.set(0, 0);
    this.pointerTarget.set(0, 0);
    this.pointerNdc.set(2, 2);
    this.canvas.classList.remove("is-interactive");
    this.camera.position.set(0, this.mobileLayout ? 5.05 : 4.55, this.mobileLayout ? 13.4 : 8.7);
    this.camera.lookAt(0, 3.85, -3.58);
    this.updateBoardPresentation(0, true);
    this.glitch = .24;
    this.clock.getDelta();
  }

  resize() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    const renderScale = width < 760 ? .78 : .82;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.renderTarget.setSize(
      Math.max(1, Math.round(width * pixelRatio * renderScale)),
      Math.max(1, Math.round(height * pixelRatio * renderScale))
    );
    this.postMaterial.uniforms.resolution.value.set(width * pixelRatio, height * pixelRatio);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.mobileLayout = width / height < .84;
    this.cameraEnd = new THREE.Vector3(0, this.mobileLayout ? 5.35 : 4.85, this.mobileLayout ? 18.8 : 13.6);
    this.cameraStart = new THREE.Vector3(0, this.mobileLayout ? 5.72 : 5.18, this.mobileLayout ? 30.2 : 27.4);
    this.lookTarget = new THREE.Vector3(0, this.mobileLayout ? 3.55 : 3.25, -3.45);
  }

  async finishLoading() {
    const pageLoaded = document.readyState === "complete"
      ? Promise.resolve()
      : new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));
    const chalkFontReady = document.fonts?.load('108px "Neucha"', "Я живу тут:").catch(() => []) || Promise.resolve();
    await Promise.all([pageLoaded, chalkFontReady]);
    this.drawChalkTitle();
    const restoringContacts = this.shouldRestoreContacts;
    if (restoringContacts) this.restoreAfterNavigation();
    this.renderFrame();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    document.body.classList.add("is-ready");
    if (!restoringContacts) {
      this.intro = 0;
      this.introActive = true;
    }
  }

  updateTheme(delta) {
    const target = this.themeDefinitions[this.activeTheme];
    const amount = 1 - Math.exp(-2.7 * delta);
    this.curtainMaterial.color.lerp(target.curtain, amount);
    this.curtainDarkMaterial.color.lerp(target.curtainDark, amount);
    this.curtainMaterial.sheenColor.lerp(target.curtain, amount);
    this.curtainDarkMaterial.sheenColor.lerp(target.curtainDark, amount);
    this.floorMaterial.color.lerp(target.floor, amount);
    this.keyLight.color.lerp(target.light, amount);
    this.redBackLight.color.lerp(target.lamp, amount);
    this.curtainLights.forEach((light) => light.color.lerp(target.lamp, amount));
    this.lampLights.forEach((light) => light.color.lerp(target.lamp, amount));
    this.shadeMaterial.emissive.lerp(target.curtainDark, amount);
    this.scene.fog.color.lerp(target.fog, amount);
    this.scene.background.lerp(target.fog, amount);
    this.renderer.toneMappingExposure = damp(this.renderer.toneMappingExposure, target.exposure, 2.7, delta);
  }

  updateCamera(delta) {
    if (this.portalSequence) {
      this.updatePortalTransition(delta);
      return;
    }
    if (this.freeCameraEnabled) {
      this.updateFreeCamera(delta);
      this.board.rotation.y = -.018;
      return;
    }
    if (this.introActive) {
      this.intro = Math.min(1, this.intro + delta * (this.reduceMotion ? 1.35 : .34));
      if (this.intro >= 1) this.introActive = false;
    }
    const introEase = this.intro * this.intro * (3 - 2 * this.intro);
    this.pointer.x = damp(this.pointer.x, this.pointerTarget.x, 2.2, delta);
    this.pointer.y = damp(this.pointer.y, this.pointerTarget.y, 2.2, delta);

    const base = this.cameraStart.clone().lerp(this.cameraEnd, introEase);
    if (this.introActive && !this.reduceMotion) {
      const settle = Math.sin(Math.PI * this.intro);
      const step = this.intro * Math.PI * 12;
      base.x += Math.sin(step * .5) * .045 * settle;
      base.y += Math.sin(step) * .052 * settle;
    }
    if (this.cameraMode === "approach") {
      base.set(0, this.mobileLayout ? 5.05 : 4.55, this.mobileLayout ? 13.4 : 8.7);
    }
    const parallaxScale = this.isTouch ? .32 : 1;
    base.x += this.pointer.x * .72 * parallaxScale;
    base.y -= this.pointer.y * .3 * parallaxScale;
    base.z += Math.abs(this.pointer.x) * .08;
    this.camera.position.lerp(base, 1 - Math.exp(-4.2 * delta));

    const look = this.lookTarget.clone();
    if (this.cameraMode === "approach") {
      look.set(0, 3.85, -3.58);
    }
    look.x += this.pointer.x * .18 * parallaxScale;
    look.y -= this.pointer.y * .08 * parallaxScale;
    this.camera.lookAt(look);

    this.board.rotation.y = -.018 + this.pointer.x * .006 * parallaxScale;
  }

  updateEffects(delta) {
    const theme = this.themeDefinitions[this.activeTheme];
    if (!this.reduceMotion && this.elapsed > this.nextGlitch) {
      this.glitch = this.activeTheme === "fever" ? 1 : random(.42, .78);
      this.nextGlitch = this.elapsed + random(3.3, 7.2);
    }
    this.glitch = Math.max(theme.glitch, this.glitch - delta * (this.activeTheme === "fever" ? 1.45 : 2.9));
    this.postMaterial.uniforms.glitch.value = this.glitch;
    this.postMaterial.uniforms.time.value = this.elapsed;

    const cssGlitch = this.glitch > .38 ? (this.glitch - .38) / .62 : 0;
    document.documentElement.style.setProperty("--glitch-opacity", (cssGlitch * .7).toFixed(3));
    document.documentElement.style.setProperty("--glitch-x", `${((Math.random() - .5) * cssGlitch * 34).toFixed(1)}px`);

    const flicker = 1 + Math.sin(this.elapsed * 11.7) * .014 + (Math.random() - .5) * .018;
    this.lampLights.forEach((light, index) => {
      light.intensity = (20.5 + Math.sin(this.elapsed * 2.1 + index * 1.7) * .7) * flicker;
    });
    this.redBackLight.intensity = 33 + Math.sin(this.elapsed * 1.35) * 2.2;
    this.keyLight.intensity = 69 + Math.sin(this.elapsed * .72) * 2;
    this.curtainLights[0].intensity = 51 + Math.sin(this.elapsed * .43) * 1.6;
    this.curtainLights[1].intensity = 38 + Math.sin(this.elapsed * .57 + 1.4) * 1.3;

    this.dust.rotation.y += delta * .006;
    this.dust.position.y = Math.sin(this.elapsed * .19) * .08;

    this.updateBoardPresentation(delta);

  }

  renderFrame() {
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.postScene, this.postCamera);
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), .05);
    this.elapsed += delta;
    this.updateTheme(delta);
    this.updateCamera(delta);
    this.updateEffects(delta);
    this.renderFrame();
  }
}

const canvas = document.querySelector("#world");
if (canvas) new PrivateRoom(canvas);
