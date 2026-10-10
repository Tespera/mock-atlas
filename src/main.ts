import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/label.css';
import './styles/drawer.css';
import './styles/previews.css';
import './styles/themes.css';
import './styles/normal.css';

import { COUNTRIES, countryOf, generateRecord } from './core/registry';
import type { AddressRecord, CountryCode, RegionGroup } from './core/types';
import { countRegions, mountCombo, renderAtlasShell, renderTiles } from './ui/atlas';
import { $, $$, copyText, esc } from './ui/dom';
import { toPlainText } from './ui/format';
import { mountHistory } from './ui/history';
import { getLang, loc, setLang, t, type Key, type Lang } from './ui/i18n';
import { flag } from './ui/flags';
import { icons } from './ui/icons';
import { scrambleIn } from './ui/labelCard';
import { renderResult, renderSkeleton } from './ui/result';
import { STYLE_MENU_ENABLED, THEMES, DEFAULT_THEME, themeOf } from './ui/themes';
import { getHistory, isSaved, onHistoryChange, saveSettings, selectionOf, settings, toggleSaved } from './ui/state';
import { toast } from './ui/toast';

setLang(settings.lang);
// 菜单隐藏时固定使用默认风格，忽略浏览器里以前存过的风格
if (!STYLE_MENU_ENABLED) settings.theme = DEFAULT_THEME;
document.documentElement.dataset.theme = settings.theme;

/* ---------- 骨架 ---------- */

$('#app').innerHTML = `
<div class="backdrop"></div>
<div class="shell">
  <header class="topbar">
    <div class="brand"><span class="brand-mark">Mock<i>Atlas</i></span><span class="brand-sub" data-i18n="tagline"></span></div>
    <div class="top-actions">
      <div class="style-menu" ${STYLE_MENU_ENABLED ? '' : 'hidden'}>
        <button class="chip-btn" id="style-btn" type="button" aria-haspopup="menu" aria-expanded="false"><i class="sw"></i><span id="style-name"></span>${icons.chevron}</button>
        <div class="style-pop" id="style-pop" role="menu" hidden></div>
      </div>
      <button class="chip-btn" id="btn-lang" type="button">${icons.globe}<span></span></button>
      <button class="chip-btn" id="btn-history" type="button">${icons.history}<span data-i18n="history"></span><span class="count" id="hist-count" data-n="0"></span></button>
    </div>
  </header>

  <nav class="rail" aria-label="countries">
    <p class="eyebrow" data-i18n="countries"></p>
    <ul class="country-list" id="country-list"></ul>
  </nav>

  <main class="stage">
    <div class="controls">
      <button class="region-open" id="region-open" type="button"><small></small><b></b></button>
      <div class="segmented" id="variant" hidden></div>
      <label class="switch"><input type="checkbox" id="opt-identity" /><span class="track"></span><span class="lbl" data-i18n="identity"></span></label>
      <label class="switch"><input type="checkbox" id="opt-card" /><span class="track"></span><span class="lbl" data-i18n="card"></span></label>
    </div>

    <div class="actions actions-bar">
      <button class="btn-primary" id="btn-generate" type="button">${icons.refresh}<span data-i18n="generate"></span><kbd>Space</kbd></button>
      <button class="btn-ghost" id="btn-copy" type="button">${icons.copy}<span data-i18n="copyAll"></span></button>
      <button class="btn-ghost" id="btn-save" type="button" aria-pressed="false"></button>
    </div>

    <div class="label-wrap" id="label-wrap" aria-live="polite"></div>
    <p class="hint-line" id="hint-line"></p>
    <p class="foot-note" data-i18n="footer"></p>
    <p class="foot-note credits">
      Address data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> (ODbL) ·
      <a href="https://openaddresses.io" target="_blank" rel="noopener noreferrer">OpenAddresses</a> ·
      <a href="https://github.com/hotbob011/real-random-taxfree-address" target="_blank" rel="noopener noreferrer">real-random-taxfree-address</a> (MIT)
    </p>
  </main>

  <aside class="atlas" id="atlas" aria-label="regions"></aside>
</div>
<div class="sheet-scrim" id="scrim"></div>

<aside class="drawer" id="drawer" aria-hidden="true">
  <div class="drawer-scrim"></div>
  <section class="drawer-panel">
    <header class="drawer-head"><h2></h2><button class="icon-btn" type="button" data-tool="close" aria-label="close">${icons.close}</button></header>
    <div class="drawer-tools">
      <button class="tool-btn" id="tool-csv" data-tool="csv" type="button">${icons.download}<span></span></button>
      <button class="tool-btn" id="tool-json" data-tool="json" type="button">${icons.download}<span></span></button>
      <button class="tool-btn danger" data-tool="clear" type="button">${icons.trash}<span></span></button>
    </div>
    <ul class="history-list" id="hist-list"></ul>
  </section>
</aside>`;

