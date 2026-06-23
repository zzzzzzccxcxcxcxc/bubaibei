const {
  createProgressSaver,
} = require('../miniprogram/services/progress-saver');

jest.useFakeTimers();

test('debounces progress writes and flushes the latest value', async () => {
  const repository = { saveProgress: jest.fn(async () => {}) };
  const saver = createProgressSaver(repository, 500);
  saver.schedule('core', { anchorWordId: 'word_a', updatedAt: 1 });
  saver.schedule('core', { anchorWordId: 'word_b', updatedAt: 2 });
  expect(repository.saveProgress).not.toHaveBeenCalled();
  await saver.flush();
  expect(repository.saveProgress).toHaveBeenCalledWith('core', {
    anchorWordId: 'word_b',
    updatedAt: 2,
  });
});

test('writes after the debounce interval', async () => {
  const repository = { saveProgress: jest.fn(async () => {}) };
  const saver = createProgressSaver(repository, 500);
  saver.schedule('core', { anchorWordId: 'word_a', updatedAt: 1 });
  await jest.advanceTimersByTimeAsync(500);
  expect(repository.saveProgress).toHaveBeenCalledTimes(1);
});
