import { CombatResources, ImportantResourceSummary } from "./components/CombatResources";
import { mergeResources } from "./domain/limited-resources";
import { CombatEntriesSection } from './components/CombatEntriesSection';
import { mergeCombatEntries, primaryAttackSummary } from './domain/combat-entries';
import { overviewValue, setOverviewValue } from "./domain/overview-fields";
import { ClaimedCharacterCard } from "./components/claimed-character-card";
import { calculateDerivedValues, type DerivedValue, type DerivedValueKey } from "./domain/derived-values";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  abilityScoreKeys,
  skillKeys,
  type AbilityScoreKey,
  type SkillProficiency,
  type AccessRole,
  type CharacterRecord,
  type CharacterSlot,
  type OverviewFieldKey,
  type OverviewFieldValue,
  type Party,
  type PartyData,
  type PartySession,
} from "./domain/party";

type AppProps = {
  partyData: PartyData;
};

const abilityScoreLabels: Record<AbilityScoreKey, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

const skillLabels = {
  acrobatics: "Acrobatics",
  animalHandling: "Animal Handling",
  arcana: "Arcana",
  athletics: "Athletics",
  deception: "Deception",
  history: "History",
  insight: "Insight",
  intimidation: "Intimidation",
  investigation: "Investigation",
  medicine: "Medicine",
  nature: "Nature",
  perception: "Perception",
  performance: "Performance",
  persuasion: "Persuasion",
  religion: "Religion",
  sleightOfHand: "Sleight of Hand",
  stealth: "Stealth",
  survival: "Survival",
} as const;

function mergeCharacterRecords(current: CharacterRecord, incoming: CharacterRecord) {
  const merged: CharacterRecord = {
    ...incoming,
    limitedResources: mergeResources(current.limitedResources, incoming.limitedResources),
    combatEntries: mergeCombatEntries(current.combatEntries, incoming.combatEntries),
    abilityScores: { ...incoming.abilityScores },
    savingThrowProficiencies: { ...incoming.savingThrowProficiencies },
    skillProficiencies: { ...incoming.skillProficiencies },
    derivedOverrides: { ...incoming.derivedOverrides },
    fieldVersions: { ...incoming.fieldVersions },
  };

  for (const field of Object.keys(current.fieldVersions) as OverviewFieldKey[]) {
    const currentVersion = current.fieldVersions[field] ?? 0;
    if (currentVersion > (incoming.fieldVersions[field] ?? 0)) {
      setOverviewValue(merged, field, overviewValue(current, field));
      merged.fieldVersions[field] = currentVersion;
    }
  }
  return merged;
}

function mergePartySnapshot(current: Party | null, incoming: Party): Party {
  if (!current) return incoming;
  return {
    ...incoming,
    slots: incoming.slots.map((slot) => {
      const currentSlot = current.slots.find((candidate) => candidate.id === slot.id);
      if (!currentSlot?.character) return slot;
      if (!slot.character) return currentSlot;
      return {
        ...slot,
        character: mergeCharacterRecords(currentSlot.character, slot.character),
      };
    }),
  };
}

function CompassMark() {
  return (
    <div className="compass" role="img" aria-label="A weathered compass">
      <span className="compass__direction compass__direction--north">N</span>
      <span className="compass__direction compass__direction--east">E</span>
      <span className="compass__direction compass__direction--south">S</span>
      <span className="compass__direction compass__direction--west">W</span>
      <span className="compass__needle" aria-hidden="true" />
      <span className="compass__eye" aria-hidden="true" />
    </div>
  );
}

function Portrait({ position }: { position: number }) {
  return (
    <div className="character-slot__portrait" aria-hidden="true">
      <span className="character-slot__number">
        {String(position).padStart(2, "0")}
      </span>
      <span className="character-slot__silhouette" />
    </div>
  );
}

function UnclaimedSlot({
  position,
  onSelect,
}: {
  position: number;
  onSelect: () => void;
}) {
  return (
    <article className="character-slot" aria-label="Unclaimed character slot">
      <button className="character-slot__action" type="button" onClick={onSelect}>
        <Portrait position={position} />
        <span className="character-slot__body">
          <span className="character-slot__eyebrow">Character slot {position}</span>
          <strong>Unclaimed</strong>
          <span>A place waits at the table.</span>
        </span>
        <span className="character-slot__marker" aria-hidden="true">+</span>
      </button>
    </article>
  );
}

