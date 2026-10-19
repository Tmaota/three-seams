import Link from 'next/link'
import { tagIndex, allTags } from '@/lib/site-data.generated'

/** 分类索引页（/tags）：列出全部分类 */
export function TagsIndex() {
  const sorted = [...allTags].sort((a, b) => (tagIndex[b]?.length ?? 0) - (tagIndex[a]?.length ?? 0))
  return (
    <div className="sf-tags-index">
      <h1>分类索引</h1>
      <p className="sf-tags-desc">共 {sorted.length} 个分类。点击分类查看其下所有词条。</p>
      <ul>
        {sorted.map((t) => (
          <li key={t}>
            <Link href={`/tags/${encodeURIComponent(t)}/`}>{t}</Link>
            <span>{tagIndex[t]?.length ?? 0} 个词条</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 单个分类页（/tags/<分类>）：该分类下的全部词条 */
export function TagPage({ tag }: { tag: string }) {
  const pages = tagIndex[tag] ?? []
  return (
    <div className="sf-tags-index">
      <h1>分类：{tag}</h1>
      <p className="sf-tags-desc">本分类共收录 {pages.length} 个词条。</p>
      <ul>
        {pages.map((p) => (
          <li key={p.href}>
            <Link href={`${p.href}/`}>{p.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
