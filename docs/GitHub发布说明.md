# GitHub Actions 打包与发布

项目使用三个独立的 GitHub Actions 工作流：

- **Build Windows**：Windows x64 NSIS 安装程序（`.exe`）
- **Build macOS**：Intel 与 Apple Silicon 通用安装包（`.dmg` 和 `.zip`）
- **Build Linux**：Linux x64 AppImage（`.AppImage`）

三个工作流的构建、并发组和发布步骤完全独立。macOS Runner 如果缺少容量，只会影响 macOS，不再阻塞 Windows 和 Linux。三个工作流完成后会把各自的文件上传到同一个 GitHub Release。

## 正式发布新版本

发布由 `v*` 格式的 Git tag 触发。tag 版本必须与 `package.json` 的 `version` 完全一致。

发布下一个补丁版本：

```bash
npm version patch -m "release: v%s"
git push origin main --follow-tags
```

发布指定版本：

```bash
npm version 0.2.0 -m "release: v%s"
git push origin main --follow-tags
```

`npm version` 会同时更新 `package.json` 和 `package-lock.json`、创建 release commit，并创建同版本 tag。`git push --follow-tags` 推送后，三个平台会各自开始打包。

> 当前 `v0.1.3` 已经存在。请不要反复移动或 force-push 这个 tag。合并本次工作流修改后，建议直接发布 `v0.1.4` 或更高版本。

## 首次启用三个新工作流

先提交并推送本次工作流修改：

```bash
git add .github/workflows "docs/GitHub发布说明.md"
git commit -m "ci: split release workflows by platform"
git push origin main
```

确认 GitHub 上已经出现 **Build Windows**、**Build macOS** 和 **Build Linux** 后，再执行上面的版本发布命令。不要在工作区有未提交修改时运行 `npm version`。

## 发布后检查

1. 打开仓库的 **Actions** 页面。
2. 确认 **Build Windows**、**Build macOS** 和 **Build Linux** 都已触发。
3. Windows 或 Linux 成功后即可先发布自己的附件，不需要等待 macOS。
4. 打开同名 Release，确认最终包含三平台安装包和对应的更新元数据。

Release 中应包含 `latest.yml`、`latest-mac.yml` 和 `latest-linux.yml` 等 electron-builder 生成的版本元数据。这些文件必须与同一版本的安装包一起上传，不要手工修改或混用其他版本的文件。

## 只测试打包，不创建 Release

在 GitHub 仓库的 **Actions** 页面选择某个平台工作流，点击 **Run workflow**。

手动运行只会生成 Actions Artifact，不会创建或修改 GitHub Release。Artifact 保留 14 天。这适合先单独验证某个平台。

## 某个平台失败时

- 优先打开该工作流，使用 **Re-run failed jobs**。
- macOS 长时间显示 `Queued` 通常是 GitHub macOS Runner 容量不足，不会影响另外两个平台。
- 如果工作流已经修改，推荐修复后发布一个新版本，不要强制移动已发布的 tag。
- 重跑同一 tag 时，工作流会用 `--clobber` 覆盖同名 Release 附件。

## 清理卡住的 Actions

如果某轮运行长时间卡在 `Queued`：

1. 打开 **Actions**，进入该次运行。
2. 点击右上角 **Cancel workflow**。
3. 等待状态变为 `Cancelled`后，再重跑失败平台或发布新版本。

不需要删除 tag 或 Release。历史运行记录也可以保留，它们不会阻塞三个新工作流。

## 签名说明

当前工作流生成的是未签名安装包，不需要额外 Secrets。Windows SmartScreen 可能提示“未知发布者”；macOS 可能要求用户在“隐私与安全性”中确认打开。面向公开用户正式分发时，建议再配置 Windows 代码签名以及 Apple Developer ID 签名和公证。
