# KOLO NEŠTĚSTÍ v4.3

Browserové kolo pro stream, OBS a GitHub Pages.

## v4.3

- běžné peněžní pole už neklesne pod **40 Kč**,
- nastavení rychlosti spinu nově dovoluje **1.0–8.0 s**,
- leaderboard má nové seed výsledky,
- přidané tlačítko **HARDCORE TOČKA**,
- Hardcore má přesně **3 spiny bez respinu**,
- první dva Hardcore spiny používají money wheel **150–1000 Kč**,
- před třetím spinem se kolo samo přepne na multiplier finále,
- poslední wheel používá násobiče **x1 / x1.5 / x2 / x2.5**,
- maximální možná Hardcore částka je **5000 Kč**,
- Hardcore lze zapnout/vypnout tlačítkem nebo klávesou **H**,
- stávající x2 pravidlo zůstává: v normálním kole může být x2 maximálně jednou.

## Leaderboard seed

- jerusalemcrusader — 1975 Kč — 18 série
- potisengage — 1145 Kč — 40 série
- jerusalemcrusadser — 705 Kč — 15 série
- fkroupic — 180 Kč — 8 série
- JimmySiipek — 180 Kč — 4 série
- Aizeens — 100 Kč — 1 série

## Ovládání

- `SPACE` — spin
- `H` — Hardcore režim
- `R` — restart po konci hry
- `F` — fullscreen
- `M` — mute
- `S` — nastavení

## Hardcore balance

První dva spiny mají pouze peněžní pole bez respinu. Nejvyšší money hit je 1000 Kč. Třetí spin používá samostatné multiplier kolo. Protože maximum po prvních dvou spinech je 2000 Kč a nejvyšší multiplier je x2.5, teoretické maximum je přesně **5000 Kč**.

## Vývoj

```bash
npm install
npm test
npm run build
```

GitHub Pages deploy běží z `main`.
