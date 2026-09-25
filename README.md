# KOLO ŠTĚSTÍ

High-energy browserové kolo štěstí pro stream, OBS nebo GitHub Pages.

## Pravidla

Hra začíná s `0 Kč` a `1 spinem`.

- každý spin nejdřív odebere 1 spin,
- peněžní pole přidá částku,
- `x2` a `x3` násobí aktuální celkovou výhru,
- každé pole kromě `100 Kč` vrátí `+1 spin`,
- `100 Kč` je jediné pole bez extra spinu, takže při jeho dopadu hra skončí a ukáže finální částku.

Výsledek je vybrán právě jednou na začátku spinu. Animace už pouze fyzicky dojede na zvolený segment.

## Ovládání

- `SPACE` — roztočit
- `R` — restart po konci hry
- `F` — fullscreen
- `M` — mute

## Úprava hodnot kola

Všechna pole jsou na jednom místě:

`src/core/WheelConfig.js`

Peníze:

```js
{
  label: '20 Kč + SPIN',
  type: 'money',
  value: 20,
  extraSpins: 1,
  tone: 'violet'
}
```

Násobič:

```js
{
  label: 'x2 + SPIN',
  type: 'multiplier',
  multiplier: 2,
  extraSpins: 1,
  tone: 'purple'
}
```

Finální pole:

```js
{
  label: '100 Kč',
  type: 'money',
  value: 100,
  extraSpins: 0,
  tone: 'final',
  finale: true
}
```

Každý fyzický segment má stejnou pravděpodobnost. Pokud přidáš stejnou hodnotu vícekrát, její celková pravděpodobnost se tím přirozeně zvýší.

## Architektura

- `src/core/WheelConfig.js` — segmenty a parametry spinu
- `src/core/WheelEngine.js` — RNG a výpočet cílové rotace
- `src/core/GameState.js` — Kč, spiny, historie a konec hry
- `src/audio/AudioManager.js` — WebAudio SFX
- `src/ui/WheelRenderer.js` — SVG kolo, fyzická rotace a pointer ticks
- `src/ui/ParticleSystem.js` — částice a flash efekty
- `src/ui/UI.js` — HUD, historie a finální overlay
- `src/main.js` — propojení hry
- `src/style.css` — celý game-show vizuál

## Vývoj

```bash
npm install
npm run dev
```

Testy:

```bash
npm test
```

Production build:

```bash
npm run build
```

## GitHub Pages

Projekt zachovává Vite `base: './'`. Existující workflow v `.github/workflows/deploy.yml` sestaví `dist/` a nasadí ho na GitHub Pages po pushi do `main`.

V nastavení repozitáře musí být jednou zapnuté **Settings → Pages → Source → GitHub Actions**.

## OBS

Stránka používá čisté browser API a funguje jako OBS Browser Source. Fullscreen UI je responzivní a hlavní ovládací prvky jsou čitelné i na streamu.
