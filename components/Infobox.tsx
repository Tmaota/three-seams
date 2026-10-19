import type { InfoboxData } from '@/lib/types'

/** 词条右侧信息框（灰机 wiki 式）。数据来自页面 frontmatter 的 infobox 字段，可在墨种之境编辑 */
export function Infobox({ title, data }: { title?: string; data?: InfoboxData }) {
  if (!data || Object.keys(data).length === 0) return null
  return (
    <aside className="sf-infobox" data-sf-skip>
      {title && <div className="sf-infobox-title">{title}</div>}
      <dl>
        {Object.entries(data).map(([k, v]) => (
          <div className="sf-infobox-row" key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </aside>
  )
}

/** 词条底部「分类」标签行（灰机 wiki 式），链接到 /tags/<标签> 聚合页 */
export function TagRow({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null
  return (
    <div className="sf-tagrow" data-sf-skip>
      <span className="sf-tagrow-label">分类</span>
      <span className="sf-tagrow-sep">：</span>
      {tags.map((t) => (
        <a key={t} className="sf-tag" href={`/tags/${encodeURIComponent(t)}/`}>
          {t}
        </a>
      ))}
    </div>
  )
}
