export type CountryCode =
  | 'US' | 'CA' | 'UK' | 'DE' | 'NO' | 'AU' | 'JP' | 'KR' | 'TW' | 'HK' | 'SG' | 'IN' | 'PH' | 'TR' | 'NG';

export type Gender = 'male' | 'female';

export interface Localized {
  zh: string;
  en: string;
}

export interface Identity {
  /** 出生日期，已按该国习惯格式化 */
  dob: string;
  age: number;
  occupation: string;
  idLabel: Localized;
  idValue: string;
}

export interface CardInfo {
  brand: string;
  number: string;
  raw: string;
  expiry: string;
  cvv: string;
  holder: string;
}

export interface AddressRecord {
  id: string;
  country: CountryCode;
  firstName: string;
  lastName: string;
  gender: Gender;
  /** 姓名按「姓 + 名」显示（东亚中文 / 日 / 韩地址） */
  surnameFirst: boolean;
  phone: string;
  email: string;
  street: string;
  city: string;
  /** 州 / 省 / 都道府县 / 地区的展示名 */
  region: string;
  regionCode: string;
  /** 区 / 县 / 街道办等次级行政区，没有则为空串 */
  district: string;
  postcode: string;
  fullAddress: string;
  coords?: { lat: number; lon: number };
  taxFree?: boolean;
  createdAt: number;
  identity?: Identity;
  card?: CardInfo;
}

/** 区域选择器里的一个选项 */
export interface RegionOption {
  value: string;
  label: Localized;
  /** 小号副标题，例如州代码 */
  hint?: string;
  badge?: 'taxfree';
}

export interface RegionGroup {
  id: string;
  title: Localized;
  tone?: 'taxfree';
  items: RegionOption[];
}

export interface GenerateRequest {
  region: string;
  subRegion: string;
  variant: string;
}

export interface CountryDef {
  code: CountryCode;
  name: Localized;
  /** 姓名显示顺序：东亚为 姓 + 名 */
  surnameFirst?: boolean;
  /** 地址来自真实地址库（可在地图上验证） */
  realAddresses: boolean;
  regionTitle: Localized;
  loadRegions(): Promise<RegionGroup[]>;
  subRegionTitle?: Localized;
  loadSubRegions?(region: string): Promise<RegionOption[]>;
  variants?: { value: string; label: Localized }[];
  generate(req: GenerateRequest): Promise<AddressRecord>;
}

/** 各国生成器的原始产出：id、国家、时间与姓名顺序由统一入口补全 */
export type AddressDraft = Omit<AddressRecord, 'id' | 'country' | 'createdAt' | 'surnameFirst'>;
