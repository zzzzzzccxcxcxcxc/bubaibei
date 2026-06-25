type TopLevelManifest = {
  libraries: Array<{
    libraryId: string;
    version: string;
  }>;
};

type LibraryAsset = {
  name: string;
  bytes: number;
  sha256: string;
};

type LibraryManifestV1 = {
  libraryId: string;
  version: string;
  wordCount: number;
  wordIds: string[];
  assets: LibraryAsset[];
};

export function createContentService(deps: {
  baseUrl: string;
  fetchJson: (url: string) => Promise<unknown>;
  repository: {
    beginImport: (libraryId: string) => Promise<void>;
    commitImport: (libraryId: string, payload: unknown) => Promise<void>;
  };
}) {
  async function loadTopLevelManifest() {
    return deps.fetchJson(`${deps.baseUrl}/manifest.json`) as Promise<TopLevelManifest>;
  }

  async function loadLibraryManifest(libraryId: string, version: string) {
    const url = `${deps.baseUrl}/${libraryId}/${version}/library-manifest.json`;
    return deps.fetchJson(url) as Promise<LibraryManifestV1>;
  }

  return {
    async listAvailableLibraries() {
      return (await loadTopLevelManifest()).libraries;
    },
    async importLibrary(libraryId: string) {
      const topLevel = await loadTopLevelManifest();
      const libraryMeta = topLevel.libraries.find((item) => item.libraryId === libraryId);
      if (!libraryMeta) throw new Error(`Library not found: ${libraryId}`);

      const libManifest = await loadLibraryManifest(libraryId, libraryMeta.version);
      await deps.repository.beginImport(libraryId);

      // Separate word shards, search index, and order from assets
      const wordShardNames: string[] = [];
      let searchIndexName = '';
      let orderName = '';

      for (const asset of libManifest.assets) {
        if (asset.name.startsWith('words-') && asset.name.endsWith('.json')) {
          wordShardNames.push(asset.name);
        } else if (asset.name === 'search-index.json') {
          searchIndexName = asset.name;
        } else if (asset.name === 'order.json') {
          orderName = asset.name;
        }
      }

      wordShardNames.sort();

      // Fetch word shards
      const baseUrl = `${deps.baseUrl}/${libraryId}/${libraryMeta.version}`;
      const shardData: unknown[] = [];
      for (const shardName of wordShardNames) {
        shardData.push(await deps.fetchJson(`${baseUrl}/${shardName}`));
      }

      // Fetch search index and order
      const searchIndex = searchIndexName ? await deps.fetchJson(`${baseUrl}/${searchIndexName}`) : [];
      const order: string[] = orderName
        ? (await deps.fetchJson(`${baseUrl}/${orderName}`)) as string[]
        : (shardData.flat() as Array<{ id: string }>).map((w) => w.id);

      const payload = { libraryId, version: libraryMeta.version, shardData, searchIndex, order };
      await deps.repository.commitImport(libraryId, payload);
      return payload;
    },
  };
}
