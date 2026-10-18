import { Footer, Layout } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'
import type { Metadata } from 'next'
import SanfengNavbar from '@/components/SanfengNavbar'

import 'nextra-theme-docs/style.css'
import './sanfeng.css'

// 「编辑此页 / 历史」链接指向的仓库
const DOCS_REPO = 'https://github.com/Tmaota/three-seams/blob/main'

export const metadata: Metadata = {
  metadataBase: new URL('https://sanfeng.example.github.io'),
  title: {
    default: '三缝之地百科',
    template: '%s · 三缝之地百科',
  },
  description: '三缝之地 · 西幻世界观设定集与旅者指南',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Layout
          pageMap={await getPageMap()}
          navbar={<SanfengNavbar />}
          footer={<Footer>三缝之地 · 世界观设定集与旅者指南</Footer>}
          docsRepositoryBase={DOCS_REPO}
          editLink={<>编辑此页</>}
          toc={{ title: <>本页目录</>, backToTop: <>回到顶部</> }}
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          themeSwitch={{ light: '百科', dark: '指南', system: '系统' }}
          nextThemes={{ defaultTheme: 'light', storageKey: 'sanfeng-theme' }}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
