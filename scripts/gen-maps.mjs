// Run with: node scripts/gen-maps.mjs. No runtime or third-party dependencies.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const P = Object.freeze({
  sea: '#2f4460', water: '#4a6a8c', sand: '#f0e0c0', stone: '#8c8578',
  mountain: '#5c564d', green: '#5a8c4a', forest: '#3d5c2e', storm: '#6a4a8c',
  purple: '#3d2b57', ember: '#c8502e', red: '#8c2f1e', gold: '#e8b64c',
  ochre: '#c98a2e', ink: '#2b2233',
});
const COLORS = new Set(Object.values(P));
const TAU = Math.PI * 2;

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const escapeXML = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[c]);

class MapArt {
  constructor(name, width, height, seed, title, component) {
    Object.assign(this, { name, width, height, seed, title, component });
    this.random = mulberry32(seed);
    this.elements = [];
    this.hotspots = [];
    this.labels = [];
    this.rectCount = 0;
  }

  int(min, max) { return min + Math.floor(this.random() * (max - min + 1)); }
  pick(values) { return values[this.int(0, values.length - 1)]; }

  // Every terrain feature, sprite, coastline and line is made of integer rects.
  rect(x, y, w, h, fill) {
    assert([x, y, w, h].every(Number.isInteger), `${this.name}: fractional rect`);
    assert(w > 0 && h > 0 && COLORS.has(fill), `${this.name}: invalid rect`);
    const x1 = Math.max(0, x), y1 = Math.max(0, y);
    const x2 = Math.min(this.width, x + w), y2 = Math.min(this.height, y + h);
    if (x2 <= x1 || y2 <= y1) return;
    this.elements.push(`<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" fill="${fill}" />`);
    this.rectCount++;
  }

  layer(name, draw) {
    this.elements.push(`<g data-layer="${escapeXML(name)}">`);
    draw();
    this.elements.push('</g>');
  }

  label(text, x, y) {
    this.labels.push(text);
    this.elements.push(`<text x="${x}" y="${y}" font-family="Noto Serif SC, serif" fill="${P.ink}" paint-order="stroke" stroke="${P.sand}" stroke-width="0.8" font-size="${this.name === 'world' ? 4.5 : 5}" text-anchor="middle">${escapeXML(text)}</text>`);
  }

  hot(id, label, x, y, w, h) { this.hotspots.push({ id, label, x, y, w, h }); }

