# 连字消除

一个基于 React + Vite 的中文连字消除小游戏。

## 本地运行

```bash
npm install
npm run dev
```

## 发布到 GitHub Pages

这个项目已经带好 GitHub Pages 自动部署工作流：

- 工作流文件：`.github/workflows/deploy.yml`
- 构建输出目录：`dist`
- 当你推送到 `main` 分支时，会自动构建并部署

第一次发布时还需要在 GitHub 仓库里手动开一次 Pages：

1. 把当前目录初始化成 Git 仓库并推到 GitHub。
2. 进入 GitHub 仓库的 `Settings` -> `Pages`。
3. 在 `Build and deployment` 里把 `Source` 设为 `GitHub Actions`。
4. 再次推送到 `main`，或手动运行 Actions 里的 `Deploy to GitHub Pages`。

### 路径说明

- 如果仓库地址是 `https://github.com/<用户名>/<仓库名>`，站点通常会发布到 `https://<用户名>.github.io/<仓库名>/`
- 如果仓库名本身是 `<用户名>.github.io`，站点会发布到 `https://<用户名>.github.io/`

`vite.config.ts` 已经根据 GitHub Actions 里的仓库名自动设置 `base`，所以普通 Pages 仓库和用户主页仓库都能直接用。
