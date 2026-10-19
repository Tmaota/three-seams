import Link from 'next/link'
import RandomEntry from '@/components/RandomEntry'
import { asset } from '@/lib/asset'
import homeConfig from '@/content/home.config.json'

// 板块宫格数据：图标暂用旧站 PNG 占位，待 codex 重绘后替换 public/icons/
const CHAPTERS = [
  { slug: 'races', zh: '万族志', en: 'Races of the Three Seams', icon: 'races' },
  { slug: 'geography', zh: '地理与势力', en: 'Geography & Factions', icon: 'geography' },
  { slug: 'magic-users', zh: '术者种族', en: 'The Five Bloodlines of Magic', icon: 'magic-users' },
  { slug: 'monsters', zh: '终末形态图鉴', en: 'Monster Compendium', icon: 'monsters' },
  { slug: 'primordials', zh: '始源三柱', en: '', icon: 'primordials' },
  { slug: 'sky-age', zh: '天裂纪', en: 'The Age of Broken Sky', icon: 'sky-age' },
  { slug: 'pantheon', zh: '十二神与历法志', en: 'The Pantheon', icon: 'pantheon' },
  { slug: 'unraveled', zh: '退魔者总典', en: 'The Unraveled', icon: 'unraveled' },
  { slug: 'shadow-council', zh: '阴影议会志', en: 'The Shadow Council', icon: 'shadow-council' },
  { slug: 'guild', zh: '低语者保护协会', en: 'The Whisperer Protection Guild', icon: 'guild' },
  { slug: 'adventurers', zh: '冒险者', en: 'The Adventurers', icon: 'adventurers' },
  { slug: 'cinder-arcana', zh: '烬械学', en: 'Steam Arcana', icon: 'cinder-arcana' },
]

/** 首页上部：标题 + 导语 + 动线按钮（文案来自 home.config.json，可在墨种之境编辑） */
export function HomeHero() {
  return (
    <section className="sf-hero">
      <h1>{homeConfig.title}</h1>
      <p className="sf-tagline">{homeConfig.tagline}</p>
      <p className="sf-intro">{homeConfig.intro}</p>
      <div className="sf-hero-actions">
        <Link className="sf-action" href="/races/">
          新手导读
        </Link>
        <Link className="sf-action" href="/geography/">
          世界地图
        </Link>
        <RandomEntry />
      </div>
    </section>
  )
}

/** 首页中部：板块入口宫格 */
export function SectionGrid() {
  return (
    <section className="sf-grid" aria-label="板块入口">
      {CHAPTERS.map((c) => (
        <Link key={c.slug} href={`/${c.slug}/`} className="sf-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="sf-card-icon"
            src={asset(`/icons/${c.icon}.svg`)}
            alt=""
            width={56}
            height={56}
          />
          <span className="sf-card-zh">{c.zh}</span>
          {c.en && <span className="sf-card-en">{c.en}</span>}
        </Link>
      ))}
    </section>
  )
}

/** 首页底部：最近收录（数据来自 home.config.json） */
export function RecentList() {
  return (
    <section className="sf-recent">
      <h2>最近收录</h2>
      <ul>
        {homeConfig.recent.map((r) => (
          <li key={r.href}>
            <Link href={r.href}>{r.text}</Link>
            <span>{r.desc}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
