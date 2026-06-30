export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'minimal-3d-portfolio-theme';
const META_THEME_COLOR_SELECTOR = 'meta[name="theme-color"]';

const THEME_META_COLORS: Record<Theme, string> = {
  light: '#f7f8fb',
  dark: '#08090d',
};

export function getInitialTheme(): Theme {
  const savedTheme = window.localStorage.getItem(STORAGE_KEY);

  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
  document
    .querySelector<HTMLMetaElement>(META_THEME_COLOR_SELECTOR)
    ?.setAttribute('content', THEME_META_COLORS[theme]);
}

export function toggleTheme(currentTheme: Theme): Theme {
  return currentTheme === 'dark' ? 'light' : 'dark';
}
