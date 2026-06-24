import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const publicContentDir = path.join(process.cwd(), 'public', 'content');

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
  it('includes the generated manifest and core library assets for the PWA', async () => {
    const manifest = await readJson<ContentManifest>(
      path.join(publicContentDir, 'manifest.json'),
    );
    const [library] = manifest.libraries;

    expect(library).toBeDefined();
    await expectAssetFileToExist(library, 'words-0001.json');
    await expectAssetFileToExist(library, 'search-index.json');
    await expectAssetFileToExist(library, 'order.json');
  });
});
