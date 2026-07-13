import { KmsSnapshot } from './kms';
import { seedData } from './seed';

const STORAGE_KEY = 'kms.snapshot.v1';

export interface SnapshotStorage {
  load(): KmsSnapshot;
  save(snapshot: KmsSnapshot): void;
  clear(): void;
}

export class BrowserSnapshotStorage implements SnapshotStorage {
  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = window.localStorage) {}
  load(): KmsSnapshot {
    const raw = this.storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as KmsSnapshot : structuredClone(seedData);
  }
  save(snapshot: KmsSnapshot) { this.storage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); }
  clear() { this.storage.removeItem(STORAGE_KEY); }
}

export class MemorySnapshotStorage implements SnapshotStorage {
  private snapshot = structuredClone(seedData);
  load() { return structuredClone(this.snapshot); }
  save(snapshot: KmsSnapshot) { this.snapshot = structuredClone(snapshot); }
  clear() { this.snapshot = structuredClone(seedData); }
}
