# Hexo 常用命令速查（不影响博客内容）

> 本文档放在项目根目录，不会被 Hexo 渲染到博客中。

## 启动本地服务

```bash
hexo s
```

- 访问：`http://localhost:4000`
- 停止：在终端按 `Ctrl + C`

## 清理缓存与生成文件

```bash
hexo clean
```

## 生成静态文件

```bash
hexo g
```

## 部署到远端

```bash
hexo d
```

## 一键清理 + 生成 + 部署

```bash
hexo clean && hexo g && hexo d
```

## 常见组合

```bash
hexo s --draft
```

```bash
hexo s -p 5000
```

```bash
hexo g -d
```

## 依赖安装（首次或依赖变更后）

```bash
npm install
```

## 主题子模块（themes/next）手动同步到最新（方案 A）

> 先确保 `themes/next` 里的改动已经提交并推送到远端，否则主仓库更新不到最新提交。

**步骤：在主仓库根目录执行**

```bash
git submodule update --remote --merge
git status -sb
git add themes/next
git commit -m "Update themes/next submodule"
```

**如需推送主仓库：**

```bash
git push
```
