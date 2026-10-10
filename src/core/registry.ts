import { generateCard } from './card';
import { loadData } from './data';
import { generateIdentity } from './identity';
import * as legacy from './legacy.js';
import { generateNg, ngRegions } from './ng';
import { generateOsm, osmRegions, osmSubRegions } from './osm';
import type {
  AddressRecord, CountryCode, CountryDef, Gender, GenerateRequest, Localized, RegionGroup, RegionOption,
} from './types';

/* ---------- 工具 ---------- */

interface NamedEntry {
  name: Localized & { ja?: string };
}

const RANDOM_OPTION: RegionOption = { value: 'RANDOM', label: { zh: '随机', en: 'Random' } };

const bySortKey = (a: RegionOption, b: RegionOption) => a.label.en.localeCompare(b.label.en);

/** 把 `{ KEY: { name: {zh,en} } }` 形式的数据转成区域选项 */
function entriesToOptions(map: Record<string, NamedEntry>, withHint = true): RegionOption[] {
  return Object.entries(map)
    .map(([value, v]) => ({
      value,
      label: { zh: v.name.zh ?? v.name.en, en: v.name.en },
      hint: withHint ? value : undefined,
    }))
    .sort(bySortKey);
}

function simpleGroups(items: RegionOption[], title: Localized): RegionGroup[] {
  return [
    { id: 'special', title: { zh: '快捷', en: 'Quick' }, items: [RANDOM_OPTION] },
    { id: 'all', title, items },
  ];
}

const withRandom = async (groups: Promise<RegionGroup[]>): Promise<RegionGroup[]> => [
  { id: 'special', title: { zh: '快捷', en: 'Quick' }, items: [RANDOM_OPTION] },
  ...(await groups),
];

const POSITIVE = (v: string) => !!v && v !== 'RANDOM';

/** 老生成器返回字段名五花八门，这里统一成 AddressRecord */
function normalise(code: CountryCode, raw: any, extra: Partial<AddressRecord> = {}): AddressRecord {
  const genderText = String(raw.gender ?? '');
  const gender: Gender = /女|female/i.test(genderText) ? 'female' : 'male';
  const clean = (v: unknown) => (v && v !== 'N/A' ? String(v) : '');
  return {
    id: crypto.randomUUID(),
    country: code,
    firstName: raw.firstName,
    lastName: raw.lastName,
    gender,
    surnameFirst: false,
    phone: raw.phone,
    email: raw.email,
    street: raw.street,
    city: raw.city,
    region: clean(raw.state ?? raw.province ?? raw.prefecture ?? raw.region),
    regionCode: clean(raw.stateCode),
    district: clean(raw.county ?? raw.district),
    postcode: clean(raw.zip ?? raw.postcode ?? raw.pin),
    fullAddress: raw.fullAddress,
    createdAt: Date.now(),
    ...extra,
  };
}

/* ---------- 美国 ---------- */

interface UsState extends NamedEntry {
  area_codes: number[];
}

let taxFreeCodes: Promise<string[]> | null = null;
const loadTaxFreeCodes = () =>
  (taxFreeCodes ??= loadData<{ states_available: string[] }>('us_taxfree.min.json').then((d) => d.states_available));

async function usRegions(): Promise<RegionGroup[]> {
  const [us, free] = await Promise.all([
    loadData<{ states: Record<string, UsState> }>('usData.json'),
    loadTaxFreeCodes(),
  ]);
  const all = entriesToOptions(us.states);
  const taxfree = all.filter((o) => free.includes(o.value)).map((o) => ({ ...o, badge: 'taxfree' as const }));
  return [
    {
      id: 'special',
      title: { zh: '快捷', en: 'Quick' },
      items: [
        RANDOM_OPTION,
        { value: 'TAXFREE', label: { zh: '随机免税州', en: 'Random tax-free' }, badge: 'taxfree' },
      ],
    },
    { id: 'taxfree', title: { zh: '免税州 · 无州销售税', en: 'Tax-free states · no sales tax' }, tone: 'taxfree', items: taxfree },
    { id: 'all', title: { zh: '其他各州', en: 'All other states' }, items: all.filter((o) => !free.includes(o.value)) },
  ];
}

