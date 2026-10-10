// @ts-nocheck
// 美国 / 香港 / 英国 / 加拿大 / 日本 / 印度 / 台湾 / 新加坡 / 德国 的地址生成逻辑。
// 移植自 hotbob011/real-random-taxfree-address（MIT License），仅替换数据加载层，
// 并移除了其自带的身份与银行卡生成（由 identity.ts / card.ts 取代）。
import { randomElement, randomInt, generatePhoneNumber, generateEmail } from './rng';
import { loadData as loadJson } from './data';

function normalizeText(value) {
  return String(value || '').trim().toUpperCase();
}

const loadData = (path) => loadJson(path.replace(/^data\//, ''));

function ensureNameArray(maybeList) {
  if (Array.isArray(maybeList)) return maybeList;
  if (!maybeList) return [];
  // Support { male: [...], female: [...] } shape by flattening
  if (typeof maybeList === 'object') {
    const out = [];
    if (Array.isArray(maybeList.male)) out.push(...maybeList.male);
    if (Array.isArray(maybeList.female)) out.push(...maybeList.female);
    return out;
  }
  return [];
}

// Generate US address
export async function generateUSAddress(selectedState = 'RANDOM') {
  try {
    const usData = await loadData('data/usData.json');
    const namesData = await loadData('data/namesData.json');
    // Real street-level address samples (OpenAddresses), merged into single file.
    // Structure: { states_available: [...], states_missing: [...], data: { [stateCode]: Address[] } }
    let usReal = null;
    try {
      usReal = await loadData('data/usRealAddresses.json');
    } catch (e) {
      usReal = null;
    }
    if (!usReal || !usReal.data || typeof usReal.data !== 'object') {
      throw new Error('usRealAddresses data not available');
    }
    
    // Select state
    let stateCode = selectedState;
    if (selectedState === 'RANDOM') {
      const realStates = usReal && Array.isArray(usReal.states_available) ? usReal.states_available : null;
      if (realStates && realStates.length > 0) {
        stateCode = randomElement(realStates);
      } else {
        const states = Object.keys(usReal.data).filter(code => Array.isArray(usReal.data[code]) && usReal.data[code].length > 0);
        if (states.length === 0) {
          throw new Error('No US real-address states available');
        }
        stateCode = randomElement(states);
      }
    }
    
    const state = usData.states[stateCode];
    if (!state) {
      throw new Error(`State ${stateCode} not found`);
    }
    
    // Generate name - decide gender first, then select name
    const nameGroup = namesData.nameGroups.western;
    const gender = Math.random() > 0.5 ? 'Male' : 'Female'; // English: Male/Female
    // Select name based on gender - use gender-specific name lists if available
    let firstName;
    if (nameGroup.first.male && nameGroup.first.female) {
      // Use gender-specific name lists
      firstName = randomElement(gender === 'Male' ? nameGroup.first.male : nameGroup.first.female);
    } else {
      // Fallback: use all names if gender classification not available
      firstName = randomElement(nameGroup.first);
    }
    const lastName = randomElement(nameGroup.last);
    
    // Generate phone
    const areaCode = randomElement(state.area_codes);
    const phone = generatePhoneNumber(areaCode);
    
    // Generate email
    const email = generateEmail(firstName, lastName);
    
    const realData = usReal.data[stateCode];
    if (!Array.isArray(realData) || realData.length === 0) {
      throw new Error(`No US real-address rows for state ${stateCode}`);
    }
    const r = randomElement(realData);
    if (!r || !r.street || !r.city || !r.zip) {
      throw new Error(`Invalid US real-address row for state ${stateCode}`);
    }
    const streetOut = r.street;
    const city = r.city;
    const county = r.county || 'N/A';
    const zip = r.zip;
    
    // Full address should be in English only
    const stateNameEn = state.name.en || state.name.zh;
    const fullAddress = `${streetOut}, ${city}, ${stateNameEn} ${zip}`;
    
    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street: streetOut,
      city,
      county, // 区县（US 映射库可用时为真实 county，否则 N/A）
      state: stateNameEn, // 显示英文州名
      stateCode,
      zip,
      fullAddress,
      country: 'US'
    };
  } catch (error) {
    console.error('Error generating US address:', error);
    throw error;
  }
}

// Generate Hong Kong address
// selectedRegion: 'RANDOM' | 'HK' | 'KL' | 'NT'
// isEnglish: true -> 生成英文姓名和英文地址；false -> 保持中文
export async function generateHKAddress(selectedRegion = 'RANDOM', isEnglish = false) {
  try {
    const hkData = await loadData('data/hkData.json');
    const namesData = await loadData('data/namesData.json');
    
    // Filter districts based on selected region
    let availableDistricts = {};
    if (selectedRegion === 'RANDOM') {
      // Use all districts
      availableDistricts = hkData.districts;
    } else if (hkData.districts[selectedRegion]) {
      // Use only the selected region
      availableDistricts[selectedRegion] = hkData.districts[selectedRegion];
    } else {
      // Fallback to all districts if invalid selection
      availableDistricts = hkData.districts;
    }
    
    // Select random district and area from filtered districts
    const districts = Object.keys(availableDistricts);
    if (districts.length === 0) {
      throw new Error('No districts available for selected region');
    }
    
    const districtKey = randomElement(districts);
    const district = availableDistricts[districtKey];
    const area = randomElement(district.areas);
    
    // Generate name
    let firstName;
    let lastName;
    let gender;

    if (isEnglish && hkData.names && hkData.names.en) {
      // 英文模式：使用 hkData 内置的英文化姓名（香港拼音格式）
      // 为了符合Apple ID等注册要求，名字组合成2-3个字（更符合香港人传统姓名习惯）
      const nameGroupEn = hkData.names.en;
      const isMale = Math.random() > 0.5;
      gender = isMale ? 'Male' : 'Female'; // 修复：性别逻辑正确对应
      const firstPool = isMale ? nameGroupEn.first.male : nameGroupEn.first.female;
      
      // 组合2-3个字的名字（70%概率双字，30%概率三字）
      if (firstPool && firstPool.length > 0) {
        const nameCount = Math.random() < 0.7 ? 2 : 3; // 70%双字，30%三字
        const selectedNames = [];
        const availableNames = [...firstPool]; // 复制数组避免修改原数组
        
        for (let i = 0; i < nameCount && availableNames.length > 0; i++) {
          const selected = randomElement(availableNames);
          selectedNames.push(selected);
          // 移除已选的名字，避免重复
          const index = availableNames.indexOf(selected);
          if (index > -1) availableNames.splice(index, 1);
        }
        
        firstName = selectedNames.join(' '); // 用空格连接，如 "Wing Man" 或 "Wing Man Kai"
      } else {
        firstName = randomElement(firstPool || []);
      }
      
      lastName = randomElement(nameGroupEn.last || []);
      
      // 如果数据异常，兜底
      if (!firstName || !lastName) {
        const fallback = namesData.nameGroups.western;
        gender = Math.random() > 0.5 ? 'Male' : 'Female';
        firstName = randomElement(
          gender === 'Male' ? fallback.first.male : fallback.first.female
        );
        lastName = randomElement(fallback.last);
      }
    } else {
      // 中文模式：沿用原有中文姓名逻辑
      const nameGroup = namesData.nameGroups.chinese;
      gender = Math.random() > 0.5 ? '男' : '女'; // 中文：男/女
      firstName = randomElement(gender === '男' ? nameGroup.first.male : nameGroup.first.female);
      lastName = randomElement(nameGroup.last);
    }

    // Generate phone (Hong Kong format: +852 XXXX XXXX)
    const phone = `+852 ${randomInt(2000, 9999)} ${randomInt(1000, 9999)}`;
    
    // Hong Kong has no official postal code; use fixed placeholder for forms
    const zip = '000000';
    
    // Generate email - use English names for email to avoid Chinese characters
    const englishNameGroup = namesData.nameGroups.western || namesData.nameGroups.asian;
    let emailFirstName, emailLastName;
    if (englishNameGroup && englishNameGroup.first && englishNameGroup.last) {
      const firstList = ensureNameArray(englishNameGroup.first);
      const lastList = ensureNameArray(englishNameGroup.last);
      emailFirstName = randomElement(firstList);
      emailLastName = randomElement(lastList);
    } else {
      // Fallback: generate random English username
      const randomNames = ['john', 'mary', 'david', 'sarah', 'michael', 'emily', 'james', 'lisa', 'robert', 'anna'];
      emailFirstName = randomElement(randomNames);
      emailLastName = randomElement(randomNames);
    }
    const email = generateEmail(emailFirstName, emailLastName);
    
    // Generate address
    const floor = randomInt(1, 50);
    const unit = randomInt(1, 20);

    let street;
    let building;
    let address;
    let city;
    let districtName;
    let fullAddress;

    if (isEnglish) {
      street = randomElement(area.streets.en);
      building = randomElement(area.buildings.en);
      // 英文地址格式：Flat 12, 32/F, Building Name, Street Name
      address = `Flat ${unit}, ${floor}/F, ${building}, ${street}`;
      city = area.name_en;
      districtName = district.name.en;
      fullAddress = `${address}, ${city}, ${districtName}, Hong Kong`;
      // 英文模式下，性别字段统一英文化
      gender = gender === '男' ? 'Male' : gender === '女' ? 'Female' : gender;
    } else {
      street = randomElement(area.streets.zh);
      building = randomElement(area.buildings.zh);
      address = `${street} ${building} ${floor}樓 ${unit}室`;
      city = area.name_zh;
      districtName = district.name.zh;
      fullAddress = `${address}, ${city}, ${districtName}`;
    }
    
    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street: address,
      city, // 区域作为城市（中英文根据模式切换）
      county: districtName, // 区作为区县
      district: districtName, // 保留原字段以兼容
      area: city, // 保留原字段以兼容
      fullAddress,
      zip,
      country: 'HK'
    };
  } catch (error) {
    console.error('Error generating HK address:', error);
    throw error;
  }
}

