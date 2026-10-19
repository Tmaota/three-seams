export type InfoboxData = Record<string, string>

export type PageMeta = {
  title: string
  chapter: string
  infobox?: InfoboxData
  tags: string[]
}
