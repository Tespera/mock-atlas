import { loadData } from './data';
import { digits, randomElement, randomInt } from './rng';
import type { CountryCode, Gender, Identity, Localized } from './types';

/* ---------- 出生日期 ---------- */

interface Birth {
  year: number;
  month: number;
  day: number;
  age: number;
}

function ageOn(year: number, month: number, day: number, today = new Date()): number {
  const m = today.getMonth() + 1;
  return today.getFullYear() - year - (m > month || (m === month && today.getDate() >= day) ? 0 : 1);
}

function randomBirth(minAge = 20, maxAge = 55): Birth {
  const today = new Date();
  for (;;) {
    const year = randomInt(today.getFullYear() - maxAge - 1, today.getFullYear() - minAge);
    const month = randomInt(1, 12);
    const day = randomInt(1, new Date(year, month, 0).getDate());
    const age = ageOn(year, month, day, today);
    if (age >= minAge && age <= maxAge) return { year, month, day, age };
  }
}

type DateOrder = 'MDY' | 'DMY' | 'YMD';

const DATE_ORDER: Record<CountryCode, DateOrder> = {
  US: 'MDY', PH: 'MDY', NG: 'MDY',
  UK: 'DMY', DE: 'DMY', NO: 'DMY', AU: 'DMY', TR: 'DMY', IN: 'DMY', SG: 'DMY', HK: 'DMY',
  CA: 'YMD', JP: 'YMD', KR: 'YMD', TW: 'YMD',
};

function formatBirth(b: Birth, order: DateOrder): string {
  const dd = String(b.day).padStart(2, '0');
  const mm = String(b.month).padStart(2, '0');
  if (order === 'YMD') return `${b.year}-${mm}-${dd}`;
  if (order === 'MDY') return `${mm}/${dd}/${b.year}`;
  return `${dd}/${mm}/${b.year}`;
}

/* ---------- 校验位算法 ---------- */

