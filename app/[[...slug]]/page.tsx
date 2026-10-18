import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents as getMDXComponents } from '../../mdx-components'

export const generateStaticParams = generateStaticParamsFor('slug')

const { wrapper: Wrapper } = getMDXComponents({})
const WrapperComponent = Wrapper as React.ComponentType<{
  toc: unknown[]
  metadata: { title?: string }
  children: React.ReactNode
}>

type Params = { params: Promise<{ slug?: string[] }> }

export async function generateMetadata(props: Params) {
  const params = await props.params
  const { metadata } = await importPage(params.slug ?? [])
  return metadata
}

export default async function Page(props: Params) {
  const params = await props.params
  const result = await importPage(params.slug ?? [])
  const { default: MDXContent, toc, metadata } = result
  return (
    <WrapperComponent toc={toc} metadata={metadata}>
      <MDXContent {...props} params={params} />
    </WrapperComponent>
  )
}
