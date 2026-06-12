import { EMAIL_PREFIX_FORMATS, type EmailPrefixFormat } from "@/config/email";

/**
 * 常用英文名字库（2020s 流行 + 经典混合，共 140 个，全小写、3-8 字符）
 */
const COMMON_NAMES = [
  // 男性/中性 (70个)
  "liam",
  "noah",
  "oliver",
  "elijah",
  "mateo",
  "lucas",
  "levi",
  "ezra",
  "asher",
  "leo",
  "luca",
  "miles",
  "theo",
  "owen",
  "finn",
  "felix",
  "henry",
  "jack",
  "hudson",
  "kai",
  "ethan",
  "aiden",
  "arlo",
  "silas",
  "jude",
  "rowan",
  "beau",
  "axel",
  "atlas",
  "ryker",
  "august",
  "walker",
  "wesley",
  "micah",
  "caleb",
  "adrian",
  "julian",
  "declan",
  "emmett",
  "everett",
  "gavin",
  "grayson",
  "holden",
  "ian",
  "jasper",
  "jonah",
  "jordan",
  "knox",
  "landon",
  "marcus",
  "mason",
  "max",
  "nico",
  "nolan",
  "oscar",
  "parker",
  "reid",
  "river",
  "ronan",
  "sawyer",
  "simon",
  "tate",
  "tobias",
  "tristan",
  "victor",
  "wyatt",
  "xavier",
  "zane",
  "cole",
  "dean",

  // 女性 (70个)
  "olivia",
  "emma",
  "amelia",
  "sophia",
  "mia",
  "luna",
  "aria",
  "ivy",
  "nora",
  "hazel",
  "aurora",
  "willow",
  "ella",
  "ellie",
  "grace",
  "chloe",
  "layla",
  "lily",
  "zoe",
  "stella",
  "violet",
  "ruby",
  "alice",
  "clara",
  "daisy",
  "eden",
  "elena",
  "eliza",
  "fiona",
  "freya",
  "gemma",
  "harper",
  "isla",
  "jade",
  "june",
  "kira",
  "leah",
  "mila",
  "naomi",
  "nova",
  "paige",
  "penny",
  "piper",
  "quinn",
  "rose",
  "sadie",
  "sage",
  "skye",
  "tessa",
  "thea",
  "vera",
  "wren",
  "yara",
  "zara",
  "ada",
  "anya",
  "brielle",
  "camila",
  "delilah",
  "elsie",
  "faye",
  "gianna",
  "iris",
  "joy",
  "kate",
  "lena",
  "lucy",
  "maeve",
  "sienna",
  "nadia",
];

// 随机字符集：剔除易混淆字符（i/l/o 与 0/1），避免抄写邮箱时认错
const ALPHA_CHARS = "abcdefghjkmnpqrstuvwxyz";
const ALNUM_CHARS = ALPHA_CHARS + "23456789";

/**
 * 生成 [0, maxExclusive) 的随机整数。
 * 优先使用 crypto 并做拒绝采样消除取模偏差；无 crypto 环境回退 Math.random。
 */
function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) {
    return 0;
  }

  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    const range = 0x100000000;
    const limit = range - (range % maxExclusive);
    const buffer = new Uint32Array(1);
    let value: number;
    do {
      cryptoObj.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);
    return value % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
}

function randomFrom(chars: string, length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[randomInt(chars.length)];
  }
  return result;
}

/**
 * 生成纯随机字母字符串（无数字）
 */
function generateRandomAlpha(length: number): string {
  return randomFrom(ALPHA_CHARS, Math.max(0, length));
}

/**
 * 生成随机字母数字字符串（首字符固定为字母，避免前缀以数字开头）
 */
function generateRandomAlphanumeric(length: number): string {
  if (length <= 0) {
    return "";
  }
  return randomFrom(ALPHA_CHARS, 1) + randomFrom(ALNUM_CHARS, length - 1);
}

/**
 * 生成指定位数的随机数字串（首位 1-9）
 */
function generateRandomDigits(length: number): string {
  if (length <= 0) {
    return "";
  }
  let result = (randomInt(9) + 1).toString();
  for (let i = 1; i < length; i++) {
    result += randomInt(10).toString();
  }
  return result;
}

/**
 * 从名字列表中随机选择一个
 */
function getRandomName(): string {
  return COMMON_NAMES[randomInt(COMMON_NAMES.length)];
}

/**
 * 随机年份：1980 ~ 当前年份（动态上限，不再写死）
 */
function getRandomYear(): string {
  const currentYear = new Date().getFullYear();
  return (1980 + randomInt(currentYear - 1980 + 1)).toString();
}

/**
 * 随机日期 MMDD（日取 1-28，避免月份天数边界）
 */
function getRandomDateMmdd(): string {
  const month = (randomInt(12) + 1).toString().padStart(2, "0");
  const day = (randomInt(28) + 1).toString().padStart(2, "0");
  return month + day;
}

/**
 * 根据配置生成邮箱前缀
 * @param format 前缀格式
 * @param length 前缀长度（对某些格式可能不完全使用）
 * @returns 生成的前缀字符串
 */
export function generateEmailPrefix(
  format: EmailPrefixFormat,
  length: number
): string {
  switch (format) {
    case EMAIL_PREFIX_FORMATS.RANDOM:
      // 纯随机字符串（小写字母+数字，剔除易混淆字符）
      return generateRandomAlphanumeric(length);

    case EMAIL_PREFIX_FORMATS.RANDOM_ALPHA:
      // 纯随机字母字符串（无数字）
      return generateRandomAlpha(length);

    case EMAIL_PREFIX_FORMATS.NAME_NUMBER: {
      // 名字+随机数字，确保总长度不超过配置
      const name = getRandomName();
      let numLength = length - name.length;

      // 名字太长时退化为纯数字
      if (numLength < 1) {
        return generateRandomDigits(length);
      }

      // 数字位数限制在1-5位之间
      numLength = Math.min(5, Math.max(1, numLength));
      return `${name}${generateRandomDigits(numLength)}`.substring(0, length);
    }

    case EMAIL_PREFIX_FORMATS.NAME_DATE: {
      // 名字+随机日期MMDD格式，超长时优先保留日期、截断名字
      const name = getRandomName();
      const dateStr = getRandomDateMmdd();
      const result = `${name}${dateStr}`;
      if (result.length > length && length >= 4) {
        return name.substring(0, length - 4) + dateStr;
      }
      return result.substring(0, length);
    }

    case EMAIL_PREFIX_FORMATS.NAME_YEAR: {
      // 名字+随机年份YYYY格式，超长时优先保留年份、截断名字
      const name = getRandomName();
      const yearStr = getRandomYear();
      const result = `${name}${yearStr}`;
      if (result.length > length && length >= 4) {
        return name.substring(0, length - 4) + yearStr;
      }
      return result.substring(0, length);
    }

    case EMAIL_PREFIX_FORMATS.RANDOM_DATE: {
      // 随机字符串+日期MMDD格式
      const prefixLength = Math.max(1, length - 4);
      return generateRandomAlphanumeric(prefixLength) + getRandomDateMmdd();
    }

    case EMAIL_PREFIX_FORMATS.RANDOM_YEAR: {
      // 随机字符串+年份YYYY格式
      const prefixLength = Math.max(1, length - 4);
      return generateRandomAlphanumeric(prefixLength) + getRandomYear();
    }

    default:
      return generateRandomAlphanumeric(length);
  }
}
