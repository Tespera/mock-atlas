import { loadData } from './data';
import { generateEmail, randomElement, randomInt, weightedElement } from './rng';
import type { AddressDraft, CountryCode, Gender, RegionGroup, RegionOption } from './types';

/** 来自 OpenStreetMap 的扁平地址库（澳洲 / 韩国 / 菲律宾 / 土耳其）。 */
interface OsmRow {
  unit?: string;
  houseNumber?: string;
  streetName?: string;
  streetAddress: string;
  suburb?: string;
  locality?: string;
  barangay?: string;
  neighborhood?: string;
  district?: string;
  city?: string;
  province?: string;
  state?: string;
  stateCode?: string;
  postalCode: string;
  lat?: number;
  lon?: number;
}

interface NameBook {
  firstNames: { male: any[]; female: any[] };
  lastNames: any[];
  mobilePrefixes?: string[];
}

interface OsmSpec {
  code: CountryCode;
  addressFile: string;
  namesFile: string;
  /** 一级 / 二级筛选所用的行字段 */
  regionKey: keyof OsmRow;
  subKey: keyof OsmRow;
  regionZh?: Record<string, string>;
  build(row: OsmRow, names: NameBook): AddressDraft;
}

const pickGender = (): Gender => (Math.random() < 0.5 ? 'male' : 'female');

