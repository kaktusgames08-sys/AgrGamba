# KOLO NEŠTĚSTÍ v4.6.0

Browserové kolo pro stream a GitHub Pages.

## v4.6.0 — Dev Showtime

- Odstraněn samostatný OBS režim a jeho ovládání.
- Nový scénický vzhled je zatím dostupný pouze přes zvláštní dev odkaz; hlavní stránka má stávající vzhled.
- Dev náhled ukládá výsledky, nastavení a zvuk odděleně od hlavní hry.
- Nová grafika prasátka se čtyřmi výrazy, nasvícená scéna, kovové kolo a výraznější výsledky.

## v4.5.2

- mechanické zvuky kola zůstávají wheel-only, ale nad ně přibyla výraznější **casino/automat reward vrstva**,
- start spinu má okamžitý krátký bright cue, aby klik na SPIN působil živěji,
- anticipation má tři stupně rostoucího napětí s rychlejšími výškovými pulzy,
- malé / střední / velké peněžní výsledky mají odlišné slot-style win motivy,
- velká výhra a násobič dostávají basový punch + ascending fanfare + sparkle,
- každý **+SPIN** má vlastní jasně rozpoznatelný reward cue,
- rekord/milestone používá delší jackpot-like flourish,
- zvukový preview v nastavení nově předvede celý oblouk: spin → napětí → landing → big win → +SPIN,
- wheel mechanika stále nepoužívá kostky, karty ani žetony; žetony jsou pouze jemná payout textura po výsledku.

## v4.5.1

- odstraněný `dice-shake` ze startu kola,
- pointer tick, roztočení, dojezd i finální mechanický náraz kola jsou nově **100% syntetizované WebAudio zvuky**,
- samotná mechanika kola už nepoužívá zvuky kostek, karet ani žetonů,
- Hardcore přepnutí kola už nepoužívá card-slide sample,
- náhled zvuku v nastavení přehrává jen wheel spin → zpomalování → pointer klik → dopad,
- žetony zůstávají pouze jako samostatný payout efekt po peněžní výhře, ne jako zvuk rotace kola.

## v4.5.0

- přepracovaný zvuk samotného kola: mechanický start, dynamický vzduch/rotace, výraznější pointer tick a hutnější dopad,
- během spinu se wheel ambience mění podle skutečné rychlosti zpomalování,
- money / multiplier / konec sturgery jsou vrstvenější a méně „suché“,
- přidané **UKONČIT SÉRII** v Klasice/Vlastním režimu po prvním spinu,
- dobrovolný konec vyžaduje potvrzení, uloží aktuální částku do archivu i leaderboardu a přežije reload/zálohu,
- Hardcore zůstává pevně tříspinový a dobrovolné ukončení v něm není dostupné,
- výraznější, sytější wheel paleta, zlato, panely, LED a glow během spin/anticipation/landing fází,
- klávesa **E** otevře potvrzení ukončení série, když je tato možnost dostupná.

## v5.0.0 — Casino Edition

- Nové vínové a zlaté UI, čitelnější kolo, barvy podle typu odměny a oddělené režimy Normál / Hardcore.
- Zvuky žetonů a karet od Kenney (CC0), nové motivy pro násobič, rekord a finále; volitelný ambient, okamžitý mute a limit současných hlasů. Zdroj a licence: [AUDIO-CREDITS.md](AUDIO-CREDITS.md).
- Roztočení nejdřív uloží přesně vylosovaný výsledek. Refresh obnoví částku, zbývající spiny, hráče i kompletní historii.
- Automatický zápis ukončené série do archivu a samostatné žebříčky pro Normál, Hardcore a vlastní pravidla. Původní výsledky zůstávají zachované.
- Fronta hráčů, výsledková karta s pořadím, text pro sdílení a export obrázku PNG.
- Pojmenované profily kola a JSON export/import archivu a profilů. Opakovaný import stejné zálohy neduplikuje výsledky.
- Úprava hlasitosti, rychlosti a efektů zachová rozjetou sérii. Pravidla a hráč se zamknou do jejího konce.
- Responzivní rozložení, podpora omezeného pohybu a klávesnice.
- Pravděpodobnosti polí a Web Crypto RNG zůstávají stejné. Hra se sama neroztáčí.

### Použití

