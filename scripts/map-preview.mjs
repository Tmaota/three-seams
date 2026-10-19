// 生成地图草稿预览页：drafts/world-map-draft.svg + 设定图例 → drafts/preview.html
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(ROOT, "drafts", "world-map-draft.svg"), "utf8");

const legend = `
<h2>图例（依设定原文）</h2>
<ul>
  <li><b>中枢</b>：镜湖 · 湖心庭城（三席议会）· 低语者之环（环湖扇区）</li>
  <li><b>最北</b>：神脊峰 · 十二神神殿（山腰环形神殿群，12 个金点）</li>
  <li><b>西北</b>：岩铸领（高原矿山）· 首都铁砧城（暗金方城）</li>
  <li><b>东北</b>：暴冠高地（永恒风暴，闪电）· 东海岸雷殒滩（玻璃沙滩）</li>
  <li><b>东北外海</b>：浮空群岛（精灵咏唱议会，岛底挂云）</li>
  <li><b>正南</b>：缄林（最大森林）· 中心语结林地 · 最南端泥沼回廊（沼泽）</li>
  <li><b>灰色走廊</b>：裂脉峡谷（岩铸领↔暴冠高地）· 石根森林（岩铸领↔缄林）· 焦痕走廊（暴冠高地↔缄林）</li>
  <li><b>走廊交汇</b>：烬汽城（烬械学派大本营，金+余烬+烟柱）</li>
  <li><b>外围</b>：西海岸锻炉废墟 · 东南针牙礁（尖针礁群）· 西南远海遗落神殿（孤岛八角塔）</li>
  <li><b>交通</b>：暗金虚线＝旧商道；浅蓝细线＝镜河水系；金帆小船＝风翼船</li>
</ul>
<p>调色板与站内像素图标同源：深海 #2f4460 · 湖水 #4a6a8c · 羊皮纸 #f0e0c0 · 石灰 #8c8578 · 森林 #5a8c4a · 风暴紫 #6a4a8c · 余烬 #c8502e · 金 #e8b64c · 墨 #2b2233</p>
`;

const html = `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>世界地图草稿 · 验收</title>
<style>
  body { margin: 0; padding: 24px; background: #f4f1ea; font: 14px/1.7 system-ui, "Microsoft YaHei", sans-serif; color: #2b2233; display: flex; gap: 28px; flex-wrap: wrap; }
  .map { background: #fff; padding: 12px; border: 1px solid #d8d2c4; border-radius: 8px; }
  .map img { width: 800px; image-rendering: pixelated; display: block; }
  .side { max-width: 360px; }
  h1 { font-family: "Noto Serif SC", serif; }
  ul { padding-left: 1.2em; }
  li { margin: 0.35em 0; }
</style></head>
<body>
  <div class="map"><img src="./world-map-draft.svg" alt="世界地图草稿"></div>
  <div class="side"><h1>三缝之地 · 世界地图草稿</h1>${legend}</div>
</body>
</html>`;

writeFileSync(join(ROOT, "drafts", "preview.html"), html);
console.log("✓ drafts/preview.html 已生成");
