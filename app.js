"use strict";

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
const ABILITY_LABELS = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma"
};

const SKILL_LABELS = {
  acrobatics: "Acrobatics",
  animalHandling: "Animal Handling",
  athletics: "Athletics",
  deception: "Deception",
  insight: "Insight",
  intimidation: "Intimidation",
  investigation: "Investigation",
  lore: "Lore",
  medicine: "Medicine",
  nature: "Nature",
  perception: "Perception",
  performance: "Performance",
  persuasion: "Persuasion",
  piloting: "Piloting",
  sleightOfHand: "Sleight of Hand",
  stealth: "Stealth",
  survival: "Survival",
  technology: "Technology"
};

const state = {
  character: null,
  warnings: [],
  rollMode: "both",
  chatTarget: "roll20",
  bridgePending: new Set(),
  latestCommand: "",
  history: []
};

const elements = {
  characterName: document.querySelector("#characterName"),
  characterMeta: document.querySelector("#characterMeta"),
  fileInput: document.querySelector("#fileInput"),
  downloadJsonButton: document.querySelector("#downloadJsonButton"),
  loadVelaButton: document.querySelector("#loadVelaButton"),
  globalModifier: document.querySelector("#globalModifier"),
  initiativeTracker: document.querySelector("#initiativeTracker"),
  autoBridge: document.querySelector("#autoBridge"),
  statusMessage: document.querySelector("#statusMessage"),
  validationPanel: document.querySelector("#validationPanel"),
  combatStats: document.querySelector("#combatStats"),
  initiativeAction: document.querySelector("#initiativeAction"),
  abilities: document.querySelector("#abilities"),
  resources: document.querySelector("#resources"),
  savingThrows: document.querySelector("#savingThrows"),
  skills: document.querySelector("#skills"),
  attacks: document.querySelector("#attacks"),
  customRolls: document.querySelector("#customRolls"),
  references: document.querySelector("#references"),
  latestCommand: document.querySelector("#latestCommand"),
  copyLatestButton: document.querySelector("#copyLatestButton"),
  sendLatestButton: document.querySelector("#sendLatestButton"),
  history: document.querySelector("#history")
};

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadCharacterData(createBlankCharacterData(), "blank character");
});

function bindEvents() {
  document.querySelectorAll("[data-roll-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.rollMode = button.dataset.rollMode;
      document.querySelectorAll("[data-roll-mode]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      setStatus(`D20 mode set to ${button.textContent}.`);
    });
  });

  document.querySelectorAll("[data-chat-target]").forEach((button) => {
    button.addEventListener("click", () => {
      state.chatTarget = button.dataset.chatTarget;
      document.querySelectorAll("[data-chat-target]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      elements.autoBridge.disabled = state.chatTarget !== "roll20";
      if (state.chatTarget !== "roll20") elements.autoBridge.checked = false;
      setStatus(`Chat target set to ${button.textContent}.`);
    });
  });

  elements.fileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const data = JSON.parse(await file.text());
      loadCharacterData(data, file.name);
    } catch (error) {
      setStatus(`Could not load JSON: ${error.message}`, true);
    } finally {
      event.target.value = "";
    }
  });

  elements.downloadJsonButton.addEventListener("click", downloadCurrentJson);
  elements.loadVelaButton.addEventListener("click", () => loadExample("examples/vela-renn.json"));
  elements.copyLatestButton.addEventListener("click", () => copyCommand(state.latestCommand));
  elements.sendLatestButton.addEventListener("click", () => sendCommandToBridge(state.latestCommand));
  window.addEventListener("message", handleBridgeResponse);
}

