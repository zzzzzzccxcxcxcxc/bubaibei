import type { KeyValueStore } from '../app/storage';
import { FAMILIARITY } from '../domain/constants';
import type { Familiarity, WordState } from '../domain/types';

const KEY = 'learning:v1';

type LearningData = Record<string, WordState>;

export function createLearningRepository(store: KeyValueStore) {
  async function readAll(): Promise<LearningData> {
    return store.get<LearningData>(KEY, {});
  }

  return {
    async getWordState(wordId: string): Promise<WordState> {
      const all = await readAll();
      return all[wordId] ?? { wordId, updatedAt: 0 };
    },
    async setFamiliarity(wordId: string, familiarity: Familiarity, now: number): Promise<void> {
      if (!Object.values(FAMILIARITY).includes(familiarity)) {
        throw new Error(`Invalid familiarity: ${familiarity}`);
      }
      const all = await readAll();
      all[wordId] = { wordId, familiarity, updatedAt: now };
      await store.set(KEY, all);
    },
    async getCounts(wordIds: string[]): Promise<Record<Familiarity, number>> {
      const all = await readAll();
      const counts: Record<Familiarity, number> = { familiar: 0, review: 0, unknown: 0 };
      for (const wordId of wordIds) {
        const familiarity = all[wordId]?.familiarity;
        if (familiarity) counts[familiarity] += 1;
      }
      return counts;
    },
    async getAll(): Promise<LearningData> {
      return readAll();
    },
  };
}
