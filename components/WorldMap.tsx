'use client'

import { useState, type ComponentType, type ReactNode } from 'react'
import ArtWorld, { hotspots as worldHotspots } from './maps/art-world'
import ArtCirclet, { hotspots as circletHotspots } from './maps/art-circlet'
import ArtCorridors, { hotspots as corridorsHotspots } from './maps/art-corridors'
import ArtOuter, { hotspots as outerHotspots } from './maps/art-outer'
import { BASE_PATH } from '@/lib/asset'

type MapId = 'world' | 'circlet' | 'corridors' | 'outer'

type Hotspot = { id: string; label: string; x: number; y: number; w: number; h: number }
type Target = { label: string; href?: string; map?: MapId }
type Level = {
  title: string
  hint: string
  back?: string
  viewBox: string
  Art: ComponentType
  hotspots: Hotspot[]
  targets: Record<string, Target>
}

const WORLD_TARGETS: Record<string, Target> = {
  'god-s-spine': { label: '神脊峰 · 十二神神殿', href: '/geography/god-s-spine/' },
  stonewrought: { label: '岩铸领', href: '/geography/the-stonewrought/' },
  stormcrest: { label: '暴冠高地', href: '/geography/the-stormcrest/' },
  'sky-isles': { label: '浮空群岛', href: '/geography/the-sky-isles/' },
  cinderveil: { label: '烬汽城', href: '/geography/cinderveil/' },
  mutewood: { label: '缄林', href: '/geography/the-mutewood/' },
  'lake-court': { label: '镜湖 · 湖心庭', href: '/geography/the-lake-court/' },
  corridors: { label: '灰色走廊（三大伤痕地带）', map: 'corridors' },
  circlet: { label: '低语者之环', map: 'circlet' },
  outer: { label: '外围场景', map: 'outer' },
}

const CIRCLET_TARGETS: Record<string, Target> = {
  'lake-court': { label: '镜湖 · 湖心庭', href: '/geography/the-lake-court/#镜湖-mirrorlake' },
  arbiter: { label: '仲裁区', href: '/geography/the-circlet/#仲裁区-arbiter' },
  canticle: { label: '声颂区', href: '/geography/the-circlet/#声颂区-canticle' },
  scriptorium: { label: '墨缚区', href: '/geography/the-circlet/#墨缚区-scriptorium' },
  dermis: { label: '肤触区', href: '/geography/the-circlet/#肤触区-dermis' },
  plainweave: { label: '平纹区', href: '/geography/the-circlet/#平纹区-plainweave' },
  crucible: { label: '炼金区', href: '/geography/the-circlet/#炼金区-crucible' },
  hush: { label: '缄默区', href: '/geography/the-circlet/#缄默区-the-hush' },
}

const CORRIDOR_TARGETS: Record<string, Target> = {
  riftvein: { label: '裂脉峡谷', href: '/geography/the-grey-corridors/#裂脉峡谷-the-riftvein' },
  cinderveil: { label: '烬汽城', href: '/geography/cinderveil/' },
  'petrified-root': { label: '石根森林', href: '/geography/the-grey-corridors/#石根森林-the-petrified-root' },
  'scorched-thoroughfare': {
    label: '焦痕走廊',
    href: '/geography/the-grey-corridors/#焦痕走廊-the-scorched-thoroughfare',
  },
}

const OUTER_TARGETS: Record<string, Target> = {
  cinderworks: { label: '锻炉废墟', href: '/geography/outer-scenes/#锻炉废墟-cinderworks' },
  'fulminated-shore': {
    label: '雷殒滩',
    href: '/geography/outer-scenes/#雷殒滩-the-fulminated-shore',
  },
  mirechoir: { label: '泥沼回廊', href: '/geography/outer-scenes/#泥沼回廊-mirechoir' },
  needleteeth: { label: '针牙礁', href: '/geography/outer-scenes/#针牙礁-the-needleteeth' },
  'forsaken-spire': {
    label: '遗落神殿',
    href: '/geography/outer-scenes/#遗落神殿-the-forsaken-spire',
  },
}

const LEVELS: Record<MapId, Level> = {
  world: {
    title: '三缝之地 · 世界总图',
    hint: '悬停高亮，点击跳转词条；低语者之环、灰色走廊、外围场景可进入区域详图',
    viewBox: '0 0 256 176',
    Art: ArtWorld,
    hotspots: worldHotspots,
    targets: WORLD_TARGETS,
  },
  circlet: {
    title: '低语者之环 · 区域图',
    hint: '点击扇区跳转对应小节',
    back: '世界总图',
    viewBox: '0 0 200 140',
    Art: ArtCirclet,
    hotspots: circletHotspots,
    targets: CIRCLET_TARGETS,
  },
  corridors: {
    title: '灰色走廊 · 区域图',
    hint: '点击伤痕地带跳转对应小节',
    back: '世界总图',
    viewBox: '0 0 256 112',
    Art: ArtCorridors,
    hotspots: corridorsHotspots,
    targets: CORRIDOR_TARGETS,
  },
  outer: {
    title: '外围场景 · 区域图',
    hint: '点击地点跳转对应小节',
    back: '世界总图',
    viewBox: '0 0 256 144',
    Art: ArtOuter,
    hotspots: outerHotspots,
    targets: OUTER_TARGETS,
  },
}

export default function WorldMap() {
  const [level, setLevel] = useState<MapId>('world')
  const L = LEVELS[level]

  const renderHotspots = (): ReactNode =>
    L.hotspots.map((h, i) => {
      const t = L.targets[h.id]
      if (!t) return null
      const href = t.href ? `${BASE_PATH}${t.href}` : undefined
      return (
        <a
          key={`${h.id}-${i}`}
          className="sf-map-link"
          href={href ?? '#'}
          aria-label={t.label}
          onClick={(e) => {
            if (t.map) {
              e.preventDefault()
              setLevel(t.map)
            }
          }}
        >
          <rect className="sf-map-hot" x={h.x} y={h.y} width={h.w} height={h.h}>
            <title>{t.label}{t.map ? '（进入区域图）' : ''}</title>
          </rect>
        </a>
      )
    })

  return (
    <div className="sf-map">
      <div className="sf-map-bar">
        <span className="sf-map-title">{L.title}</span>
        {L.back && (
          <button type="button" className="sf-map-back" onClick={() => setLevel('world')}>
            ← 返回{L.back}
          </button>
        )}
        <span className="sf-map-hint">{L.hint}</span>
      </div>
      <div className="sf-map-stage">
        <L.Art />
        <svg className="sf-map-hotspots" viewBox={L.viewBox} aria-hidden>
          {renderHotspots()}
        </svg>
      </div>
    </div>
  )
}
