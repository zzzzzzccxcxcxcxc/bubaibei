const { WORD_ID_PATTERN } = require('./validate-word');

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const LIBRARY_ID_PATTERN = /^[a-z0-9-]+$/;

function validateAsset(asset, index, errors) {
  if (!asset?.name || !asset?.fileId) {
    errors.push(`assets[${index}] requires name and fileId`);
  }
  if (!Number.isInteger(asset?.bytes) || asset.bytes < 0) {
    errors.push(`assets[${index}] has invalid bytes`);
  }
  if (!SHA256_PATTERN.test(asset?.sha256 || '')) {
    errors.push(`assets[${index}] has invalid sha256`);
  }
}

function validateManifest(manifest) {
  const errors = [];
  const wordIds = Array.isArray(manifest?.wordIds) ? manifest.wordIds : [];
  const assets = Array.isArray(manifest?.assets) ? manifest.assets : [];

  if (!LIBRARY_ID_PATTERN.test(manifest?.libraryId || '')) {
    errors.push('invalid libraryId');
  }
  if (!SEMVER_PATTERN.test(manifest?.version || '')) {
    errors.push('invalid version');
  }
  if (!Number.isInteger(manifest?.formatVersion) || manifest.formatVersion < 1) {
    errors.push('invalid formatVersion');
  }
  if (!Number.isInteger(manifest?.bytes) || manifest.bytes < 0) {
    errors.push('invalid bytes');
  }
  if (!SHA256_PATTERN.test(manifest?.sha256 || '')) {
    errors.push('invalid sha256');
  }
  if (!Number.isInteger(manifest?.wordCount) || manifest.wordCount !== wordIds.length) {
    errors.push('wordCount does not match wordIds');
  }

  wordIds.forEach((id) => {
    if (!WORD_ID_PATTERN.test(id)) {
      errors.push(`wordIds contains invalid id: ${id}`);
    }
  });
  if (new Set(wordIds).size !== wordIds.length) {
    errors.push('wordIds contains duplicates');
  }
  if (assets.length === 0) {
    errors.push('assets requires at least one item');
  }
  assets.forEach((asset, index) => validateAsset(asset, index, errors));

  return { ok: errors.length === 0, errors };
}

module.exports = {
  SHA256_PATTERN,
  validateManifest,
};