function createBlankCharacterData() {
  const blankSkills = Object.fromEntries(Object.entries(SKILL_LABELS).map(([id]) => [id, {
    ability: defaultSkillAbility(id),
    proficient: false,
    expertise: false,
    bonus: 0
  }]));

  return {
    schemaVersion: 1,
    character: {
      name: "New Character",
      level: 1,
      class: "Unassigned",
      background: "",
      proficiencyBonus: 2,
      abilities: {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10
      },
      savingThrows: {
        str: false,
        dex: false,
        con: false,
        int: false,
        wis: false,
        cha: false
      },
      skills: blankSkills,
      combat: {
        armorClass: 10,
        initiativeBonus: 0,
        speed: 30,
        hitPoints: {
          max: 1,
          current: 1,
          temporary: 0
        }
      },
      attacks: [],
      resources: [],
      customRolls: [],
      notes: ""
    }
  };
}

async function loadExample(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const data = await response.json();
    loadCharacterData(data, path);
  } catch (error) {
    setStatus(`Could not load ${path}. Use Load JSON or run through a local server.`, true);
  }
}

function loadCharacterData(data, sourceName) {
  const result = validateCharacterData(data);
  if (result.errors.length) {
    renderValidation(result.errors, true);
    setStatus(`Could not load ${sourceName}: ${result.errors[0]}`, true);
    return;
  }

  state.character = data.character;
  state.warnings = result.warnings;
  state.latestCommand = "";
  state.history = [];
  renderSheet();
  renderValidation(result.warnings, false);
  setStatus(`Loaded ${state.character.name} from ${sourceName}.`);
}

function downloadCurrentJson() {
  const data = {
    schemaVersion: 1,
    character: state.character || createBlankCharacterData().character
  };
  const json = `${JSON.stringify(data, null, 2)}\n`;
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(data.character.name || "sw5e-character")}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("Downloaded character JSON.");
}

function validateCharacterData(data) {
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== "object") errors.push("JSON root must be an object.");
  if (data?.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (!data?.character || typeof data.character !== "object") errors.push("character object is required.");

  const character = data?.character || {};
  if (!character.name) errors.push("character.name is required.");
  if (!Number.isFinite(character.level)) errors.push("character.level is required.");
  if (!Number.isFinite(character.proficiencyBonus)) errors.push("character.proficiencyBonus is required.");

  ABILITIES.forEach((ability) => {
    const score = character.abilities?.[ability];
    if (!Number.isInteger(score) || score < 1 || score > 30) {
      errors.push(`abilities.${ability} must be an integer from 1 to 30.`);
    }
    if (typeof character.savingThrows?.[ability] !== "boolean") {
      warnings.push(`savingThrows.${ability} is missing or not boolean; app will treat it as false.`);
    }
  });

  Object.entries(character.skills || {}).forEach(([id, skill]) => {
    if (!ABILITIES.includes(skill.ability)) errors.push(`skills.${id}.ability is invalid.`);
    if (typeof skill.proficient !== "boolean") errors.push(`skills.${id}.proficient is required.`);
  });

  (character.attacks || []).forEach((attack) => {
    if (!attack.id) errors.push("Each attack requires an id.");
    if (!attack.name) errors.push(`Attack ${attack.id || "(missing id)"} requires a name.`);
    if (attack.attackAbility && !ABILITIES.includes(attack.attackAbility)) {
      errors.push(`Attack ${attack.id} has invalid attackAbility.`);
    }
    (attack.damage || []).forEach((damage) => {
      if (!damage.formula) errors.push(`Attack ${attack.id} has damage without formula.`);
      if (damage.ability && !ABILITIES.includes(damage.ability)) {
        errors.push(`Attack ${attack.id} has invalid damage ability.`);
      }
    });
  });

  (character.customRolls || []).forEach((roll) => {
    const kind = roll.kind || "roll";
    if (!["roll", "reference"].includes(kind)) errors.push(`customRolls.${roll.id}.kind is unsupported.`);
    if (!roll.id) errors.push("Each custom roll requires an id.");
    if (!roll.name) errors.push(`Custom roll ${roll.id || "(missing id)"} requires a name.`);
    if (kind === "roll" && !roll.formula) errors.push(`Custom roll ${roll.id} requires a formula.`);
    if (kind === "reference" && roll.formula) warnings.push(`Reference ${roll.id} should omit formula.`);
    if (roll.formula) {
      findUnsupportedPlaceholders(roll.formula).forEach((placeholder) => {
        errors.push(`Custom roll ${roll.id} uses unsupported placeholder ${placeholder}.`);
      });
    }
  });

  return { errors, warnings };
}

