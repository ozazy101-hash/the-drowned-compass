import type { AccessRole, PartySession, Party } from '../domain/party';

// Web Locks coordinate commands; IndexedDB supplies the committed snapshot across
// renderer processes. A localStorage cache is not a transactional read source.
let connection: Promise<IDBDatabase> | undefined;
function database() {
  return connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('drowned-compass-party', 3);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('party')) request.result.createObjectStore('party');
      if (!request.result.objectStoreNames.contains('content')) request.result.createObjectStore('content', { keyPath: 'id' });
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

// Content uses its own store: blob writes never alter Character Records. Session
// authorization and reads/writes share one transaction, including sign-out races.
export async function localContentTransaction<T>(token: string | null, write: boolean, operation: (store: IDBObjectStore, complete: (value: T) => void, role: AccessRole) => void): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['sessions', 'content'], write ? 'readwrite' : 'readonly');
    let result: T; let failure: Error | undefined;
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(failure ?? tx.error ?? new Error(write ? 'The Library could not be saved. Please retry.' : 'This Handout is unavailable or has changed. Refresh your Library.'));
    tx.onerror = () => reject(tx.error);
    const auth = tx.objectStore('sessions').get(token ?? '');
    auth.onsuccess = () => {
      if (!auth.result || (write && auth.result.role !== 'dungeon-master')) { failure = new Error('Dungeon Master access is required. Sign in again to open your Library.'); tx.abort(); return; }
      try { operation(tx.objectStore('content'), value => { result = value; }, auth.result.role); }
      catch (error) { failure = error instanceof Error ? error : new Error('The Library request failed.'); tx.abort(); }
    };
  });
}
