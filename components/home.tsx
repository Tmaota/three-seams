import Image from 'next/image'
import Link from 'next/link'
import RandomEntry from '@/components/RandomEntry'

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

/** 首页上部：导语 + 动线按钮（标题 h1 由页面 frontmatter 渲染） */
export function HomeHero() {
  return (
    <section className="sf-hero">
      {/* TODO: 欢迎语与导语是占位文案，随时可改 */}
      <p className="sf-tagline">「每一道缝隙里，都住着说话的存在。」</p>
      <p className="sf-intro">
        这里是三缝之地的设定集与旅者指南——从万族志到烬械学，
        初来乍到的旅者可以按顺序读下去，也可以随意翻检词条。
      </p>
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
          <Image
            className="sf-card-icon"
            src={`/icons/${c.icon}.png`}
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

/** 首页底部：最近收录（暂手工维护） */
export function RecentList() {
  return (
    <section className="sf-recent">
      <h2>最近收录</h2>
      <ul>
        <li>
          <Link href="/cinder-arcana/">烬械学 Steam Arcana</Link>
          <span>天赋之外的大多数人，如何用烬械改写命运</span>
        </li>
        <li>
          <Link href="/adventurers/">冒险者 The Adventurers</Link>
          <span>不是在探险，就是在准备探险</span>
        </li>
      </ul>
    </section>
  )
}