function renderSheet() {
  const character = state.character;
  elements.characterName.textContent = character.name;
  elements.characterMeta.textContent = `Level ${character.level} ${character.class}${character.background ? ` - ${character.background}` : ""}`;

  renderCombatStats(character);
  renderAbilities(character);
  renderResources(character);
  renderSavingThrows(character);
  renderSkills(character);
  renderAttacks(character);
  renderCustomRolls(character);
  renderOutbox();
}

function renderCombatStats(character) {
  const hp = character.combat?.hitPoints || {};
  const stats = [
    ["AC", character.combat?.armorClass ?? "-"],
    ["HP", `${hp.current ?? "-"} / ${hp.max ?? "-"}`],
    ["Temp", hp.temporary ?? 0],
    ["Speed", `${character.combat?.speed ?? "-"} ft`],
    ["Prof", formatModifier(character.proficiencyBonus)],
    ["Init", formatModifier(getInitiativeModifier(character))]
  ];

  elements.combatStats.replaceChildren(...stats.map(([label, value]) => makeStat(label, value)));
  const initiative = getInitiativeModifier(character);
  const detail = elements.initiativeTracker.checked ? `${formatModifier(initiative)} tracker` : formatModifier(initiative);
  const initiativeRow = makeRollRow("Initiative", detail, () => handleInitiativeRoll(initiative));
  elements.initiativeAction.replaceChildren(initiativeRow);
}

function renderAbilities(character) {
  const nodes = ABILITIES.map((ability) => {
    const score = character.abilities[ability];
    const wrapper = document.createElement("div");
    wrapper.className = "ability";
    wrapper.innerHTML = `<span>${ABILITY_LABELS[ability]}</span><strong>${score}</strong><div class="small">${formatModifier(abilityMod(score))}</div>`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Roll check";
    button.addEventListener("click", () => handleSimpleRoll(`${ABILITY_LABELS[ability]} Check`, abilityMod(score), `${ability.toUpperCase()} check`));
    wrapper.append(button);
    return wrapper;
  });

  elements.abilities.replaceChildren(...nodes);
}

function renderResources(character) {
  const resources = character.resources || [];
  const nodes = resources.map((resource) => {
    const current = Number(resource.current) || 0;
    const max = Number(resource.max) || 0;
    const percentage = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    const wrapper = document.createElement("div");
    wrapper.className = "resource";
    wrapper.innerHTML = `
      <strong>${escapeHtml(resource.name)}</strong>
      <div class="small">${current} / ${max}</div>
      <div class="resource-meter" aria-hidden="true"><div class="resource-fill" style="width: ${percentage}%"></div></div>
    `;
    return wrapper;
  });

  elements.resources.replaceChildren(...nodes);
}

function renderSavingThrows(character) {
  const rows = ABILITIES.map((ability) => {
    const proficient = Boolean(character.savingThrows?.[ability]);
    const modifier = abilityMod(character.abilities[ability]) + (proficient ? character.proficiencyBonus : 0);
    return makeRollRow(`${ABILITY_LABELS[ability]}`, formatModifier(modifier), () => {
      handleSimpleRoll(`${ABILITY_LABELS[ability]} Save`, modifier, proficient ? "proficient save" : "save");
    });
  });

  elements.savingThrows.replaceChildren(...rows);
}

function renderSkills(character) {
  const rows = Object.entries(character.skills || {})
    .sort(([left], [right]) => labelForSkill(left).localeCompare(labelForSkill(right)))
    .map(([id, skill]) => {
      const modifier = skillModifier(character, skill);
      const detail = `${skill.ability.toUpperCase()} ${formatModifier(modifier)}`;
      return makeRollRow(labelForSkill(id), detail, () => {
        handleSimpleRoll(labelForSkill(id), modifier, `${skill.ability.toUpperCase()} skill`);
      });
    });

  elements.skills.replaceChildren(...rows);
}

