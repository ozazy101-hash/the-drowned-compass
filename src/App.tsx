import { type FormEvent, useEffect, useState } from "react";
import {
  abilityScoreKeys,
  type AbilityScoreKey,
  type AccessRole,
  type CharacterRecord,
  type CharacterSlot,
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

function ClaimedSlot({ slot, onSelect }: { slot: CharacterSlot; onSelect: () => void }) {
  const character = slot.character!;

  return (
    <article
      className="character-slot character-slot--claimed"
      aria-label={`${character.characterName}, played by ${character.playerName}`}
    >
      <button className="character-slot__action" type="button" onClick={onSelect}>
        <Portrait position={slot.position} />
        <span className="character-slot__body">
          <span className="character-slot__eyebrow">Played by {character.playerName}</span>
          <strong>{character.characterName}</strong>
          <span>
            Level {character.level} {character.primaryClass} · {character.subclass}
          </span>
        </span>
        <span className="character-slot__marker" aria-hidden="true">›</span>
      </button>
    </article>
  );
}

type IdentityDraft = Omit<CharacterRecord, "level" | "abilityScores"> & {
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

function CharacterPage({ slot, onBack }: { slot: CharacterSlot; onBack: () => void }) {
  const character = slot.character!;

  return (
    <main className="character-page" aria-labelledby="character-heading">
      <button className="text-button" type="button" onClick={onBack}>
        ← Back to the Party
      </button>
      <section className="character-identity">
        <Portrait position={slot.position} />
        <div>
          <p className="hero__kicker">Played by {character.playerName}</p>
          <h1 id="character-heading">{character.characterName}</h1>
          <p>
            Level {character.level} {character.primaryClass} · {character.subclass}
          </p>
          <p>{character.species} · {character.background}</p>
        </div>
      </section>
      <section className="ability-panel" aria-labelledby="ability-heading">
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">Character overview</p>
            <h2 id="ability-heading">Ability Scores</h2>
          </div>
        </div>
        <dl className="ability-score-grid">
          {abilityScoreKeys.map((key) => (
            <div key={key}>
              <dt>{abilityScoreLabels[key]}</dt>
              <dd>{character.abilityScores[key]}</dd>
            </div>
          ))}
        </dl>
      </section>
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
      if (isCurrent) setParty(nextParty);
    });
    void partyData.getParty().then((nextParty) => {
      if (isCurrent) setParty(nextParty);
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
      <CharacterPage slot={selectedSlot} onBack={() => setSelectedSlotId(null)} />
    );
  } else {
    authenticatedContent = (
      <main>
        <section className="hero" aria-labelledby="party-heading">
          <div className="hero__ornament" aria-hidden="true"><span /><b>✦</b><span /></div>
          <CompassMark />
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
            <p>{party ? `${party.slots.length} berths` : "Reading the ledger…"}</p>
          </div>

          <div className="party-grid" aria-live="polite">
            {party?.slots.map((slot) =>
              slot.character ? (
                <ClaimedSlot
                  key={slot.id}
                  slot={slot}
                  onSelect={() => setSelectedSlotId(slot.id)}
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