// Generate UK address
export async function generateUKAddress(selectedRegion = 'RANDOM') {
  try {
    const ukData = await loadData('data/ukData.json');
    const namesData = await loadData('data/namesData.json');
    
    // Filter regions based on selected region
    let availableRegions = {};
    if (selectedRegion === 'RANDOM') {
      // Prefer regions with real address samples (Scheme A)
      const regionEntries = Object.entries(ukData.regions || {});
      const withAddresses = regionEntries.filter(([, v]) => Array.isArray(v.addresses) && v.addresses.length > 0);
      availableRegions = Object.fromEntries((withAddresses.length > 0 ? withAddresses : regionEntries));
    } else if (ukData.regions[selectedRegion]) {
      // Use only the selected region
      availableRegions[selectedRegion] = ukData.regions[selectedRegion];
    } else {
      // Fallback to all regions if invalid selection
      availableRegions = ukData.regions;
    }
    
    // Select random region from filtered regions
    const regions = Object.keys(availableRegions);
    if (regions.length === 0) {
      throw new Error('No regions available for selected region');
    }
    
    const regionKey = randomElement(regions);
    const region = availableRegions[regionKey];
    
    // Generate name - decide gender first, then select name
    const nameGroup = namesData.nameGroups.western;
    const gender = Math.random() > 0.5 ? 'Male' : 'Female'; // English: Male/Female
    // Select name based on gender - use gender-specific name lists if available
    let firstName;
    if (nameGroup.first.male && nameGroup.first.female) {
      // Use gender-specific name lists
      firstName = randomElement(gender === 'Male' ? nameGroup.first.male : nameGroup.first.female);
    } else {
      // Fallback: use all names if gender classification not available
      firstName = randomElement(nameGroup.first);
    }
    const lastName = randomElement(nameGroup.last);
    
    // Generate phone
    const phoneCode = String(randomElement(region.phone_codes));
    const subscriber = randomInt(0, 999999999).toString().padStart(9, '0');
    const phone = `${phoneCode}${subscriber.slice(0, 3)} ${subscriber.slice(3)}`;
    
    // Generate email
    const email = generateEmail(firstName, lastName);
    
    // Generate address
    // Prefer single house number; range format is rare and must be ordered (min-max).
    const n1 = randomInt(1, 999);
    const n2 = randomInt(1, 999);
    const streetName = randomElement([
      'High Street', 'Church Road', 'Park Avenue', 'Main Road', 'London Road',
      'Victoria Street', 'King Street', 'Queen Street', 'Market Street',
      'Station Road', 'Mill Lane', 'Bridge Street', 'New Street', 'Old Street',
      'Castle Street', 'Church Street', 'School Lane', 'Garden Street', 'Hill Road',
      'Oak Avenue', 'Elm Street', 'Maple Drive', 'Cedar Road', 'Pine Street',
      'Rose Lane', 'Lily Street', 'Orchard Road', 'Meadow Way', 'River Street'
    ]);
    let street;
    if (Math.random() < 0.1) {
      const start = Math.min(n1, n2);
      const end = Math.max(n1, n2);
      street = `${start}-${end} ${streetName}`;
    } else {
      street = `${n1} ${streetName}`;
    }
    
    // Generate city - use region-specific cities if available, otherwise use fallback
    let city;
    if (region.cities && region.cities.length > 0) {
      // Use cities from the region's city list
      city = randomElement(region.cities);
    } else {
      // Fallback: use common UK city names (should not happen if data is complete)
      const fallbackCities = [
        'London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds',
        'Glasgow', 'Edinburgh', 'Bristol', 'Cardiff', 'Belfast'
      ];
      city = randomElement(fallbackCities);
    }
    
    // Postcode:
    // - If Scheme A samples exist and include a postcode, use it (more realistic)
    // - Otherwise fall back to generator format using postcode areas
    let postcode = '';
    if (Array.isArray(region.addresses) && region.addresses.length > 0) {
      const sample = randomElement(region.addresses);
      const pc = String(sample?.postcode || '').trim();
      if (pc) postcode = pc;
    }
    if (!postcode) {
      // UK postcode format: SW1A 1AA - use region-specific postcode areas if available
      let postcodeArea;
      if (region.postcode_areas && region.postcode_areas.length > 0) {
        postcodeArea = randomElement(region.postcode_areas);
      } else {
        postcodeArea = randomElement(['SW', 'NW', 'SE', 'NE', 'W', 'E', 'N', 'S']);
      }
      postcode = `${postcodeArea}${randomInt(1, 9)}${randomElement(['A', 'B', 'C'])} ${randomInt(1, 9)}${randomElement(['A', 'B', 'C'])}${randomElement(['A', 'B', 'C'])}`;
    }
    
    // Use English region name for full address and region field
    const regionNameEn = region.name.en || region.name.zh;
    const fullAddress = `${street}, ${city}, ${postcode}, ${regionNameEn}`;
    
    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street,
      city,
      postcode,
      region: regionNameEn, // 显示英文地区名
      fullAddress,
      country: 'UK'
    };
  } catch (error) {
    console.error('Error generating UK address:', error);
    throw error;
  }
}

