import type { CountryDef, RegionGroup, RegionOption } from '../core/types';
import { $, esc } from './dom';
import { icons } from './icons';
import { loc, t } from './i18n';

const matches = (o: RegionOption, q: string) =>
  !q || [o.label.zh, o.label.en, o.hint ?? '', o.value].some((s) => s.toLowerCase().includes(q));

export function renderTiles(groups: RegionGroup[], selected: string, query: string): string {
  const q = query.trim().toLowerCase();
  let i = 0;
  const html = groups
    .map((g) => {
      const items = g.items.filter((o) => matches(o, q));
      if (!items.length) return '';
      const tiles = items
        .map(
          (o) => `
        <button class="tile" type="button" data-value="${esc(o.value)}" ${o.badge ? `data-badge="${o.badge}"` : ''} aria-pressed="${o.value === selected}" style="--i:${i++}">
          ${o.badge ? `<span class="tag">${esc(t('taxFree'))}</span>` : ''}
          <span class="hint mono">${esc(o.hint ?? (o.value === 'RANDOM' || o.value === 'TAXFREE' ? '∗' : ''))}</span>
          <span class="name">${esc(loc(o.label))}</span>
        </button>`,
        )
        .join('');
      return `<section class="group" data-tone="${g.tone ?? ''}"><h3 class="group-title">${esc(loc(g.title))}</h3><div class="tiles">${tiles}</div></section>`;
    })
    .join('');
  return html || `<p class="foot-note">${esc(t('noMatch'))}</p>`;
}

export const countRegions = (groups: RegionGroup[]) =>
  groups.filter((g) => g.id !== 'special').reduce((n, g) => n + g.items.length, 0);

export function renderAtlasShell(def: CountryDef, total: number): string {
  return `
  <div class="atlas-head">
    <div class="atlas-title">
      <h2>${esc(loc(def.regionTitle))}</h2>
      <span class="mono">${total} ${esc(t('stats'))}</span>
      <button class="atlas-close icon-btn" type="button" data-action="close-atlas" aria-label="${esc(t('close'))}">${icons.close}</button>
    </div>
    <label class="search">${icons.search}<input id="atlas-search" type="search" autocomplete="off" spellcheck="false" placeholder="${esc(t('search'))}" /><kbd>/</kbd></label>
  </div>
  <div id="sub-slot"></div>
  <div class="atlas-scroll" id="tile-slot"></div>`;
}

/** 二级区域的可搜索下拉（郊区 / 城市 / 区，选项可能上千） */
export function mountCombo(
  slot: HTMLElement,
  label: string,
  options: RegionOption[],
  value: string,
  onChange: (value: string) => void,
): void {
  const selected = options.find((o) => o.value === value);
  slot.innerHTML = `
    <div class="sub-block">
      <span class="sub-label">${esc(label)}</span>
      <div class="combo">
        <input type="text" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" placeholder="${esc(t('anyOf'))}" value="${esc(selected ? loc(selected.label) : '')}" />
        ${selected ? `<button class="clear" type="button" aria-label="${esc(t('remove'))}">${icons.close}</button>` : ''}
        <ul hidden role="listbox"></ul>
      </div>
    </div>`;
  const input = $<HTMLInputElement>('input', slot);
  const list = $<HTMLUListElement>('ul', slot);

  const show = (query: string) => {
    const q = query.trim().toLowerCase();
    const found = options.filter((o) => !q || loc(o.label).toLowerCase().includes(q)).slice(0, 80);
    list.innerHTML = found.length
      ? found.map((o) => `<li role="option" data-value="${esc(o.value)}" aria-selected="${o.value === value}">${esc(loc(o.label))}</li>`).join('')
      : `<li class="empty">${esc(t('noMatch'))}</li>`;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };
  const hide = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  };

  input.addEventListener('focus', () => {
    input.select();
    show('');
  });
  input.addEventListener('input', () => show(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hide();
      input.blur();
    }
    if (e.key === 'Enter') {
      const first = list.querySelector<HTMLElement>('li[data-value]');
      if (first) first.click();
    }
  });
  input.addEventListener('blur', () => setTimeout(hide, 120));
  list.addEventListener('mousedown', (e) => e.preventDefault());
  list.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('li[data-value]');
    if (li) onChange(li.dataset.value!);
  });
  slot.querySelector('.clear')?.addEventListener('click', () => onChange(''));
}
