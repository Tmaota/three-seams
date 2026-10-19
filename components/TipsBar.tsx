'use client'

import { useCallback, useEffect, useState } from 'react'
import tips from '@/data/tips.json'

const ROTATE_MS = 6000 // 每条停留 6 秒，由进度条动画驱动切换
const FADE_MS = 800 // 淡出时长，与旧站一致

const MINIMIZED_KEY = 'sf-tips-min'

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * 旅者手记：右下角固定彩蛋条（旧站风格）
 * 随机顺序轮播设定秘闻，6 秒一条，底部时间条走完自动切换；
 * 全部播完后出现「墨字世界的尽头」结尾语。
 */
export default function TipsBar() {
  const [shuffled] = useState<string[]>(() => shuffle(tips))
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [ended, setEnded] = useState(false)
  const [minimized, setMinimized] = useState(false)

  useEffect(() => {
    try {
      setMinimized(localStorage.getItem(MINIMIZED_KEY) === '1')
    } catch {
      /* ignore */
    }
    // 首屏淡入
    const t = setTimeout(() => setVisible(true), 300)
    return () => clearTimeout(t)
  }, [])

  // 进度条走完 → 淡出 → 换下一条 → 淡入
  const onBarEnd = useCallback(() => {
    setVisible(false)
    setTimeout(() => {
      setIndex((i) => {
        if (i + 1 >= shuffled.length) {
          setEnded(true)
          setVisible(true)
          return i
        }
        return i + 1
      })
      setVisible(true)
    }, FADE_MS)
  }, [shuffled.length])

  const minimize = () => {
    setMinimized(true)
    try {
      localStorage.setItem(MINIMIZED_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const restore = () => {
    setMinimized(false)
    try {
      localStorage.removeItem(MINIMIZED_KEY)
    } catch {
      /* ignore */
    }
  }

  if (minimized) {
    return (
      <button type="button" className="sf-tips-restore" onClick={restore} title="旅者手记">
        ✦
      </button>
    )
  }

  const displayText = ended
    ? `你已经到达墨字世界的尽头啦！墨种的笔还没墨水了，先歇歇吧~（已阅览 ${shuffled.length} 条秘闻）`
    : (shuffled[index] ?? '')

  return (
    <div className="sf-tips" role="status">
      <button type="button" className="sf-tips-close" onClick={minimize} title="收起">
        ×
      </button>
      <span className="sf-tips-icon" aria-hidden>
        ✦
      </span>
      <p
        className="sf-tips-text"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(3px)',
        }}
      >
        {displayText}
      </p>
      {!ended && (
        <div key={`${index}`} className="sf-tips-progress" onAnimationEnd={onBarEnd} />
      )}
    </div>
  )
}
