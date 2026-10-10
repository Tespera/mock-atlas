import type { Localized } from '../core/types';

export type Lang = 'zh' | 'en';

const DICT = {
  'theme': { zh: '风格', en: 'Style' },
  'copy': { zh: '复制', en: 'Copy' },
  'copiedShort': { zh: '已复制', en: 'Copied' },
  'fullName': { zh: '全名', en: 'Full name' },
  'secName': { zh: '姓名', en: 'Name' },
  'secAddress': { zh: '地址', en: 'Address' },
  'secContact': { zh: '联系方式', en: 'Contact' },
  'tagline': { zh: '全球测试地址生成器', en: 'Global test address generator' },
  'countries': { zh: '国家 / 地区', en: 'Countries' },
  'history': { zh: '历史', en: 'History' },
  'search': { zh: '搜索', en: 'Search' },
  'generate': { zh: '生成地址', en: 'Generate' },
  'generating': { zh: '生成中…', en: 'Generating…' },
  'copyAll': { zh: '复制全部', en: 'Copy all' },
  'save': { zh: '保存', en: 'Save' },
  'saved': { zh: '已保存', en: 'Saved' },
  'map': { zh: '地图核对', en: 'View on map' },
  'identity': { zh: '身份信息', en: 'Identity' },
  'card': { zh: '银行卡', en: 'Card' },
  'testOnly': { zh: '随机测试数据', en: 'Random test data' },
  'copied': { zh: '已复制', en: 'Copied' },
  'copiedAll': { zh: '已复制全部信息', en: 'Copied everything' },
  'copyFailed': { zh: '复制失败，请手动选择', en: 'Copy failed' },
  'savedToast': { zh: '已存入历史', en: 'Saved to history' },
  'removedToast': { zh: '已从历史移除', en: 'Removed from history' },
  'shipTo': { zh: '收件人', en: 'Ship to' },
  'firstName': { zh: '名', en: 'First name' },
  'lastName': { zh: '姓', en: 'Last name' },
  'gender': { zh: '性别', en: 'Gender' },
  'male': { zh: '男', en: 'Male' },
  'female': { zh: '女', en: 'Female' },
  'phone': { zh: '电话', en: 'Phone' },
  'email': { zh: '邮箱', en: 'Email' },
  'street': { zh: '街道', en: 'Street' },
  'city': { zh: '城市', en: 'City' },
  'district': { zh: '区 / 辖区', en: 'District' },
  'postcode': { zh: '邮编', en: 'Postcode' },
  'fullAddress': { zh: '完整地址', en: 'Full address' },
  'dob': { zh: '出生日期', en: 'Date of birth' },
  'age': { zh: '年龄', en: 'Age' },
  'occupation': { zh: '职业', en: 'Occupation' },
  'cardBrand': { zh: '卡组织', en: 'Network' },
  'cardNumber': { zh: '卡号', en: 'Number' },
  'expiry': { zh: '有效期', en: 'Valid thru' },
  'cvv': { zh: '安全码', en: 'CVV' },
  'holder': { zh: '持卡人', en: 'Cardholder' },
  'random': { zh: '随机', en: 'Random' },
  'anyOf': { zh: '不限 · 随机', en: 'Any · random' },
  'noMatch': { zh: '没有匹配项', en: 'No match' },
  'historyEmpty': { zh: '还没有保存的地址', en: 'Nothing saved yet' },
  'historyEmptyHint': { zh: '生成后点「保存」，它们只存在你的浏览器里。', en: 'Hit Save after generating. Stored in this browser only.' },
  'exportCsv': { zh: '导出 CSV', en: 'Export CSV' },
  'exportJson': { zh: '导出 JSON', en: 'Export JSON' },
  'clearAll': { zh: '清空', en: 'Clear all' },
  'clearConfirm': { zh: '再点一次确认', en: 'Tap again to confirm' },
  'cleared': { zh: '历史已清空', en: 'History cleared' },
  'close': { zh: '关闭', en: 'Close' },
  'remove': { zh: '移除', en: 'Remove' },
  'loadError': { zh: '生成失败', en: 'Generation failed' },
  'retry': { zh: '重试', en: 'Retry' },
  'taxFree': { zh: '免税', en: 'TAX-FREE' },
  'taxFreeLong': { zh: '免税州', en: 'Tax-free state' },
  'footer': { zh: '所有数据在浏览器本地随机生成，不上传、不记录。仅供开发测试与学习。', en: 'Everything is generated locally in your browser. Nothing is uploaded. For development, testing and learning.' },
  'shortcuts': { zh: '快捷键', en: 'Shortcuts' },
  'kGenerate': { zh: '生成', en: 'generate' },
  'kCopy': { zh: '复制全部', en: 'copy all' },
  'kSave': { zh: '保存', en: 'save' },
  'kSearch': { zh: '搜索区域', en: 'search' },
  'kHistory': { zh: '历史', en: 'history' },
  'idNote': { zh: '证件号为随机生成，格式与校验位合规，但不对应任何真实身份。', en: 'ID numbers are random: format and checksum valid, but tied to no real person.' },
  'cardNote': { zh: '卡号仅通过 Luhn 校验，无真实发卡行，无法用于支付。', en: 'Passes Luhn only. No real issuer — cannot be used for payment.' },
  'stats': { zh: '个区域', en: 'regions' },
} satisfies Record<string, Localized>;

export type Key = keyof typeof DICT;

let current: Lang = 'zh';

export const setLang = (lang: Lang) => {
  current = lang;
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
};
export const getLang = (): Lang => current;
export const t = (key: Key): string => DICT[key][current];
export const loc = (l: Localized): string => l[current] || l.en;
