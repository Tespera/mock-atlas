import { countryOf } from '../core/registry';
import type { AddressRecord } from '../core/types';
import { $, download, esc } from './dom';
import { fullName, toCsv } from './format';
import { flag } from './flags';
import { getLang, loc, t } from './i18n';
import { icons } from './icons';
import { clearHistory, getHistory, onHistoryChange, removeSaved } from './state';
import { toast } from './toast';

const ago = (ts: number) => {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  const rtf = new Intl.RelativeTimeFormat(getLang() === 'zh' ? 'zh-CN' : 'en', { numeric: 'auto' });
  if (s < 60) return rtf.format(-s, 'second');
  if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute');
  if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
  return rtf.format(-Math.round(s / 86400), 'day');
};

export function mountHistory(onPick: (record: AddressRecord) => void): { open(): void; close(): void; toggle(): void; refresh(): void } {
  const root = $('#drawer');
  let armed = 0;

  const render = () => {
    const items = getHistory();
    $('.drawer-head h2', root).innerHTML = `${esc(t('history'))} <span class="mono">${items.length}</span>`;
    // 历史为空时只禁用导出 / 清空；关闭按钮（也带 data-tool）必须始终可用
    root.querySelectorAll<HTMLButtonElement>('.tool-btn').forEach((b) => (b.disabled = !items.length));
    const clearBtn = $('[data-tool="clear"]', root);
    clearBtn.classList.remove('armed');
    $('span', clearBtn).textContent = t('clearAll');
    clearTimeout(armed);
    $('#tool-csv span', root).textContent = t('exportCsv');
    $('#tool-json span', root).textContent = t('exportJson');
    $('#hist-list', root).innerHTML = items.length
      ? items
          .map((r) => {
            const def = countryOf(r.country);
            return `<li><div class="hist-item" role="button" tabindex="0" data-id="${esc(r.id)}">
              <span class="fl">${flag(def.code)}</span>
              <span><span class="nm">${esc(fullName(r))}${r.taxFree ? `<span class="mini-tag">${esc(t('taxFree'))}</span>` : ''}</span>
              <span class="ad" style="display:block">${esc(r.fullAddress)}</span>
              <span class="tm" style="display:block">${esc(loc(def.name))} · ${esc(ago(r.createdAt))}</span></span>
              <button class="rm" type="button" data-rm="${esc(r.id)}" aria-label="${esc(t('remove'))}">${icons.trash}</button>
            </div></li>`;
          })
          .join('')
      : `<li class="empty-state"><strong>${esc(t('historyEmpty'))}</strong>${esc(t('historyEmptyHint'))}</li>`;
  };

  const open = () => {
    render();
    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');
  };
  const close = () => {
    root.classList.remove('open');
    root.setAttribute('aria-hidden', 'true');
  };

  $('.drawer-scrim', root).addEventListener('click', close);
  $('[data-tool="close"]', root).addEventListener('click', close);
  $('#tool-csv', root).addEventListener('click', () => download(`mock-atlas-${Date.now()}.csv`, toCsv(getHistory()), 'text/csv;charset=utf-8'));
  $('#tool-json', root).addEventListener('click', () =>
    download(`mock-atlas-${Date.now()}.json`, JSON.stringify(getHistory(), null, 2), 'application/json'),
  );
  $('[data-tool="clear"]', root).addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLElement;
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed');
      $('span', btn).textContent = t('clearConfirm');
      armed = window.setTimeout(() => render(), 3000);
      return;
    }
    clearHistory();
    toast(t('cleared'));
  });
  $('#hist-list', root).addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const rm = target.closest<HTMLElement>('[data-rm]');
    if (rm) {
      removeSaved(rm.dataset.rm!);
      toast(t('removedToast'));
      return;
    }
    const item = target.closest<HTMLElement>('[data-id]');
    const record = item && getHistory().find((r) => r.id === item.dataset.id);
    if (record) {
      close();
      onPick(record);
    }
  });
  onHistoryChange(() => root.classList.contains('open') && render());

  return { open, close, toggle: () => (root.classList.contains('open') ? close() : open()), refresh: render };
}