function renderAttacks(character) {
  const attacks = character.attacks || [];
  const nodes = attacks.map((attack) => {
    const attackModifier = attackRollModifier(character, attack);
    const damageParts = (attack.damage || []).map((damage) => damageFormula(character, damage));
    const meta = [
      `Attack ${formatModifier(attackModifier)}`,
      damageParts.length ? `Damage ${damageParts.map((part) => part.display).join(", ")}` : "",
      (attack.properties || []).join(", ")
    ].filter(Boolean).join(" - ");

    return makeActionItem(attack.name, meta, attack.notes, "Roll", () => {
      const command = buildAttackCommand(character, attack);
      publishCommand(`${attack.name}`, command);
    });
  });

  elements.attacks.replaceChildren(...nodes);
}

function renderCustomRolls(character) {
  const entries = character.customRolls || [];
  const rollNodes = entries
    .filter((entry) => (entry.kind || "roll") === "roll")
    .map((entry) => makeActionItem(entry.name, resolveFormula(character, entry.formula), entry.notes, "Roll", () => {
      const command = buildCustomRollCommand(character, entry);
      publishCommand(entry.name, command);
    }));

  const referenceNodes = entries
    .filter((entry) => entry.kind === "reference")
    .map((entry) => makeActionItem(entry.name, "Reference", entry.notes, "Post", () => {
      const command = buildReferenceCommand(character, entry);
      publishCommand(entry.name, command);
    }));

  elements.customRolls.replaceChildren(...rollNodes);
  elements.references.replaceChildren(...referenceNodes);
}

function renderValidation(messages, isError) {
  if (!messages.length) {
    elements.validationPanel.hidden = true;
    elements.validationPanel.replaceChildren();
    return;
  }

  const title = document.createElement("strong");
  title.textContent = isError ? "Load errors" : "Compatibility warnings";
  const list = document.createElement("ul");
  messages.forEach((message) => {
    const item = document.createElement("li");
    item.textContent = message;
    list.append(item);
  });
  elements.validationPanel.replaceChildren(title, list);
  elements.validationPanel.hidden = false;
}

function renderOutbox() {
  elements.latestCommand.value = state.latestCommand;
  const nodes = state.history.map((item) => {
    const wrapper = document.createElement("div");
    wrapper.className = "history-item";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const command = document.createElement("div");
    command.className = "small";
    command.textContent = item.command;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Copy";
    button.addEventListener("click", () => copyCommand(item.command));
    wrapper.append(title, command, button);
    return wrapper;
  });

  elements.history.replaceChildren(...nodes);
}

