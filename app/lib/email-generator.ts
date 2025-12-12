import { EMAIL_PREFIX_FORMATS, type EmailPrefixFormat } from "@/config/email";
import { nanoid } from "nanoid";

/**
 * 常见美国和国际名字列表 (共 120 个)
 */
const COMMON_NAMES = [
  // 男性名字 (60个)
  "james",
  "john",
  "robert",
  "michael",
  "william",
  "david",
  "richard",
  "joseph",
  "thomas",
  "charles",
  "christopher",
  "daniel",
  "matthew",
  "anthony",
  "mark",
  "donald",
  "steven",
  "paul",
  "andrew",
  "joshua",
  "kenneth",
  "kevin",
  "brian",
  "george",
  "edward",
  "ronald",
  "timothy",
  "jason",
  "jeffrey",
  "ryan",
  "jacob",
  "gary",
  "nicholas",
  "eric",
  "jonathan",
  "stephen",
  "larry",
  "justin",
  "scott",
  "brandon",
  "benjamin",
  "samuel",
  "raymond",
  "gregory",
  "frank",
  "alexander",
  "patrick",
  "jack",
  "dennis",
  "jerry",
  "tyler",
  "aaron",
  "jose",
  "adam",
  "henry",
  "nathan",
  "douglas",
  "zachary",
  "peter",
  "kyle",

  // 女性名字 (60个)
  "mary",
  "patricia",
  "jennifer",
  "linda",
  "barbara",
  "elizabeth",
  "susan",
  "jessica",
  "sarah",
  "karen",
  "nancy",
  "lisa",
  "betty",
  "margaret",
  "sandra",
  "ashley",
  "kimberly",
  "emily",
  "donna",
  "michelle",
  "dorothy",
  "carol",
  "amanda",
  "melissa",
  "deborah",
  "stephanie",
  "rebecca",
  "sharon",
  "laura",
  "cynthia",
  "kathleen",
  "amy",
  "angela",
  "shirley",
  "anna",
  "brenda",
  "pamela",
  "emma",
  "nicole",
  "helen",
  "samantha",
  "katherine",
  "christine",
  "debra",
  "rachel",
  "catherine",
  "carolyn",
  "janet",
  "ruth",
  "maria",
  "heather",
  "diane",
  "virginia",
  "julie",
  "joyce",
  "victoria",
  "olivia",
  "kelly",
  "christina",
  "lauren",
];

/**
 * 生成纯随机字母字符串（无数字）
 */
function generateRandomAlpha(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成随机字母数字字符串
 */
function generateRandomAlphanumeric(length: number): string {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 从名字列表中随机选择一个
 */
function getRandomName(): string {
  return COMMON_NAMES[Math.floor(Math.random() * COMMON_NAMES.length)];
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
      // 纯随机字符串（字母+数字，URL安全）
      return nanoid(length);

    case EMAIL_PREFIX_FORMATS.RANDOM_ALPHA:
      // 纯随机字母字符串（无数字）
      return generateRandomAlpha(length);

    case EMAIL_PREFIX_FORMATS.NAME_NUMBER: {
      // 名字+随机数字，确保总长度不超过配置
      const name = getRandomName();
      // 计算剩余可用于数字的长度
      let numLength = length - name.length;

      // 如果名字太长，截断或使用纯数字
      if (numLength < 1) {
        // 名字太长，使用纯数字
        const min = Math.pow(10, length - 1);
        const max = Math.pow(10, length) - 1;
        return Math.floor(Math.random() * (max - min + 1) + min).toString();
      }

      // 数字位数限制在1-5位之间
      numLength = Math.min(5, Math.max(1, numLength));
      const min = Math.pow(10, numLength - 1);
      const max = Math.pow(10, numLength) - 1;
      const randomNum = Math.floor(Math.random() * (max - min + 1) + min);

      // 确保不超过长度限制
      const result = `${name}${randomNum}`;
      return result.substring(0, length);
    }

    case EMAIL_PREFIX_FORMATS.NAME_DATE: {
      // 名字+随机日期MMDD格式，确保总长度不超过配置
      const name = getRandomName();
      const month = (Math.floor(Math.random() * 12) + 1)
        .toString()
        .padStart(2, "0");
      const day = (Math.floor(Math.random() * 28) + 1)
        .toString()
        .padStart(2, "0");
      const result = `${name}${month}${day}`;
      // 如果超过长度限制，截断（优先保留日期部分）
      if (result.length > length && length >= 4) {
        // 保留日期MMDD，截断名字
        return name.substring(0, length - 4) + month + day;
      }
      return result.substring(0, length);
    }

    case EMAIL_PREFIX_FORMATS.NAME_YEAR: {
      // 名字+随机年份YYYY格式，确保总长度不超过配置
      const name = getRandomName();
      const randomYear = Math.floor(Math.random() * 45) + 1980; // 1980-2024
      const result = `${name}${randomYear}`;
      // 如果超过长度限制，截断（优先保留年份部分）
      if (result.length > length && length >= 4) {
        // 保留年份YYYY，截断名字
        return name.substring(0, length - 4) + randomYear;
      }
      return result.substring(0, length);
    }

    case EMAIL_PREFIX_FORMATS.RANDOM_DATE: {
      // 随机字符串+日期MMDD格式
      const month = (Math.floor(Math.random() * 12) + 1)
        .toString()
        .padStart(2, "0");
      const day = (Math.floor(Math.random() * 28) + 1)
        .toString()
        .padStart(2, "0");
      const dateStr = `${month}${day}`;
      // 在前面补充随机字符
      const prefixLength = Math.max(1, length - 4);
      return generateRandomAlphanumeric(prefixLength) + dateStr;
    }

    case EMAIL_PREFIX_FORMATS.RANDOM_YEAR: {
      // 随机字符串+年份YYYY格式
      const randomYear = Math.floor(Math.random() * 45) + 1980; // 1980-2024
      const yearStr = randomYear.toString();
      // 在前面补充随机字符
      const prefixLength = Math.max(1, length - 4);
      return generateRandomAlphanumeric(prefixLength) + yearStr;
    }

    default:
      return nanoid(length);
  }
}
