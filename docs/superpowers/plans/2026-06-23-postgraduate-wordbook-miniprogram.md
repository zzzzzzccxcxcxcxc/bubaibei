# 2027 考研英语词书微信小程序 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个兼容 iOS 与 Android 微信、支持词库下载、连续词书阅读、三档熟悉度、英美发音和双向选择题测试的体验版小程序。

**Architecture:** 在独立目录 `postgrad-wordbook/` 中建立原生微信小程序。客户端以纯 JavaScript 领域模块承载校验、搜索、熟悉度和出题逻辑，以微信 API 适配器承载存储、文件、网络和音频能力；微信云开发只分发公共词库清单、数据分片和音频，不保存用户学习数据。内容制作使用独立 Node.js 工具链，将经来源审核的 CSV/JSON 编译为带校验值的词库包。

**Tech Stack:** 原生微信小程序、微信云开发、JavaScript、Node.js、Jest、`miniprogram-simulate`、微信开发者工具与真机调试。

---

## 0. 实施边界

本计划只实现已确认的首版范围：

- 连续词书阅读，不实现翻面卡片。
- 用户数据仅保存在本地，不实现登录与云同步。
- 词库通过微信云开发按包下载。
- 支持英音、美音、三档熟悉度、分类复习、英选中和中选英。
- 首轮开发使用小型合法测试数据；正式体验验收前，再导入 500–1000 个已审核词条。

工作区目前包含其他项目且存在大量未跟踪文件。执行前必须用独立 worktree 或至少独立子目录工作，不得批量暂存现有文件。

## 1. 文件结构

```text
postgrad-wordbook/
├─ package.json                         # Node 测试、校验和内容构建命令
├─ project.config.json                  # 微信开发者工具项目配置；开发期使用 touristappid
├─ project.private.config.json          # 本机私有配置，不提交
├─ jest.config.cjs
├─ docs/
│  ├─ content-sources.md                # 内容来源、许可和真题摘录审核记录
│  └─ device-acceptance.md              # iOS/Android 真机验收表
├─ miniprogram/
│  ├─ app.js
│  ├─ app.json
│  ├─ app.wxss
│  ├─ sitemap.json
│  ├─ components/
│  │  └─ word-entry/
│  │     ├─ index.js                    # 单词模块交互
│  │     ├─ index.json
│  │     ├─ index.wxml
│  │     ├─ index.wxss
│  │     └─ index.test.js
│  ├─ domain/
│  │  ├─ constants.js                  # 熟悉度、测试类型、格式版本
│  │  ├─ validate-word.js              # 主词条校验
│  │  ├─ validate-manifest.js           # 云端清单校验
│  │  ├─ search.js                     # 搜索、字母索引、多条件筛选
│  │  └─ quiz.js                       # 出题和计分
│  ├─ adapters/
│  │  ├─ storage.js                    # wx storage 封装
│  │  ├─ files.js                      # USER_DATA_PATH 文件封装
│  │  ├─ cloud.js                      # 云开发下载封装
│  │  └─ audio.js                      # InnerAudioContext 封装
│  ├─ repositories/
│  │  ├─ learning-repository.js         # 熟悉度、偏好、最近测试
│  │  ├─ library-repository.js          # 已安装词库与分片读取
│  │  └─ progress-repository.js         # 阅读位置
│  ├─ services/
│  │  ├─ migration-service.js           # 本地格式迁移
│  │  ├─ library-service.js             # 下载、校验、原子安装、删除
│  │  ├─ reader-service.js              # 窗口化读取和筛选
│  │  └─ audio-cache-service.js         # 下载、LRU 缓存和播放
│  └─ pages/
│     ├─ home/                           # 首页与统计
│     ├─ libraries/                      # 词库中心
│     ├─ reader/                         # 连续词书阅读
│     ├─ review/                         # 分类复习条件选择
│     ├─ quiz-setup/                     # 测试条件选择
│     ├─ quiz-session/                   # 答题
│     ├─ quiz-result/                    # 结果与错词
│     └─ settings/                       # 字号、发音、缓存和数据说明
├─ cloudfunctions/
│  └─ getLibraryManifest/
│     ├─ index.js                        # 返回公开词库清单
│     └─ package.json
├─ content/
│  ├─ source/
│  │  ├─ words.sample.json               # 小型开发数据
│  │  └─ libraries.sample.json
│  ├─ schemas/
│  │  ├─ word.schema.json
│  │  └─ library.schema.json
│  └─ dist/                              # 构建产物，不手工编辑
├─ scripts/
│  ├─ validate-content.mjs               # 来源与字段校验
│  ├─ build-library-pack.mjs             # 分片、索引、hash、manifest
│  └─ verify-pack.mjs                    # 对构建结果做独立复核
└─ tests/
   ├─ fixtures/
   │  ├─ words.js
   │  └─ manifest.js
   ├─ validate-word.test.js
   ├─ search.test.js
   ├─ storage.test.js
   ├─ migration.test.js
   ├─ library-service.test.js
   ├─ reader-service.test.js
   ├─ learning-repository.test.js
   ├─ audio-cache-service.test.js
   ├─ quiz.test.js
   └─ content-build.test.js
```

## 2. 稳定接口

后续任务必须沿用以下字段和函数名，避免模块之间漂移：

