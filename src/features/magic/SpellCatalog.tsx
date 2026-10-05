import { useState } from "react";
import {
  findSpell,
  searchSpells,
  spellClasses,
  spellSchools,
  type SpellFilters,
  type CatalogSpell,
} from "../../domain/spell-catalog";
import { rulesReferences } from "../../domain/rules-reference";
import { RulesTooltip } from "../rules/RulesTooltip";
import "./spell-catalog.css";
export function RulesText({ text }: { text: string }) {
  const names = Object.keys(rulesReferences).sort(
    (a, b) => b.length - a.length,
  );
  const pattern = new RegExp(`\\b(${names.join("|")})\\b`, "g");
  return (
    <>
      {text
        .split(pattern)
        .map((part, i) =>
          rulesReferences[part] ? (
            <RulesTooltip key={i} reference={rulesReferences[part]} />
          ) : (
            part
          ),
        )}
    </>
  );
}
export function SpellCatalog({ onAdd, characterClasses = [], busy = false, activeIds = [] }: {
  onAdd?: (id: string) => void; characterClasses?: string[]; busy?: boolean; activeIds?: string[];
}) {
  const [filters, setFilters] = useState<SpellFilters>({});
  const [selected, setSelected] = useState<string>();
  const spells = searchSpells(filters),
    spell = selected ? findSpell(selected) : undefined;
  const select = (key: "class" | "school", options: readonly string[]) => (
    <label>
      {key === "class" ? "Spell class" : "Spell school"}
      <select
        aria-label={key === "class" ? "Spell class" : "Spell school"}
        value={filters[key] ?? ""}
        onChange={(e) =>
          setFilters({ ...filters, [key]: e.target.value || undefined })
        }
      >
        <option value="">All</option>
        {options.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
  const flag = (key: "ritual" | "concentration") => (
    <label>
      {key === "ritual" ? "Ritual" : "Concentration"}
      <select
        aria-label={key === "ritual" ? "Ritual" : "Concentration"}
        value={filters[key] === undefined ? "" : String(filters[key])}
        onChange={(e) =>
          setFilters({
            ...filters,
            [key]:
              e.target.value === "" ? undefined : e.target.value === "true",
          })
        }
      >
        <option value="">All</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </label>
  );
  return (
    <section
      className="overview-section spell-catalog"
      aria-labelledby="spell-catalog-heading"
    >
      <div className="section-heading">
        <div>
          <p className="section-heading__eyebrow">Magic · SRD 5.2.1</p>
          <h2 id="spell-catalog-heading">Spell Catalog</h2>
        </div>
        <p>339 spells · available offline after loading</p>
      </div>
      <div className="spell-filters">
        <label>
          Search spells by name
          <input
            type="search"
            value={filters.name ?? ""}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          />
        </label>
        <label>
          Spell level
          <select
            aria-label="Spell level"
            value={filters.level ?? ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                level:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          >
            <option value="">All</option>
            {Array.from({ length: 10 }, (_, n) => (
              <option key={n} value={n}>
                {n === 0 ? "Cantrip" : `Level ${n}`}
              </option>
            ))}
          </select>
        </label>
        {select("class", spellClasses)}
        {select("school", spellSchools)}
        {flag("ritual")}
        {flag("concentration")}
        <button type="button" onClick={() => setFilters({})}>
          Clear spell filters
        </button>
      </div>
      <p role="status">{spells.length} matching spells</p>
      <div className="spell-browser">
        <ul className="spell-results" aria-label="Matching spells">
          {spells.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={selected === s.id}
                onClick={() => setSelected(s.id)}
              >
                {s.name}
                <span>
                  {s.level === 0 ? "Cantrip" : `Level ${s.level}`} · {s.school}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {spell ? (
          <SpellDetails spell={spell} onAdd={onAdd} characterClasses={characterClasses} busy={busy} activeIds={activeIds} />
        ) : (
          <p>Select a spell to inspect its rules.</p>
        )}
      </div>
      {!spells.length && <p>No spells match. Clear or adjust the filters.</p>}
    </section>
  );
}

export function SpellDetails({ spell, onAdd, characterClasses = [], busy = false, activeIds = [] }: {
  spell: CatalogSpell; onAdd?: (id: string) => void; characterClasses?: string[]; busy?: boolean; activeIds?: string[];
}) {
  return (
          <article
            className="spell-detail"
            aria-label={`${spell.name} spell details`}
          >
            <h3>{spell.name}</h3>
            {onAdd && <>
              {!!characterClasses.length && !characterClasses.some(name => spell.classes.some(c => c.toLowerCase() === name.toLowerCase())) && <p role="note">This spell is unusual for your Character’s classes ({characterClasses.join(', ')}). You can still add it for a feature, item, or manual choice.</p>}
              <button type="button" disabled={busy || activeIds.includes(spell.id)} onClick={() => onAdd(spell.id)}>{activeIds.includes(spell.id) ? 'Already added to Character' : 'Add to Character Spells'}</button>
            </>}
            <p>
              {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`} ·{" "}
              {spell.school} · {spell.classes.join(", ")}
            </p>
            <dl>
              {[
                ["Casting time", spell.castingTime],
                ["Range", spell.range],
                ["Components", spell.components],
                ["Material component", spell.material ?? "None"],
                ["Duration", spell.duration],
                ["Concentration", spell.concentration ? "Yes" : "No"],
                ["Ritual", spell.ritual ? "Yes" : "No"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    <RulesText text={value} />
                  </dd>
                </div>
              ))}
            </dl>
            <h4>Description</h4>
            <p className="spell-description">
              <RulesText text={spell.description} />
            </p>
            {spell.tables.map((table) => (
              <div className="spell-table-wrap" key={table.caption}>
                <table>
                  <caption>{table.caption}</caption>
                  <thead>
                    <tr>
                      {table.headers.map((header) => (
                        <th scope="col" key={header}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) =>
                          j === 0 ? (
                            <th scope="row" key={j}>
                              {cell}
                            </th>
                          ) : (
                            <td key={j}>{cell}</td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {spell.statBlock && (
              <>
                <h4>Summoned creature rules</h4>
                <p className="spell-stat-block">
                  <RulesText text={spell.statBlock} />
                </p>
              </>
            )}
            <h4>Higher-level effect</h4>
            <p>
              <RulesText
                text={spell.higherLevel ?? "No higher-level effect specified."}
              />
            </p>
            <a
              href={`https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=${spell.source.page}`}
              target="_blank"
              rel="noreferrer"
            >
              SRD 5.2.1 · page {spell.source.page}
            </a>
          </article>
  );
}
