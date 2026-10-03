import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { rulesReferences, srdSource, type RulesReference } from '../../domain/rules-reference';
import './rules-tooltip.css';

// One public interaction for Conditions and later Spell Catalog references.
export function RulesTooltip({ reference, references = rulesReferences }: {
  reference: RulesReference; references?: Readonly<Record<string, RulesReference>>;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressFocus = useRef(false);
  const [trail, setTrail] = useState<RulesReference[]>([]);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const active = trail.at(-1);
  const cancel = () => { if (timer.current) clearTimeout(timer.current); };
  const open = () => {
    cancel();
    const rect = trigger.current!.getBoundingClientRect();
    setPosition({ top: Math.min(rect.bottom + 8, window.innerHeight * .35), left: Math.max(12, Math.min(rect.left, window.innerWidth - 372)) });
    setTrail(previous => previous.length ? previous : [reference]);
  };
  const close = (restore = false) => {
    cancel(); setTrail([]); setPinned(false);
    if (restore && document.activeElement !== trigger.current) { suppressFocus.current = true; trigger.current?.focus(); }
  };
  const leave = () => {
    cancel();
    timer.current = setTimeout(() => {
      if (!pinned && !panel.current?.contains(document.activeElement) && document.activeElement !== trigger.current) close();
    }, 180);
  };
  const back = () => {
    if (trail.length <= 1) { close(true); return; }
    const name = active!.name;
    setTrail(trail.slice(0, -1));
    requestAnimationFrame(() => {
      const target = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('[data-rule-term]') ?? []).find(b => b.dataset.ruleTerm === name);
      (target ?? panel.current?.querySelector<HTMLButtonElement>('button'))?.focus();
    });
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!active) return;
    const outside = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); back(); } };
    const reposition = () => close();
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', reposition);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('resize', reposition); };
  });
  const text = (paragraph: string) => {
    const names = Object.keys(references).filter(name => name !== active?.name).sort((a,b) => b.length-a.length);
    if (!names.length) return paragraph;
    const escaped = names.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'g');
    return paragraph.split(pattern).map((part, index) => references[part] && part !== active?.name ?
      <button key={index} type="button" className="rules-term" data-rule-term={part} onClick={() => {
        setPinned(true); setTrail([...trail, references[part]]);
        requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>('button')?.focus());
      }}>{part}</button> : part);
  };
  return <>
    <button ref={trigger} type="button" className="rules-trigger" aria-label={`${reference.name} rules`}
      aria-haspopup="dialog" aria-expanded={!!active} aria-controls={active ? id : undefined}
      onPointerEnter={e => { if (e.pointerType !== 'touch') open(); }} onPointerLeave={leave}
      onFocus={() => { if (suppressFocus.current) suppressFocus.current = false; else open(); }}
      onBlur={e => { if (!panel.current?.contains(e.relatedTarget)) close(); }}
      onKeyDown={e => { if (e.key === 'Tab' && !e.shiftKey && active) { e.preventDefault(); setPinned(true); panel.current?.querySelector<HTMLButtonElement>('button')?.focus(); } }}
      onClick={() => { open(); setPinned(true); requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>('button')?.focus()); }}>
      {reference.name}
    </button>
    {active && createPortal(<div ref={panel} id={id} role="dialog" aria-modal="false" aria-labelledby={`${id}-title`}
      className="rules-panel" style={position} onPointerEnter={cancel} onPointerLeave={leave}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget) && e.relatedTarget !== trigger.current) close(); }}
      onKeyDown={e => {
        if (e.key !== 'Tab') return;
        const buttons = Array.from(panel.current?.querySelectorAll<HTMLElement>('button, a') ?? []);
        if ((e.shiftKey && document.activeElement === buttons[0]) || (!e.shiftKey && document.activeElement === buttons.at(-1))) { e.preventDefault(); close(true); }
      }}>
      <div className="rules-panel__heading"><h3 id={`${id}-title`}>{active.name}</h3>
        <button type="button" onClick={back}>{trail.length > 1 ? 'Back to previous rule' : 'Close rules'}</button></div>
      {active.paragraphs.map((p,i) => <p key={`${active.name}-${i}`}>{text(p)}</p>)}
      <a href={srdSource} target="_blank" rel="noreferrer">SRD 5.2.1 source</a>
      <button type="button" onClick={() => close(true)}>Dismiss all rules</button>
    </div>, document.body)}
  </>;
}
