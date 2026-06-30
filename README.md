# Minimal 3D Portfolio

A single-page, responsive 3D portfolio landing page built with Vite, TypeScript, and Three.js.

## Features

- Minimal one-page layout
- Responsive design
- Dark mode toggle with localStorage persistence
- Glass and metal themed Three.js floating 3D name card
- Beveled card geometry with metallic frame, glass highlight, soft shadow, and studio-style reflections
- Mouse / pointer based tilt interaction
- Lightweight particle field background
- Two external links: Portfolio and Blog

## Stack

- Vite
- TypeScript
- Three.js
- CSS

## Getting Started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Customize

Update these values in `index.html`:

```html
<h1 id="hero-title">Junyoung Lee</h1>
<a href="https://portfolio.example.com">Portfolio</a>
<a href="https://blog.example.com">Blog</a>
```

Update the 3D card text in `src/scene.ts`:

```ts
this.createTextTexture('JY', 'PORTFOLIO')
```
