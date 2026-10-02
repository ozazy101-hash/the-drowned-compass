export const featureKinds = ['class', 'species', 'background', 'feat'] as const;
export const storyKinds = ['appearance', 'personality', 'backstory', 'allies', 'notes'] as const;
export type FeatureKind = typeof featureKinds[number];
export type StoryKind = typeof storyKinds[number];
export type CharacterTextKind = FeatureKind | StoryKind;
export type CharacterTextEntry = {
  id: string;
  kind: CharacterTextKind;
  title: string;
  body: string;
  deleted: boolean;
  version: number;
};
export type CharacterTextDraft = Omit<CharacterTextEntry, 'version'>;
export const textKindLabels: Record<CharacterTextKind, string> = {
  class: 'Class', species: 'Species', background: 'Background', feat: 'Feat',
  appearance: 'Appearance', personality: 'Personality', backstory: 'Backstory', allies: 'Allies', notes: 'General notes',
};

export function validateCharacterText(entry: CharacterTextDraft) {
  const feature = (featureKinds as readonly string[]).includes(entry.kind);
  const story = (storyKinds as readonly string[]).includes(entry.kind);
  if ((!feature && !story) || typeof entry.title !== 'string' || typeof entry.body !== 'string'
    || typeof entry.deleted !== 'boolean' || entry.title.length > 160 || entry.body.length > 20000
    || (feature && (!/^feature\.[0-9a-f-]{36}$/.test(entry.id) || !entry.title.trim()))
    || (story && (entry.id !== `story.${entry.kind}` || entry.title !== '' || entry.deleted))) {
    throw new Error('Enter a feature name (up to 160 characters) and text up to 20,000 characters.');
  }
}

// Retain tombstones as well as live entries: delayed snapshots cannot resurrect removals.
export function mergeCharacterText(current: CharacterTextEntry[] = [], incoming: CharacterTextEntry[] = []) {
  const entries = new Map(incoming.map(entry => [entry.id, entry]));
  for (const entry of current) {
    if (entry.version > (entries.get(entry.id)?.version ?? -1)) entries.set(entry.id, entry);
  }
  return [...entries.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function setCharacterText(entries: CharacterTextEntry[], draft: CharacterTextDraft, expectedVersion: number) {
  validateCharacterText(draft);
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new Error('Invalid record version.');
  const current = entries.find(entry => entry.id === draft.id);
  if ((current?.version ?? 0) !== expectedVersion) return false;
  if (current && current.kind !== draft.kind) throw new Error('A record kind cannot change.');
  const next = { ...draft, version: expectedVersion + 1 };
  if (current) entries[entries.indexOf(current)] = next; else entries.push(next);
  return true;
}
