import type { Localized } from '../core/types';

export type ThemeId = 'light' | 'dark' | 'compact' | 'swiss' | 'postal';

export interface ThemeDef {
  id: ThemeId;
  name: Localized;
  desc: Localized;
  /** 结果区的 DOM 结构：清单（标签 + 值 + 复制按钮）/ 邮件标签 */
  renderer: 'sheet' | 'label';
}

export const THEMES: ThemeDef[] = [
  { id: 'light', name: { zh: '明亮', en: 'Light' }, desc: { zh: '清单式 · 默认', en: 'Plain list · default' }, renderer: 'sheet' },
  { id: 'dark', name: { zh: '深色', en: 'Dark' }, desc: { zh: '清单式 · 夜间', en: 'Plain list · night' }, renderer: 'sheet' },
  { id: 'compact', name: { zh: '紧凑', en: 'Compact' }, desc: { zh: '双列 · 一屏看全', en: 'Two columns · fits one screen' }, renderer: 'sheet' },
  { id: 'swiss', name: { zh: '瑞士', en: 'Swiss' }, desc: { zh: '国际主义浅色', en: 'International style' }, renderer: 'label' },
  { id: 'postal', name: { zh: '邮件标签', en: 'Postal' }, desc: { zh: '拟物 · 航空信', en: 'Skeuomorphic airmail' }, renderer: 'label' },
];

export const DEFAULT_THEME: ThemeId = 'postal';

/** 风格切换菜单默认隐藏，固定使用默认风格；在网址后加 ?styles 可重新打开（开发 / 测试用） */
export const STYLE_MENU_ENABLED = new URLSearchParams(location.search).has('styles');

export const themeOf = (id: string): ThemeDef => THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME)!;
