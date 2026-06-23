import { loadAndValidateSources } from './content-lib.mjs';

const { words, libraries } = loadAndValidateSources();
console.log(`Validated ${words.length} words across ${libraries.length} libraries.`);
