# sw5e-sheet

A local, JavaScript-based SW5e character sheet that loads hand-authored JSON and produces public Roll20 chat commands.

## Current Prototype

- Loads `examples/nim-sw5e.json` by default.
- Can load any compatible local JSON file.
- Renders abilities, saves, skills, combat stats, resources, attacks, custom rolls, and reference actions.
- Builds Roll20 `&{template:default}` chat commands.
- Copies each generated command to the clipboard for pasting into Roll20 chat.

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
