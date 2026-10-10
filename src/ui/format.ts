import { countryOf } from '../core/registry';
import type { AddressRecord } from '../core/types';
import { loc, t } from './i18n';

export function fullName(r: AddressRecord): string {
  return r.surnameFirst ? `${r.lastName}${r.firstName}` : `${r.firstName} ${r.lastName}`;
}

export const mapUrl = (r: AddressRecord) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.fullAddress)}`;

export interface Field {
  key: string;
  label: string;
  value: string;
  mono?: boolean;
  wide?: boolean;
}

/** 标签卡上展示的字段，同时也是「复制全部」和 CSV 的字段来源 */
export function addressFields(r: AddressRecord): Field[] {
  const def = countryOf(r.country);
  const fields: Field[] = [
    { key: 'firstName', label: t('firstName'), value: r.firstName },
    { key: 'lastName', label: t('lastName'), value: r.lastName },
    { key: 'gender', label: t('gender'), value: r.gender === 'male' ? t('male') : t('female') },
    { key: 'phone', label: t('phone'), value: r.phone, mono: true },
    { key: 'email', label: t('email'), value: r.email, mono: true, wide: true },
    { key: 'street', label: t('street'), value: r.street, wide: true },
    { key: 'city', label: t('city'), value: r.city },
    { key: 'region', label: loc(def.regionTitle), value: r.region },
    { key: 'district', label: t('district'), value: r.district },
    { key: 'postcode', label: t('postcode'), value: r.postcode, mono: true },
  ];
  return fields.filter((f) => f.value);
}

export function identityFields(r: AddressRecord): Field[] {
  if (!r.identity) return [];
  return [
    { key: 'dob', label: t('dob'), value: r.identity.dob, mono: true },
    { key: 'age', label: t('age'), value: String(r.identity.age), mono: true },
    { key: 'occupation', label: t('occupation'), value: r.identity.occupation },
    { key: 'id', label: loc(r.identity.idLabel), value: r.identity.idValue, mono: true, wide: true },
  ];
}

export function cardFields(r: AddressRecord): Field[] {
  if (!r.card) return [];
  return [
    { key: 'cardNumber', label: `${r.card.brand} · ${t('cardNumber')}`, value: r.card.number, mono: true, wide: true },
    { key: 'expiry', label: t('expiry'), value: r.card.expiry, mono: true },
    { key: 'cvv', label: t('cvv'), value: r.card.cvv, mono: true },
  ];
}

export function toPlainText(r: AddressRecord): string {
  const lines = [
    `${t('shipTo')}: ${fullName(r)}`,
    ...addressFields(r)
      .filter((f) => f.key !== 'gender')
      .map((f) => `${f.label}: ${f.value}`),
    `${t('fullAddress')}: ${r.fullAddress}`,
  ];
  const extra = [...identityFields(r), ...cardFields(r)];
  if (extra.length) lines.push('', ...extra.map((f) => `${f.label}: ${f.value}`));
  if (r.card) lines.push(`${t('holder')}: ${r.card.holder}`);
  return lines.join('\n');
}

const CSV_COLUMNS = [
  'country', 'firstName', 'lastName', 'gender', 'phone', 'email', 'street', 'city',
  'region', 'district', 'postcode', 'fullAddress', 'dob', 'idValue', 'cardNumber', 'cardExpiry', 'cardCvv',
] as const;

export function toCsv(records: readonly AddressRecord[]): string {
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const row = (r: AddressRecord) =>
    [
      r.country, r.firstName, r.lastName, r.gender, r.phone, r.email, r.street, r.city,
      r.region, r.district, r.postcode, r.fullAddress,
      r.identity?.dob, r.identity?.idValue, r.card?.number, r.card?.expiry, r.card?.cvv,
    ].map(cell).join(',');
  // 前置 BOM，Excel 打开中日韩字符不会乱码
  return `﻿${CSV_COLUMNS.join(',')}\n${records.map(row).join('\n')}`;
}
