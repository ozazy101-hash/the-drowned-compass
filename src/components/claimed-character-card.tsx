import { initialSurvival, survivalState } from "../domain/survival";
import type { ReactNode } from "react";
import { calculateDerivedValues, type DerivedValue } from "../domain/derived-values";
import { abilityScoreKeys, type CharacterSlot } from "../domain/party";
import "./party-dashboard.css";

const abilityLabels = {
  strength: "Strength", dexterity: "Dexterity", constitution: "Constitution",
  intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma",
};

function SummaryValue({ label, result, signed = false }: {
  label: string; result: DerivedValue; signed?: boolean;
}) {
  const formatted = result.value === null ? "Unknown" :
    signed && result.value >= 0 ? `+${result.value}` : String(result.value);
  return (
    <span className="party-card__value" aria-label={`${label}: ${formatted}${result.overridden ? " (override)" : ""}`}>
      {formatted}
      {result.overridden && <span className="party-card__override" aria-hidden="true">*</span>}
    </span>
  );
}

// Additional play summaries belong here as read-only spans. Interactive controls
// stay on the Character Page so the whole card remains one keyboard target.
export function ClaimedCharacterCard({ slot, onSelect, playSummary }: {
  slot: CharacterSlot; onSelect: () => void; playSummary?: ReactNode;
}) {
  const character = slot.character!;
  const survival = character.survival ?? initialSurvival();
  const derived = calculateDerivedValues(
    { ...character, totalLevel: character.level }, character.derivedOverrides,
  );
  const summaryId = `party-summary-${slot.id}`;
  const hasSummaryOverride = abilityScoreKeys.some((key) => derived[`ability.${key}`].overridden)
    || derived.passivePerception.overridden || derived.spellSaveDC.overridden;

  return (
    <article className="character-slot character-slot--claimed party-card"
      aria-label={`${character.characterName}, played by ${character.playerName}`}>
      <button className="party-card__action" type="button" onClick={onSelect}
        aria-label={`Open ${character.characterName} Character Page`} aria-describedby={summaryId}>
        <span className="party-card__identity">
          <span className="party-card__compass" aria-hidden="true">✦</span>
          <span className="party-card__names">
            <span className="character-slot__eyebrow">Played by {character.playerName}</span>
            <strong>{character.characterName}</strong>
            <span className="party-card__class">Level {character.level} {character.primaryClass} · {character.subclass}</span>
          </span>
          <span className="party-card__position" aria-hidden="true">{String(slot.position).padStart(2, "0")}</span>
        </span>
        <span className="party-card__summary" id={summaryId}>
          <span className="party-card__vitals">
            <span className="party-card__health">
              <span className="party-card__label">Hit Points</span>
              <strong>{survival.current ?? '?'} / {character.maxHitPoints}</strong>
              {survival.current === null && <span className="party-card__unknown">Current HP unknown</span>}
              {survival.temporary > 0 && <span>Temporary HP: {survival.temporary}</span>}
              {survivalState(survival) && <span>{survivalState(survival)}</span>}
              {(survival.current === 0 || survival.successes > 0 || survival.failures > 0) && <span>Death saves: {survival.successes} successes, {survival.failures} failures</span>}
              {survival.inspiration && <span>Heroic Inspiration</span>}
            </span>
            <span className="party-card__defence">
              <span className="party-card__label">Armor Class</span>
              <strong>{character.armorClass}</strong>
            </span>
          </span>
          <span className="party-card__abilities">
            {abilityScoreKeys.map((key) => (
              <span key={key} className="party-card__ability">
                <span className="party-card__label" title={abilityLabels[key]}>{key.slice(0, 3).toUpperCase()}</span>
                <SummaryValue label={`${abilityLabels[key]} modifier`} result={derived[`ability.${key}`]} signed />
              </span>
            ))}
          </span>
          <span className="party-card__senses">
            <span><span className="party-card__label">Passive Perception</span><SummaryValue label="Passive Perception" result={derived.passivePerception} /></span>
            {derived.spellSaveDC.value !== null && (
              <span><span className="party-card__label">Spell save DC</span><SummaryValue label="Spell save DC" result={derived.spellSaveDC} /></span>
            )}
          </span>
          {playSummary && <span className="party-card__play-summary">{playSummary}</span>}
          {hasSummaryOverride && <span className="party-card__override-note">* Override</span>}
        </span>
        <span className="party-card__open" aria-hidden="true">Open Character Page <span>→</span></span>
      </button>
    </article>
  );
}