function luhnCheckDigit(body: string): number {
  let sum = 0;
  let double = true;
  for (let i = body.length - 1; i >= 0; i--) {
    let n = Number(body[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return (10 - (sum % 10)) % 10;
}

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
const VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

function verhoeffCheckDigit(body: string): number {
  let c = 0;
  const rev = [...body].reverse().map(Number);
  rev.forEach((d, i) => {
    c = VERHOEFF_D[c][VERHOEFF_P[(i + 1) % 8][d]];
  });
  return VERHOEFF_INV[c];
}

/* ---------- 各国证件号 ---------- */

const SSN_BLOCKED = new Set(['078-05-1120', '219-09-9999', '123-45-6789', '987-65-4320']);

/**
 * 美国 SSN：区号按州取 usData.json 里的 ssn_area_range；该州没有区段数据时，
 * 区号随机取 1–899（排除 666）。避开几个流传很广的公开示例号。
 */
async function usSsn(stateCode: string): Promise<string> {
  const us = await loadData<{ states: Record<string, { ssn_area_range?: { min: number; max: number } }> }>('usData.json');
  const range = us.states[stateCode]?.ssn_area_range;
  const area = () => {
    if (range?.min && range?.max) return randomInt(range.min, range.max);
    let n: number;
    do n = randomInt(1, 899);
    while (n === 666);
    return n;
  };
  for (;;) {
    const ssn = `${String(area()).padStart(3, '0')}-${String(randomInt(1, 99)).padStart(2, '0')}-${String(randomInt(1, 9999)).padStart(4, '0')}`;
    if (!SSN_BLOCKED.has(ssn)) return ssn;
  }
}

function canadaSin(): string {
  const body = String(randomInt(1, 7)) + digits(7);
  const full = body + luhnCheckDigit(body);
  return `${full.slice(0, 3)} ${full.slice(3, 6)} ${full.slice(6)}`;
}

function ukNino(): string {
  const allowed = [...'ABCEGHJKLMNPRSTWXYZ'];
  const blocked = new Set(['BG', 'GB', 'KN', 'NK', 'NT', 'TN', 'ZZ']);
  let prefix = '';
  do prefix = randomElement(allowed) + randomElement(allowed);
  while (blocked.has(prefix));
  const d = digits(6);
  return `${prefix} ${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)} ${randomElement(['A', 'B', 'C', 'D'])}`;
}

function germanSteuerId(): string {
  const d = digits(11, true);
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
}

/**
 * 挪威出生号：月份 +80 是税务局规定的合成号段（Skatteetaten / Tenor 测试数据同款），
 * 校验位完全合规，但不会与任何真实居民的号码重合。
 */
function norwegianFnr(b: Birth, gender: Gender): string {
  const yy = String(b.year).slice(-2);
  const date = `${String(b.day).padStart(2, '0')}${String(b.month + 80).padStart(2, '0')}${yy}`;
  const control = (digs: number[], weights: number[]) => {
    const rest = weights.reduce((s, w, i) => s + w * digs[i], 0) % 11;
    return rest === 0 ? 0 : 11 - rest;
  };
  for (;;) {
    // 个人序号：1900–1999 年出生取 000–499，2000 年后取 500–999；第 3 位奇数为男、偶数为女
    const base = b.year >= 2000 ? 500 : 0;
    const serial = String(base + randomInt(0, 499)).padStart(3, '0');
    if (Number(serial[2]) % 2 !== (gender === 'male' ? 1 : 0)) continue;
    const d = [...date, ...serial].map(Number);
    const k1 = control(d, [3, 7, 6, 1, 8, 9, 4, 5, 2]);
    if (k1 === 10) continue;
    const k2 = control([...d, k1], [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]);
    if (k2 === 10) continue;
    return `${date}${serial}${k1}${k2}`;
  }
}

function australiaTfn(): string {
  const weights = [1, 4, 3, 7, 5, 8, 6, 9, 10];
  for (;;) {
    const head = digits(8, true);
    for (let last = 0; last <= 9; last++) {
      const full = head + last;
      const total = [...full].reduce((s, d, i) => s + Number(d) * weights[i], 0);
      if (total % 11 === 0) return `${full.slice(0, 3)} ${full.slice(3, 6)} ${full.slice(6)}`;
    }
  }
}

function koreanRrn(b: Birth, gender: Gender): string {
  const century = b.year >= 2000 ? (gender === 'male' ? '3' : '4') : gender === 'male' ? '1' : '2';
  const body =
    String(b.year).slice(-2) + String(b.month).padStart(2, '0') + String(b.day).padStart(2, '0') + century + digits(5);
  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  const sum = [...body].reduce((t, d, i) => t + Number(d) * weights[i], 0);
  return `${body.slice(0, 6)}-${body.slice(6)}${(11 - (sum % 11)) % 10}`;
}

function turkishTckn(): string {
  const d = digits(9, true).split('').map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  d.push((((odd * 7 - even) % 10) + 10) % 10);
  d.push(d.reduce((s, n) => s + n, 0) % 10);
  return d.join('');
}

function philSys(): string {
  const raw = digits(12, true);
  return `${raw.slice(0, 4)}-${raw.slice(4, 11)}-${raw.slice(11)}`;
}

function nigerianNin(): string {
  const body = digits(10);
  return body + verhoeffCheckDigit(body);
}

function japaneseMyNumber(): string {
  const body = [...digits(11)].map(Number);
  const weights = [2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6];
  const sum = body.reduce((s, _, i) => s + body[10 - i] * weights[i], 0);
  const rem = sum % 11;
  const full = body.join('') + (rem <= 1 ? 0 : 11 - rem);
  return `${full.slice(0, 4)}-${full.slice(4, 8)}-${full.slice(8)}`;
}

function aadhaar(): string {
  const body = String(randomInt(2, 9)) + digits(10);
  const full = body + verhoeffCheckDigit(body);
  return `${full.slice(0, 4)} ${full.slice(4, 8)} ${full.slice(8)}`;
}

function hkid(): string {
  const letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
  const two = Math.random() < 0.3;
  const prefix = two ? randomElement(letters) + randomElement(letters) : randomElement(letters);
  const num = digits(6);
  const values = (two ? [...prefix] : [' ', prefix]).map((ch) => (ch === ' ' ? 36 : ch.charCodeAt(0) - 55));
  const weights = [9, 8, 7, 6, 5, 4, 3, 2];
  let sum = values[0] * weights[0] + values[1] * weights[1];
  for (let i = 0; i < 6; i++) sum += Number(num[i]) * weights[i + 2];
  const check = (11 - (sum % 11)) % 11;
  return `${prefix}${num}(${check === 10 ? 'A' : check})`;
}

const TW_LETTER_CODE: Record<string, number> = {
  A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 34, J: 18, K: 19, L: 20, M: 21,
  N: 22, O: 35, P: 23, Q: 24, R: 25, S: 26, T: 27, U: 28, V: 29, W: 32, X: 30, Y: 31, Z: 33,
};

function taiwanId(gender: Gender): string {
  const letter = randomElement(Object.keys(TW_LETTER_CODE));
  const code = TW_LETTER_CODE[letter];
  const g = gender === 'male' ? 1 : 2;
  const mid = digits(7).split('').map(Number);
  const weighted =
    Math.floor(code / 10) + (code % 10) * 9 + g * 8 + mid.reduce((s, n, i) => s + n * (7 - i), 0);
  return `${letter}${g}${mid.join('')}${(10 - (weighted % 10)) % 10}`;
}

function singaporeNric(birthYear: number): string {
  let prefix = birthYear < 2000 ? 'S' : 'T';
  if (Math.random() < 0.1) prefix = birthYear < 2000 ? 'F' : 'G';
  const num = digits(7);
  const weights = [2, 7, 6, 5, 4, 3, 2];
  let sum = [...num].reduce((s, d, i) => s + Number(d) * weights[i], 0);
  if (prefix === 'T' || prefix === 'G') sum += 4;
  const table = prefix === 'S' || prefix === 'T' ? 'JZIHGFEDCBA' : 'XWUTRQPNMLK';
  return `${prefix}${num}${table[sum % 11]}`;
}

/* ---------- 汇总 ---------- */

const OCCUPATIONS = [
  'Software Engineer', 'Teacher', 'Nurse', 'Accountant', 'Designer', 'Project Manager',
  'Marketing Specialist', 'Consultant', 'Data Analyst', 'Architect', 'Pharmacist', 'Electrician',
  'Sales Representative', 'Graphic Designer', 'Civil Engineer', 'Journalist', 'Chef', 'Translator',
];

const ID_LABEL: Record<CountryCode, Localized> = {
  US: { zh: '社会安全号 SSN', en: 'SSN' },
  CA: { zh: '社会保险号 SIN', en: 'Social Insurance No.' },
  UK: { zh: '国民保险号 NINO', en: 'National Insurance No.' },
  DE: { zh: '税号 Steuer-ID', en: 'Steuer-ID' },
  NO: { zh: '出生号 Fødselsnummer（合成号段）', en: 'Fødselsnummer (synthetic)' },
  AU: { zh: '税务档案号 TFN', en: 'Tax File Number' },
  JP: { zh: '个人编号 My Number', en: 'My Number' },
  KR: { zh: '居民登记号 RRN', en: 'Resident Reg. No.' },
  TW: { zh: '身份证字号', en: 'National ID' },
  HK: { zh: '香港身份证 HKID', en: 'HKID' },
  SG: { zh: '国民身份证 NRIC', en: 'NRIC / FIN' },
  IN: { zh: 'Aadhaar 号码', en: 'Aadhaar' },
  PH: { zh: 'PhilSys 号码', en: 'PhilSys ID' },
  TR: { zh: '身份号 T.C. Kimlik', en: 'T.C. Kimlik No.' },
  NG: { zh: '国家身份号 NIN', en: 'NIN' },
};

async function idNumber(country: CountryCode, gender: Gender, birth: Birth, stateCode: string): Promise<string> {
  switch (country) {
    case 'US': return usSsn(stateCode);
    case 'CA': return canadaSin();
    case 'UK': return ukNino();
    case 'DE': return germanSteuerId();
    case 'NO': return norwegianFnr(birth, gender);
    case 'AU': return australiaTfn();
    case 'JP': return japaneseMyNumber();
    case 'KR': return koreanRrn(birth, gender);
    case 'TW': return taiwanId(gender);
    case 'HK': return hkid();
    case 'SG': return singaporeNric(birth.year);
    case 'IN': return aadhaar();
    case 'PH': return philSys();
    case 'TR': return turkishTckn();
    case 'NG': return nigerianNin();
  }
}

/** 全部为随机生成：格式与校验位合规，但并不对应任何真实身份。 */
export async function generateIdentity(country: CountryCode, gender: Gender, stateCode = ''): Promise<Identity> {
  const birth = randomBirth();
  return {
    dob: formatBirth(birth, DATE_ORDER[country]),
    age: birth.age,
    occupation: randomElement(OCCUPATIONS),
    idLabel: ID_LABEL[country],
    idValue: await idNumber(country, gender, birth, stateCode),
  };
}
