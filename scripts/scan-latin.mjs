// 一次性分析：找出正文里残留的英文词（排除标题/副标题/名词解释等合法模式）
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (f.endsWith(".md")) out.push(p);
  }
  return out;
}

const findings = new Map();
for (const f of walk("content")) {
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    const t = line
      .replace(/^#.*$/, "") // 标题行
      .replace(/^\*[^*]+\*.*$/, "") // 副标题行
      .replace(/「[^」]*[A-Za-z][^」]*」/g, "") // 引号内名词解释
      .replace(/[一-鿿][A-Za-z][A-Za-z' \-]+/g, "") // 中文名+英文
      .replace(/[A-Za-z][A-Za-z' \-]*（[^）]*）/g, "") // 英文+括号中文
      .replace(/\bThe\s+[A-Za-z'\-]+\b/g, "")
      .replace(/\b(End|Seal|Edict|Word|Wrath|Sigil|Tome|Press|Loom)\w*\b/g, ""); // 术法名词族
    for (const m of t.matchAll(/[A-Za-z][A-Za-z'\-]{1,}/g)) {
      const w = m[0];
      if (/^(md|png|svg|http|https|www|jpg)$/.test(w)) continue;
      if (!findings.has(w)) findings.set(w, []);
      if (findings.get(w).length < 2)
        findings
          .get(w)
          .push(
            `${f}:${i + 1} …${line.slice(Math.max(0, m.index - 16), m.index + w.length + 12).trim()}…`
          );
    }
  });
}
for (const [w, ctx] of [...findings.entries()].sort((a, b) => b[1].length - a[1].length))
  console.log(`${w}  ←  ${ctx.join("  |  ")}`);
console.log("共", findings.size, "个不同英文词");