  mask(predicate) {
    const mask = new Uint8Array(this.width * this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) mask[y * this.width + x] = +!!predicate(x, y);
    }
    return mask;
  }

  has(mask, x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height && !!mask[y * this.width + x];
  }

  polygon(points) {
    return this.mask((x, y) => {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i], [xj, yj] = points[j];
        if ((yi > y + 0.5) !== (yj > y + 0.5) &&
          x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    });
  }

  ellipse(cx, cy, rx, ry = rx) {
    return this.mask((x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1);
  }

  intersect(a, b) { return a.map((v, i) => v && b[i] ? 1 : 0); }

  expand(mask, radius) {
    const offsets = [];
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) if (x * x + y * y <= radius * radius) offsets.push([x, y]);
    }
    return this.mask((x, y) => offsets.some(([dx, dy]) => this.has(mask, x + dx, y + dy)));
  }

  fill(mask, color) {
    // Horizontal run-length encoding keeps silhouettes crisp and files compact.
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width;) {
        if (!this.has(mask, x, y)) { x++; continue; }
        const start = x;
        while (this.has(mask, x, y)) x++;
        this.rect(start, y, x - start, 1, color);
      }
    }
  }

  edge(mask, color) {
    this.fill(this.mask((x, y) => this.has(mask, x, y) &&
      [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => !this.has(mask, x + dx, y + dy))), color);
  }

  texture(mask, density = 0.08, colors = [P.stone]) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.has(mask, x, y) && this.random() < density) this.rect(x, y, 1, 1, this.pick(colors));
      }
    }
  }

  coast(mask, base = P.sand) {
    this.fill(this.expand(mask, 3), P.water);
    this.fill(this.expand(mask, 1), P.sand);
    this.fill(mask, base);
  }

  wave(x, y, color = P.water) {
    this.rect(x, y, 2, 1, color);
    this.rect(x + 3, y, 1, 1, color);
  }

  sea() {
    this.rect(0, 0, this.width, this.height, P.sea);
    for (let y = 4; y < this.height - 2; y += this.int(6, 10)) {
      for (let x = this.int(2, 6); x < this.width - 5; x += this.int(6, 10)) this.wave(x, y);
    }
  }

  waveGroup(x, y, count = 5) {
    for (let i = 0; i < count; i++) this.wave(x + (i % 3) * 6, y + Math.floor(i / 3) * 3, i % 3 === 0 ? P.sand : P.water);
  }

  line(points, color, dashed = false, mask = null) {
    let step = 0, previous = '';
    for (let i = 1; i < points.length; i++) {
      let [x, y] = points[i - 1];
      const [x2, y2] = points[i];
      const dx = Math.abs(x2 - x), dy = -Math.abs(y2 - y);
      const sx = x < x2 ? 1 : -1, sy = y < y2 ? 1 : -1;
      let error = dx + dy;
      for (;;) {
        const key = `${x},${y}`;
        if (key !== previous) {
          if ((!dashed || step % 3 < 2) && (!mask || this.has(mask, x, y))) this.rect(x, y, 1, 1, color);
          step++;
          previous = key;
        }
        if (x === x2 && y === y2) break;
        const e2 = error * 2;
        if (e2 >= dy) { error += dy; x += sx; }
        if (e2 <= dx) { error += dx; y += sy; }
      }
    }
  }

  loop(cx, cy, rx, ry, color, dashed = false) {
    const points = [];
    for (let i = 0; i <= 96; i++) {
      const a = i / 96 * TAU;
      points.push([Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry)]);
    }
    this.line(points, color, dashed);
  }

  river(anchors) {
    const points = [anchors[0]];
    for (let i = 1; i < anchors.length; i++) {
      const [x1, y1] = anchors[i - 1], [x2, y2] = anchors[i];
      const distance = Math.hypot(x2 - x1, y2 - y1);
      for (let d = this.int(3, 6); d < distance; d += this.int(3, 6)) {
        const t = d / distance;
        points.push([Math.round(x1 + (x2 - x1) * t) + this.int(-1, 1), Math.round(y1 + (y2 - y1) * t) + this.int(-1, 1)]);
      }
      points.push(anchors[i]);
    }
    this.line(points, P.water);
  }

  tree(x, y, petrified = false, stoneTrunk = false) {
    this.rect(x + 1, y + 2, 1, 1, stoneTrunk ? P.stone : P.ink);
    const light = this.random() < 0.6;
    const crown = petrified ? (stoneTrunk && !light ? P.forest : P.stone) : (light ? P.green : P.forest);
    this.rect(x, y, 2, 2, crown);
  }

  forest(mask, density = 1, petrified = false, spacing = 3, stoneTrunk = false) {
    // A full 3x3 cell has four crown pixels + one trunk: 55.6% tree coverage.
    for (let y = 0; y < this.height - 2; y += spacing) {
      for (let x = (Math.floor(y / spacing) % 2); x < this.width - 2; x += spacing) {
        if (this.has(mask, x, y) && this.has(mask, x + 1, y + 2) && this.random() < density) this.tree(x, y, petrified, stoneTrunk);
      }
    }
  }

  mountain(x, y, snowy = false) {
    const width = this.int(3, 5), height = this.int(3, 5), mid = Math.floor(width / 2);
    for (let row = 0; row < height; row++) {
      const left = Math.max(0, mid - Math.floor(row / 2));
      const right = Math.min(width - 1, mid + Math.ceil(row / 2));
      this.rect(x + left, y + row, right - left + 1, 1, P.mountain);
      this.rect(x + right + 1, y + row + 1, 1, 1, P.ink);
    }
    if (snowy || this.random() < 0.18) this.rect(x + mid, y, 1, 1, P.sand);
  }

  mountains(mask, snowy = false, spacing = 4) {
    for (let y = 0; y < this.height - 6; y += spacing) {
      for (let x = this.int(0, 3); x < this.width - 6; x += this.int(3, 5)) {
        if (this.has(mask, x, y) && this.has(mask, x + 5, y + 5)) this.mountain(x, y + this.int(0, 1), snowy && this.random() < 0.7);
      }
    }
  }

  house(x, y, roof = P.gold) {
    this.rect(x, y, 4, 5, P.ink);
    this.rect(x + 1, y + 1, 2, 3, P.stone);
    this.rect(x + 1, y, 2, 1, roof);
    this.rect(x + 2, y + 3, 1, 1, P.ochre);
  }

  town(cx, cy, size = 5) {
    this.rect(cx - 6, cy - 4, 13, 10, P.ink);
    this.rect(cx - 5, cy - 3, 11, 8, P.sand);
    for (const [dx, dy] of [[-5, -3], [2, -3], [-4, 0], [2, 0]]) this.house(cx + dx, cy + dy);
    const left = cx - Math.floor(size / 2), top = cy - Math.floor(size / 2);
    this.rect(left, top, size, size, P.ink);
    this.rect(left + 1, top + 1, size - 2, size - 2, P.ochre);
    this.rect(left + 1, top, size - 2, 1, P.gold);
    this.rect(cx, cy + Math.floor(size / 2), 1, 2, P.sand);
  }

  smoke(x, y, height = 8) {
    for (let i = 0; i < height; i++) this.rect(x + Math.floor(i / 3) % 2, y - i, 2, 1, i % 3 ? P.stone : P.mountain);
  }

  factory(cx, cy, size = 6) {
    this.town(cx, cy, size);
    this.rect(cx - 3, cy - 2, 6, 1, P.ember);
    this.rect(cx - 2, cy, 2, 2, P.red);
    this.rect(cx + 1, cy, 2, 2, P.gold);
    this.rect(cx - 5, cy - 6, 2, 5, P.ink);
    this.rect(cx + 3, cy - 7, 2, 6, P.mountain);
    this.smoke(cx - 5, cy - 7, size === 8 ? 12 : 8);
    this.smoke(cx + 3, cy - 8, 8);
    // Four teeth around a square gear hub.
    for (const [dx, dy] of [[0, -2], [2, 0], [0, 2], [-2, 0]]) this.rect(cx + 8 + dx, cy + dy, 1, 1, P.ochre);
    this.rect(cx + 7, cy - 1, 3, 3, P.gold);
    this.rect(cx + 8, cy, 1, 1, P.ink);
  }

  court(cx, cy, size) {
    const x = cx - size / 2, y = cy - size / 2;
    this.rect(x, y, size, size, P.ink);
    this.rect(x + 1, y + 1, size - 2, size - 2, P.gold);
    this.rect(x + 1, y, size - 2, 1, P.ochre);
    this.rect(x + 2, y + 1, size - 4, 1, P.sand);
    for (let dx = 1; dx < size; dx += 2) {
      this.rect(x + dx, y + 3, 1, size - 3, P.sand);
      this.rect(x + dx, y + size, 1, 1, P.gold);
      if (size === 8) this.rect(x + dx, y - 1, 1, 1, P.gold);
    }
    if (size === 8) {
      for (let dy = 1; dy < size; dy += 2) {
        this.rect(x - 1, y + dy, 1, 1, P.gold);
        this.rect(x + size, y + dy, 1, 1, P.gold);
      }
    }
    this.rect(cx, cy + 1, 1, 2, P.purple);
  }

  lake(cx, cy, radius, courtSize) {
    const mask = this.ellipse(cx, cy, radius);
    this.fill(this.expand(mask, 1), P.stone);
    this.fill(mask, P.water);
    for (let y = cy - radius + 2; y < cy + radius - 1; y += 4) {
      for (let x = cx - radius + this.int(1, 4); x < cx + radius - 3; x += 6) {
        if (this.has(mask, x, y) && this.has(mask, x + 3, y)) this.wave(x, y, P.sand);
      }
    }
    this.court(cx, cy, courtSize);
  }

  lightning(x, y) {
    this.line([[x + 3, y], [x, y + 4], [x + 3, y + 4], [x - 1, y + 9]], P.gold);
  }

  ruins(cx, cy) {
    for (const [dx, dy] of [[-4, -4], [1, -2], [-3, 3], [3, 4]]) {
      this.rect(cx + dx, cy + dy, 4, 3, P.mountain);
      this.rect(cx + dx, cy + dy, 1, 3, P.ink);
      this.rect(cx + dx + 2, cy + dy + 1, 2, 1, P.ember);
      this.rect(cx + dx + 1, cy + dy - 1, 1, 1, P.stone);
    }
    for (let i = 0; i < 5; i++) this.rect(cx - 2 + i % 2, cy - 5 - i, 1, 1, P.stone);
    this.rect(cx + 5, cy + 2, 1, 1, P.gold);
  }

  swamp(mask) {
    this.fill(mask, P.forest);
    this.texture(mask, 0.32, [P.water, P.water, P.green, P.stone]);
    for (let y = 0; y < this.height - 3; y += 4) {
      for (let x = this.int(0, 3); x < this.width - 3; x += 5) {
        if (!this.has(mask, x + 2, y + 2) || !this.has(mask, x, y)) continue;
        this.rect(x, y, 1, 3, P.ink);
        this.rect(x + 2, y + 1, 1, 2, P.ochre);
        if (this.random() < 0.3) this.rect(x + 1, y - 1, 1, 1, P.gold);
      }
    }
  }

  needles(x, y, width, height, count) {
    for (let i = 0; i < count; i++) {
      const nx = x + Math.floor(i * (width - 2) / count), ny = y + this.int(6, height);
      const h = this.int(4, 7);
      this.rect(nx - 1, ny, 3, 1, P.water);
      this.rect(nx, ny - h, 1, h, P.stone);
      this.rect(nx + 1, ny - 2, 1, 2, P.ink);
      this.rect(nx, ny - h, 1, 1, P.sand);
    }
  }

  tower(cx, base, large = false) {
    const w = large ? 8 : 2, h = large ? 16 : 9;
    const x = cx - w / 2, y = base - h;
    if (large) {
      // Stepped corners form an octagonal silhouette without diagonals/transforms.
      this.rect(x + 2, y, 4, 16, P.ink);
      this.rect(x + 1, y + 1, 6, 14, P.ink);
      this.rect(x, y + 2, 8, 12, P.ink);
      this.rect(x + 1, y + 3, 6, 9, P.purple);
      this.rect(x + 2, y + 2, 4, 1, P.gold);
      this.rect(x + 2, y + 12, 4, 1, P.ochre);
      this.rect(x + 2, y + 4, 1, 8, P.gold);
      this.rect(x + 5, y + 4, 1, 8, P.storm);
      this.rect(cx, y + 5, 1, 2, P.sand);
      this.rect(cx, y - 1, 1, 1, P.gold);
      this.rect(cx, base - 3, 1, 3, P.ochre);
    } else {
      this.rect(x, y, w, h, P.purple);
      this.rect(x, y + 1, 1, h - 2, P.gold);
      this.rect(x - 1, base - 2, w + 2, 1, P.ochre);
      this.rect(x, y - 1, w, 1, P.gold);
    }
  }

  ship(x, y, small = false) {
    if (small) {
      this.rect(x, y + 2, 4, 1, P.ochre);
      this.rect(x + 1, y, 1, 2, P.ink);
      this.rect(x + 2, y, 1, 2, P.gold);
      return;
    }
    this.rect(x, y + 3, 6, 1, P.ochre);
    this.rect(x + 1, y + 2, 4, 1, P.ink);
    this.rect(x + 2, y, 1, 3, P.ink);
    this.rect(x + 3, y, 2, 2, P.gold);
    this.rect(x + 4, y + 1, 2, 1, P.gold);
  }

  frame() {
    for (const [x, y, sx, sy] of [[2, 2, 1, 1], [this.width - 4, 2, -1, 1],
      [2, this.height - 4, 1, -1], [this.width - 4, this.height - 4, -1, -1]]) {
      this.rect(sx > 0 ? x : x - 8, y, 10, 2, P.ink);
      this.rect(x, sy > 0 ? y : y - 8, 2, 10, P.ink);
    }
    const x = this.width - 14, y = 7;
    this.rect(x + 2, y, 1, 6, P.ink);
    this.rect(x, y + 3, 6, 1, P.ink);
    this.rect(x + 2, y, 1, 3, P.gold);
    this.rect(x + 1, y + 2, 1, 1, P.gold);
    this.rect(x + 3, y + 2, 1, 1, P.gold);
  }

  serialize() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" shape-rendering="crispEdges" role="img" aria-label="${escapeXML(this.title)}">\n${this.elements.map((e) => `    ${e}`).join('\n')}\n  </svg>`;
    // The literal SVG subtree is deliberately byte-identical in both outputs.
    const tsx = `// Generated by scripts/gen-maps.mjs; seed=${this.seed}.\nexport default function ${this.component}() {\n  return (\n    ${svg}\n  );\n}\n\nexport const hotspots: { id: string; label: string; x: number; y: number; w: number; h: number }[] = ${JSON.stringify(this.hotspots, null, 2)};\n`;
    return { svg: `${svg}\n`, tsx };
  }
}

