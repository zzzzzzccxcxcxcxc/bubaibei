# 2027 考研英语词书微信小程序

原生微信小程序，面向本人和少数体验者。它采用纸质词书式连续阅读，每个单词一个模块，支持离线词库、三档熟悉度、分类复习、英美发音缓存和双向选择题测试。

## 当前内容

- `2027 备考核心词汇（800词）`
- `2027 备考高频核心（400词）`
- 内容依据 ECDICT 固定提交 `bc015ed2` 的 `ky` 标签和公开语料频次筛选。
- 这两个词库不是尚未发布的“2027 官方大纲”。来源和许可见 [docs/content-sources.md](docs/content-sources.md)。
- ECDICT 首包提供主音标、中文释义和词形变化；真题短句、词根记忆和双口音音频必须经过单独来源审核后再补充，空栏目在界面中自动隐藏。

## 目录

```text
miniprogram/       小程序客户端
cloudfunctions/    微信云函数
content/source/    审核后的主词条和词库顺序
scripts/           内容导入、构建、校验和部署准备
tests/             领域、服务、组件和烟雾测试
docs/              内容来源、云部署和真机验收记录
```

## 本地开发

要求：

- Node.js 20 或更高版本
- 微信开发者工具
- 一个已开通云开发的微信小程序 AppID

安装并验证：

```powershell
npm install
npm run project:validate
npm run content:validate
npm run content:build
npm run content:verify
npm test
```

开发期 `project.config.json` 使用 `touristappid`。真机预览前，在微信开发者工具中导入本目录，并使用自己的 AppID；本机私有设置写入 `project.private.config.json`，该文件不会提交。

## 重新生成词库

ECDICT CSV 不提交到本仓库。固定来源和许可证记录在 `docs/content-sources.md`。

```powershell
npm run content:import:ecdict -- <path-to-ecdict.csv>
npm run content:validate
npm run content:build
npm run content:verify
```

导入器会选取带 `ky` 标签且有音标和中文释义的基础词形，按 BNC/当代语料频次筛选 800 词。构建产物写入 `content/dist/`，每个文件均记录 SHA-256 和字节数。

## 部署微信云开发

1. 在微信开发者工具中创建云环境。
2. 在云存储控制台上传一个文件，复制它的 fileID 前缀，例如 `cloud://env-id.bucket-id`。
3. 生成部署目录：

```powershell
$env:CLOUD_FILE_PREFIX='cloud://env-id.bucket-id'
npm run content:build
npm run cloud:prepare
```

4. 将 `deployment/cloud-storage/` 中的内容按原路径上传到云存储。
5. 创建云数据库集合 `public_config`，导入 `deployment/public_config.library_manifest.json`，文档 `_id` 必须是 `library_manifest`。
6. 在开发者工具中上传并部署 `cloudfunctions/getLibraryManifest`，选择“云端安装依赖”。
7. 在体验版中测试词库下载、断网阅读和版本更新回退。

`cloud:prepare` 只组装文件和真实 fileID，不持有云凭证，也不会直接修改云环境。

## 音频

客户端已实现英音、美音独立播放、30 MB LRU 缓存、离线回放和错误降级。词条的 `audio.uk` / `audio.us` 必须填写为已获许可且已上传到云存储的 fileID。

当前 ECDICT 数据不包含音频，因此正式体验前必须补充可审计的双口音音频映射，并在 `docs/content-sources.md` 登记许可、作者和来源。不得直接使用商业词典或来源不明的 TTS/抓取音频。

## 数据行为

- 学习记录只保存在本机微信存储，不上传云端。
- 删除词库不会删除熟悉度和测试记录。
- 更新词库按稳定单词 ID 合并，不覆盖熟悉度和阅读位置。
- 清理微信缓存、删除小程序或换机可能永久丢失记录。

## 发布

项目目标是微信体验版，不是公开上架。上传前：

- 将体验者加入小程序后台的体验成员。
- 完成 [docs/device-acceptance.md](docs/device-acceptance.md) 中至少一台 iPhone 和一台 Android 的真机验收。
- 确认内容来源、音频许可和云存储 fileID 均已填写。

微信官方建议使用开发者工具 CLI 或 `miniprogram-ci` 做自动预览/上传；这两种方式都需要真实 AppID、登录状态或代码上传私钥。