Před začátkem napiš přezdívku do pole hráče. V **Frontě hráčů** zadej jedno jméno na řádek. Po finále můžeš spustit novou sérii stejného hráče nebo ručně posunout frontu.

**Archiv** obsahuje dokončené série a jejich jednotlivé spiny. Export zálohy ukládá výsledky a profily do JSON. Data jsou lokální pro daný prohlížeč a zařízení; online synchronizace není součástí hry. Rozehraná série se obnovuje samostatně z místního úložiště. Pokud prohlížeč ukládání blokuje, hra dál funguje, ale před zavřením si stáhni zálohu dokončených výsledků.

**Profily kola** uloží současné nastavení pod názvem. Pravidla vlastního kola upravíš v nastavení; Hardcore má vždy své pevné tři spiny.

V nastavení je hlasitost efektů, volitelný tichý ambient a tlačítko pro poslech. Presety **Klidný**, **Casino** a **Showtime** mění intenzitu prezentace.

## v4.4.3

- výsledek spinu používá místo `Math.random()` browserové `crypto.getRandomValues()`,
- z Web Crypto se skládá plných **53 bitů náhodnosti** pro hodnotu v rozsahu `[0, 1)`,
- crypto RNG určuje náhodnou fyzickou pozici dopadu, počet extra otoček i drobný duration jitter,
- pravděpodobnosti polí se nemění: stejně velká fyzická pole mají stále stejnou šanci,
- žádné vlastní seedy, pity systém ani skryté váhy nebyly přidány,
- `Math.random()` zůstává jen jako fallback v prostředí bez Web Crypto.

## v4.4.2

- leaderboard doplněný o nové výsledky,
- limit zvednutý z 10 na 30 záznamů, takže se žádný z dodaných výsledků nezahodí,
- leaderboard se řadí podle prohrané částky od nejvyšší,
- seznam je scrollovatelný uvnitř panelu, aby se nerozbila single-screen verze,
- leaderboard storage key posunutý na v3, aby se nové seed výsledky ukázaly i lidem se starým localStorage.

## v4.4.1

- normální kolo má nově přesně **1× 100 Kč KONEC**,
- staré uložené normal wheel konfigurace se automaticky migrují na jeden konec,
- Hardcore režim zůstává beze změny.

## v4.4.0

Performance pass bez záměrné změny vzhledu nebo gameplaye:

- LED ring už nepřepisuje všech 48 žárovek každý animation frame,
- coin animace prasátka zpracovává jen právě aktivní mince místo celé dávky,
- particle burst používá pool/reuse DOM částic místo neustálého vytváření nových elementů,
- odstraněné synchronní forced-reflow restarty UI animací,
- historie se nepřerenderuje, pokud se její data nezměnila,
- normal/Hardcore/multiplier SVG kola se cachují a znovu používají,
- formátování Kč používá sdílené `Intl.NumberFormat` instance.

## v4.3.2

- normální kolo má nově přesně **2× 100 Kč KONEC** místo tří,
- staré uložené normal wheel konfigurace se automaticky migrují na dva konce.

## v4.3.1

- desktop layout se nově vejde na jednu obrazovku při 100% zoomu,
- hlavní SPIN a HARDCORE tlačítko jsou na desktopu vedle sebe,
- na nižších výškách se automaticky zmenší wheel/panely a schovají jen pomocné key hints.

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

- potisengage — 4658 Kč — 44 série
- jerusalemcrusader — 1975 Kč — 18 série
- Zasr_nyCartman — 1430 Kč — 18 série
- jerusalemcrusader — 1250 Kč — 13 série
- JimmySliipek — 1170 Kč — 14 série
- potisengage — 1145 Kč — 40 série
- hodneholoube — 990 Kč — 20 série
- pan_m — 840 Kč — 11 série
- jerusalemcrusadser — 705 Kč — 15 série
- MinimWinter — 470 Kč — 8 série
- potisengage — 460 Kč — 8 série
- Manhttn — 300 Kč — 5 série
- potisengage — 250 Kč — 5 série
- fkroupic — 180 Kč — 8 série
- JimmySiipek — 180 Kč — 4 série
- Aizeens — 100 Kč — 1 série
- pan_m — 100 Kč — 1 série
- potisengage — 100 Kč — 1 série

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