/** 土耳其语 / 挪威语字符转 ASCII，用于邮箱 */
const ascii = (s: string) =>
  s.replace(/[çğıöşüİæøå]/gi, (ch) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', İ: 'i', æ: 'ae', ø: 'o', å: 'a' })[ch.toLowerCase()] ?? ch);

const AU_ZH: Record<string, string> = {
  NSW: '新南威尔士州', VIC: '维多利亚州', QLD: '昆士兰州', WA: '西澳大利亚州',
  SA: '南澳大利亚州', TAS: '塔斯马尼亚州', ACT: '澳大利亚首都领地', NT: '北领地',
};

const KR_ZH: Record<string, string> = {
  서울특별시: '首尔特别市', 부산광역시: '釜山广域市', 대구광역시: '大邱广域市', 인천광역시: '仁川广域市',
  광주광역시: '光州广域市', 대전광역시: '大田广域市', 울산광역시: '蔚山广域市', 세종특별자치시: '世宗特别自治市',
  경기도: '京畿道', 강원특별자치도: '江原特别自治道', 충청북도: '忠清北道', 충청남도: '忠清南道',
  전북특별자치도: '全北特别自治道', 전라북도: '全罗北道', 전라남도: '全罗南道', 경상북도: '庆尚北道',
  경상남도: '庆尚南道', 제주특별자치도: '济州特别自治道',
};

const NO_ZH: Record<string, string> = {
  Oslo: '奥斯陆', Rogaland: '罗加兰', 'Møre og Romsdal': '默勒-鲁姆斯达尔', Nordland: '诺尔兰',
  Østfold: '东福尔', Akershus: '阿克什胡斯', Buskerud: '布斯克吕', Innlandet: '内陆', Vestfold: '西福尔',
  Telemark: '泰勒马克', Agder: '阿格德尔', Vestland: '韦斯特兰', Trøndelag: '特伦德拉格',
  Troms: '特罗姆斯', Finnmark: '芬马克',
};

const SPECS: Partial<Record<CountryCode, OsmSpec>> = {
  AU: {
    code: 'AU',
    addressFile: 'auOsmAddressData.json',
    namesFile: 'auNamesData.json',
    regionKey: 'stateCode',
    subKey: 'suburb',
    regionZh: AU_ZH,
    build(row, names) {
      const gender = pickGender();
      const firstName = randomElement(names.firstNames[gender]);
      const lastName = randomElement(names.lastNames);
      const street = row.unit ? `${row.unit}/${row.streetAddress}` : row.streetAddress;
      const mobile = randomElement(names.mobilePrefixes ?? ['0400']);
      return {
        firstName, lastName, gender,
        phone: `+61 ${mobile.slice(1)} ${randomInt(100, 999)} ${randomInt(100, 999)}`,
        email: generateEmail(firstName, lastName),
        street, city: row.suburb ?? '', region: row.state ?? '', regionCode: row.stateCode ?? '',
        district: '', postcode: row.postalCode,
        fullAddress: `${street}, ${row.suburb} ${row.stateCode} ${row.postalCode}, Australia`,
      };
    },
  },
  KR: {
    code: 'KR',
    addressFile: 'krOsmAddressData.json',
    namesFile: 'krNamesData.json',
    regionKey: 'province',
    subKey: 'district',
    regionZh: KR_ZH,
    build(row, names) {
      const gender = pickGender();
      const first = randomElement(names.firstNames[gender]);
      const last = weightedElement(names.lastNames);
      const locality = row.locality ?? '';
      return {
        firstName: first.name, lastName: last.name, gender,
        phone: `+82 10-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
        email: generateEmail(first.romanized, last.romanized),
        street: row.streetAddress, city: row.district ?? '', region: row.province ?? '', regionCode: '',
        district: locality, postcode: row.postalCode,
        fullAddress: [row.province, row.district, locality, row.streetAddress, row.postalCode, '대한민국']
          .filter(Boolean).join(' '),
        coords: row.lat != null && row.lon != null ? { lat: row.lat, lon: row.lon } : undefined,
      };
    },
  },
  NO: {
    code: 'NO',
    addressFile: 'noOsmAddressData.json',
    namesFile: 'noNamesData.json',
    regionKey: 'province',
    subKey: 'city',
    regionZh: NO_ZH,
    build(row, names) {
      const gender = pickGender();
      const firstName = randomElement(names.firstNames[gender]);
      const lastName = randomElement(names.lastNames);
      return {
        firstName, lastName, gender,
        phone: `+47 ${randomElement(['4', '9'])}${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(100, 999)}`,
        email: generateEmail(ascii(firstName), ascii(lastName)),
        street: row.streetAddress, city: row.city ?? '', region: row.province ?? '', regionCode: '',
        district: '', postcode: row.postalCode,
        fullAddress: `${row.streetAddress}, ${row.postalCode} ${row.city}, Norway`,
        coords: row.lat != null && row.lon != null ? { lat: row.lat, lon: row.lon } : undefined,
      };
    },
  },
  PH: {
    code: 'PH',
    addressFile: 'phOsmAddressData.json',
    namesFile: 'phNamesData.json',
    regionKey: 'province',
    subKey: 'city',
    build(row, names) {
      const gender = pickGender();
      const firstName = randomElement(names.firstNames[gender]);
      const lastName = randomElement(names.lastNames);
      const barangay = row.barangay ?? '';
      const mobile = randomElement(names.mobilePrefixes ?? ['905']);
      return {
        firstName, lastName, gender,
        phone: `+63 ${mobile} ${randomInt(100, 999)} ${randomInt(1000, 9999)}`,
        email: generateEmail(firstName, lastName),
        street: row.streetAddress, city: row.city ?? '', region: row.province ?? '', regionCode: '',
        district: barangay, postcode: row.postalCode,
        fullAddress: [row.streetAddress, barangay, row.city, `${row.province} ${row.postalCode}`, 'Philippines']
          .filter(Boolean).join(', '),
      };
    },
  },
  TR: {
    code: 'TR',
    addressFile: 'trOsmAddressData.json',
    namesFile: 'trNamesData.json',
    regionKey: 'province',
    subKey: 'district',
    build(row, names) {
      const gender = pickGender();
      const firstName = randomElement(names.firstNames[gender]);
      const lastName = randomElement(names.lastNames);
      const hood = row.neighborhood ?? '';
      const mobile = randomElement(names.mobilePrefixes ?? ['505']);
      return {
        firstName, lastName, gender,
        phone: `+90 ${mobile} ${randomInt(100, 999)} ${randomInt(10, 99)} ${randomInt(10, 99)}`,
        email: generateEmail(ascii(firstName), ascii(lastName)),
        street: row.streetAddress, city: row.district ?? '', region: row.province ?? '', regionCode: '',
        district: hood, postcode: row.postalCode,
        fullAddress: [row.streetAddress, hood && `${hood} Mah.`, row.district, `${row.province} ${row.postalCode}`, 'Türkiye']
          .filter(Boolean).join(', '),
      };
    },
  },
};

const rowsOf = (spec: OsmSpec) => loadData<OsmRow[]>(spec.addressFile);

export async function osmRegions(code: CountryCode): Promise<RegionGroup[]> {
  const spec = SPECS[code]!;
  const rows = await rowsOf(spec);
  const seen = new Map<string, string>();
  for (const row of rows) {
    const key = String(row[spec.regionKey] ?? '');
    if (key && !seen.has(key)) seen.set(key, spec.regionKey === 'stateCode' ? String(row.state) : key);
  }
  const items: RegionOption[] = [...seen]
    .map(([value, name]) => ({
      value,
      label: { zh: spec.regionZh?.[value] ?? name, en: name },
      hint: spec.regionKey === 'stateCode' ? value : spec.regionZh?.[value] ? name : undefined,
    }))
    .sort((a, b) => a.label.en.localeCompare(b.label.en));
  return [{ id: 'all', title: { zh: '全部地区', en: 'All regions' }, items }];
}

export async function osmSubRegions(code: CountryCode, region: string): Promise<RegionOption[]> {
  const spec = SPECS[code]!;
  const rows = await rowsOf(spec);
  const set = new Set<string>();
  for (const row of rows) {
    if (region && region !== 'RANDOM' && String(row[spec.regionKey]) !== region) continue;
    const sub = row[spec.subKey];
    if (sub) set.add(String(sub));
  }
  return [...set].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: { zh: v, en: v } }));
}

export async function generateOsm(
  code: CountryCode,
  region: string,
  subRegion: string,
): Promise<AddressDraft> {
  const spec = SPECS[code]!;
  const [rows, names] = await Promise.all([rowsOf(spec), loadData<NameBook>(spec.namesFile)]);
  const pool = rows.filter(
    (row) =>
      (!region || region === 'RANDOM' || String(row[spec.regionKey]) === region) &&
      (!subRegion || subRegion === 'RANDOM' || String(row[spec.subKey]) === subRegion),
  );
  if (!pool.length) throw new Error('所选地区暂无可用地址数据');
  return spec.build(randomElement(pool), names);
}
