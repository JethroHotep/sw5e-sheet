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

const LEGACY_LOCAL_STORAGE_KEY = "sw5e-sheet.character.v1";
const LOCAL_STORAGE_LIBRARY_KEY = "sw5e-sheet.characters.v1";
const MAX_STORED_CHARACTERS = 12;

const state = {
  character: null,
  warnings: [],
  rollMode: "both",
  chatTarget: "roll20",
  bridgePending: new Set(),
  bridgeDetected: false,
  latestCommand: "",
  history: [],
  lastFocus: null,
  storageSaveTimer: null,
  autosaveBadgeTimer: null,
  suppressAutosave: false
};

const elements = {
  characterName: document.querySelector("#characterName"),
  characterMeta: document.querySelector("#characterMeta"),
  fileInput: document.querySelector("#fileInput"),
  downloadJsonButton: document.querySelector("#downloadJsonButton"),
  jsonSpecButton: document.querySelector("#jsonSpecButton"),
  importExportHelpButton: document.querySelector("#importExportHelpButton"),
  localCharacterSelect: document.querySelector("#localCharacterSelect"),
  clearLocalButton: document.querySelector("#clearLocalButton"),
  loadNimButton: document.querySelector("#loadNimButton"),
  globalModifier: document.querySelector("#globalModifier"),
  initiativeTracker: document.querySelector("#initiativeTracker"),
  autoBridge: document.querySelector("#autoBridge"),
  autosaveBadge: document.querySelector("#autosaveBadge"),
  statusMessage: document.querySelector("#statusMessage"),
  validationPanel: document.querySelector("#validationPanel"),
  combatStats: document.querySelector("#combatStats"),
  initiativeAction: document.querySelector("#initiativeAction"),
  shortRestButton: document.querySelector("#shortRestButton"),
  longRestButton: document.querySelector("#longRestButton"),
  abilities: document.querySelector("#abilities"),
  resources: document.querySelector("#resources"),
  credits: document.querySelector("#credits"),
  inventory: document.querySelector("#inventory"),
  characterDetails: document.querySelector("#characterDetails"),
  appearanceDetails: document.querySelector("#appearanceDetails"),
  personalityDetails: document.querySelector("#personalityDetails"),
  proficienciesDetails: document.querySelector("#proficienciesDetails"),
  backstoryDetails: document.querySelector("#backstoryDetails"),
  savingThrows: document.querySelector("#savingThrows"),
  skills: document.querySelector("#skills"),
  attacks: document.querySelector("#attacks"),
  customRolls: document.querySelector("#customRolls"),
  references: document.querySelector("#references"),
  sensesMovement: document.querySelector("#sensesMovement"),
  defenseDetails: document.querySelector("#defenseDetails"),
  deathSaves: document.querySelector("#deathSaves"),
  carryingDetails: document.querySelector("#carryingDetails"),
  storageDetails: document.querySelector("#storageDetails"),
  powercastingDetails: document.querySelector("#powercastingDetails"),
  powerLevels: document.querySelector("#powerLevels"),
  latestCommand: document.querySelector("#latestCommand"),
  copyLatestButton: document.querySelector("#copyLatestButton"),
  sendLatestButton: document.querySelector("#sendLatestButton"),
  history: document.querySelector("#history"),
  helpOverlay: document.querySelector("#helpOverlay"),
  helpTitle: document.querySelector("#helpTitle"),
  helpSource: document.querySelector("#helpSource"),
  helpBody: document.querySelector("#helpBody"),
  helpCloseButton: document.querySelector("#helpCloseButton")
};

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  refreshLocalCharacterSelect();
  if (!loadCharacterFromStorage({ silent: true })) {
    loadCharacterData(createBlankCharacterData(), "blank character", { persist: false });
  }
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
      loadCharacterData(data, file.name, { confirmOverwrite: true });
    } catch (error) {
      setStatus(`Could not load JSON: ${error.message}`, true);
    } finally {
      event.target.value = "";
    }
  });

  elements.downloadJsonButton.addEventListener("click", downloadCurrentJson);
  elements.jsonSpecButton.addEventListener("click", openJsonSpec);
  elements.importExportHelpButton.addEventListener("click", openImportExportHelp);
  elements.localCharacterSelect.addEventListener("change", () => {
    if (!elements.localCharacterSelect.value) return;
    loadCharacterFromStorage({
      silent: false,
      name: elements.localCharacterSelect.value
    });
  });
  elements.clearLocalButton.addEventListener("click", clearCharacterStorage);
  elements.loadNimButton.addEventListener("click", () => loadExample("examples/nim-sw5e-v8.json", false, { confirmOverwrite: true }));
  elements.shortRestButton.addEventListener("click", () => applyRest("short"));
  elements.longRestButton.addEventListener("click", () => applyRest("long"));
  elements.copyLatestButton.addEventListener("click", () => copyCommand(state.latestCommand));
  elements.sendLatestButton.addEventListener("click", () => sendCommandToBridge(state.latestCommand));
  elements.helpCloseButton.addEventListener("click", closeHelp);
  elements.helpOverlay.addEventListener("click", (event) => {
    if (event.target === elements.helpOverlay) closeHelp();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.helpOverlay.hidden) closeHelp();
  });
  window.addEventListener("message", handleBridgeResponse);
  pingBridge();
  window.setInterval(pingBridge, 5000);
}

function openImportExportHelp() {
  openHelp("Import/Export", {
    title: "Import/Export",
    source: "Sheet Help",
    category: "Character Data",
    summary: "Import and export move character JSON between files and this browser's saved character library.",
    details: [
      "Import opens a JSON file from your computer, loads it into the sheet, and autosaves it by character name.",
      "Import Sample Nim loads the bundled Nim example and autosaves it the same way as an imported JSON file.",
      "Export downloads the current sheet as JSON. Use this before deleting a saved browser character or before replacing a saved character with an import.",
      "JSON Spec opens the human-readable character JSON guide in this app and offers raw .md and JSON Schema downloads.",
      "If an import would replace an existing saved browser character with the same name, the app asks for confirmation before changing the sheet."
    ],
    sections: [
      {
        heading: "Saved Characters",
        items: [
          "Each different application URL has its own saved character list.",
          `Each URL can store up to ${MAX_STORED_CHARACTERS} characters.`,
          "Selecting a name in the saved-character dropdown loads that saved character."
        ]
      }
    ]
  });
}

async function openJsonSpec() {
  state.lastFocus = document.activeElement;
  elements.helpTitle.textContent = "JSON Spec";
  elements.helpSource.textContent = "docs/json-spec.md";
  elements.helpBody.replaceChildren(makeSpecDownloadActions());
  elements.helpOverlay.hidden = false;
  elements.helpCloseButton.focus();

  try {
    const response = await fetch("docs/json-spec.md");
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const markdown = await response.text();
    elements.helpBody.replaceChildren(makeSpecDownloadActions(), ...markdownToNodes(markdown));
  } catch (error) {
    const message = document.createElement("p");
    message.className = "help-summary";
    message.textContent = `Could not open the JSON spec: ${error.message}`;
    elements.helpBody.replaceChildren(makeSpecDownloadActions(), message);
  }
}

function makeSpecDownloadActions() {
  const actions = document.createElement("div");
  actions.className = "spec-download-actions";
  actions.append(
    makeDownloadLink("docs/json-spec.md", "json-spec.md", "Download Raw .md"),
    makeDownloadLink("docs/sw5e-character.schema.json", "sw5e-character.schema.json", "Download JSON Schema")
  );
  return actions;
}

