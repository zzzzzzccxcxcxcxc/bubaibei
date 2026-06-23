const {
  buildHomeViewModel,
} = require('../miniprogram/pages/home/index');

test('home exposes continue-reading and three familiarity counts', () => {
  const vm = buildHomeViewModel({
    libraries: [{ libraryId: 'core', title: '核心词汇' }],
    counts: { familiar: 2, review: 3, unknown: 4 },
    progress: { core: { anchorWordId: 'word_abandon', updatedAt: 1000 } },
  });
  expect(vm.totalMarked).toBe(9);
  expect(vm.continueLibraryId).toBe('core');
  expect(vm.counts).toEqual({ familiar: 2, review: 3, unknown: 4 });
});

test('home uses the most recently read installed library', () => {
  const vm = buildHomeViewModel({
    libraries: [
      { libraryId: 'core', title: '核心词汇' },
      { libraryId: 'outline', title: '大纲词汇' },
    ],
    counts: { familiar: 0, review: 0, unknown: 0 },
    progress: {
      core: { anchorWordId: 'word_a', updatedAt: 1000 },
      outline: { anchorWordId: 'word_b', updatedAt: 2000 },
    },
  });
  expect(vm.continueLibraryId).toBe('outline');
});