/* ---------- 状态 ---------- */

const regionCache = new Map<CountryCode, RegionGroup[]>();
let current: AddressRecord | null = null;
let ticket = 0;
let query = '';

const def = () => countryOf(settings.country);
const sel = () => selectionOf(settings.country);
const atlas = $('#atlas');
const wrap = $('#label-wrap');
const history = mountHistory((record) => {
  current = record;
  void switchCountry(record.country, { generate: false });
});

/* ---------- 渲染：静态文案 ---------- */

function applyI18n() {
  $$('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n as Key)));
  $('#btn-lang span').textContent = getLang() === 'zh' ? 'EN' : '中文';
  $('#hint-line').innerHTML = (
    [['Space', 'kGenerate'], ['C', 'kCopy'], ['S', 'kSave'], ['/', 'kSearch'], ['H', 'kHistory']] as [string, Key][]
  )
    .map(([k, label]) => `<kbd>${k}</kbd> ${esc(t(label))}`)
    .join(' &nbsp;·&nbsp; ');
  $('#tool-csv span').textContent = t('exportCsv');
  $('#tool-json span').textContent = t('exportJson');
  renderCountries();
  renderSaveButton();
  renderRegionButton();
}

function renderCountries() {
  $('#country-list').innerHTML = COUNTRIES.map(
    (c, i) => `<li><button class="country" type="button" data-code="${c.code}" aria-current="${c.code === settings.country}">
      <span class="idx mono">${String(i + 1).padStart(2, '0')}</span><span class="flag">${flag(c.code)}</span>
      <span class="nm">${esc(loc(c.name))}</span><span class="cd mono">${c.code}</span></button></li>`,
  ).join('');
}

function renderVariant() {
  const box = $('#variant');
  const variants = def().variants;
  box.hidden = !variants;
  if (!variants) return;
  box.innerHTML = variants
    .map((v) => `<button type="button" data-variant="${v.value}" aria-pressed="${v.value === sel().variant}">${esc(loc(v.label))}</button>`)
    .join('');
}

function renderSaveButton() {
  const saved = !!current && isSaved(current.id);
  const btn = $('#btn-save');
  btn.setAttribute('aria-pressed', String(saved));
  btn.setAttribute('aria-label', saved ? t('saved') : t('save'));
  btn.innerHTML = `${saved ? icons.bookmarkFill : icons.bookmark}<span>${esc(saved ? t('saved') : t('save'))}</span>`;
  const count = getHistory().length;
  const badge = $('#hist-count');
  badge.textContent = String(count || '');
  badge.dataset.n = String(count);
}

function renderRegionButton() {
  const groups = regionCache.get(settings.country);
  const option = groups?.flatMap((g) => g.items).find((o) => o.value === sel().region);
  const btn = $('#region-open');
  $('small', btn).textContent = loc(def().regionTitle);
  $('b', btn).textContent = option ? loc(option.label) : t('random');
}

/* ---------- 图鉴 ---------- */

async function loadAtlas() {
  const code = settings.country;
  let groups = regionCache.get(code);
  if (!groups) {
    groups = await def().loadRegions();
    regionCache.set(code, groups);
  }
  if (code !== settings.country) return; // 期间用户已切换国家
  atlas.innerHTML = renderAtlasShell(def(), countRegions(groups));
  renderTilesOnly();
  await renderSubRegion();
  renderRegionButton();
}

function renderTilesOnly() {
  const groups = regionCache.get(settings.country);
  if (groups) $('#tile-slot').innerHTML = renderTiles(groups, sel().region, query);
}

async function renderSubRegion() {
  const slot = $('#sub-slot');
  const d = def();
  const s = sel();
  if (!d.loadSubRegions || !d.subRegionTitle || !s.region || s.region === 'RANDOM') {
    slot.innerHTML = '';
    return;
  }
  const code = settings.country;
  const options = await d.loadSubRegions(s.region);
  if (code !== settings.country || s.region !== sel().region) return;
  mountCombo(slot, loc(d.subRegionTitle), options, s.subRegion, (value) => {
    s.subRegion = value;
    saveSettings();
    void renderSubRegion();
    void generate();
  });
}

/* ---------- 生成 ---------- */

async function generate() {
  const mine = ++ticket;
  const btn = $('#btn-generate');
  btn.setAttribute('aria-busy', 'true');
  // 命中缓存时不闪骨架：超过 180ms 才显示
  const skeletonTimer = window.setTimeout(() => mine === ticket && (wrap.innerHTML = renderSkeleton()), 180);
  try {
    const s = sel();
    const record = await generateRecord(settings.country, {
      region: s.region,
      subRegion: s.subRegion,
      variant: s.variant,
      identity: settings.identity,
      card: settings.card,
    });
    if (mine !== ticket) return;
    current = record;
    showCurrent();
  } catch (err) {
    if (mine !== ticket) return;
    console.error(err);
    wrap.innerHTML = `<div class="error-card"><strong>${esc(t('loadError'))}</strong><p>${esc((err as Error).message)}</p>
      <button class="btn-ghost" type="button" data-action="retry">${icons.refresh}${esc(t('retry'))}</button></div>`;
  } finally {
    clearTimeout(skeletonTimer);
    if (mine === ticket) btn.removeAttribute('aria-busy');
  }
}

function showCurrent() {
  if (!current) return;
  wrap.innerHTML = renderResult(current, settings.theme);
  scrambleIn(wrap);
  renderSaveButton();
}

async function switchCountry(code: CountryCode, opts: { generate: boolean } = { generate: true }) {
  settings.country = code;
  query = '';
  saveSettings();
  renderCountries();
  renderVariant();
  atlas.innerHTML = '';
  if (opts.generate) void generate();
  else showCurrent();
  await loadAtlas();
}

/* ---------- 风格 ---------- */

const compactQuery = matchMedia('(max-width: 1020px)');

function syncCompact() {
  document.documentElement.toggleAttribute('data-compact', compactQuery.matches);
}
compactQuery.addEventListener('change', syncCompact);

function renderStyleMenu() {
  const active = themeOf(settings.theme);
  $('#style-name').textContent = loc(active.name);
  $('#style-btn .sw').className = `sw sp-${active.id}`;
  $('#style-pop').innerHTML = THEMES.map(
    (th) => `<button type="button" role="menuitemradio" aria-checked="${th.id === active.id}" data-theme-pick="${th.id}">
      <span class="sp sp-${th.id}"></span><span class="tx"><b>${esc(loc(th.name))}</b><small>${esc(loc(th.desc))}</small></span></button>`,
  ).join('');
}

function applyTheme() {
  document.documentElement.dataset.theme = settings.theme;
  syncCompact();
  renderStyleMenu();
}

const stylePop = $('#style-pop');
const setStyleMenu = (open: boolean) => {
  stylePop.hidden = !open;
  $('#style-btn').setAttribute('aria-expanded', String(open));
};
$('#style-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  setStyleMenu(!!stylePop.hidden);
});
document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('.style-menu')) setStyleMenu(false);
});
stylePop.addEventListener('click', (e) => {
  const pick = (e.target as HTMLElement).closest<HTMLElement>('[data-theme-pick]');
  if (!pick) return;
  settings.theme = pick.dataset.themePick as typeof settings.theme;
  saveSettings();
  applyTheme();
  showCurrent();
  setStyleMenu(false);
});

