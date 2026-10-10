import { icons } from './icons';
import { esc } from './dom';

let timer: number | undefined;

export function toast(message: string): void {
  let el = document.getElementById('toast');
  if (!el) {
    el = Object.assign(document.createElement('div'), { id: 'toast' });
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.innerHTML = `${icons.check}<span>${esc(message)}</span>`;
  el.classList.remove('show');
  void el.offsetWidth; // 重启动画
  el.classList.add('show');
  clearTimeout(timer);
  timer = window.setTimeout(() => el!.classList.remove('show'), 1800);
}
