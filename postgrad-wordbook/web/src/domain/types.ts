import type { FAMILIARITY } from './constants';

export type Familiarity = (typeof FAMILIARITY)[keyof typeof FAMILIARITY];

export type WordEntry = {
  id: string;
  word: string;
  initial: string;
  phonetics?: { uk?: string; us?: string };
  audio?: { uk?: string; us?: string };
  senses: Array<{
    partOfSpeech: string;
    definitions: string[];
  }>;
  collocations?: string[];
  morphology?: string[];
  relations?: {
    synonyms?: string[];
    antonyms?: string[];
    confusables?: string[];
  };
  examExamples?: Array<{
    text: string;
    translation: string;
    year?: number;
    questionType?: string;
    sourceId?: string;
  }>;
};

export type SearchIndexEntry = {
  id: string;
  word: string;
  initial: string;
  senseKeywords: string[];
  partOfSpeech: string[];
};

export type LibraryManifest = {
  libraryId: string;
  title: string;
  version: string;
  wordCount: number;
  wordIds: string[];
  shards: Array<{ path: string; sha256: string; bytes: number }>;
  searchIndex: { path: string; sha256: string; bytes: number };
  order: { path: string; sha256: string; bytes: number };
};

export type WordState = {
  wordId: string;
  familiarity?: Familiarity;
  updatedAt: number;
};

export type ProgressState = {
  libraryId: string;
  anchorWordId: string;
  scrollOffset: number;
  updatedAt: number;
};
