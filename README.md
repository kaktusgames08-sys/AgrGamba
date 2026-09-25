# KOLO NEŠTĚSTÍ v4

Browserové kolo pro stream, OBS a GitHub Pages. V4 staví prezentaci kolem jasné sekvence **spin → anticipation → micro-freeze → impact → reward → návrat do ready stavu**.

## Co přibylo ve v4

- synchronizovaný **LED chase ring** kolem kola,
- třífázové anticipation chování při zpomalování,
- krátký micro-freeze před odhalením výsledku,
- silnější, ale jemný camera punch místo chaotického shake,
- výsledky se zobrazují přímo přes kolo místo těžkého popup boxu,
- částka používá **mechanický rolling-digit counter**,
- center hub mění stav podle průběhu: SPINY → ? → POZOR → výsledek → KONEC,
- krátký spin-start whoosh + reálný game-show wheel slowdown sample + jemné pointer ticks + impact + reward audio,
- jemný 3D parallax podle myši,
- reward tiers pro malé/střední/velké částky a x2/x3,
- idle attract animace po skončení akce,
- tři presentation presety: **CLEAN / ARCADE / MAX FX**.

Výsledek se stále vybírá pouze jednou před roztočením. Vizuální anticipation výsledek nijak nepřehazuje ani nevytváří falešný near-miss.

## Nastavení kola

Klikni na **⚙** nebo stiskni `S`.

Měnit lze:

- presentation preset,
- počáteční spiny,
- délku spinu,
- hlasitost,
- intenzitu efektů,
- ambientní pohyb,
- historii,
- 6–24 polí,
- peníze / násobič,
- hodnotu pole,
- barvu,
- `+SPIN` pro každé pole.

Výchozí kolo má nově **tři pole 100 Kč bez +SPIN**, rovnoměrně rozložená po 18 segmentech. Každé okamžitě ukončuje běh, takže je na každém spinu 3/18 (16,7 %) šance na exit a částky méně utíkají do nesmyslných hodnot. V editoru jde rozložení dál ručně změnit. Každé fyzické políčko má stejnou pravděpodobnost.

## Ovládání

- `SPACE` — spin
- `R` — restart po konci hry
- `F` — fullscreen
- `M` — mute
- `S` — nastavení

## Architektura

- `src/core/WheelConfig.js` — výchozí kolo
- `src/core/WheelEngine.js` — RNG a landing math
- `src/core/GameState.js` — částka, spiny a historie
- `src/core/SettingsManager.js` — persist a normalizace nastavení
- `src/audio/AudioManager.js` — webový wheel slowdown sample, jemný ticking, anticipation a reward SFX
- `src/ui/WheelRenderer.js` — SVG kolo a staged spin motion
- `src/ui/LedRing.js` — synchronizovaný LED ring
- `src/ui/RollingCounter.js` — rolling-digit counter
- `src/ui/ParallaxController.js` — depth/parallax + camera punch
- `src/ui/SettingsPanel.js` — editor kola a presety
- `src/ui/UI.js` — HUD, center hub, reward sequence a finale
- `src/style.css`, `src/polish.css`, `src/v3.css`, `src/v4.css` — vizuální vrstvy

## Zvuky

Původní continuous motor byl odstraněn. Dojezd kola používá **Wheel Spin Click Slow Down** z Pixabay (pooky1 / freesound_community), který je na Pixabay označený jako free for use pod Pixabay Content License. Reward zvuky dál používají free SFX z Mixkitu. Pokud se externí sample nenačte, základní WebAudio feedback dál funguje.

Pixabay wheel SFX: https://pixabay.com/sound-effects/film-special-effects-wheel-spin-click-slow-down-101152/  
Pixabay licence: https://pixabay.com/service/license-summary/  
Mixkit: https://mixkit.co/free-sound-effects/  
Mixkit licence: https://mixkit.co/license/

## Vývoj

```bash
npm install
npm test
npm run build
```

GitHub Pages deploy běží z `main` přes existující workflow.