/** 源数据里有少量 `X, Unit X` / `Unit UNIT 5` 形式的重复写法，在这里清洗 */
const dedupeUnit = (text: string) => text.replace(/^(.+?), Unit \1(?=,|$)/, '$1').replace(/, Unit UNIT /i, ', Unit ');

async function generateUs({ region }: GenerateRequest): Promise<AddressRecord> {
  const free = await loadTaxFreeCodes();
  let code = region;
  if (code === 'TAXFREE') code = free[Math.floor(Math.random() * free.length)];
  const isFree = free.includes(code);
  const raw = isFree ? await legacy.generateTaxFreeAddress(code) : await legacy.generateUSAddress(code || 'RANDOM');
  return normalise('US', { ...raw, street: dedupeUnit(raw.street), fullAddress: dedupeUnit(raw.fullAddress) }, { taxFree: free.includes(raw.stateCode) });
}

/* ---------- 日本：按地方分组 ---------- */

async function jpRegions(): Promise<RegionGroup[]> {
  const jp = await loadData<{
    regions: Record<string, { name: Localized & { ja: string } }>;
    prefectures: Record<string, NamedEntry & { region: string }>;
  }>('jpData.json');
  const groups = Object.entries(jp.regions).map(([id, r]) => ({
    id,
    title: { zh: r.name.zh, en: r.name.en },
    items: Object.entries(jp.prefectures)
      .filter(([, p]) => p.region === id)
      .map(([value, p]) => ({ value, label: { zh: p.name.zh, en: p.name.en }, hint: p.name.ja })),
  }));
  return [{ id: 'special', title: { zh: '快捷', en: 'Quick' }, items: [RANDOM_OPTION] }, ...groups.filter((g) => g.items.length)];
}

/* ---------- 国家定义 ---------- */

const jsonRegions =
  (file: string, key: string, title: Localized) => async () =>
    simpleGroups(entriesToOptions((await loadData<any>(file))[key]), title);

const osm = (code: CountryCode) => ({
  loadRegions: async () => withRandom(osmRegions(code)),
  loadSubRegions: async (region: string) => (POSITIVE(region) ? osmSubRegions(code, region) : []),
  generate: async ({ region, subRegion }: GenerateRequest) => {
    const base = await generateOsm(code, region, subRegion);
    return { ...base, id: crypto.randomUUID(), country: code, surnameFirst: false, createdAt: Date.now() } as AddressRecord;
  },
});

