import { SITE_CONFIG } from '@/lib/site-config'
import { domToMarkdown } from './dom2md'

const API = 'https://api.github.com'
const REPO = `${SITE_CONFIG.repoOwner}/${SITE_CONFIG.repoName}`
const BRANCH = SITE_CONFIG.branch

const headers = (token: string) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
})

/** 路由 → 仓库内内容文件路径 */
export function routeToContentPath(pathname: string): string {
  const p = pathname.replace(/\/+$/, '') || '/'
  if (p === '/') return 'content/home.config.json'
  const seg = p.split('/').filter(Boolean)
  return `content/${seg.join('/')}.md`
}

type GhFile = { sha: string; text: string } | null

async function ghGet(path: string, token: string): Promise<GhFile> {
  const res = await fetch(
    `${API}/repos/${REPO}/contents/${encodeURI(path)}?ref=${BRANCH}`,
    { headers: headers(token), cache: 'no-store' }
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`读取失败（${res.status}）`)
  const json = (await res.json()) as { sha: string; content?: string }
  const text = json.content
    ? new TextDecoder().decode(Uint8Array.from(atob(json.content.replace(/\n/g, '')), (c) => c.charCodeAt(0)))
    : ''
  return { sha: json.sha, text }
}

async function ghPut(path: string, text: string, message: string, token: string, sha?: string) {
  const body: Record<string, unknown> = {
    message,
    content: btoa(String.fromCharCode(...new TextEncoder().encode(text))),
    branch: BRANCH,
  }
  if (sha) body.sha = sha
  const res = await fetch(`${API}/repos/${REPO}/contents/${encodeURI(path)}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    if (res.status === 401 || res.status === 403) throw new Error('令牌无效或权限不足，请检查 Contents 读写授权')
    throw new Error(`提交失败（${res.status}）${detail.slice(0, 120)}`)
  }
}

/** 保存词条页/章节页：正文由编辑态 DOM 生成，frontmatter 原样保留（标题若被改动则同步） */
export async function saveEntryPage(opts: {
  pathname: string
  mainEl: Element
  titleEl: Element | null
  token: string
}) {
  const path = routeToContentPath(opts.pathname)
  const existing = await ghGet(path, opts.token)
  if (!existing) throw new Error('找不到对应的内容文件，请确认页面路径')

  let front = ''
  const m = existing.text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (m) {
    front = `---\n${m[1]}\n---\n`
  }

  if (opts.titleEl) {
    const newTitle = (opts.titleEl.textContent ?? '').trim()
    if (newTitle) {
      const oldTitle = front.match(/^title:\s*(.+)$/m)?.[1]?.trim().replace(/^"|"$/g, '')
      if (newTitle !== oldTitle) {
        const safe = newTitle.replace(/"/g, '“')
        front = /^title: .*$/m.test(front)
          ? front.replace(/^title: .*$/m, `title: "${safe}"`)
          : `---\ntitle: "${safe}"\n---\n`
      }
    }
  }

  const newBody = domToMarkdown(opts.mainEl)
  const text = front + newBody
  await ghPut(path, text, `墨种之境：编辑「${pageTitle(opts.titleEl, path)}」`, opts.token, existing.sha)
}

/** 保存首页：欢迎语/导语进 home.config.json；标题改动写回 index.mdx 的 frontmatter */
export async function saveHomepage(opts: {
  titleEl: Element | null
  taglineEl: Element | null
  introEl: Element | null
  token: string
}) {
  const configPath = 'content/home.config.json'
  const existingConfig = await ghGet(configPath, opts.token)
  if (!existingConfig) throw new Error('找不到 content/home.config.json')
  const config = JSON.parse(existingConfig.text) as {
    title: string
    tagline: string
    intro: string
    recent: { href: string; text: string; desc: string }[]
  }

  const newTitle = (opts.titleEl?.textContent ?? '').trim()
  const tagline = (opts.taglineEl?.textContent ?? '').trim()
  const intro = (opts.introEl?.textContent ?? '').trim()
  if (newTitle) config.title = newTitle
  if (tagline) config.tagline = tagline
  if (intro) config.intro = intro
  await ghPut(
    configPath,
    JSON.stringify(config, null, 2) + '\n',
    '墨种之境：编辑首页欢迎语',
    opts.token,
    existingConfig.sha
  )

  if (opts.titleEl) {
    const newTitle = (opts.titleEl.textContent ?? '').trim()
    const idxPath = 'content/index.mdx'
    const idx = await ghGet(idxPath, opts.token)
    if (idx && newTitle) {
      const updated = /^title: .*$/m.test(idx.text)
        ? idx.text.replace(/^title: .*$/m, `title: "${newTitle.replace(/"/g, '“')}"`)
        : idx.text
      if (updated !== idx.text) {
        await ghPut(idxPath, updated, '墨种之境：编辑首页标题', opts.token, idx.sha)
      }
    }
  }
}

function pageTitle(titleEl: Element | null, path: string): string {
  const t = titleEl?.textContent?.trim()
  return t || path.split('/').pop() || path
}