function makeDownloadLink(href, download, label) {
  const link = document.createElement("a");
  link.className = "schema-link";
  link.href = href;
  link.download = download;
  link.textContent = label;
  return link;
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
      species: "",
      background: "",
      alignment: "",
      playerName: "",
      experiencePoints: 0,
      xpNextLevel: 0,
      inspiration: false,
      passivePerception: 10,
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
        senses: {
          vision: "",
          passiveWisdom: 10
        },
        movement: {
          base: 30,
          hour: "",
          day: "",
          special: ""
        },
        deathSaves: {
          successes: 0,
          failures: 0
        },
        defenses: {
          armorShieldProtections: "",
          advantages: "",
          resistances: "",
          immunities: ""
        },
        hitPoints: {
          max: 1,
          current: 1,
          temporary: 0
        }
      },
      attacks: [],
      resources: [],
      inventory: [],
      carrying: {
        totalWeight: "",
        totalWeightOnCharacter: "",
        encumbered: "",
        heavilyEncumbered: "",
        maxCarry: "",
        pushDragLift: "",
        notes: ""
      },
      valuables: {
        creditsNotes: "",
        gemsAndTreasure: "",
        storage: "",
        loanedDepositedReceived: ""
      },
      appearance: {
        age: "",
        gender: "",
        height: "",
        weight: "",
        size: "",
        hair: "",
        eyes: "",
        skin: "",
        description: ""
      },
      personality: {
        traits: "",
        ideals: "",
        bonds: "",
        flaws: ""
      },
      placeOfBirth: "",
      backstory: "",
      backgroundFeature: "",
      proficiencies: [],
      languages: [],
      powercasting: {
        techPoints: "",
        forcePoints: "",
        techSaveDc: "",
        forceSaveDc: "",
        techAttackModifier: "",
        forceAttackModifier: "",
        forceAlignment: {
          lightSide: "",
          darkSide: "",
          universal: ""
        },
        levels: []
      },
      credits: {
        starting: 0,
        spent: 0,
        remaining: 0,
        notes: ""
      },
      customRolls: [],
      notes: ""
    }
  };
}

async function loadExample(path, fallbackToBlank = false, options = {}) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const data = await response.json();
    loadCharacterData(data, path, options);
  } catch (error) {
    if (fallbackToBlank) {
      loadCharacterData(createBlankCharacterData(), "blank character", options);
      setStatus(`Could not load ${path}; started with a blank character.`, true);
      return;
    }
    setStatus(`Could not load ${path}. Use Import or run through a local server.`, true);
  }
}

function loadCharacterData(data, sourceName, options = {}) {
  const result = validateCharacterData(data);
  if (result.errors.length) {
    renderValidation(result.errors, true);
    setStatus(`Could not load ${sourceName}: ${result.errors[0]}`, true);
    return false;
  }

  if (options.persist !== false && options.confirmOverwrite) {
    const name = storageCharacterName(data.character);
    if (storedCharacterExists(name)) {
      const confirmed = window.confirm(
        `Replace the saved character "${name}" in this browser?\n\nImporting this JSON will autosave over the existing saved character with the same name. Export first if you want a backup.`
      );
      if (!confirmed) {
        setStatus(`Import canceled; kept saved ${name}.`);
        return false;
      }
    }
    if (!storedCharacterExists(name) && storedCharacterLimitReached()) {
      setStatus(`Saved character limit reached (${MAX_STORED_CHARACTERS}). Export or delete a saved character before importing ${name}.`, true);
      return false;
    }
  }

  state.character = data.character;
  state.warnings = result.warnings;
  state.latestCommand = "";
  state.history = [];
  state.suppressAutosave = true;
  try {
    renderSheet();
  } finally {
    state.suppressAutosave = false;
  }
  renderValidation(result.warnings, false);
  if (options.persist !== false) {
    saveCharacterToStorage({ silent: true });
  }
  setStatus(`Loaded ${state.character.name} from ${sourceName}.`);
  return true;
}

function getCurrentCharacterPayload() {
  return {
    schemaVersion: 1,
    character: state.character || createBlankCharacterData().character
  };
}

