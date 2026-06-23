const { sha256 } = require('../domain/sha256');

function createWxFiles(wxApi) {
  const fs = wxApi.getFileSystemManager();
  const root = wxApi.env.USER_DATA_PATH;
  const absolute = (relativePath) =>
    `${String(root).replace(/\/+$/, '')}/${String(relativePath).replace(/^\/+/, '')}`;
  const isExternalPath = (filePath) =>
    /^[a-z][a-z0-9+.-]*:\/\//i.test(filePath)
    || /^[A-Za-z]:[\\/]/.test(filePath)
    || filePath.startsWith('/');

  function call(method, options) {
    return new Promise((resolve, reject) => {
      fs[method]({
        ...options,
        success: resolve,
        fail: reject,
      });
    });
  }

  async function mkdir(relativePath) {
    await call('mkdir', { dirPath: absolute(relativePath), recursive: true });
  }

  async function removeTree(relativePath) {
    try {
      await call('rmdir', { dirPath: absolute(relativePath), recursive: true });
    } catch (error) {
      if (!error?.errMsg?.includes('no such file')) throw error;
    }
  }

  async function writeJson(relativePath, value) {
    const parent = relativePath.split('/').slice(0, -1).join('/');
    if (parent) await mkdir(parent);
    await call('writeFile', {
      filePath: absolute(relativePath),
      data: JSON.stringify(value),
      encoding: 'utf8',
    });
  }

  async function readJson(relativePath, fallback = null) {
    try {
      const result = await call('readFile', {
        filePath: absolute(relativePath),
        encoding: 'utf8',
      });
      return JSON.parse(result.data);
    } catch (error) {
      if (error?.errMsg?.includes('no such file')) return fallback;
      throw error;
    }
  }

  return {
    absolute,
    mkdir,
    removeTree,
    readJson,
    writeJson,

    async exists(relativePath) {
      try {
        await call('access', { path: absolute(relativePath) });
        return true;
      } catch (_error) {
        return false;
      }
    },

    async fileSize(filePath) {
      const result = await call('stat', {
        path: isExternalPath(filePath) ? filePath : absolute(filePath),
      });
      return result.stats.size;
    },

    async copy(sourcePath, destination) {
      const parent = destination.split('/').slice(0, -1).join('/');
      if (parent) await mkdir(parent);
      await call('copyFile', {
        srcPath: sourcePath,
        destPath: absolute(destination),
      });
    },

    async removeFile(relativePath) {
      try {
        await call('unlink', { filePath: absolute(relativePath) });
      } catch (error) {
        if (!error?.errMsg?.includes('no such file')) throw error;
      }
    },

    async move(fromRelativePath, toRelativePath) {
      const parent = toRelativePath.split('/').slice(0, -1).join('/');
      if (parent) await mkdir(parent);
      await call('rename', {
        oldPath: absolute(fromRelativePath),
        newPath: absolute(toRelativePath),
      });
    },

    async copyVerified(tempPath, destination, expectedHash) {
      const result = await call('readFile', { filePath: tempPath });
      if (sha256(result.data) !== expectedHash) {
        throw new Error('CHECKSUM_MISMATCH');
      }
      const parent = destination.split('/').slice(0, -1).join('/');
      if (parent) await mkdir(parent);
      await call('copyFile', {
        srcPath: tempPath,
        destPath: absolute(destination),
      });
    },
  };
}

module.exports = { createWxFiles };
