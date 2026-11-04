# GitHub Actions 打包与发布

项目会在 GitHub Actions 中分别使用 Windows、macOS 和 Linux Runner 打包：

- Windows x64：NSIS 安装程序（`.exe`）
- macOS：Intel 与 Apple Silicon 通用安装包（`.dmg` 和 `.zip`）
- Linux x64：AppImage（`.AppImage`）

## 手动打包

在 GitHub 仓库的 **Actions** 页面选择 **Build and Release**，点击 **Run workflow**。手动运行只生成 Actions Artifacts，不会创建 Release。构建产物保留 14 天。

## 发布新版本

发布由 `v*` 格式的 Git 标签触发。标签版本必须与 `package.json` 中的 `version` 一致，否则工作流会停止，避免 Release 名称与安装包版本不一致。

例如发布补丁版本：

```bash
npm version patch -m "release: v%s"
git push origin main --follow-tags
```

也可以指定版本：

```bash
npm version 0.2.0 -m "release: v%s"
git push origin main --follow-tags
```

标签推送后，工作流会：

1. 校验 Git 标签与应用版本；
2. 并行构建 Windows、macOS 和 Linux 安装包；
3. 等待三个平台全部成功；
4. 创建同名 GitHub Release、生成发布说明并上传全部安装包；
5. 如果重新运行同一标签，则覆盖 Release 中的同名附件。

Release 也会包含 `latest.yml`、`latest-mac.yml` 和 `latest-linux.yml` 等由 electron-builder 生成的版本元数据。这些文件必须与同一次构建的安装包一起上传，不要手工修改或混用其他版本的文件。

## 签名说明

当前工作流生成的是未签名安装包，不需要额外 Secrets。Windows SmartScreen 可能提示“未知发布者”；macOS 可能要求用户在“隐私与安全性”中确认打开。面向公开用户正式分发时，建议再配置 Windows 代码签名以及 Apple Developer ID 签名和公证。
