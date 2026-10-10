export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomElement<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function weightedElement<T extends { weight?: number }>(items: readonly T[]): T {
  const total = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  let point = Math.random() * total;
  for (const item of items) {
    point -= item.weight || 1;
    if (point < 0) return item;
  }
  return items[items.length - 1];
}

export function digits(length: number, firstNonZero = false): string {
  let out = firstNonZero ? String(randomInt(1, 9)) : String(randomInt(0, 9));
  while (out.length < length) out += randomInt(0, 9);
  return out;
}

export function generatePhoneNumber(areaCode: string | number): string {
  return `${areaCode}-${randomInt(200, 999)}-${randomInt(1000, 9999)}`;
}

const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];

/** 取不到 ASCII 字符时回退到 user / name，避免邮箱里出现非拉丁字符。 */
export function generateEmail(firstName: string, lastName: string): string {
  const clean = (value: string, fallback: string) =>
    String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '') || fallback;
  return `${clean(firstName, 'user')}${clean(lastName, 'name')}${randomInt(100, 999)}@${randomElement(EMAIL_DOMAINS)}`;
}
