'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { SITE_CONFIG } from '@/lib/site-config'

const SITE_PASSWORD = SITE_CONFIG.editPassword

type MozhongValue = {
  loggedIn: boolean
  editing: boolean
  login: (password: string) => boolean
  logout: () => void
  setEditing: (v: boolean) => void
  getToken: () => string
  setToken: (token: string) => void
}

const MozhongContext = createContext<MozhongValue | null>(null)

const ADMIN_KEY = 'sf-admin'
const TOKEN_KEY = 'sf-gh-token'

export function MozhongProvider({ children }: { children: React.ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(ADMIN_KEY) === '1') setLoggedIn(true)
    } catch {
      /* 无痕模式等场景 */
    }
  }, [])

  // 编辑状态同步到 body，供 CSS 控制翻页栏/tips 显隐
  useEffect(() => {
    document.body.classList.toggle('sf-editing', editing)
    return () => document.body.classList.remove('sf-editing')
  }, [editing])

  const login = useCallback((password: string) => {
    // 口令在前端校验，仅作为编辑模式的门槛；发布安全由 GitHub 令牌保障
    if (password !== SITE_PASSWORD) return false
    try {
      sessionStorage.setItem(ADMIN_KEY, '1')
    } catch {
      /* ignore */
    }
    setLoggedIn(true)
    return true
  }, [])

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(ADMIN_KEY)
    } catch {
      /* ignore */
    }
    setLoggedIn(false)
    setEditing(false)
  }, [])

  const getToken = useCallback(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) ?? ''
    } catch {
      return ''
    }
  }, [])

  const setToken = useCallback((token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({ loggedIn, editing, login, logout, setEditing, getToken, setToken }),
    [loggedIn, editing, login, logout, setEditing, getToken, setToken]
  )

  return <MozhongContext.Provider value={value}>{children}</MozhongContext.Provider>
}

export function useMozhong(): MozhongValue {
  const ctx = useContext(MozhongContext)
  if (!ctx) throw new Error('useMozhong 必须在 <MozhongProvider> 内使用')
  return ctx
}
