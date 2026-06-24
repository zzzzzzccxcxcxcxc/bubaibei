# 2027 考研英语词书 PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-hosted PWA version of the postgraduate English wordbook so it can run on iPhone Safari and Android Chrome/Edge without WeChat mini program备案、AppID、云开发或体验版上传.

**Architecture:** Create an independent `postgrad-wordbook/web/` Vite + React + TypeScript app that consumes the existing reviewed `content/dist` packs as static assets. The PWA stores imported libraries, learning states, reading progress, settings, and quiz results in browser storage, while a service worker caches the app shell and imported content for offline use.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, IndexedDB, localStorage, Service Worker, Web App Manifest, existing Node content build scripts.

---

## 0. Current context

- Worktree root: `C:\Users\14215\Documents\1\.worktrees\postgrad-wordbook`
- App root: `C:\Users\14215\Documents\1\.worktrees\postgrad-wordbook\postgrad-wordbook`
- Existing mini program code remains in `postgrad-wordbook/miniprogram/` and must not be rewritten for this PWA.
- Existing reviewed content and audio are produced under `postgrad-wordbook/content/dist/`.
- PWA source will live under `postgrad-wordbook/web/`.
- PWA design spec: `docs/superpowers/specs/2026-06-24-postgraduate-wordbook-pwa-design.md`

## 1. File structure

Create this structure:

```text
postgrad-wordbook/
├─ web/
│  ├─ index.html
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  ├─ vite.config.ts
│  ├─ public/
│  │  ├─ manifest.webmanifest
│  │  ├─ sw.js
│  │  ├─ icons/
│  │  │  ├─ icon.svg
│  │  │  └─ apple-touch-icon.svg
│  │  └─ content/
│  ├─ src/
│  │  ├─ main.tsx
│  │  ├─ app/App.tsx
│  │  ├─ app/routes.ts
│  │  ├─ app/storage.ts
│  │  ├─ components/WordEntry/WordEntry.tsx
│  │  ├─ components/WordEntry/WordEntry.css
│  │  ├─ domain/constants.ts
│  │  ├─ domain/search.ts
│  │  ├─ domain/quiz.ts
│  │  ├─ domain/types.ts
│  │  ├─ repositories/db.ts
│  │  ├─ repositories/libraryRepository.ts
│  │  ├─ repositories/learningRepository.ts
│  │  ├─ repositories/progressRepository.ts
│  │  ├─ services/audioService.ts
│  │  ├─ services/contentService.ts
│  │  ├─ services/readerService.ts
│  │  ├─ pages/HomePage.tsx
│  │  ├─ pages/LibraryPage.tsx
│  │  ├─ pages/ReaderPage.tsx
│  │  ├─ pages/ReviewPage.tsx
│  │  ├─ pages/QuizPage.tsx
│  │  ├─ pages/SettingsPage.tsx
│  │  └─ styles/global.css
│  └─ tests/
│     ├─ setup.ts
│     ├─ fixtures.ts
│     ├─ search.test.ts
│     ├─ quiz.test.ts
│     ├─ repositories.test.ts
│     ├─ contentService.test.ts
│     ├─ readerService.test.ts
│     └─ wordEntry.test.tsx
└─ scripts/
   └─ prepare-web-content.mjs
```

Modify:

- `postgrad-wordbook/package.json`
- `postgrad-wordbook/README.md`
- `postgrad-wordbook/docs/device-acceptance.md`

## 2. Stable browser domain types

Use these TypeScript names throughout the plan:

```ts
export const FAMILIARITY = {
  FAMILIAR: 'familiar',
  REVIEW: 'review',
  UNKNOWN: 'unknown',
} as const;

export type Familiarity = typeof FAMILIARITY[keyof typeof FAMILIARITY];

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
```

---

### Task 1: Scaffold the PWA app and test baseline

**Files:**
- Create: `postgrad-wordbook/web/package.json`
- Create: `postgrad-wordbook/web/index.html`
- Create: `postgrad-wordbook/web/tsconfig.json`
- Create: `postgrad-wordbook/web/tsconfig.node.json`
- Create: `postgrad-wordbook/web/vite.config.ts`
- Create: `postgrad-wordbook/web/src/main.tsx`
- Create: `postgrad-wordbook/web/src/app/App.tsx`
- Create: `postgrad-wordbook/web/src/domain/constants.ts`
- Create: `postgrad-wordbook/web/src/domain/types.ts`
- Create: `postgrad-wordbook/web/src/styles/global.css`
- Create: `postgrad-wordbook/web/tests/setup.ts`
- Modify: `postgrad-wordbook/package.json`
- Test: `postgrad-wordbook/web/tests/constants.test.ts`

- [ ] **Step 1: Write the failing constants test**

Create `web/tests/constants.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FAMILIARITY, QUIZ_TYPE } from '../src/domain/constants';

describe('browser domain constants', () => {
  it('exports the stable familiarity and quiz constants', () => {
    expect(FAMILIARITY).toEqual({
      FAMILIAR: 'familiar',
      REVIEW: 'review',
      UNKNOWN: 'unknown',
    });
    expect(QUIZ_TYPE).toEqual({
      EN_TO_ZH: 'en-to-zh',
      ZH_TO_EN: 'zh-to-en',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `postgrad-wordbook/`:

```powershell
npm --prefix web test -- --run tests/constants.test.ts
```

Expected: FAIL because `web/package.json` and the constants module do not exist yet.

- [ ] **Step 3: Create the minimal Vite React app**

Create `web/package.json`:

```json
{
  "name": "postgrad-wordbook-pwa",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "vite": "^7.0.0",
    "typescript": "^5.8.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.3.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "jsdom": "^26.1.0",
    "vitest": "^3.2.0"
  }
}
```

Create `web/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});
```

Create `web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "tests"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `web/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

Create `web/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#b9432f" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <title>考研词书</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `web/src/domain/constants.ts`:

```ts
export const FAMILIARITY = {
  FAMILIAR: 'familiar',
  REVIEW: 'review',
  UNKNOWN: 'unknown',
} as const;

export const QUIZ_TYPE = {
  EN_TO_ZH: 'en-to-zh',
  ZH_TO_EN: 'zh-to-en',
} as const;
```

