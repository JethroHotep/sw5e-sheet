# SW5e Sheet JSON Spec

This document defines schema version `1` for hand-authored SW5e character files.

The format is intentionally explicit. Derived values such as ability modifiers, skill totals, attack totals, and damage totals should be calculated by the app so the JSON stays readable.

A downloadable JSON Schema is available at [`docs/sw5e-character.schema.json`](sw5e-character.schema.json).

The web sheet is organized around a top summary band for the most-used play values: ability scores with check/save buttons, AC, proficiency, HP, initiative, inspiration, and core DC/speed values. The remaining JSON sections feed the Actions, Tech, Force, Inventory, Logistics, Record, Journal, Skills, Resources, and Outbox panels below that band.

## Top Level

```json
{
  "schemaVersion": 1,
  "character": {}
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `schemaVersion` | number | yes | Must be `1` for the first implementation. |
| `character` | object | yes | Character payload. |

## Character

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | yes | Used in the Roll20 template name. |
| `level` | number | yes | Total character level. |
| `class` | string | yes | Display value, such as `Scout` or `Guardian`. |
| `species` | string | no | Species display value from the paper sheet. |
| `background` | string | no | Display value. |
| `alignment` | string | no | Alignment display value. |
| `playerName` | string | no | Player name. |
| `portrait` | object | no | Uploaded character portrait stored as a browser-displayable data URL. |
| `experiencePoints` | number | no | Current XP. |
| `xpNextLevel` | number | no | XP needed for next level. |
| `inspiration` | boolean | no | Inspiration checkbox state. |
| `passivePerception` | number | no | Passive Perception display value. |
| `proficiencyBonus` | number | yes | Stored directly for hand-authored simplicity. |
| `settings` | object | no | Per-character app settings for D20 mode, chat target, global modifier, initiative tracker, and Roll20 bridge autosend. |
| `abilities` | object | yes | Six SW5e ability scores. |
| `savingThrows` | object | yes | Proficiency flags by ability. |
| `skills` | object | yes | Skill definitions keyed by skill id. |
| `combat` | object | yes | AC, HP, speed, and initiative. |
| `attacks` | array | no | Weapons or attack-like actions. |
| `resources` | array | no | Trackable expendable resources. |
| `inventory` | array | no | Gear, tools, armor, ammo, and other carried items. |
| `journal` | array | no | Dated character journal entries. |
| `credits` | object | no | Current credit balance, notes, and optional help text. |
| `appearance` | object | no | Age, gender, height, weight, size, hair, eyes, skin, appearance text. |
| `personality` | object | no | Traits, ideals, bonds, flaws. |
| `placeOfBirth` | string | no | Birthplace text. |
| `backstory` | string | no | Backstory text. |
| `backgroundFeature` | string | no | Background feature text. |
| `languages` | array | no | Known languages. |
| `carrying` | object | no | Encumbrance, carrying capacity, and weight totals. |
| `valuables` | object | no | Non-credit valuables, treasure, storage, loaned/deposited/received goods. Spendable money belongs in `credits.current`. |
| `powercasting` | object | no | Tech/force save DC, attack modifier, alignment, and power-level grid data. Track Tech Points and Force Points in `resources`. |
| `customRolls` | array | no | Hand-authored clickable rolls and reference actions. |
| `notes` | string | no | Freeform player notes. |

Proficiency should live on the thing it affects: `skills[*].proficient`, `savingThrows[*]`, and `attacks[*].proficient`.

## Settings

Settings are saved with each character so local saves, imported JSON, and exported JSON preserve the play configuration.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `d20Mode` | string | no | One of `normal`, `advantage`, `disadvantage`, or `both`. Defaults to `both`. |
| `chatTarget` | string | no | One of `roll20` or `foundry`. Defaults to `roll20`. |
| `globalModifier` | string or number | no | Global roll modifier text. Defaults to `"0"`. |
| `addInitiativeToTracker` | boolean | no | Whether Roll20 initiative rolls include `&{tracker}`. Defaults to `false`. |
| `autoSendToRoll20Bridge` | boolean | no | Whether generated Roll20 commands auto-send through the bridge extension. Defaults to `true`. |

Example:

```json
{
  "settings": {
    "d20Mode": "both",
    "chatTarget": "roll20",
    "globalModifier": "0",
    "addInitiativeToTracker": true,
    "autoSendToRoll20Bridge": true
  }
}
```

## Abilities

Ability keys must be:

```text
str, dex, con, int, wis, cha
```

Ability scores should be integers from `1` to `30`. The app calculates modifiers using:

```text
floor((score - 10) / 2)
```

## Saving Throws

Saving throw keys match ability keys. Each value is a boolean proficiency flag.

```json
{
  "dex": true,
  "int": true
}
```

Missing keys should be treated as `false` with a validation warning.

In the app, saving throws with `true` give the matching ability save button a proficient save modifier and gold outline.

## Skills

Each skill entry has:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `ability` | string | yes | One of the ability keys. |
| `proficient` | boolean | yes | Adds proficiency bonus. |
| `expertise` | boolean | no | Adds proficiency twice when true. |
| `bonus` | number | no | Flat modifier for items or features. Defaults to `0`. |

In the app, proficient skills display `PROF`. Expertise skills display `EXP`.

Example:

```json
{
  "technology": {
    "ability": "int",
    "proficient": true,
    "expertise": false,
    "bonus": 0
  }
}
```

## Combat

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `armorClass` | number | yes | Display only for now. |
| `initiativeBonus` | number | no | Additional bonus beyond Dexterity modifier. Defaults to `0`. |
| `speed` | number | yes | Walking speed. |
| `hitPoints` | object | yes | Current/max/temp HP. |
| `senses` | object | no | Vision notes. |
| `movement` | object | no | Hourly, daily, and special movement. Use `combat.speed` for normal walking speed. |
| `deathSaves` | object | no | Success and failure counts. |
| `defenses` | object | no | Armor/shield/protections plus advantages, resistances, immunities. |

## Powercasting

Use `powercasting` for displayed save DCs, attack modifiers, force alignment, and power-level notes. Track expendable Tech Points and Force Points in `resources`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `techSaveDc` | string | no | Optional displayed Tech DC. If omitted, app uses `8 + proficiency bonus + INT modifier`. |
| `forceSaveDc` | string | no | Optional displayed Force DC. |
| `techAttackModifier` | string | no | Optional displayed Tech Attack Modifier. If omitted, app uses `proficiency bonus + INT modifier`. |
| `forceAttackModifier` | string | no | Optional displayed Force Attack Modifier. |
| `forceAlignment` | object | no | Light side, dark side, and universal alignment notes. |
| `levels` | array | no | Power-level grid data. |

The app combines tech and force powers into one Powercasting tab. It groups action cards by `powerLevel` (`at-will`, then 1st through 9th level) and adds a color-coded Tech or Force badge from `powerKind`. When those fields are absent, the app attempts to infer them from tech/force point depletion and notes.

## Portrait

The app can store an uploaded character portrait directly in the character JSON. Uploaded images are resized in-browser before saving so they can be used for the header thumbnail and full-frame portrait view.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `dataUrl` | string | no | Image data URL used by the browser. |
| `mimeType` | string | no | Stored image MIME type. |
| `fileName` | string | no | Original uploaded filename. |
| `updatedAt` | string | no | ISO timestamp for the last portrait update. |

## Resources

Resources track expendable class features, powers, ammunition pools, and other counters. The app lets players adjust them manually.

Use `resources` for Tech Points and Force Points so the Resources, Tech, and Force panels all edit the same live counter. Recommended ids are `tech-points` and `force-points`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Stable resource id. |
| `name` | string | yes | Display name. |
| `current` | number | yes | Current value. |
| `max` | number | yes | Maximum value. |
| `unit` | string | no | Display unit, such as `points`, `uses`, or `cells`. |
| `restRecovery` | string | no | `none`, `short`, `long`, or `shortOrLong`. Used by the Short Rest and Long Rest buttons. Omit or use `none` for consumables. |
| `notes` | string | no | Freeform notes. |
| `help` | object | no | Full in-app help page content for the resource. |

## Attacks

Attack entries represent weapons, powers, or any action with attack and damage rolls.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Stable id for UI keys and history. |
| `name` | string | yes | Display and Roll20 title. |
| `attackAbility` | string | no | Ability modifier for attack roll. Omit if attack uses only `attackBonus`. |
| `proficient` | boolean | no | Adds proficiency bonus when true. |
| `attackBonus` | number | no | Flat bonus or penalty. Defaults to `0`. |
| `actionType` | string | no | `action`, `bonusAction`, or `reaction`. Displays a timing tag on the action card. |
| `powerKind` | string | no | `tech` or `force`. Marks this attack for the Powercasting tab. |
| `powerLevel` | string/number | no | `at-will` or a level number. Used to group powers in the Powercasting tab. |
| `damage` | array | no | Damage parts. |
| `properties` | array | no | Display notes, such as `range` or `two-handed`. |
| `notes` | string | no | Extra Roll20 note text. |
| `help` | object | no | Full in-app help page content for the action or attack. |

Damage parts:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `formula` | string | yes | Dice expression without ability bonus, such as `1d8` or `2d6`. |
| `ability` | string | no | Ability modifier to add to damage. |
| `bonus` | number | no | Flat bonus or penalty. Defaults to `0`. |
| `type` | string | no | Damage type text. |

## Custom Rolls And References

## Inventory

Inventory entries represent carried or owned gear.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Stable id. |
| `name` | string | yes | Display name. |
| `category` | string | no | Used to group inventory, such as `armor`, `tools`, or `ammunition`. |
| `quantity` | number | no | Defaults visually to `1`. |
| `cost` | number | no | Credit cost for this line item. |
| `equipped` | boolean | no | Displays an `EQUIP` flag when true. |
| `infused` | boolean | no | Displays an `INFUSE` flag when true. |
| `donned` | boolean | no | Paper-sheet `D` location flag. |
| `backpack` | boolean | no | Paper-sheet backpack location flag. |
| `pouch` | boolean | no | Paper-sheet belt pouch location flag. |
| `location` | string | no | Freeform equipment location. |
| `weight` | number/string | no | Item weight. |
| `armorClassFormula` | string | no | Display-only AC explanation. |
| `notes` | string | no | Freeform item notes. |
| `help` | object | no | Full in-app help page content for the item. |
| `containedResources` | array | no | Item-contained resources, such as a loaded power cell. Use inventory quantity items for loose consumables like spare cells or rations. |
| `depletes` | array | no | Resource costs this item spends when used. |
| `depletionOptions` | array | no | Alternative resource payment choices. |

Contained resources can include `rechargeFromResourceId` for a character resource source or `rechargeFromInventoryItemId` for an inventory quantity source. Prefer `rechargeFromInventoryItemId` for loose consumables such as spare power cells.

Credits:

```json
{
  "current": 35,
  "notes": "Purchased mission gear package."
}
```

## Journal

Journal entries are dated notes managed in the Journal tab. The app sorts entries newest first.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Stable entry id. |
| `date` | string | yes | ISO date, such as `2026-06-17`. |
| `title` | string | no | Short entry title. |
| `text` | string | no | Freeform journal body. |

Example:

```json
{
  "journal": [
    {
      "id": "journal-session-1",
      "date": "2026-06-17",
      "title": "Arrival on Ord Mantell",
      "text": "Logged the job, met the contact, and marked the suspicious crate for later."
    }
  ]
}
```

## Resource Depletion

Actions, custom rolls, references, and inventory items may include `depletes` entries. When the action is clicked, the app subtracts the amount from the referenced resource and rerenders the sheet. The same values can also be adjusted manually in the app; use Download JSON after play to save the updated state.

Character-level resource target:

```json
{
  "target": { "scope": "character", "id": "tech-points" },
  "amount": 2,
  "operation": "spend",
  "trigger": "onCast",
  "notes": "Cast Energy Shield."
}
```

`operation` defaults to `spend`. Use `restore` to refill a target to its max, `set` to assign `amount`, or `add` to increase by `amount`. Reload-style options can combine multiple depletion entries: spend a spare cell, then restore the loaded cell.

Inventory-contained resource target:

```json
{
  "target": {
    "scope": "inventoryItem",
    "itemId": "light-pistol",
    "id": "loaded-power-cell"
  },
  "amount": 1,
  "trigger": "onAttack"
}
```

Hit point target:

```json
{
  "target": { "scope": "hitPoints", "id": "current" },
  "amount": 4,
  "trigger": "onUse",
  "notes": "Self-inflicted strain, environmental damage, or similar table-specific cost."
}
```

Inventory quantity target:

```json
{
  "target": { "scope": "inventoryQuantity", "id": "medpac" },
  "amount": 1,
  "trigger": "onUse"
}
```

Use `depletionOptions` when an action can spend one of several resources, such as a free use or tech points.

## Custom Rolls And References

Custom entries are public Roll20 template actions. Use `kind: "roll"` for actions with dice or math formulas. Use `kind: "reference"` for powers, features, or reminders that should post notes to Roll20 without a fake dice result.

When `kind` is omitted, the app should treat the entry as `roll` for backward compatibility.

Legacy note-only entries with no `formula`, or with `formula` set to `"0"`, are treated as references by the app. Prefer `kind: "reference"` for new files.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `kind` | string | no | `roll` or `reference`. Defaults to `roll`. |
| `id` | string | yes | Stable id. |
| `name` | string | yes | Display and Roll20 title. |
| `actionType` | string | no | `action`, `bonusAction`, or `reaction`. Displays a timing tag on the action card. |
| `powerKind` | string | no | `tech` or `force`. Marks this custom roll/reference for the Powercasting tab. |
| `powerLevel` | string/number | no | `at-will` or a level number. Used to group powers in the Powercasting tab. |
| `formula` | string | for `roll` | Roll formula using supported placeholders. Omit for `reference`. |
| `notes` | string | no | Extra Roll20 note text. |
| `help` | object | no | Full in-app help page content for the custom roll or reference. |

Supported placeholders:

| Placeholder | Meaning |
| --- | --- |
| `@prof` | Proficiency bonus. |
| `@str`, `@dex`, `@con`, `@int`, `@wis`, `@cha` | Ability modifiers. |
| `@level` | Character level. |

Example:

```json
{
  "kind": "roll",
  "id": "scanner-check",
  "name": "Scanner Sweep",
  "formula": "1d20 + @int + @prof",
  "notes": "Technology check using scanner tools"
}
```

Powercasting entries can be declared explicitly. The app also tries to infer older entries from tech/force point depletion and notes such as "At-will tech power" or "2nd-level force power", but explicit fields are preferred:

```json
{
  "kind": "reference",
  "id": "energy-shield",
  "name": "Energy Shield",
  "actionType": "reaction",
  "powerKind": "tech",
  "powerLevel": 1,
  "notes": "Reaction defense; spend tech points to gain +5 AC until the start of your next turn.",
  "depletes": [
    {
      "target": { "scope": "character", "id": "tech-points" },
      "amount": 2,
      "trigger": "onCast"
    }
  ]
}
```

Reference example:

```json
{
  "kind": "reference",
  "id": "energy-shield",
  "name": "Energy Shield",
  "notes": "Reaction defense; when hit by an attack, gain +5 AC until the start of your next turn."
}
```

## Help Pages

Actions, resources, inventory items, contained resources, and credits can include a `help` object. The app renders this as a full-page overlay when the `?` help button beside the object title is clicked.

```json
{
  "help": {
    "title": "Energy Shield",
    "source": "SW5e Player's Handbook",
    "category": "Tech Power",
    "activation": "Reaction",
    "summary": "Reaction defense used when hit, raising AC until the start of your next turn.",
    "details": [
      "Costs 2 tech points in this sheet.",
      "The sheet marks this as a reaction."
    ],
    "sections": [
      {
        "heading": "Sheet Notes",
        "text": "Use when hit by an attack."
      }
    ]
  }
}
```

## D20 Roll Output

D20 roll mode is saved in `character.settings.d20Mode`. The app should offer normal, advantage, disadvantage, and both. `Both` should be the default because it covers normal, advantage, and disadvantage from one Roll20 message.

| Situation | How to read the output |
| --- | --- |
| Normal | Emit one `[[1d20 + modifier]]` field. |
| Advantage | Emit one `[[2d20kh1 + modifier]]` field. |
| Disadvantage | Emit one `[[2d20kl1 + modifier]]` field. |
| Both | Emit two independent `[[1d20 + modifier]]` fields. Use the first for normal, higher for advantage, lower for disadvantage. |

## Public VTT Output

Roll20 output should use the universal default template:

```text
&{template:default} {{name=Character - Roll Name}} {{roll 1=[[1d20 + 5]]}} {{roll 2=[[1d20 + 5]]}} {{notes=Optional note}}
```

Reference actions should omit roll fields:

```text
&{template:default} {{name=Character - Energy Shield}} {{notes=Reaction defense; gain +5 AC until the start of your next turn.}}
```

Attacks should include attack and damage fields:

```text
&{template:default} {{name=Blaster Rifle}} {{character=Character (+6)}} {{attack=[[1d20 + 6]]   [[1d20 + 6]]}} {{details=range, two-handed}} {{Energy=[[1d8 + 3]]}}
```

For attacks, prefer native-sheet-like field order: item name, character/modifier, attack roll, details/properties, damage type rows, notes.

Foundry output should use plain chat text with inline rolls:

```text
**Blaster Rifle**
**Character:** Character (+6)
**Attack:** [[/r 1d20 + 6]]   [[/r 1d20 + 6]]
**Details:** range, two-handed
**Energy:** [[/r 1d8 + 3]]
```
