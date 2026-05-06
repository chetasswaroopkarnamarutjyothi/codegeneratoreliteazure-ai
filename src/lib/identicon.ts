// GitHub-style identicon generator. Produces deterministic SVG data URL from a seed string.
function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return h >>> 0;
}

export function generateIdenticon(seed: string, size = 256): string {
  const h = hash(seed || "user");
  const hue = h % 360;
  const bg = `hsl(${hue} 70% 12%)`;
  const fg = `hsl(${hue} 85% 60%)`;
  const grid = 5;
  const cell = size / grid;
  let rects = "";
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < Math.ceil(grid / 2); x++) {
      const bit = (h >> (y * 3 + x)) & 1;
      if (bit) {
        rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${fg}"/>`;
        if (x < Math.floor(grid / 2)) {
          rects += `<rect x="${(grid - 1 - x) * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${fg}"/>`;
        }
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="${bg}"/>${rects}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
