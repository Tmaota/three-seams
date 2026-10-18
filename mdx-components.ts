import { useMDXComponents as getThemeComponents } from 'nextra-theme-docs'
import type { MDXComponents } from 'nextra/mdx-components'
import { HomeHero, RecentList, SectionGrid } from '@/components/home'

// 全局 MDX 组件注册表：首页组件 + 二期将加 Infobox / 分类标签 / 旅者手记等
export function useMDXComponents(
  components: MDXComponents = {} as MDXComponents
): MDXComponents {
  return {
    ...getThemeComponents(components),
    HomeHero,
    SectionGrid,
    RecentList,
  }
}
