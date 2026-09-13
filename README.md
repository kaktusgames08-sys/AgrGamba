# GAMBA

**AGRAELUS vs CHATTER — a meme randomizer, not a gambling app.**

There is no money, no deposits, no withdrawals, no crypto, no microtransactions,
and no real stakes anywhere in this project. It is a comedic, over-the-top
slot-machine-style randomizer built for streams, Discord, and clips.

## The core rule: the reel selects the LOSER

This is the single most important mechanic in the whole app, and it's
consistent everywhere — code, UI copy, stats, streaks, everything:

```
REEL RESULT = LOSER

AGRAELUS lands on the reel  ->  Agraelus takes the L  ->  CHATTER WINS
CHATTER  lands on the reel  ->  Chatter takes the L    ->  AGRAELUS WINS
```

The machine never "picks a winner." It picks who takes the L, and the other
side wins by default.

## Features

- **2–4 second spins** (default), with **Turbo** (1–1.5s) and **Degenerate**
  (0.5–0.8s) modes for people who just want to smash the button again.
- **Space bar or physical lever** to spin — click the lever or grab-and-drag
  it down with the mouse.
- Spin outcome is **decided exactly once**, the instant the spin starts
  (`SpinEngine.spin()`). Everything after that — near-misses, slowdown,
  rare presentations — is pure presentation and can never change the result.
- **Near-miss drama**: the reel teases landing on one name, goes quiet, then
  ticks over to the real result.
- **Rare spin flavors** (cosmetic only, roll independently of the outcome):
  Ultra Spin, Suspicious Spin, Instant Spin (`BONK`), Fake Crash
  (`ERROR... nah`), and Jackpot (`still worth absolutely nothing`).
- **Win streaks** tracked by actual winner (not by what lands on the reel),
  with escalating streak labels: `HEATING UP` (3x) → `ON FIRE` (5x) →
  `WHAT THE FUCK` (10x).
- **Score, spin counter, and last-10 result history** (hover/click a tile to
  see who took the L and who won).
- **Fully configurable odds**: a slider for "Agraelus L chance" (Chatter's is
  always `100 - that`), a numeric custom-odds input, and named presets (Fair,
  Agra Advantage, Chat Advantage, Agra Propaganda, Chat Revolution, Pure
  Gamba) — all named by loss chance so there's no ambiguity about who's
  actually favored to win.
- **Transparent Mode**: optionally show the real odds on screen at all times.
- **Turbo / Degenerate / Streamer Mode / Fullscreen**, screen shake, flash
  intensity (Off/Reduced/Full), and particle intensity (Low/Normal/INSANE),
  all saved to `localStorage`.
- **Sound is fully synthesized** with the Web Audio API — no audio files to
  load, ship, or license. Swap in real samples later if you want (see
  `src/audio/AudioManager.js`).
- **Fake chat spam** and confetti bursts on every result, capped and
  auto-cleaned so they never block the next spin or bloat the DOM.

## Controls

| Key           | Action                       |
|---------------|-------------------------------|
| `SPACE`       | Spin (or start on the splash) |
| `R`           | Spin again                    |
| `F`           | Fullscreen                    |
| `M`           | Mute                          |
| `ESC`         | Toggle settings                |

You can also click the lever, or grab it with the mouse and drag it down.

## Odds

Odds are always expressed as **chance to take the L**:

- `Agraelus L chance = 70%` means Agraelus loses ~70% of spins, so
  **Chatter wins ~70% of spins**.
- Chatter's L chance is always `100 - Agraelus L chance` — the two always
  sum to 100%.

Presets (spec-named to avoid ambiguity):

| Preset            | Agraelus L | Chatter L | Net effect                |
|-------------------|-----------:|----------:|----------------------------|
| Fair               | 50%        | 50%       | Coin flip                  |
| Agra Advantage      | 30%        | 70%       | Agraelus wins ~70%         |
| Chat Advantage      | 70%        | 30%       | Chatter wins ~70%          |
| Agra Propaganda     | 10%        | 90%       | Agraelus wins ~90%         |
| Chat Revolution     | 90%        | 10%       | Chatter wins ~90%          |
| Pure Gamba          | 50%        | 50%       | Coin flip, badge shown     |

Custom odds (0–100%, always summing to 100%) are available in Settings.

## Installation

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Preview a production build locally:

```bash
npm run preview
```

## Development / code structure

The codebase is split so the RNG can never be touched by presentation code:

```
src/core/SpinEngine.js        pure RNG logic — spin(agraelusLoseChance) -> { loser, winner }
src/core/GameState.js         ephemeral runtime state (is a spin in progress, etc.)
src/core/SettingsManager.js   odds/turbo/volume/etc. — persisted to localStorage, reads URL params
src/core/StatsManager.js      wins/losses/streaks/history — persisted to localStorage
src/audio/AudioManager.js     synthesized SFX/music via WebAudio
src/ui/AnimationController.js reel timeline, near-miss, reveal — takes a pre-computed result and only presents it
src/ui/ParticleSystem.js      confetti bursts, capped & auto-cleaned
src/ui/ChatSpam.js            floating fake chat messages
src/ui/Texts.js               win/lose/near-miss line databases (20+ each)
src/ui/UI.js                  DOM query + render helpers
src/main.js                   wiring: input handling, lever, settings panel, keyboard
```

`SpinEngine.spin()` is intentionally the only place randomness touches the
actual outcome. `AnimationController` receives `{ loser, winner }` and is
physically incapable of changing it — it only decides *how* to show it,
including which rare presentation (if any) to layer on top.

## GitHub Pages

A workflow at `.github/workflows/deploy.yml` builds the app and deploys
`dist/` to GitHub Pages on every push to `main`. In your repo settings,
set **Pages → Source → GitHub Actions** once, and it deploys automatically
after that.

The Vite config uses `base: './'` (relative paths), so the build works from
any GitHub Pages URL shape without extra configuration.

## OBS / streaming

The page has no desktop-only APIs and works as a plain OBS Browser Source.
Turn on **Streamer Mode** in Settings to hide the menu bar and hint bar and
enlarge the score, streak, and reveal text for on-stream readability.

## URL parameters

| Param          | Effect                                            |
|-----------------|----------------------------------------------------|
| `?agraLose=70`  | Agraelus has a 70% chance to take the L             |
| `?agraWin=70`   | Agraelus has a 70% chance to **win** (distinct from `agraLose` — don't confuse the two) |
| `?turbo=1`      | Start in Turbo Mode                                 |
| `?mute=1`       | Start muted                                         |
| `?streamer=1`   | Start in Streamer Mode                              |

Example: `https://you.github.io/gamba/?agraLose=30&turbo=1`

## No real gambling, ever

This project deliberately contains none of the following, and never will:
a balance, deposits, withdrawals, real-money bets, paid spins, crypto, or any
gambling backend. It's a meme randomizer that decides, with exaggerated
drama, who takes the L.
