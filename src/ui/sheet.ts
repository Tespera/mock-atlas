import { countryOf } from '../core/registry';
import type { AddressRecord } from '../core/types';
import { trackingCode } from './art';
import { esc } from './dom';
import { flag } from './flags';
import { fullName, identityFields, mapUrl, type Field } from './format';
import { icons } from './icons';
import { loc, t } from './i18n';

/** 一行：标签 + 值 + 始终可见的复制按钮。值本身是普通文本，可直接框选。 */
function row(f: Field, key = false): string {
  return `
    <div class="row${key ? ' key' : ''}">
      <dt>${esc(f.label)}</dt>
      <dd class="${f.mono ? 'mono' : ''}">${esc(f.value)}</dd>
      <button class="cp" type="button" data-copy="${esc(f.value)}" aria-label="${esc(t('copy'))} ${esc(f.label)}">
        <span class="idle">${icons.copy}${esc(t('copy'))}</span><span class="done">${icons.check}${esc(t('copiedShort'))}</span>
      </button>
    </div>`;
}

const section = (cls: string, title: string, rows: string) =>
  `<section class="sec ${cls}"><h3>${esc(title)}</h3><dl>${rows}</dl></section>`;

export function renderSheet(r: AddressRecord): string {
  const def = countryOf(r.country);
  const f = (key: string, label: string, value: string, mono = false): Field => ({ key, label, value, mono });

  const person = [
    f('name', t('fullName'), fullName(r)),
    f('firstName', t('firstName'), r.firstName),
    f('lastName', t('lastName'), r.lastName),
    f('gender', t('gender'), r.gender === 'male' ? t('male') : t('female')),
  ];
  const address = [
    f('full', t('fullAddress'), r.fullAddress),
    f('street', t('street'), r.street),
    f('city', t('city'), r.city),
    f('district', t('district'), r.district),
    f('region', loc(def.regionTitle), r.region),
    f('postcode', t('postcode'), r.postcode, true),
  ].filter((x) => x.value);
  const contact = [f('phone', t('phone'), r.phone, true), f('email', t('email'), r.email, true)];
  const idRows = identityFields(r);
  const cardRows = r.card
    ? [
        f('brand', t('cardBrand'), r.card.brand),
        f('cardNumber', t('cardNumber'), r.card.number, true),
        f('expiry', t('expiry'), r.card.expiry, true),
        f('cvv', t('cvv'), r.card.cvv, true),
        f('holder', t('holder'), r.card.holder),
      ]
    : [];

  return `
  <article class="sheet" data-country="${r.country}" data-taxfree="${!!r.taxFree}" aria-label="${esc(r.fullAddress)}">
    <header class="sheet-head">
      <div>
        <p class="sheet-kicker">${flag(def.code)}<span>${esc(loc(def.name))}${r.region ? ` · ${esc(r.region)}` : ''}</span>${r.taxFree ? `<span class="badge-tf">${esc(t('taxFreeLong'))}</span>` : ''}</p>
        <h2 class="sheet-name">${esc(fullName(r))}</h2>
      </div>
      <span class="sheet-id mono">№ ${esc(trackingCode(r.id))}</span>
    </header>
    <div class="sheet-body">
      ${section('sec-person', t('secName'), person.map((x) => row(x)).join(''))}
      ${section('sec-address', t('secAddress'), address.map((x, i) => row(x, i === 0)).join(''))}
      ${section('sec-contact', t('secContact'), contact.map((x) => row(x)).join(''))}
      ${idRows.length ? `<section class="sec sec-identity"><h3>${esc(t('identity'))}</h3><dl>${idRows.map((x) => row(x)).join('')}</dl><p class="note">${esc(t('idNote'))}</p></section>` : ''}
      ${r.card ? `<section class="sec sec-card"><h3>${esc(t('card'))}</h3><dl>${cardRows.map((x) => row(x)).join('')}</dl><p class="note">${esc(t('cardNote'))}</p></section>` : ''}
    </div>
    ${def.realAddresses ? `<footer class="sheet-foot"><a class="map-link" href="${esc(mapUrl(r))}" target="_blank" rel="noopener noreferrer">${icons.map}${esc(t('map'))}</a></footer>` : ''}
  </article>`;
}
