// 互链运行时状态（SSG 顺序渲染，模块级状态安全）
// 每页渲染前由 catch-all 调用 resetAutolink，保证「同一词条每页只链一次」
let current: { route: string; title?: string; used: Set<string> } | null = null

export function resetAutolink(route: string, title?: string) {
  current = { route, title, used: new Set() }
}

export function isUsed(term: string): boolean {
  return current?.used.has(term) ?? true
}

export function markUsed(term: string) {
  current?.used.add(term)
}

export function selfTitle(): string | undefined {
  return current?.title
}