function makeStat(label, value) {
  const node = document.createElement("div");
  node.className = "stat";
  node.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong>`;
  return node;
}

function makeRollRow(title, detail, onClick) {
  const template = document.querySelector("#rollRowTemplate");
  const row = template.content.firstElementChild.cloneNode(true);
  row.querySelector(".roll-title").textContent = title;
  row.querySelector(".roll-detail").textContent = detail;
  row.addEventListener("click", onClick);
  return row;
}

function makeActionItem(title, meta, notes, buttonText, onClick) {
  const wrapper = document.createElement("div");
  wrapper.className = "action-item";

  const main = document.createElement("div");
  main.className = "action-main";

  const text = document.createElement("div");
  const heading = document.createElement("p");
  heading.className = "action-title";
  heading.textContent = title;
  const detail = document.createElement("p");
  detail.className = "action-meta";
  detail.textContent = meta;
  text.append(heading, detail);

  if (notes) {
    const note = document.createElement("p");
    note.className = "small";
    note.textContent = notes;
    text.append(note);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = buttonText;
  button.addEventListener("click", onClick);

  main.append(text, button);
  wrapper.append(main);
  return wrapper;
}

function handleSimpleRoll(title, modifier, notes) {
  const command = state.chatTarget === "foundry"
    ? formatFoundryCard(title, [
        ["Character", state.character.name],
        ...foundryD20Rows("Roll", addFormulaModifier("1d20", modifier + parseGlobalModifier())),
        ["Detail", notes]
      ])
    : formatTemplate(title, {
        character: state.character.name,
        ...d20Fields("roll", modifier + parseGlobalModifier()),
        detail: notes
      });
  publishCommand(title, command);
}

function handleInitiativeRoll(modifier) {
  const tracker = elements.initiativeTracker.checked ? " &{tracker}" : "";
  const fields = d20Fields("roll", modifier + parseGlobalModifier());
  Object.keys(fields).forEach((key) => {
    fields[key] = inline(`${stripInline(fields[key])}${tracker}`);
  });
  const foundryFormula = `${addFormulaModifier("1d20", modifier + parseGlobalModifier())}${tracker}`;
  const command = state.chatTarget === "foundry"
    ? formatFoundryCard("Initiative", [
        ["Character", state.character.name],
        ...foundryD20Rows("Roll", foundryFormula),
        ["Detail", elements.initiativeTracker.checked ? "initiative tracker" : "initiative"]
      ])
    : formatTemplate("Initiative", {
        character: state.character.name,
        ...fields,
        detail: elements.initiativeTracker.checked ? "initiative tracker" : "initiative"
      });
  publishCommand("Initiative", command);
}

function buildAttackCommand(character, attack) {
  const attackModifier = attackRollModifier(character, attack) + parseGlobalModifier();
  if (state.chatTarget === "foundry") {
    const rows = [
      ["Character", `${character.name} (${formatModifier(attackModifier)})`],
      ...foundryD20Rows("Attack", addFormulaModifier("1d20", attackModifier))
    ];
    const details = attackDetails(attack);
    if (details) rows.push(["Details", details]);
    (attack.damage || []).map((part) => damageFormula(character, part)).forEach((part, index) => {
      rows.push([part.type ? titleCase(part.type) : `Damage ${index + 1}`, foundryInline(part.formula)]);
    });
    if (attack.notes) rows.push(["Notes", attack.notes]);
    return formatFoundryCard(attack.name, rows);
  }

  const fields = {
    character: `${character.name} (${formatModifier(attackModifier)})`,
    ...nativeAttackFields(attackModifier)
  };

  const details = attackDetails(attack);
  if (details) fields.details = details;

  const damage = (attack.damage || []).map((part) => damageFormula(character, part));
  damage.forEach((part, index) => {
    const key = part.type ? titleCase(part.type) : `Damage ${index + 1}`;
    fields[key] = inline(part.formula);
  });

  if (attack.notes) fields.notes = attack.notes;

  return formatTemplate(attack.name, fields);
}

function buildCustomRollCommand(character, entry) {
  const resolved = addFormulaModifier(resolveFormula(character, entry.formula), parseGlobalModifier());
  if (state.chatTarget === "foundry") {
    return formatFoundryCard(entry.name, [
      ["Character", character.name],
      ...(formulaUsesD20(resolved) ? foundryD20Rows("Roll", resolved) : [["Roll", foundryInline(resolved)]]),
      entry.notes ? ["Details", entry.notes] : null
    ].filter(Boolean));
  }

  const fields = {
    character: character.name,
    ...(formulaUsesD20(resolved) ? d20FormulaFields("roll", resolved) : { roll: inline(resolved) })
  };
  if (entry.notes) fields.details = entry.notes;
  return formatTemplate(entry.name, fields);
}

function buildReferenceCommand(character, entry) {
  return state.chatTarget === "foundry"
    ? formatFoundryCard(entry.name, [
        ["Character", character.name],
        ["Details", entry.notes || "Reference"]
      ])
    : formatTemplate(entry.name, {
        character: character.name,
        details: entry.notes || "Reference"
      });
}

function formatTemplate(title, fields) {
  const chunks = [`&{template:default}`, `{{name=${cleanRoll20(title)}}}`];
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      chunks.push(`{{${key}=${cleanRoll20(String(value))}}}`);
    }
  });
  return chunks.join(" ");
}

function publishCommand(title, command) {
  state.latestCommand = command;
  state.history.unshift({ title, command });
  state.history = state.history.slice(0, 10);
  renderOutbox();
  copyCommand(command, `Copied ${chatTargetLabel()} command to clipboard.`);
  if (state.chatTarget === "roll20" && elements.autoBridge.checked) {
    sendCommandToBridge(command);
  }
}

async function copyCommand(command, successMessage = "Copied Roll20 command to clipboard.") {
  if (!command) {
    setStatus("No Roll20 command to copy.", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(command);
    setStatus(successMessage);
  } catch {
    elements.latestCommand.focus();
    elements.latestCommand.select();
    setStatus("Clipboard blocked. Command is selected in the outbox.", true);
  }
}

function sendCommandToBridge(command) {
  if (!command) {
    setStatus("No Roll20 command to send.", true);
    return;
  }

  const id = `roll-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  state.bridgePending.add(id);
  window.postMessage({
    source: "sw5e-sheet",
    type: "ROLL20_COMMAND",
    id,
    command
  }, window.location.origin);

  window.setTimeout(() => {
    if (!state.bridgePending.has(id)) return;
    state.bridgePending.delete(id);
    setStatus("Copied. Roll20 bridge not detected; paste manually or install the extension.", true);
  }, 900);
}

