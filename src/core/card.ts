import { digits, randomElement, randomInt } from './rng';
import type { CardInfo } from './types';

interface Brand {
  name: string;
  prefixes: string[];
  length: number;
  cvvLength: number;
  groups: number[];
}

const BRANDS: Brand[] = [
  { name: 'Visa', prefixes: ['4'], length: 16, cvvLength: 3, groups: [4, 4, 4, 4] },
  { name: 'Mastercard', prefixes: ['51', '52', '53', '54', '55'], length: 16, cvvLength: 3, groups: [4, 4, 4, 4] },
  { name: 'American Express', prefixes: ['34', '37'], length: 15, cvvLength: 4, groups: [4, 6, 5] },
  { name: 'Discover', prefixes: ['6011'], length: 16, cvvLength: 3, groups: [4, 4, 4, 4] },
];

function withLuhn(prefix: string, length: number): string {
  const body = prefix + digits(length - prefix.length - 1);
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
  return body + ((10 - (sum % 10)) % 10);
}

function group(raw: string, sizes: number[]): string {
  const parts: string[] = [];
  let at = 0;
  for (const size of sizes) {
    parts.push(raw.slice(at, at + size));
    at += size;
  }
  return parts.join(' ');
}

/** 随机生成的测试卡号：仅通过 Luhn 校验，没有真实发卡行，无法用于支付。 */
export function generateCard(holder: string): CardInfo {
  const brand = randomElement(BRANDS);
  const raw = withLuhn(randomElement(brand.prefixes), brand.length);
  const year = new Date().getFullYear() + randomInt(1, 5);
  return {
    brand: brand.name,
    number: group(raw, brand.groups),
    raw,
    expiry: `${String(randomInt(1, 12)).padStart(2, '0')}/${String(year).slice(-2)}`,
    cvv: digits(brand.cvvLength),
    holder: holder.toUpperCase(),
  };
}