function downloadCurrentJson() {
  const data = getCurrentCharacterPayload();
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

function saveCharacterToStorage({ silent = false } = {}) {
  if (!storageAvailable()) {
    if (!silent) setStatus("Browser storage is not available for this page.", true);
    return false;
  }

  try {
    const payload = getCurrentCharacterPayload();
    const name = storageCharacterName(payload.character);
    const library = getStorageLibrary();
    const isNewCharacter = !library.characters[name];
    if (isNewCharacter && Object.keys(library.characters).length >= MAX_STORED_CHARACTERS) {
      if (!silent) {
        setStatus(`Saved character limit reached (${MAX_STORED_CHARACTERS}). Export or delete a saved character before adding another.`, true);
      }
      return false;
    }
    const saved = {
      ...payload,
      savedAt: new Date().toISOString()
    };
    library.characters[name] = saved;
    library.activeName = name;
    writeStorageLibrary(library);
    refreshLocalCharacterSelect(name);
    if (silent) {
      showAutosaveBadge();
    } else {
      setStatus(`Saved ${name} in this browser.`);
    }
    return true;
  } catch (error) {
    if (!silent) setStatus(`Could not save in browser storage: ${error.message}`, true);
    return false;
  }
}

function queueCharacterStorageSave() {
  if (state.suppressAutosave || !state.character || !storageAvailable()) return;
  window.clearTimeout(state.storageSaveTimer);
  state.storageSaveTimer = window.setTimeout(() => {
    saveCharacterToStorage({ silent: true });
  }, 200);
}

function loadCharacterFromStorage({ silent = false, name = "" } = {}) {
  if (!storageAvailable()) {
    if (!silent) setStatus("Browser storage is not available for this page.", true);
    return false;
  }

  const library = getStorageLibrary();
  const names = Object.keys(library.characters).sort((a, b) => a.localeCompare(b));
  const selectedName = name || library.activeName || names[0] || "";
  const data = library.characters[selectedName];
  if (!data) {
    if (!silent) setStatus("No saved browser character found.");
    refreshLocalCharacterSelect();
    return false;
  }

  try {
    const payload = data?.character ? data : { schemaVersion: 1, character: data };
    if (!loadCharacterData(payload, "browser storage", { persist: false })) return false;
    library.activeName = storageCharacterName(payload.character);
    writeStorageLibrary(library);
    refreshLocalCharacterSelect(library.activeName);
    if (!silent) {
      const savedAt = data.savedAt ? ` Saved ${formatDateTime(data.savedAt)}.` : "";
      setStatus(`Loaded ${library.activeName} from browser storage.${savedAt}`);
    }
    return true;
  } catch (error) {
    if (!silent) setStatus(`Could not load browser storage: ${error.message}`, true);
    return false;
  }
}

function clearCharacterStorage() {
  if (!storageAvailable()) {
    setStatus("Browser storage is not available for this page.", true);
    return;
  }
  const library = getStorageLibrary();
  const selectedName = elements.localCharacterSelect.value || library.activeName;
  if (!selectedName || !library.characters[selectedName]) {
    setStatus("No saved character selected to delete.");
    return;
  }
  const confirmed = window.confirm(
    `Delete "${selectedName}" from this browser?\n\nExport the character JSON first if you want a backup. This cannot be undone.`
  );
  if (!confirmed) {
    setStatus(`Kept ${selectedName}.`);
    return;
  }
  delete library.characters[selectedName];
  const names = Object.keys(library.characters).sort((a, b) => a.localeCompare(b));
  library.activeName = names[0] || "";
  writeStorageLibrary(library);
  refreshLocalCharacterSelect(library.activeName);
  setStatus(`Deleted ${selectedName}.`);
}

function storageAvailable() {
  try {
    return typeof window !== "undefined" && "localStorage" in window && window.localStorage;
  } catch (error) {
    return false;
  }
}

function storedCharacterExists(name) {
  if (!storageAvailable()) return false;
  const library = getStorageLibrary();
  return Boolean(library.characters[name]);
}

function storedCharacterLimitReached() {
  if (!storageAvailable()) return false;
  const library = getStorageLibrary();
  return Object.keys(library.characters).length >= MAX_STORED_CHARACTERS;
}

function getStorageLibrary() {
  const library = {
    version: 1,
    activeName: "",
    characters: {}
  };

  try {
    const rawLibrary = localStorage.getItem(LOCAL_STORAGE_LIBRARY_KEY);
    if (rawLibrary) {
      const parsed = JSON.parse(rawLibrary);
      if (parsed && typeof parsed === "object") {
        library.activeName = typeof parsed.activeName === "string" ? parsed.activeName : "";
        library.characters = parsed.characters && typeof parsed.characters === "object" ? parsed.characters : {};
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (legacy?.character) {
        const name = storageCharacterName(legacy.character);
        library.characters[name] = legacy;
        library.activeName = library.activeName || name;
        writeStorageLibrary(library);
      }
      localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
    }
  } catch (error) {
    return library;
  }

  return library;
}

function writeStorageLibrary(library) {
  localStorage.setItem(LOCAL_STORAGE_LIBRARY_KEY, JSON.stringify({
    version: 1,
    activeName: library.activeName || "",
    characters: library.characters || {}
  }));
}

function refreshLocalCharacterSelect(selectedName = "") {
  if (!elements.localCharacterSelect) return;
  const library = storageAvailable() ? getStorageLibrary() : { activeName: "", characters: {} };
  const names = Object.keys(library.characters).sort((a, b) => a.localeCompare(b));
  const target = selectedName || library.activeName || names[0] || "";
  elements.localCharacterSelect.replaceChildren();

  if (!names.length) {
    elements.localCharacterSelect.append(new Option("No saved characters", ""));
    elements.localCharacterSelect.disabled = true;
    elements.clearLocalButton.disabled = true;
    return;
  }

  names.forEach((name) => {
    elements.localCharacterSelect.append(new Option(name, name));
  });
  elements.localCharacterSelect.value = names.includes(target) ? target : names[0];
  elements.localCharacterSelect.disabled = false;
  elements.clearLocalButton.disabled = false;
}

function storageCharacterName(character) {
  const name = String(character?.name || "").trim();
  return name || "Unnamed Character";
}

function showAutosaveBadge() {
  if (!elements.autosaveBadge) return;
  window.clearTimeout(state.autosaveBadgeTimer);
  elements.autosaveBadge.hidden = false;
  elements.autosaveBadge.classList.add("visible");
  state.autosaveBadgeTimer = window.setTimeout(() => {
    elements.autosaveBadge.classList.remove("visible");
    elements.autosaveBadge.hidden = true;
  }, 1400);
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
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
    if (attack.actionType && !["action", "bonusAction", "reaction"].includes(attack.actionType)) {
      errors.push(`Attack ${attack.id} has invalid actionType.`);
    }
    (attack.damage || []).forEach((damage) => {
      if (!damage.formula) errors.push(`Attack ${attack.id} has damage without formula.`);
      if (damage.ability && !ABILITIES.includes(damage.ability)) {
        errors.push(`Attack ${attack.id} has invalid damage ability.`);
      }
    });
  });

  (character.customRolls || []).forEach((roll) => {
    const kind = customEntryKind(roll);
    if (!["roll", "reference"].includes(kind)) errors.push(`customRolls.${roll.id}.kind is unsupported.`);
    if (!roll.id) errors.push("Each custom roll requires an id.");
    if (!roll.name) errors.push(`Custom roll ${roll.id || "(missing id)"} requires a name.`);
    if (roll.actionType && !["action", "bonusAction", "reaction"].includes(roll.actionType)) {
      errors.push(`Custom roll ${roll.id} has invalid actionType.`);
    }
    if (kind === "roll" && !roll.formula) errors.push(`Custom roll ${roll.id} requires a formula.`);
    if (kind === "reference" && roll.formula) warnings.push(`Reference ${roll.id} should omit formula.`);
    if (roll.formula) {
      findUnsupportedPlaceholders(roll.formula).forEach((placeholder) => {
        errors.push(`Custom roll ${roll.id} uses unsupported placeholder ${placeholder}.`);
      });
    }
  });

  (character.inventory || []).forEach((item) => {
    if (!item.id) errors.push("Each inventory item requires an id.");
    if (!item.name) errors.push(`Inventory item ${item.id || "(missing id)"} requires a name.`);
    if (item.quantity !== undefined && (!Number.isInteger(item.quantity) || item.quantity < 0)) {
      errors.push(`Inventory item ${item.id || item.name} quantity must be a non-negative integer.`);
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
  renderCredits(character);
  renderInventory(character);
  renderCharacterRecord(character);
  renderSavingThrows(character);
  renderSkills(character);
  renderAttacks(character);
  renderCustomRolls(character);
  renderLogistics(character);
  renderOutbox();
  queueCharacterStorageSave();
}

function renderCombatStats(character) {
  const hp = character.combat?.hitPoints || {};
  const stats = [
    makeStat("AC", character.combat?.armorClass ?? "-"),
    makeNumberStat("HP", hp.current ?? 0, (value) => {
      hp.current = clampNumber(value, 0, Number(hp.max) || Infinity);
      renderSheet();
      setStatus(`HP set to ${hp.current}.`);
    }, { maxLabel: hp.max ?? "-", step: 1, min: 0, max: Number(hp.max) || Infinity }),
    makeNumberStat("Temp", hp.temporary ?? 0, (value) => {
      hp.temporary = clampNumber(value, 0, Infinity);
      renderSheet();
      setStatus(`Temporary HP set to ${hp.temporary}.`);
    }, { step: 1, min: 0 }),
    makeStat("Tech DC", getTechcastingDc(character)),
    makeStat("Speed", `${character.combat?.speed ?? "-"} ft`),
    makeStat("Prof", formatModifier(character.proficiencyBonus)),
    makeStat("Init", formatModifier(getInitiativeModifier(character)))
  ];

  elements.combatStats.replaceChildren(...stats);
  const initiative = getInitiativeModifier(character);
  const detail = elements.initiativeTracker.checked ? `${formatModifier(initiative)} - tracker` : formatModifier(initiative);
  const initiativeRow = makeInitiativeAction(detail, () => handleInitiativeRoll(initiative));
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
      <div class="small">${current} / ${max}${resource.unit ? ` ${escapeHtml(resource.unit)}` : ""}</div>
      <div class="resource-meter" aria-hidden="true"><div class="resource-fill" style="width: ${percentage}%"></div></div>
      ${resource.notes ? `<p class="small">${escapeHtml(resource.notes)}</p>` : ""}
    `;
    const description = resourceDescription(resource, current, max);
    wrapper.prepend(makeObjectHeader(resource.name, () => postDescription(resource.name, description), resource.help, "resource-title", description));
    wrapper.append(makeStepper(current, (value) => {
      resource.current = clampNumber(value, 0, max || Infinity);
      renderSheet();
      setStatus(`${resource.name} set to ${resource.current}.`);
    }, { min: 0, max: max || Infinity, label: resource.name }));
    return wrapper;
  });

  elements.resources.replaceChildren(...nodes);
}

function renderCredits(character) {
  const credits = character.credits;
  if (!credits) {
    elements.credits.replaceChildren();
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "credits-card";
  const values = [
    ["Starting", credits.starting],
    ["Spent", credits.spent],
    ["Remaining", credits.remaining]
  ].filter(([, value]) => value !== undefined && value !== null);
  wrapper.innerHTML = `
    <h3><span class="credits-title-anchor"></span></h3>
    <div class="credit-grid">
      ${values.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`).join("")}
    </div>
    ${credits.notes ? `<p class="small">${escapeHtml(credits.notes)}</p>` : ""}
  `;
  const description = creditsDescription(credits);
  wrapper.querySelector(".credits-title-anchor").replaceWith(makeObjectHeader("Credits", () => postDescription("Credits", description), credits.help, "credits-title", description));
  elements.credits.replaceChildren(wrapper);
}

function renderInventory(character) {
  const inventory = character.inventory || [];
  if (!inventory.length) {
    elements.inventory.replaceChildren();
    return;
  }

  const groups = groupBy(inventory, (item) => item.category || "gear");
  const nodes = [];
  const heading = document.createElement("h3");
  heading.textContent = "Inventory";
  nodes.push(heading);

  Object.entries(groups).sort(([left], [right]) => left.localeCompare(right)).forEach(([category, items]) => {
    const group = document.createElement("div");
    group.className = "inventory-group";
    const title = document.createElement("p");
    title.className = "inventory-category";
    title.textContent = labelFromSlug(category);
    group.append(title);

    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "inventory-item";
      const flags = [
        item.equipped ? "EQUIP" : "",
        item.infused ? "INFUSE" : ""
      ].filter(Boolean);
      row.innerHTML = `
        <div>
          <span class="title-anchor"></span>
          <div class="small">${inventoryMeta(item, false)}</div>
          ${depletionSummary(item) ? `<p class="small spend-line">${escapeHtml(depletionSummary(item))}</p>` : ""}
          ${containedResourcesHtml(item)}
          ${item.notes ? `<p class="small">${escapeHtml(item.notes)}</p>` : ""}
          ${item.armorClassFormula ? `<p class="small">AC: ${escapeHtml(item.armorClassFormula)}</p>` : ""}
        </div>
        <div class="inventory-side">
          <div class="inventory-flags">${flags.map((flag) => `<span>${flag}</span>`).join("")}</div>
          ${depletionsFor(item).length ? `<button type="button" data-use-item="${escapeHtml(item.id)}">Use</button>` : ""}
        </div>
      `;
      const description = inventoryDescription(item);
      row.querySelector(".title-anchor").replaceWith(makeObjectHeader(item.name, () => postDescription(item.name, description), item.help, "inventory-title", description));
      const useButton = row.querySelector("[data-use-item]");
      if (useButton) {
        useButton.addEventListener("click", () => applyEntityDepletion(item, item.name));
      }
      bindContainedResourceControls(row, item);
      const quantityControl = makeStepper(item.quantity ?? 1, (value) => {
        item.quantity = clampNumber(value, 0, Infinity);
        renderSheet();
        setStatus(`${item.name} quantity set to ${item.quantity}.`);
      }, { min: 0, label: `${item.name} quantity` });
      quantityControl.classList.add("quantity-stepper");
      row.querySelector(".inventory-side").prepend(quantityControl);
      const optionActions = depletionOptionActions(item);
      if (optionActions.length) {
        const secondary = document.createElement("div");
        secondary.className = "secondary-actions inventory-options";
        optionActions.forEach((action) => {
          const optionButton = document.createElement("button");
          optionButton.type = "button";
          optionButton.textContent = action.label;
          optionButton.addEventListener("click", action.onClick);
          secondary.append(optionButton);
        });
        row.append(secondary);
      }
      group.append(row);
    });

    nodes.push(group);
  });

  elements.inventory.replaceChildren(...nodes);
}

function renderCharacterRecord(character) {
  const appearance = character.appearance || {};
  const personality = character.personality || {};

  renderRecordList(elements.characterDetails, [
    ["Species", character.species],
    ["Alignment", character.alignment],
    ["Player", character.playerName],
    ["Experience", character.experiencePoints],
    ["Next Level", character.xpNextLevel],
    ["Inspiration", character.inspiration ? "Yes" : "No"],
    ["Place of Birth", character.placeOfBirth]
  ]);

  renderRecordList(elements.appearanceDetails, [
    ["Age", appearance.age],
    ["Gender", appearance.gender],
    ["Height", appearance.height],
    ["Weight", appearance.weight],
    ["Size", appearance.size],
    ["Hair", appearance.hair],
    ["Eyes", appearance.eyes],
    ["Skin", appearance.skin],
    ["Appearance", appearance.description]
  ]);

  renderNoteGrid(elements.personalityDetails, [
    ["Traits", personality.traits],
    ["Ideals", personality.ideals],
    ["Bonds", personality.bonds],
    ["Flaws", personality.flaws]
  ]);

  renderNoteGrid(elements.proficienciesDetails, [
    ["Proficiencies", joinDisplay(character.proficiencies)],
    ["Languages", joinDisplay(character.languages)]
  ]);

  renderNoteGrid(elements.backstoryDetails, [
    ["Background Feature", character.backgroundFeature],
    ["Backstory", character.backstory]
  ]);
}

function renderLogistics(character) {
  const combat = character.combat || {};
  const senses = combat.senses || {};
  const movement = combat.movement || {};
  const deathSaves = combat.deathSaves || {};
  const defenses = combat.defenses || {};
  const carrying = character.carrying || {};
  const valuables = character.valuables || {};
  const powercasting = character.powercasting || {};
  const alignment = powercasting.forceAlignment || {};

  renderRecordList(elements.sensesMovement, [
    ["Vision", senses.vision],
    ["Passive Wisdom", senses.passiveWisdom],
    ["Passive Perception", character.passivePerception],
    ["Speed", combat.speed !== undefined ? `${combat.speed} ft` : ""],
    ["Base Movement", movement.base !== undefined ? `${movement.base} ft` : ""],
    ["Hourly Travel", movement.hour],
    ["Daily Travel", movement.day],
    ["Special Movement", movement.special]
  ]);

  renderNoteGrid(elements.defenseDetails, [
    ["Armor, Shield, Protections", defenses.armorShieldProtections],
    ["Advantages", defenses.advantages],
    ["Resistances", defenses.resistances],
    ["Immunities", defenses.immunities]
  ]);

  renderRecordList(elements.deathSaves, [
    ["Successes", deathSaves.successes],
    ["Failures", deathSaves.failures]
  ]);

  renderRecordList(elements.carryingDetails, [
    ["Total Weight", carrying.totalWeight],
    ["On Character", carrying.totalWeightOnCharacter],
    ["Encumbered", carrying.encumbered],
    ["Heavily Encumbered", carrying.heavilyEncumbered],
    ["Max Carry", carrying.maxCarry],
    ["Push / Drag / Lift", carrying.pushDragLift],
    ["Notes", carrying.notes]
  ]);

  renderNoteGrid(elements.storageDetails, [
    ["Credits Notes", valuables.creditsNotes],
    ["Gems and Treasure", valuables.gemsAndTreasure],
    ["Storage", valuables.storage],
    ["Loaned / Deposited / Received", valuables.loanedDepositedReceived]
  ]);

  renderRecordList(elements.powercastingDetails, [
    ["Tech Points", powercasting.techPoints],
    ["Force Points", powercasting.forcePoints],
    ["Tech Save DC", powercasting.techSaveDc || getTechcastingDc(character)],
    ["Force Save DC", powercasting.forceSaveDc],
    ["Tech Attack Modifier", powercasting.techAttackModifier],
    ["Force Attack Modifier", powercasting.forceAttackModifier],
    ["Light Side", alignment.lightSide],
    ["Dark Side", alignment.darkSide],
    ["Universal", alignment.universal]
  ]);

  renderPowerLevels(powercasting.levels || []);
}

function renderSavingThrows(character) {
  const rows = ABILITIES.map((ability) => {
    const proficient = Boolean(character.savingThrows?.[ability]);
    const modifier = abilityMod(character.abilities[ability]) + (proficient ? character.proficiencyBonus : 0);
    return makeRollRow(`${ABILITY_LABELS[ability]}`, formatModifier(modifier), () => {
      handleSimpleRoll(`${ABILITY_LABELS[ability]} Save`, modifier, proficient ? "proficient save" : "save");
    }, proficient ? ["PROF"] : []);
  });

  elements.savingThrows.replaceChildren(...rows);
}

function renderSkills(character) {
  const rows = Object.entries(character.skills || {})
    .sort(([left], [right]) => labelForSkill(left).localeCompare(labelForSkill(right)))
    .map(([id, skill]) => {
      const modifier = skillModifier(character, skill);
      const detail = `${skill.ability.toUpperCase()} ${formatModifier(modifier)}`;
      const flags = skillFlags(skill);
      return makeRollRow(labelForSkill(id), detail, () => {
        handleSimpleRoll(labelForSkill(id), modifier, `${skill.ability.toUpperCase()} skill`);
      }, flags);
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
    const fullMeta = [meta, depletionSummary(attack)].filter(Boolean).join(" - ");

    return makeActionItem(attack, fullMeta, attack.notes, "Roll", () => {
      const command = buildAttackCommand(character, attack);
      publishCommand(`${attack.name}`, command);
      applyEntityDepletion(attack, attack.name);
    }, depletionOptionActions(attack), actionTags(attack));
  });

  elements.attacks.replaceChildren(...nodes);
}

function renderCustomRolls(character) {
  const entries = character.customRolls || [];
  const rollNodes = entries
    .filter((entry) => customEntryKind(entry) === "roll")
    .map((entry) => makeActionItem(entry, [resolveFormula(character, entry.formula), depletionSummary(entry)].filter(Boolean).join(" - "), entry.notes, "Roll", () => {
      const command = buildCustomRollCommand(character, entry);
      publishCommand(entry.name, command);
      applyEntityDepletion(entry, entry.name);
    }, depletionOptionActions(entry), actionTags(entry)));

  const referenceNodes = entries
    .filter((entry) => customEntryKind(entry) === "reference")
    .map((entry) => makeActionItem(entry, ["Reference", depletionSummary(entry)].filter(Boolean).join(" - "), entry.notes, "Post", () => {
      const command = buildReferenceCommand(character, entry);
      publishCommand(entry.name, command);
      applyEntityDepletion(entry, entry.name);
    }, depletionOptionActions(entry), actionTags(entry)));

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

function renderRecordList(container, rows) {
  const nodes = rows.map(([label, value]) => {
    const item = document.createElement("div");
    item.className = "record-item";
    item.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(displayValue(value))}</strong>`;
    return item;
  });
  container.replaceChildren(...nodes);
}

function renderNoteGrid(container, rows) {
  const nodes = rows.map(([label, value]) => {
    const item = document.createElement("div");
    item.className = "note-card";
    item.innerHTML = `<strong>${escapeHtml(label)}</strong><p>${escapeHtml(displayValue(value))}</p>`;
    return item;
  });
  container.replaceChildren(...nodes);
}

function renderPowerLevels(levels) {
  const defaultLevels = [
    { level: "At-Will" },
    ...Array.from({ length: 9 }, (_, index) => ({ level: `${index + 1}` }))
  ];
  const byLevel = new Map((levels || []).map((item) => [String(item.level), item]));
  const nodes = defaultLevels.map((fallback) => {
    const item = byLevel.get(String(fallback.level)) || fallback;
    const wrapper = document.createElement("div");
    wrapper.className = "power-level";
    const title = item.level === "At-Will" ? "At-Will" : `${item.level}${ordinalSuffix(Number(item.level))} Level`;
    const powers = joinDisplay(item.powers);
    wrapper.innerHTML = `
      <strong>${escapeHtml(title)}</strong>
      <div class="small">${escapeHtml(powers)}</div>
      ${item.pointsUsed !== undefined && item.pointsUsed !== "" ? `<p class="small">Points used: ${escapeHtml(String(item.pointsUsed))}</p>` : ""}
    `;
    return wrapper;
  });
  elements.powerLevels.replaceChildren(...nodes);
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

function makeClickableTitle(title, onClick, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = ["title-button", className].filter(Boolean).join(" ");
  button.textContent = title;
  button.title = `Send ${title} description to ${chatTargetLabel()}`;
  button.addEventListener("click", onClick);
  return button;
}

function makeObjectHeader(title, onTitleClick, help, className = "", fallbackDetails = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "object-title-row";
  wrapper.append(makeClickableTitle(title, onTitleClick, className));
  wrapper.append(makeHelpButton(title, help, fallbackDetails));
  return wrapper;
}

function makeHelpButton(title, help, fallbackDetails = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "help-button";
  button.textContent = "?";
  button.title = `Open ${title} help`;
  button.setAttribute("aria-label", `Open ${title} help`);
  button.addEventListener("click", () => openHelp(title, help, fallbackDetails));
  return button;
}

function makeNumberStat(label, value, onChange, options = {}) {
  const node = document.createElement("div");
  node.className = "stat editable-stat";
  node.innerHTML = `
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(String(value))}${options.maxLabel !== undefined ? ` / ${escapeHtml(String(options.maxLabel))}` : ""}</strong>
  `;
  node.append(makeStepper(value, onChange, { ...options, label }));
  return node;
}

function makeStepper(value, onChange, options = {}) {
  const min = options.min ?? 0;
  const max = options.max ?? Infinity;
  const step = options.step ?? 1;
  const label = options.label || "value";
  const wrapper = document.createElement("div");
  wrapper.className = "stepper";

  const minus = document.createElement("button");
  minus.type = "button";
  minus.textContent = "-";
  minus.title = `Decrease ${label}`;
  minus.setAttribute("aria-label", `Decrease ${label}`);

  const input = document.createElement("input");
  input.type = "number";
  input.inputMode = "numeric";
  input.step = String(step);
  input.min = Number.isFinite(min) ? String(min) : "";
  input.max = Number.isFinite(max) ? String(max) : "";
  input.value = String(value);
  input.setAttribute("aria-label", label);

  const plus = document.createElement("button");
  plus.type = "button";
  plus.textContent = "+";
  plus.title = `Increase ${label}`;
  plus.setAttribute("aria-label", `Increase ${label}`);

  const commit = (nextValue) => onChange(clampNumber(nextValue, min, max));
  minus.addEventListener("click", () => commit((Number(input.value) || 0) - step));
  plus.addEventListener("click", () => commit((Number(input.value) || 0) + step));
  input.addEventListener("change", () => commit(Number(input.value)));

  wrapper.append(minus, input, plus);
  return wrapper;
}

function makeRollRow(title, detail, onClick, flags = []) {
  const template = document.querySelector("#rollRowTemplate");
  const row = template.content.firstElementChild.cloneNode(true);
  row.querySelector(".roll-title").textContent = title;
  row.querySelector(".roll-detail").textContent = detail;
  const titleNode = row.querySelector(".roll-title");
  flags.forEach((flag) => {
    const badge = document.createElement("span");
    badge.className = `roll-flag ${flag.toLowerCase()}`;
    badge.textContent = flag;
    titleNode.append(" ", badge);
  });
  row.addEventListener("click", onClick);
  return row;
}

function makeInitiativeAction(detail, onClick) {
  const wrapper = document.createElement("div");
  wrapper.className = "initiative-card";
  const text = document.createElement("div");
  const title = document.createElement("p");
  title.className = "action-title";
  title.textContent = "Initiative";
  const meta = document.createElement("p");
  meta.className = "action-meta";
  meta.textContent = detail;
  text.append(title, meta);

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Roll Initiative";
  button.addEventListener("click", onClick);
  wrapper.append(text, button);
  return wrapper;
}

function makeActionItem(entity, meta, notes, buttonText, onClick, secondaryActions = [], tags = []) {
  const title = entity.name;
  const wrapper = document.createElement("div");
  wrapper.className = "action-item";

  const main = document.createElement("div");
  main.className = "action-main";

  const text = document.createElement("div");
  const heading = document.createElement("div");
  heading.className = "action-title";
  const description = actionDescription(title, meta, notes, tags);
  heading.append(makeObjectHeader(title, () => postDescription(title, description), entity.help, "action-title-button", description));
  tags.forEach((tag) => {
    const badge = document.createElement("span");
    badge.className = `action-tag ${tag.id}`;
    badge.textContent = tag.label;
    heading.append(" ", badge);
  });
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

  if (secondaryActions.length) {
    const secondary = document.createElement("div");
    secondary.className = "secondary-actions";
    secondaryActions.forEach((action) => {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.textContent = action.label;
      optionButton.addEventListener("click", action.onClick);
      secondary.append(optionButton);
    });
    wrapper.append(secondary);
  }

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

function postDescription(title, details) {
  const text = details || "No description available.";
  const command = state.chatTarget === "foundry"
    ? formatFoundryCard(title, [
        ["Character", state.character.name],
        ["Details", text]
      ])
    : formatTemplate(title, {
        character: state.character.name,
        details: text
      });
  publishCommand(title, command);
}

function actionDescription(title, meta, notes, tags = []) {
  return [
    tags.length ? `Timing: ${tags.map((tag) => tag.label).join(", ")}` : "",
    meta,
    notes
  ].filter(Boolean).join("\n") || `${title} reference.`;
}

function resourceDescription(resource, current, max) {
  return [
    `${current} / ${max}${resource.unit ? ` ${resource.unit}` : ""}`,
    resource.restRecovery ? `Rest recovery: ${labelFromSlug(resource.restRecovery)}` : "",
    resource.notes || ""
  ].filter(Boolean).join("\n");
}

function creditsDescription(credits) {
  return [
    credits.starting !== undefined ? `Starting: ${credits.starting}` : "",
    credits.spent !== undefined ? `Spent: ${credits.spent}` : "",
    credits.remaining !== undefined ? `Remaining: ${credits.remaining}` : "",
    credits.notes || ""
  ].filter(Boolean).join("\n");
}

function inventoryDescription(item) {
  const parts = [
    inventoryMeta(item),
    item.armorClassFormula ? `AC: ${item.armorClassFormula}` : "",
    depletionSummary(item),
    containedResourceText(item),
    item.notes || ""
  ];
  return parts.filter(Boolean).join("\n");
}

function containedResourceDescription(item, resource) {
  const current = Number(resource.current) || 0;
  const max = Number(resource.max) || 0;
  return [
    `Item: ${item.name}`,
    `${current} / ${max}${resource.unit ? ` ${resource.unit}` : ""}`,
    resource.restRecovery ? `Rest recovery: ${labelFromSlug(resource.restRecovery)}` : "",
    resource.rechargeFromResourceId ? `Reloads from: ${resource.rechargeFromResourceId}` : "",
    resource.notes || ""
  ].filter(Boolean).join("\n");
}

function containedResourceText(item) {
  const resources = item.containedResources || [];
  if (!resources.length) return "";
  return resources.map((resource) => {
    const current = Number(resource.current) || 0;
    const max = Number(resource.max) || 0;
    return `${resource.name}: ${current} / ${max}${resource.unit ? ` ${resource.unit}` : ""}`;
  }).join("\n");
}

function openHelp(defaultTitle, help, fallbackDetails = "") {
  const data = normalizeHelp(defaultTitle, help, fallbackDetails);
  state.lastFocus = document.activeElement;
  elements.helpTitle.textContent = data.title;
  elements.helpSource.textContent = data.source || "Sheet Help";
  elements.helpBody.replaceChildren(...helpNodes(data));
  elements.helpOverlay.hidden = false;
  elements.helpCloseButton.focus();
}

function closeHelp() {
  elements.helpOverlay.hidden = true;
  elements.helpBody.replaceChildren();
  if (state.lastFocus?.focus) state.lastFocus.focus();
}

function normalizeHelp(defaultTitle, help, fallbackDetails = "") {
  if (typeof help === "string") {
    return {
      title: defaultTitle,
      source: "Character JSON",
      summary: help
    };
  }
  if (help && typeof help === "object") {
    return {
      title: help.title || defaultTitle,
      source: help.source || "Character JSON",
      category: help.category || "",
      activation: help.activation || "",
      summary: help.summary || fallbackDetails || "",
      details: Array.isArray(help.details) ? help.details : [],
      sections: Array.isArray(help.sections) ? help.sections : []
    };
  }
  return {
    title: defaultTitle,
    source: "Character JSON",
    summary: fallbackDetails || "No detailed help has been added to this JSON entry yet."
  };
}

function helpNodes(help) {
  const nodes = [];
  if (help.category || help.activation) {
    const meta = document.createElement("p");
    meta.className = "help-meta";
    meta.textContent = [help.category, help.activation].filter(Boolean).join(" - ");
    nodes.push(meta);
  }
  if (help.summary) {
    const summary = document.createElement("p");
    summary.className = "help-summary";
    summary.textContent = help.summary;
    nodes.push(summary);
  }
  if (help.details?.length) {
    const list = document.createElement("ul");
    help.details.forEach((detail) => {
      const item = document.createElement("li");
      item.textContent = detail;
      list.append(item);
    });
    nodes.push(list);
  }
  help.sections?.forEach((section) => {
    const heading = document.createElement("h3");
    heading.textContent = section.heading || "Details";
    nodes.push(heading);
    if (section.text) {
      const text = document.createElement("p");
      text.textContent = section.text;
      nodes.push(text);
    }
    if (Array.isArray(section.items) && section.items.length) {
      const list = document.createElement("ul");
      section.items.forEach((detail) => {
        const item = document.createElement("li");
        item.textContent = detail;
        list.append(item);
      });
      nodes.push(list);
    }
  });
  return nodes.length ? nodes : [document.createTextNode("No help available.")];
}

function markdownToNodes(markdown) {
  const nodes = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      nodes.push(makeMarkdownCodeBlock(codeLines.join("\n"), fence[1]));
      continue;
    }

    if (isMarkdownTableStart(lines, index)) {
      const tableLines = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index]);
        index += 1;
      }
      nodes.push(makeMarkdownTable(tableLines));
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = Math.min(Number(heading[1].length) + 1, 4);
      const element = document.createElement(`h${level}`);
      appendInlineMarkdown(element, heading[2]);
      nodes.push(element);
      index += 1;
      continue;
    }

    const listMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (listMatch) {
      const list = document.createElement("ul");
      while (index < lines.length) {
        const itemMatch = lines[index].match(/^\s*[-*]\s+(.+)$/);
        if (!itemMatch) break;
        const item = document.createElement("li");
        appendInlineMarkdown(item, itemMatch[1]);
        list.append(item);
        index += 1;
      }
      nodes.push(list);
      continue;
    }

    const paragraphLines = [];
    while (index < lines.length && lines[index].trim() && !lines[index].startsWith("```") && !lines[index].match(/^(#{1,4})\s+/) && !lines[index].match(/^\s*[-*]\s+/) && !isMarkdownTableStart(lines, index)) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    const paragraph = document.createElement("p");
    appendInlineMarkdown(paragraph, paragraphLines.join(" "));
    nodes.push(paragraph);
  }

  return nodes;
}

function isMarkdownTableStart(lines, index) {
  return Boolean(
    lines[index]?.trim().startsWith("|") &&
    lines[index + 1]?.trim().match(/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/)
  );
}

function makeMarkdownTable(lines) {
  const table = document.createElement("table");
  const [headerLine, , ...bodyLines] = lines;
  const headerCells = splitMarkdownTableRow(headerLine);
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  headerCells.forEach((cell) => {
    const th = document.createElement("th");
    appendInlineMarkdown(th, cell);
    headRow.append(th);
  });
  head.append(headRow);
  table.append(head);

  const body = document.createElement("tbody");
  bodyLines.forEach((line) => {
    const row = document.createElement("tr");
    splitMarkdownTableRow(line).forEach((cell) => {
      const td = document.createElement("td");
      appendInlineMarkdown(td, cell);
      row.append(td);
    });
    body.append(row);
  });
  table.append(body);
  return table;
}

function splitMarkdownTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function makeMarkdownCodeBlock(code, language = "") {
  const pre = document.createElement("pre");
  if (language) pre.dataset.language = language;
  const codeElement = document.createElement("code");
  codeElement.textContent = code;
  pre.append(codeElement);
  return pre;
}

function appendInlineMarkdown(parent, text) {
  const pattern = /(`[^`]+`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text))) {
    if (match.index > cursor) parent.append(document.createTextNode(text.slice(cursor, match.index)));
    if (match[1]) {
      const code = document.createElement("code");
      code.textContent = match[1].slice(1, -1);
      parent.append(code);
    } else {
      const link = document.createElement("a");
      link.textContent = match[3];
      link.href = resolveSpecLink(match[4]);
      link.target = "_blank";
      link.rel = "noreferrer";
      parent.append(link);
    }
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) parent.append(document.createTextNode(text.slice(cursor)));
}

function resolveSpecLink(href) {
  if (/^(https?:|mailto:|#|\/)/i.test(href)) return href;
  return `docs/${href}`;
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
    const detail = state.bridgeDetected
      ? "Copied. Roll20 bridge is installed but did not answer; reload the Roll20 tab and the sheet tab."
      : "Copied. Roll20 bridge not detected on this sheet page; reload the extension, then reload this page.";
    setStatus(detail, true);
  }, 2500);
}

function pingBridge() {
  window.postMessage({
    source: "sw5e-sheet",
    type: "ROLL20_BRIDGE_PING"
  }, window.location.origin);
}

function handleBridgeResponse(event) {
  if (event.source !== window) return;
  const message = event.data;
  if (!message || message.source !== "sw5e-roll20-bridge") return;
  if (message.type === "ROLL20_BRIDGE_PONG") {
    state.bridgeDetected = true;
    return;
  }
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

function skillFlags(skill) {
  if (skill.expertise) return ["EXP"];
  if (skill.proficient) return ["PROF"];
  return [];
}

function actionTags(entry) {
  const label = {
    action: "Action",
    bonusAction: "Bonus Action",
    reaction: "Reaction"
  }[entry.actionType];
  return label ? [{ id: entry.actionType, label }] : [];
}

function depletionsFor(entity) {
  return Array.isArray(entity?.depletes) ? entity.depletes : [];
}

function depletionSummary(entity) {
  const parts = depletionsFor(entity).map(describeDepletion).filter(Boolean);
  const options = Array.isArray(entity?.depletionOptions) ? entity.depletionOptions : [];
  if (options.length) {
    parts.push(`Options: ${options.map((option) => option.name).join(" / ")}`);
  }
  return parts.length ? `Uses ${parts.join("; ")}` : "";
}

function depletionOptionActions(entity) {
  return (entity.depletionOptions || []).map((option) => ({
    label: option.name,
    onClick: () => applyDepletions(option.depletes || [], option.name)
  }));
}

function describeDepletion(depletion) {
  const resolved = resolveDepletionTarget(depletion.target);
  const amount = Number(depletion.amount) || 0;
  if (!resolved) return `${amount} unknown resource`;
  const unit = resolved.unit ? ` ${resolved.unit}` : "";
  const itemLabel = resolved.item ? ` (${resolved.item.name})` : "";
  return `${amount} ${resolved.name}${unit}${itemLabel}`;
}

function applyEntityDepletion(entity, label) {
  applyDepletions(depletionsFor(entity), label);
}

function applyDepletions(depletions, label) {
  if (!depletions?.length) return;

  const promptRequired = depletions.some((depletion) => depletion.prompt);
  if (promptRequired && !window.confirm(`Spend resources for ${label}?`)) return;

  const applied = [];
  const skipped = [];
  depletions.forEach((depletion) => {
    const resolved = resolveDepletionTarget(depletion.target);
    const amount = Number(depletion.amount) || 0;
    if (!resolved || amount <= 0) {
      skipped.push("unknown resource");
      return;
    }

    const before = resolved.getCurrent();
    resolved.setCurrent(Math.max(0, before - amount));
    const itemLabel = resolved.item ? ` (${resolved.item.name})` : "";
    applied.push(`${resolved.name}${itemLabel} -${Math.min(before, amount)}`);
  });

  if (state.character) renderSheet();
  if (applied.length) {
    window.setTimeout(() => {
      setStatus(`Spent for ${label}: ${applied.join(", ")}.`);
    }, 80);
  } else if (skipped.length) {
    setStatus(`Could not spend resource for ${label}.`, true);
  }
}

function applyRest(type) {
  if (!state.character) return;

  const restored = [];
  if (type === "long") {
    const hp = state.character.combat?.hitPoints;
    if (hp) {
      hp.current = Number(hp.max) || hp.current || 0;
      hp.temporary = 0;
      restored.push("HP");
    }
  }

  (state.character.resources || []).forEach((resource) => {
    if (!restoresOnRest(resource, type)) return;
    const before = Number(resource.current) || 0;
    const max = Number(resource.max) || 0;
    if (max > 0 && before !== max) {
      resource.current = max;
      restored.push(resource.name);
    }
  });

  (state.character.inventory || []).forEach((item) => {
    (item.containedResources || []).forEach((resource) => {
      if (!restoresOnRest(resource, type)) return;
      const before = Number(resource.current) || 0;
      const max = Number(resource.max) || 0;
      if (max > 0 && before !== max) {
        resource.current = max;
        restored.push(`${item.name}: ${resource.name}`);
      }
    });
  });

  renderSheet();
  const label = type === "long" ? "Long rest" : "Short rest";
  setStatus(restored.length ? `${label} applied: ${restored.join(", ")} restored.` : `${label} applied; nothing marked for recovery was missing.`);
}

function restoresOnRest(resource, type) {
  const recovery = resource.restRecovery || resource.recoverOnRest || resource.resetsOnRest || "none";
  if (type === "short") return recovery === "short" || recovery === "shortOrLong";
  return recovery === "short" || recovery === "long" || recovery === "shortOrLong";
}

function resolveDepletionTarget(target) {
  if (!target || !state.character) return null;

  if (target.scope === "character") {
    const resource = (state.character.resources || []).find((item) => item.id === target.id);
    return resource ? {
      name: resource.name,
      unit: resource.unit,
      getCurrent: () => Number(resource.current) || 0,
      setCurrent: (value) => {
        resource.current = clampNumber(value, 0, Number(resource.max) || Infinity);
      }
    } : null;
  }

  if (target.scope === "inventoryItem") {
    const item = (state.character.inventory || []).find((inventoryItem) => inventoryItem.id === target.itemId);
    const resource = item?.containedResources?.find((contained) => contained.id === target.id);
    return resource ? {
      name: resource.name,
      unit: resource.unit,
      item,
      getCurrent: () => Number(resource.current) || 0,
      setCurrent: (value) => {
        resource.current = clampNumber(value, 0, Number(resource.max) || Infinity);
      }
    } : null;
  }

  if (target.scope === "hitPoints") {
    const hp = state.character.combat?.hitPoints;
    const field = target.id || target.field || "current";
    if (!hp || !["current", "temporary", "max"].includes(field)) return null;
    return {
      name: field === "temporary" ? "Temporary HP" : field === "max" ? "Max HP" : "HP",
      unit: "hp",
      getCurrent: () => Number(hp[field]) || 0,
      setCurrent: (value) => {
        hp[field] = clampNumber(value, 0, field === "current" ? Number(hp.max) || Infinity : Infinity);
      }
    };
  }

  if (["inventoryQuantity", "inventoryItemQuantity", "inventoryItemCount"].includes(target.scope)) {
    const item = (state.character.inventory || []).find((inventoryItem) => inventoryItem.id === (target.itemId || target.id));
    return item ? {
      name: "Quantity",
      unit: "item",
      item,
      getCurrent: () => Number(item.quantity ?? 1) || 0,
      setCurrent: (value) => {
        item.quantity = clampNumber(value, 0, Infinity);
      }
    } : null;
  }

  return null;
}

function containedResourcesHtml(item) {
  const resources = item.containedResources || [];
  if (!resources.length) return "";

  return `<div class="contained-resources">${resources.map((resource) => {
    const current = Number(resource.current) || 0;
    const max = Number(resource.max) || 0;
    const percentage = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    return `
      <div class="contained-resource" data-contained-resource="${escapeHtml(resource.id)}">
        <div class="small"><span data-contained-title="${escapeHtml(resource.id)}"></span>: ${current} / ${max}${resource.unit ? ` ${escapeHtml(resource.unit)}` : ""}</div>
        <div class="resource-meter" aria-hidden="true"><div class="resource-fill" style="width: ${percentage}%"></div></div>
      </div>
    `;
  }).join("")}</div>`;
}

function bindContainedResourceControls(row, item) {
  (item.containedResources || []).forEach((resource) => {
    const container = row.querySelector(`[data-contained-resource="${cssEscape(resource.id)}"]`);
    if (!container) return;
    const max = Number(resource.max) || 0;
    const title = container.querySelector(`[data-contained-title="${cssEscape(resource.id)}"]`);
    if (title) {
      const titleParent = title.parentElement;
      const description = containedResourceDescription(item, resource);
      title.replaceWith(makeClickableTitle(resource.name, () => {
        postDescription(resource.name, description);
      }, "contained-resource-title"));
      titleParent?.append(" ", makeHelpButton(resource.name, resource.help, description));
    }
    container.append(makeStepper(Number(resource.current) || 0, (value) => {
      resource.current = clampNumber(value, 0, max || Infinity);
      renderSheet();
      setStatus(`${item.name} ${resource.name} set to ${resource.current}.`);
    }, { min: 0, max: max || Infinity, label: `${item.name} ${resource.name}` }));
  });
}

function customEntryKind(entry) {
  if (entry.kind === "reference") return "reference";
  if (entry.kind === "roll") return "roll";
  if (entry.formula === undefined || entry.formula === null || String(entry.formula).trim() === "0") {
    return "reference";
  }
  return "roll";
}

function getInitiativeModifier(character) {
  return abilityMod(character.abilities.dex) + (Number(character.combat?.initiativeBonus) || 0);
}

function getTechcastingDc(character) {
  return Number(character.combat?.techcastingDc) || 8 + character.proficiencyBonus + abilityMod(character.abilities.int);
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

function labelFromSlug(value) {
  return titleCase(String(value).replace(/[-_]+/g, " "));
}

function inventoryMeta(item, includeQuantity = true) {
  return [
    includeQuantity ? `Qty ${item.quantity ?? 1}` : "",
    item.cost !== undefined ? `${item.cost} cr` : "",
    item.equipped ? "equipped" : "",
    item.infused ? "infused" : "",
    item.donned ? "donned" : "",
    item.backpack ? "backpack" : "",
    item.pouch ? "belt pouch" : "",
    item.location ? `location: ${item.location}` : "",
    item.weight !== undefined ? `${item.weight} lb` : ""
  ].filter(Boolean).map(escapeHtml).join(" - ");
}

function displayValue(value) {
  if (Array.isArray(value)) return joinDisplay(value);
  if (value === undefined || value === null || value === "") return "-";
  return String(value);
}

function joinDisplay(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (value === undefined || value === null || value === "") return "-";
  return String(value);
}

function ordinalSuffix(value) {
  if (!Number.isFinite(value)) return "";
  if ([11, 12, 13].includes(value % 100)) return "th";
  return { 1: "st", 2: "nd", 3: "rd" }[value % 10] || "th";
}

function groupBy(items, keyFn) {
  return items.reduce((groups, item) => {
    const key = keyFn(item);
    groups[key] ||= [];
    groups[key].push(item);
    return groups;
  }, {});
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

function clampNumber(value, min, max) {
  const number = Number.isFinite(value) ? Math.round(value) : min;
  return Math.max(min, Math.min(max, number));
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(String(value));
  return String(value).replace(/["\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