function world() {
  const m = new MapArt('world', 256, 176, 20251019, '三缝之地世界地图', 'ArtWorld');
  m.layer('渊海与海岸', () => m.sea());
  const land = m.polygon([[15, 59], [21, 48], [25, 37], [34, 29], [46, 28], [52, 23], [65, 23],
    [72, 17], [84, 18], [90, 12], [104, 10], [118, 12], [132, 10], [147, 14], [156, 20],
    [165, 27], [177, 25], [187, 30], [201, 29], [208, 36], [211, 45], [219, 49], [218, 58],
    [222, 64], [216, 71], [210, 75], [212, 84], [207, 91], [210, 99], [199, 106], [194, 115],
    [180, 116], [169, 124], [155, 127], [148, 136], [143, 143], [131, 146], [119, 148],
    [107, 145], [97, 139], [89, 137], [81, 131], [68, 129], [63, 122], [51, 119], [47, 113],
    [36, 111], [29, 104], [27, 94], [21, 89], [25, 80], [19, 74], [15, 67]]);
  m.layer('大陆与草地', () => { m.coast(land); m.texture(land); });
  const rock = m.intersect(land, m.polygon([[29, 34], [51, 28], [75, 30], [90, 38], [88, 58], [94, 69], [79, 81], [53, 77], [35, 81], [26, 65]]));
  m.layer('岩铸领矿脉', () => {
    m.fill(rock, P.stone);
    m.texture(rock, 0.19, [P.mountain, P.sand]);
    for (let y = 34; y < 79; y += 4) {
      for (let x = 30 + y % 3; x < 89; x += 4) {
        if (m.has(rock, x, y) && m.has(rock, x + 2, y + 2)) {
          m.rect(x, y, 2, 2, (x + y) % 3 ? P.mountain : P.stone);
          m.rect(x + 1, y + 2, 2, 1, P.ink);
          if (m.random() < 0.14) m.rect(x, y, 1, 1, P.gold);
        }
      }
    }
    m.mountains(m.intersect(rock, m.mask((x, y) => x < 45 || y < 35 || y > 69)), false, 5);
  });
  const storm = m.intersect(land, m.polygon([[155, 31], [176, 29], [196, 32], [207, 40], [210, 61], [200, 80], [182, 77], [161, 81], [151, 67], [148, 47]]));
  m.layer('暴冠高地风暴', () => {
    m.fill(storm, P.storm);
    m.texture(storm, 0.33, [P.purple, P.purple, P.stone]);
    for (let y = 34; y < 77; y += 6) {
      for (let x = 153 + m.int(0, 3); x < 207; x += 7) {
        if (m.has(storm, x + 3, y + 1)) m.rect(x, y, 3, 1, P.purple);
      }
    }
    m.lightning(166, 50); m.lightning(192, 57);
  });
  const rift = m.polygon([[91, 32], [108, 29], [121, 32], [139, 30], [150, 39], [145, 51], [151, 58], [130, 61], [118, 56], [101, 61], [88, 52]]);
  m.layer('裂脉峡谷', () => {
    m.fill(rift, P.mountain); m.texture(rift, 0.25, [P.stone, P.ink]);
    for (let i = 0; i < 4; i++) {
      const y = 34 + i * 6;
      const points = [[91, y], [102, y + 3], [111, y - 1], [121, y + 4], [131, y + 1], [148, y + 5]];
      m.line(points, P.ink, false, rift);
      m.line([[111, y - 1], [113, y - 4], [118, y - 6]], P.ink, false, rift);
    }
  });
  const stonewood = m.intersect(land, m.polygon([[27, 84], [43, 82], [59, 88], [63, 100], [54, 111], [39, 114], [25, 103]]));
  m.layer('石根森林', () => { m.texture(stonewood, 0.12); m.forest(stonewood, 0.72, true, 3); });
  const scorched = m.intersect(land, m.polygon([[154, 85], [172, 81], [186, 86], [199, 88], [202, 100], [194, 110], [170, 113], [151, 105]]));
  m.layer('焦痕走廊', () => {
    m.fill(scorched, P.stone); m.texture(scorched, 0.37, [P.mountain, P.mountain, P.ember, P.red]);
    for (const [x, y] of [[155, 92], [173, 105], [189, 89], [194, 106]]) { m.rect(x, y, 1, 3, P.ink); m.rect(x - 1, y + 1, 3, 1, P.ink); }
  });
  const woods = m.intersect(land, m.polygon([[81, 101], [94, 95], [106, 104], [122, 107], [138, 101], [154, 96], [160, 111], [154, 124], [142, 136], [116, 138], [98, 133], [84, 135], [78, 119]]));
  m.layer('缄林密林', () => m.forest(woods));
  const marsh = m.intersect(land, m.polygon([[98, 136], [113, 133], [130, 136], [145, 134], [148, 142], [138, 147], [119, 148], [105, 145], [96, 141]]));
  m.layer('泥沼回廊', () => m.swamp(marsh));
  const ridge = m.intersect(land, m.polygon([[57, 23], [82, 15], [106, 10], [133, 10], [152, 17], [164, 28], [139, 26], [119, 24], [99, 27], [77, 29]]));
  m.layer('神脊峰与十二神殿', () => {
    m.texture(ridge, 0.2, [P.stone]); m.mountains(ridge, true, 3);
    for (let i = 0; i < 12; i++) {
      const x = 74 + i * 7, y = 26 - Math.round(Math.sin(i / 11 * Math.PI) * 5), size = i === 6 ? 3 : 2;
      m.rect(x, y, size, size, P.gold); m.rect(x, y + size, size, 1, P.ink);
    }
  });
  m.layer('镜河水系', () => {
    m.river([[118, 79], [121, 64], [117, 51], [122, 37], [119, 27]]);
    m.river([[109, 89], [94, 91], [81, 86], [66, 91], [52, 93], [39, 101]]);
    m.river([[119, 97], [121, 106], [115, 118], [121, 134]]);
  });
  m.layer('旧商道与环湖聚落', () => {
    m.line([[52, 52], [65, 55], [78, 64], [92, 66], [98, 78], [102, 88], [106, 98], [116, 103], [118, 116], [136, 115], [150, 105], [177, 101], [180, 86], [176, 78]], P.ochre, true);
    m.loop(118, 88, 17, 17, P.ochre, true);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU, x = Math.round(118 + Math.cos(a) * 17), y = Math.round(88 + Math.sin(a) * 17);
      m.rect(x - 1, y - 1, 2, 2, P.ochre); m.rect(x - 1, y - 1, 2, 1, P.gold);
    }
    m.town(52, 52); m.factory(92, 66);
    m.rect(117, 115, 3, 3, P.gold); m.rect(118, 116, 1, 1, P.ochre);
  });
  m.layer('镜湖与湖心庭城', () => m.lake(118, 88, 10, 6));
  m.layer('海岸遗迹与浮空群岛', () => {
    m.ruins(22, 63);
    const glass = m.intersect(land, m.polygon([[212, 50], [218, 49], [222, 64], [216, 70], [211, 65]]));
    m.fill(glass, P.water);
    for (let y = 50; y < 71; y += 2) for (let x = 211 + y % 3; x < 223; x += 3) if (m.has(glass, x, y)) m.rect(x, y, 1, 1, P.sand);
    for (const [x, y, w] of [[171, 9, 12], [190, 15, 10], [213, 7, 12], [231, 17, 9]]) {
      m.rect(x - 2, y + 5, w + 3, 1, P.sand); m.rect(x + 1, y + 7, w - 2, 1, P.sand);
      m.rect(x + 2, y + 2, w - 4, 4, P.mountain); m.rect(x + 4, y + 5, 2, 2, P.stone);
      m.rect(x, y, w, 2, P.stone); m.rect(x + 1, y - 1, w - 2, 2, P.green);
      m.rect(x + 3, y - 3, 2, 2, P.gold); m.rect(x + w - 3, y, 1, 1, P.forest);
    }
  });
  m.layer('远海', () => {
    m.needles(177, 153, 40, 12, 13);
    const island = m.polygon([[34, 159], [37, 156], [43, 156], [47, 160], [43, 163], [35, 162]]);
    m.coast(island, P.stone); m.texture(island, 0.2, [P.mountain]); m.tower(40, 162);
    m.ship(224, 156); m.ship(61, 154, true);
    m.waveGroup(11, 134); m.waveGroup(228, 113); m.waveGroup(133, 159);
  });
  m.layer('地名', () => {
    for (const [s, x, y] of [
      ['神脊峰', 120, 16], ['岩铸领', 56, 40], ['暴冠高地', 180, 40], ['浮空群岛', 204, 12],
      ['裂脉峡谷', 118, 44], ['石根森林', 40, 98], ['焦痕走廊', 176, 98], ['烬汽城', 92, 78],
      ['镜湖 · 湖心庭', 118, 72], ['低语者之环', 118, 104], ['缄林', 118, 126], ['泥沼回廊', 120, 144],
      ['锻炉废墟', 24, 50], ['雷殒滩', 214, 46], ['针牙礁', 196, 148], ['遗落神殿', 40, 150],
      ['渊 海', 228, 140], ['铁砧城', 52, 63],
    ]) m.label(s, x, y);
  });
  m.layer('图框与指北针', () => m.frame());
  for (const box of [[59, 18, 32, 12], [90, 10, 49, 18], [139, 15, 25, 15]]) m.hot('god-s-spine', '神脊峰', ...box);
  for (const box of [[29, 32, 59, 37], [35, 69, 47, 12]]) m.hot('stonewrought', '岩铸领', ...box);
  m.hot('stormcrest', '暴冠高地', 151, 30, 59, 50);
  for (const box of [[169, 6, 16, 11], [188, 12, 14, 11], [211, 4, 16, 11], [229, 14, 13, 11]]) m.hot('sky-isles', '浮空群岛', ...box);
  m.hot('corridors', '灰色走廊 · 裂脉峡谷', 89, 30, 62, 31);
  m.hot('corridors', '灰色走廊 · 石根森林', 25, 83, 38, 31);
  m.hot('corridors', '灰色走廊 · 焦痕走廊', 151, 83, 51, 30);
  m.hot('cinderveil', '烬汽城', 85, 51, 18, 22);
  // Eight compact boxes surround the lake; none touches its water or city.
  for (const box of [[110, 68, 16, 9], [126, 73, 9, 7], [130, 80, 8, 16], [126, 96, 9, 7],
    [110, 100, 16, 8], [102, 96, 8, 7], [98, 80, 8, 16], [102, 73, 8, 7]]) m.hot('circlet', '低语者之环', ...box);
  m.hot('mutewood', '缄林', 80, 108, 77, 23); m.hot('mutewood', '缄林', 95, 131, 48, 6);
  m.hot('lake-court', '镜湖 · 湖心庭', 108, 78, 20, 20);
  for (const [label, box] of [['锻炉废墟', [16, 54, 13, 18]], ['雷殒滩', [210, 49, 13, 22]],
    ['针牙礁', [176, 152, 41, 14]], ['遗落神殿', [34, 152, 13, 12]], ['泥沼回廊', [96, 135, 52, 14]]]) m.hot('outer', label, ...box);
  return m;
}

