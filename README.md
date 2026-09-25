# KOLO NEŠTĚSTÍ

High-energy browserové kolo pro stream, OBS nebo GitHub Pages.

## Pravidla

Hra začíná s `0 Kč` a `1 spinem`.

- každý spin nejdřív odebere 1 spin,
- peněžní pole přidá částku,
- `x2` a `x3` násobí aktuální částku,
- každé pole kromě `100 Kč` vrátí `+1 spin`,
- `100 Kč` je jediné pole bez extra spinu,
- jakmile po vyhodnocení nezbývá žádný spin, zobrazí se **PROHRÁL JSI** a výsledná částka.

Výsledek je vybrán právě jednou na začátku spinu. Animace už pouze dojede na předem zvolený segment.

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
- `src/core/GameState.js` — částka, spiny, historie a konec hry
- `src/audio/AudioManager.js` — WebAudio vrstvy + volitelné Mixkit casino SFX
- `src/ui/WheelRenderer.js` — SVG kolo, zpomalování, pointer ticks a jemné dosednutí
- `src/ui/ParticleSystem.js` — částice a flash efekty
- `src/ui/UI.js` — HUD, historie, výsledky a finální overlay
- `src/style.css` — základní game-show vizuál
- `src/polish.css` — jemnější motion, finální loss styl a polish

## Zvuky

Hra používá vlastní WebAudio vrstvy a několik vzdálených SFX z Mixkit jako doplňkovou vrstvu. Když se externí sample nenačte, WebAudio fallback dál funguje.

Použité Mixkit SFX:

- Gold coin prize
- Coins sound
- Slot machine win alert
- Slot machine win alarm
- Failure arcade alert notification

Zdroj: https://mixkit.co/free-sound-effects/
Licence: https://mixkit.co/license/

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

Projekt zachovává Vite `base: './'`. Workflow v `.github/workflows/deploy.yml` sestaví `dist/` a nasadí ho na GitHub Pages po pushi do `main`.

## OBS

Stránka používá čisté browser API a funguje jako OBS Browser Source.
