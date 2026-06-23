const { createWxStorage } = require('../miniprogram/adapters/storage');

test('returns fallback when wx storage key is missing', async () => {
  const wxApi = {
    getStorage({ fail }) {
      fail({ errMsg: 'getStorage:fail data not found' });
    },
  };
  const storage = createWxStorage(wxApi);
  await expect(storage.get('missing', { ok: true })).resolves.toEqual({ ok: true });
});

test('rejects storage failures unrelated to a missing key', async () => {
  const wxApi = {
    getStorage({ fail }) {
      fail({ errMsg: 'getStorage:fail system error' });
    },
  };
  const storage = createWxStorage(wxApi);
  await expect(storage.get('broken')).rejects.toEqual({
    errMsg: 'getStorage:fail system error',
  });
});

test('delegates set and remove to asynchronous wx APIs', async () => {
  const calls = [];
  const wxApi = {
    setStorage({ key, data, success }) {
      calls.push(['set', key, data]);
      success();
    },
    removeStorage({ key, success }) {
      calls.push(['remove', key]);
      success();
    },
  };
  const storage = createWxStorage(wxApi);
  await storage.set('key', { value: 1 });
  await storage.remove('key');
  expect(calls).toEqual([
    ['set', 'key', { value: 1 }],
    ['remove', 'key'],
  ]);
});
