import nextra from 'nextra'

// search: true → 给 <main> 打 data-pagefind-body，构建后由 pagefind 建索引
const withNextra = nextra({
  search: true,
})

export default withNextra({
  output: 'export', // 纯静态导出 → GitHub Pages
  trailingSlash: true,
  images: { unoptimized: true },
  // 项目页部署时由 CI 注入 NEXT_PUBLIC_BASE_PATH=/<仓库名>；本地为空
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
})