function circlet() {
  const m = new MapArt('circlet', 200, 140, 77, '低语者之环区域地图', 'ArtCirclet');
  m.layer('外围海面', () => m.sea());
  const land = m.mask((x, y) => {
    const dx = (x + 0.5 - 100) / 80, dy = (y + 0.5 - 70) / 58;
    const a = Math.atan2(dy, dx);
    return Math.hypot(dx, dy) < 1 + 0.022 * Math.sin(a * 11) + 0.018 * Math.cos(a * 7);
  });
  m.layer('环湖陆地', () => { m.coast(land); m.texture(land); });
  const outer = m.ellipse(100, 70, 74, 53), inner = m.ellipse(100, 70, 22);
  m.layer('七扇区弧形边界', () => {
    m.edge(outer, P.ink); m.edge(inner, P.ink);
    for (const degrees of [22.5, 67.5, 112.5, 157.5, 225, 292.5, 337.5]) {
      const a = degrees * Math.PI / 180, sx = Math.sin(a), sy = -Math.cos(a);
      const r = 1 / Math.sqrt((sx / 74) ** 2 + (sy / 53) ** 2);
      m.line([[Math.round(100 + sx * 22), Math.round(70 + sy * 22)],
        [Math.round(100 + sx * r), Math.round(70 + sy * r)]], P.ink);
    }
    m.loop(100, 70, 48, 37, P.ochre, true);
    m.loop(100, 70, 19, 19, P.ochre, true);
  });
  m.layer('沿岸树木与聚落', () => {
    const fringe = m.mask((x, y) => m.has(land, x, y) && !m.has(outer, x, y));
    m.forest(fringe, 0.45, false, 4);
    for (const [x, y] of [[80, 33], [118, 31], [143, 52], [149, 91], [116, 112], [67, 100], [42, 57]]) m.house(x, y);
  });
  m.layer('仲裁区天平', () => {
    const x = 97, y = 25;
    m.rect(x + 3, y, 1, 6, P.gold); m.rect(x, y + 1, 6, 1, P.gold);
    m.rect(x, y + 2, 1, 2, P.ochre); m.rect(x + 5, y + 2, 1, 2, P.ochre);
    m.rect(x, y + 4, 2, 1, P.gold); m.rect(x + 4, y + 4, 2, 1, P.gold);
    m.rect(x + 2, y + 5, 3, 1, P.ink);
  });
  m.layer('声颂区音符与竖琴', () => {
    m.rect(128, 34, 1, 6, P.gold); m.rect(126, 39, 2, 2, P.gold); m.rect(129, 34, 2, 1, P.ochre);
    m.rect(134, 32, 7, 1, P.gold); m.rect(134, 33, 1, 8, P.ochre);
    m.rect(140, 33, 1, 8, P.gold); m.rect(135, 40, 5, 1, P.gold);
    for (let x = 136; x < 140; x += 2) m.rect(x, 34, 1, 6, P.ink);
  });
  m.layer('墨缚区书塔与墨瓶', () => {
    m.rect(146, 65, 5, 6, P.ink); m.rect(147, 63, 3, 2, P.ink); m.rect(147, 66, 2, 2, P.storm);
    for (let i = 0; i < 4; i++) {
      m.rect(155 + i % 2, 70 - i * 3, 7, 3, P.ink);
      m.rect(156 + i % 2, 70 - i * 3, 5, 1, i % 2 ? P.ochre : P.stone);
      m.rect(156 + i % 2, 71 - i * 3, 4, 1, P.sand);
    }
  });
  m.layer('平纹区六色牌坊', () => {
    const colors = [P.red, P.gold, P.green, P.water, P.storm, P.purple];
    colors.forEach((c, i) => m.rect(130 + i * 2, 96, 1, 7, c));
    m.rect(129, 94, 13, 2, P.stone); m.rect(129, 93, 13, 1, P.ink);
    m.rect(128, 103, 15, 1, P.ochre);
  });
  m.layer('肤触区织物', () => {
    m.rect(40, 68, 15, 10, P.ink);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 13; x++) m.rect(41 + x, 69 + y, 1, 1, (x + y) % 2 ? P.stone : P.ochre);
    for (let x = 41; x < 54; x += 3) m.rect(x, 78, 1, 3, P.ochre);
  });
  m.layer('炼金区坩埚', () => {
    m.rect(59, 36, 9, 1, P.ink); m.rect(60, 37, 7, 5, P.ink);
    m.rect(61, 38, 5, 3, P.purple); m.rect(61, 36, 5, 1, P.green);
    m.rect(61, 42, 1, 2, P.ochre); m.rect(65, 42, 1, 2, P.ochre);
    for (const [x, y] of [[62, 33], [65, 30], [63, 27]]) m.rect(x, y, 1, 1, P.green);
    m.rect(59, 44, 9, 1, P.ember);
  });
  m.layer('缄默区灰幕', () => {
    m.rect(88, 102, 17, 1, P.ink);
    for (let i = 0; i < 8; i++) {
      m.rect(89 + i * 2, 103, 1, 9 - i % 2, P.mountain);
      m.rect(90 + i * 2, 103, 1, 8, P.stone);
    }
    m.rect(87, 113, 20, 1, P.ink);
    for (let x = 88; x < 107; x += 3) m.rect(x, 111, 1, 5, P.ink);
  });
  m.layer('镜湖与湖心庭城', () => { m.lake(100, 70, 16, 8); m.ship(88, 74, true); m.ship(106, 79, true); });
  m.layer('地名', () => {
    for (const [s, x, y] of [['镜湖 · 湖心庭', 100, 60], ['仲裁区', 100, 40], ['声颂区', 134, 51],
      ['墨缚区', 154, 82], ['平纹区', 136, 112], ['肤触区', 48, 89], ['炼金区', 64, 54], ['缄默区', 97, 124]]) m.label(s, x, y);
  });
  m.layer('图框与指北针', () => m.frame());
  m.hot('lake-court', '镜湖 · 湖心庭', 84, 54, 32, 32);
  m.hot('arbiter', '仲裁区', 85, 17, 30, 28);
  m.hot('canticle', '声颂区', 118, 25, 31, 29);
  m.hot('scriptorium', '墨缚区', 133, 53, 40, 33);
  m.hot('dermis', '肤触区', 27, 58, 44, 40);
  m.hot('plainweave', '平纹区', 119, 89, 37, 29);
  m.hot('crucible', '炼金区', 45, 25, 36, 32);
  m.hot('hush', '缄默区', 77, 96, 41, 29);
  return m;
}

