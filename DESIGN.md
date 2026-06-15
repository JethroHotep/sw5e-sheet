# SW5e Character Sheet Web App Design

## Goal

Build a local JavaScript web app that loads an SW5e character from JSON, displays a usable character sheet, lets the player click attacks/checks/saves/features, and sends Roll20-compatible chat commands to an open Roll20 game.

The app should be useful at the table before it is beautiful: fast load, readable stats, obvious roll targets, and reliable Roll20 output.

## Main User Flow

1. Player opens the sheet web app.
2. Player loads a character JSON file.
3. App validates the JSON and renders the character sheet.
4. Player clicks a weapon, skill, saving throw, force/tech power, feature, or custom roll.
5. App builds a Roll20 chat command using the character data and current toggles.
6. App sends the Roll20 formula to the Roll20 game chat.
7. Roll20 evaluates the dice and posts the result to the session chat.

## Roll20 Integration Strategy

Roll20 supports chat rolls such as `/roll 1d20+5`, inline rolls such as `[[1d20+5]]`, and default roll templates such as:

```text
&{template:default} {{name=Blaster Rifle}} {{attack=[[1d20+5]]}} {{damage=[[1d8+3]] energy}}
```

The sheet app should generate Roll20 chat text instead of trying to reproduce Roll20's dice engine. That keeps the math visible and lets Roll20 own final dice evaluation.

Directly sending text into "another browser page" has browser security constraints. The practical options are:

1. **Manual copy fallback**
   The app puts the Roll20 macro text in a compact outbox and copies it to the clipboard. This is trivial and reliable.

2. **Browser extension bridge**
   A small extension runs on both the local sheet page and Roll20. The sheet posts a message to the extension; the extension fills the Roll20 chat input and submits it. This is the best long-term solution.

3. **Userscript bridge**
   A Tampermonkey/Violentmonkey script runs on Roll20, listens on `localStorage`, `BroadcastChannel`, or extension messaging, and posts chat commands. Easier to prototype than a full extension, but more brittle.

4. **Roll20 Mod/API script**
   Useful only if the game has access to Roll20 Mods and the GM installs a script. It can listen to Roll20 chat once messages arrive, but it does not solve cross-site browser sending by itself.

Recommended path: implement manual copy first, then add a browser extension bridge once the sheet and JSON format are stable. The Roll20 game is assumed to be open in the same browser profile as the sheet app, and all rolls are public.

## App Architecture

### Modules

- `character-loader`
  Reads local JSON, migrates older versions, validates required fields, and reports useful errors.

- `character-model`
  Normalizes ability scores, modifiers, proficiency, weapon lists, powers, resources, and derived stats.

- `roll-builder`
  Converts sheet actions into Roll20 formulas and display metadata.

- `roll-outbox`
  Stores recent rolls, supports copy, resend, and bridge delivery.

- `roll20-bridge`
  Abstract transport with implementations:
  - `clipboard`
  - `browser-extension`
  - `userscript`

- `ui`
  Renders the sheet and lets the user toggle situational modifiers.

### Suggested Stack

Start with vanilla TypeScript, Vite, and plain CSS. This keeps the app local, fast, and easy to reason about. Add a framework later only if the sheet UI grows past what small components can comfortably handle.

## JSON Shape

Use a versioned JSON format so we can evolve the sheet without breaking old characters. The first version is hand-authored. See `docs/json-spec.md` for the contract, `examples/vela-renn.json` for a compact starter character, and `examples/nim-sw5e.json` for a fuller real-character example.

```json
{
  "schemaVersion": 1,
  "character": {
    "name": "Vela Renn",
    "level": 5,
    "class": "Scout",
    "background": "Spacer",
    "proficiencyBonus": 3,
    "abilities": {
      "str": 10,
      "dex": 16,
      "con": 14,
      "int": 12,
      "wis": 13,
      "cha": 8
    },
    "savingThrows": {
      "str": false,
      "dex": true,
      "con": false,
      "int": true,
      "wis": false,
      "cha": false
    },
    "skills": {
      "acrobatics": { "ability": "dex", "proficient": true, "expertise": false },
      "technology": { "ability": "int", "proficient": true, "expertise": false }
    },
    "combat": {
      "armorClass": 16,
      "initiativeBonus": 3,
      "speed": 30,
      "hitPoints": {
        "max": 38,
        "current": 38,
        "temporary": 0
      }
    },
    "attacks": [
      {
        "id": "blaster-rifle",
        "name": "Blaster Rifle",
        "attackAbility": "dex",
        "proficient": true,
        "attackBonus": 0,
        "damage": [
          { "formula": "1d8", "ability": "dex", "bonus": 0, "type": "energy" }
        ],
        "properties": ["range", "two-handed"]
      }
    ],
    "resources": [
      { "id": "superiority", "name": "Superiority Dice", "current": 4, "max": 4 }
    ],
    "customRolls": [
      {
        "kind": "roll",
        "id": "scanner-check",
        "name": "Scanner Sweep",
        "formula": "1d20 + @int + @prof",
        "notes": "Technology check using scanner tools"
      }
    ]
  }
}
```

