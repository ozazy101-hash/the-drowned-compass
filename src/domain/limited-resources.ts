export const recoveryTimings = ['Short Rest', 'Long Rest', 'Dawn', 'Manual'] as const;
export type RecoveryTiming = typeof recoveryTimings[number];
export type LimitedResource = {
  id: string;
  name: string;
  current: number;
  maximum: number;
  recovery: RecoveryTiming;
  position: number;
  important: boolean;
  version: number;
  deleted: boolean;
};
export type ResourceWrite = Omit<LimitedResource, 'version'>;
export type ResourceWriteResult = { ok: boolean; resources: LimitedResource[] };

export function visibleResources(resources: LimitedResource[] = []) {
  return resources.filter(resource => !resource.deleted).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}
export function importantResource(resources: LimitedResource[] = []) {
  return visibleResources(resources).find(resource => resource.important);
}
export function mergeResources(current: LimitedResource[] = [], incoming: LimitedResource[] = []) {
  const records = new Map(current.map(resource => [resource.id, resource]));
  for (const resource of incoming) {
    if (resource.version >= (records.get(resource.id)?.version ?? -1)) records.set(resource.id, resource);
  }
  return [...records.values()];
}
export function validateResource(resource: ResourceWrite) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resource.id) ||
      !resource.name.trim() || resource.name.trim().length > 100 ||
      !Number.isInteger(resource.current) || !Number.isInteger(resource.maximum) ||
      resource.maximum < 0 || resource.maximum > 9999 || resource.current < 0 || resource.current > resource.maximum ||
      !recoveryTimings.includes(resource.recovery) || !Number.isFinite(resource.position) || Math.abs(resource.position) > 1e12 ||
      typeof resource.important !== 'boolean' || typeof resource.deleted !== 'boolean') {
    throw new Error('Enter a name and whole-number uses from 0 to maximum (maximum 0–9999).');
  }
}
// Shared by the local adapter and the development test transport; each write replaces only its own record.
export function writeResource(resources: LimitedResource[], write: ResourceWrite, expectedVersion: number): ResourceWriteResult {
  validateResource(write);
  const existing = resources.find(resource => resource.id === write.id);
  if ((existing?.version ?? 0) !== expectedVersion || existing?.deleted || (!existing && write.deleted)) {
    return { ok: false, resources };
  }
  const next = resources.map(resource => {
    if (write.important && !write.deleted && resource.important && resource.id !== write.id) {
      return { ...resource, important: false, version: resource.version + 1 };
    }
    return resource;
  }).filter(resource => resource.id !== write.id);
  next.push({ ...write, name: write.name.trim(), important: write.important && !write.deleted, version: expectedVersion + 1 });
  return { ok: true, resources: next };
}
