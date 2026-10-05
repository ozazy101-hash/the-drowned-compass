import { featuredAttackSummaries, type CombatEntries } from '../domain/combat-entries';
const icons = { melee: '⚔', ranged: '➶', other: '◇' };
const labels = { melee: 'Melee', ranged: 'Ranged', other: 'Other' };
export function FeaturedAttackSummary({ state }: { state?: CombatEntries }) {
  const attacks = featuredAttackSummaries(state);
  return attacks.length > 0 && <span className="featured-attacks"><span className="party-card__label">Featured attacks</span>{attacks.map(attack => <span key={attack.id} className="featured-attack"><span aria-hidden="true" className="featured-attack__icon">{icons[attack.category]}</span><span><span className="featured-attack__category">{labels[attack.category]}: </span>{attack.summary}</span></span>)}</span>;
}