// Generate Canada address
export async function generateCAAddress(selectedProvince = 'RANDOM') {
  try {
    const caData = await loadData('data/caData.json');
    const namesData = await loadData('data/namesData.json');
    
    // Filter provinces based on selected province
    let availableProvinces = {};
    if (selectedProvince === 'RANDOM') {
      // Prefer provinces with real address samples (Scheme A)
      const provinceEntries = Object.entries(caData.provinces || {});
      const withAddresses = provinceEntries.filter(([, v]) => Array.isArray(v.addresses) && v.addresses.length > 0);
      availableProvinces = Object.fromEntries((withAddresses.length > 0 ? withAddresses : provinceEntries));
    } else if (caData.provinces[selectedProvince]) {
      // Use only the selected province
      availableProvinces[selectedProvince] = caData.provinces[selectedProvince];
    } else {
      // Fallback to all provinces if invalid selection
      availableProvinces = caData.provinces;
    }
    
    // Select random province from filtered provinces
    const provinces = Object.keys(availableProvinces);
    if (provinces.length === 0) {
      throw new Error('No provinces available for selected province');
    }
    
    const provinceKey = randomElement(provinces);
    const province = availableProvinces[provinceKey];
    
    // Generate name - decide gender first, then select name
    const nameGroup = namesData.nameGroups.western;
    const gender = Math.random() > 0.5 ? 'Male' : 'Female'; // English: Male/Female
    // Select name based on gender - use gender-specific name lists if available
    let firstName;
    if (nameGroup.first.male && nameGroup.first.female) {
      // Use gender-specific name lists
      firstName = randomElement(gender === 'Male' ? nameGroup.first.male : nameGroup.first.female);
    } else {
      // Fallback: use all names if gender classification not available
      firstName = randomElement(nameGroup.first);
    }
    const lastName = randomElement(nameGroup.last);
    
    // Generate phone
    const areaCode = randomElement(province.area_codes);
    const phone = `(${areaCode}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`;
    
    // Generate email
    const email = generateEmail(firstName, lastName);
    
    // Generate address:
    // - If Scheme A samples exist, prefer them (more detailed / closer to real)
    // - Otherwise fall back to old random address generation
    let street = '';
    let city = '';
    let postcode = '';
    if (Array.isArray(province.addresses) && province.addresses.length > 0) {
      // Prefer complete sample rows to avoid field mixing.
      const completeSamples = province.addresses.filter((x) => {
        const sStreet = String(x?.street || '').trim();
        const sCity = String(x?.city || '').trim();
        const sPc = String(x?.postal_code || x?.postcode || '').trim();
        return sStreet && sCity && sPc;
      });
      const samplePool = completeSamples.length > 0 ? completeSamples : province.addresses;
      const sample = randomElement(samplePool);
      const sStreet = String(sample?.street || '').trim();
      const sCity = String(sample?.city || '').trim();
      const sPc = String(sample?.postal_code || sample?.postcode || '').trim();
      if (sStreet) street = sStreet;
      if (sCity) city = sCity;
      if (sPc) postcode = sPc;
    }

    if (!street) {
      const streetNumber = randomInt(100, 9999);
      const streetName = randomElement([
        'Main Street', 'Oak Avenue', 'Park Road', 'Maple Drive', 'Elm Street',
        'King Street', 'Queen Street', 'Church Street', 'Market Street',
        'First Street', 'Second Street', 'Third Avenue', 'Fourth Street',
        'Bay Street', 'Yonge Street', 'University Avenue', 'College Street',
        'Dundas Street', 'Bloor Street', 'Queen Street', 'King Street',
        'River Road', 'Lake Avenue', 'Hill Street', 'Valley Drive',
        'Forest Avenue', 'Garden Street', 'Rose Lane', 'Pine Street'
      ]);
      street = `${streetNumber} ${streetName}`;
    }

    if (!city) {
      if (province.cities && province.cities.length > 0) {
        city = randomElement(province.cities);
      } else {
        const fallbackCities = [
          'Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa',
          'Edmonton', 'Winnipeg', 'Quebec City', 'Hamilton', 'Halifax'
        ];
        city = randomElement(fallbackCities);
      }
    }

    if (!postcode) {
      // Canadian postal code format: A1A 1A1 - use province-specific prefixes if available
      let postcodePrefix;
      if (province.postcode_prefixes && province.postcode_prefixes.length > 0) {
        postcodePrefix = randomElement(province.postcode_prefixes);
      } else {
        postcodePrefix = randomElement(['A', 'B', 'C', 'E', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'X', 'Y']);
      }
      postcode = `${postcodePrefix}${randomInt(0, 9)}${randomElement(['A', 'B', 'C', 'E', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z'])} ${randomInt(0, 9)}${randomElement(['A', 'B', 'C', 'E', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z'])}${randomInt(0, 9)}`;
    }
    
    // Use English province name for full address and province field
    const provinceNameEn = province.name.en || province.name.zh;
    const fullAddress = `${street}, ${city}, ${provinceNameEn} ${postcode}`;
    
    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street,
      city,
      postcode,
      province: provinceNameEn, // 显示英文省份名
      fullAddress,
      country: 'CA'
    };
  } catch (error) {
    console.error('Error generating CA address:', error);
    throw error;
  }
}

