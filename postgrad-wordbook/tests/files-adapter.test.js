const { createWxFiles } = require('../miniprogram/adapters/files');

function createFakeWx() {
  const calls = [];
  const manager = {
    access({ path, success }) {
      calls.push(['access', path]);
      success();
    },
    stat({ path, success }) {
      calls.push(['stat', path]);
      success({ stats: { size: 123 } });
    },
  };
  return {
    calls,
    env: { USER_DATA_PATH: 'wxfile://usr' },
    getFileSystemManager: () => manager,
  };
}

test('preserves the wxfile scheme when resolving persistent paths', () => {
  const wxApi = createFakeWx();
  const files = createWxFiles(wxApi);
  expect(files.absolute('audio/example.mp3'))
    .toBe('wxfile://usr/audio/example.mp3');
});

test('stats a cloud temporary path without prefixing USER_DATA_PATH', async () => {
  const wxApi = createFakeWx();
  const files = createWxFiles(wxApi);
  await expect(files.fileSize('wxfile://tmp_abc')).resolves.toBe(123);
  expect(wxApi.calls).toContainEqual(['stat', 'wxfile://tmp_abc']);
});

test('stats a relative path inside USER_DATA_PATH', async () => {
  const wxApi = createFakeWx();
  const files = createWxFiles(wxApi);
  await files.fileSize('audio/example.mp3');
  expect(wxApi.calls).toContainEqual([
    'stat',
    'wxfile://usr/audio/example.mp3',
  ]);
});
