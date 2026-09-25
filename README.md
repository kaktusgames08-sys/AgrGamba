# KOLO NEŠTĚSTÍ v3

Browserové kolo pro stream / OBS / GitHub Pages. V3 přidává výrazně uhlazenější game-show prezentaci a kompletní nastavení kola přímo ve hře.

## Co je ve v3

- plynulejší spin s krátkou akcelerací, dlouhým dojezdem a skutečným pointer tickem,
- live zvýraznění segmentu, který je opravdu pod pointerem při zpomalování,
- žádné falešné near-miss změny výsledku — výsledek se vybere jednou před animací,
- nové ambientní světlo, wheel sheen, marquee spark efekty a živější HUD,
- animované dopočítávání částky,
- +Kč / x2 / +SPIN badge, který vizuálně letí do HUD,
- stavový pill **PŘIPRAVENO / ROZTÁČÍM / +SPIN / KONEC**,
- panel série odehraných spinů,
- nastavitelná intenzita efektů, hlasitost a délka spinu,
- editor všech segmentů přímo v browseru,
- nastavení se ukládá do `localStorage`.

## Nastavení kola

Klikni na **⚙** vpravo nahoře.

Lze změnit:

- počet počátečních spinů,
- délku animace spinu,
- hlasitost,
- intenzitu efektů,
- ambient animace,
- historii výsledků,
- počet polí kola,
- typ každého pole: peníze / násobič,
- částku nebo hodnotu násobiče,
- barvu pole,
- zda pole dává `+SPIN`.

Kolo musí mít alespoň jedno pole bez `+SPIN`, jinak by hra neměla konec. Editor to hlídá.

Každé **viditelné fyzické políčko má stejnou pravděpodobnost**. Pokud nějakou hodnotu na kolo přidáš vícekrát, zvýšíš tím její celkovou šanci.

## Výchozí pravidla

Hra začíná s `0 Kč` a `1 spinem`.

- při startu spinu se odečte 1 spin,
- peněžní pole přidá částku,
- `x2` / `x3` násobí aktuální částku,
- pole s `+SPIN` vrátí další spin,
- pole bez `+SPIN` ukončí hru, pokud už žádný spin nezbývá,
- konec zobrazí **PROHRÁL JSI** a výslednou částku.

## Ovládání

- `SPACE` — roztočit
- `R` — restart po konci hry
- `F` — fullscreen
- `M` — mute
- `S` — nastavení

## Architektura

- `src/core/WheelConfig.js` — výchozí segmenty
- `src/core/WheelEngine.js` — RNG a cílová rotace
- `src/core/GameState.js` — částka, spiny, historie, série
- `src/core/SettingsManager.js` — validace a persist nastavení
- `src/audio/AudioManager.js` — WebAudio + Mixkit vrstvy
- `src/ui/WheelRenderer.js` — SVG kolo a spin motion
- `src/ui/SettingsPanel.js` — editor kola
- `src/ui/ParticleSystem.js` — částice / flash
- `src/ui/UI.js` — HUD, counters, reward flight, finale
- `src/style.css`, `src/polish.css`, `src/v3.css` — vizuální vrstvy

## Zvuky

Hra používá vlastní WebAudio vrstvy a jako doplněk několik free SFX z Mixkitu. Pokud se externí sample nenačte, WebAudio fallback dál funguje.

Zdroj: https://mixkit.co/free-sound-effects/  
Licence: https://mixkit.co/license/

## Vývoj

```bash
npm install
npm test
npm run build
```

GitHub Pages deploy běží z `main` přes existující workflow.
