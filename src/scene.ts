import * as THREE from 'three';
import type { Theme } from './theme';

interface PointerState {
  x: number;
  y: number;
}

interface ScenePalette {
  background: number;
  fog: number;
  glass: number;
  glassEmissive: number;
  glassOpacity: number;
  metal: number;
  edge: number;
  particle: number;
  particleOpacity: number;
  keyLight: number;
  accentLight: number;
  rimLight: number;
  ambientIntensity: number;
  keyIntensity: number;
  accentIntensity: number;
  rimIntensity: number;
  text: string;
  textMuted: string;
  textLine: string;
  shadow: number;
  shadowOpacity: number;
  highlightOpacity: number;
  exposure: number;
}

const CARD_WIDTH = 2.72;
const CARD_HEIGHT = 3.78;
const CARD_DEPTH = 0.18;
const CARD_RADIUS = 0.24;
const MOBILE_BREAKPOINT = 760;

const THEME_COLORS = {
  light: {
    background: 0xf7f8fb,
    fog: 0xf7f8fb,
    glass: 0xf9fbff,
    glassEmissive: 0xf4f7fb,
    glassOpacity: 0.56,
    metal: 0xc8ced8,
    edge: 0x202734,
    particle: 0x242a36,
    particleOpacity: 0.24,
    keyLight: 0xffffff,
    accentLight: 0x3fb8aa,
    rimLight: 0xf0c86d,
    ambientIntensity: 1.08,
    keyIntensity: 2.55,
    accentIntensity: 1.75,
    rimIntensity: 1.4,
    text: 'rgba(18, 22, 31, 0.86)',
    textMuted: 'rgba(18, 22, 31, 0.52)',
    textLine: 'rgba(18, 22, 31, 0.2)',
    shadow: 0x151923,
    shadowOpacity: 0.16,
    highlightOpacity: 0.38,
    exposure: 0.94,
  },
  dark: {
    background: 0x08090d,
    fog: 0x08090d,
    glass: 0x111722,
    glassEmissive: 0x05070d,
    glassOpacity: 0.68,
    metal: 0xd9dee7,
    edge: 0xffffff,
    particle: 0xe7f7ff,
    particleOpacity: 0.34,
    keyLight: 0xf6fbff,
    accentLight: 0x35d7c2,
    rimLight: 0xa78bfa,
    ambientIntensity: 0.82,
    keyIntensity: 2.2,
    accentIntensity: 2.55,
    rimIntensity: 2.05,
    text: 'rgba(244, 247, 250, 0.9)',
    textMuted: 'rgba(244, 247, 250, 0.56)',
    textLine: 'rgba(244, 247, 250, 0.24)',
    shadow: 0x000000,
    shadowOpacity: 0.38,
    highlightOpacity: 0.5,
    exposure: 1.08,
  },
} satisfies Record<Theme, ScenePalette>;

