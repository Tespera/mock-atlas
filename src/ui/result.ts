import type { AddressRecord } from '../core/types';
import { renderLabel } from './labelCard';
import { renderSheet } from './sheet';
import { themeOf, type ThemeId } from './themes';

/** 按风格选择结果区的 DOM 结构 */
export function renderResult(record: AddressRecord, theme: ThemeId): string {
  return themeOf(theme).renderer === 'sheet' ? renderSheet(record) : renderLabel(record);
}

/** 与风格无关的加载骨架，颜色全部来自令牌 */
export const renderSkeleton = (): string =>
  `<div class="skel" aria-busy="true"><i class="a"></i><i class="b"></i><i class="c"></i><div><i></i><i></i><i></i><i></i></div></div>`;