function corridors() {
  const m = new MapArt('corridors', 256, 112, 777, '灰色走廊区域地图', 'ArtCorridors');
  const land = m.mask(() => true);
  m.layer('陆地草纹', () => { m.fill(land, P.sand); m.texture(land); });
  const rift = m.polygon([[20, 17], [33, 14], [49, 17], [67, 14], [85, 16], [107, 13], [131, 17], [151, 14],
    [171, 17], [195, 14], [215, 16], [235, 14], [232, 25], [237, 34], [220, 38], [197, 35], [177, 38],
    [152, 35], [133, 39], [111, 35], [94, 38], [71, 35], [53, 38], [35, 35], [21, 38], [24, 27]]);
  m.layer('裂脉峡谷裂缝网', () => {
    m.fill(rift, P.mountain); m.texture(rift, 0.3, [P.stone, P.stone, P.ink]);
    for (let i = 0; i < 5; i++) {
      const start = 22 + i * 41, points = [];
      for (let j = 0; j < 10; j++) points.push([start + j * 5, 21 + (j % 2 ? 6 : 0) + m.int(-3, 3)]);
      m.line(points, P.ink, false, rift);
      for (let j = 2; j < 9; j += 3) {
        const [x, y] = points[j];
        m.line([[x, y], [x - 2, y + 4], [x + 1, y + 7], [x - 2, y + 10]], P.ink, false, rift);
        m.line([[x + 5, y], [x + 7, y - 4], [x + 11, y - 7]], P.ink, false, rift);
      }
    }
    m.texture(rift, 0.017, [P.green]);
  });
  const petrified = m.polygon([[20, 74], [33, 70], [52, 73], [69, 69], [84, 73], [105, 71], [111, 83],
    [106, 95], [87, 98], [71, 94], [52, 98], [34, 96], [21, 99], [18, 88]]);
  m.layer('石根森林', () => { m.texture(petrified, 0.13, [P.mountain]); m.forest(petrified, 0.76, true, 3, true); });
  const ash = m.polygon([[140, 75], [156, 70], [177, 73], [192, 70], [208, 74], [234, 71], [237, 83],
    [232, 97], [216, 95], [195, 99], [175, 95], [154, 98], [140, 93], [144, 84]]);
  m.layer('焦痕走廊', () => {
    m.fill(ash, P.stone); m.texture(ash, 0.37, [P.mountain, P.mountain, P.ember, P.red]);
    for (const [x, y] of [[160, 80], [211, 88]]) {
      m.rect(x, y, 2, 5, P.ink); m.rect(x - 2, y + 2, 2, 1, P.ink); m.rect(x + 2, y + 1, 2, 1, P.ink);
      m.rect(x - 1, y + 5, 4, 1, P.mountain); m.rect(x, y + 4, 1, 1, P.ember);
    }
  });
  m.layer('商道与工坊聚落', () => {
    m.line([[10, 52], [37, 53], [60, 52], [83, 50], [107, 55], [129, 52], [153, 55], [178, 51], [204, 54], [245, 52]], P.ochre, true);
    m.town(124, 52); m.town(204, 53); m.factory(60, 52, 8);
    for (const [x, y] of [[14, 65], [121, 87], [244, 77]]) m.mountain(x, y);
  });
  m.layer('地名', () => {
    m.label('裂脉峡谷', 128, 29); m.label('烬汽城', 60, 66);
    m.label('石根森林', 65, 89); m.label('焦痕走廊', 188, 88);
  });
  m.layer('图框与指北针', () => m.frame());
  m.hot('riftvein', '裂脉峡谷', 20, 14, 217, 25);
  m.hot('cinderveil', '烬汽城', 53, 34, 18, 26);
  m.hot('petrified-root', '石根森林', 19, 70, 92, 29);
  m.hot('scorched-thoroughfare', '焦痕走廊', 140, 70, 97, 29);
  return m;
}

