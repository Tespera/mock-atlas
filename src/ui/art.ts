import type { AddressRecord } from '../core/types';

/** 由记录 id 派生的稳定条形码（纯装饰，不编码真实内容） */
export function barcode(seed: string): string {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);
  let x = 0;
  const bars: string[] = [];
  for (let i = 0; i < 58; i++) {
    const w = 1 + Math.floor(rand() * 3);
    if (i % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${w}" height="40"/>`);
    x += w + (i % 2 === 0 ? 0 : 0);
  }
  return `<svg class="barcode" viewBox="0 0 ${x} 40" preserveAspectRatio="none" aria-hidden="true" fill="currentColor">${bars.join('')}</svg>`;
}

export const trackingCode = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase().replace(/(.{4})/, '$1·');

/** 圆形邮戳 + 波浪消印线 */
export function postmark(r: AddressRecord): string {
  const d = new Date(r.createdAt);
  const stamp = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const ring = `MOCKATLAS · ${r.country} · ${stamp} · `;
  return `
  <svg class="postmark" viewBox="0 0 200 112" aria-hidden="true">
    <defs><path id="pm-ring-${r.id}" d="M56 56m-41 0a41 41 0 1 1 82 0a41 41 0 1 1 -82 0"/></defs>
    <g fill="none" stroke="currentColor">
      <circle cx="56" cy="56" r="50" stroke-width="2.6"/>
      <circle cx="56" cy="56" r="29" stroke-width="1.4"/>
      <path d="M108 30q10 -8 20 0t20 0t20 0t20 0M108 46q10 -8 20 0t20 0t20 0t20 0M108 62q10 -8 20 0t20 0t20 0t20 0M108 78q10 -8 20 0t20 0t20 0t20 0" stroke-width="2.4" stroke-linecap="round"/>
    </g>
    <text font-family="Martian Mono Variable, monospace" font-size="7.4" letter-spacing="1.4" fill="currentColor">
      <textPath href="#pm-ring-${r.id}" startOffset="0">${ring.repeat(2).slice(0, 60)}</textPath>
    </text>
    <text x="56" y="63" text-anchor="middle" font-family="Fraunces Variable, serif" font-style="italic" font-weight="700" font-size="22" fill="currentColor">${r.country}</text>
  </svg>`;
}

/** 免税州金色火漆印 */
export function taxSeal(label: { top: string; bottom: string }): string {
  const spikes = 18;
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (Math.PI * i) / spikes;
    const rad = i % 2 === 0 ? 46 : 41;
    pts.push(`${(50 + Math.cos(a) * rad).toFixed(1)},${(50 + Math.sin(a) * rad).toFixed(1)}`);
  }
  return `
  <svg class="seal" viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <radialGradient id="seal-g" cx="35%" cy="30%" r="80%">
        <stop offset="0" stop-color="#fbe3a0"/><stop offset=".55" stop-color="#e6b44f"/><stop offset="1" stop-color="#a77a1c"/>
      </radialGradient>
    </defs>
    <polygon points="${pts.join(' ')}" fill="url(#seal-g)" stroke="#8c6414" stroke-width="1"/>
    <circle cx="50" cy="50" r="33" fill="none" stroke="#7a5510" stroke-width="1.4" stroke-dasharray="2 2.4"/>
    <text x="50" y="41" text-anchor="middle" font-family="Martian Mono Variable, monospace" font-weight="700" font-size="8" letter-spacing=".6" fill="#4d3507">${label.top}</text>
    <text x="50" y="60" text-anchor="middle" font-family="Fraunces Variable, serif" font-weight="800" font-size="15" fill="#4d3507">${label.bottom}</text>
    <path d="M30 49h40" stroke="#7a5510" stroke-width="1"/>
  </svg>`;
}
