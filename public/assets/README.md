Drop real portraits here to replace the built-in text/CSS placeholders:

- `agraelus.png`
- `chatter.png`

The app currently renders both sides as pure CSS/text (no image assets required
to run). If you add these files, wire them into `src/ui/AnimationController.js`
and `src/style.css` (`.reel-cell`) — the code is written so swapping in real
art is a drop-in change, not a refactor.
