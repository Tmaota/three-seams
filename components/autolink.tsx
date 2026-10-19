import { Fragment, isValidElement, cloneElement } from 'react'
import Link from 'next/link'
import { allRoutes } from '@/lib/routes.generated'
import { isUsed, markUsed, selfTitle } from '@/lib/autolink-state'

// 本模块必须保持服务端组件（RSC）：互链在构建期生成，客户端不重渲染，
// 与 lib/autolink-state 的每页模块级状态配套。

// 词条表：所有页面标题（过滤单字与无意义词），长词优先匹配
const STOPLIST = new Set(['概述', '目录', '本章词条'])

type Term = { term: string; href: string }

export const glossary: Term[] = allRoutes
  .filter((r) => r.chapter !== '目录')
  .map((r) => ({ term: r.title, href: r.href }))
  .filter((t) => t.term.length >= 2 && !STOPLIST.has(t.term))
  .sort((a, b) => b.term.length - a.term.length)

/** 在一段文本里找下一个可互链的词条：位置最靠前，同位置取最长词 */
function findNext(text: string): { index: number; match: Term } | null {
  let best: { index: number; match: Term } | null = null
  for (const t of glossary) {
    if (isUsed(t.term) || t.term === selfTitle()) continue
    const i = text.indexOf(t.term)
    if (i === -1) continue
    if (!best || i < best.index || (i === best.index && t.term.length > best.match.term.length)) {
      best = { index: i, match: t }
    }
  }
  return best
}

/** 文本 → （互链 + 余文）分段 */
function linkifyText(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let rest = text
  let k = 0
  // 每段最多链 3 个词条，防止整段都是链接
  while (rest.length > 0) {
    const hit = findNext(rest)
    if (!hit || k >= 3) {
      parts.push(rest)
      break
    }
    if (hit.index > 0) parts.push(rest.slice(0, hit.index))
    markUsed(hit.match.term)
    parts.push(
      <Link key={`${keyPrefix}-${k}`} href={hit.match.href} className="sf-gloss" title={hit.match.term}>
        {hit.match.term}
      </Link>
    )
    k += 1
    rest = rest.slice(hit.index + hit.match.term.length)
  }
  return parts
}

/**
 * 遍历 MDX 渲染树的文本节点并插入互链。
 * 跳过：已有链接（带 href 的元素）、标记 data-sf-skip 的区域。
 */
export function linkifyChildren(children: React.ReactNode): React.ReactNode {
  return linkifyNode(children, 'r')
}

function linkifyNode(node: React.ReactNode, key: string): React.ReactNode {
  if (typeof node === 'string') return linkifyText(node, key)
  if (typeof node === 'number' || node == null || typeof node === 'boolean') return node
  if (Array.isArray(node)) {
    return node.map((n, i) => (
      <Fragment key={`${key}-${i}`}>{linkifyNode(n, `${key}-${i}`)}</Fragment>
    ))
  }
  if (isValidElement(node)) {
    const el = node as React.ReactElement<Record<string, unknown>>
    if (el.props?.href != null) return node // 已是链接，不再嵌套
    if ((el.props as { 'data-sf-skip'?: boolean })?.['data-sf-skip']) return node
    return cloneElement(el, undefined, linkifyNode(el.props?.children as React.ReactNode, key))
  }
  return node
}