```js
const FAMILIARITY = Object.freeze({
  FAMILIAR: 'familiar',
  REVIEW: 'review',
  UNKNOWN: 'unknown',
});

const QUIZ_TYPE = Object.freeze({
  EN_TO_ZH: 'en-to-zh',
  ZH_TO_EN: 'zh-to-en',
});

// repositories/learning-repository.js
getWordState(wordId);
setFamiliarity(wordId, familiarity, now);
getCounts(wordIds);
saveLastQuiz(result);
getLastQuiz();

// repositories/progress-repository.js
getProgress(libraryId);
saveProgress(libraryId, { anchorWordId, offsetTop, updatedAt });

// services/library-service.js
listAvailableLibraries();
listInstalledLibraries();
installLibrary(libraryId);
removeLibrary(libraryId);

// services/reader-service.js
openLibrary(libraryId);
queryWords({ libraryIds, familiarity, letter, query });
getWindow({ orderedIds, start, size });

// services/audio-cache-service.js
play(wordId, accent);
clearCache();
getCacheStats();
```

---

### Task 1: 创建独立项目骨架与测试基线

**Files:**
- Create: `postgrad-wordbook/package.json`
- Create: `postgrad-wordbook/jest.config.cjs`
- Create: `postgrad-wordbook/project.config.json`
- Create: `postgrad-wordbook/.gitignore`
- Create: `postgrad-wordbook/miniprogram/app.js`
- Create: `postgrad-wordbook/miniprogram/app.json`
- Create: `postgrad-wordbook/miniprogram/app.wxss`
- Create: `postgrad-wordbook/miniprogram/domain/constants.js`
- Test: `postgrad-wordbook/tests/constants.test.js`

- [ ] **Step 1: 写失败测试，固定首版枚举与数据版本**

```js
const { FAMILIARITY, QUIZ_TYPE, DATA_VERSION } =
  require('../miniprogram/domain/constants');

test('exports stable v1 domain constants', () => {
  expect(FAMILIARITY).toEqual({
    FAMILIAR: 'familiar',
    REVIEW: 'review',
    UNKNOWN: 'unknown',
  });
  expect(QUIZ_TYPE).toEqual({
    EN_TO_ZH: 'en-to-zh',
    ZH_TO_EN: 'zh-to-en',
  });
  expect(DATA_VERSION).toBe(1);
});
```

- [ ] **Step 2: 安装依赖并确认测试因模块缺失失败**

Run:

```powershell
cd postgrad-wordbook
npm install
npm test -- tests/constants.test.js
```

Expected: FAIL，提示找不到 `miniprogram/domain/constants`。

- [ ] **Step 3: 写最小项目配置与常量实现**

`package.json` 至少包含：

```json
{
  "name": "postgrad-wordbook",
  "private": true,
  "scripts": {
    "test": "jest --runInBand",
    "test:watch": "jest --watch",
    "content:validate": "node scripts/validate-content.mjs",
    "content:build": "node scripts/build-library-pack.mjs",
    "content:verify": "node scripts/verify-pack.mjs"
  },
  "devDependencies": {
    "jest": "^30.0.0",
    "miniprogram-simulate": "^1.6.0"
  }
}
```

`constants.js`：

```js
const FAMILIARITY = Object.freeze({
  FAMILIAR: 'familiar',
  REVIEW: 'review',
  UNKNOWN: 'unknown',
});
const QUIZ_TYPE = Object.freeze({
  EN_TO_ZH: 'en-to-zh',
  ZH_TO_EN: 'zh-to-en',
});
const DATA_VERSION = 1;

module.exports = { FAMILIARITY, QUIZ_TYPE, DATA_VERSION };
```

`app.json` 注册 `home`、`libraries`、`reader`、`review`、`quiz-setup`、`quiz-session`、`quiz-result` 和 `settings` 页面。Task 1 的 `app.js` 只初始化云开发；Task 3 再接入迁移服务，不在入口文件放业务逻辑。

- [ ] **Step 4: 运行测试和 JSON 语法检查**

Run:

```powershell
npm test -- tests/constants.test.js
node -e "JSON.parse(require('fs').readFileSync('project.config.json')); JSON.parse(require('fs').readFileSync('miniprogram/app.json'))"
```

Expected: Jest 1 test PASS；Node 命令退出码 0。

- [ ] **Step 5: 只提交项目骨架**

```powershell
git add postgrad-wordbook
git commit -m "chore: scaffold wordbook mini program"
```

### Task 2: 定义并校验词条与词库清单

**Files:**
- Create: `postgrad-wordbook/miniprogram/domain/validate-word.js`
- Create: `postgrad-wordbook/miniprogram/domain/validate-manifest.js`
- Create: `postgrad-wordbook/tests/fixtures/words.js`
- Create: `postgrad-wordbook/tests/fixtures/manifest.js`
- Test: `postgrad-wordbook/tests/validate-word.test.js`

- [ ] **Step 1: 写词条和清单的失败测试**

```js
const { validateWord } = require('../miniprogram/domain/validate-word');
const { validateManifest } = require('../miniprogram/domain/validate-manifest');
const { validWord } = require('./fixtures/words');
const { validManifest } = require('./fixtures/manifest');

test('accepts a complete sourced word entry', () => {
  expect(validateWord(validWord)).toEqual({ ok: true, errors: [] });
});

test('rejects an exam quote without year, type, and source', () => {
  const word = structuredClone(validWord);
  word.examExamples[0] = { text: 'A short sentence.' };
  expect(validateWord(word).errors).toContain(
    'examExamples[0] requires translation, year, questionType, sourceId'
  );
});

test('rejects a manifest without sha256 or stable ordered ids', () => {
  const manifest = { ...validManifest, sha256: '', wordIds: ['bad id'] };
  expect(validateManifest(manifest).ok).toBe(false);
});
```

- [ ] **Step 2: 确认测试因校验器缺失失败**

Run: `npm test -- tests/validate-word.test.js`

Expected: FAIL with module-not-found。

- [ ] **Step 3: 实现明确、无隐式补值的校验器**

