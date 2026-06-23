const { execFileSync } = require('node:child_process');
const path = require('node:path');

test('project structure and source syntax pass static validation', () => {
  execFileSync(process.execPath, ['scripts/validate-project.mjs'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'pipe',
  });
});
