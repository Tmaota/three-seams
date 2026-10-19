/**
 * 扫描 content/ 的 frontmatter，生成 lib/site-data.generated.ts：
 * - pageData: 路由 → { title, chapter, infobox, tags }（infobox 数据、手动标签）
 * - tagIndex: 标签 → 页面列表（含自动附加的章名标签）
 * 用法：构建时自动跑（package.json build / postinstall 均可）
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "content");
const LIB = join(ROOT, "lib");

// —— 极简 frontmatter 解析（覆盖本站用到的子集：title / infobox / tags） ——
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let t;
    if ((t = line.match(/^title:\s*(.+)$/))) out.title = unquote(t[1].trim());
    else if ((t = line.match(/^tags:\s*\[(.*)\]\s*$/))) {
      out.tags = t[1]
        .split(",")
        .map((s) => unquote(s.trim()))
        .filter(Boolean);
    } else if (/^infobox:\s*$/.test(line)) {
      out.infobox = {};
      while (i + 1 < lines.length && /^\s{2,}/.test(lines[i + 1])) {
        i += 1;
        const kv = lines[i].match(/^\s+("?)(.+?)\1:\s*(.+)$/);
        if (kv) out.infobox[unquote(kv[2].trim())] = unquote(kv[3].trim());
      }
    }
  }
  return out;
}

const unquote = (s) => s.replace(/^"(.*)"$/, "$1");

// 章节 zh 名：解析 content/_meta.ts
function chapterNames() {
  const map = {};
  const src = readFileSync(join(CONTENT, "_meta.ts"), "utf8");
  for (const m of src.matchAll(/"([a-z-]+)":\s*"(.+?)"/g)) map[m[1]] = m[2];
  return map;
}

const chapters = chapterNames();
const pageData = {};
const tagIndex = {};

for (const dir of readdirSync(CONTENT)) {
  const dirPath = join(CONTENT, dir);
  if (!statSync(dirPath).isDirectory()) continue;
  const chapter = chapters[dir] ?? dir;

  for (const file of readdirSync(dirPath)) {
    if (!file.endsWith(".md")) continue;
    const slug = file.replace(/\.md$/, "");
    const route = slug === "index" ? `/${dir}` : `/${dir}/${slug}`;
    const fm = parseFrontmatter(readFileSync(join(dirPath, file), "utf8"));

    // 标签：手动 frontmatter 标签 + 自动章名标签
    const tags = new Set(fm.tags ?? []);
    tags.add(chapter);

    pageData[route] = {
      title: fm.title ?? slug,
      chapter,
      infobox: fm.infobox,
      tags: [...tags],
    };

    for (const tag of tags) {
      (tagIndex[tag] ??= []).push({ href: route, title: fm.title ?? slug });
    }
  }
}

const ts = `// 由 scripts/gen-site-data.mjs 生成，勿手改
export const pageData: Record<
  string,
  { title: string; chapter: string; infobox?: Record<string, string>; tags: string[] }
> = ${JSON.stringify(pageData, null, 2)};

export const tagIndex: Record<string, { href: string; title: string }[]> = ${JSON.stringify(
  tagIndex,
  null,
  2
)};

export const allTags = Object.keys(tagIndex).sort((a, b) =>
  (tagIndex[b]?.length ?? 0) - (tagIndex[a]?.length ?? 0)
);
`;
writeFileSync(join(LIB, "site-data.generated.ts"), ts);

const infoboxCount = Object.values(pageData).filter((p) => p.infobox).length;
console.log(
  `✓ site-data：${Object.keys(pageData).length} 页 / ${Object.keys(tagIndex).length} 个标签 / ${infoboxCount} 个 infobox`
);
