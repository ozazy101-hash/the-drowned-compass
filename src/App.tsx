import { type FormEvent, useEffect, useState } from "react";
import type {
  AccessRole,
  Party,
  PartyData,
  PartySession,
} from "./domain/party";

type AppProps = {
  partyData: PartyData;
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

function UnclaimedSlot({ position }: { position: number }) {
  return (
    <article className="character-slot" aria-label="Unclaimed character slot">
      <div className="character-slot__portrait" aria-hidden="true">
        <span className="character-slot__number">
          {String(position).padStart(2, "0")}
        </span>
        <span className="character-slot__silhouette" />
      </div>
      <div className="character-slot__body">
        <p className="character-slot__eyebrow">Character slot {position}</p>
        <h2>Unclaimed</h2>
        <p>A place waits at the table.</p>
      </div>
      <span className="character-slot__marker" aria-hidden="true">
        +
      </span>
    </article>
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
        <div className="hero__ornament" aria-hidden="true">
          <span />
          <b>✦</b>
          <span />
        </div>
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
                <span>
                  <strong>Player</strong>
                  <small>Open the shared Character Records</small>
                </span>
              </button>
              <button
                type="button"
                className={
                  role === "dungeon-master" ? "role-option is-selected" : "role-option"
                }
                aria-pressed={role === "dungeon-master"}
                onClick={() => setRole("dungeon-master")}
              >
                <span className="role-option__icon" aria-hidden="true">♜</span>
                <span>
                  <strong>Dungeon Master</strong>
                  <small>Survey the whole Party</small>
                </span>
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

          {error && (
            <p className="login-form__error" role="alert">
              {error}
            </p>
          )}

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

  useEffect(() => {
    let isCurrent = true;

    partyData.getSession().then((nextSession) => {
      if (isCurrent) setSession(nextSession);
    });

    return () => {
      isCurrent = false;
    };
  }, [partyData]);

  useEffect(() => {
    if (!session) {
      setParty(null);
      return;
    }

    let isCurrent = true;
    partyData.getParty().then((nextParty) => {
      if (isCurrent) setParty(nextParty);
    });

    return () => {
      isCurrent = false;
    };
  }, [partyData, session]);

  if (session === undefined) {
    return <div className="session-loading" aria-label="Opening The Drowned Compass" />;
  }

  async function handleSignOut() {
    await partyData.signOut();
    setSession(null);
  }

  return (
    <div className="app-shell">
      <div className="fog fog--left" aria-hidden="true" />
      <div className="fog fog--right" aria-hidden="true" />

      <header className="site-header">
        <a className="brand" href="./" aria-label="The Drowned Compass home">
          <span className="brand__sigil" aria-hidden="true">
            ✦
          </span>
          <span>The Drowned Compass</span>
        </a>
        {session ? (
          <div className="session-controls">
            <span>
              {session.role === "dungeon-master" ? "Dungeon Master" : "Player"}
            </span>
            <button type="button" onClick={handleSignOut}>Sign out</button>
          </div>
        ) : (
          <p className="site-header__label">Party companion</p>
        )}
      </header>

      {session ? <main>
        <section className="hero" aria-labelledby="party-heading">
          <div className="hero__ornament" aria-hidden="true">
            <span />
            <b>✦</b>
            <span />
          </div>
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
            {party?.slots.map((slot) => (
              <UnclaimedSlot key={slot.id} position={slot.position} />
            ))}
          </div>
        </section>
      </main> : <LoginScreen partyData={partyData} onSignedIn={setSession} />}

      {session && <footer>
        <span>One party</span>
        <span className="footer__mark" aria-hidden="true">
          ◈
        </span>
        <span>Six shared character records</span>
      </footer>}
    </div>
  );
}
