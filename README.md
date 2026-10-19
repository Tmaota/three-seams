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
npm run build     # 构建 + 生成搜索索引，产物在 out/
npm run migrate   # ⚠ 从 source/ 原文重新切分覆盖 content/（会覆盖在线编辑的改动，慎用）
```

> Windows 本机若 `npm` 报错（kimi-desktop 残留垫片），用完整路径：`E:\npm.cmd run dev`

## 墨种之境（在线编辑）

- 左下角 ✒ 墨印 → 输入站点口令 → 正文/标题/首页欢迎语就地编辑 → **保存并发布**
- 保存 = 直接向本仓库提交（首次需粘贴 GitHub 令牌，仅存本浏览器），push 触发自动部署，**约 10 分钟全网生效**
- 口令在 [lib/site-config.ts](lib/site-config.ts) 的 `editPassword` 修改（纯前端门槛，安全线是令牌）
- 令牌创建：github.com/settings/personal-access-tokens/new → 仅勾选本仓库 + Contents 读写
- 「取消」会还原页面（丢弃未保存修改）；每次发布都是一条 git 提交，可随时回滚

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

- **日常**：直接在网站上用墨种之境编辑（或改 `content/` 里的对应 .md 文件）→ push → 自动发布
- **从原文重置**：把新的设定原文放进 `source/` → `npm run migrate`（会覆盖 content/ 手改内容）→ 检查后提交