function combatPlaySummary(slot: CharacterSlot) {
  const summary = primaryAttackSummary(slot.character?.combatEntries);
  return <>
    {summary && <span className="primary-attack-summary">Primary attack: {summary}</span>}
    <ImportantResourceSummary resources={slot.character?.limitedResources} />
  </>;
}

type IdentityDraft = Pick<
  CharacterRecord,
  "playerName" | "characterName" | "primaryClass" | "subclass" | "species" | "background"
> & {
  level: string;
};

const emptyIdentity: IdentityDraft = {
  playerName: "",
  characterName: "",
  primaryClass: "",
  subclass: "",
  species: "",
  background: "",
  level: "1",
};

const emptyAbilityScores: Record<AbilityScoreKey, string> = {
  strength: "",
  dexterity: "",
  constitution: "",
  intelligence: "",
  wisdom: "",
  charisma: "",
};

function SetupField({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  min?: number;
  max?: number;
}) {
  return (
    <label className="setup-field">
      <span>{label}</span>
      <input
        type={type}
        min={min}
        max={max}
        step={type === "number" ? 1 : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
      />
    </label>
  );
}

function CharacterSetup({
  slot,
  partyData,
  onCancel,
  onClaimed,
}: {
  slot: CharacterSlot;
  partyData: PartyData;
  onCancel: () => void;
  onClaimed: (slot: CharacterSlot) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [identity, setIdentity] = useState(emptyIdentity);
  const [scores, setScores] = useState(emptyAbilityScores);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updateIdentity(field: keyof IdentityDraft, value: string) {
    setIdentity((current) => ({ ...current, [field]: value }));
  }

  function continueToScores(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requiredText = [
      identity.playerName,
      identity.characterName,
      identity.primaryClass,
      identity.subclass,
      identity.species,
      identity.background,
    ];
    const level = Number(identity.level);

    if (requiredText.some((value) => value.trim() === "")) {
      setError("Complete every identity field before continuing.");
      return;
    }

    if (!Number.isInteger(level) || level < 1 || level > 20) {
      setError("Level must be a whole number from 1 to 20.");
      return;
    }

    setError("");
    setStep(2);
  }

  async function finishClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedScores = abilityScoreKeys.map((key) => Number(scores[key]));

    if (
      abilityScoreKeys.some((key) => scores[key].trim() === "") ||
      parsedScores.some((score) => !Number.isInteger(score) || score < 1 || score > 30)
    ) {
      setError("Enter all six Ability Scores as whole numbers from 1 to 30.");
      return;
    }

    const abilityScores = Object.fromEntries(
      abilityScoreKeys.map((key, index) => [key, parsedScores[index]]),
    ) as CharacterRecord["abilityScores"];

    setError("");
    setIsSaving(true);

    try {
      const claimedSlot = await partyData.claimCharacterSlot(slot.id, {
        playerName: identity.playerName.trim(),
        characterName: identity.characterName.trim(),
        primaryClass: identity.primaryClass.trim(),
        subclass: identity.subclass.trim(),
        species: identity.species.trim(),
        background: identity.background.trim(),
        level: Number(identity.level),
        abilityScores,
        savingThrowProficiencies: Object.fromEntries(
          abilityScoreKeys.map((key) => [key, "none"]),
        ) as CharacterRecord["savingThrowProficiencies"],
        skillProficiencies: Object.fromEntries(
          skillKeys.map((key) => [key, "none"]),
        ) as CharacterRecord["skillProficiencies"],
        armorClass: 10,
        maxHitPoints: 1,
        speed: 30,
        spellcastingAbility: null,
        derivedOverrides: {},
        fieldVersions: {},
      });
      onClaimed(claimedSlot);
    } catch {
      setError(
        "The Character Slot could not be claimed. It may have been claimed elsewhere.",
      );
      setIsSaving(false);
    }
  }

  return (
    <main className="setup" aria-labelledby="setup-heading">
      <button className="text-button" type="button" onClick={onCancel}>
        ← Back to the Party
      </button>
      <section className="setup__panel">
        <p className="hero__kicker">Claim Character Slot {slot.position}</p>
        <h1 id="setup-heading">Name the soul aboard</h1>
        <p className="setup__intro">
          A claim records who is responsible for this Player Character. Every Party
          member can still open and edit the Character Record.
        </p>

        <ol className="setup-progress" aria-label="Character setup progress">
          <li className={step === 1 ? "is-current" : "is-complete"}>1 · Identity</li>
          <li className={step === 2 ? "is-current" : ""}>2 · Ability Scores</li>
        </ol>

        {step === 1 ? (
          <form className="setup-form" noValidate onSubmit={continueToScores}>
            <div className="setup-form__grid">
              <SetupField
                label="Player name"
                value={identity.playerName}
                onChange={(value) => updateIdentity("playerName", value)}
              />
              <SetupField
                label="Character name"
                value={identity.characterName}
                onChange={(value) => updateIdentity("characterName", value)}
              />
              <SetupField
                label="Primary class"
                value={identity.primaryClass}
                onChange={(value) => updateIdentity("primaryClass", value)}
              />
              <SetupField
                label="Subclass"
                value={identity.subclass}
                onChange={(value) => updateIdentity("subclass", value)}
              />
              <SetupField
                label="Species"
                value={identity.species}
                onChange={(value) => updateIdentity("species", value)}
              />
              <SetupField
                label="Background"
                value={identity.background}
                onChange={(value) => updateIdentity("background", value)}
              />
              <SetupField
                label="Level"
                type="number"
                min={1}
                max={20}
                value={identity.level}
                onChange={(value) => updateIdentity("level", value)}
              />
            </div>
            {error && <p className="setup-form__error" role="alert">{error}</p>}
            <button className="enter-button" type="submit">Continue to Ability Scores</button>
          </form>
        ) : (
          <form className="setup-form" noValidate onSubmit={finishClaim}>
            <fieldset>
              <legend>All six Ability Scores</legend>
              <p>Enter the scores written on the Character Record.</p>
              <div className="ability-entry-grid">
                {abilityScoreKeys.map((key) => (
                  <SetupField
                    key={key}
                    label={abilityScoreLabels[key]}
                    type="number"
                    min={1}
                    max={30}
                    value={scores[key]}
                    onChange={(value) =>
                      setScores((current) => ({ ...current, [key]: value }))
                    }
                  />
                ))}
              </div>
            </fieldset>
            {error && <p className="setup-form__error" role="alert">{error}</p>}
            <div className="setup-form__actions">
              <button className="secondary-button" type="button" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="enter-button" type="submit" disabled={isSaving}>
                {isSaving ? "Claiming the berth…" : "Claim Character Slot"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

type SaveState = "idle" | "saving" | "saved" | "unsaved";
type SaveField = (
  field: OverviewFieldKey,
  value: OverviewFieldValue,
  expectedVersion: number,
) => Promise<"saved" | "conflict">;

function SaveFeedback({
  id,
  state,
  message,
  onRetry,
}: {
  id: string;
  state: SaveState;
  message: string;
  onRetry?: () => void;
}) {
  if (state === "idle") return <span id={id} className="save-feedback" />;
  return (
    <span
      id={id}
      className={`save-feedback save-feedback--${state}`}
      role={state === "unsaved" ? "alert" : "status"}
      aria-live="polite"
    >
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : message}
      {state === "unsaved" && onRetry && (
        <button type="button" data-save-retry="true" onClick={onRetry}>Retry</button>
      )}
    </span>
  );
}

function EditableInput({
  field,
  label,
  value,
  version,
  onSave,
  type = "text",
  min,
  max,
}: {
  field: OverviewFieldKey;
  label: string;
  value: string | number;
  version: number;
  onSave: SaveField;
  type?: "text" | "number";
  min?: number;
  max?: number;
}) {
  const [draft, setDraft] = useState(String(value));
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const draftRevision = useRef(0);
  const saveRequest = useRef(0);
  const draftVersion = useRef(version);
  const feedbackId = `save-${field.replace(".", "-")}`;
  const inputId = `field-${field.replace(".", "-")}`;

  useEffect(() => {
    if (!dirty) {
      draftVersion.current = version;
      setDraft(String(value));
    }
  }, [dirty, value, version]);

  async function save() {
    const trimmed = draft.trim();
    const parsed = type === "number" ? Number(trimmed) : trimmed;
    if (
      trimmed === "" ||
      (type === "number" && (
        !Number.isInteger(parsed) ||
        (min !== undefined && Number(parsed) < min) ||
        (max !== undefined && Number(parsed) > max)
      ))
    ) {
      setState("unsaved");
      setMessage(type === "number" ? `Enter a whole number from ${min} to ${max}.` : "Enter a value before saving.");
      return;
    }
    if (!dirty && String(value) === String(parsed)) return;

    const revision = draftRevision.current;
    const expectedVersion = draftVersion.current;
    const request = ++saveRequest.current;
    setState("saving");
    try {
      const result = await onSave(field, parsed, expectedVersion);
      if (request !== saveRequest.current) return;
      // A remote snapshot must not silently rebase an unsaved draft.
      if (result === "saved") draftVersion.current = expectedVersion + 1;
      if (revision !== draftRevision.current) {
        setState("unsaved");
        setMessage("You have newer changes that are not saved.");
        return;
      }
      if (result === "conflict") {
        setState("unsaved");
        setMessage("Changed elsewhere. Your value is not saved.");
        return;
      }
      setDirty(false);
      setState("saved");
      setMessage("");
    } catch {
      if (request !== saveRequest.current) return;
      setState("unsaved");
      setMessage("Not saved. Check your connection and retry.");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      inputRef.current?.blur();
    }
  }

  return (
    <div className="overview-field">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        ref={inputRef}
        type={type}
        min={min}
        max={max}
        step={type === "number" ? 1 : undefined}
        value={draft}
        aria-describedby={feedbackId}
        aria-invalid={state === "unsaved"}
        onChange={(event) => {
          if (!dirty) draftVersion.current = version;
          draftRevision.current += 1;
          setDraft(event.target.value);
          setDirty(true);
          setState("idle");
        }}
        onBlur={(event) => {
          if (dirty && !(event.relatedTarget instanceof HTMLElement && event.relatedTarget.dataset.saveRetry)) void save();
        }}
        onKeyDown={handleKeyDown}
      />
      <SaveFeedback id={feedbackId} state={state} message={message}
        onRetry={() => { draftVersion.current = version; void save(); }} />
    </div>
  );
}

function EditableSelect({
  field,
  label,
  value,
  version,
  options,
  onSave,
}: {
  field: OverviewFieldKey;
  label: string;
  value: string;
  version: number;
  options: Array<{ value: string; label: string }>;
  onSave: SaveField;
}) {
  const [draft, setDraft] = useState(value);
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const feedbackId = `save-${field.replace(".", "-")}`;
  const selectId = `field-${field.replace(".", "-")}`;

  useEffect(() => {
    if (!dirty) setDraft(value);
  }, [dirty, value, version]);

  async function save(nextValue: string = draft) {
    setState("saving");
    try {
      const result = await onSave(field, nextValue === "" ? null : nextValue, version);
      if (result === "conflict") {
        setState("unsaved");
        setMessage("Changed elsewhere. Your choice is not saved.");
      } else {
        setDirty(false);
        setState("saved");
        setMessage("");
      }
    } catch {
      setState("unsaved");
      setMessage("Not saved. Check your connection and retry.");
    }
  }

  return (
    <div className="overview-field">
      <label htmlFor={selectId}>{label}</label>
      <select
        id={selectId}
        value={draft}
        disabled={state === "saving"}
        aria-describedby={feedbackId}
        aria-invalid={state === "unsaved"}
        onChange={(event) => {
          setDirty(true);
          setDraft(event.target.value);
          void save(event.target.value);
        }}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <SaveFeedback id={feedbackId} state={state} message={message} onRetry={() => void save()} />
    </div>
  );
}

const proficiencyOptions: Array<{ value: SkillProficiency; label: string }> = [
  { value: 'none', label: 'Not proficient' },
  { value: 'proficient', label: 'Proficient' },
  { value: 'expertise', label: 'Expertise (double proficiency)' },
];

function DerivedValueEditor({ valueKey, label, result, override, signed, version, onSave }: {
  valueKey: DerivedValueKey; label: string; result: DerivedValue; override: number | null;
  signed: boolean; version: number; onSave: SaveField;
}) {
  const [draft, setDraft] = useState<number | null>(override);
  const [text, setText] = useState(String(override ?? ''));
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [state, setState] = useState<SaveState>('idle');
  const [message, setMessage] = useState('');
  const revision = useRef(0);
  const request = useRef(0);
  const draftVersion = useRef(version);
  const inputRef = useRef<HTMLInputElement>(null);
  const field: OverviewFieldKey = `override.${valueKey}`;
  const id = `derived-${valueKey.replaceAll('.', '-')}`;
  useEffect(() => {
    if (!dirty) { draftVersion.current = version; setDraft(override); setText(String(override ?? '')); }
  }, [override, version, dirty]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  const visible = dirty ? draft === null ? result.calculated : Number.isFinite(draft) ? draft : result.value : result.value;
  const overridden = dirty ? draft !== null : result.overridden;
  const format = (value: number | null) => value === null ? 'Not set' : signed && value >= 0 ? `+${value}` : String(value);

  async function save(next: number | null) {
    if (next !== null && (!Number.isInteger(next) || next < -999 || next > 999)) {
      setState('unsaved'); setMessage('Enter a whole number from -999 to 999.'); return;
    }
    const expectedVersion = draftVersion.current;
    const savedRevision = revision.current;
    const savedRequest = ++request.current;
    setState('saving');
    try {
      const outcome = await onSave(field, next, expectedVersion);
      if (savedRequest !== request.current) return;
      // Only our accepted write can advance a still-dirty draft's base version.
      if (outcome === 'saved') draftVersion.current = expectedVersion + 1;
      if (savedRevision !== revision.current) {
        setState('unsaved'); setMessage('You have newer changes that are not saved.'); return;
      }
      if (outcome === 'conflict') {
        setState('unsaved'); setMessage('Changed elsewhere. Your override is not saved.'); return;
      }
      setDirty(false); setEditing(false); setState('saved'); setMessage('');
    } catch {
      if (savedRequest !== request.current) return;
      setState('unsaved'); setMessage('Not saved. Check your connection and retry.');
    }
  }
  function saveText() { void save(text.trim() === '' ? NaN : Number(text)); }
  function reset() {
    draftVersion.current = version;
    revision.current += 1; setDraft(null); setText(''); setDirty(true); setEditing(false);
    void save(null);
  }
  return (
    <div className={`derived-field ${overridden ? 'derived-field--overridden' : ''}`} role="group" aria-label={label}>
      <div className="derived-field__result"><span>{label}</span><output aria-label={`${label} value`}>{format(visible)}</output></div>
      <span className="derived-field__source">{overridden ? `Override${dirty ? ' (unsaved)' : ''} · calculated: ${format(result.calculated)}` : 'Calculated'}</span>
      {(editing || overridden) && (
        <label className="derived-field__input">Override value
          <input ref={inputRef} type="number" min={-999} max={999} step={1}
            aria-label={`${label} override`} aria-describedby={`${id}-feedback`}
            aria-invalid={state === 'unsaved'} value={text}
            onChange={(event) => {
              if (!dirty) draftVersion.current = version;
              revision.current += 1; setText(event.target.value); setDirty(true); setState('idle');
              const number = Number(event.target.value);
              setDraft(event.target.value.trim() !== '' && Number.isInteger(number) ? number : NaN);
            }}
            onBlur={(event) => {
              if (dirty && !(event.relatedTarget instanceof HTMLElement && (event.relatedTarget.dataset.resetOverride || event.relatedTarget.dataset.saveRetry))) saveText();
            }}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />
        </label>
      )}
      <div className="derived-field__actions">
        {!editing && !overridden && <button type="button" onClick={() => {
          draftVersion.current = version;
          revision.current += 1; setEditing(true); setDirty(true); setDraft(result.value ?? 0); setText(String(result.value ?? 0)); setState('idle');
        }}>Override {label}</button>}
        {(editing || overridden) && <button type="button" data-reset-override="true" disabled={state === 'saving'} onClick={reset}>Reset {label}</button>}
      </div>
      <SaveFeedback id={`${id}-feedback`} state={state} message={message}
        onRetry={() => { draftVersion.current = version; if (draft === null) void save(null); else saveText(); }} />
    </div>
  );
}

function CharacterPage({
  slot,
  partyData,
  onBack,
  onSlotChanged,
}: {
  slot: CharacterSlot;
  partyData: PartyData;
  onBack: () => void;
  onSlotChanged: (slot: CharacterSlot) => void;
}) {
  const [section, setSection] = useState("Overview");
  const character = slot.character!;
  const derived = calculateDerivedValues({ ...character, totalLevel: character.level }, character.derivedOverrides);
  const version = (field: OverviewFieldKey) => character.fieldVersions[field] ?? 0;

  const saveField: SaveField = async (field, value, expectedVersion) => {
    const result = await partyData.updateCharacterOverviewField(
      slot.id,
      field,
      value,
      expectedVersion,
    );
    onSlotChanged(result.slot);
    return result.ok ? "saved" : "conflict";
  };

  const derivedEditor = (valueKey: DerivedValueKey, label: string, signed = true) => (
    <DerivedValueEditor valueKey={valueKey} label={label} result={derived[valueKey]}
      override={character.derivedOverrides[valueKey] ?? null} signed={signed}
      version={version(`override.${valueKey}`)} onSave={saveField} />
  );

  const identityFields: Array<{
    field: OverviewFieldKey;
    label: string;
    value: string | number;
    type?: "text" | "number";
    min?: number;
    max?: number;
  }> = [
    { field: "playerName", label: "Player name", value: character.playerName },
    { field: "characterName", label: "Character name", value: character.characterName },
    { field: "primaryClass", label: "Primary class", value: character.primaryClass },
    { field: "subclass", label: "Subclass", value: character.subclass },
    { field: "species", label: "Species", value: character.species },
    { field: "background", label: "Background", value: character.background },
    { field: "level", label: "Level", value: character.level, type: "number", min: 1, max: 20 },
  ];

  return (
    <main className="character-page" aria-labelledby="character-heading">
      <button className="text-button" type="button" onClick={onBack}>← Back to the Party</button>
      <section className="character-identity">
        <Portrait position={slot.position} />
        <div>
          <p className="hero__kicker">Played by {character.playerName}</p>
          <h1 id="character-heading">{character.characterName}</h1>
          <p>Level {character.level} {character.primaryClass} · {character.subclass}</p>
          <p>{character.species} · {character.background}</p>
        </div>
      </section>

      <nav className="character-nav" aria-label="Character Record sections">
        {['Overview', 'Combat', 'Magic', 'Inventory', 'Features', 'Story'].map((item) => (
          <button
            key={item}
            type="button"
            aria-current={item === section ? "page" : undefined}
            disabled={item !== "Overview" && item !== "Combat"}
            onClick={() => setSection(item)}
            title={item === "Overview" || item === "Combat" ? undefined : "Not available yet"}
          >
            {item}
          </button>
        ))}
      </nav>

      <div hidden={section !== "Combat"}>
        <CombatResources slotId={slot.id} resources={character.limitedResources} partyData={partyData}
          onChanged={resources => onSlotChanged({ ...slot, character: { ...character, limitedResources: resources } })} />
        <CombatEntriesSection slot={slot} partyData={partyData} onSlotChanged={onSlotChanged} />
      </div>
      <div hidden={section !== "Overview"}>
      <section className="overview-section" aria-labelledby="identity-heading">
        <div className="section-heading">
          <div><p className="section-heading__eyebrow">Character overview</p><h2 id="identity-heading">Identity</h2></div>
          <p>Fields save when you leave them.</p>
        </div>
        <div className="overview-grid overview-grid--identity">
          {identityFields.map((field) => (
            <EditableInput key={field.field} {...field} version={version(field.field)} onSave={saveField} />
          ))}
        </div>
      </section>

      <section className="overview-section" aria-labelledby="ability-heading">
        <div className="section-heading">
          <div><p className="section-heading__eyebrow">Core capabilities</p><h2 id="ability-heading">Ability Scores &amp; Saves</h2></div>
        </div>
        <div className="ability-editor-grid">
          {abilityScoreKeys.map((key) => (
            <div className="ability-editor" key={key}>
              <EditableInput
                field={key}
                label={abilityScoreLabels[key]}
                value={character.abilityScores[key]}
                version={version(key)}
                type="number"
                min={1}
                max={30}
                onSave={saveField}
              />
              {derivedEditor(`ability.${key}`, `${abilityScoreLabels[key]} modifier`)}
              <EditableSelect
                field={`save.${key}`}
                label={`${abilityScoreLabels[key]} saving throw proficiency`}
                value={character.savingThrowProficiencies[key]}
                options={proficiencyOptions}
                version={version(`save.${key}`)}
                onSave={saveField}
              />
              {derivedEditor(`save.${key}`, `${abilityScoreLabels[key]} saving throw modifier`)}
            </div>
          ))}
        </div>
      </section>

      <section className="overview-section" aria-labelledby="derived-heading">
        <div className="section-heading"><div><p className="section-heading__eyebrow">Calculated from your record</p><h2 id="derived-heading">Derived Values</h2></div></div>
        <p className="derived-help">Overrides flow into dependent calculations. Reset restores the calculation. Spell values need a spellcasting Ability or an explicit override.</p>
        <div className="overview-grid overview-grid--compact">
          {derivedEditor('proficiencyBonus', 'Proficiency bonus')}
          {derivedEditor('initiative', 'Initiative')}
          {derivedEditor('passivePerception', 'Passive Perception', false)}
          {derivedEditor('spellAttack', 'Spell attack modifier')}
          {derivedEditor('spellSaveDC', 'Spell save DC', false)}
        </div>
      </section>

      <section className="overview-section" aria-labelledby="defences-heading">
        <div className="section-heading"><div><p className="section-heading__eyebrow">At the table</p><h2 id="defences-heading">Defences &amp; Movement</h2></div></div>
        <div className="overview-grid overview-grid--compact">
          <EditableInput field="armorClass" label="Armor Class" value={character.armorClass} version={version("armorClass")} type="number" min={0} max={999} onSave={saveField} />
          <EditableInput field="maxHitPoints" label="Maximum Hit Points" value={character.maxHitPoints} version={version("maxHitPoints")} type="number" min={1} max={9999} onSave={saveField} />
          <EditableInput field="speed" label="Speed (feet)" value={character.speed} version={version("speed")} type="number" min={0} max={999} onSave={saveField} />
          <EditableSelect
            field="spellcastingAbility"
            label="Spellcasting Ability"
            value={character.spellcastingAbility ?? ""}
            version={version("spellcastingAbility")}
            onSave={saveField}
            options={[
              { value: "", label: "None" },
              ...abilityScoreKeys.map((key) => ({ value: key, label: abilityScoreLabels[key] })),
            ]}
          />
        </div>
      </section>

      <section className="overview-section" aria-labelledby="skills-heading">
        <div className="section-heading"><div><p className="section-heading__eyebrow">Training</p><h2 id="skills-heading">Skill Proficiency</h2></div></div>
        <div className="skills-grid">
          {skillKeys.map((key) => (
            <div key={key} className="skill-editor">
              <EditableSelect
              field={`skill.${key}`}
              label={skillLabels[key]}
              value={character.skillProficiencies[key]}
              version={version(`skill.${key}`)}
              onSave={saveField}
              options={proficiencyOptions}
            />
            {derivedEditor(`skill.${key}`, `${skillLabels[key]} modifier`)}
            </div>
          ))}
        </div>
      </section>
      </div>
    </main>
  );
}

function LoginScreen({
  partyData,
  onSignedIn,
}: {
  partyData: PartyData;
  onSignedIn: (session: PartySession) => void;
}) {
  const [role, setRole] = useState<AccessRole>("player");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isEntering, setIsEntering] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsEntering(true);
    setError("");

    const result = await partyData.signIn(role, password);
    if (result.ok) {
      onSignedIn(result.session);
      return;
    }

    setError("That password didn’t open the way. Check it and try again.");
    setIsEntering(false);
  }

  return (
    <main className="login">
      <section className="login__panel" aria-labelledby="login-heading">
        <div className="hero__ornament" aria-hidden="true"><span /><b>✦</b><span /></div>
        <CompassMark />
        <p className="hero__kicker">Private waters</p>
        <h1 id="login-heading">The Drowned Compass</h1>
        <p className="login__intro">
          Choose how you’re joining the Party, then speak the shared password.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <fieldset>
            <legend>Enter as</legend>
            <div className="role-options">
              <button
                type="button"
                className={role === "player" ? "role-option is-selected" : "role-option"}
                aria-pressed={role === "player"}
                onClick={() => setRole("player")}
              >
                <span className="role-option__icon" aria-hidden="true">♟</span>
                <span><strong>Player</strong><small>Open the shared Character Records</small></span>
              </button>
              <button
                type="button"
                className={role === "dungeon-master" ? "role-option is-selected" : "role-option"}
                aria-pressed={role === "dungeon-master"}
                onClick={() => setRole("dungeon-master")}
              >
                <span className="role-option__icon" aria-hidden="true">♜</span>
                <span><strong>Dungeon Master</strong><small>Survey the whole Party</small></span>
              </button>
            </div>
          </fieldset>

          <label className="password-field">
            <span>Shared password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <p className="login-form__error" role="alert">{error}</p>}
          <button className="enter-button" type="submit" disabled={isEntering}>
            {isEntering ? "Opening the way…" : "Enter the Party"}
          </button>
        </form>
      </section>
    </main>
  );
}

export function App({ partyData }: AppProps) {
  const [party, setParty] = useState<Party | null>(null);
  const [session, setSession] = useState<PartySession | null | undefined>(undefined);
  const [setupSlotId, setSetupSlotId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    partyData.getSession().then((nextSession) => {
      if (isCurrent) setSession(nextSession);
    });
    return () => { isCurrent = false; };
  }, [partyData]);

  useEffect(() => {
    if (!session) {
      setParty(null);
      return;
    }

    let isCurrent = true;
    const unsubscribe = partyData.subscribeToParty((nextParty) => {
      if (isCurrent) setParty((current) => mergePartySnapshot(current, nextParty));
    });
    void partyData.getParty().then((nextParty) => {
      if (isCurrent) setParty((current) => mergePartySnapshot(current, nextParty));
    });

    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, [partyData, session]);

  if (session === undefined) {
    return <div className="session-loading" aria-label="Opening The Drowned Compass" />;
  }

  async function handleSignOut() {
    await partyData.signOut();
    setSetupSlotId(null);
    setSelectedSlotId(null);
    setSession(null);
  }

  function handleClaimed(claimedSlot: CharacterSlot) {
    setParty((current) => current && ({
      ...current,
      slots: current.slots.map((slot) => slot.id === claimedSlot.id ? claimedSlot : slot),
    }));
    setSetupSlotId(null);
    setSelectedSlotId(claimedSlot.id);
  }

  function handleSlotChanged(changedSlot: CharacterSlot) {
    setParty((current) => current && ({
      ...current,
      slots: current.slots.map((slot) => {
        if (slot.id !== changedSlot.id) return slot;
        if (!slot.character || !changedSlot.character) return changedSlot;
        return {
          ...changedSlot,
          character: mergeCharacterRecords(slot.character, changedSlot.character),
        };
      }),
    }));
  }

  const setupSlot = party?.slots.find((slot) => slot.id === setupSlotId && !slot.character);
  const selectedSlot = party?.slots.find(
    (slot) => slot.id === selectedSlotId && slot.character,
  );

  let authenticatedContent;
  if (setupSlot) {
    authenticatedContent = (
      <CharacterSetup
        slot={setupSlot}
        partyData={partyData}
        onCancel={() => setSetupSlotId(null)}
        onClaimed={handleClaimed}
      />
    );
  } else if (selectedSlot) {
    authenticatedContent = (
      <CharacterPage
        slot={selectedSlot}
        partyData={partyData}
        onBack={() => setSelectedSlotId(null)}
        onSlotChanged={handleSlotChanged}
      />
    );
  } else {
    authenticatedContent = (
      <main className="party-dashboard">
        <section className="hero dashboard-heading" aria-labelledby="party-heading">
          <p className="hero__kicker">Chart the living. Remember the lost.</p>
          <h1 id="party-heading">{party?.name ?? "The Drowned Compass"}</h1>
          <p className="hero__intro">
            Six souls bound for black water. Keep their strengths, scars, and
            dwindling fortunes close at hand.
          </p>
        </section>

        <section className="party" aria-labelledby="party-slots-heading">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">The company</p>
              <h2 id="party-slots-heading">The Party</h2>
            </div>
            <p>{party ? `${party.slots.filter((slot) => slot.character).length} of ${party.slots.length} claimed` : "Reading the ledger…"}</p>
          </div>

          <div className="party-grid" aria-live="polite">
            {party?.slots.map((slot) =>
              slot.character ? (
                <ClaimedCharacterCard
                  key={slot.id}
                  slot={slot}
                  onSelect={() => setSelectedSlotId(slot.id)}
                  playSummary={combatPlaySummary(slot)}
                />
              ) : (
                <UnclaimedSlot
                  key={slot.id}
                  position={slot.position}
                  onSelect={() => setSetupSlotId(slot.id)}
                />
              ),
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <div className="fog fog--left" aria-hidden="true" />
      <div className="fog fog--right" aria-hidden="true" />

      <header className="site-header">
        <a className="brand" href="./" aria-label="The Drowned Compass home">
          <span className="brand__sigil" aria-hidden="true">✦</span>
          <span>The Drowned Compass</span>
        </a>
        {session ? (
          <div className="session-controls">
            <span>{session.role === "dungeon-master" ? "Dungeon Master" : "Player"}</span>
            <button type="button" onClick={handleSignOut}>Sign out</button>
          </div>
        ) : (
          <p className="site-header__label">Party companion</p>
        )}
      </header>

      {session ? authenticatedContent : (
        <LoginScreen partyData={partyData} onSignedIn={setSession} />
      )}

      {session && (
        <footer>
          <span>One party</span>
          <span className="footer__mark" aria-hidden="true">◈</span>
          <span>Six shared character records</span>
        </footer>
      )}
    </div>
  );
}