function outer() {
  const m = new MapArt('outer', 256, 144, 7777, '外围场景区域地图', 'ArtOuter');
  m.layer('渊海', () => m.sea());
  const mainland = m.polygon([[0, 0], [81, 0], [85, 8], [90, 14], [84, 18], [88, 26], [80, 33], [70, 34],
    [72, 39], [60, 44], [58, 50], [46, 57], [39, 60], [29, 53], [26, 44], [20, 42], [18, 35], [11, 33], [12, 24], [5, 24], [0, 28]]);
  m.layer('岩铸领西南海岸', () => {
    m.coast(mainland); m.texture(mainland, 0.18, [P.stone]);
    m.mountains(m.intersect(mainland, m.mask((x, y) => x > 24 || y < 18)), false, 4);
    m.ruins(18, 32);
  });
  m.layer('雷殒滩玻璃沙洲', () => {
    const glass = m.polygon([[170, 18], [176, 14], [185, 12], [192, 15], [200, 14], [198, 21], [191, 25], [182, 24], [175, 27], [169, 23]]);
    m.coast(glass, P.water);
    for (let y = 12; y < 28; y += 2) for (let x = 169 + y % 3; x < 200; x += 3) if (m.has(glass, x, y)) m.rect(x, y, 1, 1, m.random() < 0.8 ? P.sand : P.storm);
    m.lightning(185, 13);
  });
  m.layer('泥沼回廊', () => {
    const marsh = m.polygon([[101, 109], [112, 103], [124, 104], [131, 100], [146, 103], [158, 101], [168, 109],
      [165, 117], [170, 123], [160, 128], [148, 127], [136, 132], [123, 129], [110, 131], [104, 123], [99, 119]]);
    m.coast(marsh, P.forest); m.swamp(marsh);
    m.river([[103, 115], [116, 111], [126, 116], [136, 112], [146, 116], [158, 113], [166, 116]]);
    m.river([[131, 104], [129, 110], [133, 119], [130, 129]]);
  });
  m.layer('针牙礁', () => m.needles(181, 97, 49, 31, 17));
  m.layer('遗落神殿', () => {
    const island = m.polygon([[30, 120], [34, 114], [39, 115], [44, 111], [51, 115], [57, 116], [60, 122], [54, 126], [44, 125], [36, 127], [30, 124]]);
    m.coast(island, P.stone); m.texture(island, 0.3, [P.mountain, P.purple]);
    m.tower(45, 123, true);
    m.rect(35, 119, 2, 4, P.mountain); m.rect(54, 120, 2, 3, P.ink);
  });
  m.layer('航线与帆船', () => {
    m.line([[20, 44], [18, 53], [23, 65], [22, 77], [30, 89], [35, 102], [39, 110]], P.ochre, true);
    m.ship(25, 72); m.ship(123, 60); m.ship(214, 49, true);
    m.waveGroup(63, 87, 6); m.waveGroup(204, 75, 6); m.waveGroup(113, 28, 6);
  });
  m.layer('地名', () => {
    m.label('锻炉废墟', 22, 50); m.label('雷殒滩', 185, 36); m.label('泥沼回廊', 136, 139);
    m.label('针牙礁', 207, 92); m.label('遗落神殿', 45, 102);
  });
  m.layer('图框与指北针', () => m.frame());
  m.hot('cinderworks', '锻炉废墟', 10, 21, 17, 23);
  m.hot('fulminated-shore', '雷殒滩', 169, 12, 31, 15);
  m.hot('mirechoir', '泥沼回廊', 99, 100, 71, 32);
  m.hot('needleteeth', '针牙礁', 180, 96, 50, 33);
  m.hot('forsaken-spire', '遗落神殿', 30, 106, 30, 21);
  return m;
}