// Generate Japan address
export async function generateJPAddress(selectedPrefecture = 'RANDOM') {
  try {
    const jpData = await loadData('data/jpData.json');
    let jpRealAreas = null;
    try {
      jpRealAreas = await loadData('data/jpRealAreas.json');
    } catch (e) {
      jpRealAreas = null;
    }
    const jpNamesData = await loadData('data/jpNamesData.json');
    const namesData = await loadData('data/namesData.json');
    
    // Filter prefectures based on selected prefecture
    let availablePrefectures = {};
    if (selectedPrefecture === 'RANDOM') {
      // Use all prefectures
      availablePrefectures = jpData.prefectures || {};
    } else if (jpData.prefectures && jpData.prefectures[selectedPrefecture]) {
      // Use only the selected prefecture
      availablePrefectures[selectedPrefecture] = jpData.prefectures[selectedPrefecture];
    } else {
      // Fallback to all prefectures if invalid selection
      availablePrefectures = jpData.prefectures || {};
    }
    
    // Select random prefecture from filtered prefectures
    const prefectures = Object.keys(availablePrefectures);
    if (prefectures.length === 0) {
      throw new Error('No prefectures available for selected prefecture');
    }
    
    const prefectureKey = randomElement(prefectures);
    const prefecture = availablePrefectures[prefectureKey];
    
    // Generate name using Japanese names database (kanji, hiragana, katakana)
    // Japanese surnames (姓) are almost always in kanji, rarely in hiragana/katakana
    const surnameScriptTypes = ['kanji', 'kanji', 'kanji', 'kanji', 'kanji', 'kanji', 'kanji', 'kanji', 'kanji', 'hiragana']; // 90% kanji, 10% hiragana
    const surnameScriptType = randomElement(surnameScriptTypes);
    const lastNames = jpNamesData.surnames[surnameScriptType] || jpNamesData.surnames.kanji;
    const lastName = randomElement(lastNames);
    
    // Japanese first names (名) can be in kanji, hiragana, or katakana
    const firstNameScriptTypes = ['kanji', 'kanji', 'kanji', 'hiragana', 'katakana']; // 60% kanji, 20% hiragana, 20% katakana
    const firstNameScriptType = randomElement(firstNameScriptTypes);
    
    const isMale = Math.random() > 0.5;
    
    // Get first name based on gender and script type
    let firstName;
    if (isMale) {
      const maleNames = jpNamesData.firstNames.male[firstNameScriptType] || jpNamesData.firstNames.male.kanji;
      firstName = randomElement(maleNames);
    } else {
      const femaleNames = jpNamesData.firstNames.female[firstNameScriptType] || jpNamesData.firstNames.female.kanji;
      firstName = randomElement(femaleNames);
    }
    
    // Gender in Japanese
    const gender = isMale ? '男性' : '女性';
    
    // Generate phone (Japan format: 0X-XXXX-XXXX) - use prefecture-specific phone codes if available
    let phoneCode;
    if (prefecture && prefecture.phone_codes && prefecture.phone_codes.length > 0) {
      // Use phone codes from the prefecture's list
      const selectedCode = randomElement(prefecture.phone_codes);
      phoneCode = selectedCode.toString().replace(/\D/g, '');
      if (!phoneCode.startsWith('0')) phoneCode = `0${phoneCode}`;
    } else {
      // Fallback: use random phone code (should not happen if data is complete)
      phoneCode = '03';
    }
    const subscriberLength = 10 - phoneCode.length;
    const subscriber = randomInt(0, (10 ** subscriberLength) - 1).toString().padStart(subscriberLength, '0');
    const localPrefixLength = subscriberLength - 4;
    const phone = `${phoneCode}-${subscriber.slice(0, localPrefixLength)}-${subscriber.slice(localPrefixLength)}`;
    
    // Generate email - use English names for email to avoid non-ASCII characters
    const englishNameGroup = namesData.nameGroups.western || namesData.nameGroups.asian;
    let emailFirstName, emailLastName;
    if (englishNameGroup && englishNameGroup.first && englishNameGroup.last) {
      const firstList = ensureNameArray(englishNameGroup.first);
      const lastList = ensureNameArray(englishNameGroup.last);
      // Use Japanese-style names from asian group if available
      const japaneseRomajiNames = firstList.filter(n => 
        ['Hiroshi', 'Takeshi', 'Akira', 'Satoshi', 'Kenji', 'Taro', 'Jiro', 'Ichiro', 'Yuki', 'Ai', 'Emi', 'Yui', 'Rina', 'Miki', 'Saki', 'Nana', 'Kana', 'Mana', 'Hanako', 'Misaki', 'Sakura', 'Aya', 'Rei', 'Mai', 'Eri', 'Yuka'].includes(n)
      );
      const japaneseRomajiLastNames = lastList.filter(n => 
        ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Yamazaki', 'Mori', 'Abe', 'Ikeda', 'Hashimoto', 'Ishikawa', 'Maeda', 'Fujita', 'Ogawa', 'Goto', 'Okada'].includes(n)
      );
      
      if (japaneseRomajiNames.length > 0 && japaneseRomajiLastNames.length > 0) {
        emailFirstName = randomElement(japaneseRomajiNames);
        emailLastName = randomElement(japaneseRomajiLastNames);
      } else {
        emailFirstName = randomElement(firstList);
        emailLastName = randomElement(lastList);
      }
    } else {
      // Fallback: generate random English username
      const randomNames = ['john', 'mary', 'david', 'sarah', 'michael', 'emily', 'james', 'lisa', 'robert', 'anna'];
      emailFirstName = randomElement(randomNames);
      emailLastName = randomElement(randomNames);
    }
    const email = generateEmail(emailFirstName, emailLastName);
    
    // Generate address using real Japanese area-level samples first (postcode/city/town)
    // Fallback to previous synthetic behavior if real data is unavailable.
    const addressData = jpData.address_data || {};
    const prefectureName = prefecture ? (prefecture.name.ja || prefecture.name.zh) : '東京都';

    let city;
    let address;
    let postcode;
    let fullAddress;

    const realRows = Array.isArray(jpRealAreas?.data) ? jpRealAreas.data : [];
    const realCandidates = realRows.filter(r => r && r.prefecture === prefectureName);
    if (realCandidates.length > 0) {
      const r = randomElement(realCandidates);
      city = r.city || '';
      const town = r.town || '';
      // Keep house number synthetic, but lock prefecture/city/postcode to real data.
      const block = `${randomInt(1, 50)}-${randomInt(1, 20)}`;
      address = `${town}${block}`;
      const rawPostcode = String(r.postcode || '').replace(/\D/g, '');
      postcode = rawPostcode.length === 7 ? `${rawPostcode.slice(0, 3)}-${rawPostcode.slice(3)}` : (r.postcode || '');
      fullAddress = `〒${postcode} ${prefectureName}${city}${address}`;
    } else {
      // Fallback: previous synthetic JP behavior.
      if (prefecture && prefecture.cities && prefecture.cities.length > 0) {
        city = randomElement(prefecture.cities);
      } else {
        const fallbackCities = addressData.cities?.kanji || ['東京', '大阪', '京都', '横浜', '名古屋', '札幌', '福岡', '神戸', '仙台', '広島', '千葉', '埼玉', '新潟', '静岡', '浜松', '岡山', '熊本', '鹿児島', '長崎', '大分'];
        city = randomElement(fallbackCities);
      }

      const wards = addressData.wards?.kanji || ['1丁目', '2丁目', '3丁目', '4丁目', '5丁目', '6丁目', '7丁目', '8丁目', '9丁目', '10丁目'];
      const ward = randomElement(wards);
      const streets = addressData.streets?.kanji || ['中央', '本町', '新町', '大通', '駅前', '公園', '桜', '松', '竹', '梅', '富士', '山', '川', '海', '森', '田', '橋', '坂', '谷', '原'];
      const streetName = randomElement(streets);
      const includeDistrict = Math.random() > 0.7;
      let district = '';
      if (includeDistrict && addressData.districts?.kanji) {
        district = randomElement(addressData.districts.kanji) + '';
      }
      const streetNumber = randomInt(1, 50);
      const buildingNumber = randomInt(1, 20);
      address = district
        ? `${district}${streetName}${ward}${streetNumber}番${buildingNumber}号`
        : `${streetName}${ward}${streetNumber}番${buildingNumber}号`;
      let postcodePrefix = '100';
      if (prefecture && prefecture.postal_prefix && prefecture.postal_prefix.length > 0) {
        postcodePrefix = randomElement(prefecture.postal_prefix);
      }
      postcode = `${postcodePrefix}-${randomInt(1000, 9999)}`;
      fullAddress = `〒${postcode} ${prefectureName}${city}${address}`;
    }
    
    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street: address,
      city,
      prefecture: prefectureName,
      postcode,
      fullAddress,
      country: 'JP'
    };
  } catch (error) {
    console.error('Error generating JP address:', error);
    throw error;
  }
}

