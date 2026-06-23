const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../miniprogram');
const appConfig = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'app.json'),
  'utf8'
));

test('every registered page module loads and registers one Page definition', () => {
  for (const page of appConfig.pages) {
    const registrations = [];
    global.Page = (definition) => registrations.push(definition);
    const modulePath = path.join(ROOT, `${page}.js`);
    jest.isolateModules(() => {
      require(modulePath);
    });
    expect(registrations).toHaveLength(1);
    expect(registrations[0]).toEqual(expect.any(Object));
  }
  delete global.Page;
});