/* ---------- 事件 ---------- */

const openAtlas = (open: boolean) => {
  atlas.classList.toggle('open', open);
  $('#scrim').classList.toggle('open', open);
};

async function copyAll() {
  if (!current) return;
  toast((await copyText(toPlainText(current))) ? t('copiedAll') : t('copyFailed'));
}

function save() {
  if (!current) return;
  const nowSaved = toggleSaved(current);
  toast(nowSaved ? t('savedToast') : t('removedToast'));
  renderSaveButton();
}

async function copyField(el: HTMLElement) {
  const ok = await copyText(el.dataset.copy ?? '');
  const row = el.closest<HTMLElement>('.row');
  if (row && ok) {
    // 清单式：按钮原地变成「已复制」，不用弹提示
    row.classList.add('copied');
    clearTimeout(Number(row.dataset.timer));
    row.dataset.timer = String(window.setTimeout(() => row.classList.remove('copied'), 1400));
    return;
  }
  toast(ok ? t('copied') : t('copyFailed'));
  el.classList.remove('copied-flash');
  void el.offsetWidth;
  el.classList.add('copied-flash');
}

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  // 链接（地图核对等）交给浏览器处理，不触发复制
  if (target.closest('a[href]')) return;
  const country = target.closest<HTMLElement>('.country');
  if (country) return void switchCountry(country.dataset.code as CountryCode);

  const tile = target.closest<HTMLElement>('.tile');
  if (tile) {
    const s = sel();
    if (s.region !== tile.dataset.value) s.subRegion = '';
    s.region = tile.dataset.value!;
    saveSettings();
    renderTilesOnly();
    void renderSubRegion();
    renderRegionButton();
    openAtlas(false);
    return void generate();
  }

  const variant = target.closest<HTMLElement>('[data-variant]');
  if (variant) {
    sel().variant = variant.dataset.variant!;
    saveSettings();
    renderVariant();
    return void generate();
  }

  const copyEl = target.closest<HTMLElement>('[data-copy]');
  if (copyEl && wrap.contains(copyEl)) return void copyField(copyEl);

  if (target.closest('[data-action="retry"]')) return void generate();
  if (target.closest('[data-action="close-atlas"]') || target.closest('#scrim')) return openAtlas(false);
});