const SPECS = {
  world: {
    seed: 20251019, size: [256, 176], count: 10, minimum: true,
    ids: ['god-s-spine', 'stonewrought', 'stormcrest', 'sky-isles', 'corridors', 'cinderveil', 'circlet', 'mutewood', 'lake-court', 'outer'],
    labels: ['神脊峰', '岩铸领', '暴冠高地', '浮空群岛', '裂脉峡谷', '石根森林', '焦痕走廊', '烬汽城', '镜湖 · 湖心庭', '低语者之环', '缄林', '泥沼回廊', '锻炉废墟', '雷殒滩', '针牙礁', '遗落神殿', '渊 海', '铁砧城'],
  },
  circlet: {
    seed: 77, size: [200, 140], count: 8,
    ids: ['lake-court', 'arbiter', 'canticle', 'scriptorium', 'dermis', 'plainweave', 'crucible', 'hush'],
    labels: ['镜湖 · 湖心庭', '仲裁区', '声颂区', '墨缚区', '平纹区', '肤触区', '炼金区', '缄默区'],
  },
  corridors: {
    seed: 777, size: [256, 112], count: 4,
    ids: ['riftvein', 'cinderveil', 'petrified-root', 'scorched-thoroughfare'],
    labels: ['裂脉峡谷', '烬汽城', '石根森林', '焦痕走廊'],
  },
  outer: {
    seed: 7777, size: [256, 144], count: 5,
    ids: ['cinderworks', 'fulminated-shore', 'mirechoir', 'needleteeth', 'forsaken-spire'],
    labels: ['锻炉废墟', '雷殒滩', '泥沼回廊', '针牙礁', '遗落神殿'],
  },
};

