// 本地预览静态导出（out/）用的极简静态服务器，仅供开发调试
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    path = normalize(path).replace(/^(\.\.[/\\])+/, "");
    let file = join(OUT, path);
    const st = await stat(file).catch(() => null);
    if (st?.isDirectory()) file = join(file, "index.html");
    const data = await readFile(file).catch(async () => {
      // 兜底：无尾斜杠目录或 404 → 依次尝试 index.html 与 404.html
      const idx = join(OUT, path, "index.html");
      return readFile(idx).catch(() => readFile(join(OUT, "404.html")));
    });
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(500);
    res.end("server error");
  }
});

server.listen(PORT, () => console.log(`out/ preview at http://localhost:${PORT}`));
