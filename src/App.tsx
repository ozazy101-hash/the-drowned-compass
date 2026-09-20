import { useEffect, useState } from "react";
import type { Party, PartyData } from "./domain/party";

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

export function App({ partyData }: AppProps) {
  const [party, setParty] = useState<Party | null>(null);

  useEffect(() => {
    let isCurrent = true;

    partyData.getParty().then((nextParty) => {
      if (isCurrent) setParty(nextParty);
    });

    return () => {
      isCurrent = false;
    };
  }, [partyData]);

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
        <p className="site-header__label">Party companion</p>
      </header>

      <main>
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
      </main>

      <footer>
        <span>One party</span>
        <span className="footer__mark" aria-hidden="true">
          ◈
        </span>
        <span>Six shared character records</span>
      </footer>
    </div>
  );
}