// Generate India address
export async function generateINAddress(selectedState = 'RANDOM') {
  try {
    const inData = await loadData('data/inData.json');
    let inPinAreas = null;
    try {
      inPinAreas = await loadData('data/inPinAreas.json');
    } catch (e) {
      inPinAreas = null;
    }
    const namesData = await loadData('data/namesData.json');
    
    // Filter states based on selected state
    let availableStates = {};
    if (selectedState === 'RANDOM') {
      // Use all states
      availableStates = inData.states;
    } else if (inData.states[selectedState]) {
      // Use only the selected state
      availableStates[selectedState] = inData.states[selectedState];
    } else {
      // Fallback to all states if invalid selection
      availableStates = inData.states;
    }
    
    // Select random state from filtered states
    const states = Object.keys(availableStates);
    if (states.length === 0) {
      throw new Error('No states available for selected state');
    }
    
    const stateKey = randomElement(states);
    const state = availableStates[stateKey];
    
    // Generate name (Indian) - decide gender first, then select name
    const nameGroup = namesData.nameGroups.indian;
    const gender = Math.random() > 0.5 ? 'Male' : 'Female'; // English: Male/Female
    // Select name based on gender - use gender-specific name lists if available
    let firstName;
    if (nameGroup.first.male && nameGroup.first.female) {
      // Use gender-specific name lists
      firstName = randomElement(gender === 'Male' ? nameGroup.first.male : nameGroup.first.female);
    } else {
      // Fallback: use all names if gender classification not available
      firstName = randomElement(nameGroup.first);
    }
    const lastName = randomElement(nameGroup.last);
    
    // Generate phone (India format: +91 XXXXXXXXXX) - use state-specific area codes if available
    let phoneNumber;
    if (state.area_codes && state.area_codes.length > 0) {
      // Use area codes from the state's list (format: XXXX, convert to phone number)
      const areaCode = randomElement(state.area_codes);
      // Indian mobile numbers start with 6-9, generate remaining digits
      const mobilePrefix = randomElement([6, 7, 8, 9]);
      const remainingDigits = randomInt(0, 999999999).toString().padStart(9, '0');
      phoneNumber = `${mobilePrefix}${remainingDigits}`;
    } else {
      // Fallback: use random phone number (should not happen if data is complete)
      phoneNumber = randomInt(6000000000, 9999999999).toString();
    }
    const phone = `+91 ${phoneNumber}`;
    
    // Generate email
    const email = generateEmail(firstName, lastName);
    
    // Generate address - prefer real India PIN/office samples, fallback to previous logic.
    const stateNameEn = state.name.en || state.name.zh;
    const stateAliases = {
      OR: ['ODISHA', 'ORISSA'],
      UK: ['UTTARAKHAND', 'UTTARANCHAL'],
      CG: ['CHHATTISGARH'],
      PY: ['PUDUCHERRY', 'PONDICHERRY']
    };

    let street;
    let city;
    let pin;
    let fullAddress;

    const realRows = Array.isArray(inPinAreas?.data) ? inPinAreas.data : [];
    const targetNames = [normalizeText(stateNameEn), ...(stateAliases[stateKey] || [])];
    const realCandidates = realRows.filter(r => targetNames.includes(normalizeText(r.state)));
    if (realCandidates.length > 0) {
      const r = randomElement(realCandidates);
      pin = String(r.pincode || '');
      city = r.district || randomElement(state.cities || ['Mumbai']);
      street = `${randomInt(1, 999)}, ${r.office || 'Main Road'}`;
      fullAddress = `${street}, ${city}, ${stateNameEn} ${pin}`;
    } else {
      const streetNumber = randomInt(1, 999);
      const streetName = randomElement([
        'Main Road', 'Gandhi Street', 'Nehru Road', 'Park Street', 'Market Road',
        'Church Street', 'Temple Street', 'School Road', 'Hospital Road',
        'MG Road', 'Station Road', 'Airport Road', 'Highway Road', 'Ring Road',
        'First Street', 'Second Street', 'Third Street', 'Fourth Street',
        'Gandhi Nagar', 'Nehru Nagar', 'Rajiv Nagar', 'Indira Nagar',
        'College Road', 'University Road', 'Library Road', 'Museum Road'
      ]);
      street = `${streetNumber}, ${streetName}`;

      if (state.cities && state.cities.length > 0) {
        city = randomElement(state.cities);
      } else {
        const fallbackCities = [
          'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
          'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat'
        ];
        city = randomElement(fallbackCities);
      }

      if (state.pin_range && state.pin_range.min && state.pin_range.max) {
        pin = randomInt(state.pin_range.min, state.pin_range.max).toString();
      } else {
        pin = randomInt(100000, 999999).toString();
      }
      fullAddress = `${street}, ${city}, ${stateNameEn} ${pin}`;
    }
    
    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street,
      city,
      state: stateNameEn, // 显示英文邦名
      pin,
      fullAddress,
      country: 'IN'
    };
  } catch (error) {
    console.error('Error generating IN address:', error);
    throw error;
  }
}

