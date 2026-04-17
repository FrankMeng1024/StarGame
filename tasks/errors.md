
## 2026-04-14 Sprint0-mini
- git push origin mini 失败：无法连接 github.com:443
- commit 4965934 已在本地，下次触发点一起 push

## 2026-04-16 Sprint8-mini
- git push origin mini 失败：curl 55 Connection was aborted (RPC failed)
- commit d617935 已在本地，下次触发点一起 push

## 2026-04-16 Sprint9-mini
- git push origin mini 在后台运行，结果待确认
- commit 1d3aaad 已在本地

## 2026-04-14 Sprint1-mini Integration
- miniprogram-automator 连接微信开发者工具失败：CLI 服务端口未开启
- 错误：`Failed to launch wechat web devTools, please make sure cliPath is correctly specified`
- 根本原因：需要在微信开发者工具中手动开启 CLI 服务（设置 → 安全设置 → 开启 CLI/HTTP 调用）
- 待用户操作后重新运行 `node scripts/mp_qa_runner.js --smoke`

Push failure logged
Fri Apr 17 03:44:33 CST 2026: git push failed — curl 55 connection aborted. Commits local: 68c8c48
2026-04-17T04:34:32Z push failed: docs(sprint20-mini) VU acceptance commit — Connection refused to github.com:443. Will retry at next trigger point.
