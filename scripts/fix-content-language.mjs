/**
 * 一次性内容修复（2026-10-19）：
 * 1. 字面 \n → 真实换行（adventurers/cinder-arcana 等章从旧数据带出的转义残留）
 * 2. 句中夹杂的英文词 → 中文（保留「中文名+英文名」的名词解释模式）
 * 同时应用到 content/ 与 source/（防止将来 migrate 回退）。
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const WORD_FIXES = [
  ["对应动物的 instincts——", "对应动物的本能——"],
  ["以 pack（狼群）为基本的组织单位", "以狼群为基本的组织单位"],
  ["。 daring的冒险者", "。大胆的冒险者"],
  ["纯度与visibility", "纯度与显露"],
  ["是 childhood friends 的延续", "是童年友谊的延续"],
  ["借来的 thunder，终将归还。", "借来的雷电，终将归还。"],
  ["那些 ink 渗入虚空的裂痕", "那些墨水渗入虚空的裂痕"],
  ["** leather 装帧**", "**皮革装帧**"],
  ["皮肤完全 translucent，", "皮肤完全透明，"],
  ["他无法屏蔽任何 sensation，", "他无法屏蔽任何感官刺激，"],
];

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (f.endsWith(".md")) out.push(p);
  }
  return out;
}

const targets = [...walk("content"), join("source", "三缝之地_网站设定原文_一字不差.md")];
let newlineFiles = 0;
let newlineCount = 0;
const wordHits = new Map();

for (const f of targets) {
  let text = readFileSync(f, "utf8");
  let changed = false;

  // 1) 字面 \n → 真实换行
  const nlMatches = text.match(/\\n/g);
  if (nlMatches) {
    text = text.replace(/\\n/g, "\n");
    newlineFiles += 1;
    newlineCount += nlMatches.length;
    changed = true;
  }

  // 2) 英文词修正
  for (const [bad, good] of WORD_FIXES) {
    if (text.includes(bad)) {
      const n = text.split(bad).length - 1;
      text = text.split(bad).join(good);
      wordHits.set(bad, (wordHits.get(bad) ?? 0) + n);
      changed = true;
    }
  }

  if (changed) writeFileSync(f, text);
}

console.log(`✓ \\n 修复：${newlineFiles} 个文件 / ${newlineCount} 处`);
for (const [k, v] of wordHits) console.log(`✓ 「${k.slice(0, 14)}…」→ ${v} 处`);
if (wordHits.size !== WORD_FIXES.length)
  console.log(`⚠ 有 ${WORD_FIXES.length - wordHits.size} 个词未命中，请检查`);
