import { countryOf } from '../core/registry';
import type { AddressRecord } from '../core/types';
import { barcode, postmark, taxSeal, trackingCode } from './art';
import { esc } from './dom';
import { flag } from './flags';
import { addressFields, cardFields, fullName, identityFields, mapUrl, type Field } from './format';
import { icons } from './icons';
import { getLang, loc, t } from './i18n';

const fieldHtml = (f: Field, i: number) => `
  <div class="field${f.wide ? ' wide' : ''}" data-copy="${esc(f.value)}" style="--i:${i}" role="button" tabindex="0" title="${esc(t('copied'))}">
    <dt>${esc(f.label)}</dt>
    <dd class="${f.mono ? 'mono' : ''}" ${f.mono ? 'data-scramble' : ''}>${esc(f.value)}</dd>
    <span class="field-copy">${icons.copy}</span>
  </div>`;

function cardArt(r: AddressRecord): string {
  const c = r.card!;
  return `
  <div class="cc" data-brand="${esc(c.brand.toLowerCase().replace(/\s+/g, ''))}">
    <span class="cc-test">${esc(t('testOnly'))}</span>
    <div class="cc-top"><span class="cc-chip"></span><span class="cc-brand">${esc(c.brand)}</span></div>
    <div class="cc-num mono" data-copy="${esc(c.raw)}" role="button" tabindex="0">${esc(c.number)}</div>
    <div class="cc-bot">
      <div><small>${esc(t('holder'))}</small><b>${esc(c.holder)}</b></div>
      <div data-copy="${esc(c.expiry)}" role="button" tabindex="0"><small>${esc(t('expiry'))}</small><b class="mono">${esc(c.expiry)}</b></div>
      <div data-copy="${esc(c.cvv)}" role="button" tabindex="0"><small>${esc(t('cvv'))}</small><b class="mono">${esc(c.cvv)}</b></div>
    </div>
  </div>`;
}

export function renderLabel(r: AddressRecord): string {
  const def = countryOf(r.country);
  const lang = getLang();
  const countryName = def.name.en.toUpperCase();
  const localityLine = [r.city, r.region].filter(Boolean).join(', ');
  const idFields = identityFields(r);
  let n = 0;

  return `
  <article class="label printing" data-country="${r.country}" data-taxfree="${!!r.taxFree}" aria-label="${esc(r.fullAddress)}">
    <div class="label-band"><span>PRIORITY · AIR MAIL</span><span class="mono">№ ${esc(trackingCode(r.id))}</span></div>
    <div class="label-body">
      <div class="label-top">
        <div class="who">
          <p class="kicker">${esc(t('shipTo'))} · ${flag(def.code)}${esc(loc(def.name))}${r.taxFree ? `<span class="tf-pill">${esc(t('taxFreeLong'))}</span>` : ''}</p>
          <h2 class="recipient" data-copy="${esc(fullName(r))}" role="button" tabindex="0">${esc(fullName(r))}</h2>
        </div>
        <div class="marks">
          ${r.taxFree ? taxSeal({ top: 'TAX-FREE', bottom: lang === 'zh' ? '免税' : 'NO TAX' }) : ''}
          ${postmark(r)}
        </div>
      </div>

      <div class="address-block" data-copy="${esc(r.fullAddress)}" role="button" tabindex="0" title="${esc(t('fullAddress'))}">
        <p class="street">${esc(r.street)}</p>
        <p class="locality">${esc(localityLine)}${localityLine ? ' ' : ''}<span class="mono" data-scramble>${esc(r.postcode)}</span></p>
        <p class="nation mono">${esc(countryName)}</p>
        <span class="field-copy">${icons.copy}</span>
      </div>

      <dl class="fields">${addressFields(r).map((f) => fieldHtml(f, n++)).join('')}</dl>

      ${
        idFields.length
          ? `<section class="sect"><h3>${esc(t('identity'))}</h3>
              <dl class="fields">${idFields.map((f) => fieldHtml(f, n++)).join('')}</dl>
              <p class="note">${esc(t('idNote'))}</p></section>`
          : ''
      }
      ${
        r.card
          ? `<section class="sect"><h3>${esc(t('card'))}</h3>${cardArt(r)}<p class="note">${esc(t('cardNote'))}</p></section>`
          : ''
      }

      <footer class="label-foot">
        ${barcode(r.id)}
        <div class="foot-meta">
          <span class="mono">${esc(r.country)}-${esc(r.postcode || '000000')}</span>
          ${def.realAddresses ? `<a class="map-link" href="${esc(mapUrl(r))}" target="_blank" rel="noopener noreferrer">${icons.map}${esc(t('map'))}</a>` : ''}
        </div>
      </footer>
    </div>
  </article>`;
}

/* ---------- 动效 ---------- */

const GLYPHS = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** 数字类字段像打印机一样逐位定格 */
export function scrambleIn(root: ParentNode): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el, idx) => {
    const final = el.textContent ?? '';
    const start = performance.now() + 320 + idx * 70;
    const duration = 520;
    const tick = (now: number) => {
      if (now < start) return requestAnimationFrame(tick);
      const p = Math.min(1, (now - start) / duration);
      const settled = Math.floor(final.length * p);
      el.textContent = [...final]
        .map((ch, i) => (i < settled || !/[0-9A-Za-z]/.test(ch) ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
        .join('');
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = final;
    };
    el.textContent = [...final].map((ch) => (/[0-9A-Za-z]/.test(ch) ? '·' : ch)).join('');
    requestAnimationFrame(tick);
  });
}
