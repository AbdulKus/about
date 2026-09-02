import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import {
  SKY_HILL_GLSL,
  SKY_MEADOW_SETTINGS,
  SKY_MEADOW_TIMING,
  SKY_NOISE_GLSL,
  sampleSkyMeadowHeight
} from "./sky-meadow.js?v=4";

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
    this.doorPrompt = document.querySelector("#doorPrompt");
    this.liminalPromptActive = false;
    this.liminalDoorTarget = 0;
    this.liminalDoorOpenAmount = 0;
    this.liminalEntered = false;
    this.liminalFall = false;
    this.liminalFallTime = 0;
    this.liminalStairStartX = -139.5;
    this.liminalStairEndX = -176.0;
    this.liminalStairExitX = -184.2;
    this.liminalStairRise = 15.5;
    this.liminalStairSteps = 40;
    this.liminalWhiteRoomNearX = -158.2;
    this.liminalWhiteRoomFarX = -198.0;
    this.liminalWhiteRoomHalfWidth = 9.5;
    this.skyBaseY = 0;
    this.liminalStairSanctuary = 0;
    this.skyMode = false;
    this.cityMode = false;
    this.cityLanded = false;
    this.cityLandingTime = 0;
    this.cityImpactPlayed = false;
    this.cityTravelDistance = 0;
    this.cityBiomechProgress = 0;
    this.cityBiomechTarget = 0;
    this.cityForwardTime = 0;
    this.cityEmojiSpawned = false;
    this.cityEmojiHits = 0;
    this.cityEmojiMaxHits = 5;
    this.cityEmojiPromptActive = false;
    this.cityEmojiHitCooldown = 0;
    this.cityEmojiShake = 0;
    this.cityEmojiDeathTime = 0;
    this.cityFinaleState = "dormant";
    this.cityFinaleLocksMovement = false;
    this.cityInfectedSymbolMeshes = [];
    this.locationMenuKDown = false;
    this.locationMenuHold = 0;
    this.locationMenuOpen = false;
    this.locationMenuIndex = 0;
    this.locationStages = [
      { id: "start", label: "Стартовая комната" },
      { id: "corridor", label: "Коридор перед шторами" },
      { id: "junction", label: "Развилка за шторами" },
      { id: "right", label: "Правый конец коридора" },
      { id: "fall", label: "Провал пола" },
      { id: "left", label: "Левый глитч-коридор" },
      { id: "stairs", label: "Лестница наверх" },
      { id: "white-room", label: "Белая комната" },
      { id: "sky", label: "Небо" },
      { id: "sky-hills", label: "Поднимающиеся холмы" },
      { id: "sky-door", label: "Дверь и бабочки" },
      { id: "city", label: "Город" },
      { id: "mutation", label: "Поздняя биомутация" },
      { id: "emoji", label: "Смайл на перекрёстке" },
      { id: "flood", label: "Начало потопа" },
      { id: "flood-peak", label: "Пик потопа" },
      { id: "black", label: "Конец потопа" }
    ];
    this.skyTransition = 0;
    this.skyWhiteHold = .85;
    this.skyTransitionDuration = 3.25;
    this.skyGlare = 0;
    this.skyCloudTime = 0;
    this.skyWalkTime = 0;
    this.skyMeadowStarted = false;
    this.skyMeadowGrounded = false;
    this.skyMeadowProgress = 0;
    this.skyMeadowStartDelay = SKY_MEADOW_TIMING.startDelay;
    this.skyMeadowRiseDuration = SKY_MEADOW_TIMING.riseDuration;
    this.skyDoorDelay = SKY_MEADOW_TIMING.doorDelay;
    this.skyMeadowBaseY = 0;
    this.skyMeadowCameraY = 0;
    this.skyMeadowGroundWalkTime = 0;
    this.skyMeadowDirection = new THREE.Vector3(0, 0, -1);
    this.skyMeadowContactDepth = SKY_MEADOW_SETTINGS.contactDepth;
    this.skyMeadowTileSize = SKY_MEADOW_SETTINGS.tileSize;
    this.skyDoorSpawned = false;
    this.skyDoorReveal = 0;
    this.skyMeadowTileCenterX = Number.NaN;
    this.skyMeadowTileCenterZ = Number.NaN;
    this.skySpawnPosition = new THREE.Vector3();
    this.audioContext = null;
    this.audioMaster = null;
    this.audioCorridorDistortion = 0;
    this.lastFootstepIndex = -1;
    this.ambientMelodyIndex = -1;
    this.footstepBuffer = null;
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

    this.camera = new THREE.PerspectiveCamera(43, 1, .1, 110);
    this.camera.position.set(0, 5.25, 15.8);

    this.createMaterials();
    this.createPostProcess();
    this.createLights();
    this.createRoom();
    this.createBackPassage();
    this.createCloudWorld();
    this.createEndlessCity();
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
    texture.repeat.set(3.15, 10.5);
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
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 70), this.floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 15);
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.floor = floor;

    this.curtains = [];
    const back = this.createCurtain(26, 46, 228, this.curtainMaterial);
    back.position.set(0, 15.1, -10.4);
    this.scene.add(back);
    this.curtains.push(back);

    const left = this.createCurtain(74, 46, 380, this.curtainDarkMaterial);
    left.position.set(-11.85, 15.1, 14);
    left.rotation.y = Math.PI / 2;
    this.scene.add(left);
    this.curtains.push(left);

    const right = this.createCurtain(74, 46, 380, this.curtainDarkMaterial);
    right.position.set(11.85, 15.1, 14);
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

  createCurtain(width, height, segments, material, verticalSegments = 96) {
    const geometry = new THREE.PlaneGeometry(width, height, segments, verticalSegments);
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


  createBackPassage() {
    const passage = new THREE.Group();
    passage.name = "rearPassage";

    const startZ = 17.35;
    const endZ = 68;
    const length = endZ - startZ;
    const centerZ = startZ + length * .5;
    const width = 6.4;
    const height = 7.15;

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x130609,
      roughness: .96,
      metalness: .01
    });
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b0c12,
      roughness: .84,
      metalness: .03
    });
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0x090405,
      roughness: .98,
      metalness: 0
    });

    const passageFloorMaterial = this.floorMaterial.clone();
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

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, length), passageFloorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, .015, centerZ);
    floor.receiveShadow = true;
    passage.add(floor);

    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(width, .18, length), ceilingMaterial);
    ceiling.position.set(0, height, centerZ);
    ceiling.receiveShadow = true;
    passage.add(ceiling);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(.24, height, length), wallMaterial);
    leftWall.position.set(-width * .5, height * .5, centerZ);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    passage.add(leftWall);

    const rightWall = leftWall.clone();
    rightWall.position.x = width * .5;
    passage.add(rightWall);

    const header = new THREE.Mesh(new THREE.BoxGeometry(width + .55, .48, .42), trimMaterial);
    header.position.set(0, height - .12, startZ + .04);
    header.castShadow = true;
    passage.add(header);
    [-width * .5 - .13, width * .5 + .13].forEach((x) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(.46, height, .42), trimMaterial);
      post.position.set(x, height * .5, startZ + .04);
      post.castShadow = true;
      passage.add(post);
    });

    for (let z = startZ + 6; z < endZ - 7; z += 6.2) {
      [-width * .5 + .09, width * .5 - .09].forEach((x) => {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(.34, height - .36, .24), trimMaterial);
        rib.position.set(x, (height - .36) * .5, z);
        rib.castShadow = true;
        passage.add(rib);
      });
      const ceilingRib = new THREE.Mesh(new THREE.BoxGeometry(width - .25, .22, .24), trimMaterial);
      ceilingRib.position.set(0, height - .08, z);
      passage.add(ceilingRib);
    }

    const lampZ = endZ - 3.2;
    const lamp = new THREE.Group();
    lamp.position.set(0, height - .18, lampZ);

    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(.025, .025, 1.05, 8),
      new THREE.MeshStandardMaterial({ color: 0x171011, roughness: .82 })
    );
    cord.position.y = -.5;
    lamp.add(cord);

    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(.46, .58, 20, 1, true),
      this.shadeMaterial
    );
    shade.position.y = -1.02;
    shade.rotation.x = Math.PI;
    lamp.add(shade);

    const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xffc37d, toneMapped: false });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.115, 16, 12), bulbMaterial);
    bulb.position.y = -1.18;
    lamp.add(bulb);
    passage.add(lamp);

    this.passageEndLight = new THREE.PointLight(0xffa85b, 34, 20, 1.7);
    this.passageEndLight.position.set(0, height - 1.38, lampZ);
    this.passageEndLight.castShadow = true;
    this.passageEndLight.shadow.mapSize.set(512, 512);
    this.passageEndLight.shadow.bias = -.00035;
    passage.add(this.passageEndLight);

    this.scene.add(passage);
    this.backPassage = passage;
    this.createLiminalCorridors(endZ, height);
  }

  createLiminalCurtain(length, height, material, seed = 0) {
    const geometry = new THREE.PlaneGeometry(length, height, 22, 18);
    const position = geometry.attributes.position;
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const fold = Math.sin(x * 2.35 + seed) * .24
        + Math.sin(x * 5.7 - y * .17 + seed * .31) * .065
        + Math.sin(y * .66 + x * .24 + seed * .73) * .038;
      position.setZ(index, fold);
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    return mesh;
  }

  createLiminalCorridors(endZ, passageHeight) {
    this.liminalSeed = Math.random() * 10000;
    this.liminalCenterZ = endZ + 3.6;
    this.liminalDoorZ = endZ - .18;
    this.liminalDistortionMeshes = [];
    this.liminalGlitchSlices = [];
    this.liminalRightSegments = [];

    const level = new THREE.Group();
    level.name = "liminalCorridors";
    this.scene.add(level);
    this.liminalLevel = level;

    this.liminalCurtainGate = new THREE.Group();
    this.liminalCurtainGate.position.set(0, 0, this.liminalDoorZ);
    level.add(this.liminalCurtainGate);

    const gateLeftMaterial = this.curtainMaterial.clone();
    const gateRightMaterial = this.curtainMaterial.clone();
    // The interactive curtain is the whole rear-passage wall: each leaf spans
    // half the full 6.4 m passage width with a tiny overlap at the seam.
    const gateLeafWidth = 3.32;
    this.liminalCurtainLeft = this.createCurtain(gateLeafWidth, passageHeight, 72, gateLeftMaterial, 40);
    this.liminalCurtainRight = this.createCurtain(gateLeafWidth, passageHeight, 72, gateRightMaterial, 40);
    this.liminalCurtainLeftBaseX = -1.64;
    this.liminalCurtainRightBaseX = 1.64;
    this.liminalCurtainLeft.position.set(this.liminalCurtainLeftBaseX, passageHeight * .5, 0);
    this.liminalCurtainRight.position.set(this.liminalCurtainRightBaseX, passageHeight * .5, -.015);
    this.liminalCurtainGate.add(this.liminalCurtainLeft, this.liminalCurtainRight);

    const landingMaterial = this.floorMaterial.clone();
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
    level.add(landing);

    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0305,
      roughness: .96,
      metalness: .01
    });
    const landingCeiling = new THREE.Mesh(new THREE.BoxGeometry(8.4, .14, 6.7), ceilingMaterial);
    landingCeiling.position.set(0, passageHeight, this.liminalCenterZ);
    level.add(landingCeiling);

    const leftLength = 154;
    const leftFloorMaterial = this.floorMaterial.clone();
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
    leftFloor.position.set(-leftLength * .5, .025, this.liminalCenterZ);
    leftFloor.receiveShadow = true;
    level.add(leftFloor);
    this.liminalLeftFloor = leftFloor;
    this.registerLiminalDistortion(leftFloor, "floor");

    const junctionHalfGap = 4.5;
    const leftCurtainLength = leftLength - junctionHalfGap;
    const leftCurtainCenterX = -(leftLength + junctionHalfGap) * .5;
    const leftCurtainMaterialA = this.curtainMaterial.clone();
    const leftCurtainMaterialB = this.curtainMaterial.clone();
    // Use the exact Black Lodge curtain shape from the main room here too.
    // Long corridor curtains use fewer subdivisions only to keep the live
    // procedural distortion affordable; the fold formula itself is identical.
    const leftCurtainSegments = Math.max(420, Math.round(leftCurtainLength * 3.2));
    const leftCurtainA = this.createCurtain(leftCurtainLength, 7.15, leftCurtainSegments, leftCurtainMaterialA, 32);
    const leftCurtainB = this.createCurtain(leftCurtainLength, 7.15, leftCurtainSegments, leftCurtainMaterialB, 32);
    leftCurtainA.position.set(leftCurtainCenterX, 3.575, this.liminalCenterZ - 3.25);
    leftCurtainB.position.set(leftCurtainCenterX, 3.575, this.liminalCenterZ + 3.25);
    level.add(leftCurtainA, leftCurtainB);
    this.registerLiminalDistortion(leftCurtainA, "curtainA");
    this.registerLiminalDistortion(leftCurtainB, "curtainB");

    for (let index = 0; index < 15; index += 1) {
      const x = -26 - index * 9.2;
      // The last two ceiling ribs crossed the rising staircase at head height.
      if (x <= this.liminalStairStartX + .8) continue;
      const rib = new THREE.Group();
      rib.position.set(x, 0, this.liminalCenterZ);
      const mat = new THREE.MeshStandardMaterial({
        color: index % 2 ? 0x65101c : 0x31060d,
        roughness: .82,
        metalness: .02
      });
      [-3.18, 3.18].forEach((z) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(.22, 6.9, .32), mat);
        post.position.set(0, 3.45, z);
        rib.add(post);
      });
      const top = new THREE.Mesh(new THREE.BoxGeometry(.24, .2, 6.15), mat);
      top.position.set(0, 6.88, 0);
      rib.add(top);
      level.add(rib);
      this.liminalGlitchSlices.push({
        group: rib,
        baseX: x,
        phase: this.liminalSeed * .01 + index * 1.77,
        strength: clamp((-x - 20) / 124, 0, 1)
      });
    }

    const junctionWallMaterial = new THREE.MeshStandardMaterial({
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
    const segmentCount = 22;
    for (let index = 0; index < segmentCount; index += 1) {
      const t = clamp((index - 3) / (segmentCount - 4), 0, 1);
      const x = index * segmentLength + segmentLength * .5;
      const halfWidth = Math.max(.38, 3.2 * (1 - t * .88));
      const height = passageHeight;
      const segment = new THREE.Group();
      segment.position.set(x, 0, this.liminalCenterZ);

      const floorMaterial = this.floorMaterial.clone();
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
      segment.add(floor);

      const ceiling = new THREE.Mesh(
        new THREE.BoxGeometry(segmentLength + .08, .12, halfWidth * 2),
        ceilingMaterial
      );
      ceiling.position.y = height;
      segment.add(ceiling);

      const curtainSpan = index === 0 ? segmentLength - junctionHalfGap + .12 : segmentLength + .12;
      const curtainOffsetX = index === 0 ? junctionHalfGap * .5 : 0;
      const curtainA = this.createLiminalCurtain(curtainSpan, height, this.curtainMaterial, this.liminalSeed + index * 3.1);
      const curtainB = this.createLiminalCurtain(curtainSpan, height, this.curtainMaterial, this.liminalSeed + 200 + index * 4.7);
      curtainA.position.set(curtainOffsetX, height * .5, -halfWidth);
      curtainB.position.set(curtainOffsetX, height * .5, halfWidth);
      segment.add(curtainA, curtainB);

      level.add(segment);
      this.liminalRightSegments.push({
        group: segment,
        floor,
        baseY: 0,
        x,
        t
      });
    }

    const voidMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
    const voidWall = new THREE.Mesh(new THREE.PlaneGeometry(7, 8), voidMaterial);
    voidWall.rotation.y = -Math.PI / 2;
    voidWall.position.set(segmentCount * segmentLength + .15, 3.4, this.liminalCenterZ);
    level.add(voidWall);

    this.liminalBlackFloor = new THREE.Mesh(new THREE.PlaneGeometry(22, 9), voidMaterial);
    this.liminalBlackFloor.rotation.x = -Math.PI / 2;
    this.liminalBlackFloor.position.set(segmentCount * segmentLength + 7, -5.5, this.liminalCenterZ);
    level.add(this.liminalBlackFloor);

    this.liminalLampLights = [];
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
      [68, 'ceiling', .34, .78],
      [87, 'ceiling', .2, .84],
      [109, 'ceiling', -.12, .7],
      [132, 'ceiling', .08, .54]
    ].forEach(([x, type, side, scale]) => {
      if (type === 'floor') addLiminalFloorLamp(x, side, scale);
      else addLiminalCeilingLamp(x, side, scale);
    });

    this.createLiminalExit(level, passageHeight);

    const thresholdLight = new THREE.PointLight(0xb01328, 12, 24, 1.8);
    thresholdLight.position.set(0, 4.8, this.liminalCenterZ);
    level.add(thresholdLight);
    const leftLight = new THREE.PointLight(0x7d0719, 8, 30, 2);
    leftLight.position.set(-31, 4.3, this.liminalCenterZ - .4);
    level.add(leftLight);
    this.liminalLeftLight = leftLight;
  }

  createLiminalExit(level, passageHeight) {
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

    [-1.33, 1.33].forEach((side) => {
      const railStart = new THREE.Vector3(startX + .12, 1.03, centerZ + side);
      const railEnd = new THREE.Vector3(endX - .08, this.liminalStairRise + 1.03, centerZ + side);
      makeRail(railStart, railEnd, .048);

      const railYAt = (x) => {
        const progress = clamp((railStart.x - x) / (railStart.x - railEnd.x), 0, 1);
        return lerp(railStart.y, railEnd.y, progress);
      };

      for (let index = 1; index < stepCount; index += 3) {
        const stepX = startX - stepDepth * (index + .5);
        const topY = (index + 1) * stepRise;
        const postBottom = topY + .035;
        const postTop = Math.max(postBottom + .08, railYAt(stepX) - .006);
        makeRail(
          new THREE.Vector3(stepX, postBottom, centerZ + side),
          new THREE.Vector3(stepX, postTop, centerZ + side),
          .034
        );
      }

      const finalPostX = endX + .035;
      makeRail(
        new THREE.Vector3(finalPostX, this.liminalStairRise + .035, centerZ + side),
        new THREE.Vector3(finalPostX, railYAt(finalPostX) - .006, centerZ + side),
        .034
      );
    });

    // The room is a real space above the ceiling, but its white shell stays
    // completely hidden until the player has physically cleared the hatch.
    const floorY = this.liminalStairRise;
    const roomNearX = this.liminalWhiteRoomNearX;
    const roomFarX = this.liminalWhiteRoomFarX;
    const roomHalfWidth = this.liminalWhiteRoomHalfWidth;
    const roomLength = roomNearX - roomFarX;
    const roomCenterX = (roomNearX + roomFarX) * .5;
    const roomHeight = 10.5;
    const hatchNearX = roomNearX - .18;
    const hatchFarX = endX + .02;
    const hatchLength = hatchNearX - hatchFarX;
    const hatchCenterX = (hatchNearX + hatchFarX) * .5;
    const hatchHalfWidth = 2.55;

    const whiteRoom = new THREE.Group();
    whiteRoom.name = "physicalWhiteRoom";
    whiteRoom.visible = false;
    exit.add(whiteRoom);
    this.liminalWhiteRoom = whiteRoom;

    const stairCeiling = new THREE.Group();
    stairCeiling.name = "stairCeilingMask";
    exit.add(stairCeiling);

    const whiteMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.FrontSide,
      toneMapped: false
    });
    const darkUndersideMaterial = new THREE.MeshBasicMaterial({
      color: 0x010102,
      side: THREE.FrontSide,
      toneMapped: false
    });

    const addFloorPlane = (length, depth, x, z) => {
      const geometry = new THREE.PlaneGeometry(length, depth);
      const plane = new THREE.Mesh(geometry, whiteMaterial);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(x, floorY, z);
      whiteRoom.add(plane);

      const underside = new THREE.Mesh(geometry, darkUndersideMaterial);
      underside.rotation.x = Math.PI / 2;
      underside.position.set(x, floorY - .035, z);
      stairCeiling.add(underside);
    };

    const farFloorLength = hatchFarX - roomFarX;
    addFloorPlane(farFloorLength, roomHalfWidth * 2, roomFarX + farFloorLength * .5, centerZ);
    const nearFloorLength = roomNearX - hatchNearX;
    addFloorPlane(nearFloorLength, roomHalfWidth * 2, hatchNearX + nearFloorLength * .5, centerZ);
    const sideFloorWidth = roomHalfWidth - hatchHalfWidth;
    [-1, 1].forEach((side) => {
      addFloorPlane(
        hatchLength,
        sideFloorWidth,
        hatchCenterX,
        centerZ + side * (hatchHalfWidth + sideFloorWidth * .5)
      );
    });

    const sideWallA = new THREE.Mesh(new THREE.PlaneGeometry(roomLength, roomHeight), whiteMaterial);
    sideWallA.position.set(roomCenterX, floorY + roomHeight * .5, centerZ - roomHalfWidth);
    whiteRoom.add(sideWallA);
    const sideWallB = sideWallA.clone();
    sideWallB.position.z = centerZ + roomHalfWidth;
    sideWallB.rotation.y = Math.PI;
    whiteRoom.add(sideWallB);

    const nearWall = new THREE.Mesh(new THREE.PlaneGeometry(roomHalfWidth * 2, roomHeight), whiteMaterial);
    nearWall.rotation.y = -Math.PI / 2;
    nearWall.position.set(roomNearX, floorY + roomHeight * .5, centerZ);
    whiteRoom.add(nearWall);
    const farWall = nearWall.clone();
    farWall.rotation.y = Math.PI / 2;
    farWall.position.x = roomFarX;
    whiteRoom.add(farWall);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomLength, roomHalfWidth * 2), whiteMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(roomCenterX, floorY + roomHeight, centerZ);
    whiteRoom.add(ceiling);

    // One unlit, uniformly white portal. It emits no scene light, so the
    // ceiling and floor cannot pick up stripes or premature reflections.
    const portalMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      toneMapped: false,
      depthTest: true,
      depthWrite: true,
      fog: false
    });
    const whitePortal = new THREE.Mesh(
      new THREE.PlaneGeometry(hatchHalfWidth * 2.02, 7.8),
      portalMaterial
    );
    whitePortal.name = "walkThroughWhitePortal";
    whitePortal.rotation.y = Math.PI / 2;
    whitePortal.position.set(endX - .22, floorY + 3.72, centerZ);
    whitePortal.renderOrder = 8;
    exit.add(whitePortal);
    this.liminalWhitePortal = whitePortal;

    const haloCanvas = document.createElement("canvas");
    haloCanvas.width = haloCanvas.height = 256;
    const haloContext = haloCanvas.getContext("2d");
    const haloGradient = haloContext.createRadialGradient(128, 128, 52, 128, 128, 128);
    haloGradient.addColorStop(0, "rgba(255,255,255,.72)");
    haloGradient.addColorStop(.62, "rgba(255,255,255,.24)");
    haloGradient.addColorStop(1, "rgba(255,255,255,0)");
    haloContext.fillStyle = haloGradient;
    haloContext.fillRect(0, 0, 256, 256);
    const haloTexture = new THREE.CanvasTexture(haloCanvas);
    const portalHalo = new THREE.Mesh(
      new THREE.PlaneGeometry(hatchHalfWidth * 2.55, 9.4),
      new THREE.MeshBasicMaterial({
        map: haloTexture,
        color: 0xffffff,
        transparent: true,
        opacity: .48,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false
      })
    );
    portalHalo.rotation.y = Math.PI / 2;
    portalHalo.position.set(endX - .195, floorY + 3.72, centerZ);
    portalHalo.renderOrder = 7;
    exit.add(portalHalo);
    this.liminalWhitePortalHalo = portalHalo;

    const portalFloorLight = new THREE.SpotLight(0xffffff, 34, 15, Math.PI * .19, .92, 1.8);
    portalFloorLight.position.set(endX - .08, floorY + 3.1, centerZ);
    portalFloorLight.target.position.set(endX + 7.2, floorY - 2.35, centerZ);
    portalFloorLight.castShadow = false;
    exit.add(portalFloorLight, portalFloorLight.target);

    const warmGlow = new THREE.PointLight(0xffad69, 19, 15, 1.7);
    warmGlow.position.set(startX - 2.8, 2.65, centerZ - .78);
    exit.add(warmGlow);
  }

  getLiminalStairHeight(x, z) {
    if (!this.liminalEntered || this.skyMode || !this.liminalCenterZ) return 0;

    const inWhiteRoom = x <= this.liminalStairEndX
      && x >= this.liminalWhiteRoomFarX
      && Math.abs(z - this.liminalCenterZ) <= this.liminalWhiteRoomHalfWidth;
    if (inWhiteRoom) return this.liminalStairRise;

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
        uSpawnPos: { value: new THREE.Vector3() },
        uForward: { value: new THREE.Vector3(0, 0, -1) },
        uRight: { value: new THREE.Vector3(1, 0, 0) },
        uUp: { value: new THREE.Vector3(0, 1, 0) },
        uCompositeMode: { value: 0 },
        uMeadowBaseY: { value: 0 }
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
        uniform vec3 uSpawnPos;
        uniform vec3 uForward;
        uniform vec3 uRight;
        uniform vec3 uUp;
        uniform float uCompositeMode;
        uniform float uMeadowBaseY;

        ${SKY_HILL_GLSL}

        float hash31(vec3 p) {
          p = fract(p * .1031);
          p += dot(p, p.yzx + 33.33);
          return fract((p.x + p.y) * p.z);
        }

        float noise3(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float n000 = hash31(i);
          float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
          float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
          float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
          float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
          float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
          float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
          float n111 = hash31(i + vec3(1.0));
          float nx00 = mix(n000, n100, f.x);
          float nx10 = mix(n010, n110, f.x);
          float nx01 = mix(n001, n101, f.x);
          float nx11 = mix(n011, n111, f.x);
          return mix(mix(nx00, nx10, f.y), mix(nx01, nx11, f.y), f.z);
        }

        float fbm3(vec3 p) {
          float value = noise3(p) * .57;
          value += noise3(p * 2.02 + vec3(11.7, 4.3, 8.1)) * .29;
          value += noise3(p * 4.07 + vec3(3.2, 15.4, 6.8)) * .14;
          return value;
        }

        float cloudDensity(vec3 p) {
          vec3 drift = vec3(uTime * 1.35, sin(uTime * .07) * 1.8, uTime * .48);
          vec3 q = p + drift;
          q.xz += vec2(sin(q.z * .016), sin(q.x * .014)) * 6.2;

          float body = fbm3(q * .021);
          float detail = noise3(q * .082 + vec3(7.1, -3.4, 12.8));
          float fluff = noise3(q * .157 + vec3(-5.6, 9.2, 2.4));
          float shape = body * .76 + detail * .19 + fluff * .05;

          float relativeY = p.y - uCameraPos.y;
          float layer = smoothstep(-42.0, -18.0, relativeY)
            * (1.0 - smoothstep(23.0, 49.0, relativeY));
          float spawnClearance = smoothstep(18.0, 38.0, length(p - uSpawnPos));
          return smoothstep(.515, .665, shape) * layer * spawnClearance * 1.36;
        }

        vec3 skyColor(vec3 rd, vec3 sunDir) {
          float h = clamp(rd.y * .5 + .5, 0.0, 1.0);
          vec3 color = mix(vec3(.56, .75, .89), vec3(.80, .91, .98), smoothstep(.03, .43, h));
          color = mix(color, vec3(.23, .53, .83), smoothstep(.43, 1.0, h));
          float sun = max(dot(rd, sunDir), 0.0);
          color += vec3(1.0, .82, .57) * pow(sun, 7.0) * .16;
          color += vec3(1.0, .93, .73) * pow(sun, 34.0) * .34;
          color += vec3(1.0, .98, .88) * smoothstep(.9991, .99976, sun) * 1.18;
          return color;
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
          vec3 sunDir = normalize(vec3(-.18, .93, .31));
          vec3 sunColor = vec3(1.0, .89, .70);
          vec3 background = skyColor(rd, sunDir);
          vec3 scattering = vec3(0.0);
          float transmittance = 1.0;
          float t = 1.2 + hash31(vec3(gl_FragCoord.xy, 17.0)) * 3.1;

          for (int i = 0; i < 24; i++) {
            vec3 pos = ro + rd * t;
            if (uCompositeMode > .5) {
              if (i >= 16) break;
              float groundY = uMeadowBaseY + hillHeight(pos.xz);
              if (pos.y <= groundY + .14) break;
            }
            float density = cloudDensity(pos);
            if (density > .006) {
              float edge = 1.0 - smoothstep(.10, .88, density);
              float sunView = pow(max(dot(rd, sunDir), 0.0), 6.0);
              float softLight = clamp(.30 + edge * .48 + sunView * .18, 0.0, 1.0);

              vec3 cloud = mix(vec3(.43, .55, .69), vec3(1.065, 1.035, .97), softLight);
              float pearlPhase = .5 + .5 * sin(
                pos.x * .026 + pos.y * .039 + pos.z * .020 + uTime * .13
              );
              vec3 pearl = mix(vec3(.91, .98, 1.055), vec3(1.05, .93, 1.01), pearlPhase);
              cloud *= mix(vec3(1.0), pearl, edge * .10);
              cloud += sunColor * sunView * edge * .13;

              float stepLength = mix(3.15, 6.2, clamp(t / 158.0, 0.0, 1.0));
              float alpha = 1.0 - exp(-density * stepLength * .39);
              scattering += cloud * alpha * transmittance;
              transmittance *= 1.0 - alpha;
              if (transmittance < .025) break;
            }
            t += mix(3.15, 6.2, clamp(t / 158.0, 0.0, 1.0));
            if (t > 168.0) break;
          }

          if (uCompositeMode > .5) {
            float cloudOpacity = 1.0 - transmittance;
            if (cloudOpacity < .006) discard;
            vec3 foregroundCloud = scattering / max(cloudOpacity, .001);
            gl_FragColor = vec4(clamp(foregroundCloud, 0.0, 1.12), cloudOpacity * .91);
            return;
          }

          vec3 color = background * transmittance + scattering;
          float sunThrough = pow(max(dot(rd, sunDir), 0.0), 10.0);
          color += sunColor * sunThrough * transmittance * .20;
          color += (hash31(vec3(gl_FragCoord.xy, 31.0)) - .5) * .003;
          gl_FragColor = vec4(clamp(color, 0.0, 1.16), 1.0);
        }
      `
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.skyCloudMaterial);
    quad.frustumCulled = false;
    this.skyScene.add(quad);
    this.skyCloudQuad = quad;
    this.skyCloudOverlayScene = new THREE.Scene();
    this.skyCloudOverlayMaterial = this.skyCloudMaterial.clone();
    this.skyCloudOverlayMaterial.uniforms.uCompositeMode.value = 1;
    this.skyCloudOverlayMaterial.transparent = true;
    this.skyCloudOverlayMaterial.depthTest = false;
    this.skyCloudOverlayMaterial.depthWrite = false;
    this.skyCloudOverlayMaterial.stencilWrite = true;
    this.skyCloudOverlayMaterial.stencilRef = 1;
    this.skyCloudOverlayMaterial.stencilFunc = THREE.EqualStencilFunc;
    this.skyCloudOverlayMaterial.stencilFail = THREE.KeepStencilOp;
    this.skyCloudOverlayMaterial.stencilZFail = THREE.KeepStencilOp;
    this.skyCloudOverlayMaterial.stencilZPass = THREE.KeepStencilOp;
    const overlayQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.skyCloudOverlayMaterial);
    overlayQuad.frustumCulled = false;
    this.skyCloudOverlayScene.add(overlayQuad);
    this.skyCloudOverlayQuad = overlayQuad;
    this.createSkyMeadowWorld();
  }

  skyMeadowHeightWorld(x, z) {
    return sampleSkyMeadowHeight(x, z);
  }

  createSkyMeadowWorld() {
    this.skyMeadowScene = new THREE.Scene();
    this.skyMeadowScene.fog = new THREE.Fog(0xc9e2ed, 165, 390);
    this.skyMeadowRoot = new THREE.Group();
    this.skyMeadowRoot.visible = false;
    this.skyMeadowScene.add(this.skyMeadowRoot);
    this.skyMeadowMaterials = [];
    this.skyDoorMaterials = [];

    const hemisphere = new THREE.HemisphereLight(0xf4fbff, 0x294b20, 2.85);
    this.skyMeadowScene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xffefbd, 3.4);
    sun.position.set(-72, 118, 52);
    this.skyMeadowScene.add(sun);

    const hillFunctionGlsl = SKY_HILL_GLSL;
    const noiseFunctionGlsl = SKY_NOISE_GLSL;
    const terrainSegments = this.isTouch ? 320 : 480;
    const terrainGeometry = new THREE.PlaneGeometry(
      SKY_MEADOW_SETTINGS.terrainSize,
      SKY_MEADOW_SETTINGS.terrainSize,
      terrainSegments,
      terrainSegments
    );
    terrainGeometry.rotateX(-Math.PI / 2);
    const terrainMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec2 vWorldXZ;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        ${hillFunctionGlsl}
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          float baseY = modelMatrix[3].y;
          world.y = baseY + hillHeight(world.xz);
          float epsilon = .48;
          float leftHeight = hillHeight(world.xz - vec2(epsilon, 0.0));
          float rightHeight = hillHeight(world.xz + vec2(epsilon, 0.0));
          float backHeight = hillHeight(world.xz - vec2(0.0, epsilon));
          float frontHeight = hillHeight(world.xz + vec2(0.0, epsilon));
          vWorldNormal = normalize(vec3(leftHeight - rightHeight, epsilon * 2.0, backHeight - frontHeight));
          vWorldXZ = world.xz;
          vWorldPosition = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uOpacity;
        uniform float uTime;
        varying vec2 vWorldXZ;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        ${noiseFunctionGlsl}
        void main() {
          float broad = meadowFbm(vWorldXZ * .018);
          float fine = meadowNoise(vWorldXZ * .087 + vec2(19.2, -8.4));
          float moss = smoothstep(.34, .77, meadowFbm(vWorldXZ * .034 - 31.0));
          float turf = meadowFbm(vWorldXZ * .115 + vec2(-17.0, 29.0));
          float micro = meadowNoise(vWorldXZ * .43 + vec2(turf * 5.1, -turf * 3.7));
          float grain = meadowNoise(vWorldXZ * 1.08 + vec2(41.0, -12.0));
          float distanceToCamera = distance(cameraPosition, vWorldPosition);
          vec3 deepGreen = vec3(.075, .245, .055);
          vec3 freshGreen = vec3(.245, .49, .105);
          vec3 sunGreen = vec3(.42, .61, .16);
          vec3 albedo = mix(deepGreen, freshGreen, broad);
          albedo = mix(albedo, sunGreen, moss * .34);
          albedo *= .82 + fine * .18 + turf * .14 + micro * .09;
          vec3 warmSoil = vec3(.19, .205, .075);
          float soil = smoothstep(.78, .94, meadowFbm(vWorldXZ * .061 + vec2(73.0, -46.0)));
          soil *= .28 + (1.0 - moss) * .34;
          albedo = mix(albedo, warmSoil, soil * .2);
          albedo += (grain - .5) * vec3(.035, .05, .012);

          // Fine upright strokes keep the ground itself grassy even between 3D blades.
          // They fade before they can turn into distant screen-space noise.
          vec2 tinyGrid = vWorldXZ * 2.15;
          vec2 tinyCell = fract(tinyGrid);
          vec2 tinyIndex = floor(tinyGrid);
          float tinySeed = meadowHash(tinyIndex);
          float tinyLean = mix(-.24, .24, meadowHash(tinyIndex + vec2(17.0, 9.0)));
          float tinyCenter = .16 + tinySeed * .68 + (tinyCell.y - .5) * tinyLean;
          float tinyBlade = 1.0 - smoothstep(.025, .082, abs(tinyCell.x - tinyCenter));
          tinyBlade *= smoothstep(.02, .16, tinyCell.y) * (1.0 - smoothstep(.62, .98, tinyCell.y));
          vec2 shortGrid = vWorldXZ * 3.55 + vec2(7.3, 19.1);
          vec2 shortCell = fract(shortGrid);
          float shortCenter = .14 + meadowHash(floor(shortGrid)) * .72;
          float shortBlade = 1.0 - smoothstep(.018, .065, abs(shortCell.x - shortCenter));
          shortBlade *= smoothstep(.02, .15, shortCell.y) * (1.0 - smoothstep(.42, .8, shortCell.y));
          float tinyBladeFade = 1.0 - smoothstep(82.0, 205.0, distanceToCamera);
          albedo += vec3(.095, .17, .032) * (tinyBlade * .26 + shortBlade * .13) * tinyBladeFade;
          albedo -= vec3(.025, .045, .012) * (1.0 - tinyBlade) * tinyBladeFade * .11;
          vec3 sunDirection = normalize(vec3(-.42, .83, .36));
          float sunlight = max(dot(normalize(vWorldNormal), sunDirection), 0.0);
          float soft = .58 + sunlight * .42;
          float slopeShade = mix(.68, 1.08, smoothstep(.7, 1.0, vWorldNormal.y));
          vec3 color = albedo * soft * slopeShade;
          color += vec3(.22, .24, .08) * pow(sunlight, 5.0) * .14;
          float fog = smoothstep(170.0, 390.0, distanceToCamera);
          color = mix(color, vec3(.79, .89, .93), fog);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: true,
      side: THREE.DoubleSide
    });
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.frustumCulled = false;
    this.skyMeadowRoot.add(terrain);
    this.skyMeadowTerrain = terrain;
    this.skyMeadowTerrainMaterial = terrainMaterial;
    this.skyMeadowMaterials.push(terrainMaterial);

    const grassBaseGeometry = new THREE.BufferGeometry();
    const bladePositions = [];
    const bladeUvs = [];
    const bladeTones = [];
    const bladeIndices = [];
    const addBlade = (angle, offsetX, offsetZ, height, width, bend, tone) => {
      const first = bladePositions.length / 3;
      const rightX = Math.cos(angle);
      const rightZ = -Math.sin(angle);
      const forwardX = Math.sin(angle);
      const forwardZ = Math.cos(angle);
      for (let level = 0; level <= 3; level += 1) {
        const t = level / 3;
        const halfWidth = width * (.98 - t * .88);
        const curve = bend * t * t;
        [-1, 1].forEach((side) => {
          bladePositions.push(
            offsetX + rightX * halfWidth * side + forwardX * curve,
            height * t,
            offsetZ + rightZ * halfWidth * side + forwardZ * curve
          );
          bladeUvs.push(side < 0 ? 0 : 1, t);
          bladeTones.push(tone);
        });
      }
      for (let level = 0; level < 3; level += 1) {
        const row = first + level * 2;
        bladeIndices.push(row, row + 2, row + 1, row + 2, row + 3, row + 1);
      }
    };
    addBlade(1.42, -.04, .04, .96, .086, .18, 1.02);
    addBlade(0, -.34, .04, .92, .082, .17, .92);
    addBlade(Math.PI * .5, .31, -.08, .84, .078, -.14, 1.08);
    addBlade(-.72, -.08, -.34, .76, .074, .12, .82);
    addBlade(.78, .12, .34, .7, .072, -.1, 1.14);
    addBlade(2.18, -.38, -.24, .64, .068, .08, .76);
    addBlade(-2.3, .39, .2, .72, .07, -.1, .88);
    addBlade(-1.46, .35, -.35, .58, .064, .07, .8);
    addBlade(2.82, -.3, .36, .66, .068, -.09, 1.12);
    grassBaseGeometry.setIndex(bladeIndices);
    grassBaseGeometry.setAttribute("position", new THREE.Float32BufferAttribute(bladePositions, 3));
    grassBaseGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(bladeUvs, 2));
    grassBaseGeometry.setAttribute("aBladeTone", new THREE.Float32BufferAttribute(bladeTones, 1));
    grassBaseGeometry.setDrawRange(0, bladeIndices.length);
    const mediumGrassBaseGeometry = grassBaseGeometry.clone();
    mediumGrassBaseGeometry.setDrawRange(0, 18 * 3);
    const farGrassBaseGeometry = grassBaseGeometry.clone();
    farGrassBaseGeometry.setDrawRange(0, 18);
    const ultraGrassBaseGeometry = grassBaseGeometry.clone();
    ultraGrassBaseGeometry.setDrawRange(0, 18);

    const grassMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute vec2 aOffset;
        attribute float aScale;
        attribute float aRotation;
        attribute float aPhase;
        attribute float aTint;
        attribute float aBladeTone;
        attribute float aLod;
        uniform float uTime;
        varying float vHeight;
        varying float vTint;
        varying float vBladeTone;
        varying float vFog;
        ${hillFunctionGlsl}
        void main() {
          vec4 center = modelMatrix * vec4(aOffset.x, 0.0, aOffset.y, 1.0);
          float rotation = aRotation;
          mat2 turn = mat2(cos(rotation), -sin(rotation), sin(rotation), cos(rotation));
          vec2 localXZ = turn * position.xz * aScale;
          vec3 world = vec3(
            center.x + localXZ.x,
            center.y + hillHeight(center.xz) + position.y * aScale,
            center.z + localXZ.y
          );
          float tip = uv.y * uv.y;
          float gust = sin(uTime * 1.42 + aPhase + center.x * .031 + center.z * .019);
          world.x += gust * tip * .13 * aScale;
          world.z += cos(uTime * .93 + aPhase * 1.7) * tip * .045 * aScale;
          vec4 viewPosition = viewMatrix * vec4(world, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          float distanceToCamera = distance(cameraPosition, world);
          vHeight = uv.y;
          vTint = aTint;
          vBladeTone = aBladeTone;
          vFog = smoothstep(175.0 + aLod * 18.0, 425.0, distanceToCamera);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uOpacity;
        varying float vHeight;
        varying float vTint;
        varying float vBladeTone;
        varying float vFog;
        void main() {
          vec3 root = vec3(.04, .17, .03);
          vec3 tip = vec3(.36, .65, .14);
          vec3 color = mix(root, tip, smoothstep(0.0, 1.0, vHeight));
          color *= vTint * vBladeTone;
          color += vec3(.10, .12, .025) * pow(vHeight, 4.0);
          color = mix(color, vec3(.79, .89, .93), vFog);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthTest: true,
      depthWrite: true,
      side: THREE.DoubleSide
    });

    const createGrassGeometry = (count, variant, baseGeometry, lod) => {
      const geometry = new THREE.InstancedBufferGeometry();
      geometry.setIndex(baseGeometry.index);
      Object.entries(baseGeometry.attributes).forEach(([name, attribute]) => {
        geometry.setAttribute(name, attribute);
      });
      geometry.setDrawRange(baseGeometry.drawRange.start, baseGeometry.drawRange.count);
      const offsets = new Float32Array(count * 2);
      const scales = new Float32Array(count);
      const rotations = new Float32Array(count);
      const phases = new Float32Array(count);
      const tints = new Float32Array(count);
      const lods = new Float32Array(count);
      let seed = 1709 + variant * 7919;
      const seeded = () => {
        seed = seed * 16807 % 2147483647;
        return (seed - 1) / 2147483646;
      };
      const grid = Math.ceil(Math.sqrt(count));
      const cell = this.skyMeadowTileSize / grid;
      const cells = Array.from({ length: grid * grid }, (_, index) => index);
      for (let index = cells.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(seeded() * (index + 1));
        const held = cells[index];
        cells[index] = cells[swapIndex];
        cells[swapIndex] = held;
      }
      for (let index = 0; index < count; index += 1) {
        const cellIndex = cells[index];
        const column = cellIndex % grid;
        const row = Math.floor(cellIndex / grid);
        offsets[index * 2] = -this.skyMeadowTileSize * .5 + (column + .15 + seeded() * .7) * cell;
        offsets[index * 2 + 1] = -this.skyMeadowTileSize * .5 + (row + .15 + seeded() * .7) * cell;
        scales[index] = .68 + seeded() * .65;
        rotations[index] = seeded() * Math.PI * 2;
        phases[index] = seeded() * Math.PI * 2;
        tints[index] = .78 + seeded() * .42;
        lods[index] = lod;
      }
      geometry.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 2));
      geometry.setAttribute("aScale", new THREE.InstancedBufferAttribute(scales, 1));
      geometry.setAttribute("aRotation", new THREE.InstancedBufferAttribute(rotations, 1));
      geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
      geometry.setAttribute("aTint", new THREE.InstancedBufferAttribute(tints, 1));
      geometry.setAttribute("aLod", new THREE.InstancedBufferAttribute(lods, 1));
      geometry.instanceCount = count;
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, 0), this.skyMeadowTileSize * 1.05);
      return geometry;
    };

    const flowerBaseGeometry = new THREE.BufferGeometry();
    const flowerPositions = [];
    const flowerParts = [];
    const flowerTones = [];
    const flowerIndices = [];
    const pushFlowerVertex = (x, y, z, part, tone) => {
      flowerPositions.push(x, y, z);
      flowerParts.push(part);
      flowerTones.push(tone);
    };
    const addFlowerQuad = (vertices, part, tone) => {
      const first = flowerPositions.length / 3;
      vertices.forEach((vertex) => pushFlowerVertex(vertex[0], vertex[1], vertex[2], part, tone));
      flowerIndices.push(first, first + 2, first + 1, first + 2, first + 3, first + 1);
    };
    const addFlowerPetal = (vertices, tone) => {
      const first = flowerPositions.length / 3;
      vertices.forEach((vertex) => pushFlowerVertex(vertex[0], vertex[1], vertex[2], 1, tone));
      for (let vertex = 1; vertex < vertices.length - 1; vertex += 1) {
        flowerIndices.push(first, first + vertex, first + vertex + 1);
      }
    };
    addFlowerQuad([[-.026, 0, 0], [.026, 0, 0], [-.02, .91, 0], [.02, .91, 0]], 0, .9);
    addFlowerQuad([[0, 0, -.026], [0, 0, .026], [0, .91, -.02], [0, .91, .02]], 0, 1.08);
    for (let petal = 0; petal < 8; petal += 1) {
      const angle = petal / 8 * Math.PI * 2;
      const forwardX = Math.cos(angle);
      const forwardZ = Math.sin(angle);
      const rightX = -forwardZ;
      const rightZ = forwardX;
      const point = (forward, right, y) => [
        forwardX * forward + rightX * right,
        y,
        forwardZ * forward + rightZ * right
      ];
      addFlowerPetal([
        point(.065, 0, .955),
        point(.17, .085, 1.005),
        point(.31, .105, .985),
        point(.43, 0, .92 + (petal % 2) * .018),
        point(.31, -.105, .985),
        point(.17, -.085, 1.005)
      ], .88 + petal % 3 * .07);
    }
    for (let segment = 0; segment < 10; segment += 1) {
      const angleA = segment / 10 * Math.PI * 2;
      const angleB = (segment + 1) / 10 * Math.PI * 2;
      const first = flowerPositions.length / 3;
      pushFlowerVertex(0, 1.02, 0, 2, 1);
      pushFlowerVertex(Math.cos(angleA) * .115, .94, Math.sin(angleA) * .115, 2, .9);
      pushFlowerVertex(Math.cos(angleB) * .115, .94, Math.sin(angleB) * .115, 2, 1.08);
      flowerIndices.push(first, first + 1, first + 2);
    }
    flowerBaseGeometry.setIndex(flowerIndices);
    flowerBaseGeometry.setAttribute("position", new THREE.Float32BufferAttribute(flowerPositions, 3));
    flowerBaseGeometry.setAttribute("aFlowerPart", new THREE.Float32BufferAttribute(flowerParts, 1));
    flowerBaseGeometry.setAttribute("aFlowerTone", new THREE.Float32BufferAttribute(flowerTones, 1));

    const flowerMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute vec2 aOffset;
        attribute float aScale;
        attribute float aRotation;
        attribute float aPhase;
        attribute vec3 aColor;
        attribute float aFlowerPart;
        attribute float aFlowerTone;
        uniform float uTime;
        varying vec3 vColor;
        varying float vPart;
        varying float vTone;
        varying float vFog;
        ${hillFunctionGlsl}
        void main() {
          vec4 center = modelMatrix * vec4(aOffset.x, 0.0, aOffset.y, 1.0);
          mat2 turn = mat2(cos(aRotation), -sin(aRotation), sin(aRotation), cos(aRotation));
          vec2 localXZ = turn * position.xz * aScale;
          vec3 world = vec3(
            center.x + localXZ.x,
            center.y + hillHeight(center.xz) + position.y * aScale,
            center.z + localXZ.y
          );
          float bend = position.y * position.y;
          world.x += sin(uTime * 1.08 + aPhase + center.x * .02) * bend * .055 * aScale;
          world.z += cos(uTime * .86 + aPhase) * bend * .025 * aScale;
          vec4 viewPosition = viewMatrix * vec4(world, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          float distanceToCamera = distance(cameraPosition, world);
          vColor = aColor;
          vPart = aFlowerPart;
          vTone = aFlowerTone;
          vFog = smoothstep(92.0, 145.0, distanceToCamera);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vPart;
        varying float vTone;
        varying float vFog;
        void main() {
          vec3 stem = vec3(.07, .31, .055);
          vec3 petals = vColor * vTone;
          vec3 center = vec3(1.0, .62, .055) * vTone;
          vec3 color = vPart < .5 ? stem : (vPart < 1.5 ? petals : center);
          color = mix(color, vec3(.79, .89, .93), vFog);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide
    });

    const createFlowerGeometry = (count, variant) => {
      const geometry = new THREE.InstancedBufferGeometry();
      geometry.setIndex(flowerBaseGeometry.index);
      Object.entries(flowerBaseGeometry.attributes).forEach(([name, attribute]) => {
        geometry.setAttribute(name, attribute);
      });
      const offsets = new Float32Array(count * 2);
      const scales = new Float32Array(count);
      const rotations = new Float32Array(count);
      const phases = new Float32Array(count);
      const colors = new Float32Array(count * 3);
      const palette = [0xfff4cf, 0xffd14b, 0xf58fbd, 0x7fb4ff, 0xa98be8, 0xff8d68, 0xe8f3ff];
      let seed = 9323 + variant * 3571;
      const seeded = () => {
        seed = seed * 16807 % 2147483647;
        return (seed - 1) / 2147483646;
      };
      for (let index = 0; index < count; index += 1) {
        offsets[index * 2] = (seeded() - .5) * this.skyMeadowTileSize;
        offsets[index * 2 + 1] = (seeded() - .5) * this.skyMeadowTileSize;
        scales[index] = .78 + seeded() * .72;
        rotations[index] = seeded() * Math.PI * 2;
        phases[index] = seeded() * Math.PI * 2;
        const color = new THREE.Color(palette[Math.floor(seeded() * palette.length)]);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }
      geometry.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 2));
      geometry.setAttribute("aScale", new THREE.InstancedBufferAttribute(scales, 1));
      geometry.setAttribute("aRotation", new THREE.InstancedBufferAttribute(rotations, 1));
      geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
      geometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(colors, 3));
      geometry.instanceCount = count;
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, 0), this.skyMeadowTileSize * 1.05);
      return geometry;
    };

    this.skyMeadowGrassMaterial = grassMaterial;
    this.skyMeadowFlowerMaterial = flowerMaterial;
    this.skyMeadowMaterials.push(grassMaterial, flowerMaterial);

    const nearGrassCount = this.isTouch ? 1200 : 2900;
    const mediumGrassCount = this.isTouch ? 1650 : 3800;
    const farGrassCount = this.isTouch ? 2300 : 5200;
    const ultraGrassCount = this.isTouch ? 1600 : 3600;
    const flowerCount = this.isTouch ? 56 : 140;
    this.skyMeadowGrassGeometrySets = [
      Array.from({ length: 3 }, (_, index) => createGrassGeometry(nearGrassCount, index, grassBaseGeometry, 0)),
      Array.from({ length: 3 }, (_, index) => createGrassGeometry(mediumGrassCount, index + 11, mediumGrassBaseGeometry, 1)),
      Array.from({ length: 3 }, (_, index) => createGrassGeometry(farGrassCount, index + 23, farGrassBaseGeometry, 2)),
      Array.from({ length: 3 }, (_, index) => createGrassGeometry(ultraGrassCount, index + 37, ultraGrassBaseGeometry, 3))
    ];
    const flowerGeometries = Array.from({ length: 3 }, (_, index) => createFlowerGeometry(flowerCount, index));
    this.skyMeadowTileRadius = 5;
    this.skyMeadowTiles = [];
    const meadowTileCount = (this.skyMeadowTileRadius * 2 + 1) ** 2;
    for (let tile = 0; tile < meadowTileCount; tile += 1) {
      const grass = new THREE.Mesh(this.skyMeadowGrassGeometrySets[3][tile % 3], grassMaterial);
      const flowers = new THREE.Mesh(flowerGeometries[(tile * 2) % flowerGeometries.length], flowerMaterial);
      flowers.visible = false;
      grass.renderOrder = 2;
      flowers.renderOrder = 3;
      this.skyMeadowRoot.add(grass, flowers);
      this.skyMeadowTiles.push({ grass, flowers, tileX: null, tileZ: null, lod: 3 });
    }

    const woodCanvas = document.createElement("canvas");
    woodCanvas.width = 512;
    woodCanvas.height = 1024;
    const woodContext = woodCanvas.getContext("2d");
    const woodGradient = woodContext.createLinearGradient(0, 0, 512, 0);
    woodGradient.addColorStop(0, "#4d2412");
    woodGradient.addColorStop(.22, "#8b512b");
    woodGradient.addColorStop(.55, "#a5683a");
    woodGradient.addColorStop(.82, "#74401f");
    woodGradient.addColorStop(1, "#3b1b0e");
    woodContext.fillStyle = woodGradient;
    woodContext.fillRect(0, 0, 512, 1024);
    const plankWidth = woodCanvas.width / 5;
    for (let plank = 0; plank < 5; plank += 1) {
      const x = plank * plankWidth;
      woodContext.fillStyle = "rgba(29,11,4,.34)";
      woodContext.fillRect(x, 0, 2, 1024);
      woodContext.fillStyle = "rgba(255,190,111,.08)";
      woodContext.fillRect(x + 2, 0, 1, 1024);
      for (let grain = 0; grain < 120; grain += 1) {
        const gx = x + random(4, plankWidth - 4);
        const gy = random(-30, 1050);
        const length = random(28, 170);
        woodContext.strokeStyle = Math.random() > .5
          ? "rgba(255,188,104," + random(.025, .12) + ")"
          : "rgba(24,7,2," + random(.04, .17) + ")";
        woodContext.lineWidth = random(.5, 2.1);
        woodContext.beginPath();
        woodContext.moveTo(gx, gy);
        woodContext.bezierCurveTo(
          gx + random(-6, 6),
          gy + length * .32,
          gx + random(-8, 8),
          gy + length * .72,
          gx + random(-4, 4),
          gy + length
        );
        woodContext.stroke();
      }
      for (let knot = 0; knot < 4; knot += 1) {
        const kx = x + random(18, plankWidth - 18);
        const ky = random(40, 980);
        for (let ring = 0; ring < 3; ring += 1) {
          woodContext.strokeStyle = `rgba(35,10,3,${.34 - ring * .075})`;
          woodContext.lineWidth = 1.4;
          woodContext.beginPath();
          woodContext.ellipse(kx, ky, 5 + ring * 5, 12 + ring * 7, random(-.16, .16), 0, Math.PI * 2);
          woodContext.stroke();
        }
      }
    }
    const doorTexture = new THREE.CanvasTexture(woodCanvas);
    doorTexture.colorSpace = THREE.SRGBColorSpace;
    doorTexture.minFilter = THREE.LinearMipmapLinearFilter;
    doorTexture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());

    const bumpCanvas = document.createElement("canvas");
    bumpCanvas.width = 512;
    bumpCanvas.height = 1024;
    const bumpContext = bumpCanvas.getContext("2d");
    bumpContext.filter = "grayscale(1) contrast(1.45)";
    bumpContext.drawImage(woodCanvas, 0, 0);
    bumpContext.filter = "none";
    const doorBump = new THREE.CanvasTexture(bumpCanvas);
    doorBump.colorSpace = THREE.NoColorSpace;
    doorBump.minFilter = THREE.LinearMipmapLinearFilter;

    this.skyDoorRoot = new THREE.Group();
    this.skyDoorRoot.visible = false;
    this.skyMeadowRoot.add(this.skyDoorRoot);
    const doorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xd1a47d,
      map: doorTexture,
      bumpMap: doorBump,
      bumpScale: .11,
      roughness: .58,
      clearcoat: .16,
      clearcoatRoughness: .72
    });
    const panelMaterial = doorMaterial.clone();
    panelMaterial.color = new THREE.Color(0xac7650);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x865838,
      map: doorTexture,
      bumpMap: doorBump,
      bumpScale: .08,
      roughness: .67
    });
    const brassMaterial = new THREE.MeshStandardMaterial({
      color: 0xd7ad4f,
      emissive: 0x3b2306,
      emissiveIntensity: .36,
      roughness: .2,
      metalness: .9
    });
    this.skyDoorMaterials.push(doorMaterial, panelMaterial, frameMaterial, brassMaterial);
    this.skyDoorMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0;
    });

    const doorShape = new THREE.Shape();
    doorShape.moveTo(-1.82, 0);
    doorShape.lineTo(-1.82, 5.48);
    doorShape.bezierCurveTo(-1.82, 6.52, -.98, 7.3, 0, 7.36);
    doorShape.bezierCurveTo(.98, 7.3, 1.82, 6.52, 1.82, 5.48);
    doorShape.lineTo(1.82, 0);
    doorShape.closePath();
    const slabGeometry = new THREE.ExtrudeGeometry(doorShape, {
      depth: .34,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: .075,
      bevelThickness: .06,
      curveSegments: 18
    });
    slabGeometry.translate(0, 0, -.17);
    const slabPositions = slabGeometry.getAttribute("position");
    const slabUvs = slabGeometry.getAttribute("uv");
    for (let index = 0; index < slabPositions.count; index += 1) {
      slabUvs.setXY(
        index,
        clamp((slabPositions.getX(index) + 1.9) / 3.8, 0, 1),
        clamp(slabPositions.getY(index) / 7.42, 0, 1)
      );
    }
    slabUvs.needsUpdate = true;
    const slab = new THREE.Mesh(slabGeometry, doorMaterial);
    this.skyDoorRoot.add(slab);

    [-2.1, 2.1].forEach((x) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(.48, 5.72, .68, 2, 12, 2), frameMaterial);
      post.position.set(x, 2.86, .02);
      this.skyDoorRoot.add(post);
    });
    const archPoints = [];
    for (let segment = 0; segment <= 24; segment += 1) {
      const angle = Math.PI - segment / 24 * Math.PI;
      archPoints.push(new THREE.Vector3(Math.cos(angle) * 2.1, 5.47 + Math.sin(angle) * 2.08, .02));
    }
    const archCurve = new THREE.CatmullRomCurve3(archPoints);
    const arch = new THREE.Mesh(new THREE.TubeGeometry(archCurve, 48, .25, 8, false), frameMaterial);
    this.skyDoorRoot.add(arch);
    const step = new THREE.Mesh(new THREE.BoxGeometry(4.92, .28, 1.55, 6, 2, 3), frameMaterial);
    step.position.set(0, .02, .12);
    this.skyDoorRoot.add(step);

    [-1, 1].forEach((faceSign) => {
      [[2.0, 1.85], [4.58, 1.72]].forEach(([y, height]) => {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(2.72, height, .075, 5, 5, 1), panelMaterial);
        panel.position.set(0, y, faceSign * .205);
        this.skyDoorRoot.add(panel);
        [-1, 1].forEach((xSign) => {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(.095, height + .18, .09), frameMaterial);
          rail.position.set(xSign * 1.42, y, faceSign * .26);
          this.skyDoorRoot.add(rail);
        });
        [-1, 1].forEach((ySign) => {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(2.94, .095, .09), frameMaterial);
          rail.position.set(0, y + ySign * (height * .5 + .045), faceSign * .26);
          this.skyDoorRoot.add(rail);
        });
      });

      const handlePlate = new THREE.Mesh(new THREE.CapsuleGeometry(.13, .5, 5, 12), brassMaterial);
      handlePlate.position.set(1.16, 3.22, faceSign * .27);
      handlePlate.scale.set(.72, 1, .25);
      this.skyDoorRoot.add(handlePlate);
      const hub = new THREE.Mesh(new THREE.SphereGeometry(.15, 18, 12), brassMaterial);
      hub.position.set(1.16, 3.35, faceSign * .38);
      this.skyDoorRoot.add(hub);
      const spindle = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .28, 12), brassMaterial);
      spindle.rotation.x = Math.PI / 2;
      spindle.position.set(1.16, 3.35, faceSign * .31);
      this.skyDoorRoot.add(spindle);
      const handle = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .42, 5, 12), brassMaterial);
      handle.rotation.z = Math.PI / 2;
      handle.position.set(1.4, 3.35, faceSign * .49);
      this.skyDoorRoot.add(handle);
      const keyhole = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .045, 12), brassMaterial);
      keyhole.rotation.x = Math.PI / 2;
      keyhole.position.set(1.16, 2.91, faceSign * .335);
      this.skyDoorRoot.add(keyhole);
    });
    this.skyDoorLight = new THREE.PointLight(0xffd98a, 0, 28, 1.8);
    this.skyDoorLight.position.set(0, 4.4, 1.2);
    this.skyDoorRoot.add(this.skyDoorLight);

    const mushroomTextureCanvas = document.createElement("canvas");
    mushroomTextureCanvas.width = mushroomTextureCanvas.height = 256;
    const mushroomTextureContext = mushroomTextureCanvas.getContext("2d");
    mushroomTextureContext.fillStyle = "#bd261c";
    mushroomTextureContext.fillRect(0, 0, 256, 256);
    mushroomTextureContext.fillStyle = "#fff6dc";
    [
      [34, 42, 13], [98, 27, 10], [172, 51, 15], [225, 30, 9],
      [63, 116, 17], [143, 104, 11], [215, 135, 16], [25, 190, 10],
      [112, 205, 15], [188, 218, 9]
    ].forEach(([x, y, radius]) => {
      mushroomTextureContext.beginPath();
      mushroomTextureContext.arc(x, y, radius, 0, Math.PI * 2);
      mushroomTextureContext.fill();
    });
    const mushroomTexture = new THREE.CanvasTexture(mushroomTextureCanvas);
    mushroomTexture.colorSpace = THREE.SRGBColorSpace;
    mushroomTexture.minFilter = THREE.LinearMipmapLinearFilter;
    mushroomTexture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());

    const mushroomLimit = 18;
    const mushroomStemMaterial = new THREE.MeshStandardMaterial({
      color: 0xf2e5c7,
      roughness: .82
    });
    const mushroomWhiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff4d8,
      roughness: .76
    });
    const mushroomRedMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: mushroomTexture,
      roughness: .7
    });
    const mushroomStemGeometry = new THREE.CylinderGeometry(.075, .115, .52, 8, 2);
    const mushroomCapGeometry = new THREE.SphereGeometry(.34, 12, 7, 0, Math.PI * 2, 0, Math.PI * .5);
    this.skyMushroomStems = new THREE.InstancedMesh(
      mushroomStemGeometry,
      mushroomStemMaterial,
      mushroomLimit
    );
    this.skyMushroomWhiteCaps = new THREE.InstancedMesh(
      mushroomCapGeometry,
      mushroomWhiteMaterial,
      mushroomLimit
    );
    this.skyMushroomRedCaps = new THREE.InstancedMesh(
      mushroomCapGeometry,
      mushroomRedMaterial,
      mushroomLimit
    );
    this.skyMushroomGroup = new THREE.Group();
    this.skyMushroomGroup.visible = false;
    [this.skyMushroomStems, this.skyMushroomWhiteCaps, this.skyMushroomRedCaps].forEach((mesh) => {
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.renderOrder = 4;
      this.skyMushroomGroup.add(mesh);
    });
    this.skyMeadowRoot.add(this.skyMushroomGroup);
    this.skyMushroomDummy = new THREE.Object3D();
    this.skyMushroomLimit = mushroomLimit;

    const makeWing = (side, lower) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.bezierCurveTo(
        side * (lower ? .18 : .26),
        lower ? -.1 : .13,
        side * (lower ? .48 : .74),
        lower ? -.42 : .62,
        side * (lower ? .72 : .92),
        lower ? -.2 : .3
      );
      shape.bezierCurveTo(
        side * (lower ? .55 : .72),
        lower ? -.02 : .03,
        side * .22,
        lower ? .05 : -.03,
          0,
          0
      );
      const geometry = new THREE.ShapeGeometry(shape, 16);
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox;
      const positions = geometry.getAttribute("position");
      const uvs = geometry.getAttribute("uv");
      const width = Math.max(.001, bounds.max.x - bounds.min.x);
      const height = Math.max(.001, bounds.max.y - bounds.min.y);
      for (let index = 0; index < positions.count; index += 1) {
        uvs.setXY(
          index,
          (positions.getX(index) - bounds.min.x) / width,
          (positions.getY(index) - bounds.min.y) / height
        );
      }
      uvs.needsUpdate = true;
      geometry.rotateX(Math.PI / 2);
      return geometry;
    };
    const upperRightGeometry = makeWing(1, false);
    const upperLeftGeometry = makeWing(-1, false);
    const lowerRightGeometry = makeWing(1, true);
    const lowerLeftGeometry = makeWing(-1, true);
    const wingTextureCanvas = document.createElement("canvas");
    wingTextureCanvas.width = wingTextureCanvas.height = 384;
    const wingTextureContext = wingTextureCanvas.getContext("2d");
    const wingGlow = wingTextureContext.createRadialGradient(48, 330, 8, 178, 182, 260);
    wingGlow.addColorStop(0, "#ffffff");
    wingGlow.addColorStop(.5, "#fffcef");
    wingGlow.addColorStop(1, "#fff4d7");
    wingTextureContext.fillStyle = wingGlow;
    wingTextureContext.fillRect(0, 0, 384, 384);
    wingTextureContext.strokeStyle = "rgba(39,24,28,.3)";
    wingTextureContext.lineWidth = 5;
    wingTextureContext.lineCap = "round";
    [[38, 334, 302, 58], [39, 335, 331, 146], [41, 333, 280, 280], [43, 331, 162, 36]].forEach((vein) => {
      wingTextureContext.beginPath();
      wingTextureContext.moveTo(vein[0], vein[1]);
      wingTextureContext.quadraticCurveTo(170, 205, vein[2], vein[3]);
      wingTextureContext.stroke();
    });
    wingTextureContext.fillStyle = "rgba(45,24,31,.26)";
    [[286, 80, 26], [316, 165, 18], [247, 252, 15]].forEach(([x, y, radius]) => {
      wingTextureContext.beginPath();
      wingTextureContext.arc(x, y, radius, 0, Math.PI * 2);
      wingTextureContext.fill();
      wingTextureContext.fillStyle = "rgba(255,244,214,.72)";
      wingTextureContext.beginPath();
      wingTextureContext.arc(x, y, radius * .48, 0, Math.PI * 2);
      wingTextureContext.fill();
      wingTextureContext.fillStyle = "rgba(45,24,31,.26)";
    });
    const wingTexture = new THREE.CanvasTexture(wingTextureCanvas);
    wingTexture.colorSpace = THREE.SRGBColorSpace;
    wingTexture.minFilter = THREE.LinearMipmapLinearFilter;
    wingTexture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());

    const butterflyCount = this.isTouch ? 12 : 20;
    const butterflyPalette = [0xffcf38, 0x4fb8ff, 0xf06bb4, 0xf8eee0, 0x8d72e8, 0xff714f, 0x58d6a7];
    const addWingColors = (geometry, lower) => {
      const colors = new Float32Array(butterflyCount * 3);
      for (let index = 0; index < butterflyCount; index += 1) {
        const paletteIndex = lower ? (index * 3 + 2) % butterflyPalette.length : index % butterflyPalette.length;
        const color = new THREE.Color(butterflyPalette[paletteIndex]);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }
      geometry.setAttribute("aWingColor", new THREE.InstancedBufferAttribute(colors, 3));
    };
    [upperRightGeometry, upperLeftGeometry].forEach((geometry) => addWingColors(geometry, false));
    [lowerRightGeometry, lowerLeftGeometry].forEach((geometry) => addWingColors(geometry, true));
    const wingMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uWingMap: { value: wingTexture }
      },
      vertexShader: `
        attribute vec3 aWingColor;
        varying vec2 vWingUv;
        varying vec3 vWingColor;
        void main() {
          vWingUv = uv;
          vWingColor = aWingColor;
          vec4 localPosition = instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * localPosition;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform sampler2D uWingMap;
        varying vec2 vWingUv;
        varying vec3 vWingColor;
        void main() {
          vec3 pattern = texture2D(uWingMap, vWingUv).rgb;
          float detail = dot(pattern, vec3(.299, .587, .114));
          vec3 color = vWingColor * (.46 + detail * .72);
          color += pattern * .055;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
      depthWrite: true,
      depthTest: true
    });
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x241713,
      roughness: .76
    });
    this.skyButterflyMeshes = [
      new THREE.InstancedMesh(upperRightGeometry, wingMaterial, butterflyCount),
      new THREE.InstancedMesh(upperLeftGeometry, wingMaterial, butterflyCount),
      new THREE.InstancedMesh(lowerRightGeometry, wingMaterial, butterflyCount),
      new THREE.InstancedMesh(lowerLeftGeometry, wingMaterial, butterflyCount)
    ];
    const bodyGeometry = new THREE.CylinderGeometry(.035, .055, .48, 8);
    bodyGeometry.rotateX(Math.PI / 2);
    this.skyButterflyBody = new THREE.InstancedMesh(bodyGeometry, bodyMaterial, butterflyCount);
    this.skyButterflyHead = new THREE.InstancedMesh(
      new THREE.SphereGeometry(.08, 10, 7),
      bodyMaterial,
      butterflyCount
    );
    this.skyButterflyGroup = new THREE.Group();
    this.skyButterflyGroup.visible = false;
    this.skyButterflyMeshes.forEach((mesh) => {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.skyButterflyGroup.add(mesh);
    });
    this.skyButterflyBody.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.skyButterflyBody.frustumCulled = false;
    this.skyButterflyHead.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.skyButterflyHead.frustumCulled = false;
    this.skyButterflyAntennae = [-1, 1].map(() => {
      const antennaGeometry = new THREE.CylinderGeometry(.007, .012, .34, 5);
      antennaGeometry.rotateX(-Math.PI / 2);
      antennaGeometry.translate(0, 0, -.17);
      const antenna = new THREE.InstancedMesh(
        antennaGeometry,
        bodyMaterial,
        butterflyCount
      );
      antenna.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      antenna.frustumCulled = false;
      this.skyButterflyGroup.add(antenna);
      return antenna;
    });
    this.skyButterflyGroup.add(this.skyButterflyBody);
    this.skyButterflyGroup.add(this.skyButterflyHead);
    this.skyMeadowRoot.add(this.skyButterflyGroup);
    this.skyButterflies = Array.from({ length: butterflyCount }, (_, index) => ({
      phase: index * 2.399 + Math.random() * .7,
      radius: 3.5 + Math.random() * 9.5,
      height: 1.4 + Math.random() * 6.8,
      speed: .18 + Math.random() * .32,
      scale: .38 + Math.random() * .19
    }));
    this.skyButterflyMaterials = [wingMaterial, bodyMaterial];
    this.skyButterflyDummy = new THREE.Object3D();
    this.skyButterflyEuler = new THREE.Euler(0, 0, 0, "YXZ");
    this.skyButterflyOrientation = new THREE.Quaternion();
    this.skyButterflyAdjustment = new THREE.Quaternion();
    this.skyButterflyOffset = new THREE.Vector3();
    this.skyButterflyLocalAxis = new THREE.Vector3(0, 0, 1);

    this.skyMeadowRoot.traverse((object) => {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.filter(Boolean).forEach((material) => {
        material.stencilWrite = true;
        material.stencilRef = 1;
        material.stencilFunc = THREE.AlwaysStencilFunc;
        material.stencilFail = THREE.KeepStencilOp;
        material.stencilZFail = THREE.KeepStencilOp;
        material.stencilZPass = THREE.ReplaceStencilOp;
      });
    });
    this.skyDoorRoot.traverse((object) => {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.filter(Boolean).forEach((material) => {
        material.stencilRef = 2;
      });
    });
  }

  startSkyMeadowTransition() {
    if (this.skyMeadowStarted || !this.skyMeadowRoot) return;
    this.skyMeadowStarted = true;
    this.skyMeadowGrounded = false;
    this.skyMeadowProgress = 0;
    this.skyMeadowGroundWalkTime = 0;
    this.skyDoorSpawned = false;
    this.skyDoorReveal = 0;
    this.skyMeadowRoot.visible = true;
    if (this.skyDoorRoot) this.skyDoorRoot.visible = false;
    if (this.skyButterflyGroup) this.skyButterflyGroup.visible = false;
    if (this.skyMushroomGroup) this.skyMushroomGroup.visible = false;
    this.skyMeadowCameraY = this.skyBaseY;
    this.skyMeadowBaseY = this.skyBaseY
      - this.freeEyeHeight
      - this.skyMeadowHeightWorld(this.freeCameraPosition.x, this.freeCameraPosition.z);
    this.skyMeadowTileCenterX = Number.NaN;
    this.skyMeadowTileCenterZ = Number.NaN;
  }

  updateSkyMeadowTiles() {
    if (!this.skyMeadowTiles?.length) return;
    const tileSize = this.skyMeadowTileSize;
    const centerX = Math.round(this.freeCameraPosition.x / tileSize);
    const centerZ = Math.round(this.freeCameraPosition.z / tileSize);
    if (centerX === this.skyMeadowTileCenterX && centerZ === this.skyMeadowTileCenterZ) return;
    this.skyMeadowTileCenterX = centerX;
    this.skyMeadowTileCenterZ = centerZ;
    const desired = [];
    const desiredKeys = new Set();
    const radius = this.skyMeadowTileRadius ?? 3;
    for (let offsetZ = -radius; offsetZ <= radius; offsetZ += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        const tileX = centerX + offsetX;
        const tileZ = centerZ + offsetZ;
        const key = tileX + ":" + tileZ;
        const radial = Math.hypot(offsetX, offsetZ);
        const lod = radial <= 1.65 ? 0 : radial <= 3.2 ? 1 : radial <= 4.5 ? 2 : 3;
        desired.push({ tileX, tileZ, key, lod });
        desiredKeys.add(key);
      }
    }
    const existing = new Map();
    const free = [];
    this.skyMeadowTiles.forEach((record) => {
      const key = record.tileX === null ? "" : record.tileX + ":" + record.tileZ;
      if (desiredKeys.has(key)) existing.set(key, record);
      else free.push(record);
    });
    desired.forEach((target) => {
      const record = existing.get(target.key) || free.shift();
      if (!record) return;
      const variant = Math.abs((target.tileX * 73856093) ^ (target.tileZ * 19349663)) % 3;
      if (record.tileX !== target.tileX || record.tileZ !== target.tileZ) {
        record.tileX = target.tileX;
        record.tileZ = target.tileZ;
        record.grass.position.set(target.tileX * tileSize, 0, target.tileZ * tileSize);
        record.flowers.position.set(target.tileX * tileSize, 0, target.tileZ * tileSize);
      }
      if (record.lod !== target.lod || record.grass.geometry !== this.skyMeadowGrassGeometrySets[target.lod][variant]) {
        record.lod = target.lod;
        record.grass.geometry = this.skyMeadowGrassGeometrySets[target.lod][variant];
      }
      record.flowers.visible = target.lod === 0;
    });
  }

  placeSkyMushroomTrail(startX, startZ, doorX, doorZ) {
    if (!this.skyMushroomGroup) return;
    const deltaX = doorX - startX;
    const deltaZ = doorZ - startZ;
    const distance = Math.hypot(deltaX, deltaZ);
    if (distance < 1) return;
    const directionX = deltaX / distance;
    const directionZ = deltaZ / distance;
    const perpendicularX = -directionZ;
    const perpendicularZ = directionX;
    const count = clamp(Math.floor(distance / 23), 6, this.skyMushroomLimit);
    const dummy = this.skyMushroomDummy;
    let whiteCount = 0;
    let redCount = 0;

    for (let index = 0; index < count; index += 1) {
      const fraction = (index + 1) / (count + 1);
      const wander = Math.sin(index * 2.37 + 1.1) * (5.2 + (index % 3) * 1.25);
      const longitudinalJitter = Math.sin(index * 4.91) * 2.2;
      const x = startX + directionX * (distance * fraction + longitudinalJitter) + perpendicularX * wander;
      const z = startZ + directionZ * (distance * fraction + longitudinalJitter) + perpendicularZ * wander;
      const groundY = this.skyMeadowHeightWorld(x, z);
      const scale = .78 + ((index * 37) % 9) * .055;
      const rotation = (index * 2.17) % (Math.PI * 2);

      dummy.position.set(x, groundY + .26 * scale, z);
      dummy.rotation.set(0, rotation, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      this.skyMushroomStems.setMatrixAt(index, dummy.matrix);

      dummy.position.set(x, groundY + .5 * scale, z);
      dummy.rotation.set(0, rotation, 0);
      dummy.scale.set(scale * 1.04, scale * .62, scale * 1.04);
      dummy.updateMatrix();
      if (index % 3 === 1) {
        this.skyMushroomRedCaps.setMatrixAt(redCount, dummy.matrix);
        redCount += 1;
      } else {
        this.skyMushroomWhiteCaps.setMatrixAt(whiteCount, dummy.matrix);
        whiteCount += 1;
      }
    }

    this.skyMushroomStems.count = count;
    this.skyMushroomWhiteCaps.count = whiteCount;
    this.skyMushroomRedCaps.count = redCount;
    this.skyMushroomStems.instanceMatrix.needsUpdate = true;
    this.skyMushroomWhiteCaps.instanceMatrix.needsUpdate = true;
    this.skyMushroomRedCaps.instanceMatrix.needsUpdate = true;
    this.skyMushroomGroup.visible = true;
  }

  spawnSkyDoor() {
    if (this.skyDoorSpawned || !this.skyDoorRoot) return;
    this.skyDoorSpawned = true;
    this.skyDoorReveal = 0;
    const direction = new THREE.Vector3(-Math.sin(this.freeYaw), 0, -Math.cos(this.freeYaw)).normalize();
    this.skyMeadowDirection.copy(direction);
    const trailStartX = this.freeCameraPosition.x;
    const trailStartZ = this.freeCameraPosition.z;
    let crestDistance = 150;
    let crestHeight = Number.NEGATIVE_INFINITY;
    for (let distance = 120; distance <= 240; distance += 4) {
      const x = this.freeCameraPosition.x + direction.x * distance;
      const z = this.freeCameraPosition.z + direction.z * distance;
      const height = this.skyMeadowHeightWorld(x, z);
      if (height > crestHeight) {
        crestHeight = height;
        crestDistance = distance;
      }
    }
    let doorDistance = crestDistance + 42;
    let shelteredHeight = Number.POSITIVE_INFINITY;
    for (let distance = crestDistance + 28; distance <= crestDistance + 70; distance += 3) {
      const x = this.freeCameraPosition.x + direction.x * distance;
      const z = this.freeCameraPosition.z + direction.z * distance;
      const height = this.skyMeadowHeightWorld(x, z);
      if (height < shelteredHeight) {
        shelteredHeight = height;
        doorDistance = distance;
      }
    }
    doorDistance = clamp(doorDistance, 175, 300);
    const doorX = this.freeCameraPosition.x + direction.x * doorDistance;
    const doorZ = this.freeCameraPosition.z + direction.z * doorDistance;
    this.skyDoorRoot.position.set(
      doorX,
      this.skyMeadowHeightWorld(doorX, doorZ),
      doorZ
    );
    this.skyDoorRoot.rotation.y = Math.atan2(direction.x, direction.z);
    this.skyDoorRoot.visible = true;
    this.skyButterflyGroup.visible = true;
    this.placeSkyMushroomTrail(trailStartX, trailStartZ, doorX, doorZ);
  }

  updateSkyButterflies() {
    if (!this.skyDoorSpawned || !this.skyButterflyGroup) return;
    const dummy = this.skyButterflyDummy;
    const door = this.skyDoorRoot.position;
    this.skyButterflies.forEach((record, index) => {
      const angle = this.elapsed * record.speed + record.phase;
      const x = door.x + Math.cos(angle) * record.radius;
      const z = door.z + Math.sin(angle) * record.radius * .64;
      const terrainY = this.skyMeadowHeightWorld(x, z);
      const y = Math.max(
        terrainY + .7,
        door.y + record.height + Math.sin(angle * 2.3 + record.phase) * .65
      );
      const velocityX = -Math.sin(angle) * record.radius;
      const velocityZ = Math.cos(angle) * record.radius * .64;
      const yaw = Math.atan2(-velocityX, -velocityZ);
      const pitch = Math.sin(angle * 1.7 + record.phase) * .09;
      const bank = Math.sin(angle + record.phase) * .2;
      const flap = .5 + (.5 + .5 * Math.sin(this.elapsed * (11.5 + index % 5) + record.phase)) * .58;
      const scale = record.scale * (.92 + Math.sin(angle * 1.7) * .08);
      const orientation = this.skyButterflyOrientation;
      orientation.setFromEuler(this.skyButterflyEuler.set(pitch, yaw, bank, "YXZ"));
      const setWing = (mesh, flapAmount) => {
        dummy.position.set(x, y, z);
        dummy.quaternion.copy(orientation).multiply(
          this.skyButterflyAdjustment.setFromAxisAngle(this.skyButterflyLocalAxis, flapAmount)
        );
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      };
      setWing(this.skyButterflyMeshes[0], flap);
      setWing(this.skyButterflyMeshes[1], -flap);
      setWing(this.skyButterflyMeshes[2], flap * .78);
      setWing(this.skyButterflyMeshes[3], -flap * .78);
      dummy.position.set(x, y, z);
      dummy.quaternion.copy(orientation);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      this.skyButterflyBody.setMatrixAt(index, dummy.matrix);

      this.skyButterflyOffset.set(0, .015, -.3).applyQuaternion(orientation).multiplyScalar(scale);
      dummy.position.set(x, y, z).add(this.skyButterflyOffset);
      dummy.quaternion.copy(orientation);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      this.skyButterflyHead.setMatrixAt(index, dummy.matrix);

      this.skyButterflyAntennae.forEach((antenna, antennaIndex) => {
        const side = antennaIndex ? 1 : -1;
        this.skyButterflyOffset.set(side * .045, .04, -.31).applyQuaternion(orientation).multiplyScalar(scale);
        dummy.position.set(x, y, z).add(this.skyButterflyOffset);
        this.skyButterflyAdjustment.setFromEuler(
          this.skyButterflyEuler.set(-.24, side * .28, 0, "YXZ")
        );
        dummy.quaternion.copy(orientation).multiply(this.skyButterflyAdjustment);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        antenna.setMatrixAt(index, dummy.matrix);
      });
    });
    this.skyButterflyMeshes.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
    });
    this.skyButterflyBody.instanceMatrix.needsUpdate = true;
    this.skyButterflyHead.instanceMatrix.needsUpdate = true;
    this.skyButterflyAntennae.forEach((antenna) => {
      antenna.instanceMatrix.needsUpdate = true;
    });
  }

  updateSkyMeadow(delta, movingOnSky) {
    if (!this.skyMeadowStarted || !this.skyMeadowRoot) return this.skyBaseY;
    this.skyMeadowProgress = clamp(
      this.skyMeadowProgress + delta / this.skyMeadowRiseDuration,
      0,
      1
    );
    const rawProgress = this.skyMeadowProgress;
    const progress = clamp(rawProgress - .12 * rawProgress * (1 - rawProgress), 0, 1);
    const contactBaseY = this.skyBaseY
      - this.freeEyeHeight
      - this.skyMeadowHeightWorld(this.freeCameraPosition.x, this.freeCameraPosition.z);

    if (rawProgress >= .55 && !this.skyDoorSpawned) this.spawnSkyDoor();

    if (!this.skyMeadowGrounded) {
      this.skyMeadowBaseY = damp(this.skyMeadowBaseY, contactBaseY, .62, delta);
      this.skyMeadowRoot.position.y = this.skyMeadowBaseY
        - this.skyMeadowContactDepth * (1 - progress);
      this.skyMeadowCameraY = this.skyBaseY;
      if (progress >= 1) {
        this.skyMeadowGrounded = true;
        this.skyMeadowBaseY = contactBaseY;
        this.skyMeadowRoot.position.y = this.skyMeadowBaseY;
      }
    } else {
      this.skyMeadowRoot.position.y = this.skyMeadowBaseY;
      if (movingOnSky) this.skyMeadowGroundWalkTime += delta;
      if (this.skyMeadowGroundWalkTime >= this.skyDoorDelay) this.spawnSkyDoor();
      const groundEye = this.skyMeadowBaseY
        + this.skyMeadowHeightWorld(this.freeCameraPosition.x, this.freeCameraPosition.z)
        + this.freeEyeHeight;
      this.skyMeadowCameraY = damp(this.skyMeadowCameraY, groundEye, 6.4, delta);
    }

    this.skyMeadowTerrain.position.x = Math.round(this.freeCameraPosition.x / 12) * 12;
    this.skyMeadowTerrain.position.z = Math.round(this.freeCameraPosition.z / 12) * 12;
    this.updateSkyMeadowTiles();

    const terrainOpacity = clamp(progress / .12, 0, 1);
    const plantOpacity = clamp((progress - .035) / .18, 0, 1);
    this.skyMeadowTerrainMaterial.uniforms.uOpacity.value = terrainOpacity;
    this.skyMeadowTerrainMaterial.uniforms.uTime.value = this.elapsed;
    this.skyMeadowGrassMaterial.uniforms.uOpacity.value = plantOpacity;
    this.skyMeadowGrassMaterial.uniforms.uTime.value = this.elapsed;
    this.skyMeadowFlowerMaterial.uniforms.uOpacity.value = plantOpacity;
    this.skyMeadowFlowerMaterial.uniforms.uTime.value = this.elapsed;

    if (this.skyDoorSpawned) {
      this.skyDoorReveal = clamp(this.skyDoorReveal + delta / 4.2, 0, 1);
      const reveal = this.skyDoorReveal * this.skyDoorReveal * (3 - 2 * this.skyDoorReveal);
      this.skyDoorMaterials.forEach((material) => {
        material.opacity = reveal;
      });
      if (this.skyDoorLight) {
        this.skyDoorLight.intensity = reveal * (2.8 + Math.sin(this.elapsed * 1.7) * .35);
      }
      this.updateSkyButterflies();
    }
    return this.skyMeadowCameraY;
  }

  updateCloudWorld(delta) {
    if (!this.skyCloudMaterial) return;
    this.skyCloudTime += delta;
    const uniforms = this.skyCloudMaterial.uniforms;
    uniforms.uTime.value = this.skyCloudTime;
    uniforms.uAspect.value = this.camera.aspect;
    uniforms.uTanHalfFov.value = Math.tan(THREE.MathUtils.degToRad(this.camera.fov * .5));
    uniforms.uCameraPos.value.copy(this.camera.position);

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    uniforms.uForward.value.copy(forward);
    uniforms.uRight.value.copy(right);
    uniforms.uUp.value.copy(up);
    uniforms.uMeadowBaseY.value = this.skyMeadowRoot?.position.y ?? this.skyBaseY;
    if (this.skyCloudOverlayMaterial) {
      const overlayUniforms = this.skyCloudOverlayMaterial.uniforms;
      overlayUniforms.uTime.value = uniforms.uTime.value;
      overlayUniforms.uAspect.value = uniforms.uAspect.value;
      overlayUniforms.uTanHalfFov.value = uniforms.uTanHalfFov.value;
      overlayUniforms.uCameraPos.value.copy(uniforms.uCameraPos.value);
      overlayUniforms.uSpawnPos.value.copy(uniforms.uSpawnPos.value);
      overlayUniforms.uForward.value.copy(forward);
      overlayUniforms.uRight.value.copy(right);
      overlayUniforms.uUp.value.copy(up);
      overlayUniforms.uMeadowBaseY.value = uniforms.uMeadowBaseY.value;
    }

    if (this.skyMode) {
      const transitionEnd = this.skyWhiteHold + this.skyTransitionDuration;
      this.skyTransition = Math.min(transitionEnd, this.skyTransition + delta);
      const adaptationProgress = clamp(
        (this.skyTransition - this.skyWhiteHold) / this.skyTransitionDuration,
        0,
        1
      );
      const reveal = adaptationProgress * adaptationProgress * (3 - 2 * adaptationProgress);
      if (this.transitionBlackout) {
        this.transitionBlackout.style.background = "#fff";
        this.transitionBlackout.style.opacity = (1 - reveal).toFixed(3);
      }
    }
  }

  enterCloudWorld() {
    if (this.skyMode) return;
    this.skyMode = true;
    this.skyTransition = 0;
    this.skyWalkTime = 0;
    this.skyMeadowStarted = false;
    this.skyMeadowGrounded = false;
    this.skyMeadowProgress = 0;
    this.skyMeadowGroundWalkTime = 0;
    this.skyDoorSpawned = false;
    this.skyDoorReveal = 0;
    this.skyMeadowTileCenterX = Number.NaN;
    this.skyMeadowTileCenterZ = Number.NaN;
    if (this.skyMeadowRoot) this.skyMeadowRoot.visible = false;
    if (this.skyDoorRoot) this.skyDoorRoot.visible = false;
    if (this.skyButterflyGroup) this.skyButterflyGroup.visible = false;
    if (this.skyMushroomGroup) this.skyMushroomGroup.visible = false;
    if (this.skyMeadowTerrainMaterial) this.skyMeadowTerrainMaterial.uniforms.uOpacity.value = 0;
    if (this.skyMeadowGrassMaterial) this.skyMeadowGrassMaterial.uniforms.uOpacity.value = 0;
    if (this.skyMeadowFlowerMaterial) this.skyMeadowFlowerMaterial.uniforms.uOpacity.value = 0;
    this.skyDoorMaterials?.forEach((material) => {
      material.opacity = 0;
    });
    this.scene.visible = false;
    this.renderer.shadowMap.enabled = false;
    this.glitch = 0;
    this.nextGlitch = Number.POSITIVE_INFINITY;
    this.postMaterial.uniforms.glitch.value = 0;
    document.documentElement.style.setProperty("--glitch-opacity", "0");
    document.documentElement.style.setProperty("--glitch-x", "0px");
    document.body.classList.add("is-sky-mode");
    const roomScreenEffects = document.querySelector(".screen-effects");
    if (roomScreenEffects) roomScreenEffects.style.display = "";
    if (this.transitionBlackout) {
      this.transitionBlackout.style.background = "#fff";
      this.transitionBlackout.style.opacity = "1";
    }
    this.doorPrompt?.classList.remove("is-visible");

    // The scene swap happens behind a fully white frame. Camera coordinates,
    // orientation, held controls and velocity remain untouched.
    this.skyBaseY = this.camera.position.y;
    this.skyMeadowCameraY = this.skyBaseY;
    this.skySpawnPosition.copy(this.camera.position);
    this.skyCloudMaterial.uniforms.uSpawnPos.value.copy(this.skySpawnPosition);
    this.camera.near = .1;
    this.camera.far = 420;
    this.camera.updateProjectionMatrix();
    this.resize();
    if (!this.skyMeadowCompiled && this.skyMeadowRoot) {
      this.skyMeadowRoot.visible = true;
      if (this.skyDoorRoot) this.skyDoorRoot.visible = true;
      if (this.skyButterflyGroup) this.skyButterflyGroup.visible = true;
      if (this.skyMushroomGroup) this.skyMushroomGroup.visible = true;
      this.renderer.compile(this.skyMeadowScene, this.camera);
      if (this.skyDoorRoot) this.skyDoorRoot.visible = false;
      if (this.skyButterflyGroup) this.skyButterflyGroup.visible = false;
      if (this.skyMushroomGroup) this.skyMushroomGroup.visible = false;
      this.skyMeadowRoot.visible = false;
      this.skyMeadowCompiled = true;
    }
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

    const previousX = this.freeCameraPosition.x;
    const previousZ = this.freeCameraPosition.z;
    this.freeCameraPosition.x += this.freeCameraVelocity.x * delta;
    this.freeCameraPosition.z += this.freeCameraVelocity.z * delta;
    const actualMovement = Math.hypot(
      this.freeCameraPosition.x - previousX,
      this.freeCameraPosition.z - previousZ
    );
    const movingOnSky = inputStrength > .04 && actualMovement > .001;
    const skyAdapted = this.skyTransition >= this.skyWhiteHold + this.skyTransitionDuration * .92;
    if (skyAdapted && movingOnSky && !this.skyMeadowStarted) {
      this.skyWalkTime += delta;
    }
    if (!this.skyMeadowStarted && this.skyWalkTime >= this.skyMeadowStartDelay) {
      this.startSkyMeadowTransition();
    }

    const movementRatio = clamp(Math.hypot(this.freeCameraVelocity.x, this.freeCameraVelocity.z) / speed, 0, 1);
    this.walkAmount = damp(this.walkAmount, movementRatio, movementRatio > this.walkAmount ? 8 : 5.5, delta);
    if (actualMovement > .002) this.walkPhase += delta * (running ? 12.4 : 8.9);

    const meadowEyeY = this.updateSkyMeadow(delta, movingOnSky);
    const groundBlend = this.skyMeadowGrounded ? 1 : 0;
    const bobY = Math.sin(this.walkPhase * 2) * .05 * this.walkAmount * groundBlend;
    const sway = Math.sin(this.walkPhase) * .022 * this.walkAmount * groundBlend;
    this.camera.position.set(
      this.freeCameraPosition.x + right.x * sway,
      meadowEyeY + bobY + Math.sin(this.skyCloudTime * .29) * .025 * (1 - groundBlend),
      this.freeCameraPosition.z + right.z * sway
    );
    this.freeCameraPosition.y = meadowEyeY;
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(
      this.freePitch,
      this.freeYaw,
      Math.sin(this.walkPhase) * .005 * this.walkAmount * groundBlend
    );
  }

  registerLiminalDistortion(mesh, kind) {
    const position = mesh.geometry.attributes.position;
    this.liminalDistortionMeshes.push({
      mesh,
      kind,
      base: new Float32Array(position.array),
      phase: this.liminalSeed * .013 + this.liminalDistortionMeshes.length * 2.73
    });
  }

  openLiminalDoor() {
    if (!this.liminalPromptActive || this.liminalEntered || this.liminalDoorTarget > .5) return;
    this.liminalDoorTarget = 1;
    this.ensureAudio();
    this.playCurtainSound();
    this.glitch = Math.max(this.glitch, .32);
    if (this.doorPrompt) {
      const label = this.doorPrompt.querySelector("span");
      if (label) label.textContent = "РАЗДВИГАЕТСЯ";
    }
  }

  updateDoorPrompt() {
    if (!this.doorPrompt || !this.liminalCurtainGate) return;
    const point = new THREE.Vector3(0, 3.15, this.liminalDoorZ - .2);
    const distance = this.camera.position.distanceTo(point);
    const active = this.freeCameraEnabled
      && !this.liminalEntered
      && this.liminalDoorTarget < .5
      && distance < 5.3
      && this.camera.position.z < this.liminalDoorZ + .5;
    this.liminalPromptActive = active;
    this.doorPrompt.classList.toggle("is-visible", active);
    this.doorPrompt.setAttribute("aria-hidden", active ? "false" : "true");
    if (!active) return;

    const projected = point.clone().project(this.camera);
    const x = (projected.x * .5 + .5) * window.innerWidth;
    const y = (-projected.y * .5 + .5) * window.innerHeight;
    this.doorPrompt.style.left = `${x.toFixed(1)}px`;
    this.doorPrompt.style.top = `${y.toFixed(1)}px`;
  }

  updateLiminalWorld(delta) {
    if (!this.liminalLevel) return;

    this.liminalDoorOpenAmount = damp(
      this.liminalDoorOpenAmount,
      this.liminalDoorTarget,
      this.liminalDoorTarget > this.liminalDoorOpenAmount ? 2.35 : 4,
      delta
    );
    const doorEase = this.liminalDoorOpenAmount * this.liminalDoorOpenAmount * (3 - 2 * this.liminalDoorOpenAmount);
    if (this.liminalCurtainLeft && this.liminalCurtainRight) {
      const gather = 1 - doorEase * .55;
      const breathe = Math.sin(this.elapsed * 3.1) * .018 * doorEase;
      // Gather the full-width leaves against the corridor edges. At full open
      // they visually become the side bunches instead of exposing empty holes.
      this.liminalCurtainLeft.position.x = lerp(this.liminalCurtainLeftBaseX, -2.43, doorEase);
      this.liminalCurtainRight.position.x = lerp(this.liminalCurtainRightBaseX, 2.43, doorEase);
      this.liminalCurtainLeft.position.z = Math.sin(doorEase * Math.PI) * .09 + breathe;
      this.liminalCurtainRight.position.z = Math.sin(doorEase * Math.PI) * .075 - breathe;
      this.liminalCurtainLeft.scale.x = gather;
      this.liminalCurtainRight.scale.x = gather;
      this.liminalCurtainLeft.rotation.z = -.028 * doorEase;
      this.liminalCurtainRight.rotation.z = .028 * doorEase;
    }
    this.updateDoorPrompt();

    if (!this.liminalEntered
      && this.liminalDoorOpenAmount > .72
      && this.freeCameraPosition.z > this.liminalDoorZ + 1.02) {
      this.liminalEntered = true;
      this.liminalDoorTarget = 0;
      this.liminalPromptActive = false;
      this.doorPrompt?.classList.remove("is-visible");
      const label = this.doorPrompt?.querySelector("span");
      if (label) label.textContent = "РАЗДВИНУТЬ";
      this.glitch = Math.max(this.glitch, .46);
    }

    if (!this.liminalEntered) return;

    const x = this.freeCameraPosition.x;
    const leftDepth = clamp((-x - 16) / 128, 0, 1);
    const leftEase = leftDepth * leftDepth * (3 - 2 * leftDepth);
    const velocityX = this.freeCameraVelocity.x;
    const velocityZ = this.freeCameraVelocity.z;
    const time = this.elapsed;
    const seed = this.liminalSeed;
    const stairApproach = clamp((this.liminalStairStartX + 8.0 - x) / 8.0, 0, 1);
    const distortionEase = leftEase * (1 - stairApproach);
    this.audioCorridorDistortion = distortionEase;

    if (x < -12) {
      const modeA = Math.sin(seed * .017) > 0 ? 1 : -1;
      const modeB = Math.sin(seed * .041 + 2) > 0 ? 1 : -1;
      if (this.liminalLeftFloorMaterial?.map) {
        const map = this.liminalLeftFloorMaterial.map;
        const autonomous = Math.sin(seed * .003) * .19;
        map.offset.x += delta * (
          velocityX * .018 * modeA * distortionEase
          + autonomous * distortionEase
          + Math.sin(time * .7 + seed) * .012 * distortionEase
        );
        map.offset.y += delta * (
          velocityZ * .02 * modeB * distortionEase
          + Math.cos(time * .46 + seed * .3) * .018 * distortionEase
        );
      }

      this.liminalDistortionMeshes.forEach((record, meshIndex) => {
        const attribute = record.mesh.geometry.attributes.position;
        const array = attribute.array;
        const base = record.base;
        const isFloor = record.kind === "floor";
        for (let i = 0; i < attribute.count; i += 1) {
          const baseX = base[i * 3];
          const baseY = base[i * 3 + 1];
          const baseZ = base[i * 3 + 2];
          const worldX = record.mesh.position.x + baseX;
          const depth = clamp((-worldX - 8) / 142, 0, 1);
          const localStability = clamp((worldX - this.liminalStairStartX) / 7.5, 0, 1);
          const late = Math.pow(depth, 2.15) * distortionEase * localStability;
          const phase = record.phase + meshIndex * 1.31;
          const pulse = Math.sin(time * (1.05 + depth * 2.8) + baseX * .12 + phase);
          const coarse = Math.sin(time * .36 + Math.floor(baseX / 4.8) * 2.4 + phase);
          const jump = Math.sin(time * 5.2 + Math.floor(baseX / 7.4) + seed) > .94 ? 1 : 0;

          if (isFloor) {
            array[i * 3] = baseX + Math.sin(baseY * .8 + time + phase) * .16 * late;
            array[i * 3 + 1] = baseY + Math.sin(baseX * .21 - time * .72 + phase) * .45 * late;
            array[i * 3 + 2] = baseZ
              + pulse * late * 1.3
              + coarse * late * .65
              + jump * late * .38;
          } else {
            array[i * 3] = baseX + Math.sin(baseY * .55 + time * .8 + phase) * .22 * late;
            array[i * 3 + 1] = baseY + Math.sin(baseX * .17 + time * .52 + phase) * .28 * late;
            array[i * 3 + 2] = baseZ
              + pulse * late * 1.58
              + coarse * late * .82
              + jump * late * .55;
          }
        }
        attribute.needsUpdate = true;
        if (leftDepth > .35 && Math.floor(time * 4 + meshIndex) % 3 === 0) {
          record.mesh.geometry.computeVertexNormals();
        }
      });

      this.liminalGlitchSlices.forEach((slice, index) => {
        const sliceStability = clamp((slice.baseX - this.liminalStairStartX) / 8.0, 0, 1);
        const local = Math.pow(slice.strength, 1.45) * distortionEase * sliceStability;
        const lagGate = Math.sin(time * (1.1 + index * .07) + slice.phase);
        const snap = lagGate > .78 ? 1 : 0;
        slice.group.position.x = slice.baseX
          + Math.sin(time * .58 + slice.phase) * local * 1.1
          + snap * Math.sin(seed + index) * local * 2.4;
        slice.group.position.z = this.liminalCenterZ
          + Math.sin(time * 1.7 + slice.phase) * local * .55
          + (index % 4 === 0 ? Math.sin(time * 4.4 + seed) * local * .45 : 0);
        slice.group.rotation.x = Math.sin(time * .73 + slice.phase) * local * .075;
        slice.group.rotation.z = Math.sin(time * 1.24 + slice.phase) * local * .09;
        const pulseScale = 1 + Math.sin(time * 2.1 + slice.phase) * local * .08;
        slice.group.scale.set(pulseScale, 1 - local * .04 * Math.sin(time + index), pulseScale);
      });

      if (this.liminalLeftLight) {
        const badFlicker = Math.sin(time * 13.7 + seed) > .72 ? .25 : 1;
        const flickerMix = lerp(1, badFlicker, distortionEase);
        this.liminalLeftLight.intensity = (7.5 + Math.sin(time * 1.8 + seed) * 2.1 * distortionEase) * (1 - distortionEase * .45) * flickerMix;
        this.liminalLeftLight.position.z = this.liminalCenterZ + Math.sin(time * .51 + seed) * distortionEase * 1.4;
      }

      if (distortionEase > .01) this.glitch = Math.max(this.glitch, .12 + distortionEase * .92);
    }

    this.liminalStairSanctuary = clamp((this.liminalStairStartX + 2.4 - x) / 6.2, 0, 1);
    if (this.liminalStairSanctuary > 0) {
      this.glitch *= 1 - this.liminalStairSanctuary * .94;
    }

    // The fracture starts well before the last lamp, so the player sees the
    // floor unzip and crumble ahead before gravity takes over.
    if (x > 118.4 && !this.liminalFall) {
      this.liminalFall = true;
      this.liminalFallTime = 0;
      this.liminalFallAirborne = false;
      this.glitch = 1;
      this.liminalRightSegments.forEach((segment, segmentIndex) => {
        if (segment.x < 109) return;
        segment.floor.visible = false;
        segment.fragments = [];
        const columns = 5;
        const rows = 3;
        for (let column = 0; column < columns; column += 1) {
          for (let row = 0; row < rows; row += 1) {
            const shard = new THREE.Mesh(
              new THREE.BoxGeometry(1.28, .12, 1.42),
              this.floorMaterial
            );
            shard.position.set(
              -3.4 + (column + .5) * 1.36,
              .02,
              -2.13 + (row + .5) * 1.42
            );
            shard.rotation.y = Math.sin((segmentIndex + 1) * 12.7 + row * 4.1 + column) * .035;
            shard.userData.baseY = shard.position.y;
            shard.userData.delay = Math.max(0, (segment.x - 109) * .018 + column * .055 + row * .028);
            shard.userData.spin = Math.sin(segment.x * 2.7 + column * 7.1 + row * 3.2);
            shard.receiveShadow = true;
            segment.group.add(shard);
            segment.fragments.push(shard);
          }
        }
      });
    }

    if (this.liminalFall) {
      this.liminalFallTime += delta;
      const fall = this.liminalFallTime;
      this.liminalRightSegments.forEach((segment) => {
        segment.fragments?.forEach((shard) => {
          const t = Math.max(0, fall - shard.userData.delay);
          if (t <= 0) return;
          shard.position.y = shard.userData.baseY - t * t * (1.55 + Math.abs(shard.userData.spin) * 2.5);
          shard.rotation.x += delta * shard.userData.spin * 1.7;
          shard.rotation.z += delta * (1.1 + Math.abs(shard.userData.spin));
        });
      });

      if (fall > .78 && !this.liminalFallAirborne) {
        this.liminalFallAirborne = true;
        this.freeCameraKeys.clear();
      }
      if (this.liminalFallAirborne) {
        const air = fall - .78;
        this.camera.position.y = 3.6 - air * air * 7.1;
        this.camera.rotation.z += Math.sin(air * 5.2) * .006;
        const blackout = clamp((air - .8) / .72, 0, 1);
        if (this.transitionBlackout) {
          this.transitionBlackout.style.background = "#000";
          this.transitionBlackout.style.opacity = blackout.toFixed(3);
        }
        this.glitch = Math.max(this.glitch, .5 + blackout * .5);
        if (air > 1.58) this.enterCityWorld();
      }
    }
  }

  createEndlessCity() {
    this.cityScene = new THREE.Scene();
    this.cityScene.background = new THREE.Color(0x02050a);
    this.cityScene.fog = new THREE.FogExp2(0x040810, .0155);
    this.cityHemisphereLight = new THREE.HemisphereLight(0x7890ad, 0x020305, .62);
    this.cityScene.add(this.cityHemisphereLight);
    this.cityMoonLight = new THREE.DirectionalLight(0x91afd5, 1.28);
    this.cityMoonLight.position.set(-38, 68, 24);
    this.cityScene.add(this.cityMoonLight);
    this.cityBaseBackground = new THREE.Color(0x02050a);
    this.cityBioBackground = new THREE.Color(0x110205);
    this.cityBaseFog = new THREE.Color(0x040810);
    this.cityBioFog = new THREE.Color(0x190307);
    this.cityBaseHemisphereColor = new THREE.Color(0x7890ad);
    this.cityBioHemisphereColor = new THREE.Color(0x8c2435);
    this.cityBaseGroundLightColor = new THREE.Color(0x020305);
    this.cityBioGroundLightColor = new THREE.Color(0x170205);
    this.cityBaseMoonColor = new THREE.Color(0x91afd5);
    this.cityBioMoonColor = new THREE.Color(0xb93649);

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    for (let i = 0; i < 420; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 110 + Math.random() * 150;
      starPositions.push(Math.cos(angle) * radius, 38 + Math.random() * 125, Math.sin(angle) * radius);
    }
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    this.cityStars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ color: 0x9fb6d0, size: .24, transparent: true, opacity: .62, depthWrite: false })
    );
    this.cityScene.add(this.cityStars);

    const makeFacade = (litColor, darkColor, frequency) => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 256;
      const context = canvas.getContext("2d");
      context.fillStyle = darkColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
      for (let y = 8; y < 250; y += 15) {
        for (let x = 7; x < 124; x += 14) {
          const lit = Math.abs(Math.sin(x * 2.17 + y * 4.93 + frequency * 11)) > frequency;
          context.fillStyle = lit ? litColor : "rgba(8,13,20,.92)";
          context.fillRect(x, y, 7, 7);
          if (lit) {
            context.fillStyle = "rgba(255,255,255,.18)";
            context.fillRect(x, y, 7, 1);
          }
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.magFilter = THREE.NearestFilter;
      return texture;
    };

    const facadeTextures = [
      makeFacade("#e8c47d", "#080c13", .56),
      makeFacade("#8fbad2", "#070b12", .68),
      makeFacade("#d89175", "#0b0c12", .73),
      makeFacade("#a9b4cf", "#090c13", .62)
    ];
    this.cityBuildingMaterials = facadeTextures.map((texture, index) => new THREE.MeshStandardMaterial({
      color: [0x17202a, 0x101820, 0x19171c, 0x12161d][index],
      map: texture,
      emissiveMap: texture,
      emissive: new THREE.Color([0x80612b, 0x29485c, 0x67352b, 0x35405a][index]),
      emissiveIntensity: .72,
      roughness: .78,
      metalness: .14
    }));
    const makeSurfaceTexture = (kind) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const context = canvas.getContext("2d");
      context.fillStyle = kind === "road" ? "#171b20" : "#292d31";
      context.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1800; i += 1) {
        const value = Math.floor(20 + Math.random() * 38);
        const alpha = .025 + Math.random() * .09;
        context.fillStyle = `rgba(${value},${value + 2},${value + 4},${alpha})`;
        const radius = Math.random() < .9 ? 1 : 2 + Math.random() * 3;
        context.fillRect(Math.random() * 256, Math.random() * 256, radius, radius);
      }
      context.strokeStyle = kind === "road" ? "rgba(95,105,115,.12)" : "rgba(8,10,13,.32)";
      context.lineWidth = kind === "road" ? 1 : 2;
      if (kind === "road") {
        for (let crack = 0; crack < 9; crack += 1) {
          context.beginPath();
          let x = Math.random() * 256;
          let y = Math.random() * 256;
          context.moveTo(x, y);
          for (let point = 0; point < 6; point += 1) {
            x += (Math.random() - .5) * 24;
            y += 8 + Math.random() * 18;
            context.lineTo(x, y);
          }
          context.stroke();
        }
      } else {
        for (let tile = 0; tile <= 256; tile += 32) {
          context.beginPath();
          context.moveTo(tile, 0);
          context.lineTo(tile, 256);
          context.moveTo(0, tile);
          context.lineTo(256, tile);
          context.stroke();
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(kind === "road" ? 8 : 4, kind === "road" ? 8 : 4);
      return texture;
    };
    const roadTexture = makeSurfaceTexture("road");
    const pavementTexture = makeSurfaceTexture("pavement");
    const maxAnisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    roadTexture.anisotropy = maxAnisotropy;
    pavementTexture.anisotropy = maxAnisotropy;

    const makeReliefTexture = (kind) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const context = canvas.getContext("2d");
      context.fillStyle = kind === "road" ? "#777" : "#999";
      context.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2400; i += 1) {
        const base = kind === "road" ? 92 : 126;
        const value = Math.floor(base + (Math.random() - .5) * (kind === "road" ? 72 : 42));
        context.fillStyle = `rgb(${value},${value},${value})`;
        const size = Math.random() < .88 ? 1 : 2 + Math.random() * 3;
        context.fillRect(Math.random() * 256, Math.random() * 256, size, size);
      }
      context.strokeStyle = kind === "road" ? "rgba(22,22,22,.88)" : "rgba(50,50,50,.64)";
      context.lineWidth = kind === "road" ? 2 : 1;
      const lines = kind === "road" ? 15 : 18;
      for (let line = 0; line < lines; line += 1) {
        context.beginPath();
        let x = Math.random() * 256;
        let y = Math.random() * 256;
        context.moveTo(x, y);
        for (let point = 0; point < 7; point += 1) {
          x += (Math.random() - .5) * 19;
          y += 5 + Math.random() * 15;
          context.lineTo(x, y);
        }
        context.stroke();
      }
      if (kind === "pavement") {
        context.strokeStyle = "rgba(48,48,48,.75)";
        context.lineWidth = 2;
        for (let tile = 0; tile <= 256; tile += 32) {
          context.beginPath();
          context.moveTo(tile, 0);
          context.lineTo(tile, 256);
          context.moveTo(0, tile);
          context.lineTo(256, tile);
          context.stroke();
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.NoColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.copy(kind === "road" ? roadTexture.repeat : pavementTexture.repeat);
      texture.anisotropy = maxAnisotropy;
      return texture;
    };
    const roadReliefTexture = makeReliefTexture("road");
    const pavementReliefTexture = makeReliefTexture("pavement");
    this.cityRoadReliefTexture = roadReliefTexture;

    this.cityRoofMaterial = new THREE.MeshStandardMaterial({ color: 0x080b10, roughness: .68, metalness: .42 });
    this.cityAsphaltMaterial = new THREE.MeshStandardMaterial({
      color: 0x151a20,
      map: roadTexture,
      bumpMap: roadReliefTexture,
      bumpScale: .19,
      roughnessMap: roadReliefTexture,
      roughness: .78,
      metalness: .28,
      envMapIntensity: .5
    });
    this.cityPavementMaterial = new THREE.MeshStandardMaterial({
      color: 0x262b30,
      map: pavementTexture,
      bumpMap: pavementReliefTexture,
      bumpScale: .085,
      roughnessMap: pavementReliefTexture,
      roughness: .92
    });
    this.cityMetalMaterial = new THREE.MeshStandardMaterial({ color: 0x111820, roughness: .38, metalness: .82 });
    this.cityConcreteDetailMaterial = new THREE.MeshStandardMaterial({ color: 0x30363b, roughness: .88 });
    this.cityGlassMaterial = new THREE.MeshStandardMaterial({
      color: 0x203849,
      emissive: 0x091923,
      emissiveIntensity: .65,
      roughness: .18,
      metalness: .52
    });
    this.cityWetMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x111923,
      roughness: .12,
      metalness: .42,
      transparent: true,
      opacity: .58,
      depthWrite: false
    });
    this.cityLampMaterial = new THREE.MeshBasicMaterial({ color: 0xffffd5, toneMapped: false });
    const lampGlowCanvas = document.createElement("canvas");
    lampGlowCanvas.width = lampGlowCanvas.height = 64;
    const lampGlowContext = lampGlowCanvas.getContext("2d");
    const lampGlowGradient = lampGlowContext.createRadialGradient(32, 32, 2, 32, 32, 32);
    lampGlowGradient.addColorStop(0, "rgba(255,247,211,1)");
    lampGlowGradient.addColorStop(.22, "rgba(255,210,137,.7)");
    lampGlowGradient.addColorStop(1, "rgba(255,185,96,0)");
    lampGlowContext.fillStyle = lampGlowGradient;
    lampGlowContext.fillRect(0, 0, 64, 64);
    this.cityLampGlowTexture = new THREE.CanvasTexture(lampGlowCanvas);

    const bioCanvas = document.createElement("canvas");
    const bioBumpCanvas = document.createElement("canvas");
    bioCanvas.width = bioCanvas.height = 512;
    bioBumpCanvas.width = bioBumpCanvas.height = 512;
    const bioContext = bioCanvas.getContext("2d");
    const bioBumpContext = bioBumpCanvas.getContext("2d");
    bioContext.fillStyle = "#321015";
    bioContext.fillRect(0, 0, 512, 512);
    bioBumpContext.fillStyle = "#686868";
    bioBumpContext.fillRect(0, 0, 512, 512);
    for (let cell = 0; cell < 260; cell += 1) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radiusX = 4 + Math.random() * 24;
      const radiusY = 3 + Math.random() * 15;
      const lightness = 38 + Math.floor(Math.random() * 42);
      bioContext.fillStyle = `rgba(${lightness + 42},${10 + lightness * .18},${18 + lightness * .2},${.08 + Math.random() * .18})`;
      bioContext.beginPath();
      bioContext.ellipse(x, y, radiusX, radiusY, Math.random() * Math.PI, 0, Math.PI * 2);
      bioContext.fill();
      const bump = 72 + Math.floor(Math.random() * 92);
      bioBumpContext.fillStyle = `rgb(${bump},${bump},${bump})`;
      bioBumpContext.beginPath();
      bioBumpContext.ellipse(x, y, radiusX, radiusY, Math.random() * Math.PI, 0, Math.PI * 2);
      bioBumpContext.fill();
    }
    for (let vein = 0; vein < 42; vein += 1) {
      const startX = Math.random() * 512;
      const startY = Math.random() * 512;
      const endX = Math.random() * 512;
      const endY = Math.random() * 512;
      bioContext.strokeStyle = vein % 4 ? "rgba(112,13,29,.45)" : "rgba(187,39,54,.48)";
      bioContext.lineWidth = vein % 4 ? 1 + Math.random() * 3 : 4 + Math.random() * 6;
      bioContext.beginPath();
      bioContext.moveTo(startX, startY);
      bioContext.bezierCurveTo(
        startX + (Math.random() - .5) * 180,
        startY + (Math.random() - .5) * 180,
        endX + (Math.random() - .5) * 180,
        endY + (Math.random() - .5) * 180,
        endX,
        endY
      );
      bioContext.stroke();
      bioBumpContext.strokeStyle = vein % 4 ? "rgba(185,185,185,.55)" : "rgba(225,225,225,.8)";
      bioBumpContext.lineWidth = bioContext.lineWidth;
      bioBumpContext.stroke();
    }
    const bioTexture = new THREE.CanvasTexture(bioCanvas);
    bioTexture.colorSpace = THREE.SRGBColorSpace;
    bioTexture.wrapS = bioTexture.wrapT = THREE.RepeatWrapping;
    bioTexture.repeat.set(3, 3);
    bioTexture.anisotropy = maxAnisotropy;
    const bioBumpTexture = new THREE.CanvasTexture(bioBumpCanvas);
    bioBumpTexture.colorSpace = THREE.NoColorSpace;
    bioBumpTexture.wrapS = bioBumpTexture.wrapT = THREE.RepeatWrapping;
    bioBumpTexture.repeat.set(3, 3);
    bioBumpTexture.anisotropy = maxAnisotropy;
    this.cityBioTexture = bioTexture;
    this.cityBioBumpTexture = bioBumpTexture;

    this.cityFleshMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x55151e,
      map: bioTexture,
      bumpMap: bioBumpTexture,
      bumpScale: .36,
      roughness: .55,
      metalness: .04,
      clearcoat: .24,
      clearcoatRoughness: .48,
      sheen: .7,
      sheenColor: new THREE.Color(0x8d2434),
      transparent: true,
      opacity: 0
    });
    this.cityMembraneMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x6f1d2a,
      map: bioTexture,
      bumpMap: bioBumpTexture,
      bumpScale: .22,
      roughness: .38,
      metalness: 0,
      transmission: .08,
      thickness: .45,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.cityVeinMaterial = new THREE.MeshStandardMaterial({
      color: 0x7d0c24,
      emissive: 0x5b0719,
      emissiveIntensity: 1.2,
      roughness: .42,
      transparent: true,
      opacity: 0
    });
    this.cityCapillaryMaterial = new THREE.MeshBasicMaterial({
      color: 0xc51e3f,
      transparent: true,
      opacity: 0,
      toneMapped: false
    });
    this.cityLivingWindowMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x4f0b18,
      emissive: 0x9f1730,
      emissiveIntensity: 1,
      roughness: .32,
      clearcoat: .36,
      transparent: true,
      opacity: 0
    });
    this.cityBioGroundMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x421018,
      map: bioTexture,
      bumpMap: bioBumpTexture,
      bumpScale: .31,
      roughness: .48,
      clearcoat: .2,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    this.cityBoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x9a806e,
      roughness: .78,
      transparent: true,
      opacity: 0
    });

    this.cityBuildingMaterials.forEach((material) => {
      material.userData.cityBaseColor = material.color.clone();
      material.userData.cityBaseEmissive = material.emissive.clone();
      material.userData.cityBaseEmissiveIntensity = material.emissiveIntensity;
      material.bumpMap = bioBumpTexture;
      material.bumpScale = 0;
    });
    this.cityAsphaltMaterial.userData.cityBaseColor = this.cityAsphaltMaterial.color.clone();
    this.cityPavementMaterial.userData.cityBaseColor = this.cityPavementMaterial.color.clone();
    this.cityBioBuildingColors = [0x351218, 0x2c0d13, 0x401319, 0x2d1117].map((color) => new THREE.Color(color));
    this.cityBioBuildingEmissives = [0x65101f, 0x4d0a19, 0x791326, 0x5b0b1b].map((color) => new THREE.Color(color));
    this.cityBioAsphaltColor = new THREE.Color(0x211014);
    this.cityBioPavementColor = new THREE.Color(0x35171c);
    this.cityBaseLampColor = this.cityLampMaterial.color.clone();
    this.cityBioLampColor = new THREE.Color(0xff6a62);
    const symbolAtlasCanvas = document.createElement("canvas");
    symbolAtlasCanvas.width = 1024;
    symbolAtlasCanvas.height = 512;
    const symbolAtlasContext = symbolAtlasCanvas.getContext("2d");
    const strangeSymbols = [
      "ꙮ", "⟁", "⌬", "⍜",
      "ᛉ", "ᚼ", "Ѯ", "҂",
      "∴", "⊘", "☿", "⛧",
      "⟟", "⌁", "⧖", "※",
      "⸸", "⛥", "⟐", "⌇",
      "⌖", "⧗", "⨳", "⥁",
      "⫷", "⟡", "꩜", "⋇",
      "⌭", "⍟", "⦿", "⧉"
    ];
    symbolAtlasContext.clearRect(0, 0, 512, 512);
    symbolAtlasContext.textAlign = "center";
    symbolAtlasContext.textBaseline = "middle";
    symbolAtlasContext.font = '700 78px "DejaVu Sans", "Segoe UI Symbol", serif';
    strangeSymbols.forEach((symbol, index) => {
      const column = index % 8;
      const row = Math.floor(index / 8);
      symbolAtlasContext.shadowColor = "rgba(255,255,255,.92)";
      symbolAtlasContext.shadowBlur = 14;
      symbolAtlasContext.fillStyle = "#fff";
      symbolAtlasContext.fillText(symbol, column * 128 + 64, row * 128 + 66);
      symbolAtlasContext.shadowBlur = 0;
      symbolAtlasContext.strokeStyle = "rgba(255,255,255,.6)";
      symbolAtlasContext.lineWidth = 1.5;
      symbolAtlasContext.strokeText(symbol, column * 128 + 64, row * 128 + 66);
    });
    const symbolAtlasTexture = new THREE.CanvasTexture(symbolAtlasCanvas);
    symbolAtlasTexture.colorSpace = THREE.SRGBColorSpace;
    symbolAtlasTexture.anisotropy = maxAnisotropy;
    this.citySymbolMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uAtlas: { value: symbolAtlasTexture },
        uTime: { value: 0 },
        uOpacity: { value: 0 }
      },
      vertexShader: `
        attribute float aSymbol;
        attribute vec3 aSymbolColor;
        varying vec2 vSymbolUv;
        varying vec3 vSymbolColor;
        varying float vSymbolPhase;
        void main() {
          float column = mod(aSymbol, 8.0);
          float row = floor(aSymbol / 8.0);
          vSymbolUv = vec2(
            (uv.x + column) / 8.0,
            (uv.y + 3.0 - row) / 4.0
          );
          vSymbolColor = aSymbolColor;
          vSymbolPhase = aSymbol * .731;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform sampler2D uAtlas;
        uniform float uTime;
        uniform float uOpacity;
        varying vec2 vSymbolUv;
        varying vec3 vSymbolColor;
        varying float vSymbolPhase;
        void main() {
          vec4 glyph = texture2D(uAtlas, vSymbolUv);
          float pulse = .72 + sin(uTime * 2.25 + vSymbolPhase) * .18
            + sin(uTime * .63 + vSymbolPhase * 2.1) * .1;
          float alpha = glyph.a * uOpacity * clamp(pulse, .3, 1.15);
          if (alpha < .025) discard;
          gl_FragColor = vec4(vSymbolColor * (1.18 + pulse * .72), alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide
    });

    this.cityBioMatrixDummy = new THREE.Object3D();
    this.cityBioInstanceGeometries = {
      flesh: new THREE.SphereGeometry(1, 14, 10),
      membrane: new THREE.SphereGeometry(1, 13, 9),
      window: new THREE.SphereGeometry(.42, 12, 8),
      rib: new THREE.TorusGeometry(1, .085, 6, 20, Math.PI),
      spine: new THREE.ConeGeometry(.19, 1.8, 7)
    };

    this.cityChunkSize = 64;
    this.cityChunkGrid = 5;
    this.cityChunks = [];
    for (let gridZ = -2; gridZ <= 2; gridZ += 1) {
      for (let gridX = -2; gridX <= 2; gridX += 1) {
        const chunk = this.createCityChunk(gridX, gridZ);
        chunk.position.set(gridX * this.cityChunkSize, 0, gridZ * this.cityChunkSize);
        this.cityScene.add(chunk);
        this.cityChunks.push(chunk);
      }
    }

    this.cityChunks.forEach((chunk) => {
      if (chunk.userData.bioGroup) chunk.userData.bioGroup.visible = true;
    });
    this.renderer.compile(this.cityScene, this.camera);
    this.cityChunks.forEach((chunk) => {
      if (chunk.userData.bioGroup) chunk.userData.bioGroup.visible = false;
      chunk.userData.bioPulseMeshes?.forEach((mesh) => {
        mesh.visible = false;
      });
      chunk.userData.bioInstances?.forEach((batch) => {
        batch.mesh.count = 0;
      });
    });
  }

  createCityChunk(gridX, gridZ) {
    const chunk = new THREE.Group();
    chunk.userData.colliders = [];
    const detailGroup = new THREE.Group();
    chunk.userData.details = detailGroup;
    chunk.add(detailGroup);
    const bioGroup = new THREE.Group();
    bioGroup.visible = false;
    chunk.userData.bioGroup = bioGroup;
    chunk.userData.bioPulseMeshes = [];
    chunk.userData.bioInstances = [];
    chunk.userData.bioBuildings = [];
    chunk.add(bioGroup);
    const size = this.cityChunkSize;
    const seed = Math.abs(Math.sin(gridX * 127.13 + gridZ * 311.71)) + .013;
    const seeded = (salt) => {
      const value = Math.sin((seed + salt) * 43758.5453);
      return value - Math.floor(value);
    };
    const registerBioMesh = (mesh, threshold, pulseAmount = .035) => {
      mesh.userData.bioThreshold = threshold;
      mesh.userData.bioPulseAmount = pulseAmount;
      mesh.userData.bioPulsePhase = seeded(threshold * 700 + chunk.userData.bioPulseMeshes.length * 9.3) * Math.PI * 2;
      mesh.userData.bioBaseScale = mesh.scale.clone();
      bioGroup.add(mesh);
      chunk.userData.bioPulseMeshes.push(mesh);
      return mesh;
    };
    const symbolEntries = [];
    const instanceSets = {
      flesh: { geometry: this.cityBioInstanceGeometries.flesh, material: this.cityFleshMaterial, entries: [] },
      membrane: { geometry: this.cityBioInstanceGeometries.membrane, material: this.cityMembraneMaterial, entries: [] },
      window: { geometry: this.cityBioInstanceGeometries.window, material: this.cityLivingWindowMaterial, entries: [] },
      rib: { geometry: this.cityBioInstanceGeometries.rib, material: this.cityBoneMaterial, entries: [] },
      spine: { geometry: this.cityBioInstanceGeometries.spine, material: this.cityBoneMaterial, entries: [] }
    };
    const addBioInstance = (kind, position, quaternion, scale, threshold, pulseAmount) => {
      instanceSets[kind].entries.push({
        position,
        quaternion,
        scale,
        threshold,
        pulseAmount,
        phase: seeded(threshold * 991 + instanceSets[kind].entries.length * 17.3) * Math.PI * 2
      });
    };

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(size + .2, size + .2), this.cityAsphaltMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.035;
    ground.receiveShadow = true;
    chunk.add(ground);

    const bioGround = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size, 28, 28),
      this.cityBioGroundMaterial
    );
    bioGround.rotation.x = -Math.PI / 2;
    bioGround.position.y = .028;
    registerBioMesh(bioGround, .018 + seeded(405) * .055, .008);

    for (let groundVeinIndex = 0; groundVeinIndex < 5; groundVeinIndex += 1) {
      const horizontal = groundVeinIndex % 2 === 0;
      const offset = -23 + seeded(410 + groundVeinIndex) * 46;
      const groundCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(horizontal ? -32 : offset, .055, horizontal ? offset : -32),
        new THREE.Vector3(horizontal ? -15 : offset + seeded(420 + groundVeinIndex) * 5, .06, horizontal ? offset + 2.5 : -14),
        new THREE.Vector3(horizontal ? 2 : offset - 2, .065, horizontal ? offset - 2 : 3),
        new THREE.Vector3(horizontal ? 17 : offset + 3, .06, horizontal ? offset + 1 : 18),
        new THREE.Vector3(horizontal ? 32 : offset, .055, horizontal ? offset : 32)
      ]);
      const groundVein = new THREE.Mesh(
        new THREE.TubeGeometry(groundCurve, 28, groundVeinIndex % 3 === 0 ? .115 : .055, 6, false),
        groundVeinIndex % 3 === 0 ? this.cityVeinMaterial : this.cityCapillaryMaterial
      );
      registerBioMesh(
        groundVein,
        (groundVeinIndex % 3 === 0 ? .11 : .22) + seeded(435 + groundVeinIndex) * .2,
        .018
      );
    }

    for (let ribIndex = 0; ribIndex < 3; ribIndex += 1) {
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(5.2, .19 + ribIndex * .025, 7, 30, Math.PI),
        this.cityBoneMaterial
      );
      rib.position.set(0, .22, -20 + ribIndex * 20);
      rib.rotation.y = ribIndex % 2 ? .08 : -.08;
      registerBioMesh(rib, .62 + ribIndex * .055 + seeded(470 + ribIndex) * .13, .026);
    }

    const sidewalkSize = 25;
    [[-18.5, -18.5], [18.5, -18.5], [-18.5, 18.5], [18.5, 18.5]].forEach(([x, z], plotIndex) => {
      const sidewalk = new THREE.Mesh(
        new THREE.BoxGeometry(sidewalkSize, .24, sidewalkSize),
        this.cityPavementMaterial
      );
      sidewalk.position.set(x, .1, z);
      sidewalk.receiveShadow = true;
      chunk.add(sidewalk);

      const style = Math.floor(seeded(plotIndex * 9.1) * 4);
      const baseHeight = 17 + seeded(plotIndex * 14.7 + 2) * 42;
      const width = 10 + seeded(plotIndex * 18.2 + 4) * 10;
      const depth = 10 + seeded(plotIndex * 21.3 + 7) * 10;
      const material = this.cityBuildingMaterials[(style + plotIndex) % this.cityBuildingMaterials.length];
      const building = new THREE.Mesh(new THREE.BoxGeometry(width, baseHeight, depth), material);
      building.position.set(x + (seeded(plotIndex + 30) - .5) * 4, baseHeight * .5 + .24, z + (seeded(plotIndex + 40) - .5) * 4);
      building.castShadow = true;
      building.receiveShadow = true;
      chunk.add(building);
      chunk.userData.bioBuildings.push({
        mesh: building,
        baseScale: building.scale.clone(),
        baseY: building.position.y,
        baseRotationY: building.rotation.y,
        height: baseHeight,
        width,
        depth,
        phase: seeded(plotIndex + 305) * Math.PI * 2
      });
      chunk.userData.colliders.push({
        x: building.position.x,
        z: building.position.z,
        halfWidth: width * .5,
        halfDepth: depth * .5
      });

      if (style === 0 || style === 3) {
        const tierHeight = 6 + seeded(plotIndex + 51) * 15;
        const tier = new THREE.Mesh(
          new THREE.BoxGeometry(width * .62, tierHeight, depth * .62),
          this.cityBuildingMaterials[(style + 1) % 4]
        );
        tier.position.set(building.position.x, baseHeight + tierHeight * .5 + .22, building.position.z);
        tier.castShadow = true;
        chunk.add(tier);
      } else if (style === 1) {
        const tank = new THREE.Mesh(
          new THREE.CylinderGeometry(2.1, 2.35, 3.1, 12),
          this.cityRoofMaterial
        );
        tank.position.set(building.position.x, baseHeight + 1.8, building.position.z);
        tank.castShadow = true;
        chunk.add(tank);
      }

      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(.035, .055, 4.5 + seeded(plotIndex + 72) * 7, 6), this.cityMetalMaterial);
      antenna.position.set(building.position.x + width * .22, baseHeight + antenna.geometry.parameters.height * .5, building.position.z);
      chunk.add(antenna);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(.11, 8, 6), new THREE.MeshBasicMaterial({
        color: plotIndex % 2 ? 0xff3636 : 0xb8d7ff,
        toneMapped: false
      }));
      beacon.position.set(antenna.position.x, baseHeight + antenna.geometry.parameters.height, antenna.position.z);
      chunk.add(beacon);

      if (seeded(plotIndex + 89) > .47) {
        const signColor = [0x59d9ff, 0xff456d, 0xf5bf55, 0x9c7cff][(style + gridX + gridZ + 16) % 4];
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(Math.min(width * .68, 8), 1.15),
          new THREE.MeshBasicMaterial({ color: signColor, toneMapped: false, transparent: true, opacity: .82 })
        );
        sign.position.set(building.position.x, 4.2 + seeded(plotIndex + 90) * 8, building.position.z + depth * .505);
        chunk.add(sign);
      }

      const storefront = new THREE.Mesh(
        new THREE.BoxGeometry(Math.min(width * .68, 8.5), 2.15, .22),
        this.cityGlassMaterial
      );
      storefront.position.set(building.position.x, 1.4, building.position.z + depth * .51);
      detailGroup.add(storefront);
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(Math.min(width * .76, 9.4), .13, .92),
        this.cityBuildingMaterials[(style + 2) % 4]
      );
      awning.position.set(building.position.x, 2.68, building.position.z + depth * .54);
      awning.rotation.x = -.13;
      detailGroup.add(awning);

      for (let unitIndex = 0; unitIndex < 2; unitIndex += 1) {
        const unit = new THREE.Mesh(new THREE.BoxGeometry(.72, .52, .28), this.cityConcreteDetailMaterial);
        unit.position.set(
          building.position.x + width * .505,
          5.4 + unitIndex * 4.2 + seeded(plotIndex + unitIndex + 140),
          building.position.z + (unitIndex ? -.22 : .24) * depth
        );
        detailGroup.add(unit);
        const fan = new THREE.Mesh(
          new THREE.CircleGeometry(.19, 10),
          new THREE.MeshBasicMaterial({ color: 0x10151a })
        );
        fan.rotation.y = Math.PI / 2;
        fan.position.set(unit.position.x + .365, unit.position.y, unit.position.z);
        detailGroup.add(fan);
      }

      for (let ventIndex = 0; ventIndex < 2; ventIndex += 1) {
        const vent = new THREE.Mesh(
          new THREE.CylinderGeometry(.22, .28, .75 + ventIndex * .18, 8),
          this.cityMetalMaterial
        );
        vent.position.set(
          building.position.x + (ventIndex ? -.22 : .24) * width,
          baseHeight + .55,
          building.position.z + (ventIndex ? .18 : -.2) * depth
        );
        detailGroup.add(vent);
      }

      const drainPipe = new THREE.Mesh(
        new THREE.CylinderGeometry(.075, .075, Math.min(baseHeight - 1.5, 18), 7),
        this.cityMetalMaterial
      );
      drainPipe.position.set(
        building.position.x - width * .43,
        Math.min(baseHeight * .5, 9.5),
        building.position.z + depth * .514
      );
      detailGroup.add(drainPipe);

      const ledgeCount = 2 + Math.floor(seeded(plotIndex + 160) * 3);
      for (let ledgeIndex = 0; ledgeIndex < ledgeCount; ledgeIndex += 1) {
        const ledge = new THREE.Mesh(
          new THREE.BoxGeometry(width * .96, .09, .22),
          this.cityConcreteDetailMaterial
        );
        ledge.position.set(
          building.position.x,
          5.2 + ledgeIndex * 4.6,
          building.position.z + depth * .515
        );
        detailGroup.add(ledge);
      }

      if (style === 2 || seeded(plotIndex + 171) > .72) {
        for (let escapeIndex = 0; escapeIndex < 3; escapeIndex += 1) {
          const escapeY = 6.2 + escapeIndex * 4.5;
          if (escapeY > baseHeight - 1.5) break;
          const platform = new THREE.Mesh(
            new THREE.BoxGeometry(2.8, .08, .72),
            this.cityMetalMaterial
          );
          platform.position.set(building.position.x + width * .22, escapeY, building.position.z + depth * .55);
          detailGroup.add(platform);
          for (let barIndex = -2; barIndex <= 2; barIndex += 1) {
            const bar = new THREE.Mesh(
              new THREE.CylinderGeometry(.022, .022, .72, 5),
              this.cityMetalMaterial
            );
            bar.position.set(platform.position.x + barIndex * .55, escapeY + .36, platform.position.z + .3);
            detailGroup.add(bar);
          }
          if (escapeIndex < 2) {
            const ladder = new THREE.Mesh(
              new THREE.BoxGeometry(.055, 4.35, .055),
              this.cityMetalMaterial
            );
            ladder.position.set(platform.position.x + 1.1, escapeY + 2.2, platform.position.z + .31);
            detailGroup.add(ladder);
          }
        }
      }

      const serviceDoor = new THREE.Mesh(
        new THREE.PlaneGeometry(1.15, 2.05),
        this.cityMetalMaterial
      );
      serviceDoor.position.set(
        building.position.x - width * .28,
        1.32,
        building.position.z + depth * .523
      );
      detailGroup.add(serviceDoor);
      const doorLamp = new THREE.Mesh(
        new THREE.BoxGeometry(.24, .13, .1),
        this.cityLampMaterial
      );
      doorLamp.position.set(serviceDoor.position.x, 2.55, serviceDoor.position.z + .08);
      detailGroup.add(doorLamp);

      const facadePoint = (side, u, y, offset = .12) => {
        if (side === 0) return new THREE.Vector3(u, y, depth * .5 + offset);
        if (side === 1) return new THREE.Vector3(-u, y, -depth * .5 - offset);
        if (side === 2) return new THREE.Vector3(width * .5 + offset, y, -u);
        return new THREE.Vector3(-width * .5 - offset, y, u);
      };
      const facadeQuaternion = (side) => new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        [0, Math.PI, Math.PI * .5, -Math.PI * .5][side]
      );
      const facadeScale = (side, across, vertical, depthScale) => (
        new THREE.Vector3(across, vertical, depthScale)
      );

      for (let side = 0; side < 4; side += 1) {
        const sideWidth = side < 2 ? width : depth;
        const sideDepth = side < 2 ? depth : width;
        const sideSeed = plotIndex * 41 + side * 13;
        const rotation = facadeQuaternion(side);
        const faceCenter = facadePoint(side, 0, 0, .08).add(
          new THREE.Vector3(building.position.x, 0, building.position.z)
        );

        addBioInstance(
          "flesh",
          new THREE.Vector3(faceCenter.x, 1.05 + seeded(sideSeed + 500) * .55, faceCenter.z),
          rotation,
          facadeScale(side, sideWidth * (.31 + seeded(sideSeed + 501) * .13), 1.15 + seeded(sideSeed + 502) * 1.7, .5 + seeded(sideSeed + 503) * .52),
          .28 + seeded(sideSeed + 504) * .19,
          .052
        );

        const membraneCount = 2 + Math.floor(seeded(sideSeed + 505) * 2);
        for (let membraneIndex = 0; membraneIndex < membraneCount; membraneIndex += 1) {
          const point = facadePoint(
            side,
            (seeded(sideSeed + membraneIndex + 510) - .5) * sideWidth * .62,
            4.2 + membraneIndex * Math.min(6.2, baseHeight * .21),
            .17
          ).add(new THREE.Vector3(building.position.x, 0, building.position.z));
          addBioInstance(
            "membrane",
            point,
            rotation,
            facadeScale(
              side,
              1.1 + seeded(sideSeed + membraneIndex + 520) * 2.35,
              .7 + seeded(sideSeed + membraneIndex + 530) * 2.15,
              .2 + seeded(sideSeed + membraneIndex + 540) * .12
            ),
            .18 + side * .025 + membraneIndex * .055 + seeded(sideSeed + 541) * .08,
            .07
          );
        }

        const livingWindowCount = 4 + Math.floor(seeded(sideSeed + 550) * 4);
        for (let livingIndex = 0; livingIndex < livingWindowCount; livingIndex += 1) {
          const point = facadePoint(
            side,
            (seeded(sideSeed * 2 + livingIndex + 560) - .5) * sideWidth * .7,
            3.9 + seeded(sideSeed * 3 + livingIndex + 570) * Math.max(4, baseHeight - 7),
            .24
          ).add(new THREE.Vector3(building.position.x, 0, building.position.z));
          addBioInstance(
            "window",
            point,
            rotation,
            facadeScale(
              side,
              1.1 + seeded(sideSeed + livingIndex + 580) * 1.15,
              .52 + seeded(sideSeed + livingIndex + 590) * .68,
              .3
            ),
            .13 + seeded(sideSeed + livingIndex + 600) * .24,
            .095
          );
        }

        const symbolCount = 2 + Math.floor(seeded(sideSeed + 605) * 4);
        for (let glyphIndex = 0; glyphIndex < symbolCount; glyphIndex += 1) {
          const glyphPoint = facadePoint(
            side,
            (seeded(sideSeed * 5 + glyphIndex + 606) - .5) * sideWidth * .72,
            3.6 + seeded(sideSeed * 7 + glyphIndex + 607) * Math.max(4, baseHeight - 6.5),
            .39
          ).add(new THREE.Vector3(building.position.x, 0, building.position.z));
          const hue = seeded(sideSeed * 11 + glyphIndex + 608);
          const glyphColor = new THREE.Color().setHSL(
            hue,
            .82,
            .58 + seeded(sideSeed + glyphIndex + 609) * .2
          );
          symbolEntries.push({
            position: glyphPoint,
            quaternion: rotation.clone(),
            scale: new THREE.Vector3(
              .72 + seeded(sideSeed + glyphIndex + 610) * 1.28,
              .72 + seeded(sideSeed + glyphIndex + 611) * 1.28,
              1
            ),
            threshold: Math.min(
              .92,
              .24 + glyphIndex * .075 + seeded(sideSeed + glyphIndex + 612) * .43
            ),
            pulseAmount: .09,
            phase: seeded(sideSeed + glyphIndex + 613) * Math.PI * 2,
            symbol: Math.floor(seeded(sideSeed + glyphIndex + 614) * 32),
            color: glyphColor
          });
        }

        const mainVeinCurve = new THREE.CatmullRomCurve3([
          facadePoint(side, (seeded(sideSeed + 610) - .5) * sideWidth * .34, .25, .24),
          facadePoint(side, (seeded(sideSeed + 611) - .5) * sideWidth * .62, baseHeight * .22, .28),
          facadePoint(side, (seeded(sideSeed + 612) - .5) * sideWidth * .7, baseHeight * .48, .3),
          facadePoint(side, (seeded(sideSeed + 613) - .5) * sideWidth * .54, baseHeight * .74, .27),
          facadePoint(side, (seeded(sideSeed + 614) - .5) * sideWidth * .38, baseHeight * .97, .23)
        ]);
        const mainVein = new THREE.Mesh(
          new THREE.TubeGeometry(mainVeinCurve, 30, .085 + seeded(sideSeed + 615) * .075, 7, false),
          this.cityVeinMaterial
        );
        mainVein.position.set(building.position.x, 0, building.position.z);
        registerBioMesh(mainVein, .09 + side * .018 + seeded(sideSeed + 616) * .11, .022);

        const capillaryPositions = [];
        for (let branch = 0; branch < 4; branch += 1) {
          const branchCurve = new THREE.CatmullRomCurve3([
            facadePoint(side, (seeded(sideSeed + branch + 620) - .5) * sideWidth * .28, baseHeight * (.12 + branch * .17), .31),
            facadePoint(side, (seeded(sideSeed + branch + 630) - .5) * sideWidth * .66, baseHeight * (.2 + branch * .16), .32),
            facadePoint(side, (seeded(sideSeed + branch + 640) - .5) * sideWidth * .78, baseHeight * (.28 + branch * .14), .31)
          ]);
          const points = branchCurve.getPoints(9);
          for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
            capillaryPositions.push(...points[pointIndex - 1].toArray(), ...points[pointIndex].toArray());
          }
        }
        const capillaryGeometry = new THREE.BufferGeometry();
        capillaryGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(capillaryPositions, 3)
        );
        const capillaries = new THREE.LineSegments(capillaryGeometry, this.cityCapillaryMaterial);
        capillaries.position.set(building.position.x, 0, building.position.z);
        registerBioMesh(capillaries, .2 + side * .02 + seeded(sideSeed + 650) * .12, .009);

        if (baseHeight > 17) {
          addBioInstance(
            "rib",
            facadePoint(side, 0, baseHeight * (.48 + seeded(sideSeed + 660) * .22), .3)
              .add(new THREE.Vector3(building.position.x, 0, building.position.z)),
            rotation,
            facadeScale(side, Math.min(sideWidth * .28, 3.8), Math.min(sideWidth * .28, 3.8), 1),
            .46 + side * .025 + seeded(sideSeed + 661) * .15,
            .028
          );
        }
      }

      const tendrilCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, baseHeight * .94, 0),
        new THREE.Vector3((seeded(plotIndex + 680) - .5) * 3, baseHeight + 4, (seeded(plotIndex + 681) - .5) * 3),
        new THREE.Vector3((seeded(plotIndex + 682) - .5) * 7, baseHeight + 9, (seeded(plotIndex + 683) - .5) * 7),
        new THREE.Vector3((seeded(plotIndex + 684) - .5) * 12, baseHeight + 15, (seeded(plotIndex + 685) - .5) * 12)
      ]);
      const tendril = new THREE.Mesh(
        new THREE.TubeGeometry(tendrilCurve, 26, .18 + seeded(plotIndex + 686) * .16, 7, false),
        this.cityFleshMaterial
      );
      tendril.position.set(building.position.x, 0, building.position.z);
      registerBioMesh(tendril, .55 + seeded(plotIndex + 687) * .18, .045);

      addBioInstance(
        "flesh",
        new THREE.Vector3(
          building.position.x + (seeded(plotIndex + 688) - .5) * width * .22,
          baseHeight + 1.25 + seeded(plotIndex + 689) * 2.2,
          building.position.z + (seeded(plotIndex + 690) - .5) * depth * .22
        ),
        new THREE.Quaternion(),
        new THREE.Vector3(
          2.2 + seeded(plotIndex + 691) * 3.4,
          1.35 + seeded(plotIndex + 692) * 2.8,
          2.1 + seeded(plotIndex + 693) * 3.2
        ),
        .67 + seeded(plotIndex + 694) * .15,
        .085
      );
      addBioInstance(
        "membrane",
        new THREE.Vector3(
          building.position.x + (seeded(plotIndex + 695) - .5) * width * .18,
          baseHeight + 2 + seeded(plotIndex + 696) * 2.5,
          building.position.z + (seeded(plotIndex + 697) - .5) * depth * .18
        ),
        new THREE.Quaternion(),
        new THREE.Vector3(
          1.3 + seeded(plotIndex + 698) * 2,
          1.7 + seeded(plotIndex + 699) * 2.4,
          1.3 + seeded(plotIndex + 700) * 2
        ),
        .74 + seeded(plotIndex + 701) * .12,
        .11
      );

      for (let spineIndex = 0; spineIndex < 5; spineIndex += 1) {
        addBioInstance(
          "spine",
          new THREE.Vector3(
            building.position.x + (spineIndex - 2) * Math.min(1.6, width * .12),
            baseHeight + .85 + seeded(plotIndex + spineIndex + 690) * 1.2,
            building.position.z + (seeded(plotIndex + spineIndex + 700) - .5) * depth * .5
          ),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(
            (seeded(plotIndex + spineIndex + 710) - .5) * .25,
            seeded(plotIndex + spineIndex + 720) * Math.PI,
            (seeded(plotIndex + spineIndex + 730) - .5) * .28
          )),
          new THREE.Vector3(1, .8 + seeded(plotIndex + spineIndex + 740) * 1.3, 1),
          .62 + seeded(plotIndex + spineIndex + 750) * .16,
          .025
        );
      }
    });

    for (let apertureIndex = 0; apertureIndex < 3; apertureIndex += 1) {
      const apertureRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI * .5, 0, 0));
      addBioInstance(
        "rib",
        new THREE.Vector3(
          -18 + apertureIndex * 18,
          .14,
          (apertureIndex % 2 ? 2.6 : -2.6)
        ),
        apertureRotation,
        new THREE.Vector3(
          1.4 + seeded(850 + apertureIndex) * 1.8,
          1.4 + seeded(850 + apertureIndex) * 1.8,
          1
        ),
        .82 + seeded(860 + apertureIndex) * .1,
        .07
      );
    }

    if (symbolEntries.length) {
      symbolEntries.sort((a, b) => a.threshold - b.threshold);
      const symbolGeometry = new THREE.PlaneGeometry(1, 1);
      const symbolIndices = new Float32Array(symbolEntries.length);
      const symbolColors = new Float32Array(symbolEntries.length * 3);
      symbolEntries.forEach((entry, index) => {
        symbolIndices[index] = entry.symbol;
        symbolColors[index * 3] = entry.color.r;
        symbolColors[index * 3 + 1] = entry.color.g;
        symbolColors[index * 3 + 2] = entry.color.b;
      });
      symbolGeometry.setAttribute(
        "aSymbol",
        new THREE.InstancedBufferAttribute(symbolIndices, 1)
      );
      symbolGeometry.setAttribute(
        "aSymbolColor",
        new THREE.InstancedBufferAttribute(symbolColors, 3)
      );
      const symbolMesh = new THREE.InstancedMesh(
        symbolGeometry,
        this.citySymbolMaterial,
        symbolEntries.length
      );
      symbolMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      symbolEntries.forEach((entry, index) => {
        this.cityBioMatrixDummy.position.copy(entry.position);
        this.cityBioMatrixDummy.quaternion.copy(entry.quaternion);
        this.cityBioMatrixDummy.scale.copy(entry.scale).multiplyScalar(.0001);
        this.cityBioMatrixDummy.updateMatrix();
        symbolMesh.setMatrixAt(index, this.cityBioMatrixDummy.matrix);
      });
      symbolMesh.instanceMatrix.needsUpdate = true;
      symbolMesh.frustumCulled = false;
      bioGroup.add(symbolMesh);
      chunk.userData.bioInstances.push({ mesh: symbolMesh, entries: symbolEntries });
    }

    Object.values(instanceSets).forEach((set) => {
      if (!set.entries.length) return;
      set.entries.sort((a, b) => a.threshold - b.threshold);
      const mesh = new THREE.InstancedMesh(set.geometry, set.material, set.entries.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      set.entries.forEach((entry, index) => {
        this.cityBioMatrixDummy.position.copy(entry.position);
        this.cityBioMatrixDummy.quaternion.copy(entry.quaternion);
        this.cityBioMatrixDummy.scale.copy(entry.scale).multiplyScalar(.0001);
        this.cityBioMatrixDummy.updateMatrix();
        mesh.setMatrixAt(index, this.cityBioMatrixDummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      bioGroup.add(mesh);
      chunk.userData.bioInstances.push({ mesh, entries: set.entries });
    });

    const arteryPairs = [[0, 3], [1, 2]];
    arteryPairs.forEach(([fromIndex, toIndex], arteryIndex) => {
      const from = chunk.userData.bioBuildings[fromIndex];
      const to = chunk.userData.bioBuildings[toIndex];
      if (!from || !to) return;

      const center = new THREE.Vector3(0, 0, 0);
      const fromPosition = new THREE.Vector3(from.mesh.position.x, 0, from.mesh.position.z);
      const toPosition = new THREE.Vector3(to.mesh.position.x, 0, to.mesh.position.z);
      const fromInset = center.clone().sub(fromPosition).normalize()
        .multiplyScalar(Math.min(from.width, from.depth) * .46);
      const toInset = center.clone().sub(toPosition).normalize()
        .multiplyScalar(Math.min(to.width, to.depth) * .46);
      const arteryStart = fromPosition.clone().add(fromInset);
      const arteryEnd = toPosition.clone().add(toInset);
      arteryStart.y = .2;
      arteryEnd.y = .2;
      const arteryLift = 1.15 + seeded(780 + arteryIndex) * 1.25;
      const arteryCurve = new THREE.CatmullRomCurve3([
        arteryStart,
        new THREE.Vector3(
          lerp(arteryStart.x, arteryEnd.x, .22),
          .42 + arteryLift * .32,
          lerp(arteryStart.z, arteryEnd.z, .22) + (arteryIndex ? -1.8 : 1.8)
        ),
        new THREE.Vector3(
          lerp(arteryStart.x, arteryEnd.x, .5),
          arteryLift,
          lerp(arteryStart.z, arteryEnd.z, .5)
        ),
        new THREE.Vector3(
          lerp(arteryStart.x, arteryEnd.x, .78),
          .38 + arteryLift * .28,
          lerp(arteryStart.z, arteryEnd.z, .78) + (arteryIndex ? 1.5 : -1.5)
        ),
        arteryEnd
      ]);
      const arteryRadius = .24 + seeded(785 + arteryIndex) * .16;
      const artery = new THREE.Mesh(
        new THREE.TubeGeometry(arteryCurve, 42, arteryRadius, 9, false),
        this.cityFleshMaterial
      );
      registerBioMesh(artery, .72 + seeded(786 + arteryIndex) * .11, .045);

      [arteryStart, arteryEnd].forEach((point, anchorIndex) => {
        const anchor = new THREE.Mesh(
          new THREE.SphereGeometry(1, 10, 7),
          this.cityFleshMaterial
        );
        anchor.position.copy(point);
        anchor.position.y = .13;
        anchor.scale.set(
          arteryRadius * (2.6 + seeded(790 + anchorIndex) * .8),
          arteryRadius * 1.25,
          arteryRadius * (2.7 + seeded(794 + anchorIndex) * .7)
        );
        registerBioMesh(anchor, .69 + seeded(798 + anchorIndex) * .09, .032);
      });

      const filamentPositions = [];
      const arteryPoints = arteryCurve.getPoints(14);
      arteryPoints.slice(1, -1).forEach((point, filamentIndex) => {
        const sideSign = filamentIndex % 2 ? 1 : -1;
        const direction = arteryPoints[Math.min(arteryPoints.length - 1, filamentIndex + 2)]
          .clone().sub(point).setY(0).normalize();
        const lateral = new THREE.Vector3(-direction.z, 0, direction.x);
        if (filamentIndex % 3 === 0) {
          const attachedIndex = Math.min(arteryPoints.length - 2, filamentIndex + 4);
          const attached = arteryPoints[attachedIndex].clone();
          const sag = point.clone().lerp(attached, .5);
          sag.addScaledVector(lateral, sideSign * (1.1 + seeded(810 + filamentIndex) * 1.5));
          sag.y = Math.max(.08, Math.min(point.y, attached.y) - (.28 + seeded(820 + filamentIndex) * .48));
          filamentPositions.push(
            point.x, point.y, point.z,
            sag.x, sag.y, sag.z,
            sag.x, sag.y, sag.z,
            attached.x, attached.y, attached.z
          );
        } else {
          const reach = 2.8 + seeded(830 + filamentIndex) * 5.6;
          const endPoint = point.clone()
            .addScaledVector(lateral, sideSign * reach)
            .addScaledVector(direction, (seeded(840 + filamentIndex) - .5) * 3.2);
          endPoint.y = .065;
          const middle = point.clone().lerp(endPoint, .48);
          middle.y = Math.max(.07, point.y * .34);
          middle.x += (seeded(850 + filamentIndex) - .5) * 1.1;
          middle.z += (seeded(860 + filamentIndex) - .5) * 1.1;
          filamentPositions.push(
            point.x, point.y, point.z,
            middle.x, middle.y, middle.z,
            middle.x, middle.y, middle.z,
            endPoint.x, endPoint.y, endPoint.z
          );
        }
      });
      const filamentGeometry = new THREE.BufferGeometry();
      filamentGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(filamentPositions, 3)
      );
      const filaments = new THREE.LineSegments(filamentGeometry, this.cityCapillaryMaterial);
      registerBioMesh(filaments, .76 + seeded(870 + arteryIndex) * .08, .014);
    });


    const drainMaterial = new THREE.MeshStandardMaterial({ color: 0x090c0f, roughness: .54, metalness: .76 });
    for (let detailIndex = 0; detailIndex < 3; detailIndex += 1) {
      const puddle = new THREE.Mesh(
        new THREE.CircleGeometry(1.1 + seeded(180 + detailIndex) * 1.5, 18),
        this.cityWetMaterial
      );
      puddle.rotation.x = -Math.PI / 2;
      puddle.scale.y = .42 + seeded(190 + detailIndex) * .45;
      puddle.position.set(
        -24 + seeded(200 + detailIndex) * 48,
        .018,
        detailIndex % 2 ? 2.7 : -2.7
      );
      detailGroup.add(puddle);
    }

    const manhole = new THREE.Mesh(new THREE.CylinderGeometry(.72, .72, .045, 24), drainMaterial);
    manhole.position.set(-13 + seeded(220) * 26, .015, 1.9);
    detailGroup.add(manhole);
    for (let drainIndex = 0; drainIndex < 4; drainIndex += 1) {
      const drain = new THREE.Mesh(new THREE.BoxGeometry(1.15, .035, .32), drainMaterial);
      drain.position.set(drainIndex % 2 ? -5.25 : 5.25, .025, drainIndex < 2 ? -18 : 18);
      detailGroup.add(drain);
    }

    const binMaterial = new THREE.MeshStandardMaterial({ color: 0x14201d, roughness: .76, metalness: .28 });
    [-1, 1].forEach((side, detailIndex) => {
      const bin = new THREE.Mesh(new THREE.BoxGeometry(.82, 1.12, .74), binMaterial);
      bin.position.set(side * 7.2, .68, side * (10.5 + seeded(240 + detailIndex) * 8));
      detailGroup.add(bin);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(.9, .1, .8), this.cityMetalMaterial);
      lid.position.set(bin.position.x, 1.27, bin.position.z);
      lid.rotation.z = side * .06;
      detailGroup.add(lid);
    });
    const hydrant = new THREE.Group();
    const hydrantMaterial = new THREE.MeshStandardMaterial({ color: 0x6f1d18, roughness: .58, metalness: .32 });
    const hydrantBody = new THREE.Mesh(new THREE.CylinderGeometry(.18, .22, .72, 10), hydrantMaterial);
    hydrantBody.position.y = .48;
    const hydrantTop = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 7), hydrantMaterial);
    hydrantTop.position.y = .84;
    hydrant.add(hydrantBody, hydrantTop);
    hydrant.position.set(-6.6, 0, 12.4);
    detailGroup.add(hydrant);

    const crosswalkMaterial = new THREE.MeshBasicMaterial({ color: 0x747878, transparent: true, opacity: .48 });
    for (let stripe = -4; stripe <= 4; stripe += 1) {
      const crosswalk = new THREE.Mesh(
        new THREE.PlaneGeometry(.5, 3.8),
        crosswalkMaterial
      );
      crosswalk.rotation.x = -Math.PI / 2;
      crosswalk.position.set(stripe * .9, .019, 6.1);
      detailGroup.add(crosswalk);
    }

    const patchMaterial = new THREE.MeshStandardMaterial({
      color: 0x11151a,
      roughness: .96,
      bumpMap: this.cityRoadReliefTexture,
      bumpScale: .24
    });
    for (let patchIndex = 0; patchIndex < 3; patchIndex += 1) {
      const patch = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4 + seeded(270 + patchIndex) * 3.2, 1.2 + seeded(280 + patchIndex) * 1.8),
        patchMaterial
      );
      patch.rotation.x = -Math.PI / 2;
      patch.rotation.z = seeded(290 + patchIndex) * .8;
      patch.position.set(
        -23 + seeded(300 + patchIndex) * 46,
        .021,
        patchIndex % 2 ? 2.25 : -2.25
      );
      detailGroup.add(patch);
    }

    const bench = new THREE.Group();
    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(2.25, .12, .56), this.cityRoofMaterial);
    benchSeat.position.y = .62;
    const benchBack = new THREE.Mesh(new THREE.BoxGeometry(2.25, .78, .1), this.cityRoofMaterial);
    benchBack.position.set(0, .94, .27);
    const benchLegA = new THREE.Mesh(new THREE.BoxGeometry(.12, .62, .42), this.cityMetalMaterial);
    benchLegA.position.set(-.78, .31, 0);
    const benchLegB = benchLegA.clone();
    benchLegB.position.x = .78;
    bench.add(benchSeat, benchBack, benchLegA, benchLegB);
    bench.position.set(10.4, 0, -6.8);
    bench.rotation.y = Math.PI * .5;
    detailGroup.add(bench);

    const newsBox = new THREE.Mesh(
      new THREE.BoxGeometry(.72, 1.05, .58),
      new THREE.MeshStandardMaterial({ color: 0x273747, roughness: .55, metalness: .42 })
    );
    newsBox.position.set(7.25, .65, -11.2);
    detailGroup.add(newsBox);

    const trafficLight = new THREE.Group();
    const signalPole = new THREE.Mesh(new THREE.CylinderGeometry(.065, .085, 4.2, 8), this.cityMetalMaterial);
    signalPole.position.y = 2.1;
    const signalBox = new THREE.Mesh(new THREE.BoxGeometry(.48, 1.28, .42), this.cityMetalMaterial);
    signalBox.position.set(0, 3.65, 0);
    const signalRed = new THREE.Mesh(new THREE.SphereGeometry(.105, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3327, toneMapped: false }));
    signalRed.position.set(0, 3.98, .23);
    const signalAmber = new THREE.Mesh(new THREE.SphereGeometry(.105, 8, 6), new THREE.MeshBasicMaterial({ color: 0x573d12, toneMapped: false }));
    signalAmber.position.set(0, 3.65, .23);
    const signalGreen = new THREE.Mesh(new THREE.SphereGeometry(.105, 8, 6), new THREE.MeshBasicMaterial({ color: 0x163522, toneMapped: false }));
    signalGreen.position.set(0, 3.32, .23);
    trafficLight.add(signalPole, signalBox, signalRed, signalAmber, signalGreen);
    trafficLight.position.set(6.25, 0, 6.25);
    detailGroup.add(trafficLight);

    const markingMaterial = new THREE.MeshBasicMaterial({ color: 0xb9a66d, toneMapped: false });
    for (let offset = -27; offset <= 27; offset += 8) {
      const lineX = new THREE.Mesh(new THREE.PlaneGeometry(3.7, .075), markingMaterial);
      lineX.rotation.x = -Math.PI / 2;
      lineX.position.set(offset, .012, 0);
      const lineZ = lineX.clone();
      lineZ.rotation.z = Math.PI / 2;
      lineZ.position.set(0, .013, offset);
      chunk.add(lineX, lineZ);
    }

    const addLamp = (x, z, lightIndex) => {
      const lamp = new THREE.Group();
      lamp.position.set(x, 0, z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.055, .078, 4.9, 8), this.cityMetalMaterial);
      pole.position.y = 2.47;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, .075, .075), this.cityMetalMaterial);
      arm.position.set(x > 0 ? -.48 : .48, 4.82, 0);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.21, 12, 8), this.cityLampMaterial);
      bulb.position.set(x > 0 ? -.94 : .94, 4.72, 0);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.cityLampGlowTexture,
        color: 0xffd69a,
        transparent: true,
        opacity: .78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: true
      }));
      halo.position.copy(bulb.position);
      halo.scale.set(3.8, 3.8, 1);
      lamp.add(pole, arm, bulb, halo);
      if ((gridX + gridZ + lightIndex + 20) % 4 === 0) {
        const light = new THREE.PointLight(0xffc77d, 31, 22, 1.55);
        light.position.copy(bulb.position);
        lamp.add(light);
      }
      chunk.add(lamp);
    };
    addLamp(-6.1, -8.2, 0);
    addLamp(6.1, 8.2, 1);
    addLamp(-8.2, 6.1, 2);
    addLamp(8.2, -6.1, 3);

    const carColors = [0x182331, 0x35151a, 0x171a1e, 0x20283a];
    for (let carIndex = 0; carIndex < 3; carIndex += 1) {
      const car = new THREE.Group();
      const horizontal = carIndex % 2 === 0;
      const lane = carIndex === 2 ? -3.1 : 3.1;
      const along = -22 + seeded(carIndex + 120) * 44;
      car.position.set(horizontal ? along : lane, .34, horizontal ? lane : along);
      if (!horizontal) car.rotation.y = Math.PI / 2;
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(3.1, .55, 1.45),
        new THREE.MeshStandardMaterial({ color: carColors[(carIndex + gridX - gridZ + 20) % carColors.length], roughness: .42, metalness: .56 })
      );
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, .5, 1.25), this.cityRoofMaterial);
      cabin.position.set(-.15, .46, 0);
      const tail = new THREE.Mesh(new THREE.PlaneGeometry(.36, .16), new THREE.MeshBasicMaterial({ color: 0xff2c24, toneMapped: false }));
      tail.rotation.y = -Math.PI / 2;
      tail.position.set(1.56, .06, 0);
      const headlight = new THREE.Mesh(new THREE.PlaneGeometry(.48, .16), new THREE.MeshBasicMaterial({ color: 0xe8f4ff, toneMapped: false }));
      headlight.rotation.y = Math.PI / 2;
      headlight.position.set(-1.56, .06, 0);
      const wheelGeometry = new THREE.CylinderGeometry(.27, .27, .14, 10);
      [-.92, .92].forEach((wheelX) => {
        [-.72, .72].forEach((wheelZ) => {
          const wheel = new THREE.Mesh(wheelGeometry, drainMaterial);
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(wheelX, -.24, wheelZ);
          car.add(wheel);
        });
      });
      car.add(body, cabin, tail, headlight);
      detailGroup.add(car);
    }

    return chunk;
  }

  isCityWalkBlocked(x, z) {
    if (!this.cityChunks?.length) return false;
    const radius = .58;
    return this.cityChunks.some((chunk) => {
      const localX = x - chunk.position.x;
      const localZ = z - chunk.position.z;
      return chunk.userData.colliders.some((box) =>
        Math.abs(localX - box.x) < box.halfWidth + radius
        && Math.abs(localZ - box.z) < box.halfDepth + radius
      );
    });
  }

  updateCityBiomech(delta) {
    const startDistance = 100;
    const mutationDistance = Math.max(0, this.cityTravelDistance - startDistance);
    const endlessProgress = this.cityForwardTime >= 480
      ? 1
      : 1 - Math.exp(-mutationDistance / 650);
    this.cityBiomechTarget = endlessProgress;
    this.cityBiomechProgress = damp(this.cityBiomechProgress, endlessProgress, .82, delta);
    const progress = this.cityBiomechProgress;
    const heartbeat = .5 + .5 * Math.sin(this.elapsed * 1.72);
    const deepPulse = .5 + .5 * Math.sin(this.elapsed * .83 + 1.4);

    this.cityScene.background.lerpColors(this.cityBaseBackground, this.cityBioBackground, progress);
    this.cityScene.fog.color.lerpColors(this.cityBaseFog, this.cityBioFog, progress);
    this.cityScene.fog.density = lerp(.0155, .023, progress);
    this.cityHemisphereLight.color.lerpColors(
      this.cityBaseHemisphereColor,
      this.cityBioHemisphereColor,
      progress
    );
    this.cityHemisphereLight.groundColor.lerpColors(
      this.cityBaseGroundLightColor,
      this.cityBioGroundLightColor,
      progress
    );
    this.cityHemisphereLight.intensity = lerp(.62, .42 + heartbeat * .12, progress);
    this.cityMoonLight.color.lerpColors(
      this.cityBaseMoonColor,
      this.cityBioMoonColor,
      progress
    );
    this.cityMoonLight.intensity = lerp(1.28, .72 + deepPulse * .2, progress);
    this.cityLampMaterial.color.lerpColors(this.cityBaseLampColor, this.cityBioLampColor, progress * .78);
    if (this.cityStars) this.cityStars.material.opacity = lerp(.62, .06, progress);

    this.cityBuildingMaterials.forEach((material, index) => {
      material.color.lerpColors(
        material.userData.cityBaseColor,
        this.cityBioBuildingColors[index],
        progress
      );
      material.emissive.lerpColors(
        material.userData.cityBaseEmissive,
        this.cityBioBuildingEmissives[index],
        progress
      );
      material.emissiveIntensity = lerp(
        material.userData.cityBaseEmissiveIntensity,
        1.18 + heartbeat * .62,
        progress
      );
      material.roughness = lerp(.78, .47 + deepPulse * .06, progress);
      material.metalness = lerp(.14, .025, progress);
      material.bumpScale = progress * (.23 + heartbeat * .11);
    });

    this.cityAsphaltMaterial.color.lerpColors(
      this.cityAsphaltMaterial.userData.cityBaseColor,
      this.cityBioAsphaltColor,
      progress
    );
    this.cityAsphaltMaterial.bumpScale = lerp(.19, .55 + heartbeat * .11, progress);
    this.cityAsphaltMaterial.roughness = lerp(.78, .5 + deepPulse * .07, progress);
    this.cityPavementMaterial.color.lerpColors(
      this.cityPavementMaterial.userData.cityBaseColor,
      this.cityBioPavementColor,
      progress
    );
    this.cityPavementMaterial.bumpScale = lerp(.085, .24 + heartbeat * .04, progress);

    const groundReveal = clamp((progress - .035) / .34, 0, 1);
    const veinReveal = clamp((progress - .1) / .34, 0, 1);
    const fleshReveal = clamp((progress - .2) / .46, 0, 1);
    const membraneReveal = clamp((progress - .15) / .42, 0, 1);
    const boneReveal = clamp((progress - .48) / .4, 0, 1);
    this.cityBioGroundMaterial.opacity = groundReveal * .88;
    this.cityVeinMaterial.opacity = veinReveal * .96;
    this.cityVeinMaterial.emissiveIntensity = 1.05 + heartbeat * 1.15;
    this.cityCapillaryMaterial.opacity = veinReveal * (.46 + heartbeat * .28);
    this.cityFleshMaterial.opacity = fleshReveal * .98;
    this.cityFleshMaterial.clearcoat = .2 + heartbeat * .18;
    this.cityMembraneMaterial.opacity = membraneReveal * .78;
    this.cityLivingWindowMaterial.opacity = membraneReveal * .94;
    this.cityLivingWindowMaterial.emissiveIntensity = .72 + heartbeat * 1.45;
    this.cityBoneMaterial.opacity = boneReveal * .86;
    this.citySymbolMaterial.uniforms.uTime.value = this.elapsed;
    this.citySymbolMaterial.uniforms.uOpacity.value = clamp((progress - .18) / .58, 0, 1);

    this.cityChunks.forEach((chunk) => {
      const bioGroup = chunk.userData.bioGroup;
      if (!bioGroup) return;
      const distanceX = chunk.position.x - this.freeCameraPosition.x;
      const distanceZ = chunk.position.z - this.freeCameraPosition.z;
      const nearby = distanceX * distanceX + distanceZ * distanceZ < 128 * 128;
      bioGroup.visible = progress > .002 && nearby;
      if (!bioGroup.visible) return;
      chunk.userData.bioPulseMeshes.forEach((mesh) => {
        const threshold = mesh.userData.bioThreshold;
        const revealRaw = clamp((progress - threshold) / .2, 0, 1);
        const reveal = revealRaw * revealRaw * (3 - 2 * revealRaw);
        mesh.visible = reveal > .002;
        if (!mesh.visible) return;
        const base = mesh.userData.bioBaseScale;
        const pulseAmount = mesh.userData.bioPulseAmount;
        const pulse = 1 + Math.sin(this.elapsed * 1.72 + mesh.userData.bioPulsePhase)
          * pulseAmount * progress * reveal;
        const softVerticalPulse = 1 + (pulse - 1) * .42;
        mesh.scale.set(
          base.x * reveal * pulse,
          base.y * reveal * softVerticalPulse,
          base.z * reveal * pulse
        );
      });

      chunk.userData.bioInstances.forEach((batch) => {
        let visibleCount = 0;
        for (let index = 0; index < batch.entries.length; index += 1) {
          const entry = batch.entries[index];
          const revealRaw = clamp((progress - entry.threshold) / .19, 0, 1);
          if (revealRaw <= .001) break;
          const reveal = revealRaw * revealRaw * (3 - 2 * revealRaw);
          const pulse = 1 + Math.sin(this.elapsed * 1.72 + entry.phase)
            * entry.pulseAmount * progress * reveal;
          this.cityBioMatrixDummy.position.copy(entry.position);
          this.cityBioMatrixDummy.quaternion.copy(entry.quaternion);
          this.cityBioMatrixDummy.scale.set(
            entry.scale.x * reveal * pulse,
            entry.scale.y * reveal * (1 + (pulse - 1) * .46),
            entry.scale.z * reveal * pulse
          );
          this.cityBioMatrixDummy.updateMatrix();
          batch.mesh.setMatrixAt(visibleCount, this.cityBioMatrixDummy.matrix);
          visibleCount += 1;
        }
        batch.mesh.count = visibleCount;
        if (visibleCount > 0) batch.mesh.instanceMatrix.needsUpdate = true;
      });

      const architectureReveal = clamp((progress - .18) / .72, 0, 1);
      chunk.userData.bioBuildings.forEach((record) => {
        const breath = Math.sin(this.elapsed * .84 + record.phase);
        const twitch = Math.sin(this.elapsed * 1.73 + record.phase * 1.7);
        record.mesh.scale.set(
          record.baseScale.x * (1 + breath * .018 * architectureReveal),
          record.baseScale.y * (1 + twitch * .009 * architectureReveal),
          record.baseScale.z * (1 - breath * .016 * architectureReveal)
        );
        record.mesh.position.y = record.baseY + breath * .055 * architectureReveal;
        record.mesh.rotation.y = record.baseRotationY + twitch * .005 * architectureReveal;
      });
    });
  }

  updateEndlessCity() {
    if (!this.cityChunks?.length) return;
    const span = this.cityChunkSize * this.cityChunkGrid;
    const halfSpan = span * .5;
    this.cityChunks.forEach((chunk) => {
      while (chunk.position.x - this.freeCameraPosition.x > halfSpan) chunk.position.x -= span;
      while (chunk.position.x - this.freeCameraPosition.x < -halfSpan) chunk.position.x += span;
      while (chunk.position.z - this.freeCameraPosition.z > halfSpan) chunk.position.z -= span;
      while (chunk.position.z - this.freeCameraPosition.z < -halfSpan) chunk.position.z += span;
      if (chunk.userData.details) {
        const detailDx = chunk.position.x - this.freeCameraPosition.x;
        const detailDz = chunk.position.z - this.freeCameraPosition.z;
        chunk.userData.details.visible = detailDx * detailDx + detailDz * detailDz < 112 * 112;
      }
    });
    if (this.cityStars) {
      this.cityStars.position.x = this.freeCameraPosition.x;
      this.cityStars.position.z = this.freeCameraPosition.z;
    }
  }

  createCitySymbolMesh(entries, material) {
    if (!entries.length) return null;
    const geometry = new THREE.PlaneGeometry(1, 1);
    const symbolIndices = new Float32Array(entries.length);
    const symbolColors = new Float32Array(entries.length * 3);
    entries.forEach((entry, index) => {
      symbolIndices[index] = entry.symbol;
      symbolColors[index * 3] = entry.color.r;
      symbolColors[index * 3 + 1] = entry.color.g;
      symbolColors[index * 3 + 2] = entry.color.b;
    });
    geometry.setAttribute("aSymbol", new THREE.InstancedBufferAttribute(symbolIndices, 1));
    geometry.setAttribute("aSymbolColor", new THREE.InstancedBufferAttribute(symbolColors, 3));
    const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
    entries.forEach((entry, index) => {
      this.cityBioMatrixDummy.position.copy(entry.position);
      this.cityBioMatrixDummy.quaternion.copy(entry.quaternion);
      this.cityBioMatrixDummy.scale.copy(entry.scale);
      this.cityBioMatrixDummy.updateMatrix();
      mesh.setMatrixAt(index, this.cityBioMatrixDummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }

  drawCityEmoji(state = 0, bloodProgress = 0) {
    if (!this.cityEmojiContext || !this.cityEmojiTexture) return;
    const context = this.cityEmojiContext;
    context.clearRect(0, 0, 256, 256);
    context.save();
    context.shadowColor = state === 5 ? "rgba(130,0,18,.72)" : "rgba(255,210,66,.65)";
    context.shadowBlur = 18;

    const faceGradient = context.createRadialGradient(104, 88, 12, 128, 128, 103);
    if (state === 5) {
      faceGradient.addColorStop(0, "#b5ad91");
      faceGradient.addColorStop(.58, "#716c5e");
      faceGradient.addColorStop(1, "#292722");
    } else {
      faceGradient.addColorStop(0, "#fff07d");
      faceGradient.addColorStop(.52, "#f7bb28");
      faceGradient.addColorStop(1, "#a85b12");
    }
    context.fillStyle = faceGradient;
    context.beginPath();
    context.arc(128, 128, 92, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.lineWidth = 5;
    context.strokeStyle = state === 5 ? "#28221f" : "#744016";
    context.stroke();

    if (state === 5) {
      context.strokeStyle = "#211a18";
      context.lineWidth = 11;
      [[88, 103], [168, 103]].forEach(([x, y]) => {
        context.beginPath();
        context.moveTo(x - 13, y - 13);
        context.lineTo(x + 13, y + 13);
        context.moveTo(x + 13, y - 13);
        context.lineTo(x - 13, y + 13);
        context.stroke();
      });
      context.lineWidth = 8;
      context.beginPath();
      context.moveTo(91, 177);
      context.quadraticCurveTo(128, 163, 165, 177);
      context.stroke();
    } else {
      context.fillStyle = "#4b2b18";
      if (state >= 3) {
        context.lineWidth = 8;
        context.strokeStyle = "#4b2b18";
        [[90, 105], [166, 105]].forEach(([x, y]) => {
          context.beginPath();
          context.arc(x, y + 7, 17, Math.PI * 1.12, Math.PI * 1.88);
          context.stroke();
        });
      } else {
        context.beginPath();
        context.ellipse(91, 106, 10, state === 0 ? 16 : 12, 0, 0, Math.PI * 2);
        context.ellipse(165, 106, 10, state === 0 ? 16 : 12, 0, 0, Math.PI * 2);
        context.fill();
      }

      context.strokeStyle = "#5e3216";
      context.lineWidth = 8;
      context.lineCap = "round";
      context.beginPath();
      if (state === 0) {
        context.moveTo(84, 181);
        context.quadraticCurveTo(128, 141, 172, 181);
      } else if (state === 1) {
        context.moveTo(94, 170);
        context.lineTo(162, 170);
      } else if (state === 2) {
        context.moveTo(91, 161);
        context.quadraticCurveTo(128, 183, 165, 161);
      } else if (state === 3) {
        context.moveTo(82, 153);
        context.quadraticCurveTo(128, 197, 174, 153);
      } else {
        context.moveTo(76, 148);
        context.quadraticCurveTo(128, 207, 180, 148);
      }
      context.stroke();

      if (state === 0) {
        const tearGradient = context.createLinearGradient(0, 112, 0, 214);
        tearGradient.addColorStop(0, "rgba(185,235,255,.98)");
        tearGradient.addColorStop(1, "rgba(39,137,215,.35)");
        context.fillStyle = tearGradient;
        [[89, 113, -3], [167, 113, 3]].forEach(([x, y, bend]) => {
          context.beginPath();
          context.moveTo(x, y);
          context.bezierCurveTo(x - 14 + bend, y + 35, x - 11 + bend, y + 78, x, y + 99);
          context.bezierCurveTo(x + 15 + bend, y + 74, x + 16 + bend, y + 36, x, y);
          context.fill();
        });
      }
    }

    if (bloodProgress > 0) {
      context.save();
      context.globalCompositeOperation = "source-over";
      const drip = clamp(bloodProgress, 0, 1);
      const bloodGradient = context.createLinearGradient(0, 32, 0, 230);
      bloodGradient.addColorStop(0, "#7d0011");
      bloodGradient.addColorStop(.55, "#bd0820");
      bloodGradient.addColorStop(1, "#370006");
      context.fillStyle = bloodGradient;
      context.beginPath();
      context.moveTo(55, 45);
      context.bezierCurveTo(77, 31, 101, 42, 124, 34);
      context.bezierCurveTo(154, 25, 176, 42, 200, 48);
      context.lineTo(200, 62 + drip * 34);
      context.bezierCurveTo(184, 54 + drip * 68, 175, 76 + drip * 78, 164, 62 + drip * 112);
      context.bezierCurveTo(151, 86 + drip * 94, 137, 68 + drip * 138, 124, 59 + drip * 119);
      context.bezierCurveTo(106, 77 + drip * 86, 91, 66 + drip * 122, 79, 58 + drip * 98);
      context.bezierCurveTo(66, 72 + drip * 62, 59, 70 + drip * 44, 55, 45);
      context.fill();
      context.restore();
    }
    context.restore();
    this.cityEmojiTexture.needsUpdate = true;
  }

  spawnCityEmoji() {
    if (this.cityEmojiSpawned) return;
    this.cityEmojiSpawned = true;
    this.cityFinaleState = "emoji";
    this.cityBiomechTarget = 1;
    this.cityEmojiCanvas = document.createElement("canvas");
    this.cityEmojiCanvas.width = this.cityEmojiCanvas.height = 256;
    this.cityEmojiContext = this.cityEmojiCanvas.getContext("2d");
    this.cityEmojiTexture = new THREE.CanvasTexture(this.cityEmojiCanvas);
    this.cityEmojiTexture.colorSpace = THREE.SRGBColorSpace;
    this.cityEmojiTexture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.drawCityEmoji(0, 0);

    const direction = new THREE.Vector3(-Math.sin(this.freeYaw), 0, -Math.cos(this.freeYaw));
    const cardinal = Math.abs(direction.x) > Math.abs(direction.z)
      ? new THREE.Vector3(Math.sign(direction.x) || 1, 0, 0)
      : new THREE.Vector3(0, 0, Math.sign(direction.z) || -1);
    const candidate = this.freeCameraPosition.clone().addScaledVector(cardinal, 48);
    let spawnX = Math.round(candidate.x / this.cityChunkSize) * this.cityChunkSize;
    let spawnZ = Math.round(candidate.z / this.cityChunkSize) * this.cityChunkSize;
    const towardSpawn = new THREE.Vector3(
      spawnX - this.freeCameraPosition.x,
      0,
      spawnZ - this.freeCameraPosition.z
    );
    if (towardSpawn.dot(cardinal) < 20) {
      spawnX += cardinal.x * this.cityChunkSize;
      spawnZ += cardinal.z * this.cityChunkSize;
    }
    this.cityEmojiBasePosition = new THREE.Vector3(spawnX, 2.75, spawnZ);
    this.cityEmojiSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.cityEmojiTexture,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      toneMapped: false
    }));
    this.cityEmojiSprite.position.copy(this.cityEmojiBasePosition);
    this.cityEmojiSprite.scale.set(5.1, 5.1, 1);
    this.cityEmojiSprite.renderOrder = 12;
    this.cityScene.add(this.cityEmojiSprite);

    this.cityEmojiPrompt = document.createElement("button");
    this.cityEmojiPrompt.type = "button";
    this.cityEmojiPrompt.className = "door-prompt";
    this.cityEmojiPrompt.setAttribute("data-overlay-ui", "");
    this.cityEmojiPrompt.setAttribute("aria-hidden", "true");
    const key = document.createElement("kbd");
    key.textContent = "E";
    const label = document.createElement("span");
    label.textContent = "УДАРИТЬ";
    this.cityEmojiPrompt.append(key, label);
    this.cityEmojiPrompt.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.hitCityEmoji();
    });
    document.body.appendChild(this.cityEmojiPrompt);
  }

  updateCityEmojiPrompt() {
    if (!this.cityEmojiPrompt || !this.cityEmojiSprite) return;
    const toEmoji = this.cityEmojiSprite.position.clone().sub(this.camera.position);
    const facing = toEmoji.clone().normalize().dot(
      new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion)
    ) > .35;
    const distance = toEmoji.length();
    const active = this.cityFinaleState === "emoji"
      && this.cityEmojiHitCooldown <= 0
      && distance < 5.6
      && facing;
    this.cityEmojiPromptActive = active;
    this.cityEmojiPrompt.classList.toggle("is-visible", active);
    this.cityEmojiPrompt.setAttribute("aria-hidden", active ? "false" : "true");
    if (!active) return;
    // Keep the interaction prompt in the player's field of view, like the
    // corridor door prompt, instead of pinning it above the emoji's head.
    this.cityEmojiPrompt.style.left = "50%";
    this.cityEmojiPrompt.style.top = "68%";
  }

  playCityStrike() {
    const context = this.audioContext;
    if (!context || !this.audioMaster || context.state !== "running") return;
    const now = context.currentTime;
    const impact = context.createOscillator();
    const impactGain = context.createGain();
    impact.type = "sine";
    impact.frequency.setValueAtTime(104, now);
    impact.frequency.exponentialRampToValueAtTime(27, now + .52);
    impactGain.gain.setValueAtTime(.62, now);
    impactGain.gain.exponentialRampToValueAtTime(.0001, now + .58);
    impact.connect(impactGain);
    impactGain.connect(this.audioMaster);
    impact.start(now);
    impact.stop(now + .6);

    const crack = context.createOscillator();
    const crackGain = context.createGain();
    crack.type = "sawtooth";
    crack.frequency.setValueAtTime(188, now);
    crack.frequency.exponentialRampToValueAtTime(43, now + .18);
    crackGain.gain.setValueAtTime(.21, now);
    crackGain.gain.exponentialRampToValueAtTime(.0001, now + .25);
    crack.connect(crackGain);
    crackGain.connect(this.audioMaster);
    crack.start(now);
    crack.stop(now + .27);

    if (this.footstepBuffer) {
      const noise = context.createBufferSource();
      const noiseFilter = context.createBiquadFilter();
      const noiseGain = context.createGain();
      noise.buffer = this.footstepBuffer;
      noise.playbackRate.value = .42;
      noiseFilter.type = "lowpass";
      noiseFilter.frequency.value = 940;
      noiseGain.gain.setValueAtTime(.48, now);
      noiseGain.gain.exponentialRampToValueAtTime(.0001, now + .38);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.audioMaster);
      noise.start(now);
    }
  }

  infectNearbyCityBuilding(hitIndex) {
    if (!this.cityEmojiSprite) return;
    const candidates = [];
    this.cityChunks.forEach((chunk) => {
      chunk.userData.bioBuildings?.forEach((record) => {
        if (record.cityEmojiInfected) return;
        const worldX = chunk.position.x + record.mesh.position.x;
        const worldZ = chunk.position.z + record.mesh.position.z;
        candidates.push({
          chunk,
          record,
          distance: Math.hypot(
            worldX - this.cityEmojiSprite.position.x,
            worldZ - this.cityEmojiSprite.position.z
          )
        });
      });
    });
    candidates.sort((a, b) => a.distance - b.distance);
    const target = candidates[0];
    if (!target) return;
    target.record.cityEmojiInfected = true;

    const entries = [];
    const count = 76 + hitIndex * 42;
    const seedBase = target.record.mesh.position.x * 3.17
      + target.record.mesh.position.z * 7.31
      + hitIndex * 91.7;
    const seeded = (salt) => {
      const value = Math.sin(seedBase + salt * 73.17) * 43758.5453;
      return value - Math.floor(value);
    };
    for (let index = 0; index < count; index += 1) {
      const side = index % 4;
      const sideWidth = side < 2 ? target.record.width : target.record.depth;
      const u = (seeded(index + 1) - .5) * sideWidth * .88;
      const y = .9 + seeded(index + 2) * Math.max(3, target.record.height - 1.4);
      let position;
      let rotationY;
      if (side === 0) {
        position = new THREE.Vector3(target.record.mesh.position.x + u, y, target.record.mesh.position.z + target.record.depth * .505 + .08);
        rotationY = 0;
      } else if (side === 1) {
        position = new THREE.Vector3(target.record.mesh.position.x - u, y, target.record.mesh.position.z - target.record.depth * .505 - .08);
        rotationY = Math.PI;
      } else if (side === 2) {
        position = new THREE.Vector3(target.record.mesh.position.x + target.record.width * .505 + .08, y, target.record.mesh.position.z - u);
        rotationY = Math.PI * .5;
      } else {
        position = new THREE.Vector3(target.record.mesh.position.x - target.record.width * .505 - .08, y, target.record.mesh.position.z + u);
        rotationY = -Math.PI * .5;
      }
      entries.push({
        position,
        quaternion: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY),
        scale: new THREE.Vector3(.45 + seeded(index + 3) * 1.1, .45 + seeded(index + 4) * 1.1, 1),
        symbol: Math.floor(seeded(index + 5) * 32),
        color: new THREE.Color().setHSL(seeded(index + 6), .94, .58 + seeded(index + 7) * .23)
      });
    }
    const material = this.citySymbolMaterial.clone();
    material.uniforms.uAtlas.value = this.citySymbolMaterial.uniforms.uAtlas.value;
    material.uniforms.uOpacity.value = 1;
    const mesh = this.createCitySymbolMesh(entries, material);
    if (!mesh) return;
    target.chunk.userData.bioGroup.add(mesh);
    this.cityInfectedSymbolMeshes.push({
      mesh,
      material,
      phase: seeded(999) * Math.PI * 2,
      hitIndex
    });
  }

  hitCityEmoji() {
    if (!this.cityEmojiPromptActive
      || this.cityEmojiHitCooldown > 0
      || this.cityFinaleState !== "emoji") return;
    this.ensureAudio();
    this.cityEmojiHitCooldown = .82;
    this.cityEmojiHits += 1;
    this.cityEmojiShake = Math.min(1.8, 1.05 + this.cityEmojiHits * .13);
    this.playCityStrike();
    this.infectNearbyCityBuilding(this.cityEmojiHits);
    if (this.cityEmojiHits >= this.cityEmojiMaxHits) {
      this.cityFinaleState = "waiting";
      this.cityEmojiDeathTime = 0;
      this.drawCityEmoji(5, 0);
      this.cityEmojiPromptActive = false;
      this.cityEmojiPrompt?.classList.remove("is-visible");
    } else {
      this.drawCityEmoji(this.cityEmojiHits, 0);
    }
  }

  splitCityEmoji() {
    if (!this.cityEmojiSprite || this.cityEmojiFragments?.length) return;
    const source = this.cityEmojiCanvas;
    const origin = this.cityEmojiSprite.position.clone();
    const lateral = new THREE.Vector3(
      Math.cos(this.freeYaw),
      0,
      -Math.sin(this.freeYaw)
    );
    this.cityEmojiFragments = [0, 1].map((side) => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 256;
      const context = canvas.getContext("2d");
      context.drawImage(source, side * 128, 0, 128, 256, 0, 0, 128, 256);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(origin);
      sprite.scale.set(2.55, 5.1, 1);
      this.cityScene.add(sprite);
      return {
        sprite,
        material,
        texture,
        origin: origin.clone(),
        direction: lateral.clone().multiplyScalar(side ? 1 : -1),
        spin: side ? -1 : 1
      };
    });
    this.cityEmojiSprite.visible = false;
  }

  createCitySurfaceSymbols() {
    if (this.citySurfaceSymbolMesh || !this.citySymbolMaterial) return;
    const entries = [];
    const originX = this.freeCameraPosition.x;
    const originZ = this.freeCameraPosition.z;
    const flatRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const makeColor = (hue = Math.random()) => new THREE.Color().setHSL(hue, .96, random(.58, .82));
    for (let index = 0; index < 780; index += 1) {
      const angle = random(0, Math.PI * 2);
      const radius = Math.sqrt(Math.random()) * 150;
      const size = random(.32, 1.08);
      entries.push({
        position: new THREE.Vector3(
          originX + Math.cos(angle) * radius,
          .025 + Math.random() * .018,
          originZ + Math.sin(angle) * radius
        ),
        quaternion: flatRotation,
        scale: new THREE.Vector3(size, size, 1),
        symbol: Math.floor(Math.random() * 32),
        color: makeColor()
      });
    }
    (this.cityChunks || []).forEach((chunk) => {
      const chunkDistance = Math.hypot(
        chunk.position.x - originX,
        chunk.position.z - originZ
      );
      if (chunkDistance > 190) return;
      chunk.userData.bioBuildings?.forEach((building) => {
        const worldX = chunk.position.x + building.mesh.position.x;
        const worldZ = chunk.position.z + building.mesh.position.z;
        for (let index = 0; index < 10; index += 1) {
          const size = random(.42, 1.3);
          entries.push({
            position: new THREE.Vector3(
              worldX + random(-building.width * .38, building.width * .38),
              building.height + .32,
              worldZ + random(-building.depth * .38, building.depth * .38)
            ),
            quaternion: flatRotation,
            scale: new THREE.Vector3(size, size, 1),
            symbol: Math.floor(Math.random() * 32),
            color: makeColor()
          });
        }
      });
    });
    const material = this.citySymbolMaterial.clone();
    material.uniforms = THREE.UniformsUtils.clone(this.citySymbolMaterial.uniforms);
    material.uniforms.uAtlas.value = this.citySymbolMaterial.uniforms.uAtlas.value;
    material.uniforms.uOpacity.value = 0;
    const mesh = this.createCitySymbolMesh(entries, material);
    if (!mesh) return;
    mesh.renderOrder = 8;
    this.cityScene.add(mesh);
    this.citySurfaceSymbolMesh = mesh;
    this.citySurfaceSymbolMaterial = material;
  }

  createCityBloodSurface(direction) {
    if (this.cityBloodMesh) return;
    const geometry = new THREE.PlaneGeometry(900, 900, 112, 112);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDirection: { value: new THREE.Vector2(direction.x, direction.z).normalize() },
        uOrigin: { value: new THREE.Vector2(this.freeCameraPosition.x, this.freeCameraPosition.z) },
        uOpacity: { value: 1 }
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPosition;
        varying float vCrest;
        void main() {
          vec3 warped = position;
          vec4 baseWorld = modelMatrix * vec4(position, 1.0);
          float broad = sin(baseWorld.x * .055 + uTime * 1.65)
            + sin(baseWorld.z * .071 - uTime * 1.23);
          float detail = sin((baseWorld.x + baseWorld.z) * .19 + uTime * 2.8);
          float wave = broad * .19 + detail * .07;
          warped.z += wave;
          vec4 world = modelMatrix * vec4(warped, 1.0);
          vWorldPosition = world.xyz;
          vCrest = wave;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec2 uDirection;
        uniform vec2 uOrigin;
        uniform float uOpacity;
        varying vec3 vWorldPosition;
        varying float vCrest;
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        void main() {
          vec2 relative = vWorldPosition.xz - uOrigin;
          vec2 sideDirection = vec2(-uDirection.y, uDirection.x);
          float along = dot(relative, uDirection);
          float side = dot(relative, sideDirection);
          float front = 100.0 - uTime * 18.0;
          float edge = sin(side * .095 + uTime * 2.15) * 6.4
            + sin(side * .027 - uTime * 1.1) * 9.0;
          float coverage = smoothstep(front - 7.0 + edge, front + 2.2 + edge, along);
          if (coverage < .012) discard;
          float vein = sin(vWorldPosition.x * .29 + sin(vWorldPosition.z * .08) * 3.0 + uTime * .7);
          float grain = hash(floor(vWorldPosition.xz * 2.2));
          float crest = smoothstep(.12, .38, vCrest);
          vec3 deep = vec3(.075, .0025, .003);
          vec3 red = vec3(.42, .006, .008);
          vec3 highlight = vec3(.78, .055, .035);
          vec3 color = mix(deep, red, .42 + vein * .18 + grain * .1);
          color = mix(color, highlight, crest * .52);
          float foam = 1.0 - smoothstep(0.0, 9.0, abs(along - front - edge));
          color = mix(color, vec3(.88, .16, .10), foam * .58);
          gl_FragColor = vec4(color, coverage * uOpacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(this.freeCameraPosition.x, .04, this.freeCameraPosition.z);
    mesh.frustumCulled = false;
    mesh.renderOrder = 7;
    this.cityScene.add(mesh);
    this.cityBloodMesh = mesh;
    this.cityBloodMaterial = material;

    const light = new THREE.PointLight(0xb91812, 0, 95, 1.6);
    light.position.copy(this.freeCameraPosition);
    light.position.y = 7;
    this.cityScene.add(light);
    this.cityBloodLight = light;
  }

  playCityFloodArrival() {
    const context = this.audioContext;
    if (!context || !this.audioMaster) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(46, now);
    oscillator.frequency.exponentialRampToValueAtTime(25, now + 11);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.exponentialRampToValueAtTime(72, now + 11);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.32, now + 4.6);
    gain.gain.exponentialRampToValueAtTime(.0001, now + 12);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioMaster);
    oscillator.start(now);
    oscillator.stop(now + 12.1);
  }

  startCityBloodFlood() {
    if (this.cityFinaleState === "flood"
      || this.cityFinaleState === "sink"
      || this.cityFinaleState === "black") return;
    this.cityFinaleState = "flood";
    this.cityFloodTime = 0;
    this.cityFloodLevel = .04;
    this.cityFinaleLocksMovement = true;
    this.cityEmojiPromptActive = false;
    this.cityForwardTime = 480;
    this.cityTravelDistance = Math.max(this.cityTravelDistance, 4200);
    this.cityBiomechProgress = 1;
    this.cityBiomechTarget = 1;
    this.freeCameraVelocity.set(0, 0, 0);
    this.freeCameraKeys.clear();
    if (this.cityEmojiPrompt) this.cityEmojiPrompt.classList.remove("is-visible");

    const horizontal = new THREE.Vector3(-Math.sin(this.freeYaw), 0, -Math.cos(this.freeYaw));
    if (Math.abs(horizontal.x) > Math.abs(horizontal.z)) {
      horizontal.set(Math.sign(horizontal.x) || 1, 0, 0);
    } else {
      horizontal.set(0, 0, Math.sign(horizontal.z) || -1);
    }
    this.cityFloodDirection = horizontal;
    this.splitCityEmoji();
    this.createCitySurfaceSymbols();
    this.createCityBloodSurface(horizontal);
    this.playCityFloodArrival();
  }

  updateCityFinale(delta) {
    if (!this.cityEmojiSpawned
      && this.cityForwardTime >= 480
      && this.cityBiomechProgress > .96) {
      this.spawnCityEmoji();
    }
    if (!this.cityEmojiSpawned) return;

    this.cityEmojiHitCooldown = Math.max(0, this.cityEmojiHitCooldown - delta);
    this.cityInfectedSymbolMeshes.forEach((record) => {
      record.material.uniforms.uTime.value = this.elapsed;
      const hardBlink = Math.sin(this.elapsed * (5.2 + record.hitIndex * .37) + record.phase) > .66
        ? .28
        : 1;
      record.material.uniforms.uOpacity.value = (.62 + Math.sin(this.elapsed * 1.7 + record.phase) * .22) * hardBlink;
    });

    if (this.cityEmojiSprite?.visible) {
      const pulse = 1 + Math.sin(this.elapsed * 2.15) * .025;
      const hitBulge = 1 + this.cityEmojiShake * .08;
      this.cityEmojiSprite.position.y = this.cityEmojiBasePosition.y + Math.sin(this.elapsed * 1.3) * .13;
      this.cityEmojiSprite.scale.set(5.1 * pulse * hitBulge, 5.1 * pulse / hitBulge, 1);
    }
    this.updateCityEmojiPrompt();

    if (this.cityFinaleState === "waiting") {
      this.cityEmojiDeathTime += delta;
      const bloodFrame = Math.floor(this.cityEmojiDeathTime * 10);
      if (bloodFrame !== this.cityEmojiBloodFrame) {
        this.cityEmojiBloodFrame = bloodFrame;
        this.drawCityEmoji(5, clamp(this.cityEmojiDeathTime / 5.5, 0, 1));
      }
      if (this.cityEmojiDeathTime >= 15) this.startCityBloodFlood();
    }

    if (this.cityFinaleState === "flood") {
      this.cityFloodTime += delta;
      const floodTime = this.cityFloodTime;
      if (this.cityBloodMaterial) {
        this.cityBloodMaterial.uniforms.uTime.value = floodTime;
      }
      if (this.citySurfaceSymbolMaterial) {
        this.citySurfaceSymbolMaterial.uniforms.uTime.value = this.elapsed;
        this.citySurfaceSymbolMaterial.uniforms.uOpacity.value = clamp(floodTime / 4.2, 0, 1);
      }
      if (this.cityEmojiFragments) {
        const fragmentT = clamp(floodTime / 4.8, 0, 1);
        this.cityEmojiFragments.forEach((fragment) => {
          fragment.sprite.position.copy(fragment.origin)
            .addScaledVector(fragment.direction, fragmentT * fragmentT * 7.5);
          fragment.sprite.position.y = fragment.origin.y - fragmentT * fragmentT * 4.8;
          fragment.sprite.material.rotation = fragment.spin * fragmentT * 1.8;
          fragment.material.opacity = 1 - Math.pow(fragmentT, 1.7);
        });
      }

      const riseRaw = clamp((floodTime - 6) / 38, 0, 1);
      const rise = riseRaw * riseRaw * (3 - 2 * riseRaw);
      const waveBob = Math.sin(this.elapsed * 1.7) * .18 * rise;
      this.cityFloodLevel = .04 + rise * 72;
      if (this.cityBloodMesh) {
        this.cityBloodMesh.position.y = this.cityFloodLevel + waveBob;
      }
      const cameraHeight = Math.max(3.6, this.cityFloodLevel + 2.72 + waveBob * .35);
      this.freeCameraPosition.y = cameraHeight;
      this.camera.position.y = cameraHeight;
      this.camera.position.x += Math.sin(this.elapsed * 1.9) * .018 * rise;
      this.camera.rotation.z += Math.sin(this.elapsed * 1.25) * .012 * rise;
      if (this.cityBloodLight) {
        this.cityBloodLight.position.copy(this.camera.position);
        this.cityBloodLight.position.y = this.cityFloodLevel + 5;
        this.cityBloodLight.intensity = clamp((floodTime - 3.5) / 8, 0, 1) * 3.7;
      }
      const roofBlackout = clamp((this.cityFloodLevel - 50) / 22, 0, 1);
      if (this.transitionBlackout) {
        this.transitionBlackout.style.background = "#000";
        this.transitionBlackout.style.opacity = (roofBlackout * .78).toFixed(3);
      }
      if (floodTime >= 46) {
        this.cityFinaleState = "sink";
        this.citySinkTime = 0;
        this.citySinkStartY = this.camera.position.y;
      }
    } else if (this.cityFinaleState === "sink") {
      this.citySinkTime += delta;
      const sinkTime = this.citySinkTime;
      const sinkingY = this.citySinkStartY - sinkTime * sinkTime * 17;
      this.camera.position.y = sinkingY;
      this.freeCameraPosition.y = sinkingY;
      if (this.cityBloodLight) {
        this.cityBloodLight.intensity = Math.max(0, 3.5 - sinkTime * 1.3);
        this.cityBloodLight.position.y = sinkingY + 1;
      }
      if (this.transitionBlackout) {
        this.transitionBlackout.style.background = "#000";
        this.transitionBlackout.style.opacity = clamp(.78 + sinkTime * .12, 0, 1).toFixed(3);
      }
      if (sinkTime >= 2.2) {
        this.cityFinaleState = "black";
        if (this.transitionBlackout) this.transitionBlackout.style.opacity = "1";
      }
    } else if (this.cityFinaleState === "black") {
      if (this.transitionBlackout) {
        this.transitionBlackout.style.background = "#000";
        this.transitionBlackout.style.opacity = "1";
      }
      this.freeCameraVelocity.set(0, 0, 0);
    }

    if (this.cityEmojiShake > .001) {
      const shake = this.cityEmojiShake;
      this.camera.position.x += (Math.random() - .5) * .24 * shake;
      this.camera.position.y += (Math.random() - .5) * .18 * shake;
      this.camera.rotation.z += (Math.random() - .5) * .045 * shake;
      this.cityEmojiShake = damp(this.cityEmojiShake, 0, 4.2, delta);
    }
  }

  enterCityWorld() {
    if (this.cityMode) return;
    document.body.classList.remove("is-sky-mode");
    this.cityMode = true;
    this.cityLanded = false;
    this.cityLandingTime = 0;
    this.cityImpactPlayed = false;
    this.cityTravelDistance = 0;
    this.cityBiomechProgress = 0;
    this.cityBiomechTarget = 0;
    this.cityForwardTime = 0;
    this.cityEmojiSpawned = false;
    this.cityEmojiHits = 0;
    this.cityEmojiPromptActive = false;
    this.cityEmojiHitCooldown = 0;
    this.cityEmojiShake = 0;
    this.cityEmojiDeathTime = 0;
    this.cityFinaleState = "dormant";
    this.cityFinaleLocksMovement = false;
    this.cityInfectedSymbolMeshes = [];
    this.scene.visible = false;
    this.renderer.shadowMap.enabled = true;
    this.camera.near = .1;
    this.camera.far = 420;
    this.camera.position.set(0, 34, 14);
    this.freeCameraPosition.set(0, 3.6, 14);
    this.freeCameraVelocity.set(0, 0, 0);
    this.glitch = 0;
    this.nextGlitch = this.elapsed + random(2.4, 5.2);
    this.postMaterial.uniforms.glitch.value = 0;
    document.documentElement.style.setProperty("--glitch-opacity", "0");
    document.documentElement.style.setProperty("--glitch-x", "0px");
    const roomScreenEffects = document.querySelector(".screen-effects");
    if (roomScreenEffects) roomScreenEffects.style.display = "";
    if (this.transitionBlackout) {
      this.transitionBlackout.style.background = "#000";
      this.transitionBlackout.style.opacity = "1";
    }
  }

  playCityImpact() {
    const context = this.audioContext;
    if (!context || !this.audioMaster) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(92, now);
    oscillator.frequency.exponentialRampToValueAtTime(31, now + .42);
    gain.gain.setValueAtTime(.32, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .48);
    oscillator.connect(gain);
    gain.connect(this.audioMaster);
    oscillator.start(now);
    oscillator.stop(now + .5);
    if (this.footstepBuffer) {
      const debris = context.createBufferSource();
      const debrisGain = context.createGain();
      debris.buffer = this.footstepBuffer;
      debris.playbackRate.value = .48;
      debrisGain.gain.setValueAtTime(.22, now);
      debrisGain.gain.exponentialRampToValueAtTime(.0001, now + .7);
      debris.connect(debrisGain);
      debrisGain.connect(this.audioMaster);
      debris.start(now);
    }
  }

  updateCityCamera(delta) {
    this.cityLandingTime += delta;
    if (!this.cityLanded) {
      const t = this.cityLandingTime;
      this.camera.position.y = Math.max(3.62, 34 - t * t * 16.5);
      this.camera.position.x = Math.sin(t * 1.4) * .3;
      this.camera.rotation.order = "YXZ";
      this.camera.rotation.set(this.freePitch, this.freeYaw, Math.sin(t * 5.4) * .008);
      if (this.transitionBlackout) this.transitionBlackout.style.opacity = clamp(1 - t * 2.6, 0, 1).toFixed(3);
      if (this.camera.position.y <= 3.63) {
        this.cityLanded = true;
        this.freeCameraPosition.copy(this.camera.position);
        this.freeCameraPosition.y = 3.6;
        if (!this.cityImpactPlayed) {
          this.cityImpactPlayed = true;
          this.playCityImpact();
        }
      }
      return;
    }

    const forward = new THREE.Vector3(-Math.sin(this.freeYaw), 0, -Math.cos(this.freeYaw));
    const right = new THREE.Vector3(Math.cos(this.freeYaw), 0, -Math.sin(this.freeYaw));
    const input = new THREE.Vector3();
    if (!this.cityFinaleLocksMovement) {
      if (this.freeCameraKeys.has("KeyW")) input.add(forward);
      if (this.freeCameraKeys.has("KeyS")) input.sub(forward);
      if (this.freeCameraKeys.has("KeyD")) input.add(right);
      if (this.freeCameraKeys.has("KeyA")) input.sub(right);
    }
    const running = this.freeCameraKeys.has("ShiftLeft") || this.freeCameraKeys.has("ShiftRight");
    const forwardIntent = input.lengthSq() > 0
      && input.clone().normalize().dot(forward) > .55;
    const desired = input.lengthSq() ? input.normalize().multiplyScalar(running ? 6.2 : 3.5) : input;
    this.freeCameraVelocity.x = damp(this.freeCameraVelocity.x, desired.x, 10, delta);
    this.freeCameraVelocity.z = damp(this.freeCameraVelocity.z, desired.z, 10, delta);
    const previousCityX = this.freeCameraPosition.x;
    const previousCityZ = this.freeCameraPosition.z;
    const nextCityX = this.freeCameraPosition.x + this.freeCameraVelocity.x * delta;
    const nextCityZ = this.freeCameraPosition.z + this.freeCameraVelocity.z * delta;
    if (!this.isCityWalkBlocked(nextCityX, this.freeCameraPosition.z)) {
      this.freeCameraPosition.x = nextCityX;
    } else {
      this.freeCameraVelocity.x = 0;
    }
    if (!this.isCityWalkBlocked(this.freeCameraPosition.x, nextCityZ)) {
      this.freeCameraPosition.z = nextCityZ;
    } else {
      this.freeCameraVelocity.z = 0;
    }
    const actualCityMovement = Math.hypot(
      this.freeCameraPosition.x - previousCityX,
      this.freeCameraPosition.z - previousCityZ
    );
    if (forwardIntent && actualCityMovement > .001) {
      this.cityTravelDistance += actualCityMovement;
      this.cityForwardTime += delta;
    }
    this.updateEndlessCity();
    this.camera.position.copy(this.freeCameraPosition);
    this.camera.position.y = 3.6 + Math.sin(this.elapsed * (running ? 9 : 6.5)) * Math.min(.045, desired.length() * .012);
    this.camera.rotation.set(this.freePitch, this.freeYaw, 0);
    this.walkAmount = damp(this.walkAmount, input.lengthSq() ? 1 : 0, 9, delta);
    this.walkPhase += delta * desired.length() * 2.4;
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
      { panel: "main", kind: "fullscreen", id: "fullscreen", label: "ПОЛНЫЙ ЭКРАН", x: 1.73, y: 2.76, rotation: -.018, width: 2.62, height: .72, fontSize: 49 },
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
      positions[index * 3 + 2] = random(-9.5, 46);
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

  ensureAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (this.audioContext) {
      if (this.audioContext.state === "suspended") this.audioContext.resume().catch(() => {});
      return;
    }

    const context = new AudioContextClass();
    this.audioContext = context;
    this.audioMaster = context.createGain();
    this.audioMaster.gain.value = .96;
    this.audioCompressor = context.createDynamicsCompressor();
    this.audioCompressor.threshold.value = -12;
    this.audioCompressor.knee.value = 18;
    this.audioCompressor.ratio.value = 3;
    this.audioCompressor.attack.value = .004;
    this.audioCompressor.release.value = .22;
    this.audioMaster.connect(this.audioCompressor);
    this.audioCompressor.connect(context.destination);

    this.ambientInput = context.createGain();
    this.ambientFilter = context.createBiquadFilter();
    this.ambientFilter.type = "lowpass";
    this.ambientFilter.frequency.value = 920;
    this.ambientFilter.Q.value = .72;
    this.ambientInput.connect(this.ambientFilter);

    this.ambientCleanGain = context.createGain();
    this.ambientCleanGain.gain.value = 0;
    this.ambientFilter.connect(this.ambientCleanGain);
    this.ambientCleanGain.connect(this.audioMaster);

    this.ambientShaper = context.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let index = 0; index < curve.length; index += 1) {
      const x = index / (curve.length - 1) * 2 - 1;
      curve[index] = Math.tanh(x * 8.5);
    }
    this.ambientShaper.curve = curve;
    this.ambientShaper.oversample = "2x";

    this.ambientGlitchFilter = context.createBiquadFilter();
    this.ambientGlitchFilter.type = "bandpass";
    this.ambientGlitchFilter.frequency.value = 640;
    this.ambientGlitchFilter.Q.value = 2.8;
    this.ambientGlitchGain = context.createGain();
    this.ambientGlitchGain.gain.value = 0;
    this.ambientFilter.connect(this.ambientShaper);
    this.ambientShaper.connect(this.ambientGlitchFilter);
    this.ambientGlitchFilter.connect(this.ambientGlitchGain);
    this.ambientGlitchGain.connect(this.audioMaster);

    const glitchDelay = context.createDelay(.7);
    glitchDelay.delayTime.value = .19;
    const glitchFeedback = context.createGain();
    glitchFeedback.gain.value = .31;
    this.ambientGlitchFilter.connect(glitchDelay);
    glitchDelay.connect(glitchFeedback);
    glitchFeedback.connect(glitchDelay);
    glitchDelay.connect(this.ambientGlitchGain);

    [
      [48.0, "sine", .050, 7.0],
      [71.3, "triangle", .036, -9.0],
      [96.7, "sine", .030, 13.0],
      [143.1, "sine", .020, -16.0],
      [196.0, "sine", .014, 5.0],
      [293.7, "triangle", .009, -7.0]
    ].forEach(([frequency, type, level, detune]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      gain.gain.value = level;
      oscillator.connect(gain);
      gain.connect(this.ambientInput);

      const lfo = context.createOscillator();
      const lfoDepth = context.createGain();
      lfo.type = "sine";
      lfo.frequency.value = random(.025, .075);
      lfoDepth.gain.value = random(3.5, 10.5);
      lfo.connect(lfoDepth);
      lfoDepth.connect(oscillator.detune);
      oscillator.start();
      lfo.start();
    });

    this.ambientMelodyOsc = context.createOscillator();
    this.ambientMelodyOsc.type = "triangle";
    this.ambientMelodyOsc.frequency.value = 174.61;
    this.ambientMelodyGain = context.createGain();
    this.ambientMelodyGain.gain.value = .0001;
    this.ambientMelodyOsc.connect(this.ambientMelodyGain);
    this.ambientMelodyGain.connect(this.ambientInput);
    this.ambientMelodyOsc.start();

    const noiseLength = context.sampleRate * 4;
    const noiseBuffer = context.createBuffer(1, noiseLength, context.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    let smoothed = 0;
    for (let index = 0; index < noiseLength; index += 1) {
      smoothed = smoothed * .86 + (Math.random() * 2 - 1) * .14;
      noiseData[index] = smoothed;
    }

    const textureNoise = context.createBufferSource();
    textureNoise.buffer = noiseBuffer;
    textureNoise.loop = true;
    const textureFilter = context.createBiquadFilter();
    textureFilter.type = "bandpass";
    textureFilter.frequency.value = 390;
    textureFilter.Q.value = .55;
    const textureGain = context.createGain();
    textureGain.gain.value = .018;
    textureNoise.connect(textureFilter);
    textureFilter.connect(textureGain);
    textureGain.connect(this.ambientInput);
    textureNoise.start();

    const glitchNoise = context.createBufferSource();
    glitchNoise.buffer = noiseBuffer;
    glitchNoise.loop = true;
    const glitchNoiseFilter = context.createBiquadFilter();
    glitchNoiseFilter.type = "highpass";
    glitchNoiseFilter.frequency.value = 760;
    this.glitchNoiseGain = context.createGain();
    this.glitchNoiseGain.gain.value = 0;
    glitchNoise.connect(glitchNoiseFilter);
    glitchNoiseFilter.connect(this.glitchNoiseGain);
    this.glitchNoiseGain.connect(this.audioMaster);
    glitchNoise.start(0, random(0, 1.5));

    const windNoise = context.createBufferSource();
    windNoise.buffer = noiseBuffer;
    windNoise.loop = true;
    const windHighpass = context.createBiquadFilter();
    windHighpass.type = "highpass";
    windHighpass.frequency.value = 430;
    const windLowpass = context.createBiquadFilter();
    windLowpass.type = "lowpass";
    windLowpass.frequency.value = 1650;
    windLowpass.Q.value = .42;
    this.windGain = context.createGain();
    this.windGain.gain.value = 0;
    windNoise.connect(windHighpass);
    windHighpass.connect(windLowpass);
    windLowpass.connect(this.windGain);
    this.windGain.connect(this.audioMaster);
    windNoise.start(0, random(0, 2.5));

    const footstepLength = Math.floor(context.sampleRate * .16);
    this.footstepBuffer = context.createBuffer(1, footstepLength, context.sampleRate);
    const footstepData = this.footstepBuffer.getChannelData(0);
    for (let index = 0; index < footstepLength; index += 1) {
      const envelope = Math.exp(-index / (context.sampleRate * .027));
      footstepData[index] = (Math.random() * 2 - 1) * envelope;
    }

    context.resume().catch(() => {});
  }

  playCurtainSound() {
    const context = this.audioContext;
    if (!context || !this.audioMaster || context.state !== "running") return;
    const now = context.currentTime;
    const duration = 1.8;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    let smooth = 0;
    for (let i = 0; i < data.length; i += 1) {
      const envelope = Math.sin(Math.PI * i / data.length);
      smooth = smooth * .82 + (Math.random() * 2 - 1) * .18;
      data[i] = smooth * envelope * (.46 + Math.sin(i * .013) * .18);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(620, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + duration);
    filter.Q.value = .7;
    const gain = context.createGain();
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.105, now + .08);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioMaster);
    source.start(now);

    const rail = context.createOscillator();
    const railGain = context.createGain();
    rail.type = "sawtooth";
    rail.frequency.setValueAtTime(82, now);
    rail.frequency.exponentialRampToValueAtTime(46, now + 1.15);
    railGain.gain.setValueAtTime(.0001, now);
    railGain.gain.exponentialRampToValueAtTime(.026, now + .12);
    railGain.gain.exponentialRampToValueAtTime(.0001, now + 1.25);
    rail.connect(railGain);
    railGain.connect(this.audioMaster);
    rail.start(now);
    rail.stop(now + 1.3);
  }

  playFootstep(running, meadow = false) {
    const context = this.audioContext;
    if (!context || !this.footstepBuffer || context.state !== "running") return;
    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = this.footstepBuffer;
    source.playbackRate.value = meadow
      ? random(running ? 1.32 : 1.12, running ? 1.58 : 1.42)
      : random(running ? 1.08 : .86, running ? 1.28 : 1.08);

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = meadow
      ? random(running ? 1250 : 980, running ? 1850 : 1560)
      : random(running ? 520 : 390, running ? 760 : 590);
    filter.Q.value = .7;

    const gain = context.createGain();
    const volume = meadow ? (running ? .29 : .23) : (running ? .26 : .19);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .14);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioMaster);
    source.start(now);
    source.stop(now + .16);

    if (meadow) {
      const rustle = context.createBufferSource();
      rustle.buffer = this.footstepBuffer;
      rustle.playbackRate.value = random(1.65, 2.15);
      const rustleFilter = context.createBiquadFilter();
      rustleFilter.type = "bandpass";
      rustleFilter.frequency.value = random(1900, 2850);
      rustleFilter.Q.value = .55;
      const rustleGain = context.createGain();
      rustleGain.gain.setValueAtTime(.0001, now);
      rustleGain.gain.exponentialRampToValueAtTime(running ? .105 : .082, now + .014);
      rustleGain.gain.exponentialRampToValueAtTime(.0001, now + .19);
      rustle.connect(rustleFilter);
      rustleFilter.connect(rustleGain);
      rustleGain.connect(this.audioMaster);
      rustle.start(now + .006);
      rustle.stop(now + .21);
    }

    const thump = context.createOscillator();
    const thumpGain = context.createGain();
    thump.type = "sine";
    thump.frequency.setValueAtTime(running ? 108 : 86, now);
    thump.frequency.exponentialRampToValueAtTime(48, now + .095);
    thumpGain.gain.setValueAtTime(volume * .48, now);
    thumpGain.gain.exponentialRampToValueAtTime(.0001, now + .11);
    thump.connect(thumpGain);
    thumpGain.connect(this.audioMaster);
    thump.start(now);
    thump.stop(now + .12);
  }

  updateAudio() {
    const context = this.audioContext;
    if (!context || !this.audioMaster) return;
    const now = context.currentTime;
    const inCorridor = this.liminalEntered && !this.skyMode && !this.cityMode;
    const x = this.freeCameraPosition.x;
    const stairApproach = inCorridor
      ? clamp((this.liminalStairStartX + 11.0 - x) / 11.0, 0, 1)
      : 0;
    const stairHeight = inCorridor
      ? this.getLiminalStairHeight(this.freeCameraPosition.x, this.freeCameraPosition.z)
      : 0;
    const climb = clamp(stairHeight / this.liminalStairRise, 0, 1);
    const roomDepth = inCorridor
      ? clamp(
        (this.liminalStairEndX - x) / (this.liminalStairEndX - this.liminalStairExitX),
        0,
        1
      )
      : 0;

    const ambientLevel = inCorridor
      ? .58 * Math.pow(1 - stairApproach, 1.7)
      : this.cityMode
        ? .46 + this.cityBiomechProgress * .16
        : 0;
    const distortion = inCorridor
      ? clamp(this.audioCorridorDistortion, 0, 1)
      : this.cityMode
        ? .07 + this.cityBiomechProgress * .46 + (this.cityFinaleState === "flood" ? .18 : 0)
        : 0;
    const cleanLevel = ambientLevel * (1 - distortion * .88);
    const brokenLevel = ambientLevel * (.025 + distortion * .46);

    const gustA = .5 + .5 * Math.sin(this.elapsed * .43 + .7);
    const gustB = .5 + .5 * Math.sin(this.elapsed * .19 + 2.3);
    const gust = Math.pow(clamp(gustA * .72 + gustB * .28, 0, 1), 2.8);
    const windBase = this.skyMode
      ? .075
      : this.cityMode
        ? (this.cityLanded ? .04 + this.cityBiomechProgress * .022 + (this.cityFinaleState === "flood" ? .075 : 0) : .18)
        : this.liminalFallAirborne
          ? .17
          : inCorridor
        ? clamp(stairApproach * .008 + climb * .046 + roomDepth * .012, 0, .064)
        : 0;
    const windLevel = windBase * (.10 + gust * .90);

    const melodyStep = Math.floor(this.elapsed / 4.6);
    if (this.ambientMelodyOsc && this.ambientMelodyGain && melodyStep !== this.ambientMelodyIndex) {
      this.ambientMelodyIndex = melodyStep;
      const notes = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 220.0, 174.61];
      const note = notes[Math.abs((melodyStep * 5 + Math.floor(this.liminalSeed)) % notes.length)];
      this.ambientMelodyOsc.frequency.cancelScheduledValues(now);
      this.ambientMelodyOsc.frequency.setTargetAtTime(note, now, .75);
      this.ambientMelodyGain.gain.cancelScheduledValues(now);
      this.ambientMelodyGain.gain.setValueAtTime(Math.max(.0001, this.ambientMelodyGain.gain.value), now);
      this.ambientMelodyGain.gain.linearRampToValueAtTime(.17, now + .85);
      this.ambientMelodyGain.gain.exponentialRampToValueAtTime(.022, now + 4.2);
    }

    this.ambientCleanGain.gain.setTargetAtTime(cleanLevel, now, .12);
    this.ambientGlitchGain.gain.setTargetAtTime(brokenLevel, now, .085);
    this.glitchNoiseGain.gain.setTargetAtTime(ambientLevel * distortion * .24, now, .07);
    this.windGain.gain.setTargetAtTime(windLevel, now, .11);
    this.ambientGlitchFilter.frequency.setTargetAtTime(
      lerp(980, 270 + Math.sin(this.elapsed * 7.3) * 95, distortion),
      now,
      .06
    );

    const skyOnGround = this.skyMode && this.skyMeadowGrounded;
    const movingOnGround = this.freeCameraEnabled
      && ((!this.skyMode && (!this.cityMode || this.cityLanded)) || skyOnGround)
      && this.walkAmount > .17;
    const running = this.freeCameraKeys.has("ShiftLeft") || this.freeCameraKeys.has("ShiftRight");
    const footstepIndex = Math.floor(this.walkPhase / (Math.PI * 1.22));
    if (movingOnGround && footstepIndex !== this.lastFootstepIndex) {
      this.lastFootstepIndex = footstepIndex;
      this.playFootstep(running, skyOnGround);
    } else if (!movingOnGround) {
      this.lastFootstepIndex = footstepIndex;
    }
  }

  ensureLocationMenu() {
    if (this.locationMenuElement) return;
    const menu = document.createElement("section");
    menu.className = "location-jump";
    menu.setAttribute("data-overlay-ui", "");
    menu.setAttribute("aria-hidden", "true");
    menu.innerHTML = `
      <div class="location-jump__eyebrow">БЫСТРЫЙ ПЕРЕХОД</div>
      <div class="location-jump__name" data-location-name></div>
      <div class="location-jump__counter" data-location-counter></div>
      <div class="location-jump__controls">
        <button type="button" data-location-prev aria-label="Предыдущий этап">&lt;</button>
        <button type="button" class="location-jump__go" data-location-go>ПЕРЕЙТИ <kbd>,</kbd></button>
        <button type="button" data-location-next aria-label="Следующий этап">&gt;</button>
      </div>
      <div class="location-jump__hint">&lt; / &gt; — выбор · , — переход · Esc — закрыть</div>
    `;
    document.body.appendChild(menu);
    this.locationMenuElement = menu;
    this.locationMenuName = menu.querySelector("[data-location-name]");
    this.locationMenuCounter = menu.querySelector("[data-location-counter]");
    menu.querySelector("[data-location-prev]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      this.changeLocationMenuSelection(-1);
    });
    menu.querySelector("[data-location-next]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      this.changeLocationMenuSelection(1);
    });
    menu.querySelector("[data-location-go]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      this.activateLocationMenuSelection();
    });
    this.renderLocationMenu();
  }

  renderLocationMenu() {
    if (!this.locationStages.length) return;
    const count = this.locationStages.length;
    this.locationMenuIndex = (this.locationMenuIndex % count + count) % count;
    const stage = this.locationStages[this.locationMenuIndex];
    if (this.locationMenuName) this.locationMenuName.textContent = stage.label;
    if (this.locationMenuCounter) {
      this.locationMenuCounter.textContent = `${String(this.locationMenuIndex + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;
    }
  }

  changeLocationMenuSelection(direction) {
    this.locationMenuIndex += direction;
    this.renderLocationMenu();
    this.glitch = Math.max(this.glitch, .12);
  }

  openLocationMenu() {
    this.ensureLocationMenu();
    this.locationMenuOpen = true;
    this.locationMenuKDown = false;
    this.locationMenuHold = 0;
    this.locationMenuElement?.classList.add("is-visible");
    this.locationMenuElement?.setAttribute("aria-hidden", "false");
    this.freeCameraKeys.clear();
    this.freeCameraVelocity.set(0, 0, 0);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
  }

  closeLocationMenu(restorePointer = true) {
    this.locationMenuOpen = false;
    this.locationMenuHold = 0;
    this.locationMenuElement?.classList.remove("is-visible");
    this.locationMenuElement?.setAttribute("aria-hidden", "true");
    if (restorePointer && this.freeCameraEnabled && !this.isTouch) {
      this.canvas.requestPointerLock?.();
    }
  }

  updateLocationMenu(delta) {
    if (this.locationMenuOpen || !this.locationMenuKDown) return;
    this.locationMenuHold += delta;
    if (this.locationMenuHold >= 5) this.openLocationMenu();
  }

  resetCityFinaleForJump() {
    this.cityEmojiPrompt?.remove();
    this.cityEmojiPrompt = null;
    if (this.cityEmojiSprite) {
      this.cityEmojiSprite.parent?.remove(this.cityEmojiSprite);
      this.cityEmojiSprite.material?.dispose?.();
      this.cityEmojiTexture?.dispose?.();
    }
    this.cityEmojiSprite = null;
    this.cityEmojiTexture = null;
    this.cityEmojiCanvas = null;
    this.cityEmojiContext = null;
    (this.cityEmojiFragments || []).forEach((fragment) => {
      fragment.sprite.parent?.remove(fragment.sprite);
      fragment.material?.dispose?.();
      fragment.texture?.dispose?.();
    });
    this.cityEmojiFragments = [];
    (this.cityInfectedSymbolMeshes || []).forEach((record) => {
      record.mesh.parent?.remove(record.mesh);
      record.mesh.geometry?.dispose?.();
      record.material?.dispose?.();
    });
    this.cityInfectedSymbolMeshes = [];
    this.cityChunks?.forEach((chunk) => {
      chunk.userData.bioBuildings?.forEach((record) => {
        record.cityEmojiInfected = false;
      });
    });
    if (this.citySurfaceSymbolMesh) {
      this.citySurfaceSymbolMesh.parent?.remove(this.citySurfaceSymbolMesh);
      this.citySurfaceSymbolMesh.geometry?.dispose?.();
      this.citySurfaceSymbolMaterial?.dispose?.();
    }
    if (this.cityBloodMesh) {
      this.cityBloodMesh.parent?.remove(this.cityBloodMesh);
      this.cityBloodMesh.geometry?.dispose?.();
      this.cityBloodMaterial?.dispose?.();
    }
    if (this.cityBloodLight) this.cityBloodLight.parent?.remove(this.cityBloodLight);
    this.citySurfaceSymbolMesh = null;
    this.citySurfaceSymbolMaterial = null;
    this.cityBloodMesh = null;
    this.cityBloodMaterial = null;
    this.cityBloodLight = null;
    this.cityEmojiSpawned = false;
    this.cityEmojiHits = 0;
    this.cityEmojiPromptActive = false;
    this.cityEmojiDeathTime = 0;
    this.cityEmojiShake = 0;
    this.cityFinaleState = "dormant";
    this.cityFinaleLocksMovement = false;
    this.cityFloodTime = 0;
    this.cityFloodLevel = 0;
    this.citySinkTime = 0;
    this.cityEmojiPrompt?.classList.remove("is-visible");
  }

  prepareWalkJump() {
    if (!this.freeCameraEnabled) {
      this.freeCameraEnabled = true;
      document.body.classList.add("is-observing");
      this.mobileControls?.setAttribute("aria-hidden", "false");
    }
    this.cameraMode = "observe";
    this.boardTransition = 0;
    this.boardTransitionTarget = 0;
    this.portalSequence = null;
    this.freeCameraKeys.clear();
    this.freeCameraVelocity.set(0, 0, 0);
    this.mobileMoveInput.set(0, 0);
    this.mobileLookInput.set(0, 0);
    this.freeGroundBlend = 1;
    this.freeStartEyeHeight = this.freeEyeHeight;
    this.walkAmount = 0;
    this.liminalFall = false;
    this.liminalFallTime = 0;
  }

  jumpToLiminalStage(x, z, yaw, entered = true) {
    this.prepareWalkJump();
    document.body.classList.remove("is-sky-mode");
    this.cityMode = false;
    this.skyMode = false;
    this.scene.visible = true;
    this.renderer.shadowMap.enabled = true;
    this.camera.near = .1;
    this.camera.far = 110;
    this.camera.updateProjectionMatrix();
    this.liminalEntered = entered;
    this.liminalDoorTarget = entered ? 1 : 0;
    this.liminalDoorOpenAmount = entered ? 1 : 0;
    this.liminalPromptActive = false;
    this.doorPrompt?.classList.remove("is-visible");
    this.freeYaw = yaw;
    this.freePitch = 0;
    this.freeCameraPosition.set(x, this.freeEyeHeight, z);
    this.camera.position.copy(this.freeCameraPosition);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(0, yaw, 0);
    this.glitch = 0;
    this.nextGlitch = this.elapsed + random(2.4, 5.2);
    const screenEffects = document.querySelector(".screen-effects");
    if (screenEffects) screenEffects.style.display = "";
    if (this.transitionBlackout) {
      this.transitionBlackout.style.background = "#000";
      this.transitionBlackout.style.opacity = "0";
    }
  }

  jumpToCityStage(stageId) {
    this.resetCityFinaleForJump();
    this.prepareWalkJump();
    document.body.classList.remove("is-sky-mode");
    this.skyMode = false;
    this.cityMode = false;
    this.enterCityWorld();
    this.cityLanded = true;
    this.cityLandingTime = 2;
    this.cityImpactPlayed = true;
    this.freeYaw = 0;
    this.freePitch = 0;
    this.freeCameraPosition.set(0, 3.6, 14);
    this.camera.position.copy(this.freeCameraPosition);
    this.camera.rotation.set(0, 0, 0);
    this.scene.visible = false;
    if (this.transitionBlackout) this.transitionBlackout.style.opacity = "0";
    if (stageId === "city") return;

    this.cityTravelDistance = stageId === "mutation" ? 2100 : 4300;
    this.cityForwardTime = stageId === "mutation" ? 420 : 480;
    this.cityBiomechProgress = stageId === "mutation" ? .78 : 1;
    this.cityBiomechTarget = this.cityBiomechProgress;
    this.updateEndlessCity();
    this.updateCityBiomech(0);
    if (stageId === "mutation") return;

    this.spawnCityEmoji();
    if (this.cityEmojiSprite) {
      const toEmoji = this.cityEmojiSprite.position.clone().sub(this.freeCameraPosition);
      this.freeYaw = Math.atan2(-toEmoji.x, -toEmoji.z);
      this.camera.rotation.set(0, this.freeYaw, 0);
    }
    if (stageId === "emoji") return;

    this.cityEmojiHits = this.cityEmojiMaxHits;
    this.cityFinaleState = "waiting";
    this.cityEmojiDeathTime = 15;
    this.drawCityEmoji(5, 1);
    this.startCityBloodFlood();
    if (stageId === "flood") return;

    if (stageId === "flood-peak") {
      this.cityFloodTime = 38;
      this.updateCityFinale(0);
      return;
    }
    this.cityFinaleState = "black";
    this.cityFinaleLocksMovement = true;
    if (this.transitionBlackout) {
      this.transitionBlackout.style.background = "#000";
      this.transitionBlackout.style.opacity = "1";
    }
  }

  jumpToLocationStage(stageId) {
    if (stageId === "start") {
      document.body.classList.remove("is-sky-mode");
      this.cityMode = false;
      this.skyMode = false;
      this.scene.visible = true;
      this.renderer.shadowMap.enabled = true;
      this.liminalEntered = false;
      this.liminalDoorTarget = 0;
      this.liminalDoorOpenAmount = 0;
      this.liminalFall = false;
      this.cameraMode = "default";
      this.boardTransition = 0;
      this.boardTransitionTarget = 0;
      if (this.freeCameraEnabled) this.disableFreeCamera();
      this.camera.position.set(0, 5.25, 15.8);
      this.camera.rotation.set(0, 0, 0);
      if (this.transitionBlackout) this.transitionBlackout.style.opacity = "0";
      return;
    }
    if (stageId === "corridor") {
      this.jumpToLiminalStage(0, 48, Math.PI, false);
      return;
    }
    if (stageId === "junction") {
      this.jumpToLiminalStage(0, this.liminalCenterZ, -Math.PI / 2, true);
      return;
    }
    if (stageId === "right") {
      this.jumpToLiminalStage(108, this.liminalCenterZ, -Math.PI / 2, true);
      return;
    }
    if (stageId === "fall") {
      this.jumpToLiminalStage(118.7, this.liminalCenterZ, -Math.PI / 2, true);
      return;
    }
    if (stageId === "left") {
      this.jumpToLiminalStage(-105, this.liminalCenterZ, Math.PI / 2, true);
      return;
    }
    if (stageId === "stairs") {
      this.jumpToLiminalStage(this.liminalStairStartX - 3.2, this.liminalCenterZ, Math.PI / 2, true);
      return;
    }
    if (stageId === "white-room") {
      this.jumpToLiminalStage(this.liminalStairEndX - 1.2, this.liminalCenterZ, Math.PI / 2, true);
      return;
    }
    if (stageId === "sky" || stageId === "sky-hills" || stageId === "sky-door") {
      this.jumpToLiminalStage(this.liminalStairExitX - .2, this.liminalCenterZ, Math.PI / 2, true);
      this.enterCloudWorld();
      this.skyTransition = this.skyWhiteHold + this.skyTransitionDuration;
      if (this.transitionBlackout) this.transitionBlackout.style.opacity = "0";
      if (stageId !== "sky") {
        this.skyWalkTime = this.skyMeadowStartDelay;
        this.startSkyMeadowTransition();
        this.skyMeadowProgress = stageId === "sky-hills" ? .55 : 1;
        this.updateSkyMeadow(0, false);
        if (stageId === "sky-door") {
          this.skyMeadowGrounded = true;
          this.skyMeadowBaseY = this.skyBaseY
            - this.freeEyeHeight
            - this.skyMeadowHeightWorld(this.freeCameraPosition.x, this.freeCameraPosition.z);
          this.skyMeadowRoot.position.y = this.skyMeadowBaseY;
          this.skyMeadowGroundWalkTime = this.skyDoorDelay;
          this.spawnSkyDoor();
          this.freeCameraPosition.x = this.skyDoorRoot.position.x - this.skyMeadowDirection.x * 38;
          this.freeCameraPosition.z = this.skyDoorRoot.position.z - this.skyMeadowDirection.z * 38;
          const surfaceEye = this.skyMeadowBaseY
            + this.skyMeadowHeightWorld(this.freeCameraPosition.x, this.freeCameraPosition.z)
            + this.freeEyeHeight;
          this.skyMeadowCameraY = surfaceEye;
          this.freeCameraPosition.y = surfaceEye;
          this.camera.position.set(this.freeCameraPosition.x, surfaceEye, this.freeCameraPosition.z);
          this.updateSkyMeadow(0, false);
        }
      }
      return;
    }
    this.jumpToCityStage(stageId);
  }

  activateLocationMenuSelection() {
    const stage = this.locationStages[this.locationMenuIndex];
    if (!stage) return;
    this.jumpToLocationStage(stage.id);
    this.closeLocationMenu(true);
  }

  handleLocationMenuKey(event) {
    if (!this.locationMenuOpen) return false;
    if (event.key === "<" || event.code === "ArrowLeft") {
      event.preventDefault();
      this.changeLocationMenuSelection(-1);
      return true;
    }
    if (event.key === ">" || event.code === "ArrowRight") {
      event.preventDefault();
      this.changeLocationMenuSelection(1);
      return true;
    }
    if ((event.code === "Comma" && !event.shiftKey) || event.code === "Enter") {
      event.preventDefault();
      this.activateLocationMenuSelection();
      return true;
    }
    if (event.code === "Escape" || event.code === "KeyK") {
      event.preventDefault();
      this.closeLocationMenu(true);
      return true;
    }
    return false;
  }

  bindEvents() {
    this.setupMobileControls();
    const unlockAudio = () => this.ensureAudio();
    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio, { passive: true });
    this.doorPrompt?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.openLiminalDoor();
    });
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
      } else if (button?.kind === "fullscreen") {
        this.toggleFullscreen();
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
      if (event.code === "KeyK") {
        if (event.repeat) return;
        event.preventDefault();
        if (this.locationMenuOpen) {
          this.closeLocationMenu(true);
        } else {
          this.locationMenuKDown = true;
          this.locationMenuHold = 0;
        }
        return;
      }
      if (this.locationMenuOpen && this.handleLocationMenuKey(event)) return;
      if (!this.freeCameraEnabled) return;
      if (event.code === "KeyE" && this.cityEmojiPromptActive) {
        event.preventDefault();
        this.hitCityEmoji();
        return;
      }
      if (event.code === "KeyE" && this.liminalPromptActive) {
        event.preventDefault();
        this.openLiminalDoor();
        return;
      }
      const controls = ["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"];
      if (controls.includes(event.code)) {
        event.preventDefault();
        this.freeCameraKeys.add(event.code);
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.code === "KeyK") {
        this.locationMenuKDown = false;
        if (!this.locationMenuOpen) this.locationMenuHold = 0;
      }
      this.freeCameraKeys.delete(event.code);
    });

    document.addEventListener("pointerlockchange", () => {
      if (this.isTouch || !this.freeCameraEnabled) return;
      if (document.pointerLockElement !== this.canvas) {
        // Losing focus, changing tabs or leaving fullscreen releases pointer
        // lock. Keep the current world and camera; the next canvas click
        // reacquires the cursor instead of restarting the experience.
        this.freeCameraKeys.clear();
        this.freeCameraVelocity.set(0, 0, 0);
        this.walkAmount = 0;
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

    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
      if (!fullscreenElement) screen.orientation?.unlock?.();
      window.setTimeout(() => this.resize(), 80);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

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

  async toggleFullscreen() {
    const root = document.documentElement;
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    try {
      if (fullscreenElement) {
        screen.orientation?.unlock?.();
        const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
        await exitFullscreen?.call(document);
      } else {
        const requestFullscreen = root.requestFullscreen || root.webkitRequestFullscreen;
        if (!requestFullscreen) return;
        if (root.requestFullscreen) {
          await root.requestFullscreen({ navigationUI: "hide" });
        } else {
          await requestFullscreen.call(root);
        }
        if (this.isTouch && screen.orientation?.lock) {
          try {
            await screen.orientation.lock("landscape");
          } catch {
            // Some mobile browsers expose the API but do not allow locking it.
          }
        }
      }
      this.glitch = Math.max(this.glitch, .42);
      window.setTimeout(() => this.resize(), 100);
    } catch {
      this.glitch = Math.max(this.glitch, .65);
    }
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
    const stairHeight = this.getLiminalStairHeight(this.freeCameraPosition.x, this.freeCameraPosition.z);
    const groundEye = lerp(this.freeStartEyeHeight, this.freeEyeHeight, this.freeGroundBlend) + stairHeight;
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

    if (this.liminalWhiteRoom) {
      const physicallyInsideRoom = !this.skyMode
        && this.liminalEntered
        && this.freeCameraPosition.x <= this.liminalStairEndX + .28
        && stairHeight >= this.liminalStairRise * .985;
      this.liminalWhiteRoom.visible = physicallyInsideRoom;
      if (this.liminalWhitePortal) {
        const portalVisible = !this.skyMode
          && this.freeCameraPosition.x > this.liminalStairEndX - .62;
        this.liminalWhitePortal.visible = portalVisible;
        if (this.liminalWhitePortalHalo) this.liminalWhitePortalHalo.visible = portalVisible;
      }
    }

    if (!this.skyMode && this.liminalEntered) {
      const climb = clamp(stairHeight / this.liminalStairRise, 0, 1);
      const stairGlareProgress = clamp((climb - .12) / .88, 0, 1);
      const stairGlareEase = stairGlareProgress * stairGlareProgress * (3 - 2 * stairGlareProgress);
      const stairGlare = stairGlareEase * .24;

      const roomProgress = clamp(
        (this.liminalStairEndX - this.freeCameraPosition.x)
          / (this.liminalStairEndX - this.liminalStairExitX),
        0,
        1
      );
      const roomEase = roomProgress * roomProgress * (3 - 2 * roomProgress);
      const portalCross = clamp(
        (this.liminalStairEndX + .08 - this.freeCameraPosition.x) / .72,
        0,
        1
      );
      const portalWhiteout = portalCross * portalCross * (3 - 2 * portalCross);
      const roomGlare = roomProgress > 0 ? lerp(.42, 1, Math.max(roomEase, portalWhiteout)) : 0;
      this.skyGlare = portalCross > .94 ? 1 : Math.max(stairGlare, roomGlare);
      if (this.transitionBlackout) {
        this.transitionBlackout.style.background = this.skyGlare > 0 ? "#fff" : "#000";
        this.transitionBlackout.style.opacity = this.skyGlare.toFixed(3);
      }
    }

    if (!this.skyMode
      && this.liminalEntered
      && this.freeCameraPosition.x <= this.liminalStairExitX
      && stairHeight >= this.liminalStairRise * .995) {
      this.enterCloudWorld();
    }
  }

  isWalkBlocked(x, z) {
    if (this.skyMode) return false;
    if (this.liminalFall) return false;
    if (z < -8.95) return true;

    const inside = (centerX, centerZ, radiusX, radiusZ) => (
      Math.abs(x - centerX) < radiusX && Math.abs(z - centerZ) < radiusZ
    );

    if (z < 67.05) {
      if (x < -10.55 || x > 10.55) return true;
      if (z > 17.15 && Math.abs(x) > 2.96) return true;
      if (inside(this.board.position.x, -3.7, 4.15, .72)) return true;
      if (inside(-5.45, .45, 1.38, 1.48) || inside(5.45, .45, 1.38, 1.48)) return true;
      if (inside(-7.75, -3.8, .82, .82) || inside(7.75, -3.8, .82, .82)) return true;
      return false;
    }

    const centerZ = this.liminalCenterZ || 71.6;
    if (!this.liminalEntered) {
      if (this.liminalDoorOpenAmount < .64) return true;
      if (Math.abs(x) > 1.62 && z < centerZ - 2.25) return true;
      if (Math.abs(x) <= 1.62 && z < centerZ - .15) return false;
    }
    if (this.liminalEntered && z < this.liminalDoorZ + .42) return true;
    if (x < this.liminalWhiteRoomFarX + .28 || x > 151.2) return true;

    if (x <= this.liminalStairEndX + .12) {
      return Math.abs(z - centerZ) > this.liminalWhiteRoomHalfWidth - .24;
    }

    let halfWidth = 3.18;
    if (x > 0) {
      const shrink = clamp(x / 149, 0, 1);
      halfWidth = Math.max(.36, 3.18 * (1 - shrink * .88));
    }
    if (Math.abs(z - centerZ) > Math.max(.25, halfWidth - .08)) return true;
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
    const pixelRatio = this.skyMode
      ? Math.min(window.devicePixelRatio || 1, this.isTouch ? .72 : .9)
      : Math.min(window.devicePixelRatio || 1, 1.5);
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
    this.cameraStart = new THREE.Vector3(0, this.mobileLayout ? 5.85 : 5.28, this.mobileLayout ? 45.8 : 42.5);
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
    if (this.skyMode || this.cityMode) return;
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
    if (this.cityMode) {
      this.updateCityCamera(delta);
      return;
    }
    if (this.skyMode) {
      this.updateSkyCamera(delta);
      return;
    }
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
      this.intro = Math.min(1, this.intro + delta * (this.reduceMotion ? 1.35 : .24));
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
    if (this.cityMode) {
      this.updateCityBiomech(delta);
      this.updateCityFinale(delta);
      const cityTheme = this.themeDefinitions[this.activeTheme];
      if (!this.reduceMotion && this.elapsed > this.nextGlitch) {
        this.glitch = this.activeTheme === "fever" ? 1 : random(.42, .78);
        this.nextGlitch = this.elapsed + random(3.3, 7.2);
      }
      this.glitch = Math.max(
        cityTheme.glitch,
        this.glitch - delta * (this.activeTheme === "fever" ? 1.45 : 2.9)
      );
      this.postMaterial.uniforms.glitch.value = this.glitch;
      this.postMaterial.uniforms.time.value = this.elapsed;
      const cssGlitch = this.glitch > .38 ? (this.glitch - .38) / .62 : 0;
      document.documentElement.style.setProperty("--glitch-opacity", (cssGlitch * .7).toFixed(3));
      document.documentElement.style.setProperty(
        "--glitch-x",
        `${((Math.random() - .5) * cssGlitch * 34).toFixed(1)}px`
      );
      return;
    }
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
    if (!this.reduceMotion && this.liminalStairSanctuary < .08 && this.elapsed > this.nextGlitch) {
      this.glitch = this.activeTheme === "fever" ? 1 : random(.42, .78);
      this.nextGlitch = this.elapsed + random(3.3, 7.2);
    }
    this.glitch = Math.max(theme.glitch, this.glitch - delta * (this.activeTheme === "fever" ? 1.45 : 2.9));
    if (this.liminalStairSanctuary > 0) {
      this.glitch *= 1 - this.liminalStairSanctuary * .96;
    }
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
    if (this.cityMode) {
      this.renderer.setRenderTarget(this.renderTarget);
      this.renderer.clear();
      this.renderer.render(this.cityScene, this.camera);
      this.renderer.setRenderTarget(null);
      this.renderer.clear();
      this.renderer.render(this.postScene, this.postCamera);
      return;
    }
    if (this.skyMode) {
      this.renderer.setRenderTarget(null);
      this.renderer.clear();
      this.renderer.render(this.skyScene, this.skyRenderCamera);
      if (this.skyMeadowRoot?.visible) {
        this.renderer.render(this.skyMeadowScene, this.camera);
        this.renderer.render(this.skyCloudOverlayScene, this.skyRenderCamera);
      }
      return;
    }
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
    this.updateLocationMenu(delta);
    this.updateTheme(delta);
    this.updateCamera(delta);
    this.updateEffects(delta);
    this.updateAudio();
    this.renderFrame();
  }
}

const canvas = document.querySelector("#world");
if (canvas) new PrivateRoom(canvas);
