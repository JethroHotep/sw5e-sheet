# sw5e-sheet

A local, JavaScript-based SW5e character sheet that loads hand-authored JSON and produces public Roll20 chat commands.

## Current Prototype

- Loads `examples/nim-sw5e.json` by default.
- Can load any compatible local JSON file.
- Renders abilities, saves, skills, combat stats, resources, attacks, custom rolls, and reference actions.
- Builds Roll20 `&{template:default}` chat commands.
- Provides Normal, Advantage, Disadvantage, and Both toggles for d20 rolls. Both emits two d20 results so normal, advantage, and disadvantage are all covered by one click.
- Copies each generated command to the clipboard for pasting into Roll20 chat.
- Can auto-send commands through the optional unpacked bridge extension in `roll20-extension`.
- Uses an original generated sci-fi cockpit/starfield background image in `assets/starfield-cockpit-bg.png`.

## Run

Because the app fetches example JSON files, use a local static server from the repo root:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8765/index.html
```

Opening `index.html` directly still allows manual JSON loading, but browser security may block loading the bundled examples.

## Character JSON

See [docs/json-spec.md](docs/json-spec.md), [examples/vela-renn.json](examples/vela-renn.json), and [examples/nim-sw5e.json](examples/nim-sw5e.json).

## Optional Roll20 Bridge

The app always copies generated commands to the clipboard. To also send them into an open Roll20 game tab, load the unpacked extension in [roll20-extension](roll20-extension).

See [roll20-extension/README.md](roll20-extension/README.md) for install steps.
