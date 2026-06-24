import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const publicContentDir = path.join(process.cwd(), 'public', 'content');
const projectRoot = path.resolve(process.cwd(), '..');

type ContentAsset = {
  name: string;
};

type ContentLibrary = {
  libraryId: string;
  version: string;
  assets: ContentAsset[];
};

type ContentManifest = {
  libraries: ContentLibrary[];
};

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

async function expectAssetFileToExist(library: ContentLibrary, assetName: string) {
  expect(library.assets.some((asset) => asset.name === assetName)).toBe(true);

  const assetPath = path.join(
    publicContentDir,
    library.libraryId,
    library.version,
    assetName,
  );
  await expect(readFile(assetPath)).resolves.toBeInstanceOf(Buffer);
}

describe('public content files', () => {
  beforeAll(() => {
    execFileSync(process.execPath, ['scripts/build-library-pack.mjs'], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    execFileSync(process.execPath, ['scripts/prepare-web-content.mjs'], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  });

  it('includes the generated manifest and every library asset required by the PWA', async () => {
    const manifest = await readJson<ContentManifest>(
      path.join(publicContentDir, 'manifest.json'),
    );

    expect(manifest.libraries.length).toBeGreaterThanOrEqual(1);
    expect(manifest.libraries.some((library) => library.libraryId === 'core-2027-prep')).toBe(true);

    for (const library of manifest.libraries) {
      await expectAssetFileToExist(library, 'words-0001.json');
      await expectAssetFileToExist(library, 'search-index.json');
      await expectAssetFileToExist(library, 'order.json');
    }
  });
});