export class PortfolioScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly environmentTexture: THREE.CubeTexture;
  private readonly cardGroup = new THREE.Group();
  private readonly glassMaterial = new THREE.MeshPhysicalMaterial({
    roughness: 0.17,
    metalness: 0.04,
    transmission: 0.26,
    thickness: 0.78,
    ior: 1.45,
    transparent: true,
    opacity: 0.62,
    clearcoat: 0.82,
    clearcoatRoughness: 0.18,
    depthWrite: false,
  });
  private readonly frameMaterial = new THREE.MeshPhysicalMaterial({
    roughness: 0.22,
    metalness: 0.78,
    clearcoat: 0.7,
    clearcoatRoughness: 0.14,
  });
  private readonly edgeMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.28 });
  private readonly particleMaterial = new THREE.PointsMaterial({
    size: 0.018,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.36,
  });
  private readonly textMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
    toneMapped: false,
  });
  private readonly highlightMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.44,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  private readonly shadowMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    toneMapped: false,
  });
  private readonly ambientLight = new THREE.AmbientLight(0xffffff, 1);
  private readonly keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  private readonly accentLight = new THREE.PointLight(0x35d7c2, 2.4, 12, 2);
  private readonly rimLight = new THREE.DirectionalLight(0xffffff, 1.8);
  private readonly pointer: PointerState = { x: 0, y: 0 };
  private readonly clock = new THREE.Clock();
  private particles: THREE.Points | null = null;
  private baseCardY = 0.08;
  private isMobile = false;
  private frameId = 0;

  constructor(canvas: HTMLCanvasElement, initialTheme: Theme) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.environmentTexture = this.createStudioEnvironment();
    this.scene.environment = this.environmentTexture;
    this.camera.position.set(0, 0, 7.25);

    this.createCard();
    this.createParticles();
    this.createLights();
    this.applyTheme(initialTheme);
    this.handleResize();

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
  }

  start(): void {
    this.animate();
  }

  destroy(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointerMove);
    this.disposeSceneResources();
    this.renderer.dispose();
  }

  applyTheme(theme: Theme): void {
    const colors = THEME_COLORS[theme];

    this.renderer.setClearColor(colors.background, 0);
    this.renderer.toneMappingExposure = colors.exposure;
    this.scene.fog = new THREE.Fog(colors.fog, 9, 18);

    this.glassMaterial.color.setHex(colors.glass);
    this.glassMaterial.emissive.setHex(colors.glassEmissive);
    this.glassMaterial.opacity = colors.glassOpacity;
    this.frameMaterial.color.setHex(colors.metal);
    this.edgeMaterial.color.setHex(colors.edge);
    this.particleMaterial.color.setHex(colors.particle);
    this.particleMaterial.opacity = colors.particleOpacity;

    this.ambientLight.intensity = colors.ambientIntensity;
    this.keyLight.color.setHex(colors.keyLight);
    this.keyLight.intensity = colors.keyIntensity;
    this.accentLight.color.setHex(colors.accentLight);
    this.accentLight.intensity = colors.accentIntensity;
    this.rimLight.color.setHex(colors.rimLight);
    this.rimLight.intensity = colors.rimIntensity;

    this.shadowMaterial.color.setHex(colors.shadow);
    this.shadowMaterial.opacity = colors.shadowOpacity;
    this.highlightMaterial.opacity = colors.highlightOpacity;
    this.replaceTextTexture(colors);
  }

  private createCard(): void {
    const cardShape = this.createRoundedRectShape(CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
    const glassGeometry = new THREE.ExtrudeGeometry(cardShape, {
      depth: CARD_DEPTH,
      bevelEnabled: true,
      bevelSegments: 12,
      bevelSize: 0.035,
      bevelThickness: 0.045,
      curveSegments: 28,
      steps: 1,
    });
    glassGeometry.center();

    const frameShape = this.createRoundedFrameShape(
      CARD_WIDTH + 0.04,
      CARD_HEIGHT + 0.04,
      CARD_WIDTH - 0.34,
      CARD_HEIGHT - 0.34,
      CARD_RADIUS + 0.02,
      CARD_RADIUS * 0.62,
    );
    const frameGeometry = new THREE.ExtrudeGeometry(frameShape, {
      depth: 0.046,
      bevelEnabled: true,
      bevelSegments: 8,
      bevelSize: 0.014,
      bevelThickness: 0.016,
      curveSegments: 28,
      steps: 1,
    });
    frameGeometry.center();

    const glass = new THREE.Mesh(glassGeometry, this.glassMaterial);
    const frame = new THREE.Mesh(frameGeometry, this.frameMaterial);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(glassGeometry, 18), this.edgeMaterial);
    const highlight = new THREE.Mesh(new THREE.PlaneGeometry(CARD_WIDTH - 0.42, CARD_HEIGHT - 0.42), this.highlightMaterial);
    const text = new THREE.Mesh(new THREE.PlaneGeometry(CARD_WIDTH - 0.64, CARD_HEIGHT - 0.84), this.textMaterial);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(CARD_WIDTH + 0.94, CARD_HEIGHT + 1.02), this.shadowMaterial);

    frame.position.z = CARD_DEPTH / 2 + 0.018;
    edges.position.z = 0.004;
    highlight.position.z = CARD_DEPTH / 2 + 0.052;
    text.position.z = CARD_DEPTH / 2 + 0.066;
    shadow.position.set(0, -0.08, -0.26);

    glass.renderOrder = 1;
    frame.renderOrder = 2;
    edges.renderOrder = 3;
    highlight.renderOrder = 4;
    text.renderOrder = 5;
    shadow.renderOrder = 0;

    const highlightTexture = this.createHighlightTexture();
    const shadowTexture = this.createShadowTexture();
    this.highlightMaterial.map = highlightTexture;
    this.shadowMaterial.map = shadowTexture;

    this.cardGroup.add(shadow, glass, frame, edges, highlight, text);
    this.cardGroup.position.set(1.85, 0.08, 0);
    this.cardGroup.rotation.set(-0.08, -0.34, 0.08);
    this.scene.add(this.cardGroup);
  }

  private createTextTexture(title: string, subtitle: string, palette: ScenePalette): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1400;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to create text texture context.');
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.textBaseline = 'alphabetic';

    context.fillStyle = palette.textMuted;
    context.font = '700 52px Inter, Arial, sans-serif';
    context.fillText(subtitle, 132, 208);

    const titleGradient = context.createLinearGradient(128, 430, 820, 760);
    titleGradient.addColorStop(0, palette.text);
    titleGradient.addColorStop(0.58, palette.text);
    titleGradient.addColorStop(1, palette.textMuted);
    context.fillStyle = titleGradient;
    context.font = '900 344px Inter, Arial, sans-serif';
    context.fillText(title, 126, 750);

    context.strokeStyle = palette.textLine;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(132, 996);
    context.lineTo(892, 996);
    context.stroke();

    context.fillStyle = palette.textMuted;
    context.font = '600 46px Inter, Arial, sans-serif';
    context.fillText('Frontend Developer', 132, 1110);
    context.fillText('TypeScript / Three.js', 132, 1184);

    context.fillStyle = palette.textLine;
    context.fillRect(132, 1268, 188, 8);
    context.fillRect(344, 1268, 104, 8);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  private createHighlightTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1400;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to create highlight texture context.');
    }

    context.clearRect(0, 0, canvas.width, canvas.height);

    const diagonal = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    diagonal.addColorStop(0, 'rgba(255, 255, 255, 0)');
    diagonal.addColorStop(0.22, 'rgba(255, 255, 255, 0.16)');
    diagonal.addColorStop(0.38, 'rgba(255, 255, 255, 0)');
    diagonal.addColorStop(0.62, 'rgba(255, 255, 255, 0.11)');
    diagonal.addColorStop(0.78, 'rgba(255, 255, 255, 0)');
    context.fillStyle = diagonal;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const topEdge = context.createLinearGradient(0, 0, 0, canvas.height);
    topEdge.addColorStop(0, 'rgba(255, 255, 255, 0.24)');
    topEdge.addColorStop(0.18, 'rgba(255, 255, 255, 0)');
    context.fillStyle = topEdge;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createShadowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to create shadow texture context.');
    }

    const gradient = context.createRadialGradient(256, 256, 16, 256, 256, 252);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    gradient.addColorStop(0.58, 'rgba(0, 0, 0, 0.22)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createParticles(): void {
    const count = 1100;
    const positions = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const stride = index * 3;
      positions[stride] = (Math.random() - 0.5) * 14.5;
      positions[stride + 1] = (Math.random() - 0.5) * 8.6;
      positions[stride + 2] = (Math.random() - 0.5) * 8.5 - 1.7;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particles = new THREE.Points(geometry, this.particleMaterial);
    this.scene.add(this.particles);
  }

  private createLights(): void {
    this.keyLight.position.set(-4.2, 4.4, 5.2);
    this.accentLight.position.set(3.4, -1.4, 3.1);
    this.rimLight.position.set(3.6, 2.8, -4.2);
    this.scene.add(this.ambientLight, this.keyLight, this.accentLight, this.rimLight);
  }

  private createStudioEnvironment(): THREE.CubeTexture {
    const faceGradients: Array<[string, string, string]> = [
      ['#fbfdff', '#8fb5c2', '#10151e'],
      ['#11151f', '#526071', '#eef4ff'],
      ['#ffffff', '#d9e0ea', '#8996a8'],
      ['#151820', '#2f3644', '#090a0d'],
      ['#f8fbff', '#8ddfd2', '#171b25'],
      ['#12151f', '#a79bea', '#f7fafc'],
    ];

    const faces = faceGradients.map(([start, middle, end]) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to create environment texture context.');
      }

      const gradient = context.createLinearGradient(0, 0, 128, 128);
      gradient.addColorStop(0, start);
      gradient.addColorStop(0.52, middle);
      gradient.addColorStop(1, end);
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);

      context.fillStyle = 'rgba(255, 255, 255, 0.18)';
      context.fillRect(18, 0, 18, 128);
      return canvas;
    });

    const texture = new THREE.CubeTexture(faces);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  private createRoundedFrameShape(
    width: number,
    height: number,
    innerWidth: number,
    innerHeight: number,
    radius: number,
    innerRadius: number,
  ): THREE.Shape {
    const shape = this.createRoundedRectShape(width, height, radius);
    shape.holes.push(this.createRoundedRectPath(innerWidth, innerHeight, innerRadius, true));
    return shape;
  }

  private createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
    const shape = new THREE.Shape();
    this.drawRoundedRectPath(shape, width, height, radius, false);
    return shape;
  }

  private createRoundedRectPath(width: number, height: number, radius: number, clockwise: boolean): THREE.Path {
    const path = new THREE.Path();
    this.drawRoundedRectPath(path, width, height, radius, clockwise);
    return path;
  }

  private drawRoundedRectPath(path: THREE.Path, width: number, height: number, radius: number, clockwise: boolean): void {
    const x = -width / 2;
    const y = -height / 2;
    const right = width / 2;
    const top = height / 2;
    const safeRadius = Math.min(radius, width / 2, height / 2);

    if (clockwise) {
      path.moveTo(x + safeRadius, y);
      path.quadraticCurveTo(x, y, x, y + safeRadius);
      path.lineTo(x, top - safeRadius);
      path.quadraticCurveTo(x, top, x + safeRadius, top);
      path.lineTo(right - safeRadius, top);
      path.quadraticCurveTo(right, top, right, top - safeRadius);
      path.lineTo(right, y + safeRadius);
      path.quadraticCurveTo(right, y, right - safeRadius, y);
      path.lineTo(x + safeRadius, y);
      return;
    }

    path.moveTo(x + safeRadius, y);
    path.lineTo(right - safeRadius, y);
    path.quadraticCurveTo(right, y, right, y + safeRadius);
    path.lineTo(right, top - safeRadius);
    path.quadraticCurveTo(right, top, right - safeRadius, top);
    path.lineTo(x + safeRadius, top);
    path.quadraticCurveTo(x, top, x, top - safeRadius);
    path.lineTo(x, y + safeRadius);
    path.quadraticCurveTo(x, y, x + safeRadius, y);
  }

  private replaceTextTexture(colors: ScenePalette): void {
    const previousTexture = this.textMaterial.map;
    this.textMaterial.map = this.createTextTexture('JY', 'PORTFOLIO', colors);
    this.textMaterial.needsUpdate = true;
    previousTexture?.dispose();
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    this.pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
  };

  private readonly handleResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.isMobile = width < MOBILE_BREAKPOINT;

    this.camera.aspect = width / height;
    this.camera.position.z = this.isMobile ? 8.15 : 7.25;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);

    const compactHeight = height < 720;
    const mobileScale = Math.max(0.58, Math.min(0.72, width / 520));
    const targetX = this.isMobile ? 0.18 : 1.85;
    const targetY = this.isMobile ? (compactHeight ? -1.05 : -1.42) : 0.08;
    const targetZ = this.isMobile ? -0.68 : 0;
    const targetScale = this.isMobile ? mobileScale : width < 1080 ? 0.9 : 1;

    this.baseCardY = targetY;
    this.cardGroup.position.set(targetX, targetY, targetZ);
    this.cardGroup.scale.setScalar(targetScale);
  };

  private animate = (): void => {
    const elapsed = this.clock.getElapsedTime();
    const baseRotationY = this.isMobile ? -0.18 : -0.34;
    const baseRotationX = this.isMobile ? -0.04 : -0.08;
    const targetRotationY = baseRotationY + this.pointer.x * (this.isMobile ? 0.16 : 0.24);
    const targetRotationX = baseRotationX - this.pointer.y * (this.isMobile ? 0.11 : 0.18);

    this.cardGroup.rotation.y += (targetRotationY - this.cardGroup.rotation.y) * 0.065;
    this.cardGroup.rotation.x += (targetRotationX - this.cardGroup.rotation.x) * 0.065;
    this.cardGroup.rotation.z = Math.sin(elapsed * 0.52) * (this.isMobile ? 0.024 : 0.035);
    this.cardGroup.position.y +=
      (Math.sin(elapsed * 0.72) * (this.isMobile ? 0.055 : 0.08) + this.baseCardY - this.cardGroup.position.y) * 0.025;

    if (this.particles) {
      this.particles.rotation.y = elapsed * 0.012 + this.pointer.x * 0.018;
      this.particles.rotation.x = this.pointer.y * 0.012;
    }

    this.scene.rotation.y = this.pointer.x * 0.025;
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.animate);
  };

  private disposeSceneResources(): void {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
        object.geometry.dispose();
      }
    });

    this.textMaterial.map?.dispose();
    this.highlightMaterial.map?.dispose();
    this.shadowMaterial.map?.dispose();
    this.environmentTexture.dispose();
    this.glassMaterial.dispose();
    this.frameMaterial.dispose();
    this.edgeMaterial.dispose();
    this.particleMaterial.dispose();
    this.textMaterial.dispose();
    this.highlightMaterial.dispose();
    this.shadowMaterial.dispose();
  }
}