// Generate Taiwan address
export async function generateTWAddress(selectedCounty = 'RANDOM') {
  try {
    const namesData = await loadData('data/namesData.json');
    
    // Try to load Taiwan data
    let twData = null;
    let selectedCountyData = null;
    let selectedCountyKey = null;
    try {
      twData = await loadData('data/twData.json');
      if (twData && twData.counties) {
        // Filter counties based on selected county
        let availableCounties = {};
        if (selectedCounty === 'RANDOM') {
          // Prefer counties with real address samples (Scheme A)
          const countyEntries = Object.entries(twData.counties || {});
          const withAddresses = countyEntries.filter(([, v]) => Array.isArray(v.addresses) && v.addresses.length > 0);
          availableCounties = Object.fromEntries((withAddresses.length > 0 ? withAddresses : countyEntries));
        } else if (twData.counties[selectedCounty]) {
          // Use only the selected county
          availableCounties[selectedCounty] = twData.counties[selectedCounty];
        } else {
          // Fallback to all counties if invalid selection
          availableCounties = twData.counties;
        }
        
        // Select random county from filtered counties
        const counties = Object.keys(availableCounties);
        if (counties.length > 0) {
          const countyKey = randomElement(counties);
          selectedCountyKey = countyKey;
          selectedCountyData = availableCounties[countyKey];
        }
      }
    } catch (e) {
      // If data file doesn't exist, use fallback
      console.warn('Taiwan data file not found, using fallback');
    }
    
    // Generate name (Chinese) - decide gender first, then select name
    const nameGroup = namesData.nameGroups.chinese;
    const gender = Math.random() > 0.5 ? '男' : '女'; // 中文：男/女
    const firstName = randomElement(gender === '男' ? nameGroup.first.male : nameGroup.first.female);
    const lastName = randomElement(nameGroup.last);
    
    // Generate phone (Taiwan format: 09XX-XXX-XXX) - use county-specific area codes if available
    const mobileDigits = randomInt(0, 99999999).toString().padStart(8, '0');
    const phone = `09${mobileDigits.slice(0, 2)}-${mobileDigits.slice(2, 5)}-${mobileDigits.slice(5)}`;
    
    // Generate email - use English names for email to avoid Chinese characters
    const englishNameGroup = namesData.nameGroups.western || namesData.nameGroups.asian;
    let emailFirstName, emailLastName;
    if (englishNameGroup && englishNameGroup.first && englishNameGroup.last) {
      const firstList = ensureNameArray(englishNameGroup.first);
      const lastList = ensureNameArray(englishNameGroup.last);
      emailFirstName = randomElement(firstList);
      emailLastName = randomElement(lastList);
    } else {
      // Fallback: generate random English username
      const randomNames = ['john', 'mary', 'david', 'sarah', 'michael', 'emily', 'james', 'lisa', 'robert', 'anna'];
      emailFirstName = randomElement(randomNames);
      emailLastName = randomElement(randomNames);
    }
    const email = generateEmail(emailFirstName, emailLastName);
    
    // Generate address
    // Use county data if available, otherwise use fallback cities
    let city, district;
    const countyDistrictMap = {
      CHA: ['彰化市', '鹿港鎮', '和美鎮', '員林市', '北斗鎮'],
      CYI: ['東區', '西區'],
      CYQ: ['太保市', '朴子市', '民雄鄉', '水上鄉', '中埔鄉'],
      HSQ: ['竹北市', '竹東鎮', '新豐鄉', '湖口鄉', '新埔鎮'],
      HSZ: ['東區', '北區', '香山區'],
      HUA: ['花蓮市', '吉安鄉', '新城鄉', '玉里鎮', '鳳林鎮'],
      ILA: ['宜蘭市', '羅東鎮', '礁溪鄉', '冬山鄉', '蘇澳鎮'],
      JMN: ['金城鎮', '金湖鎮', '金沙鎮', '金寧鄉', '烈嶼鄉'],
      KEE: ['仁愛區', '信義區', '中正區', '中山區', '安樂區', '暖暖區', '七堵區'],
      KHH: ['苓雅區', '三民區', '鳳山區', '左營區', '前鎮區'],
      LJF: ['南竿鄉', '北竿鄉', '莒光鄉', '東引鄉'],
      MIA: ['苗栗市', '頭份市', '竹南鎮', '苑裡鎮', '後龍鎮'],
      NAN: ['南投市', '草屯鎮', '埔里鎮', '竹山鎮', '集集鎮'],
      PEN: ['馬公市', '湖西鄉', '白沙鄉', '西嶼鄉', '七美鄉'],
      PIF: ['屏東市', '潮州鎮', '東港鎮', '恆春鎮', '內埔鄉'],
      TAO: ['桃園區', '中壢區', '平鎮區', '八德區', '龜山區'],
      TNN: ['中西區', '東區', '北區', '安平區', '永康區'],
      TPE: ['中正區', '大同區', '中山區', '松山區', '大安區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區'],
      TPH: ['板橋區', '三重區', '中和區', '永和區', '新莊區', '新店區'],
      TTT: ['台東市', '成功鎮', '關山鎮', '卑南鄉', '太麻里鄉'],
      TXG: ['中區', '東區', '南區', '西區', '北區', '西屯區', '南屯區', '北屯區'],
      YUN: ['斗六市', '虎尾鎮', '斗南鎮', '西螺鎮', '北港鎮']
    };
    if (selectedCountyData && selectedCountyData.name) {
      city = selectedCountyData.name.zh;
      // Use county-specific districts/cities first.
      const districtPool = countyDistrictMap[selectedCountyKey] || countyDistrictMap[selectedCounty] || [];
      if (districtPool.length > 0) {
        district = randomElement(districtPool);
      } else {
        district = randomElement(['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區']);
      }
    } else {
      // Fallback cities
      const cities = ['台北市', '新北市', '台中市', '台南市', '高雄市', '桃園市'];
      city = randomElement(cities);
      district = randomElement(['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區']);
    }
    
    let street = randomElement([
      '中山路', '中正路', '民生路', '民權路', '民族路',
      '建國路', '復興路', '和平路', '自由路', '成功路',
      '忠孝路', '仁愛路', '信義路', '和平路', '光復路',
      '中華路', '文化路', '大學路', '公園路', '車站路',
      '中央路', '大同路', '大安路', '大業路', '大興路',
      '新生路', '新興路', '新市路', '新莊路', '新店路'
    ]);
    let streetNumber = randomInt(1, 999);

    // If Scheme A samples exist for this county, prefer a usable street fragment and/or postcode.
    let postcodeFromSample = '';
    if (selectedCountyData && Array.isArray(selectedCountyData.addresses) && selectedCountyData.addresses.length > 0) {
      const samplePool = selectedCountyData.addresses.filter((x) => {
        const sStreet = String(x?.street || '').trim();
        const sDistrict = String(x?.district || '').trim();
        const sPc = String(x?.postcode || '').trim();
        return sStreet && sDistrict && sPc;
      });
      const sample = randomElement(samplePool.length > 0 ? samplePool : selectedCountyData.addresses);
      const pc = String(sample?.postcode || '').trim();
      if (pc) postcodeFromSample = pc;
      const sampleDistrict = String(sample?.district || '').trim();
      if (sampleDistrict) district = sampleDistrict;

      const sampleStreet = String(sample?.street || '').trim();
      // Heuristic: only use sample street if it contains typical road tokens
      if (sampleStreet && /[路街大道巷弄號]/.test(sampleStreet) && sampleStreet.length >= 4) {
        // If sample already contains a number, don't add another
        if (/\d/.test(sampleStreet)) {
          street = sampleStreet;
          streetNumber = null;
        } else {
          street = sampleStreet;
        }
      }
    }

    const address = streetNumber ? `${city}${district}${street}${streetNumber}號` : `${city}${district}${street}`;
    
    // Taiwan postal code (5 digits) - use county-specific postcode range if available
    let postcode;
    if (postcodeFromSample) {
      postcode = postcodeFromSample;
    } else if (selectedCountyData && selectedCountyData.postcode_range && selectedCountyData.postcode_range.min && selectedCountyData.postcode_range.max) {
      // Use postcode range from the county's postcode_range
      postcode = randomInt(selectedCountyData.postcode_range.min, selectedCountyData.postcode_range.max).toString();
    } else {
      // Fallback: use random 5-digit postcode (should not happen if data is complete)
      postcode = randomInt(10000, 99999).toString();
    }
    
    const fullAddress = `${address}, ${postcode}`;
    
    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street: address,
      city,
      district,
      postcode,
      fullAddress,
      country: 'TW'
    };
  } catch (error) {
    console.error('Error generating TW address:', error);
    throw error;
  }
}

