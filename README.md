# KOLO NEŠTĚSTÍ v4.2

Browserové kolo pro stream, OBS a GitHub Pages. Aktuální verze drží férový fyzický stop kola, tři finální stovky a přidává výrazně čistší prezentaci výsledku, adaptivní fullscreen layout, leaderboard a prasátko s finální animací.

## Hlavní změny ve v4.2

- výsledek už nepřekrývá střed kola — má vlastní kompaktní dock pod kolem,
- střed kola zůstává jen pro stav hry: SPINY / TOČÍM / PADLO / KONEC,
- vlastní lesklé SVG prasátko ve stylu celé hry,
- při peněžním výsledku letí do prasátka přesně tolik 1 Kč mincí, kolik padlo,
- mince jsou vykreslené přes canvas místo stovek DOM elementů,
- x2 aktualizuje částku v prasátku a spustí vlastní pulse,
- na konci prasátko popraská, exploduje a samo zobrazí finální částku + tlačítko restart,
- starý duplicitní finální overlay se už nepoužívá,
- leaderboard je renderovaný z dat a připravený na další dynamické zdroje,
- layout používá společný `--ui-scale`, takže se automaticky přizpůsobuje výšce a šířce viewportu bez scrollování,
- poslední část spinu má delší plynulý dojezd bez staged snapu,
- **x3 je kompletně odstraněné**; staré uložené x3 segmenty se automaticky převedou na x2,\n- **x2 může být na kole maximálně jednou**; staré uložené konfigurace s více x2 se automaticky opraví,\n- horní HUD má nový premium slot-machine vzhled a vedle částky používá zadaný 7TV emote,\n- leaderboard má větší jména, částky i čitelnou informaci o sérii zatočení.

## Výchozí kolo

Výchozí kolo má 18 fyzických segmentů a **3× 100 Kč bez +SPIN**. Každá stovka ukončuje běh. Každý fyzický segment má stejnou pravděpodobnost.

Násobič je nově pouze **x2** a na kole může být **jen jednou**. Výchozí x3 pole bylo nahrazeno peněžním polem.

## Leaderboard

Výchozí data:

- jerusalemcrusader — 1975 Kč — 18 série zatočení
- fkroupic — 180 Kč — 8 série zatočení

Leaderboard je vykreslovaný modulem `src/ui/Leaderboard.js` a umí používat data uložená v localStorage.

## Nastavení

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
- peníze / x2,
- hodnotu peněžního pole,
- barvu,
- `+SPIN` pro každé pole.

## Ovládání

- `SPACE` — spin
- `R` — restart po konci hry
- `F` — fullscreen
- `M` — mute
- `S` — nastavení

## Architektura

- `src/core/WheelConfig.js` — výchozí kolo
- `src/core/WheelEngine.js` — férový random stop a landing math
- `src/core/GameState.js` — částka, spiny a historie
- `src/core/SettingsManager.js` — persist, migrace a normalizace
- `src/audio/AudioManager.js` — jemné tick/impact/reward audio
- `src/ui/WheelRenderer.js` — SVG kolo a kontinuální smooth spin
- `src/ui/PiggyBank.js` — canvas mince, prasátko a finální exploze
- `src/ui/Leaderboard.js` — data-driven leaderboard
- `src/ui/ViewportScaler.js` — společný adaptivní `--ui-scale`
- `src/ui/UI.js` — HUD, result dock a stavové UI
- `src/piggy.css` — fullscreen polish, leaderboard a piggy finale

## Zvuky

Používá se vlastní WebAudio syntéza a doplňkové free SFX z Mixkitu. Continuous motor kola je odstraněný.

Zdroj: https://mixkit.co/free-sound-effects/  
Licence: https://mixkit.co/license/

## Vývoj

```bash
npm install
npm test
npm run build
```

GitHub Pages deploy běží z `main` přes existující workflow.
