'use client'

import { useRouter } from 'next/navigation'
import { allRoutes } from '@/lib/routes.generated'

export default function RandomEntry() {
  const router = useRouter()
  const pick = () => {
    const entries = allRoutes.filter((r) => r.chapter !== '目录')
    const hit = entries[Math.floor(Math.random() * entries.length)]
    router.push(hit.href)
  }
  return (
    <button type="button" className="sf-random" onClick={pick}>
      随机词条
    </button>
  )
}
