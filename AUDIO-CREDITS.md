# Audio sources

The game bundles selected sounds by Kenney under CC0 1.0 Universal.

- Casino Audio 1.1: https://kenney.nl/assets/casino-audio
  - chip-lay-1, chips-collide-1, chips-handle-2, chips-stack-1, card-fan-1, card-slide-1, dice-shake-1.
- Interface Sounds 1.0: https://kenney.nl/assets/interface-sounds
  - click_001, confirmation_001, bong_001.

Original license files are included in public/audio/. Files were downloaded from the author's official site on 2026-09-28. CC0 permits use and redistribution, including in source repositories. No third-party music track is bundled. Musical stingers and the optional quiet ambient chord are synthesized by this project's AudioManager.

Playback uses a master gain, dynamic compressor and a maximum of 16 concurrent effect voices. Muting stops scheduled effects and ambience immediately. A failed audio load falls back to synthesized cues and does not interrupt gameplay.
