import { useMDXComponents as getThemeComponents } from 'nextra-theme-docs'
import type { MDXComponents } from 'nextra/mdx-components'
import { HomeHero, RecentList, SectionGrid } from '@/components/home'
import { linkifyChildren } from '@/components/autolink'
import WorldMap from '@/components/WorldMap'

const theme = getThemeComponents({})

type PProps = { children?: React.ReactNode; [k: string]: unknown }

// p / li 渲染时插入词条互链（构建期，服务端）
function GlossP({ children, ...props }: PProps) {
  const P = theme.p as React.ComponentType<PProps>
  return (
    <P {...props}>{linkifyChildren(children)}</P>
  )
}

function GlossLi({ children, ...props }: PProps) {
  const Li = theme.li as React.ComponentType<PProps>
  return (
    <Li {...props}>{linkifyChildren(children)}</Li>
  )
}

// 全局 MDX 组件注册表：首页组件 + 信息框所需的普通渲染 + 词条互链
export function useMDXComponents(
  components: MDXComponents = {} as MDXComponents
): MDXComponents {
  return {
    ...theme,
    ...components,
    HomeHero,
    SectionGrid,
    RecentList,
    WorldMap,
    p: GlossP,
    li: GlossLi,
  }
}