$('#btn-generate').addEventListener('click', () => void generate());
$('#btn-copy').addEventListener('click', () => void copyAll());
$('#btn-save').addEventListener('click', save);
$('#btn-history').addEventListener('click', () => history.toggle());
$('#region-open').addEventListener('click', () => openAtlas(true));
$('#btn-lang').addEventListener('click', () => {
  const next: Lang = getLang() === 'zh' ? 'en' : 'zh';
  settings.lang = next;
  setLang(next);
  saveSettings();
  applyI18n();
  renderStyleMenu();
  renderVariant();
  history.refresh();
  showCurrent();
  void loadAtlas();
});

for (const [id, key] of [['opt-identity', 'identity'], ['opt-card', 'card']] as const) {
  const input = $<HTMLInputElement>(`#${id}`);
  input.checked = settings[key];
  input.addEventListener('change', () => {
    settings[key] = input.checked;
    saveSettings();
    void generate();
  });
}

document.addEventListener('input', (e) => {
  if ((e.target as HTMLElement).id === 'atlas-search') {
    query = (e.target as HTMLInputElement).value;
    renderTilesOnly();
  }
});

document.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement;
  if (e.key === 'Escape') {
    setStyleMenu(false);
    history.close();
    openAtlas(false);
    return;
  }
  // 可聚焦控件里的 Enter / Space 交给控件自己处理
  const typing = target.closest('input, textarea, select, [contenteditable]');
  const onControl = target.closest('button, a, [role="button"]');
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if ((e.key === 'Enter' || e.key === ' ') && onControl) {
    if (target.matches('[role="button"]:not(button)')) {
      e.preventDefault();
      target.click();
    }
    return;
  }
  switch (e.key.toLowerCase()) {
    case ' ':
    case 'enter':
      e.preventDefault();
      void generate();
      break;
    case 'c':
      void copyAll();
      break;
    case 's':
      save();
      break;
    case 'h':
      history.toggle();
      break;
    case '/':
      e.preventDefault();
      openAtlas(true);
      $<HTMLInputElement>('#atlas-search').focus();
      break;
  }
});

onHistoryChange(renderSaveButton);

/* ---------- 启动 ---------- */

applyTheme();
applyI18n();
renderVariant();
void generate();
void loadAtlas();
