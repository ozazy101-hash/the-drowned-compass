import { useState } from 'react';
import { combatClasses, searchCombatCatalog, type CombatCatalogEntry, type CombatCatalogFilters } from '../../domain/combat-catalog';
import { srdSource } from '../../domain/rules-reference';
import '../magic/spell-catalog.css';
import './combat-catalog.css';

export function CombatCatalog({ onChoose, disabled }: { onChoose: (entry: CombatCatalogEntry) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<CombatCatalogFilters>({});
  const [selected, setSelected] = useState<string>();
  const entries = searchCombatCatalog(filters);
  const entry = entries.find(e => e.id === selected);
  return <div className="combat-catalog">
    <button type="button" className="secondary-button" aria-expanded={open} aria-controls="combat-catalog-browser" onClick={() => setOpen(!open)}>{open ? 'Close Combat Catalog' : 'Browse Combat Catalog'}</button>
    {open && <section id="combat-catalog-browser" aria-labelledby="combat-catalog-heading">
      <div className="section-heading"><div><p className="section-heading__eyebrow">Combat · SRD 5.2.1</p><h3 id="combat-catalog-heading">Combat Catalog</h3></div><p>38 weapons · 41 selected class abilities</p></div>
      <p>Browse weapons and class abilities, then review an editable draft before saving. Class and level filters are guides; choose what fits your character. Custom attacks and actions remain available below.</p>
      <div className="spell-filters">
        <label>Search combat entries<input type="search" value={filters.name ?? ''} onChange={e => setFilters({ ...filters, name: e.target.value })} /></label>
        <label>Combat entry type<select aria-label="Combat entry type" value={filters.kind ?? ''} onChange={e => setFilters({ ...filters, kind: e.target.value ? e.target.value as CombatCatalogEntry['kind'] : undefined })}><option value="">All</option><option value="weapon">Weapons</option><option value="ability">Class abilities</option></select></label>
        <label>Combat class<select aria-label="Combat class" value={filters.class ?? ''} onChange={e => setFilters({ ...filters, class: e.target.value || undefined })}><option value="">All</option>{combatClasses.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Available by class level<select aria-label="Available by class level" value={filters.maxLevel ?? ''} onChange={e => setFilters({ ...filters, maxLevel: e.target.value ? Number(e.target.value) : undefined })}><option value="">All levels</option>{Array.from({ length: 20 }, (_, i) => <option key={i + 1} value={i + 1}>Level {i + 1}</option>)}</select></label>
        <button type="button" className="secondary-button" onClick={() => setFilters({})}>Clear combat filters</button>
      </div>
      <p role="status">{entries.length} matching combat entries</p>
      <div className="spell-browser">
        <ul className="spell-results" aria-label="Matching combat entries">{entries.map(e => <li key={e.id}><button type="button" aria-pressed={e.id === selected} onClick={() => setSelected(e.id)}>{e.name}<span>{e.kind === 'weapon' ? `${e.weaponGroup} · ${e.damage} ${e.damageType}` : `${e.classes.join(', ')} level ${e.level} · ${e.use}`}</span></button></li>)}</ul>
        {entry ? <article className="spell-detail" aria-label={`${entry.name} combat details`}>
          <h4>{entry.name}</h4>
          <p>{entry.kind === 'weapon' ? entry.weaponGroup : `${entry.classes.join(', ')} · Level ${entry.level} · ${entry.use}`}</p>
          {entry.kind === 'weapon' && <dl>{[['Base damage', `${entry.damage} ${entry.damageType}`], ['Range', entry.range], ['Properties', entry.properties], ['Mastery', entry.mastery]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
          <h5>Rules summary</h5><p>{entry.summary}</p>
          {entry.kind === 'weapon' && <p><a href={`${srdSource}#page=89`} target="_blank" rel="noreferrer">Weapon property rules · page 89</a> · <a href={`${srdSource}#page=90`} target="_blank" rel="noreferrer">Mastery rules · page 90</a></p>}
          <p><a href={`${srdSource}#page=${entry.sourcePage}`} target="_blank" rel="noreferrer">Full SRD 5.2.1 rules · page {entry.sourcePage}</a></p>
          <p>{entry.kind === 'weapon' ? 'The draft starts with base weapon dice. Review total damage and enter your attack bonus.' : 'This adds an Action reference to your Combat notes. Apply its conditions and effects during play.'}</p>
          <button type="button" className="secondary-button" disabled={disabled} onClick={() => { onChoose(entry); setOpen(false); }}>Use {entry.name} template</button>
        </article> : <p>{entries.length ? 'Select an entry to inspect its rules.' : 'No combat entries match. Clear or adjust the filters.'}</p>}
      </div>
      {disabled && <p role="status">Save or cancel your new Combat draft before adding another template.</p>}
    </section>}
  </div>;
}