Create `web/src/domain/types.ts` using the types from section 2.

Create `web/src/app/App.tsx`:

```tsx
export function App() {
  return (
    <main className="app-shell">
      <h1>考研词书</h1>
      <p>自用 PWA 版本初始化完成。</p>
    </main>
  );
}
```

Create `web/src/main.tsx`:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `web/src/styles/global.css`:

```css
:root {
  color: #2b211d;
  background: #f7efe4;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background: #f7efe4;
}

button,
input,
select {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  padding: calc(20px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom));
}
```

Create `web/tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Modify root `package.json` scripts:

```json
{
  "web:dev": "npm --prefix web run dev",
  "web:build": "npm --prefix web run build",
  "web:test": "npm --prefix web run test:run",
  "web:preview": "npm --prefix web run preview"
}
```

- [ ] **Step 4: Install dependencies**

Run from `postgrad-wordbook/`:

```powershell
npm --prefix web install
```

Expected: `web/package-lock.json` is created and dependencies install successfully.

- [ ] **Step 5: Verify scaffold**

Run:

```powershell
npm --prefix web test -- --run tests/constants.test.ts
npm run web:build
```

Expected: constants test PASS and Vite build succeeds.

- [ ] **Step 6: Commit scaffold**

```powershell
git add postgrad-wordbook/package.json postgrad-wordbook/web
git commit -m "feat: scaffold pwa wordbook app"
```

---

### Task 2: Copy existing content packs into the PWA public directory

**Files:**
- Create: `postgrad-wordbook/scripts/prepare-web-content.mjs`
- Modify: `postgrad-wordbook/package.json`
- Test: `postgrad-wordbook/web/tests/contentFiles.test.ts`

- [ ] **Step 1: Write the failing content file test**

Create `web/tests/contentFiles.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('web static content', () => {
  it('contains the built manifest and at least one library manifest', () => {
    const manifestPath = path.resolve('public/content/manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.libraries.length).toBeGreaterThanOrEqual(1);
    const firstLibrary = manifest.libraries[0];
    const libraryManifestPath = path.resolve(
      'public/content',
      firstLibrary.libraryId,
      firstLibrary.version,
      'library-manifest.json',
    );
    expect(fs.existsSync(libraryManifestPath)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm --prefix web test -- --run tests/contentFiles.test.ts
```

Expected: FAIL because `web/public/content/manifest.json` does not exist.

- [ ] **Step 3: Implement the content copy script**

Create `scripts/prepare-web-content.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = path.join(root, 'content', 'dist');
const target = path.join(root, 'web', 'public', 'content');

if (!fs.existsSync(path.join(source, 'manifest.json'))) {
  throw new Error('Run npm run content:build before npm run web:content');
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.cpSync(source, target, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(path.join(target, 'manifest.json'), 'utf8'));
console.log(`Copied ${manifest.libraries.length} library pack(s) into web/public/content`);
```

Modify root `package.json` scripts:

```json
{
  "web:content": "node scripts/prepare-web-content.mjs",
  "web:build": "npm run web:content && npm --prefix web run build"
}
```

- [ ] **Step 4: Build content and verify the copy**

Run:

```powershell
npm run content:build
npm run web:content
npm --prefix web test -- --run tests/contentFiles.test.ts
```

Expected: content build succeeds, copy script reports 2 library packs, test PASS.

- [ ] **Step 5: Commit content copy support**

```powershell
git add postgrad-wordbook/package.json postgrad-wordbook/scripts/prepare-web-content.mjs postgrad-wordbook/web/tests/contentFiles.test.ts
git commit -m "feat: prepare static content for pwa"
```

---

### Task 3: Implement browser storage repositories

**Files:**
- Create: `postgrad-wordbook/web/src/repositories/db.ts`
- Create: `postgrad-wordbook/web/src/repositories/learningRepository.ts`
- Create: `postgrad-wordbook/web/src/repositories/progressRepository.ts`
- Create: `postgrad-wordbook/web/src/app/storage.ts`
- Test: `postgrad-wordbook/web/tests/repositories.test.ts`

- [ ] **Step 1: Write repository tests**

Create `web/tests/repositories.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryStore } from './fixtures';
import { createLearningRepository } from '../src/repositories/learningRepository';
import { createProgressRepository } from '../src/repositories/progressRepository';

describe('browser repositories', () => {
  beforeEach(() => localStorage.clear());

  it('updates one word state without replacing the rest', async () => {
    const store = createMemoryStore();
    const repo = createLearningRepository(store);
    await repo.setFamiliarity('word_abandon', 'review', 1000);
    await repo.setFamiliarity('word_ability', 'familiar', 2000);
    await repo.setFamiliarity('word_abandon', 'unknown', 3000);
    expect(await repo.getWordState('word_abandon')).toEqual({
      wordId: 'word_abandon',
      familiarity: 'unknown',
      updatedAt: 3000,
    });
    expect(await repo.getCounts(['word_abandon', 'word_ability'])).toEqual({
      familiar: 1,
      review: 0,
      unknown: 1,
    });
  });

  it('saves and restores library progress', async () => {
    const store = createMemoryStore();
    const repo = createProgressRepository(store);
    await repo.saveProgress('core-2027-prep', {
      libraryId: 'core-2027-prep',
      anchorWordId: 'word_abandon',
      scrollOffset: 32,
      updatedAt: 1000,
    });
    expect(await repo.getProgress('core-2027-prep')).toEqual({
      libraryId: 'core-2027-prep',
      anchorWordId: 'word_abandon',
      scrollOffset: 32,
      updatedAt: 1000,
    });
  });
});
```

Create `web/tests/fixtures.ts` with a reusable memory store:

```ts
export function createMemoryStore() {
  const data = new Map<string, unknown>();
  return {
    async get<T>(key: string, fallback: T): Promise<T> {
      return data.has(key) ? (structuredClone(data.get(key)) as T) : fallback;
    },
    async set<T>(key: string, value: T): Promise<void> {
      data.set(key, structuredClone(value));
    },
    async remove(key: string): Promise<void> {
      data.delete(key);
    },
  };
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
npm --prefix web test -- --run tests/repositories.test.ts
```

Expected: FAIL because repository modules do not exist.

- [ ] **Step 3: Implement IndexedDB storage primitives**

Create `web/src/app/storage.ts`:

```ts
export type KeyValueStore = {
  get<T>(key: string, fallback: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
};

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase(dbName: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  dbName: string,
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase(dbName, storeName);
  try {
    const tx = db.transaction(storeName, mode);
    const transactionDone = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    const result = await requestToPromise(run(tx.objectStore(storeName)));
    await transactionDone;
    return result;
  } finally {
    db.close();
  }
}

export function createIndexedDbStore(
  dbName = 'postgrad-wordbook-pwa',
  storeName = 'kv',
): KeyValueStore {
  if (!window.indexedDB) {
    throw new Error('INDEXED_DB_UNAVAILABLE');
  }
  return {
    async get<T>(key: string, fallback: T): Promise<T> {
      const value = await withStore<unknown>(dbName, storeName, 'readonly', (store) => store.get(key));
      return value === undefined ? fallback : (value as T);
    },
    async set<T>(key: string, value: T): Promise<void> {
      await withStore<IDBValidKey>(dbName, storeName, 'readwrite', (store) => store.put(value, key));
    },
    async remove(key: string): Promise<void> {
      await withStore<undefined>(dbName, storeName, 'readwrite', (store) => store.delete(key));
    },
  };
}

export function createLocalStorageSettingsStore(
  storage: Storage = window.localStorage,
): KeyValueStore {
  return {
    async get<T>(key: string, fallback: T): Promise<T> {
      const raw = storage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    },
    async set<T>(key: string, value: T): Promise<void> {
      storage.setItem(key, JSON.stringify(value));
    },
    async remove(key: string): Promise<void> {
      storage.removeItem(key);
    },
  };
}
```

Create `web/src/repositories/learningRepository.ts`:

```ts
import { FAMILIARITY } from '../domain/constants';
import type { Familiarity, WordState } from '../domain/types';
import type { KeyValueStore } from '../app/storage';

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
      const counts = { familiar: 0, review: 0, unknown: 0 };
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
```

Create `web/src/repositories/progressRepository.ts`:

```ts
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
```

Create `web/src/repositories/db.ts` as an IndexedDB capability check:

```ts
export function assertIndexedDbAvailable(win: Pick<Window, 'indexedDB'> = window) {
  if (!win.indexedDB) {
    throw new Error('INDEXED_DB_UNAVAILABLE');
  }
}
```

- [ ] **Step 4: Verify repositories**

Run:

```powershell
npm --prefix web test -- --run tests/repositories.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit storage repositories**

```powershell
git add postgrad-wordbook/web/src/app/storage.ts postgrad-wordbook/web/src/repositories postgrad-wordbook/web/tests
git commit -m "feat: add pwa browser repositories"
```

---

### Task 4: Implement content import and reader domain services

**Files:**
- Create: `postgrad-wordbook/web/src/domain/search.ts`
- Create: `postgrad-wordbook/web/src/services/contentService.ts`
- Create: `postgrad-wordbook/web/src/services/readerService.ts`
- Test: `postgrad-wordbook/web/tests/search.test.ts`
- Test: `postgrad-wordbook/web/tests/contentService.test.ts`
- Test: `postgrad-wordbook/web/tests/readerService.test.ts`

- [ ] **Step 1: Write failing search and reader tests**

Create `web/tests/search.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { filterOrderedIds, searchIndex } from '../src/domain/search';
import type { SearchIndexEntry } from '../src/domain/types';

const index: SearchIndexEntry[] = [
  { id: 'word_abandon', word: 'abandon', initial: 'A', senseKeywords: ['放弃'], partOfSpeech: ['v.'] },
  { id: 'word_abandoned', word: 'abandoned', initial: 'A', senseKeywords: ['被抛弃的'], partOfSpeech: ['adj.'] },
  { id: 'word_desert', word: 'desert', initial: 'D', senseKeywords: ['放弃', '沙漠'], partOfSpeech: ['v.', 'n.'] },
];

describe('search domain', () => {
  it('ranks exact word before prefix and definition matches', () => {
    expect(searchIndex(index, 'abandon').map((x) => x.id)).toEqual([
      'word_abandon',
      'word_abandoned',
    ]);
    expect(searchIndex(index, '放弃').map((x) => x.id)).toEqual([
      'word_abandon',
      'word_desert',
    ]);
  });

  it('combines order, initial and familiarity filters', () => {
    expect(filterOrderedIds({
      orderedIds: ['word_ability', 'word_abandon', 'word_basic'],
      indexById: new Map([
        ['word_ability', { id: 'word_ability', word: 'ability', initial: 'A', senseKeywords: ['能力'], partOfSpeech: ['n.'] }],
        ['word_abandon', index[0]],
        ['word_basic', { id: 'word_basic', word: 'basic', initial: 'B', senseKeywords: ['基础'], partOfSpeech: ['adj.'] }],
      ]),
      stateById: new Map([
        ['word_abandon', { wordId: 'word_abandon', familiarity: 'review', updatedAt: 1 }],
        ['word_ability', { wordId: 'word_ability', familiarity: 'familiar', updatedAt: 1 }],
      ]),
      letter: 'A',
      familiarity: ['review'],
      query: '',
    })).toEqual(['word_abandon']);
  });
});
```

Create `web/tests/readerService.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getWindow } from '../src/services/readerService';

describe('reader service', () => {
  it('returns a bounded window of word ids', () => {
    const ids = Array.from({ length: 1000 }, (_, index) => `word_${index}`);
    expect(getWindow({ orderedIds: ids, start: 490, size: 30 })).toEqual({
      start: 490,
      end: 520,
      ids: ids.slice(490, 520),
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm --prefix web test -- --run tests/search.test.ts tests/readerService.test.ts
```

Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement search and reader pure functions**

Create `web/src/domain/search.ts`:

```ts
import type { Familiarity, SearchIndexEntry, WordState } from './types';

export const normalize = (value: unknown) =>
  String(value ?? '').trim().toLocaleLowerCase('en-US');

export function searchIndex(index: SearchIndexEntry[], query: string): SearchIndexEntry[] {
  const normalized = normalize(query);
  if (!normalized) return index;

  return index
    .map((entry) => {
      const word = normalize(entry.word);
      const keywords = entry.senseKeywords.map(normalize);
      let score = 0;
      if (word === normalized) score = 100;
      else if (word.startsWith(normalized)) score = 80;
      else if (word.includes(normalized)) score = 60;
      else if (keywords.some((keyword) => keyword.includes(normalized))) score = 40;
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.word.localeCompare(b.entry.word))
    .map((item) => item.entry);
}

export function filterOrderedIds(input: {
  orderedIds: string[];
  indexById: Map<string, SearchIndexEntry>;
  stateById: Map<string, WordState>;
  letter?: string;
  familiarity?: Familiarity[];
  query?: string;
}) {
  const letter = normalize(input.letter);
  const familiarity = new Set(input.familiarity ?? []);
  const queryMatches = new Set(
    input.query ? searchIndex([...input.indexById.values()], input.query).map((entry) => entry.id) : input.orderedIds,
  );

  return input.orderedIds.filter((wordId) => {
    const indexEntry = input.indexById.get(wordId);
    if (!indexEntry) return false;
    if (letter && normalize(indexEntry.initial) !== letter) return false;
    if (!queryMatches.has(wordId)) return false;
    if (familiarity.size > 0) {
      const state = input.stateById.get(wordId);
      if (!state?.familiarity || !familiarity.has(state.familiarity)) return false;
    }
    return true;
  });
}
```

Create `web/src/services/readerService.ts`:

```ts
export function getWindow(input: { orderedIds: string[]; start: number; size: number }) {
  const start = Math.max(0, Math.min(input.start, input.orderedIds.length));
  const end = Math.max(start, Math.min(start + input.size, input.orderedIds.length));
  return {
    start,
    end,
    ids: input.orderedIds.slice(start, end),
  };
}
```

- [ ] **Step 4: Add content service tests**

Create `web/tests/contentService.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createContentService } from '../src/services/contentService';

describe('content service', () => {
  it('loads manifest and library shards without overwriting on failure', async () => {
    const writes: string[] = [];
    const service = createContentService({
      baseUrl: '/content',
      fetchJson: vi.fn(async (url: string) => {
        if (url.endsWith('/manifest.json')) {
          return { libraries: [{ libraryId: 'core', version: '1.0.0', shards: [{ path: 'broken.json' }], searchIndex: { path: 'search.json' }, order: { path: 'order.json' } }] };
        }
        if (url.endsWith('/broken.json')) throw new Error('network');
        return {};
      }),
      repository: {
        beginImport: async () => writes.push('begin'),
        commitImport: async () => writes.push('commit'),
      },
    });
    await expect(service.importLibrary('core')).rejects.toThrow('network');
    expect(writes).toEqual(['begin']);
  });
});
```

- [ ] **Step 5: Implement content service shell**

Create `web/src/services/contentService.ts`:

```ts
type StaticManifest = {
  libraries: Array<{
    libraryId: string;
    version: string;
    shards: Array<{ path: string }>;
    searchIndex: { path: string };
    order: { path: string };
  }>;
};

export function createContentService(deps: {
  baseUrl: string;
  fetchJson: (url: string) => Promise<unknown>;
  repository: {
    beginImport: (libraryId: string) => Promise<void>;
    commitImport: (libraryId: string, payload: unknown) => Promise<void>;
  };
}) {
  async function loadManifest() {
    return deps.fetchJson(`${deps.baseUrl}/manifest.json`) as Promise<StaticManifest>;
  }

  return {
    async listAvailableLibraries() {
      return (await loadManifest()).libraries;
    },
    async importLibrary(libraryId: string) {
      const manifest = await loadManifest();
      const library = manifest.libraries.find((item) => item.libraryId === libraryId);
      if (!library) throw new Error(`Library not found: ${libraryId}`);
      await deps.repository.beginImport(libraryId);
      const shardData = [];
      for (const shard of library.shards) {
        shardData.push(await deps.fetchJson(`${deps.baseUrl}/${library.libraryId}/${library.version}/${shard.path}`));
      }
      const searchIndex = await deps.fetchJson(`${deps.baseUrl}/${library.libraryId}/${library.version}/${library.searchIndex.path}`);
      const order = await deps.fetchJson(`${deps.baseUrl}/${library.libraryId}/${library.version}/${library.order.path}`);
      const payload = { library, shardData, searchIndex, order };
      await deps.repository.commitImport(libraryId, payload);
      return payload;
    },
  };
}
```

- [ ] **Step 6: Verify domain and content services**

Run:

```powershell
npm --prefix web test -- --run tests/search.test.ts tests/readerService.test.ts tests/contentService.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit content and reader services**

```powershell
git add postgrad-wordbook/web/src/domain/search.ts postgrad-wordbook/web/src/services postgrad-wordbook/web/tests
git commit -m "feat: add pwa content and reader services"
```

---

### Task 5: Build the book-like reader UI and word entry component

**Files:**
- Create: `postgrad-wordbook/web/src/components/WordEntry/WordEntry.tsx`
- Create: `postgrad-wordbook/web/src/components/WordEntry/WordEntry.css`
- Create: `postgrad-wordbook/web/src/pages/ReaderPage.tsx`
- Modify: `postgrad-wordbook/web/src/app/App.tsx`
- Modify: `postgrad-wordbook/web/src/styles/global.css`
- Test: `postgrad-wordbook/web/tests/wordEntry.test.tsx`

- [ ] **Step 1: Write WordEntry rendering tests**

Create `web/tests/wordEntry.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WordEntry } from '../src/components/WordEntry/WordEntry';

const word = {
  id: 'word_abandon',
  word: 'abandon',
  initial: 'A',
  phonetics: { uk: '/əˈbændən/', us: '/əˈbændən/' },
  audio: { uk: 'word_abandon-uk.mp3' },
  senses: [{ partOfSpeech: 'v.', definitions: ['放弃', '抛弃'] }],
  collocations: [],
  examExamples: [],
};

describe('WordEntry', () => {
  it('renders a book-like word module and hides unavailable sections', () => {
    render(<WordEntry word={word} state={{ wordId: word.id, familiarity: 'review', updatedAt: 1 }} onMark={() => undefined} onPlay={() => undefined} />);
    expect(screen.getByRole('heading', { name: 'abandon' })).toBeInTheDocument();
    expect(screen.getByText('v.')).toBeInTheDocument();
    expect(screen.getByText('放弃；抛弃')).toBeInTheDocument();
    expect(screen.queryByText('搭配')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '英音' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '美音' })).not.toBeInTheDocument();
  });

  it('emits familiarity changes', async () => {
    const onMark = vi.fn();
    render(<WordEntry word={word} state={{ wordId: word.id, updatedAt: 0 }} onMark={onMark} onPlay={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: '陌生' }));
    expect(onMark).toHaveBeenCalledWith('word_abandon', 'unknown');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm --prefix web test -- --run tests/wordEntry.test.tsx
```

Expected: FAIL because `WordEntry` does not exist.

- [ ] **Step 3: Implement WordEntry**

Create `web/src/components/WordEntry/WordEntry.tsx`:

```tsx
import type { Familiarity, WordEntry as WordEntryType, WordState } from '../../domain/types';
import './WordEntry.css';

export function WordEntry(props: {
  word: WordEntryType;
  state: WordState;
  onMark: (wordId: string, familiarity: Familiarity) => void;
  onPlay: (wordId: string, accent: 'uk' | 'us') => void;
}) {
  const { word, state, onMark, onPlay } = props;
  const definitions = word.senses.flatMap((sense) => sense.definitions).join('；');
  const hasCollocations = Boolean(word.collocations?.length);
  const hasExamples = Boolean(word.examExamples?.length);

  return (
    <article className="word-entry" data-word-id={word.id}>
      <header className="word-entry__header">
        <h2>{word.word}</h2>
        <div className="word-entry__phonetics">
          {word.phonetics?.uk && <span>英 {word.phonetics.uk}</span>}
          {word.phonetics?.us && <span>美 {word.phonetics.us}</span>}
        </div>
      </header>
      <div className="word-entry__audio">
        {word.audio?.uk && <button onClick={() => onPlay(word.id, 'uk')}>英音</button>}
        {word.audio?.us && <button onClick={() => onPlay(word.id, 'us')}>美音</button>}
      </div>
      <section>
        {word.senses.map((sense) => (
          <p key={sense.partOfSpeech}>
            <strong>{sense.partOfSpeech}</strong> {sense.definitions.join('；')}
          </p>
        ))}
        <p className="word-entry__primary">{definitions}</p>
      </section>
      {hasCollocations && (
        <section>
          <h3>搭配</h3>
          <p>{word.collocations?.join('；')}</p>
        </section>
      )}
      {hasExamples && (
        <section>
          <h3>例句</h3>
          {word.examExamples?.map((example) => (
            <p key={example.text}>{example.text}：{example.translation}</p>
          ))}
        </section>
      )}
      <footer className="word-entry__actions" aria-label="熟悉度">
        {[
          ['familiar', '熟悉'],
          ['review', '待巩固'],
          ['unknown', '陌生'],
        ].map(([value, label]) => (
          <button
            key={value}
            className={state.familiarity === value ? 'is-active' : ''}
            onClick={() => onMark(word.id, value as Familiarity)}
          >
            {label}
          </button>
        ))}
      </footer>
    </article>
  );
}
```

Create `web/src/components/WordEntry/WordEntry.css`:

```css
.word-entry {
  border-top: 1px solid rgba(91, 55, 42, 0.16);
  padding: 20px 0;
}

.word-entry__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.word-entry h2 {
  margin: 0;
  color: #9f3328;
  font-size: 2rem;
}

.word-entry__phonetics {
  color: #6f625a;
  font-size: 0.9rem;
}

.word-entry__audio,
.word-entry__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.word-entry button {
  border: 1px solid #d7b7a5;
  border-radius: 999px;
  background: #fff8f0;
  color: #5b372a;
  padding: 8px 12px;
}

.word-entry button.is-active {
  border-color: #b9432f;
  background: #b9432f;
  color: white;
}
```

- [ ] **Step 4: Implement ReaderPage shell**

Create `web/src/pages/ReaderPage.tsx`:

```tsx
import { WordEntry } from '../components/WordEntry/WordEntry';
import type { WordEntry as WordEntryType, WordState, Familiarity } from '../domain/types';

export function ReaderPage(props: {
  words: WordEntryType[];
  states: Map<string, WordState>;
  onMark: (wordId: string, familiarity: Familiarity) => void;
  onPlay: (wordId: string, accent: 'uk' | 'us') => void;
}) {
  return (
    <main className="reader-page">
      <header className="reader-page__header">
        <h1>词书阅读</h1>
        <p>像书一样往下读，遇到不会的就标记。</p>
      </header>
      {props.words.map((word) => (
        <WordEntry
          key={word.id}
          word={word}
          state={props.states.get(word.id) ?? { wordId: word.id, updatedAt: 0 }}
          onMark={props.onMark}
          onPlay={props.onPlay}
        />
      ))}
    </main>
  );
}
```

- [ ] **Step 5: Verify component and build**

Run:

```powershell
npm --prefix web test -- --run tests/wordEntry.test.tsx
npm run web:build
```

Expected: test PASS and build succeeds.

- [ ] **Step 6: Commit reader UI**

```powershell
git add postgrad-wordbook/web/src/components postgrad-wordbook/web/src/pages/ReaderPage.tsx postgrad-wordbook/web/src/styles postgrad-wordbook/web/tests/wordEntry.test.tsx
git commit -m "feat: add pwa book reader UI"
```

---

### Task 6: Add app navigation, home, library import, review filters, and settings

**Files:**
- Create: `postgrad-wordbook/web/src/app/routes.ts`
- Create: `postgrad-wordbook/web/src/pages/HomePage.tsx`
- Create: `postgrad-wordbook/web/src/pages/LibraryPage.tsx`
- Create: `postgrad-wordbook/web/src/pages/ReviewPage.tsx`
- Create: `postgrad-wordbook/web/src/pages/SettingsPage.tsx`
- Modify: `postgrad-wordbook/web/src/app/App.tsx`
- Modify: `postgrad-wordbook/web/src/styles/global.css`
- Test: `postgrad-wordbook/web/tests/appNavigation.test.tsx`

- [ ] **Step 1: Write navigation smoke test**

Create `web/tests/appNavigation.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../src/app/App';

describe('PWA navigation', () => {
  it('moves between home, libraries, review, quiz and settings without a router dependency', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '考研词书' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '词库' }));
    expect(screen.getByRole('heading', { name: '词库中心' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '复习' }));
    expect(screen.getByRole('heading', { name: '分类复习' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '设置' }));
    expect(screen.getByRole('heading', { name: '设置' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm --prefix web test -- --run tests/appNavigation.test.tsx
```

Expected: FAIL because navigation pages do not exist.

- [ ] **Step 3: Implement simple hash-free navigation**

Create `web/src/app/routes.ts`:

```ts
export type Route = 'home' | 'libraries' | 'reader' | 'review' | 'quiz' | 'settings';

export const NAV_ITEMS: Array<{ route: Route; label: string }> = [
  { route: 'home', label: '首页' },
  { route: 'libraries', label: '词库' },
  { route: 'reader', label: '阅读' },
  { route: 'review', label: '复习' },
  { route: 'quiz', label: '测试' },
  { route: 'settings', label: '设置' },
];
```

Create page files with headings:

```tsx
export function HomePage() {
  return <section><h1>考研词书</h1><p>继续阅读、统计和入口。</p></section>;
}
```

```tsx
export function LibraryPage() {
  return <section><h1>词库中心</h1><button>载入内置词库</button></section>;
}
```

```tsx
export function ReviewPage() {
  return <section><h1>分类复习</h1><p>选择熟悉、待巩固、陌生。</p></section>;
}
```

```tsx
export function SettingsPage() {
  return <section><h1>设置</h1><p>字号、缓存和数据说明。</p></section>;
}
```

Modify `web/src/app/App.tsx` to use `useState<Route>` and render these pages plus the existing reader shell.

- [ ] **Step 4: Verify navigation**

Run:

```powershell
npm --prefix web test -- --run tests/appNavigation.test.tsx
npm run web:build
```

Expected: PASS and build succeeds.

- [ ] **Step 5: Commit navigation and pages**

```powershell
git add postgrad-wordbook/web/src/app postgrad-wordbook/web/src/pages postgrad-wordbook/web/src/styles postgrad-wordbook/web/tests/appNavigation.test.tsx
git commit -m "feat: add pwa navigation pages"
```

---

### Task 7: Implement quiz engine and quiz page

**Files:**
- Create: `postgrad-wordbook/web/src/domain/quiz.ts`
- Create: `postgrad-wordbook/web/src/pages/QuizPage.tsx`
- Modify: `postgrad-wordbook/web/src/app/App.tsx`
- Test: `postgrad-wordbook/web/tests/quiz.test.ts`

- [ ] **Step 1: Write quiz tests**

Create `web/tests/quiz.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildQuestion, scoreSession } from '../src/domain/quiz';

const words = [
  { id: 'word_abandon', word: 'abandon', initial: 'A', senses: [{ partOfSpeech: 'v.', definitions: ['放弃'] }] },
  { id: 'word_accept', word: 'accept', initial: 'A', senses: [{ partOfSpeech: 'v.', definitions: ['接受'] }] },
  { id: 'word_admit', word: 'admit', initial: 'A', senses: [{ partOfSpeech: 'v.', definitions: ['承认'] }] },
  { id: 'word_book', word: 'book', initial: 'B', senses: [{ partOfSpeech: 'n.', definitions: ['书'] }] },
];

describe('quiz engine', () => {
  it('builds an English-to-Chinese question with one correct answer', () => {
    const question = buildQuestion({ type: 'en-to-zh', target: words[0], pool: words, random: () => 0.1 });
    expect(question.prompt).toBe('abandon');
    expect(question.options).toHaveLength(4);
    expect(question.options.filter((option) => option.correct)).toHaveLength(1);
  });

  it('scores a session with unique wrong word ids', () => {
    expect(scoreSession([
      { wordId: 'word_abandon', correct: false },
      { wordId: 'word_abandon', correct: false },
      { wordId: 'word_accept', correct: true },
    ])).toEqual({
      total: 3,
      correct: 1,
      accuracy: 33,
      wrongWordIds: ['word_abandon'],
    });
  });
});
```

- [ ] **Step 2: Run quiz tests to verify they fail**

Run:

```powershell
npm --prefix web test -- --run tests/quiz.test.ts
```

Expected: FAIL because quiz engine does not exist.

- [ ] **Step 3: Implement quiz engine**

Create `web/src/domain/quiz.ts`:

```ts
import type { WordEntry } from './types';

export type QuizType = 'en-to-zh' | 'zh-to-en';

export function primaryDefinition(word: Pick<WordEntry, 'senses'>) {
  return word.senses[0]?.definitions[0] ?? '';
}

export function buildQuestion(input: {
  type: QuizType;
  target: WordEntry;
  pool: WordEntry[];
  random: () => number;
}) {
  const correctText = input.type === 'en-to-zh' ? primaryDefinition(input.target) : input.target.word;
  const distractors = input.pool
    .filter((word) => word.id !== input.target.id)
    .map((word) => input.type === 'en-to-zh' ? primaryDefinition(word) : word.word)
    .filter((text, index, array) => text && text !== correctText && array.indexOf(text) === index)
    .slice(0, 3);
  const options = [{ text: correctText, correct: true }, ...distractors.map((text) => ({ text, correct: false }))];
  return {
    wordId: input.target.id,
    prompt: input.type === 'en-to-zh' ? input.target.word : primaryDefinition(input.target),
    options: options.sort(() => input.random() - 0.5),
  };
}

export function scoreSession(answers: Array<{ wordId: string; correct: boolean }>) {
  const correct = answers.filter((answer) => answer.correct).length;
  return {
    total: answers.length,
    correct,
    accuracy: answers.length === 0 ? 0 : Math.round((correct / answers.length) * 100),
    wrongWordIds: [...new Set(answers.filter((answer) => !answer.correct).map((answer) => answer.wordId))],
  };
}
```

- [ ] **Step 4: Implement QuizPage shell**

Create `web/src/pages/QuizPage.tsx`:

```tsx
export function QuizPage() {
  return (
    <section>
      <h1>单词测试</h1>
      <p>支持英选中和中选英，测试结果只保存在本地。</p>
      <button>英选中</button>
      <button>中选英</button>
    </section>
  );
}
```

- [ ] **Step 5: Verify quiz**

Run:

```powershell
npm --prefix web test -- --run tests/quiz.test.ts
npm run web:build
```

Expected: PASS and build succeeds.

- [ ] **Step 6: Commit quiz**

```powershell
git add postgrad-wordbook/web/src/domain/quiz.ts postgrad-wordbook/web/src/pages/QuizPage.tsx postgrad-wordbook/web/src/app/App.tsx postgrad-wordbook/web/tests/quiz.test.ts
git commit -m "feat: add pwa quiz engine"
```

---

### Task 8: Implement audio playback and cache-aware behavior

**Files:**
- Create: `postgrad-wordbook/web/src/services/audioService.ts`
- Modify: `postgrad-wordbook/web/src/components/WordEntry/WordEntry.tsx`
- Test: `postgrad-wordbook/web/tests/audioService.test.ts`

- [ ] **Step 1: Write audio service tests**

Create `web/tests/audioService.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createAudioService } from '../src/services/audioService';

describe('audio service', () => {
  it('stops previous audio before playing a new source', async () => {
    const stop = vi.fn();
    const play = vi.fn(async () => undefined);
    const setSource = vi.fn();
    const service = createAudioService({
      createPlayer: () => ({ stop, play, setSource }),
      resolveUrl: (_wordId, accent) => `/content/audio/${accent}.mp3`,
    });
    await service.play('word_abandon', 'uk');
    await service.play('word_abandon', 'us');
    expect(stop).toHaveBeenCalledTimes(2);
    expect(setSource).toHaveBeenLastCalledWith('/content/audio/us.mp3');
    expect(play).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run audio tests to verify they fail**

Run:

```powershell
npm --prefix web test -- --run tests/audioService.test.ts
```

Expected: FAIL because audio service does not exist.

- [ ] **Step 3: Implement audio service**

Create `web/src/services/audioService.ts`:

```ts
export type Accent = 'uk' | 'us';

export function createAudioService(deps: {
  createPlayer: () => {
    stop: () => void;
    setSource: (src: string) => void;
    play: () => Promise<void>;
  };
  resolveUrl: (wordId: string, accent: Accent) => string | null;
}) {
  const player = deps.createPlayer();
  return {
    async play(wordId: string, accent: Accent) {
      const url = deps.resolveUrl(wordId, accent);
      if (!url) throw new Error('AUDIO_SOURCE_UNAVAILABLE');
      player.stop();
      player.setSource(url);
      await player.play();
    },
  };
}

export function createHtmlAudioPlayer(audio = new Audio()) {
  return {
    stop() {
      audio.pause();
      audio.currentTime = 0;
    },
    setSource(src: string) {
      audio.src = src;
    },
    async play() {
      await audio.play();
    },
  };
}
```

- [ ] **Step 4: Verify audio**

Run:

```powershell
npm --prefix web test -- --run tests/audioService.test.ts tests/wordEntry.test.tsx
npm run web:build
```

Expected: PASS and build succeeds.

- [ ] **Step 5: Commit audio**

```powershell
git add postgrad-wordbook/web/src/services/audioService.ts postgrad-wordbook/web/src/components/WordEntry postgrad-wordbook/web/tests/audioService.test.ts
git commit -m "feat: add pwa audio playback service"
```

---

### Task 9: Add PWA manifest, icons, service worker and installable offline shell

**Files:**
- Create: `postgrad-wordbook/web/public/manifest.webmanifest`
- Create: `postgrad-wordbook/web/public/sw.js`
- Create: `postgrad-wordbook/web/public/icons/icon.svg`
- Create: `postgrad-wordbook/web/public/icons/apple-touch-icon.svg`
- Modify: `postgrad-wordbook/web/src/main.tsx`
- Test: `postgrad-wordbook/web/tests/pwaFiles.test.ts`

- [ ] **Step 1: Write PWA file tests**

Create `web/tests/pwaFiles.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('PWA static files', () => {
  it('declares an installable web app manifest and service worker', () => {
    const manifest = JSON.parse(fs.readFileSync(path.resolve('public/manifest.webmanifest'), 'utf8'));
    expect(manifest.name).toBe('考研词书');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(1);
    expect(fs.readFileSync(path.resolve('public/sw.js'), 'utf8')).toContain('CACHE_NAME');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm --prefix web test -- --run tests/pwaFiles.test.ts
```

Expected: FAIL because PWA files do not exist.

- [ ] **Step 3: Create manifest and icons**

Create `web/public/manifest.webmanifest`:

```json
{
  "name": "考研词书",
  "short_name": "考研词书",
  "description": "自用考研英语词书 PWA",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#f7efe4",
  "theme_color": "#b9432f",
  "icons": [
    {
      "src": "/icons/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

Create both icon SVG files as a simple red-orange rounded square with an open book mark:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#b9432f"/>
  <path d="M136 164c44 0 82 12 120 38 38-26 76-38 120-38 18 0 32 14 32 32v182c0 13-10 23-23 22-49-4-87 6-129 35-42-29-80-39-129-35-13 1-23-9-23-22V196c0-18 14-32 32-32Z" fill="#fff4e4"/>
  <path d="M256 202v233" stroke="#b9432f" stroke-width="20" stroke-linecap="round"/>
  <path d="M316 150c20 28 16 58-10 80-11-35-5-61 10-80Z" fill="#7ba05b"/>
</svg>
```

- [ ] **Step 4: Create service worker**

Create `web/public/sw.js`:

```js
const CACHE_NAME = 'postgrad-wordbook-pwa-v1';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    }),
  );
});
```

Modify `web/src/main.tsx`:

```ts
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
```

- [ ] **Step 5: Verify PWA files and build**

Run:

```powershell
npm --prefix web test -- --run tests/pwaFiles.test.ts
npm run web:build
```

Expected: PASS and build succeeds.

- [ ] **Step 6: Commit PWA shell**

```powershell
git add postgrad-wordbook/web/public postgrad-wordbook/web/src/main.tsx postgrad-wordbook/web/tests/pwaFiles.test.ts
git commit -m "feat: add installable pwa shell"
```

---

### Task 10: Wire app state to imported content and local learning data

**Files:**
- Modify: `postgrad-wordbook/web/src/app/App.tsx`
- Modify: `postgrad-wordbook/web/src/pages/HomePage.tsx`
- Modify: `postgrad-wordbook/web/src/pages/LibraryPage.tsx`
- Modify: `postgrad-wordbook/web/src/pages/ReaderPage.tsx`
- Modify: `postgrad-wordbook/web/src/pages/ReviewPage.tsx`
- Modify: `postgrad-wordbook/web/src/pages/SettingsPage.tsx`
- Modify: `postgrad-wordbook/web/src/services/contentService.ts`
- Create: `postgrad-wordbook/web/tests/appFlow.test.tsx`

- [ ] **Step 1: Write app flow smoke test**

Create `web/tests/appFlow.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../src/app/App';

describe('PWA app flow', () => {
  it('lets a user load content, read a word and mark it unknown', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: '词库' }));
    await userEvent.click(screen.getByRole('button', { name: /载入内置词库/ }));
    await userEvent.click(screen.getByRole('button', { name: '阅读' }));
    expect(await screen.findByRole('heading', { name: /abandon/i })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: '陌生' })[0]);
    await userEvent.click(screen.getByRole('button', { name: '首页' }));
    expect(screen.getByText(/陌生/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run smoke test to verify it fails**

Run:

```powershell
npm --prefix web test -- --run tests/appFlow.test.tsx
```

Expected: FAIL because app state is not wired to content.

- [ ] **Step 3: Wire content loading**

Implement `App` state with:

```ts
type AppState = {
  words: WordEntry[];
  states: Map<string, WordState>;
  activeLibraryId: string | null;
  message: string | null;
};
```

On “载入内置词库”, fetch `/content/manifest.json`, import the first available library, flatten shard words into `words`, and set `activeLibraryId`.

- [ ] **Step 4: Wire mark and counts**

In `App`, implement:

```ts
async function markWord(wordId: string, familiarity: Familiarity) {
  const next = new Map(state.states);
  next.set(wordId, { wordId, familiarity, updatedAt: Date.now() });
  setState((current) => ({ ...current, states: next }));
  await learningRepository.setFamiliarity(wordId, familiarity, Date.now());
}
```

Show counts on `HomePage` from the `states` map.

- [ ] **Step 5: Verify app flow**

Run:

```powershell
npm --prefix web test -- --run tests/appFlow.test.tsx
npm run web:build
```

Expected: PASS and build succeeds.

- [ ] **Step 6: Commit app wiring**

```powershell
git add postgrad-wordbook/web/src postgrad-wordbook/web/tests/appFlow.test.tsx
git commit -m "feat: wire pwa content and learning flow"
```

---

### Task 11: Documentation and manual acceptance checklist

**Files:**
- Modify: `postgrad-wordbook/README.md`
- Modify: `postgrad-wordbook/docs/device-acceptance.md`
- Create: `postgrad-wordbook/docs/pwa-acceptance.md`

- [ ] **Step 1: Update README with PWA commands**

Add this section to `README.md`:

```markdown
## 自用 PWA

如果暂时不上传微信小程序，可以先使用 PWA 版本：

运行：`npm run content:build`

运行：`npm run web:content`

运行：`npm run web:dev`

手机访问开发机局域网地址后，可在 Safari 或 Chrome 中添加到主屏幕。正式自用部署时运行：

运行：`npm run web:build`

静态产物位于 `web/dist/`，可部署到任意静态服务器。
```

- [ ] **Step 2: Create PWA acceptance checklist**

Create `docs/pwa-acceptance.md`:

```markdown
# PWA 验收记录

## 自动检查

| 项目 | 结果 | 证据 |
|---|---|---|
| 内容构建 | 待执行 | `npm run content:build` |
| Web 内容复制 | 待执行 | `npm run web:content` |
| Web 测试 | 待执行 | `npm run web:test` |
| Web 构建 | 待执行 | `npm run web:build` |

## iPhone Safari

| 场景 | 结果 | 备注 |
|---|---|---|
| 打开网页 | 待执行 | |
| 添加到主屏幕 | 待执行 | |
| 载入 800 词 | 待执行 | |
| 阅读、搜索、标记 | 待执行 | |
| 断网后阅读和测试 | 待执行 | |
| 已缓存音频播放 | 待执行 | |

## Android Chrome/Edge

| 场景 | 结果 | 备注 |
|---|---|---|
| 打开网页 | 待执行 | |
| 添加到桌面 | 待执行 | |
| 载入 800 词 | 待执行 | |
| 阅读、搜索、标记 | 待执行 | |
| 断网后阅读和测试 | 待执行 | |
| 已缓存音频播放 | 待执行 | |
```

- [ ] **Step 3: Run final automated verification**

Run:

```powershell
npm run content:validate
npm run content:build
npm run content:verify
npm run web:content
npm run web:test
npm run web:build
npm test
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 4: Commit documentation**

```powershell
git add postgrad-wordbook/README.md postgrad-wordbook/docs/device-acceptance.md postgrad-wordbook/docs/pwa-acceptance.md
git commit -m "docs: add pwa usage and acceptance guide"
```

## 3. Final completion criteria

Do not claim the PWA is usable until all of these are true:

- `npm run content:validate`, `npm run content:build`, and `npm run content:verify` pass.
- `npm run web:content`, `npm run web:test`, and `npm run web:build` pass.
- Existing mini program test suite still passes with `npm test`.
- `web/dist/` contains a static app, manifest, service worker, icons, and copied content.
- A desktop browser can load the app, import the built-in 800-word content, mark a word, refresh, and retain the mark.
- iPhone Safari can open the deployed URL and add it to the home screen.
- Android Chrome or Edge can open the deployed URL and add it to the home screen.
- After the first import, offline reading, marking, search, and quiz work.
- README contains exact local development and static deployment instructions.
- Git status is clean after the final commit.
