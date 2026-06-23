import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './content-lib.mjs';

const miniprogramRoot = path.join(ROOT, 'miniprogram');
const errors = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function relative(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function validateJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${relative(filePath)}: invalid JSON: ${error.message}`);
    return null;
  }
}

function validateWxml(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  for (const pattern of [/\.join\s*\(/, /\.indexOf\s*\(/]) {
    if (pattern.test(source)) {
      errors.push(
        `${relative(filePath)}: unsupported function call in WXML: ${pattern}`
      );
    }
  }

  const withoutComments = source.replace(/<!--[\s\S]*?-->/g, '');
  const stack = [];
  const tagPattern = /<\/?([A-Za-z][\w-]*)\b[^>]*>/g;
  let match;
  while ((match = tagPattern.exec(withoutComments))) {
    const token = match[0];
    const tag = match[1];
    if (token.startsWith('</')) {
      const opened = stack.pop();
      if (opened !== tag) {
        errors.push(
          `${relative(filePath)}: closing </${tag}> does not match <${opened || 'none'}>`
        );
        return;
      }
    } else if (!token.endsWith('/>')) {
      stack.push(tag);
    }
  }
  if (stack.length > 0) {
    errors.push(
      `${relative(filePath)}: unclosed WXML tag(s): ${stack.join(', ')}`
    );
  }
}

const allFiles = walk(ROOT).filter(
  (filePath) => !filePath.includes(`${path.sep}node_modules${path.sep}`)
    && !filePath.includes(`${path.sep}deployment${path.sep}`)
    && !filePath.includes(`${path.sep}content${path.sep}dist${path.sep}`)
);

for (const filePath of allFiles.filter((file) => file.endsWith('.json'))) {
  validateJson(filePath);
}
for (const filePath of allFiles.filter((file) => file.endsWith('.js'))) {
  try {
    execFileSync(process.execPath, ['--check', filePath], { stdio: 'pipe' });
  } catch (error) {
    errors.push(`${relative(filePath)}: JavaScript syntax error`);
  }
}
for (const filePath of allFiles.filter((file) => file.endsWith('.wxml'))) {
  validateWxml(filePath);
}

const appConfig = validateJson(path.join(miniprogramRoot, 'app.json'));
const pages = appConfig?.pages || [];
if (new Set(pages).size !== pages.length) {
  errors.push('miniprogram/app.json: duplicate page registration');
}
for (const page of pages) {
  for (const extension of ['js', 'json', 'wxml', 'wxss']) {
    const filePath = path.join(miniprogramRoot, `${page}.${extension}`);
    if (!fs.existsSync(filePath)) {
      errors.push(`missing page file: ${relative(filePath)}`);
    }
  }
}

for (const jsonPath of allFiles.filter((file) => file.endsWith('.json'))) {
  const config = validateJson(jsonPath);
  for (const [name, componentPath] of Object.entries(
    config?.usingComponents || {}
  )) {
    const base = componentPath.startsWith('/')
      ? path.join(miniprogramRoot, componentPath.slice(1))
      : path.resolve(path.dirname(jsonPath), componentPath);
    for (const extension of ['js', 'json', 'wxml', 'wxss']) {
      if (!fs.existsSync(`${base}.${extension}`)) {
        errors.push(
          `${relative(jsonPath)}: component ${name} missing ${base}.${extension}`
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${pages.length} pages, `
    + `${allFiles.filter((file) => file.endsWith('.wxml')).length} WXML files, `
    + `${allFiles.filter((file) => file.endsWith('.js')).length} JavaScript files.`
  );
}
