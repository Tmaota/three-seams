// 静态资源路径拼接：项目页部署在 /<仓库名>/ 子路径下
// next/image 的字符串 src 在 unoptimized 模式下不自动加 basePath，故统一走这里
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function asset(path: string): string {
  return `${BASE_PATH}${path}`
}
