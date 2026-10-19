import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents as getMDXComponents } from '../../mdx-components'
import { Infobox, TagRow } from '@/components/Infobox'
import { TagsIndex, TagPage } from '@/components/TagPages'
import { pageData, tagIndex } from '@/lib/site-data.generated'
import { resetAutolink } from '@/lib/autolink-state'

const { wrapper: Wrapper } = getMDXComponents({})
const WrapperComponent = Wrapper as React.ComponentType<{
  toc: unknown[]
  metadata: { title?: string }
  children: React.ReactNode
}>

type Params = { params: Promise<{ slug?: string[] }> }

function routeFrom(slug: string[]): string {
  return slug.length ? `/${slug.join('/')}` : '/'
}

export async function generateStaticParams(): Promise<
  { slug: string[] }[]
> {
  const contentParams = (await generateStaticParamsFor('slug')()) as {
    slug: string[]
  }[]
  // /tags 与 /tags/<分类> 聚合页也走本 catch-all，避免与可选 catch-all 冲突
  const tagParams = Object.keys(tagIndex).map((tag) => ({
    slug: ['tags', encodeURIComponent(tag)],
  }))
  return [...contentParams, { slug: ['tags'] }, ...tagParams]
}

export async function generateMetadata(props: Params) {
  const params = await props.params
  const slug = params.slug ?? []
  if (slug[0] === 'tags') {
    const tag = decodeURIComponent(slug[1] ?? '')
    return { title: tag ? `分类：${tag}` : '分类索引' }
  }
  const { metadata } = await importPage(slug)
  return metadata
}

export default async function Page(props: Params) {
  const params = await props.params
  const slug = params.slug ?? []

  // 分类聚合页（/tags、/tags/<分类>）：无对应内容文件，先于 importPage 分流
  if (slug[0] === 'tags') {
    const tag = slug[1] ? decodeURIComponent(slug[1]) : undefined
    const metadata = { title: tag ? `分类：${tag}` : '分类索引' }
    return (
      <WrapperComponent toc={[]} metadata={metadata}>
        {tag ? <TagPage tag={tag} /> : <TagsIndex />}
      </WrapperComponent>
    )
  }

  const result = await importPage(slug)
  const { default: MDXContent, toc, metadata } = result
  const route = routeFrom(slug)
  const meta = pageData[route]
  resetAutolink(route, meta?.title)

  return (
    <WrapperComponent toc={toc} metadata={metadata}>
      {meta?.infobox && <Infobox title={meta.title} data={meta.infobox} />}
      <MDXContent {...props} params={params} />
      {meta && <TagRow tags={meta.tags} />}
    </WrapperComponent>
  )
}
