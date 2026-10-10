import AU from 'country-flag-icons/string/3x2/AU';
import CA from 'country-flag-icons/string/3x2/CA';
import DE from 'country-flag-icons/string/3x2/DE';
import GB from 'country-flag-icons/string/3x2/GB';
import HK from 'country-flag-icons/string/3x2/HK';
import IN from 'country-flag-icons/string/3x2/IN';
import JP from 'country-flag-icons/string/3x2/JP';
import KR from 'country-flag-icons/string/3x2/KR';
import NG from 'country-flag-icons/string/3x2/NG';
import NO from 'country-flag-icons/string/3x2/NO';
import PH from 'country-flag-icons/string/3x2/PH';
import SG from 'country-flag-icons/string/3x2/SG';
import TR from 'country-flag-icons/string/3x2/TR';
import TW from 'country-flag-icons/string/3x2/TW';
import US from 'country-flag-icons/string/3x2/US';
import type { CountryCode } from '../core/types';

const FLAGS: Record<CountryCode, string> = { US, CA, UK: GB, DE, NO, AU, JP, KR, TW, HK, SG, IN, PH, TR, NG };

/** 国旗 SVG。不用 emoji：Windows 不渲染国旗 emoji，个别系统还会缺台湾旗。 */
export const flag = (code: CountryCode): string => `<span class="flag-svg" role="img">${FLAGS[code]}</span>`;
