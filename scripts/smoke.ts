// 冒烟测试：读本地 public/data，把每个国家 × 若干区域真实生成一遍并校验。
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const dataDir = fileURLToPath(new URL('../public/data/', import.meta.url));
globalThis.fetch = (async (url: string) => {
  const file = String(url).split('/data/')[1];
  try {
    const body = await readFile(dataDir + file, 'utf8');
    return { ok: true, status: 200, json: async () => JSON.parse(body) };
  } catch {
    return { ok: false, status: 404, json: async () => ({}) };
  }
}) as unknown as typeof fetch;

const { COUNTRIES, generateRecord } = await import('../src/core/registry');

const luhn = (n: string) => {
  let sum = 0;
  [...n].reverse().forEach((c, i) => {
    let d = Number(c);
    if (i % 2) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    sum += d;
  });
  return sum % 10 === 0;
};

const fnrOk = (f: string) => {
  const d = [...f].map(Number);
  const c = (digs: number[], w: number[]) => {
    const r = w.reduce((s, x, i) => s + x * digs[i], 0) % 11;
    return r === 0 ? 0 : 11 - r;
  };
  return d[9] === c(d, [3, 7, 6, 1, 8, 9, 4, 5, 2]) && d[10] === c(d, [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]) && Number(f.slice(2, 4)) > 80;
};

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.log('  ✗', msg);
};

for (const def of COUNTRIES) {
  let groups;
  try {
    groups = await def.loadRegions();
  } catch (e) {
    fail(`${def.code}: loadRegions ${(e as Error).message}`);
    continue;
  }
  const items = groups.flatMap((g) => g.items);
  const picks = ['RANDOM', ...items.filter((o) => o.value !== 'RANDOM').slice(0, 3).map((o) => o.value)];
  if (def.code === 'US') picks.push('TAXFREE', 'DE', 'CA', 'AK');
  const variants = def.variants?.map((v) => v.value) ?? ['zh'];
  let sample = '';
  let ok = 0;
  for (const region of picks) {
    for (const variant of variants) {
      for (let n = 0; n < 3; n++) {
        try {
          const r = await generateRecord(def.code, { region, subRegion: '', variant, identity: true, card: true });
          for (const k of ['firstName', 'lastName', 'street', 'city', 'phone', 'email', 'fullAddress'] as const)
            if (!r[k]) fail(`${def.code}/${region}: empty ${k} -> ${JSON.stringify(r)}`);
          if (!r.postcode && def.code !== 'HK') fail(`${def.code}/${region}: empty postcode`);
          if (!luhn(r.card!.raw)) fail(`${def.code}: card fails Luhn ${r.card!.raw}`);
          if (def.code === 'NO' && !fnrOk(r.identity!.idValue)) fail(`NO: bad fnr ${r.identity!.idValue}`);
          if (def.code === 'US' && region === 'TAXFREE' && !r.taxFree) fail('US TAXFREE not flagged');
          if (/undefined|NaN|\[object/.test(JSON.stringify(r))) fail(`${def.code}: bad token in ${r.fullAddress}`);
          ok++;
          sample = `${r.firstName} ${r.lastName} | ${r.fullAddress} | ${r.phone} | ${r.identity!.idValue}`;
        } catch (e) {
          fail(`${def.code}/${region}/${variant}: ${(e as Error).message}`);
        }
      }
    }
  }
  console.log(`${def.code}  ${ok} ok  e.g. ${sample}`);
}
// 二级区域
for (const code of ['AU', 'KR', 'PH', 'TR', 'NO'] as const) {
  const def = COUNTRIES.find((c) => c.code === code)!;
  if (!def.loadSubRegions) continue;
  const region = (await def.loadRegions().catch(() => [])).flatMap((g) => g.items).find((o) => o.value !== 'RANDOM')?.value;
  if (!region) continue;
  const subs = await def.loadSubRegions(region);
  const r = await generateRecord(code, { region, subRegion: subs[0]?.value ?? '', variant: 'zh', identity: false, card: false });
  console.log(`  sub ${code}: ${region} -> ${subs.length} options, picked ${subs[0]?.value} => ${r.fullAddress}`);
}
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
