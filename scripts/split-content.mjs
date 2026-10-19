/**
 * 三缝之地 · 内容切分脚本
 * 把 E:\三缝\三缝之地_网站设定原文_一字不差.md 按章节/词条切分进 content/，
 * 生成各目录 _meta.ts（侧边栏）与 lib/routes.generated.ts（随机词条用）。
 * 用法：npm run content
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "source", "三缝之地_网站设定原文_一字不差.md");
const CONTENT = join(ROOT, "content");
const LIB = join(ROOT, "lib");

// 章节 slug：沿用旧站图标命名，图标即占位视觉资产
const CHAPTER_SLUGS = {
  万族志: "races",
  地理与势力: "geography",
  术者种族: "magic-users",
  终末形态图鉴: "monsters",
  始源三柱: "primordials",
  天裂纪: "sky-age",
  十二神与历法志: "pantheon",
  退魔者总典: "unraveled",
  阴影议会志: "shadow-council",
  低语者保护协会: "guild",
  冒险者: "adventurers",
  烬械学: "cinder-arcana",
};

/** 中英混排标题拆分：首个 ASCII 字母处断开（章节标题均为纯中文） */
function splitTitle(raw) {
  const t = raw.trim();
  const m = t.match(/^(.*?)\s+([A-Z].*)$/);
  if (m && /[\u4e00-\u9fff]/.test(m[1])) return { zh: m[1], en: m[2].trim() };
  return { zh: t, en: "" };
}

// 无英文名词条的常见语义 slug
const FALLBACK_SLUGS = {
  概述: "overview",
};

/** 英文名 → kebab-case slug */
function enSlug(en) {
  return en
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const yamlTitle = (t) => `"${t.replace(/"/g, "“").trim()}"`;

const src = readFileSync(SRC, "utf8");
const lines = src.split(/\r?\n/);

// —— 解析：章(##) → 词条(###)；####及以下原样保留 ——
const chapters = [];
let ch = null;
let entry = null;
let preamble = true; // 第一个 ## 之前的内容（文件头说明）丢弃

for (const line of lines) {
  if (line.startsWith("## ")) {
    const { zh, en } = splitTitle(line.slice(3));
    const slug = CHAPTER_SLUGS[zh] || enSlug(en) || `ch${chapters.length + 1}`;
    ch = { zh, en, slug, intro: [], entries: [] };
    entry = null;
    chapters.push(ch);
    preamble = false;
    continue;
  }
  if (preamble || !ch) continue;
  if (line.startsWith("### ")) {
    const { zh, en } = splitTitle(line.slice(4));
    entry = { zh, en, body: [] };
    ch.entries.push(entry);
    continue;
  }
  if (entry) entry.body.push(line);
  else ch.intro.push(line);
}

const trimTail = (arr) => {
  const a = [...arr];
  while (a.length && a[a.length - 1].trim() === "") a.pop();
  while (a.length && a[0].trim() === "") a.shift();
  return a;
};
const slugSet = new Set();
const uniqueSlug = (s) => {
  let out = s || "";
  let i = 2;
  while (slugSet.has(out)) out = `${s}-${i++}`;
  slugSet.add(out);
  return out;
};

// —— 写文件（保留手写文件：home.config.json） ——
for (const c of chapters) {
  rmSync(join(CONTENT, c.slug), { recursive: true, force: true });
}
rmSync(join(CONTENT, "index.mdx"), { recursive: true, force: true });
rmSync(join(CONTENT, "_meta.ts"), { force: true });
mkdirSync(CONTENT, { recursive: true });
mkdirSync(LIB, { recursive: true });

const routes = []; // { href, title, chapter }

for (const c of chapters) {
  const dir = join(CONTENT, c.slug);
  mkdirSync(dir, { recursive: true });
  slugSet.clear();

  const introBody = trimTail(c.intro).join("\n");

  slugSet.clear();
  const entrySlugs = new Map();
  for (const e of c.entries) entrySlugs.set(e, uniqueSlug(enSlug(e.en) || `e${c.entries.indexOf(e) + 1}`));

  let indexPage = "---\n";
  indexPage += `title: ${yamlTitle(c.zh)}\n---\n\n`;
  indexPage += `# ${c.zh}\n\n`;
  if (c.en) indexPage += `*${c.en}*\n\n`;
  indexPage += introBody ? `${introBody}\n\n` : "";
  if (c.entries.length) {
    indexPage += "## 本章词条\n\n";
    for (const e of c.entries) indexPage += `- [${e.zh}](./${entrySlugs.get(e)})\n`;
  }
  writeFileSync(join(dir, "index.md"), indexPage);

  let chMeta = `export default {\n  index: ${yamlTitle(c.zh)},\n  "---": { type: "separator", title: "" },\n`;
  for (const e of c.entries) {
    const slug = entrySlugs.get(e);
    const body = trimTail(e.body).join("\n");
    let page = `---\ntitle: ${yamlTitle(e.zh)}\n---\n\n`;
    page += `# ${e.zh}\n\n`;
    if (e.en) page += `*${e.en}*\n\n`;
    page += body ? `${body}\n` : "";
    writeFileSync(join(dir, `${slug}.md`), page);
    chMeta += `  ${JSON.stringify(slug)}: ${yamlTitle(e.zh)},\n`;
    routes.push({ href: `/${c.slug}/${slug}`, title: e.zh, chapter: c.zh });
  }
  chMeta += "}\n";
  writeFileSync(join(dir, "_meta.ts"), chMeta);

  routes.push({ href: `/${c.slug}`, title: c.zh, chapter: "目录" });
}

const rootMeta = `export default {
  index: { display: "hidden", title: "欢迎来到三缝之地" },
${chapters
  .map((c) => `  ${JSON.stringify(c.slug)}: ${yamlTitle(c.zh)},`)
  .join("\n")}\n}
`;
writeFileSync(join(CONTENT, "_meta.ts"), rootMeta);

// 首页：自定义组件经 mdx-components 注册后在此引用
const indexMdx = `---
title: 欢迎来到三缝之地
---

<HomeHero />

<SectionGrid />

<RecentList />
`;
writeFileSync(join(CONTENT, "index.mdx"), indexMdx);

writeFileSync(
  join(LIB, "routes.generated.ts"),
  `// 由 scripts/split-content.mjs 生成，勿手改\nexport const allRoutes = ${JSON.stringify(routes, null, 2)};\n`
);

const entryCount = chapters.reduce((n, c) => n + c.entries.length, 0);
console.log(
  `✓ 切分完成：${chapters.length} 章 / ${entryCount} 词条 → content/；路由清单 ${routes.length} 条 → lib/routes.generated.ts`
);
