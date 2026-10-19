// 把编辑态 DOM 转回 Markdown（覆盖本站渲染所用的元素子集）
// 标题锚点图标、无文本节点会被自动跳过

function isBlock(el: Element): boolean {
  return /^(H[1-6]|P|UL|OL|LI|BLOCKQUOTE|HR|PRE|TABLE|DIV|SECTION|FIGURE)$/.test(el.tagName)
}

/** 行内序列化：strong/em/code/a/br，其余取纯文本 */
function inline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').replace(/\s+/g, ' ')
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node as Element
  // 标题锚点、装饰图标等无文本或纯图标元素
  if (el.classList.contains('anchor') || el.getAttribute('aria-hidden') === 'true') return ''
  switch (el.tagName) {
    case 'STRONG':
    case 'B': {
      const t = children(el).trim()
      return t ? `**${t}**` : ''
    }
    case 'EM':
    case 'I': {
      const t = children(el).trim()
      return t ? `*${t}*` : ''
    }
    case 'CODE': {
      const t = (el.textContent ?? '').trim()
      return t ? `\`${t}\`` : ''
    }
    case 'A': {
      const href = el.getAttribute('href') ?? ''
      const t = children(el).trim()
      if (!t) return ''
      if (!href || href.startsWith('#')) return t // 页内锚点不产生链接语法
      return `[${t}](${href})`
    }
    case 'BR':
      return '\n'
    case 'IMG': {
      const src = el.getAttribute('src') ?? ''
      const alt = el.getAttribute('alt') ?? ''
      return src ? `![${alt}](${src})` : ''
    }
    default: {
      if (isBlock(el)) return '' // 行内位置遇到块级元素由块级遍历处理
      return children(el)
    }
  }
}

function children(el: Element): string {
  let out = ''
  el.childNodes.forEach((n) => {
    out += inline(n)
  })
  return out
}

/** 块级序列化 */
export function domToMarkdown(root: Element): string {
  const blocks: string[] = []

  const walk = (parent: Element) => {
    parent.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = (node.textContent ?? '').trim()
        if (t) blocks.push(t)
        return
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return
      const el = node as Element

      if (/^H[1-6]$/.test(el.tagName)) {
        const level = Math.min(Number(el.tagName[1]), 6)
        const text = children(el).trim()
        if (text) blocks.push(`${'#'.repeat(level)} ${text}`)
        return
      }
      if (el.tagName === 'P') {
        const text = children(el).trim()
        if (text) blocks.push(text)
        return
      }
      if (el.tagName === 'UL' || el.tagName === 'OL') {
        emitList(el, 0)
        return
      }
      if (el.tagName === 'BLOCKQUOTE') {
        const inner = domToMarkdown(el)
          .split('\n')
          .map((l) => `> ${l}`.trimEnd())
          .join('\n')
        if (inner) blocks.push(inner)
        return
      }
      if (el.tagName === 'HR') {
        blocks.push('---')
        return
      }
      if (el.tagName === 'PRE') {
        blocks.push('```\n' + (el.textContent ?? '').trim() + '\n```')
        return
      }
      if (isBlock(el)) {
        walk(el) // div 等容器：下钻
        return
      }
    })
  }

  const emitList = (list: Element, depth: number) => {
    const pad = '  '.repeat(depth)
    let i = 1
    list.childNodes.forEach((node) => {
      if (!(node instanceof Element) || node.tagName !== 'LI') return
      // 顶层行内内容
      let line = ''
      const subLists: Element[] = []
      node.childNodes.forEach((n) => {
        if (n instanceof Element && (n.tagName === 'UL' || n.tagName === 'OL')) {
          subLists.push(n)
        } else {
          line += inline(n)
        }
      })
      line = line.trim()
      if (line) blocks.push(`${pad}${list.tagName === 'OL' ? `${i}. ` : '- '}${line}`)
      i += 1
      subLists.forEach((sub) => emitList(sub, depth + 1))
    })
  }

  walk(root)
  return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n') + '\n'
}