```js
function validateWord(word) {
  const errors = [];
  if (!/^word_[a-z0-9-]+$/.test(word?.id || '')) errors.push('invalid id');
  if (!/^[A-Za-z][A-Za-z -]*$/.test(word?.word || '')) errors.push('invalid word');
  if (!Array.isArray(word?.senses) || word.senses.length === 0) {
    errors.push('senses requires at least one item');
  }
  (word?.examExamples || []).forEach((item, index) => {
    const required = ['translation', 'year', 'questionType', 'sourceId'];
    if (required.some((key) => !item[key])) {
      errors.push(
        `examExamples[${index}] requires translation, year, questionType, sourceId`
      );
    }
  });
  if (!Array.isArray(word?.sources) || word.sources.length === 0) {
    errors.push('sources requires at least one item');
  }
  return { ok: errors.length === 0, errors };
}
```

`validateManifest` 必须验证 `libraryId`、语义版本、格式版本、字节数、64 位十六进制 SHA-256、非重复 `wordIds` 和分片列表。

- [ ] **Step 4: 运行校验测试**

Run: `npm test -- tests/validate-word.test.js`

Expected: 3 tests PASS。

- [ ] **Step 5: 提交数据契约**

```powershell
git add postgrad-wordbook/miniprogram/domain postgrad-wordbook/tests
git commit -m "feat: define wordbook data contracts"
```

### Task 3: 实现本地存储、学习记录和迁移

**Files:**
- Create: `postgrad-wordbook/miniprogram/adapters/storage.js`
- Create: `postgrad-wordbook/miniprogram/repositories/learning-repository.js`
- Create: `postgrad-wordbook/miniprogram/repositories/progress-repository.js`
- Create: `postgrad-wordbook/miniprogram/services/migration-service.js`
- Modify: `postgrad-wordbook/miniprogram/app.js`
- Test: `postgrad-wordbook/tests/storage.test.js`
- Test: `postgrad-wordbook/tests/learning-repository.test.js`
- Test: `postgrad-wordbook/tests/migration.test.js`

- [ ] **Step 1: 写失败测试，使用内存 storage 替身**

```js
const { createLearningRepository } =
  require('../miniprogram/repositories/learning-repository');

test('updates one word without replacing other learning states', () => {
  const data = new Map();
  const storage = {
    get: async (key, fallback) => data.has(key) ? data.get(key) : fallback,
    set: async (key, value) => data.set(key, value),
  };
  const repo = createLearningRepository(storage);
  return repo.setFamiliarity('word_abandon', 'review', 1000)
    .then(() => repo.setFamiliarity('word_ability', 'familiar', 2000))
    .then(() => repo.getWordState('word_abandon'))
    .then((state) => expect(state.familiarity).toBe('review'));
});
```

另写迁移测试：v0 `{ known: true }` 必须迁移为 v1 `{ familiarity: "familiar" }`；迁移失败不得覆盖原值。

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npm test -- tests/storage.test.js tests/learning-repository.test.js tests/migration.test.js
```

Expected: FAIL，三个模块尚不存在。

- [ ] **Step 3: 实现异步 storage 适配器和注入式 repository**

```js
function createWxStorage(wxApi) {
  return {
    get(key, fallback = null) {
      return new Promise((resolve, reject) => wxApi.getStorage({
        key,
        success: ({ data }) => resolve(data),
        fail: (error) => error?.errMsg?.includes('data not found')
          ? resolve(fallback)
          : reject(error),
      }));
    },
    set(key, data) {
      return new Promise((resolve, reject) => wxApi.setStorage({
        key, data, success: resolve, fail: reject,
      }));
    },
    remove(key) {
      return new Promise((resolve, reject) => wxApi.removeStorage({
        key, success: resolve, fail: reject,
      }));
    },
  };
}
```

存储键固定为 `learning:v1`、`progress:v1`、`settings:v1`、`migration:version`。禁止使用 `wx.clearStorage`，以免误删其他数据。

- [ ] **Step 4: 运行全部本地数据测试**

Run:

```powershell
npm test -- tests/storage.test.js tests/learning-repository.test.js tests/migration.test.js
```

Expected: 所有测试 PASS。

- [ ] **Step 5: 提交本地数据层**

```powershell
git add postgrad-wordbook/miniprogram/adapters postgrad-wordbook/miniprogram/repositories postgrad-wordbook/miniprogram/services/migration-service.js postgrad-wordbook/tests
git commit -m "feat: add local learning data repositories"
```

### Task 4: 实现内容构建、分片和独立校验

**Files:**
- Create: `postgrad-wordbook/content/source/words.sample.json`
- Create: `postgrad-wordbook/content/source/libraries.sample.json`
- Create: `postgrad-wordbook/content/schemas/word.schema.json`
- Create: `postgrad-wordbook/content/schemas/library.schema.json`
- Create: `postgrad-wordbook/scripts/validate-content.mjs`
- Create: `postgrad-wordbook/scripts/build-library-pack.mjs`
- Create: `postgrad-wordbook/scripts/verify-pack.mjs`
- Test: `postgrad-wordbook/tests/content-build.test.js`

- [ ] **Step 1: 写失败测试，要求构建结果可复现**

```js
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