function handleBridgeResponse(event) {
  if (event.source !== window) return;
  const message = event.data;
  if (!message || message.source !== "sw5e-roll20-bridge") return;
  if (message.id) state.bridgePending.delete(message.id);

  if (message.ok) {
    setStatus(message.detail || "Sent command to Roll20 bridge.");
  } else {
    setStatus(message.detail || "Roll20 bridge could not send the command.", true);
  }
}

function attackRollModifier(character, attack) {
  const ability = attack.attackAbility ? abilityMod(character.abilities[attack.attackAbility]) : 0;
  const proficiency = attack.proficient ? character.proficiencyBonus : 0;
  return ability + proficiency + (Number(attack.attackBonus) || 0);
}

function damageFormula(character, damage) {
  const modifier = damage.ability ? abilityMod(character.abilities[damage.ability]) : 0;
  const bonus = Number(damage.bonus) || 0;
  const totalBonus = modifier + bonus;
  return {
    formula: addFormulaModifier(damage.formula, totalBonus),
    display: `${addFormulaModifier(damage.formula, totalBonus)}${damage.type ? ` ${damage.type}` : ""}`,
    type: damage.type || ""
  };
}

function skillModifier(character, skill) {
  const base = abilityMod(character.abilities[skill.ability]);
  const proficiencyCount = skill.expertise ? 2 : skill.proficient ? 1 : 0;
  return base + (proficiencyCount * character.proficiencyBonus) + (Number(skill.bonus) || 0);
}

function getInitiativeModifier(character) {
  return abilityMod(character.abilities.dex) + (Number(character.combat?.initiativeBonus) || 0);
}

function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

function d20Fields(label, modifier) {
  return d20FormulaFields(label, addFormulaModifier("1d20", modifier));
}

function nativeAttackFields(modifier) {
  const formula = addFormulaModifier("1d20", modifier);
  if (state.rollMode === "normal") return { attack: inline(formula) };
  if (state.rollMode === "advantage") return { attack: inline(toAdvantageFormula(formula)) };
  if (state.rollMode === "disadvantage") return { attack: inline(toDisadvantageFormula(formula)) };
  return {
    attack: `${inline(formula)}   ${inline(formula)}`
  };
}

function d20FormulaFields(label, formula) {
  if (state.rollMode === "normal") return { [label]: inline(formula) };
  if (state.rollMode === "advantage") return { [label]: inline(toAdvantageFormula(formula)) };
  if (state.rollMode === "disadvantage") return { [label]: inline(toDisadvantageFormula(formula)) };
  return {
    [`${label} 1`]: inline(formula),
    [`${label} 2`]: inline(duplicateFirstD20(formula))
  };
}