function validate(m, { svg, tsx }) {
  const spec = SPECS[m.name];
  assert.equal(m.seed, spec.seed);
  assert.deepEqual([m.width, m.height], spec.size);
  assert.equal(tsx.match(/<svg\b[\s\S]*?<\/svg>/)?.[0], svg.trim(), `${m.name}: TSX/SVG mismatch`);
  assert(svg.includes(`viewBox="0 0 ${m.width} ${m.height}" shape-rendering="crispEdges"`));
  assert(!/<(?:path|circle|ellipse|image|use|style|script|filter|linearGradient|radialGradient)\b|\b(?:opacity|transform|rx|ry|style)=/i.test(svg));
  for (const color of svg.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) assert(COLORS.has(color), `${m.name}: ${color}`);
  const rects = [...svg.matchAll(/<rect\b([^>]+)\/>/g)];
  assert.equal(rects.length, m.rectCount);
  for (const [, attrs] of rects) {
    const value = (key) => Number(attrs.match(new RegExp(`\\b${key}="([^\"]+)"`))?.[1]);
    const x = value('x'), y = value('y'), w = value('width'), h = value('height');
    assert([x, y, w, h].every(Number.isInteger));
    assert(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= m.width && y + h <= m.height);
  }
  assert.deepEqual([...m.labels].sort(), [...spec.labels].sort(), `${m.name}: labels`);
  const texts = [...svg.matchAll(/<text\b([^>]+)>([^<]*)<\/text>/g)];
  assert.equal(texts.length, spec.labels.length);
  for (const [, attrs] of texts) {
    for (const required of ['font-family="Noto Serif SC, serif"', `fill="${P.ink}"`, 'paint-order="stroke"',
      `stroke="${P.sand}"`, 'stroke-width="0.8"', `font-size="${m.name === 'world' ? 4.5 : 5}"`, 'text-anchor="middle"']) assert(attrs.includes(required));
  }
  assert(spec.minimum ? m.hotspots.length >= spec.count : m.hotspots.length === spec.count, `${m.name}: hotspots`);
  assert.deepEqual([...new Set(m.hotspots.map((h) => h.id))].sort(), [...spec.ids].sort());
  const exportedHotspots = JSON.parse(tsx.slice(tsx.indexOf('[] = ') + 5).trim().replace(/;$/, ''));
  assert.deepEqual(exportedHotspots, m.hotspots);
  for (const h of m.hotspots) {
    assert([h.x, h.y, h.w, h.h].every(Number.isInteger) && h.w > 0 && h.h > 0);
    assert(h.x >= 0 && h.y >= 0 && h.x + h.w <= m.width && h.y + h.h <= m.height);
    assert(/[\u3400-\u9fff]/.test(h.label));
    if (m.name === 'world' && h.id === 'circlet') {
      for (let y = h.y; y < h.y + h.h; y++) for (let x = h.x; x < h.x + h.w; x++) {
        assert(Math.hypot(x + 0.5 - 118, y + 0.5 - 88) > 10, 'Circlet hotspot overlaps lake');
      }
    }
  }
  if (m.name === 'world') {
    assert.equal(m.hotspots.filter((h) => h.id === 'outer').length, 5);
    assert.equal(m.hotspots.filter((h) => h.id === 'corridors').length, 3);
  }
}

// Build and validate everything before writing any of the eight artifacts.
const maps = [world, circlet, corridors, outer].map((build) => {
  const map = build(), output = map.serialize();
  validate(map, output);
  assert.deepEqual(build().serialize(), output, `${map.name}: seed is not reproducible`);
  return { map, output };
});

const report = [];
for (const { map, output } of maps) {
  for (const [relative, content] of [[`components/maps/art-${map.name}.tsx`, output.tsx], [`public/maps/${map.name}.svg`, output.svg]]) {
    const path = join(ROOT, relative);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, 'utf8');
    assert.equal(readFileSync(path, 'utf8'), content, `Output mismatch: ${relative}`);
    report.push({ file: relative, rects: map.rectCount, bytes: statSync(path).size, hotspots: map.hotspots.length });
  }
  validate(map, {
    tsx: readFileSync(join(ROOT, `components/maps/art-${map.name}.tsx`), 'utf8'),
    svg: readFileSync(join(ROOT, `public/maps/${map.name}.svg`), 'utf8'),
  });
}
report.unshift({ file: 'scripts/gen-maps.mjs', rects: 0, bytes: statSync(fileURLToPath(import.meta.url)).size, hotspots: 0 });
console.table(report);
console.log('PASS: 4 TSX + 4 SVG, integer rects, palette, labels, hotspot IDs/counts/bounds, identical SVG subtrees, reproducible seeds.');
