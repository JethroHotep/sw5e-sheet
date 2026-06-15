# SW5e Sheet JSON Spec

This document defines schema version `1` for hand-authored SW5e character files.

The format is intentionally explicit. Derived values such as ability modifiers, skill totals, attack totals, and damage totals should be calculated by the app so the JSON stays readable.

A downloadable JSON Schema is available at [`docs/sw5e-character.schema.json`](sw5e-character.schema.json).

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
| `background` | string | no | Display value. |
| `proficiencyBonus` | number | yes | Stored directly for hand-authored simplicity. |
| `abilities` | object | yes | Six SW5e ability scores. |
| `savingThrows` | object | yes | Proficiency flags by ability. |
| `skills` | object | yes | Skill definitions keyed by skill id. |
| `combat` | object | yes | AC, HP, speed, and initiative. |
| `attacks` | array | no | Weapons or attack-like actions. |
| `resources` | array | no | Trackable expendable resources. |
| `inventory` | array | no | Gear, tools, armor, ammo, and other carried items. |
| `credits` | object | no | Starting, spent, and remaining credits. |
| `customRolls` | array | no | Hand-authored clickable rolls and reference actions. |
| `notes` | string | no | Freeform player notes. |

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

In the app, saving throws with `true` display a `PROF` flag.

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

## Resources

Resources track expendable class features, powers, ammunition pools, and other counters. The app lets players adjust them manually.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Stable resource id. |
| `name` | string | yes | Display name. |
| `current` | number | yes | Current value. |
| `max` | number | yes | Maximum value. |
| `unit` | string | no | Display unit, such as `points`, `uses`, or `cells`. |
| `restRecovery` | string | no | `none`, `short`, `long`, or `shortOrLong`. Used by the Short Rest and Long Rest buttons. Omit or use `none` for consumables. |
| `notes` | string | no | Freeform notes. |

## Attacks

Attack entries represent weapons, powers, or any action with attack and damage rolls.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Stable id for UI keys and history. |
| `name` | string | yes | Display and Roll20 title. |
| `attackAbility` | string | no | Ability modifier for attack roll. Omit if attack uses only `attackBonus`. |
| `proficient` | boolean | no | Adds proficiency bonus when true. |
| `attackBonus` | number | no | Flat bonus or penalty. Defaults to `0`. |
| `damage` | array | no | Damage parts. |
| `properties` | array | no | Display notes, such as `range` or `two-handed`. |
| `notes` | string | no | Extra Roll20 note text. |

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
| `armorClassFormula` | string | no | Display-only AC explanation. |
| `notes` | string | no | Freeform item notes. |
| `containedResources` | array | no | Item-contained resources, such as a loaded power cell. |
| `depletes` | array | no | Resource costs this item spends when used. |
| `depletionOptions` | array | no | Alternative resource payment choices. |

Credits:

```json
{
  "starting": 5000,
  "spent": 4995,
  "remaining": 5,
  "notes": "Purchased mission gear package."
}
```

## Resource Depletion

Actions, custom rolls, references, and inventory items may include `depletes` entries. When the action is clicked, the app subtracts the amount from the referenced resource and rerenders the sheet. The same values can also be adjusted manually in the app; use Download JSON after play to save the updated state.

Character-level resource target:

```json
{
  "target": { "scope": "character", "id": "tech-points" },
  "amount": 2,
  "trigger": "onCast",
  "notes": "Cast Energy Shield."
}
```

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
| `formula` | string | for `roll` | Roll formula using supported placeholders. Omit for `reference`. |
| `notes` | string | no | Extra Roll20 note text. |

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

Reference example:

```json
{
  "kind": "reference",
  "id": "energy-shield",
  "name": "Energy Shield",
  "notes": "Reaction defense; when hit by an attack, gain +5 AC until the start of your next turn."
}
```

## D20 Roll Output

D20 roll mode is UI state, not character data. The app should offer normal, advantage, disadvantage, and both. `Both` should be the default because it covers normal, advantage, and disadvantage from one Roll20 message.

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