test('builds a verified manifest and deterministic shards', () => {
  execFileSync(process.execPath, ['scripts/build-library-pack.mjs'], {
    cwd: process.cwd(),
  });
  execFileSync(process.execPath, ['scripts/verify-pack.mjs'], {
    cwd: process.cwd(),
  });
  const manifest = JSON.parse(
    fs.readFileSync('content/dist/manifest.json', 'utf8')
  );
  expect(manifest.libraries[0].sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(manifest.libraries[0].wordCount).toBeGreaterThan(0);
});
```

- [ ] **Step 2: 确认构建脚本缺失导致失败**

Run: `npm test -- tests/content-build.test.js`

Expected: FAIL，找不到 `build-library-pack.mjs`。

- [ ] **Step 3: 实现构建流水线**

构建器必须：

1. 调用词条与来源校验。
2. 按稳定 `id` 去重主词条。
3. 按每片最多 200 条生成 `words-0001.json` 等分片。
4. 生成仅含 `id/word/initial/senseKeywords/partOfSpeech` 的轻量搜索索引。
5. 生成词库排序 ID 列表。
6. 对每个产物计算 SHA-256 和字节数。
7. 写入临时目录，全部成功后替换 `content/dist`。
8. manifest 中的 `updatedAt` 读取源文件显式版本时间，不使用构建时当前时间，确保重复构建完全一致。

核心 hash 代码：

```js
import { createHash } from 'node:crypto';
const sha256 = (buffer) =>
  createHash('sha256').update(buffer).digest('hex');
```

- [ ] **Step 4: 验证构建结果与重复构建一致**

Run:

```powershell
npm run content:validate
npm run content:build
npm run content:verify
$first=(Get-FileHash content/dist/manifest.json -Algorithm SHA256).Hash
npm run content:build
$second=(Get-FileHash content/dist/manifest.json -Algorithm SHA256).Hash
if ($first -ne $second) { throw 'Non-deterministic build' }
npm test -- tests/content-build.test.js
```

Expected: 三个内容命令退出码 0；两次 hash 相同；Jest PASS。

- [ ] **Step 5: 提交内容工具链和小型测试数据**

```powershell
git add postgrad-wordbook/content postgrad-wordbook/scripts postgrad-wordbook/tests/content-build.test.js
git commit -m "feat: add deterministic library pack builder"
```

### Task 5: 实现词库清单、下载与原子安装

**Files:**
- Create: `postgrad-wordbook/miniprogram/adapters/files.js`
- Create: `postgrad-wordbook/miniprogram/adapters/cloud.js`
- Create: `postgrad-wordbook/miniprogram/repositories/library-repository.js`
- Create: `postgrad-wordbook/miniprogram/services/library-service.js`
- Create: `postgrad-wordbook/cloudfunctions/getLibraryManifest/index.js`
- Create: `postgrad-wordbook/cloudfunctions/getLibraryManifest/package.json`
- Test: `postgrad-wordbook/tests/library-service.test.js`

- [ ] **Step 1: 写下载失败保留旧版本的测试**

```js
test('keeps installed v1 when v2 checksum fails', async () => {
  const files = createFakeFiles({ installedVersion: '1.0.0' });
  const service = createLibraryService({
    cloud: fakeCloudReturningCorruptV2(),
    files,
    repository: createFakeLibraryRepository(),
  });

  await expect(service.installLibrary('core')).rejects.toThrow('CHECKSUM_MISMATCH');
  expect(await files.readJson('libraries/core/current.json'))
    .toEqual({ version: '1.0.0' });
});
```

再写成功安装、删除词库但保留 `learning:v1`、离线读取已安装清单三个测试。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/library-service.test.js`

Expected: FAIL with module-not-found。

- [ ] **Step 3: 实现 staged 安装**

`installLibrary` 流程必须是：

```js
async function installLibrary(libraryId) {
  const manifest = await cloud.getManifest(libraryId);
  validateManifestOrThrow(manifest);
  const stageDir = `libraries/${libraryId}/stage-${manifest.version}`;
  await files.removeTree(stageDir);
  await files.mkdir(stageDir);
  try {
    for (const asset of manifest.assets) {
      const tempPath = await cloud.download(asset.fileId);
      await files.copyVerified(tempPath, `${stageDir}/${asset.name}`, asset.sha256);
    }
    await repository.activate(libraryId, manifest, stageDir);
  } catch (error) {
    await files.removeTree(stageDir);
    throw error;
  }
}
```

激活时先将原版本指针保留为 `previous.json`，写入新 `current.json` 后再删除旧分片。删除词库只删除文件和安装元数据，不删除学习记录。

- [ ] **Step 4: 跑服务测试和全量测试**

Run:

```powershell
npm test -- tests/library-service.test.js
npm test
```

Expected: 全部 PASS。

- [ ] **Step 5: 提交词库基础设施**

```powershell
git add postgrad-wordbook/miniprogram/adapters postgrad-wordbook/miniprogram/repositories/library-repository.js postgrad-wordbook/miniprogram/services/library-service.js postgrad-wordbook/cloudfunctions postgrad-wordbook/tests/library-service.test.js
git commit -m "feat: install and update offline libraries"
```

### Task 6: 实现首页和词库中心

**Files:**
- Create: `postgrad-wordbook/miniprogram/pages/home/index.js`
- Create: `postgrad-wordbook/miniprogram/pages/home/index.json`
- Create: `postgrad-wordbook/miniprogram/pages/home/index.wxml`
- Create: `postgrad-wordbook/miniprogram/pages/home/index.wxss`
- Create: `postgrad-wordbook/miniprogram/pages/libraries/index.js`
- Create: `postgrad-wordbook/miniprogram/pages/libraries/index.json`
- Create: `postgrad-wordbook/miniprogram/pages/libraries/index.wxml`
- Create: `postgrad-wordbook/miniprogram/pages/libraries/index.wxss`
- Create: `postgrad-wordbook/miniprogram/pages/settings/index.js`
- Create: `postgrad-wordbook/miniprogram/pages/settings/index.json`
- Create: `postgrad-wordbook/miniprogram/pages/settings/index.wxml`
- Create: `postgrad-wordbook/miniprogram/pages/settings/index.wxss`
- Test: `postgrad-wordbook/tests/pages-home.test.js`
- Test: `postgrad-wordbook/tests/pages-libraries.test.js`

- [ ] **Step 1: 写页面视图模型失败测试**

```js
test('home exposes continue-reading and three familiarity counts', async () => {
  const vm = await buildHomeViewModel({
    libraries: [{ id: 'core', installed: true }],
    counts: { familiar: 2, review: 3, unknown: 4 },
    progress: { core: { anchorWordId: 'word_abandon' } },
  });
  expect(vm.totalMarked).toBe(9);
  expect(vm.continueLibraryId).toBe('core');
});
```

词库页面测试必须覆盖 `not-installed`、`installed`、`update-available`、`downloading` 和 `error` 五种状态。

- [ ] **Step 2: 确认页面逻辑缺失导致失败**

Run:

```powershell
npm test -- tests/pages-home.test.js tests/pages-libraries.test.js
```

Expected: FAIL。

- [ ] **Step 3: 实现页面和可测试视图模型**

页面 `index.js` 只做事件编排，把纯计算导出为 `buildHomeViewModel` 和 `buildLibraryCards`。下载时显示进度并禁用重复点击；失败提示可重试；删除前用模态框明确“学习标记不会删除”。

设置页必须展示：

- 字号：小、标准、大。
- 默认发音：英音或美音。
- 音频缓存大小与清理入口。
- “清理微信缓存或删除小程序会丢失学习记录”的固定说明。

- [ ] **Step 4: 运行页面单测并在开发者工具手动检查**

Run:

```powershell
npm test -- tests/pages-home.test.js tests/pages-libraries.test.js
```

Expected: PASS。

Manual: 打开开发者工具，确认首页空状态、已安装状态、下载失败状态均无控制台错误。

- [ ] **Step 5: 提交首页和词库中心**

```powershell
git add postgrad-wordbook/miniprogram/pages postgrad-wordbook/tests/pages-*.test.js
git commit -m "feat: add home and library center pages"
```

### Task 7: 实现词条组件与连续阅读窗口

**Files:**
- Create: `postgrad-wordbook/miniprogram/components/word-entry/index.js`
- Create: `postgrad-wordbook/miniprogram/components/word-entry/index.json`
- Create: `postgrad-wordbook/miniprogram/components/word-entry/index.wxml`
- Create: `postgrad-wordbook/miniprogram/components/word-entry/index.wxss`
- Create: `postgrad-wordbook/miniprogram/services/reader-service.js`
- Create: `postgrad-wordbook/miniprogram/pages/reader/index.js`
- Create: `postgrad-wordbook/miniprogram/pages/reader/index.json`
- Create: `postgrad-wordbook/miniprogram/pages/reader/index.wxml`
- Create: `postgrad-wordbook/miniprogram/pages/reader/index.wxss`
- Test: `postgrad-wordbook/miniprogram/components/word-entry/index.test.js`
- Test: `postgrad-wordbook/tests/reader-service.test.js`

- [ ] **Step 1: 写组件和窗口化读取失败测试**

```js
test('returns a bounded reader window', () => {
  const ids = Array.from({ length: 1000 }, (_, i) => `word_${i}`);
  expect(getWindow({ orderedIds: ids, start: 490, size: 30 })).toEqual({
    start: 490,
    end: 520,
    ids: ids.slice(490, 520),
  });
});

test('word entry hides empty optional sections', () => {
  const sections = visibleSections({
    senses: [{ partOfSpeech: 'v.', definitions: ['放弃'] }],
    collocations: [],
    examExamples: [],
  });
  expect(sections).toEqual(['senses']);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npm test -- tests/reader-service.test.js miniprogram/components/word-entry/index.test.js
```

Expected: FAIL。

- [ ] **Step 3: 实现词条信息层级**

WXML 顺序固定为：

```xml
<view class="entry">
  <view class="entry__head"><text class="entry__word">{{word.word}}</text></view>
  <view class="entry__phonetics">英 {{word.phonetics.uk}} · 美 {{word.phonetics.us}}</view>
  <view wx:if="{{sections.senses}}"><!-- 词性与释义 --></view>
  <view wx:if="{{sections.collocations}}"><!-- 搭配 --></view>
  <view wx:if="{{sections.morphology}}"><!-- 词根词缀与记忆提示 --></view>
  <view wx:if="{{sections.relations}}"><!-- 近反义与易混词 --></view>
  <view wx:if="{{sections.examExamples}}"><!-- 真题短句与来源 --></view>
  <view class="entry__actions"><!-- 三档按钮 --></view>
</view>
```

阅读页初始窗口 30 条；距底部 8 条时向后追加 20 条；节点超过 70 条时裁掉远端窗口并保存锚点。恢复时以 `anchorWordId` 为准，像素偏移只作辅助。

- [ ] **Step 4: 运行测试并进行 1000 条模拟滚动**

Run:

```powershell
npm test -- tests/reader-service.test.js miniprogram/components/word-entry/index.test.js
npm test
```

Expected: PASS。

Manual: 在开发者工具加载 1000 条生成数据，连续滚动 3 分钟，页面节点保持在设计上限附近，无明显卡死。

- [ ] **Step 5: 提交阅读核心**

```powershell
git add postgrad-wordbook/miniprogram/components postgrad-wordbook/miniprogram/services/reader-service.js postgrad-wordbook/miniprogram/pages/reader postgrad-wordbook/tests/reader-service.test.js
git commit -m "feat: add continuous wordbook reader"
```

### Task 8: 实现搜索、字母索引、筛选和阅读位置

**Files:**
- Create: `postgrad-wordbook/miniprogram/domain/search.js`
- Modify: `postgrad-wordbook/miniprogram/pages/reader/index.js`
- Modify: `postgrad-wordbook/miniprogram/pages/reader/index.wxml`
- Modify: `postgrad-wordbook/miniprogram/repositories/progress-repository.js`
- Test: `postgrad-wordbook/tests/search.test.js`
- Test: `postgrad-wordbook/tests/progress-repository.test.js`

- [ ] **Step 1: 写精确搜索与组合筛选失败测试**

```js
test('ranks exact word before prefix and definition matches', () => {
  const result = searchIndex(index, 'abandon');
  expect(result.map((x) => x.id)).toEqual([
    'word_abandon',
    'word_abandoned',
    'word_desert',
  ]);
});

test('combines library order, initial and familiarity', () => {
  expect(filterOrderedIds({
    orderedIds: ['word_ability', 'word_abandon', 'word_basic'],
    indexById,
    stateById,
    letter: 'A',
    familiarity: ['review'],
  })).toEqual(['word_abandon']);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npm test -- tests/search.test.js tests/progress-repository.test.js
```

Expected: FAIL。

- [ ] **Step 3: 实现规范化和节流保存**

搜索统一：

```js
const normalize = (value) =>
  String(value || '').trim().toLocaleLowerCase('en-US');
```

排序权重依次为英文完全匹配、英文前缀、英文包含、中文释义关键词。阅读位置每 500 ms 节流保存，并在 `onHide`、`onUnload` 时立即 flush。

- [ ] **Step 4: 运行测试和恢复位置手测**

Run: `npm test -- tests/search.test.js tests/progress-repository.test.js`

Expected: PASS。

Manual: 滚动至中部，退出页面并重进；顶部可见词条与退出前一致。切换筛选后，不覆盖原词库的默认阅读锚点。

- [ ] **Step 5: 提交检索和进度功能**

```powershell
git add postgrad-wordbook/miniprogram/domain/search.js postgrad-wordbook/miniprogram/pages/reader postgrad-wordbook/miniprogram/repositories/progress-repository.js postgrad-wordbook/tests
git commit -m "feat: add reader search filters and progress"
```

### Task 9: 实现三档熟悉度与分类复习

**Files:**
- Modify: `postgrad-wordbook/miniprogram/components/word-entry/index.js`
- Modify: `postgrad-wordbook/miniprogram/components/word-entry/index.wxml`
- Create: `postgrad-wordbook/miniprogram/pages/review/index.js`
- Create: `postgrad-wordbook/miniprogram/pages/review/index.json`
- Create: `postgrad-wordbook/miniprogram/pages/review/index.wxml`
- Create: `postgrad-wordbook/miniprogram/pages/review/index.wxss`
- Modify: `postgrad-wordbook/miniprogram/pages/home/index.js`
- Test: `postgrad-wordbook/tests/review.test.js`

- [ ] **Step 1: 写标记幂等和复习参数测试**

```js
test('marking the same state twice does not inflate counts', async () => {
  await repo.setFamiliarity('word_abandon', 'review', 1000);
  await repo.setFamiliarity('word_abandon', 'review', 2000);
  expect(await repo.getCounts(['word_abandon'])).toEqual({
    familiar: 0, review: 1, unknown: 0,
  });
});

test('review route requires at least one library and one state', () => {
  expect(validateReviewSelection({ libraryIds: [], familiarity: ['review'] }))
    .toEqual({ ok: false, message: '请选择至少一个已下载词库' });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/review.test.js`

Expected: FAIL。

- [ ] **Step 3: 实现组件事件和复习路由**

词条组件触发：

```js
this.triggerEvent('familiaritychange', {
  wordId: this.data.word.id,
  familiarity,
});
```

阅读页持久化成功后立即更新当前词条视觉状态和首页统计缓存。复习页只选择条件，最终复用 reader 页面并通过参数 `mode=review` 区分，不复制第二套阅读实现。

- [ ] **Step 4: 运行测试并手测三档切换**

Run: `npm test -- tests/review.test.js`

Expected: PASS。

Manual: 同一词在三档间切换，首页三项统计始终合计为已标记词数；复习筛选顺序保持词库原顺序。

- [ ] **Step 5: 提交学习标记与复习**

```powershell
git add postgrad-wordbook/miniprogram/components/word-entry postgrad-wordbook/miniprogram/pages/review postgrad-wordbook/miniprogram/pages/home postgrad-wordbook/tests/review.test.js
git commit -m "feat: add familiarity marking and review"
```

### Task 10: 实现英美发音和有上限的音频缓存

**Files:**
- Create: `postgrad-wordbook/miniprogram/adapters/audio.js`
- Create: `postgrad-wordbook/miniprogram/services/audio-cache-service.js`
- Modify: `postgrad-wordbook/miniprogram/components/word-entry/index.js`
- Modify: `postgrad-wordbook/miniprogram/pages/settings/index.js`
- Test: `postgrad-wordbook/tests/audio-cache-service.test.js`

- [ ] **Step 1: 写缓存命中、下载失败和 LRU 淘汰测试**

```js
test('plays cached UK audio without downloading again', async () => {
  const service = createAudioCacheService({
    files: fakeFilesWith('/audio/word_abandon-uk.mp3'),
    cloud: fakeCloud(),
    player: fakePlayer(),
    maxBytes: 1024,
  });
  await service.play('word_abandon', 'uk');
  expect(service.dependencies.cloud.download).not.toHaveBeenCalled();
});

test('evicts least recently used files before saving new audio', async () => {
  const service = createServiceWithCache([
    { path: 'old.mp3', bytes: 700, lastUsedAt: 1 },
    { path: 'new.mp3', bytes: 200, lastUsedAt: 2 },
  ], 1000);
  await service.reserve(300);
  expect(service.cachedPaths()).toEqual(['new.mp3']);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/audio-cache-service.test.js`

Expected: FAIL。

- [ ] **Step 3: 实现单实例播放器和缓存索引**

`audio.js` 只创建一个 `InnerAudioContext`，新播放开始前停止旧音频；页面卸载不销毁全局服务，应用隐藏时停止播放。缓存索引保存 `path/bytes/lastUsedAt/wordId/accent`，默认上限 30 MB，可在设置页清理。

播放失败返回可展示错误码：

```js
const AUDIO_ERROR = Object.freeze({
  NETWORK: 'AUDIO_NETWORK_ERROR',
  SOURCE: 'AUDIO_SOURCE_UNAVAILABLE',
  STORAGE: 'AUDIO_STORAGE_FULL',
});
```

- [ ] **Step 4: 运行测试并分别手测英美音切换**

Run: `npm test -- tests/audio-cache-service.test.js`

Expected: PASS。

Manual: iPhone 和 Android 上分别连续快速点击英音、美音；同一时刻只有一个音频播放；断网后已缓存音频可播放，未缓存音频显示非阻断提示。

- [ ] **Step 5: 提交发音与缓存**

```powershell
git add postgrad-wordbook/miniprogram/adapters/audio.js postgrad-wordbook/miniprogram/services/audio-cache-service.js postgrad-wordbook/miniprogram/components/word-entry postgrad-wordbook/miniprogram/pages/settings postgrad-wordbook/tests/audio-cache-service.test.js
git commit -m "feat: add UK and US pronunciation cache"
```

### Task 11: 实现双向选择题和错词处理

**Files:**
- Create: `postgrad-wordbook/miniprogram/domain/quiz.js`
- Create: `postgrad-wordbook/miniprogram/pages/quiz-setup/index.js`
- Create: `postgrad-wordbook/miniprogram/pages/quiz-setup/index.json`
- Create: `postgrad-wordbook/miniprogram/pages/quiz-setup/index.wxml`
- Create: `postgrad-wordbook/miniprogram/pages/quiz-setup/index.wxss`
- Create: `postgrad-wordbook/miniprogram/pages/quiz-session/index.js`
- Create: `postgrad-wordbook/miniprogram/pages/quiz-session/index.json`
- Create: `postgrad-wordbook/miniprogram/pages/quiz-session/index.wxml`
- Create: `postgrad-wordbook/miniprogram/pages/quiz-session/index.wxss`
- Create: `postgrad-wordbook/miniprogram/pages/quiz-result/index.js`
- Create: `postgrad-wordbook/miniprogram/pages/quiz-result/index.json`
- Create: `postgrad-wordbook/miniprogram/pages/quiz-result/index.wxml`
- Create: `postgrad-wordbook/miniprogram/pages/quiz-result/index.wxss`
- Test: `postgrad-wordbook/tests/quiz.test.js`

- [ ] **Step 1: 写出题、干扰项、计分失败测试**

```js
test('builds an EN_TO_ZH question with one correct option', () => {
  const question = buildQuestion({
    type: 'en-to-zh',
    target: words.abandon,
    pool: Object.values(words),
    random: () => 0.2,
  });
  expect(question.prompt).toBe('abandon');
  expect(question.options).toHaveLength(4);
  expect(question.options.filter((x) => x.correct)).toHaveLength(1);
});

test('prefers same part of speech distractors', () => {
  const question = buildQuestion(fixtureWithMixedPartsOfSpeech);
  expect(question.options.filter((x) => !x.correct).every(
    (x) => x.partOfSpeech === 'v.'
  )).toBe(true);
});

test('scores answers and returns unique wrong word ids', () => {
  expect(scoreSession(answers)).toEqual({
    total: 3, correct: 1, accuracy: 33, wrongWordIds: ['word_abandon'],
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/quiz.test.js`

Expected: FAIL。

- [ ] **Step 3: 实现可注入随机源的纯出题引擎**

题目生成规则：

- 默认 4 个选项；候选不足时允许 2–3 个，不复制选项。
- 干扰项先匹配词性，再匹配 importance，最后从当前范围补足。
- 同一题不能出现重复英文或重复中文主释义。
- 结果只保存最近一次，不建设历史统计。
- 结果页对错词提供批量标记“待巩固”或“陌生”。

- [ ] **Step 4: 运行测试并手测两种测试类型**

Run:

```powershell
npm test -- tests/quiz.test.js
npm test
```

Expected: 全部 PASS。

Manual: 分别完成一轮英选中和中选英；返回上一页不会重复计分；错词批量标记后可在分类复习中查到。

- [ ] **Step 5: 提交测试功能**

```powershell
git add postgrad-wordbook/miniprogram/domain/quiz.js postgrad-wordbook/miniprogram/pages/quiz-* postgrad-wordbook/tests/quiz.test.js
git commit -m "feat: add bilingual multiple choice quizzes"
```

### Task 12: 建立内容审核记录并导入首批 500–1000 词

**Files:**
- Create: `postgrad-wordbook/docs/content-sources.md`
- Create: `postgrad-wordbook/content/source/words.v1.json`
- Create: `postgrad-wordbook/content/source/libraries.v1.json`
- Modify: `postgrad-wordbook/scripts/validate-content.mjs`
- Test: `postgrad-wordbook/tests/content-v1.test.js`

- [ ] **Step 1: 写正式内容门禁失败测试**

```js
test('v1 content contains 500-1000 unique sourced words', () => {
  const words = require('../content/source/words.v1.json');
  expect(words.length).toBeGreaterThanOrEqual(500);
  expect(words.length).toBeLessThanOrEqual(1000);
  expect(new Set(words.map((x) => x.id)).size).toBe(words.length);
  expect(words.every((x) => x.sources.length > 0)).toBe(true);
});

test('every exam excerpt has an auditable source record', () => {
  const words = require('../content/source/words.v1.json');
  const excerpts = words.flatMap((x) => x.examExamples || []);
  expect(excerpts.every((x) =>
    x.year && x.questionType && x.sourceId && x.translation
  )).toBe(true);
});
```

- [ ] **Step 2: 在内容未达到门禁前确认测试失败**

Run: `npm test -- tests/content-v1.test.js`

Expected: FAIL，正式内容文件缺失或不足 500 条。

- [ ] **Step 3: 按审核批次导入内容**

每批 50–100 词执行：

```powershell
npm run content:validate
npm test -- tests/content-v1.test.js
```

`content-sources.md` 对每个来源记录：

```markdown
| sourceId | 名称 | 发布者 | URL/出版信息 | 许可或使用依据 | 获取日期 | 可使用字段 | 审核人 |
|---|---|---|---|---|---|---|---|
```

不得用脚本直接抓取商业词书。2027 官方大纲尚未发布时，词库标题必须写明实际采用的大纲年份，例如“考研英语大纲词汇（依据 2026 官方大纲）”。

- [ ] **Step 4: 构建并复核正式试运行词库**

Run:

```powershell
npm run content:validate
npm run content:build
npm run content:verify
npm test -- tests/content-v1.test.js tests/content-build.test.js
```

Expected: 全部 PASS；构建清单显示 500–1000 个唯一词条；所有来源字段完整。

- [ ] **Step 5: 单独提交内容，便于审计**

```powershell
git add postgrad-wordbook/content postgrad-wordbook/docs/content-sources.md postgrad-wordbook/tests/content-v1.test.js
git commit -m "content: add reviewed postgraduate vocabulary pack"
```

### Task 13: 完成自动化回归与跨平台真机验收

**Files:**
- Create: `postgrad-wordbook/docs/device-acceptance.md`
- Create: `postgrad-wordbook/tests/smoke.test.js`
- Modify: `postgrad-wordbook/package.json`
- Create: `postgrad-wordbook/README.md`

- [ ] **Step 1: 写端到端领域烟雾测试**

```js
test('install -> read -> mark -> update -> quiz preserves learning data', async () => {
  await libraries.installLibrary('core');
  const first = await reader.openLibrary('core');
  await learning.setFamiliarity(first.wordIds[0], 'unknown', 1000);
  await progress.saveProgress('core', {
    anchorWordId: first.wordIds[10], offsetTop: 16, updatedAt: 1000,
  });
  cloud.useManifestVersion('core', '2.0.0');
  await libraries.installLibrary('core');
  expect((await learning.getWordState(first.wordIds[0])).familiarity)
    .toBe('unknown');
  expect((await progress.getProgress('core')).anchorWordId)
    .toBe(first.wordIds[10]);
});
```

- [ ] **Step 2: 运行完整自动测试**

Run:

```powershell
npm run content:validate
npm run content:build
npm run content:verify
npm test
```

Expected: 所有命令退出码 0，Jest 0 failures。

- [ ] **Step 3: 创建并执行真机验收表**

`device-acceptance.md` 必须包含设备型号、系统版本、微信版本、基础库版本和以下逐项结果：

- 词库下载、更新失败回退、删除。
- 断网阅读、搜索、字母索引、组合筛选。
- 三档标记与分类复习。
- 阅读位置恢复和前后台切换。
- 英音、美音播放与离线缓存。
- 两类测试、计分、错词标记。
- 字号变化、安全区域和小屏布局。
- 1000 词连续滚动 3 分钟。
- 本地空间不足和音频不可用提示。

至少在一台 iPhone 和一台 Android 真机完成。任一阻断项失败，都必须修复并重新跑相关自动测试与两台设备的对应场景。

- [ ] **Step 4: 生成体验版前执行最终验证**

Run:

```powershell
git status --short
npm run content:verify
npm test
```

Expected: 只有明确准备提交的文件发生变化；内容校验和测试全部通过。

然后在微信开发者工具中：

1. 选择真实测试 AppID 和云环境。
2. 上传 `content/dist` 到云存储并更新公开 manifest。
3. 上传体验版。
4. 将少数体验者加入体验成员。
5. 用体验版重新执行下载、断网阅读和音频播放三个关键场景。

- [ ] **Step 5: 提交验收记录与使用说明**

```powershell
git add postgrad-wordbook/docs postgrad-wordbook/tests/smoke.test.js postgrad-wordbook/package.json postgrad-wordbook/README.md
git commit -m "test: complete cross-platform acceptance"
```

## 3. 最终完成判定

只有同时满足以下条件才能声明首版完成：

- `npm run content:validate`、`npm run content:build`、`npm run content:verify` 全部成功。
- `npm test` 为 0 failures。
- 500–1000 个词条满足来源和字段门禁。
- iPhone 与 Android 真机验收表无阻断项。
- 体验版可下载词库，断网后可阅读和标记。
- 更新词库后熟悉度和阅读位置仍在。
- 英音、美音与两类选择题在两端均可用。
- Git 只包含本项目和文档的预期变更，没有误提交工作区其他资料。

## 4. 执行顺序与里程碑

- 里程碑 A（Task 1–5）：可下载、校验和离线安装小型测试词库。
- 里程碑 B（Task 6–9）：可像词书一样连续阅读、搜索、标记和分类复习。
- 里程碑 C（Task 10–11）：发音与测试功能完整。
- 里程碑 D（Task 12）：首批 500–1000 个审核词条可用。
- 里程碑 E（Task 13）：iOS/Android 体验版验收通过。

每个里程碑结束时运行全量测试，并在进入下一阶段前检查 Git diff。不要把内容搜集与客户端大规模改动混在同一个提交中。
