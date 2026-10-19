'use client'

import { useCallback, useEffect, useState } from 'react'
import tips from '@/data/tips.json'

const MINIMIZED_KEY = 'sf-tips-min'

/** 底部随机彩蛋：页面加载随机一条，「换一条」循环 */
export default function TipsBar() {
  const [index, setIndex] = useState(0)
  const [minimized, setMinimized] = useState(false)

  useEffect(() => {
    setIndex(Math.floor(Math.random() * tips.length))
    try {
      setMinimized(localStorage.getItem(MINIMIZED_KEY) === '1')
    } catch {
      /* ignore */
    }
  }, [])

  const next = useCallback(() => {
    setIndex((i) => (i + 1 + Math.floor(Math.random() * (tips.length - 1))) % tips.length)
  }, [])

  const minimize = useCallback(() => {
    setMinimized(true)
    try {
      localStorage.setItem(MINIMIZED_KEY, '1')
    } catch {
      /* ignore */
    }
  }, [])

  const restore = useCallback(() => {
    setMinimized(false)
    try {
      localStorage.removeItem(MINIMIZED_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  if (minimized) {
    return (
      <button type="button" className="sf-tips-restore" onClick={restore} title="旅者手记">
        💡
      </button>
    )
  }

  return (
    <div className="sf-tips" role="status">
      <span className="sf-tips-icon">💡</span>
      <span className="sf-tips-text">{tips[index]}</span>
      <button type="button" className="sf-tips-btn" onClick={next}>
        换一条
      </button>
      <button type="button" className="sf-tips-btn" onClick={minimize} title="收起">
        ×
      </button>
    </div>
  )
}
