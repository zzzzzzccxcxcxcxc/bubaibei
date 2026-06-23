const { sha256 } = require('../miniprogram/domain/sha256');

test('matches the standard SHA-256 vector for abc', () => {
  expect(sha256('abc')).toBe(
    'ba7816bf8f01cfea414140de5dae2223'
    + 'b00361a396177a9cb410ff61f20015ad'
  );
});

test('hashes Uint8Array content', () => {
  expect(sha256(new Uint8Array([97, 98, 99]))).toBe(
    'ba7816bf8f01cfea414140de5dae2223'
    + 'b00361a396177a9cb410ff61f20015ad'
  );
});
