import { loadData } from './data';
import { generateEmail, randomElement, randomInt } from './rng';
import type { AddressDraft, Gender, RegionGroup } from './types';

interface NgRow {
  state: string;
  stateFullName: string;
  city: string;
  district?: string;
  street: string;
  houseNumber?: string;
  postcode: string;
}

interface NgMeta {
  states: Record<string, { name: { en: string; zh?: string }; aCount: number; bCount: number; areaCodes?: string[] }>;
}

interface NgNames {
  nameGroups: { western: { first: { male: string[]; female: string[] }; last: string[] } };
}

export async function ngRegions(): Promise<RegionGroup[]> {
  const meta = await loadData<NgMeta>('ngMeta.json');
  const items = Object.entries(meta.states)
    .map(([value, s]) => ({
      value,
      label: { zh: s.name.zh ?? s.name.en, en: s.name.en },
      hint: value,
    }))
    .sort((a, b) => a.label.en.localeCompare(b.label.en));
  return [{ id: 'all', title: { zh: '全部州', en: 'All states' }, items }];
}

/** 优先使用完整度更高的 A 类记录，该州没有时才回退到 B 类（补全门牌号）。 */
export async function generateNg(region: string): Promise<AddressDraft> {
  const [a, names, meta] = await Promise.all([
    loadData<{ addresses: NgRow[] }>('ngData-A.json'),
    loadData<NgNames>('ngNamesData.json'),
    loadData<NgMeta>('ngMeta.json'),
  ]);
  const pick = (rows: NgRow[]) => (region && region !== 'RANDOM' ? rows.filter((r) => r.state === region) : rows);
  let pool = pick(a.addresses);
  let synthesiseHouse = false;
  if (!pool.length) {
    pool = pick((await loadData<{ addresses: NgRow[] }>('ngData-B.json')).addresses);
    synthesiseHouse = true;
  }
  if (!pool.length) throw new Error('所选州暂无可用地址数据');

  const row = randomElement(pool);
  const gender: Gender = Math.random() < 0.5 ? 'male' : 'female';
  const western = names.nameGroups.western;
  const firstName = randomElement(western.first[gender]);
  const lastName = randomElement(western.last);
  const house = row.houseNumber || (synthesiseHouse ? String(randomInt(1, 220)) : '');
  const street = house ? `${house} ${row.street}` : row.street;
  const prefixes = [...new Set(Object.values(meta.states).flatMap((s) => s.areaCodes ?? []))];
  const district = row.district ?? '';
  return {
    firstName, lastName, gender,
    phone: `+234 ${randomElement(prefixes.length ? prefixes : ['803', '806', '813'])} ${randomInt(100, 999)} ${randomInt(1000, 9999)}`,
    email: generateEmail(firstName, lastName),
    street, city: row.city, region: row.stateFullName, regionCode: row.state, district,
    postcode: row.postcode,
    fullAddress: `${street}, ${district ? `${district}, ` : ''}${row.city}, ${row.stateFullName} ${row.postcode}, Nigeria`,
  };
}