export const COUNTRIES: CountryDef[] = [
  {
    code: 'US', name: { zh: '美国', en: 'United States' }, realAddresses: true,
    regionTitle: { zh: '州', en: 'State' },
    loadRegions: usRegions,
    generate: generateUs,
  },
  {
    code: 'CA', name: { zh: '加拿大', en: 'Canada' }, realAddresses: true,
    regionTitle: { zh: '省 / 地区', en: 'Province' },
    loadRegions: jsonRegions('caData.json', 'provinces', { zh: '全部省份', en: 'All provinces' }),
    generate: async ({ region }) => normalise('CA', await legacy.generateCAAddress(region || 'RANDOM')),
  },
  {
    code: 'UK', name: { zh: '英国', en: 'United Kingdom' }, realAddresses: true,
    regionTitle: { zh: '地区', en: 'Nation' },
    loadRegions: jsonRegions('ukData.json', 'regions', { zh: '四个地区', en: 'Nations' }),
    generate: async ({ region }) => normalise('UK', await legacy.generateUKAddress(region || 'RANDOM')),
  },
  {
    code: 'DE', name: { zh: '德国', en: 'Germany' }, realAddresses: false,
    regionTitle: { zh: '联邦州', en: 'State' },
    loadRegions: jsonRegions('deData.json', 'states', { zh: '全部联邦州', en: 'All states' }),
    generate: async ({ region }) => normalise('DE', await legacy.generateDEAddress(region || 'RANDOM')),
  },
  {
    code: 'NO', name: { zh: '挪威', en: 'Norway' }, realAddresses: true,
    regionTitle: { zh: '县', en: 'County' },
    subRegionTitle: { zh: '城镇', en: 'Town' },
    ...osm('NO'),
  },
  {
    code: 'AU', name: { zh: '澳大利亚', en: 'Australia' }, realAddresses: true,
    regionTitle: { zh: '州 / 领地', en: 'State' },
    subRegionTitle: { zh: '郊区', en: 'Suburb' },
    ...osm('AU'),
  },
  {
    code: 'JP', name: { zh: '日本', en: 'Japan' }, surnameFirst: true, realAddresses: true,
    regionTitle: { zh: '都道府县', en: 'Prefecture' },
    loadRegions: jpRegions,
    generate: async ({ region }) => normalise('JP', await legacy.generateJPAddress(region || 'RANDOM')),
  },
  {
    code: 'KR', name: { zh: '韩国', en: 'South Korea' }, surnameFirst: true, realAddresses: true,
    regionTitle: { zh: '道 / 广域市', en: 'Province' },
    subRegionTitle: { zh: '市 / 区', en: 'District' },
    ...osm('KR'),
  },
  {
    code: 'TW', name: { zh: '中国台湾', en: 'Taiwan' }, surnameFirst: true, realAddresses: false,
    regionTitle: { zh: '县市', en: 'County' },
    loadRegions: jsonRegions('twData.json', 'counties', { zh: '全部县市', en: 'All counties' }),
    generate: async ({ region }) => normalise('TW', await legacy.generateTWAddress(region || 'RANDOM')),
  },
  {
    code: 'HK', name: { zh: '中国香港', en: 'Hong Kong' }, surnameFirst: true, realAddresses: false,
    regionTitle: { zh: '地区', en: 'Region' },
    variants: [
      { value: 'zh', label: { zh: '中文地址', en: '中文' } },
      { value: 'en', label: { zh: '英文地址', en: 'English' } },
    ],
    loadRegions: jsonRegions('hkData.json', 'districts', { zh: '三大区域', en: 'Regions' }),
    generate: async ({ region, variant }) => {
      // 香港的 county 字段是三大区域（港岛 / 九龙 / 新界），city 是具体地区
      const record = normalise('HK', await legacy.generateHKAddress(region || 'RANDOM', variant === 'en'));
      return { ...record, region: record.district, district: '' };
    },
  },
  {
    code: 'SG', name: { zh: '新加坡', en: 'Singapore' }, realAddresses: false,
    regionTitle: { zh: '区域', en: 'Region' },
    loadRegions: jsonRegions('sgData.json', 'states', { zh: '五大区域', en: 'Regions' }),
    generate: async ({ region }) => normalise('SG', await legacy.generateSGAddress(region || 'RANDOM')),
  },
  {
    code: 'IN', name: { zh: '印度', en: 'India' }, realAddresses: true,
    regionTitle: { zh: '邦', en: 'State' },
    loadRegions: jsonRegions('inData.json', 'states', { zh: '全部邦', en: 'All states' }),
    generate: async ({ region }) => normalise('IN', await legacy.generateINAddress(region || 'RANDOM')),
  },
  {
    code: 'PH', name: { zh: '菲律宾', en: 'Philippines' }, realAddresses: true,
    regionTitle: { zh: '省', en: 'Province' },
    subRegionTitle: { zh: '城市', en: 'City' },
    ...osm('PH'),
  },
  {
    code: 'TR', name: { zh: '土耳其', en: 'Türkiye' }, realAddresses: true,
    regionTitle: { zh: '省', en: 'Province' },
    subRegionTitle: { zh: '区', en: 'District' },
    ...osm('TR'),
  },
  {
    code: 'NG', name: { zh: '尼日利亚', en: 'Nigeria' }, realAddresses: true,
    regionTitle: { zh: '州', en: 'State' },
    loadRegions: async () => withRandom(ngRegions()),
    generate: async ({ region }) => {
      const base = await generateNg(region);
      return { ...base, id: crypto.randomUUID(), country: 'NG', surnameFirst: false, createdAt: Date.now() } as AddressRecord;
    },
  },
];

export const countryOf = (code: CountryCode): CountryDef => COUNTRIES.find((c) => c.code === code)!;

export interface GenerateOptions extends GenerateRequest {
  identity: boolean;
  card: boolean;
}

export async function generateRecord(code: CountryCode, opts: GenerateOptions): Promise<AddressRecord> {
  const def = countryOf(code);
  const record = await def.generate(opts);
  record.surnameFirst = !!def.surnameFirst && !(code === 'HK' && opts.variant === 'en');
  if (opts.identity || opts.card) record.identity = await generateIdentity(code, record.gender, record.regionCode);
  if (opts.card) record.card = generateCard(`${record.firstName} ${record.lastName}`);
  return record;
}