// Generate tax-free US address (only from tax-free states)
export async function generateTaxFreeAddress(selectedState = 'DE') {
  try {
    const usData = await loadData('data/usData.json');
    const namesData = await loadData('data/namesData.json');

    // Tax-free mode uses dedicated pool only; no county/zip mapping and no synthetic fallback.
    const taxfreeData = await loadData('data/us_taxfree.min.json');

    const pool = (taxfreeData && taxfreeData.data) || {};
    const availableStates = Array.isArray(taxfreeData && taxfreeData.states_available)
      ? taxfreeData.states_available.filter(code => Array.isArray(pool[code]) && pool[code].length > 0)
      : Object.keys(pool).filter(code => Array.isArray(pool[code]) && pool[code].length > 0);

    if (availableStates.length === 0) {
      throw new Error('No tax-free address data available');
    }

    let stateCode = selectedState;
    if (!availableStates.includes(stateCode)) {
      stateCode = randomElement(availableStates);
    }

    const state = usData.states[stateCode];
    if (!state) {
      throw new Error(`State ${stateCode} not found`);
    }

    const stateRows = pool[stateCode];
    if (!Array.isArray(stateRows) || stateRows.length === 0) {
      throw new Error(`No tax-free rows for state ${stateCode}`);
    }

    const row = randomElement(stateRows);
    if (!row || !row.street || !row.city || !row.zip) {
      throw new Error(`Invalid tax-free row for state ${stateCode}`);
    }

    // Keep person/contact generation consistent with US generator.
    const nameGroup = namesData.nameGroups.western;
    const gender = Math.random() > 0.5 ? 'Male' : 'Female';
    let firstName;
    if (nameGroup.first.male && nameGroup.first.female) {
      firstName = randomElement(gender === 'Male' ? nameGroup.first.male : nameGroup.first.female);
    } else {
      firstName = randomElement(nameGroup.first);
    }
    const lastName = randomElement(nameGroup.last);
    const areaCode = randomElement(state.area_codes);
    const phone = generatePhoneNumber(areaCode);
    const email = generateEmail(firstName, lastName);

    const stateNameEn = state.name.en || row.state || row.stateCode || stateCode;
    const fullAddress = row.fullAddress || `${row.street}, ${row.city}, ${stateNameEn} ${row.zip}`;

    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street: row.street,
      city: row.city,
      county: row.county || 'N/A',
      state: stateNameEn,
      stateCode,
      zip: row.zip,
      fullAddress,
      country: 'US'
    };
  } catch (error) {
    console.error('Error generating tax-free US address:', error);
    throw error;
  }
}

