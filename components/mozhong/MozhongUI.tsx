'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useMozhong } from './context'
import { saveEntryPage, saveHomepage } from './save'

type Status = { kind: 'idle' | 'saving' | 'done' } | { kind: 'error'; message: string }

/**
 * 墨种之境：在线编辑套件
 * 左下角悬浮墨印 → 口令登录 → 正文/标题/首页欢迎语就地编辑 → 保存并发布（提交到 GitHub，约 10 分钟后全网生效）
 */
export default function MozhongUI() {
  const { loggedIn, editing, login, logout, setEditing, getToken, setToken } = useMozhong()
  const pathname = usePathname()

  const [modal, setModal] = useState<null | 'password' | 'token'>(null)
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const savingRef = useRef(false)

  // —— 编辑态：把正文/标题/欢迎语设为可编辑，并拦截链接点击 ——
  useEffect(() => {
    const isHome = pathname === '/'
    const targets: Element[] = []
    const titleEl = document.querySelector('article h1')
    if (titleEl) targets.push(titleEl)
    if (isHome) {
      document.querySelectorAll('.sf-tagline, .sf-intro').forEach((el) => targets.push(el))
    } else {
      const main = document.querySelector('main[data-pagefind-body]')
      if (main) targets.push(main)
    }
    targets.forEach((el) => {
      if (editing) el.setAttribute('contenteditable', 'true')
      else el.removeAttribute('contenteditable')
    })

    if (!editing) return
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element
      if (t.closest('[contenteditable="true"] a')) e.preventDefault()
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [editing, pathname])

  const doSave = useCallback(
    async (tok: string) => {
      if (savingRef.current) return
      savingRef.current = true
      setStatus({ kind: 'saving' })
      try {
        const isHome = pathname === '/'
        const titleEl = document.querySelector('article h1')
        if (isHome) {
          await saveHomepage({
            titleEl,
            taglineEl: document.querySelector('.sf-tagline'),
            introEl: document.querySelector('.sf-intro'),
            token: tok,
          })
        } else {
          const mainEl = document.querySelector('main[data-pagefind-body]')
          if (!mainEl) throw new Error('此页面没有可编辑的正文')
          await saveEntryPage({ pathname, mainEl, titleEl, token: tok })
        }
        setStatus({ kind: 'done' })
        setEditing(false)
        window.setTimeout(() => setStatus({ kind: 'idle' }), 5000)
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        if (/令牌/.test(message)) {
          try {
            localStorage.removeItem('sf-gh-token')
          } catch {
            /* ignore */
          }
        }
        setStatus({ kind: 'error', message })
      } finally {
        savingRef.current = false
      }
    },
    [pathname, setEditing]
  )

  const onSaveClick = () => {
    const tok = getToken()
    if (!tok) {
      setTokenInput('')
      setModal('token')
      return
    }
    void doSave(tok)
  }

  const submitPassword = () => {
    if (login(password)) {
      setPwError('')
      setPassword('')
      setModal(null)
      setEditing(true)
    } else {
      setPwError('口令不对，再想想')
    }
  }

  const submitToken = () => {
    const tok = tokenInput.trim()
    if (!tok) return
    setToken(tok)
    setModal(null)
    void doSave(tok)
  }

  const cancelEdit = () => {
    if (!window.confirm('放弃本次编辑并还原页面？')) return
    setEditing(false)
    window.location.reload()
  }

  const exitAll = () => {
    logout()
    window.location.reload()
  }

  // Esc 关闭弹窗
  useEffect(() => {
    if (!modal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !savingRef.current) setModal(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modal])

  return (
    <>
      {/* 左下角墨印入口 */}
      {!editing && (
        <button
          type="button"
          className="sf-mozhong-btn"
          title={loggedIn ? '墨种之境 · 进入编辑' : '墨种之境'}
          onClick={() => (loggedIn ? setEditing(true) : (setPwError(''), setModal('password')))}
        >
          <Image src="/icons/icon-mozhong.svg" alt="墨种之境" width={22} height={22} />
        </button>
      )}

      {/* 编辑模式底栏 */}
      {editing && (
        <div className="sf-editbar">
          <div className="sf-editbar-tools">
            <button
              type="button"
              title="加粗"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => document.execCommand('bold')}
            >
              <b>B</b>
            </button>
            <button
              type="button"
              title="斜体"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => document.execCommand('italic')}
            >
              <i>I</i>
            </button>
          </div>
          <div className={`sf-editbar-status st-${status.kind}`}>
            {status.kind === 'saving' && '墨种落笔中…'}
            {status.kind === 'done' && '已发布 ✓ 约10分钟后全网生效'}
            {status.kind === 'error' && status.message}
            {status.kind === 'idle' && '点击正文直接修改 · 链接在编辑时不可点'}
          </div>
          <div className="sf-editbar-actions">
            <button type="button" onClick={exitAll} title="退出墨种之境身份">
              退出
            </button>
            <button type="button" onClick={cancelEdit}>
              取消
            </button>
            <button type="button" className="primary" onClick={onSaveClick} disabled={status.kind === 'saving'}>
              保存并发布
            </button>
          </div>
        </div>
      )}

      {/* 登录 / 首次令牌弹窗 */}
      {modal && (
        <div className="sf-modal-mask" onClick={() => !savingRef.current && setModal(null)}>
          <div className="sf-modal" onClick={(e) => e.stopPropagation()}>
            {modal === 'password' ? (
              <>
                <div className="sf-modal-title">
                  <Image src="/icons/icon-mozhong.svg" alt="" width={18} height={18} /> 墨种之境
                </div>
                <p className="sf-modal-desc">以墨种身份登录，即可在页面之上直接修改文字。</p>
                <div className="sf-modal-field">
                  <input
                    autoFocus
                    type={showPw ? 'text' : 'password'}
                    placeholder="站点口令"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
                  />
                  <button type="button" className="eye" onClick={() => setShowPw((v) => !v)}>
                    {showPw ? '隐藏' : '显示'}
                  </button>
                </div>
                {pwError && <div className="sf-modal-error">{pwError}</div>}
                <button type="button" className="primary block" onClick={submitPassword}>
                  进入墨种之境
                </button>
                <p className="sf-modal-note">口令只是编辑门槛；发布需要 GitHub 令牌，首次保存时会提示创建。</p>
              </>
            ) : (
              <>
                <div className="sf-modal-title">首次发布 · GitHub 令牌</div>
                <ol className="sf-modal-steps">
                  <li>
                    打开{' '}
                    <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
                      github.com/settings/personal-access-tokens/new
                    </a>
                  </li>
                  <li>Repository access 勾选 <b>three-seams</b></li>
                  <li>Permissions 里给 <b>Contents → Read and write</b>，生成令牌</li>
                  <li>把令牌粘贴到下方</li>
                </ol>
                <div className="sf-modal-field">
                  <input
                    autoFocus
                    type="password"
                    placeholder="github_pat_… 或 ghp_…"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitToken()}
                  />
                </div>
                <button type="button" className="primary block" onClick={submitToken}>
                  保存并发布
                </button>
                <p className="sf-modal-note">令牌只保存在这台浏览器里，用于向你的仓库提交修改。</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
