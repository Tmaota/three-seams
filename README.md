# 三缝之地百科

三缝之地世界观设定集与旅者指南。Nextra（Next.js）+ GitHub Pages 纯静态部署，
双主题（☀ 百科模式 / 🌙 羊皮纸指南模式），Pagefind 中文全文搜索。

## 结构

```
site/
├── source/                    # 设定原文（唯一内容源，改这里）
│   └── 三缝之地_网站设定原文_一字不差.md
├── scripts/
│   ├── split-content.mjs      # 内容切分：source/ → content/（73 词条 + 12 章导读页）
│   └── serve-out.mjs          # 本地预览 out/ 的小服务器
├── content/                   # 构建时生成，勿手改（已 gitignore）
├── components/                # 自定义组件（首页宫格、随机词条等）
├── app/                       # 布局、全局样式（app/sanfeng.css 双主题）
└── .github/workflows/deploy.yml  # push main 自动部署到 GitHub Pages
```

## 常用命令

```bash
npm run dev       # 本地开发（搜索在 dev 模式不可用，属正常——Pagefind 只索引构建产物）
npm run build     # 切分内容 + 构建 + 生成搜索索引，产物在 out/
npm run content   # 只重新切分内容
```

> Windows 本机若 `npm` 报错（kimi-desktop 残留垫片），用完整路径：`E:\npm.cmd run dev`

## 部署

1. 在 GitHub 新建仓库（如 `sanfeng-wiki`），推本目录上去：

```bash
git init && git add -A && git commit -m "init: 三缝之地百科"
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

2. 仓库 Settings → Pages → Source 选 **GitHub Actions**。
3. push 到 main 后工作流自动构建发布：`https://<用户名>.github.io/<仓库名>/`

部署前改两处：

- [app/layout.tsx](app/layout.tsx) 的 `DOCS_REPO` → 你的仓库地址（「编辑此页」链接用）
- 首页欢迎语（[components/home.tsx](components/home.tsx) 与 `content/index.mdx` 标题，现为占位文案）

## 更新内容

改 `source/` 里的设定原文 → push → 自动重新切分发布。词条间互链、
infobox、分类标签在第二期加入。