// Generate Singapore address
export async function generateSGAddress(selectedState = 'RANDOM') {
  try {
    const sgData = await loadData('data/sgData.json');
    const namesData = await loadData('data/namesData.json');
    
    let availableStates = {};
    if (selectedState === 'RANDOM') {
      availableStates = sgData.states;
    } else if (sgData.states[selectedState]) {
      availableStates[selectedState] = sgData.states[selectedState];
    } else {
      availableStates = sgData.states;
    }
    
    const states = Object.keys(availableStates);
    if (states.length === 0) throw new Error('No regions available');
    
    const stateKey = randomElement(states);
    const state = availableStates[stateKey];
    
    const nameGroup = namesData.nameGroups.western;
    const genderRaw = Math.random() > 0.5 ? 'Male' : 'Female';
    let firstName;
    if (nameGroup.first.male && nameGroup.first.female) {
      firstName = randomElement(genderRaw === 'Male' ? nameGroup.first.male : nameGroup.first.female);
    } else {
      firstName = randomElement(nameGroup.first);
    }
    const lastName = randomElement(nameGroup.last);
    const gender = genderRaw === 'Male' ? 'Male' : 'Female';
    
    const mobilePrefix = randomElement(['8', '9']);
    const subscriberNumber = randomInt(1000000, 9999999);
    const phone = `+65 ${mobilePrefix}${subscriberNumber}`;
    
    const email = generateEmail(firstName, lastName);
    
    const cities = Object.keys(state.cities);
    if (cities.length === 0) throw new Error(`No cities for region ${stateKey}`);
    
    const cityName = randomElement(cities);
    const cityData = state.cities[cityName];
    
    if (!cityData || !cityData.zip || !cityData.streets) {
      throw new Error(`Invalid city data for ${cityName}`);
    }
    
    const zip = randomElement(cityData.zip);
    const streetName = randomElement(cityData.streets);
    
    const useBlockFormat = Math.random() > 0.3;
    let street;
    if (useBlockFormat) {
      const blockNum = randomInt(1, 999);
      const floor = randomInt(1, 25);
      const unit = randomInt(1, 12);
      street = `Block ${blockNum}, ${streetName}, #${floor.toString().padStart(2, '0')}-${unit.toString().padStart(2, '0')}`;
    } else {
      const unitNum = randomInt(1, 200);
      const floor = randomInt(1, 30);
      const unit = randomInt(1, 8);
      street = `${unitNum} ${streetName}, #${floor}-${unit}`;
    }
    
    const stateNameEn = state.name.en || state.name.zh;
    const fullAddress = `${street}, Singapore ${zip}`;
    
    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street,
      city: cityName,
      zip,
      postcode: zip,
      state: stateNameEn,
      stateCode: stateKey,
      fullAddress,
      country: 'SG'
    };
  } catch (error) {
    console.error('Error generating SG address:', error);
    throw error;
  }
}

// Generate Germany address
export async function generateDEAddress(selectedState = 'RANDOM') {
  try {
    const deData = await loadData('data/deData.json');
    const namesData = await loadData('data/namesData.json');
    
    // Filter states based on selected state
    let availableStates = {};
    if (selectedState === 'RANDOM') {
      // Use all states
      availableStates = deData.states;
    } else if (deData.states[selectedState]) {
      // Use only the selected state
      availableStates[selectedState] = deData.states[selectedState];
    } else {
      // Fallback to all states if invalid selection
      availableStates = deData.states;
    }
    
    // Select random state from filtered states
    const states = Object.keys(availableStates);
    if (states.length === 0) {
      throw new Error('No states available for selected state');
    }
    
    const stateKey = randomElement(states);
    const state = availableStates[stateKey];
    
    // Generate name - decide gender first, then select name
    const nameGroup = namesData.nameGroups.western;
    const genderRaw = Math.random() > 0.5 ? 'Male' : 'Female';
    // Select name based on gender - use gender-specific name lists if available
    let firstName;
    if (nameGroup.first.male && nameGroup.first.female) {
      // Use gender-specific name lists
      firstName = randomElement(genderRaw === 'Male' ? nameGroup.first.male : nameGroup.first.female);
    } else {
      // Fallback: use all names if gender classification not available
      firstName = randomElement(nameGroup.first);
    }
    const lastName = randomElement(nameGroup.last);
    
    // Convert gender to German format for display: Männlich (男) / Weiblich (女)
    const gender = genderRaw === 'Male' ? 'Männlich (男)' : 'Weiblich (女)';
    
    // Generate phone - German mobile format: +49 1xx xxxxxxx
    // Mobile prefixes: 151, 160, 170, 171, 175 (Telekom); 152, 162, 172, 173, 174 (Vodafone); 157, 163, 176, 177, 178 (O2)
    const mobilePrefixes = ['151', '160', '170', '171', '175', '152', '162', '172', '173', '174', '157', '163', '176', '177', '178'];
    const prefix = randomElement(mobilePrefixes);
    const subscriberNumber = randomInt(1000000, 9999999);
    const phone = `+49 ${prefix} ${subscriberNumber}`;
    
    // Generate email - use generateEmail function (ensures no dot before @)
    const email = generateEmail(firstName, lastName);
    
    // Generate address - select random city from state
    // IMPORTANT: Ensure city is selected from the correct state to avoid cross-state mismatches
    const cities = Object.keys(state.cities);
    if (cities.length === 0) {
      throw new Error(`No cities available for state ${stateKey}`);
    }
    
    const cityName = randomElement(cities);
    const cityData = state.cities[cityName];
    
    // Validate city data structure
    if (!cityData || !cityData.zip || !cityData.streets) {
      throw new Error(`Invalid city data structure for ${cityName} in state ${stateKey}`);
    }
    
    // Get zip code from city data (ensures zip matches the city)
    if (cityData.zip.length === 0) {
      throw new Error(`No zip codes available for city ${cityName} in state ${stateKey}`);
    }
    const zip = randomElement(cityData.zip);
    
    // Get street name from city data (ensures street matches the city)
    if (cityData.streets.length === 0) {
      throw new Error(`No streets available for city ${cityName} in state ${stateKey}`);
    }
    const streetName = randomElement(cityData.streets);
    
    // Generate house number (1-150, occasionally with letter suffix like 12a)
    const houseNumber = randomInt(1, 150);
    const suffix = Math.random() < 0.2 ? String.fromCharCode(97 + randomInt(0, 2)) : '';
    const street = `${streetName} ${houseNumber}${suffix}`;
    
    // Use English state name for full address and state field
    const stateNameEn = state.name.en || state.name.zh;
    const fullAddress = `${street}, ${zip} ${cityName}, ${stateNameEn}, Germany`;
    
    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street,
      city: cityName,
      zip,
      postcode: zip,
      state: stateNameEn,
      stateCode: stateKey,
      fullAddress,
      country: 'DE'
    };
  } catch (error) {
    console.error('Error generating DE address:', error);
    throw error;
  }
}