## Roll Model

Every clickable roll should compile to an internal roll request:

```json
{
  "kind": "attack",
  "title": "Blaster Rifle",
  "characterName": "Vela Renn",
  "parts": {
    "attack": "1d20 + 3 + 3",
    "damage": "1d8 + 3"
  },
  "damageType": "energy",
  "notes": "range, two-handed"
}
```

The Roll20 formatter then converts it to chat:

```text
&{template:default} {{name=Blaster Rifle}} {{character=Vela Renn (+6)}} {{attack=[[1d20 + 6]]   [[1d20 + 6]]}} {{details=range, two-handed}} {{Energy=[[1d8 + 3]]}}
```

Attack output should be structured to feel close to Roll20's native sheet cards: item name as the title, character/modifier as subtitle context, attack result row first, details/properties next, then one row per damage type.

## Roll Features

First pass should include:

- Ability checks.
- Saving throws.
- Skill checks.
- Initiative with `&{tracker}` as an optional toggle.
- Weapon attacks and damage.
- Custom rolls.
- Reference actions that post public Roll20 notes without dice.
- D20 mode selector for normal, advantage, disadvantage, or both. `Both` outputs two independent d20 results; use the first for normal, the higher for advantage, and the lower for disadvantage.
- Global modifier input, such as bless, cover, temporary bonus, or penalty.
- Roll output history.

Second pass:

- Critical hit damage expansion.
- Ammunition tracking.
- Resource spend prompts.
- Force/tech powers.
- Concentration reminders.
- Conditions and exhaustion effects.
- Per-attack situational toggles.

## UI Layout

The first screen should be the sheet, not a landing page.

- Top bar: character name, level/class, JSON load button, and Roll20 bridge status.
- Left column: abilities, saves, skills.
- Center column: combat stats, attacks, powers/features.
- Right column: resources, conditions, roll outbox/history.
- Mobile: stacked sections with sticky roll mode and outbox controls.

Clickable roll elements should look like controls, not plain text. Each row can show the computed modifier and a small roll button.

## Validation Rules

The loader should catch:

- Missing `schemaVersion`.
- Missing character name.
- Invalid ability scores.
- Unknown ability keys.
- Attacks without a name or damage formula.
- Roll formulas containing unsupported placeholders.
- Custom roll entries with unsupported `kind` values.
- `kind: "roll"` entries without formulas.

The app should still render partial data when possible and show warnings rather than failing the entire sheet.

## Security And Browser Limits

The local sheet page should not ask for Roll20 credentials. It should rely on the user already being logged into Roll20 in another tab.

The extension/userscript bridge should send only chat text, not scrape character data from Roll20. Keep the trust boundary small.

## Implementation Milestones

1. Static prototype with sample JSON and clickable rolls copied to clipboard.
2. JSON loader, validator, and derived modifiers.
3. Roll builder with Roll20 default-template output.
4. Sheet UI polish and responsive layout.
5. Browser extension bridge.
6. Import helper for data extracted from the fillable PDF or hand-authored JSON.

## Decisions

- Roll20 performs all dice rolls. The app builds formulas and sends them.
- D20 rolls default to `Both`, but the player can choose normal, advantage, or disadvantage at the top of the sheet.
- The UI should be a web-native play dashboard, not a recreation of the fillable PDF.
- JSON is hand-authored for now.
- The project should include a clear JSON spec and example character files.
- The Roll20 session is expected to be open in the same browser profile as the sheet app.
- First-pass rolls are public only. GM rolls, whispers, and private rolls are out of scope.
