export type InventoryKind = 'equipment' | 'magic' | 'cp' | 'sp' | 'ep' | 'gp' | 'pp';
export type InventoryEntry = {
  id: string;
  kind: InventoryKind;
  title: string;
  body: string;
  rank: number;
  deleted: boolean;
  version: number;
};
export type InventoryDraft = Omit<InventoryEntry, 'version'>;
export function validateInventory(entry: InventoryDraft) {
  if (!Number.isSafeInteger(entry.rank) || entry.rank < 0 || entry.rank > 999999) throw new Error('Display order must be a whole number from 0 to 999999.');
  const item = entry.kind === 'equipment' || entry.kind === 'magic';
  const coin = ['cp','sp','ep','gp','pp'].includes(entry.kind);
  if (typeof entry.title !== 'string' || typeof entry.body !== 'string' || typeof entry.deleted !== 'boolean'
    || entry.title.length > 160 || entry.body.length > 20000
    || (item && (!/^item\.[0-9a-f-]{36}$/.test(entry.id) || !entry.title.trim()))
    || (coin && (entry.id !== `currency.${entry.kind}` || entry.title !== '' || entry.deleted || !/^(0|[1-9][0-9]{0,8})$/.test(entry.body)))
    || (!item && !coin)) throw new Error('Enter an item name and notes, or a whole currency amount from 0 to 999999999.');
}
// Retain tombstones as well as live entries: delayed snapshots cannot resurrect removals.
export function mergeInventory(current: InventoryEntry[] = [], incoming: InventoryEntry[] = []) {
  const entries = new Map(incoming.map(entry => [entry.id, entry]));
  for (const entry of current) {
    if (entry.version > (entries.get(entry.id)?.version ?? -1)) entries.set(entry.id, entry);
  }
  return [...entries.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function setInventory(entries: InventoryEntry[], draft: InventoryDraft, expectedVersion: number) {
  validateInventory(draft);
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new Error('Invalid record version.');
  const current = entries.find(entry => entry.id === draft.id);
  if ((current?.version ?? 0) !== expectedVersion) return false;
  if (current && current.kind !== draft.kind) throw new Error('A record kind cannot change.');
  const next = { ...draft, version: expectedVersion + 1 };
  if (current) entries[entries.indexOf(current)] = next; else entries.push(next);
  return true;
}

export function orderedInventoryItems(entries: InventoryEntry[]) {
  return entries.filter(entry => entry.kind === 'equipment' || entry.kind === 'magic')
    .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
}
