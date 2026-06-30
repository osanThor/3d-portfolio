import * as THREE from 'three';
import type { Theme } from './theme';

interface PointerState {
  x: number;
  y: number;
}

const THEME_COLORS = {
  light: {
    background: 0xf4f2ee,
    card: 0xffffff,
    edge: 0x111111,
    particle: 0x111111,
    keyLight: 0xffffff,
    accentLight: 0x7c3aed,
  },
  dark: {
    background: 0x090a0f,
    card: 0x141824,
    edge: 0xffffff,
    particle: 0xffffff,
    keyLight: 0xffffff,
    accentLight: 0x22d3ee,
  },
} as const;

export class PortfolioScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly cardGroup = new THREE.Group();
  private readonly cardMaterial = new THREE.MeshPhysicalMaterial({
    roughness: 0.34,
    metalness: 0.18,
    transmission: 0.12,
    thickness: 0.5,
    transparent: true,
    opacity: 0.84,
  });
  private readonly edgeMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.28 });
  private readonly particleMaterial = new THREE.PointsMaterial({ size: 0.018, transparent: true, opacity: 0.42 });
  private readonly keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  private readonly accentLight = new THREE.PointLight(0x7c3aed, 2.6, 12);
  private readonly pointer: PointerState = { x: 0, y: 0 };
  private readonly clock = new THREE.Clock();
  private frameId = 0;

  constructor(canvas: HTMLCanvasElement, initialTheme: Theme) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.camera.position.set(0, 0, 7.4);

    this.createCard();
    this.createParticles();
    this.createLights();
    this.applyTheme(initialTheme);
    this.handleResize();

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pointermove', this.handlePointerMove);
  }

  start(): void {
    this.animate();
  }

  destroy(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.dispose();
  }

  applyTheme(theme: Theme): void {
    const colors = THEME_COLORS[theme];
    this.renderer.setClearColor(colors.background, 0);
    this.scene.fog = new THREE.Fog(colors.background, 9, 18);
    this.cardMaterial.color.setHex(colors.card);
    this.edgeMaterial.color.setHex(colors.edge);
    this.particleMaterial.color.setHex(colors.particle);
    this.keyLight.color.setHex(colors.keyLight);
    this.accentLight.color.setHex(colors.accentLight);
  }

  private createCard(): void {
    const geometry = new THREE.BoxGeometry(2.65, 3.65, 0.16, 12, 12, 2);
    const card = new THREE.Mesh(geometry, this.cardMaterial);
    card.castShadow = false;
    card.receiveShadow = false;

    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), this.edgeMaterial);
    const nameTexture = this.createTextTexture('JY', 'PORTFOLIO');
    const textMaterial = new THREE.MeshBasicMaterial({
      map: nameTexture,
      transparent: true,
      opacity: 0.9,
    });
    const text = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 2.85), textMaterial);
    text.position.z = 0.086;

    this.cardGroup.add(card, edges, text);
    this.cardGroup.position.set(1.85, 0.1, 0);
    this.cardGroup.rotation.set(-0.08, -0.34, 0.08);
    this.scene.add(this.cardGroup);
  }

  private createTextTexture(title: string, subtitle: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1400;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to create text texture context.');
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(255, 255, 255, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = 'rgba(120, 120, 120, 0.32)';
    context.font = '600 52px Inter, Arial, sans-serif';
    context.letterSpacing = '12px';
    context.fillText(subtitle, 132, 210);

    context.fillStyle = 'rgba(120, 120, 120, 0.82)';
    context.font = '900 360px Inter, Arial, sans-serif';
    context.letterSpacing = '-18px';
    context.fillText(title, 128, 760);

    context.strokeStyle = 'rgba(120, 120, 120, 0.24)';
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(132, 1030);
    context.lineTo(892, 1030);
    context.stroke();

    context.fillStyle = 'rgba(120, 120, 120, 0.56)';
    context.font = '500 44px Inter, Arial, sans-serif';
    context.fillText('Frontend Developer', 132, 1130);
    context.fillText('TypeScript · Three.js', 132, 1204);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createParticles(): void {
    const count = 900;
    const positions = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const stride = index * 3;
      positions[stride] = (Math.random() - 0.5) * 13;
      positions[stride + 1] = (Math.random() - 0.5) * 8;
      positions[stride + 2] = (Math.random() - 0.5) * 8 - 1.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(geometry, this.particleMaterial);
    this.scene.add(particles);
  }

  private createLights(): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.35));
    this.keyLight.position.set(-4, 3, 5);
    this.accentLight.position.set(3.5, -1.5, 3.5);
    this.scene.add(this.keyLight, this.accentLight);
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    this.pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
  };

  private readonly handleResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    const isMobile = width < 760;
    this.cardGroup.position.set(isMobile ? 0 : 1.85, isMobile ? -1.35 : 0.1, isMobile ? -0.75 : 0);
    this.cardGroup.scale.setScalar(isMobile ? 0.72 : 1);
  };

  private animate = (): void => {
    const elapsed = this.clock.getElapsedTime();
    const targetRotationY = -0.34 + this.pointer.x * 0.24;
    const targetRotationX = -0.08 - this.pointer.y * 0.18;

    this.cardGroup.rotation.y += (targetRotationY - this.cardGroup.rotation.y) * 0.065;
    this.cardGroup.rotation.x += (targetRotationX - this.cardGroup.rotation.x) * 0.065;
    this.cardGroup.rotation.z = Math.sin(elapsed * 0.52) * 0.035;
    this.cardGroup.position.y += (Math.sin(elapsed * 0.72) * 0.08 + (window.innerWidth < 760 ? -1.35 : 0.1) - this.cardGroup.position.y) * 0.02;

    this.scene.rotation.y = this.pointer.x * 0.025;
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.animate);
  };
}
