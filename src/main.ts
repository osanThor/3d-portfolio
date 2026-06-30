import './style.css';
import { PortfolioScene } from './scene';
import { applyTheme, getInitialTheme, toggleTheme, type Theme } from './theme';

const canvas = document.querySelector<HTMLCanvasElement>('#webgl');
const themeToggle = document.querySelector<HTMLButtonElement>('#theme-toggle');
const themeIcon = document.querySelector<HTMLSpanElement>('.theme-toggle__icon');

if (!canvas) {
  throw new Error('WebGL canvas was not found.');
}

let currentTheme: Theme = getInitialTheme();
applyTheme(currentTheme);

const scene = new PortfolioScene(canvas, currentTheme);
scene.start();

function syncThemeIcon(theme: Theme): void {
  if (!themeIcon) return;
  themeIcon.textContent = theme === 'dark' ? '☀' : '☾';
}

syncThemeIcon(currentTheme);

themeToggle?.addEventListener('click', () => {
  currentTheme = toggleTheme(currentTheme);
  applyTheme(currentTheme);
  scene.applyTheme(currentTheme);
  syncThemeIcon(currentTheme);
});