function foundryD20Rows(label, formula) {
  if (state.rollMode === "normal") return [[label, foundryInline(formula)]];
  if (state.rollMode === "advantage") return [[label, foundryInline(toAdvantageFormula(formula))]];
  if (state.rollMode === "disadvantage") return [[label, foundryInline(toDisadvantageFormula(formula))]];
  return [[label, `${foundryInline(formula)}   ${foundryInline(duplicateFirstD20(formula))}`]];
}

function formulaUsesD20(formula) {
  return /\b1d20\b/i.test(formula);
}

function duplicateFirstD20(formula) {
  return formula.replace(/\b1d20\b/i, "1d20");
}

function toAdvantageFormula(formula) {
  return formula.replace(/\b1d20\b/i, "2d20kh1");
}

function toDisadvantageFormula(formula) {
  return formula.replace(/\b1d20\b/i, "2d20kl1");
}

function stripInline(value) {
  return value.replace(/^\[\[/, "").replace(/\]\]$/, "");
}

function attackDetails(attack) {
  return [
    ...(attack.properties || [])
  ].filter(Boolean).join(", ");
}

function addFormulaModifier(formula, modifier) {
  if (!modifier) return formula;
  return `${formula} ${modifier > 0 ? "+" : "-"} ${Math.abs(modifier)}`;
}

function resolveFormula(character, formula) {
  return String(formula)
    .replace(/@prof\b/g, character.proficiencyBonus)
    .replace(/@level\b/g, character.level)
    .replace(/@(str|dex|con|int|wis|cha)\b/g, (_, ability) => abilityMod(character.abilities[ability]));
}

function findUnsupportedPlaceholders(formula) {
  const supported = new Set(["@prof", "@level", "@str", "@dex", "@con", "@int", "@wis", "@cha"]);
  const matches = String(formula).match(/@[A-Za-z]+/g) || [];
  return matches.filter((match) => !supported.has(match));
}

function inline(formula) {
  return `[[${formula}]]`;
}

function foundryInline(formula) {
  return `[[/r ${formula}]]`;
}

function formatFoundryCard(title, rows) {
  return [
    `**${cleanFoundry(title)}**`,
    ...rows
      .filter((row) => row && row[1] !== undefined && row[1] !== null && row[1] !== "")
      .map(([label, value]) => `**${cleanFoundry(label)}:** ${cleanFoundry(String(value))}`)
  ].join("\n");
}

function formatModifier(value) {
  const number = Number(value) || 0;
  return number >= 0 ? `+${number}` : String(number);
}

function parseGlobalModifier() {
  const raw = elements.globalModifier.value.trim();
  if (!raw) return 0;
  const number = Number(raw);
  if (Number.isFinite(number)) return number;
  return 0;
}

function labelForSkill(id) {
  return SKILL_LABELS[id] || id.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function defaultSkillAbility(id) {
  return {
    acrobatics: "dex",
    animalHandling: "wis",
    athletics: "str",
    deception: "cha",
    insight: "wis",
    intimidation: "cha",
    investigation: "int",
    lore: "int",
    medicine: "wis",
    nature: "int",
    perception: "wis",
    performance: "cha",
    persuasion: "cha",
    piloting: "dex",
    sleightOfHand: "dex",
    stealth: "dex",
    survival: "wis",
    technology: "int"
  }[id] || "int";
}

function titleCase(value) {
  return value.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
}

function setStatus(message, isProblem = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.style.color = isProblem ? "var(--danger)" : "var(--muted)";
}

function chatTargetLabel() {
  return state.chatTarget === "foundry" ? "Foundry VTT" : "Roll20";
}

function cleanRoll20(value) {
  return value.replace(/[{}]/g, "");
}

function cleanFoundry(value) {
  return value.replace(/[<>]/g, "");
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sw5e-character";
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
