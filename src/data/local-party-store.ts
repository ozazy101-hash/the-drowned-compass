import type { AccessRole, PartySession, Party } from '../domain/party';

// Web Locks coordinate commands; IndexedDB supplies the committed snapshot across
// renderer processes. A localStorage cache is not a transactional read source.
let connection: Promise<IDBDatabase> | undefined;
function database() {
  return connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('drowned-compass-party', 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('party')) request.result.createObjectStore('party');
      if (!request.result.objectStoreNames.contains('sessions')) request.result.createObjectStore('sessions');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('The local Party database is blocked.'));
  });
}

export async function readLocalParty(initial: () => Party): Promise<Party> {
  const db = await database();
  return new Promise((resolve, reject) => {
    // Initial import is atomic too: only one tab chooses the legacy snapshot.
    const transaction = db.transaction('party', 'readwrite');
    const store = transaction.objectStore('party');
    const request = store.get('current');
    let party: Party;
    request.onsuccess = () => {
      party = request.result ?? initial();
      if (request.result === undefined) store.put(party, 'current');
    };
    transaction.oncomplete = () => resolve(party);
    transaction.onabort = () => reject(transaction.error ?? new Error('The local Party could not be loaded.'));
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function writeLocalParty(party: Party): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('party', 'readwrite');
    transaction.objectStore('party').put(party, 'current');
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('The local Party could not be saved.'));
    transaction.onerror = () => reject(transaction.error);
  });
}

// Prototype authority registry: role is bound to a password-issued opaque token,
// not the editable legacy display-role string. Local browser data remains local.
export async function writeLocalSession(token: string, role: AccessRole): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => { const tx = db.transaction('sessions', 'readwrite'); tx.objectStore('sessions').put({ role }, token); tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); tx.onerror = () => reject(tx.error); });
}
export async function readLocalSession(token: string | null): Promise<PartySession | null> {
  if (!token) return null; const db = await database();
  return new Promise((resolve, reject) => { const tx = db.transaction('sessions', 'readonly'), request = tx.objectStore('sessions').get(token); tx.oncomplete = () => resolve(request.result ?? null); tx.onabort = () => reject(tx.error); tx.onerror = () => reject(tx.error); });
}
export async function removeLocalSession(token: string | null): Promise<void> {
  if (!token) return; const db = await database();
  return new Promise((resolve, reject) => { const tx = db.transaction('sessions', 'readwrite'); tx.objectStore('sessions').delete(token); tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); tx.onerror = () => reject(tx.error); });
}
