import type { Party } from '../domain/party';

// Web Locks coordinate commands; IndexedDB supplies the committed snapshot across
// renderer processes. A localStorage cache is not a transactional read source.
let connection: Promise<IDBDatabase> | undefined;
function database() {
  return connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('drowned-compass-party', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('party');
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
