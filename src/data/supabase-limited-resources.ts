import type { SupabaseClient } from '@supabase/supabase-js';
import { validateResource, type LimitedResource, type ResourceWrite } from '../domain/limited-resources';
export type ResourceRow = {
  id: string; slot_id: string; name: string; current: number; maximum: number;
  recovery: LimitedResource['recovery']; position: number; important: boolean; version: number; deleted: boolean;
};
export function mapResource(row: ResourceRow): LimitedResource {
  return { id: row.id, name: row.name, current: row.current, maximum: row.maximum, recovery: row.recovery,
    position: row.position, important: row.important, version: row.version, deleted: row.deleted };
}
export async function readResources(client: SupabaseClient, slotId?: string) {
  let query = client.from('limited_resources').select('id,slot_id,name,current,maximum,recovery,position,important,version,deleted');
  if (slotId) query = query.eq('slot_id', slotId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ResourceRow[];
}
export async function writeSupabaseResource(client: SupabaseClient, slotId: string, resource: ResourceWrite, expectedVersion: number) {
  validateResource(resource);
  const { data, error } = await client.rpc('write_limited_resource', {
    target_slot_id: slotId, target_resource_id: resource.id, next_name: resource.name.trim(),
    next_current: resource.current, next_maximum: resource.maximum, next_recovery: resource.recovery,
    next_position: resource.position, next_important: resource.important, next_deleted: resource.deleted,
    expected_version: expectedVersion,
  });
  if (error) throw error;
  return { ok: data === true, resources: (await readResources(client, slotId)).map(mapResource) };
}
