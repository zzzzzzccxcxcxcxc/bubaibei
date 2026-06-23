# Content Sources and Review Record

## Source register

| sourceId | 名称 | 发布者 | URL/出版信息 | 许可或使用依据 | 获取日期 | 可使用字段 | 审核状态 |
|---|---|---|---|---|---|---|---|
| `ecdict-bc015ed2` | ECDICT Free English to Chinese Dictionary Database | Linwei / skywind3000 | https://github.com/skywind3000/ECDICT/tree/bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b | 仓库根目录 `LICENSE` 为 MIT License；保留许可证及来源记录 | 2026-06-23 | 单词、主音标、中文释义、词形变化、考试标签、BNC/当代语料频次 | 已核验固定提交的 README、LICENSE 与 CSV 字段 |
| `scowl-license-reference` | SCOWL / English Speller Database | Kevin Atkinson 等 | https://wordlist.aspell.net/scowl_v1-readme/ | 许可允许免费使用、复制、修改和分发并要求保留版权声明；当前首包未直接导入其词条 | 2026-06-23 | 备用英文拼写核验 | 仅作备用来源 |

## Vocabulary selection

- 首包从 ECDICT 中带 `ky`（考研）标签、具有中文释义和音标的基础词形中筛选。
- 先按 BNC 与当代语料的可用最小排名排序，再选取前 800 个词作为试运行核心词库。
- 其中前 400 个形成单独的“高频核心”词库；两个词库共享同一主词条，不重复存储用户学习状态。
- 词库名称使用“2027 备考”，不使用“2027 官方大纲”。截至 2026-06-23，项目没有取得可核验的 2027 官方考试大纲。
- ECDICT 只提供一个主音标字段，当前写入 `phonetics.uk`，不伪造美式音标。美音和双音频资源由独立授权流程补充。

## Copyright boundaries

- 不复制红宝书或其他商业词书的释义体系、记忆文案、例句、插图或排版。
- 当前词库不含真题摘录，因此不存在未记录来源的真题短句。
- 后续增加真题短句时，每条必须包含年份、题型、翻译和 `sourceId`，并在本文件补充来源与使用依据。
- 仓库分发 ECDICT 派生内容时必须同时保留 ECDICT 的 MIT 许可证副本。

## Reproduction

```powershell
npm run content:import:ecdict -- ..\tmp\ecdict-source\ecdict.csv
npm run content:validate
npm run content:build
npm run content:verify
```

导入脚本只接受本地 ECDICT CSV，不在构建期间抓取商业网站。
