import type { KeyValueStore } from '../app/storage';
import type { ProgressState } from '../domain/types';

const KEY = 'progress:v1';

type ProgressData = Record<string, ProgressState>;

export function createProgressRepository(store: KeyValueStore) {
  async function readAll(): Promise<ProgressData> {
    return store.get<ProgressData>(KEY, {});
  }

  return {
    async getProgress(libraryId: string): Promise<ProgressState | null> {
      const all = await readAll();
      return all[libraryId] ?? null;
    },
    async saveProgress(libraryId: string, progress: ProgressState): Promise<void> {
      const all = await readAll();
      all[libraryId] = progress;
      await store.set(KEY, all);
    },
  };
}
