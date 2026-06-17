# sw5e-sheet

A local, JavaScript-based SW5e character sheet that loads hand-authored JSON and produces public VTT chat commands.

## Current Prototype

- Starts with an empty character by default when no local save exists.
- Can load any compatible local JSON file.
- Can save and load multiple named characters from persistent browser storage for the current site origin.
- Renders abilities, saves, skills, combat stats, resources, attacks, custom rolls, and reference actions.
- Displays inventory grouped by category, plus credit totals when present in the JSON.
- Tracks resource depletion hooks on actions and inventory items, including item-contained resources like loaded power cells.
- Flags proficient saves and skills with `PROF`, and expertise skills with `EXP`.
- Builds Roll20 `&{template:default}` chat commands or Foundry VTT inline-roll chat text.
- Provides Normal, Advantage, Disadvantage, and Both toggles for d20 rolls. Both emits two d20 results so normal, advantage, and disadvantage are all covered by one click.
- Copies each generated command to the clipboard for pasting into Roll20 or Foundry chat.
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

See [docs/json-spec.md](docs/json-spec.md) and [examples/nim-sw5e-v8.json](examples/nim-sw5e-v8.json).

The app header includes a saved-character dropdown, delete control, and data help as the primary workflow. Selecting a saved character loads it. `Import/Export` contains JSON import, current-character JSON export, an in-app JSON spec viewer with raw `.md` and schema downloads, and the sample Nim importer.

Loaded and imported characters autosave to browser storage by character name. Each different application URL has its own saved character list, with up to 12 saved characters per URL. Importing a JSON file asks before replacing an existing saved character with the same name. Export JSON before deleting a browser save if you want a backup.

D20 mode, chat target, global modifier, initiative tracker, and Roll20 bridge autosend are saved in each character's JSON settings.

## Optional Roll20 Bridge

The app always copies generated commands to the clipboard. To also send them into an open Roll20 game tab, load the unpacked extension in [roll20-extension](roll20-extension).

See [roll20-extension/README.md](roll20-extension/README.md) for install steps.

## Foundry VTT

Choose `Foundry` in the `Chat target` toggle. The app copies pasteable chat text using Foundry inline rolls such as `[[/r 1d20 + 5]]`.

The Roll20 bridge is disabled while Foundry is selected.
